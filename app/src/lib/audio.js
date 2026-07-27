/**
 * Sound design.
 *
 * Four things sound at once, and the whole job is keeping them out of each
 * other's way:
 *
 *   the bed        a low drone under everything, the floor of the room
 *   the colour     a synthesised pad tuned to the colour on screen
 *   the world      a field recording, only while a pointer rests on a card
 *   the voice      the question, read aloud
 *
 * The rule throughout is that nothing announces itself. Levels are set so that
 * removing any single layer would be noticed as the room going flat rather
 * than as a sound stopping, and every entrance and exit is faded — a sample
 * that starts on its first sample sounds like a sound file, which is exactly
 * what it must not sound like.
 *
 * The colour is still audible: hue picks the pad's root note, and chroma tilts
 * the whole room brighter or darker. Move the colour and the room changes with
 * it. The pad sits far under the bed now that there is real music to carry the
 * floor — it reads as a tint on the room rather than as a second drone, which
 * is the only way two drones can share a mix without fighting.
 */

import { getAtmosphere } from './atmospheres.js'
import { BED_URLS, LOOP_SECONDS, MUSIC_URL, VOICE_URLS } from './audioAssets.js'

// A pentatonic set has no semitone clashes, so any two voices sounding together
// stay consonant however the colour moves. Degrees in semitones from the root.
const PENTATONIC = [0, 2, 4, 7, 9]
const ROOT_HZ = 55 // A1 — the pad lives low

const semitone = (n) => Math.pow(2, n / 12)
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/**
 * Question 02's answer, as a multiplier on the music bed.
 *
 * Pinned so that Speak — the neutral answer, at 0.34 — lands on exactly 1,
 * which is the level the bed plays at everywhere else in the experience.
 * Whisper and Shout then open out either side of it: 0.62 to 1.74, a ratio of
 * 2.8, or a little under nine decibels.
 */
const loudnessFor = (intensity) => 0.62 + intensity * 1.12

/** Hue → a scale degree, so neighbouring colours are neighbouring notes. */
function hueToRatio(hue) {
  const step = Math.round((hue / 360) * 12) % 12
  const octave = Math.floor(step / PENTATONIC.length)
  const degree = PENTATONIC[step % PENTATONIC.length]
  return semitone(degree + octave * 12)
}

/**
 * Looping white noise, generated once. Only the fallback atmospheres use it —
 * see `atmospheres.js` for when those come into play.
 */
function makeNoiseBuffer(ctx, seconds = 4) {
  const length = ctx.sampleRate * seconds
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

/** Generated impulse response — a small, dark, expensive-sounding room. */
function makeReverb(ctx, seconds = 3.6, decay = 2.6) {
  const rate = ctx.sampleRate
  const length = Math.floor(rate * seconds)
  const impulse = ctx.createBuffer(2, length, rate)
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel)
    for (let i = 0; i < length; i++) {
      const t = i / length
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay)
    }
  }
  const convolver = ctx.createConvolver()
  convolver.buffer = impulse
  return convolver
}

/**
 * Cut a decoded file back to exactly the loop it was made from.
 *
 * MP3 decodes to slightly more audio than went in: a few milliseconds of
 * silent encoder padding at the head, and whether a browser strips it is not
 * standardised — Firefox only started before version 83, Chromium is off by a
 * sample, Safari does its own thing. A loop that runs into that padding ticks
 * once per cycle, which on a twelve-second atmosphere is five ticks a minute.
 *
 * Rather than guess per browser: every one of these files begins on real
 * sound, so any leading silence *is* the padding. Find where the sound starts,
 * copy exactly the authored number of seconds from there into a fresh buffer,
 * and the loop is sample-exact everywhere.
 */
function trimToLoop(ctx, buffer, seconds) {
  const wanted = Math.round(seconds * buffer.sampleRate)
  if (!wanted || buffer.length < wanted) return buffer

  // Encoder padding is digital silence; the material never is.
  let start = 0
  const scan = Math.min(buffer.length - wanted, 8192)
  const channels = []
  for (let c = 0; c < buffer.numberOfChannels; c++) channels.push(buffer.getChannelData(c))
  outer: for (let i = 0; i < scan; i++) {
    for (let c = 0; c < channels.length; c++) {
      if (Math.abs(channels[c][i]) > 1e-4) {
        start = i
        break outer
      }
    }
  }

  const exact = ctx.createBuffer(buffer.numberOfChannels, wanted, buffer.sampleRate)
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    exact.getChannelData(c).set(channels[c].subarray(start, start + wanted))
  }
  return exact
}

/**
 * Retarget a parameter that may already be mid-ramp.
 *
 * Firefox has never shipped cancelAndHoldAtTime, so cancelling a running ramp
 * there snaps the value back to wherever the last scheduled point was — an
 * audible jump in the middle of a fade. Reading the live value and pinning it
 * before cancelling works identically in every browser.
 */
function glide(param, to, when, timeConstant) {
  const held = param.value
  param.cancelScheduledValues(when)
  param.setValueAtTime(held, when)
  param.setTargetAtTime(to, when, timeConstant)
}

export function createAudioEngine() {
  let ctx = null
  let master = null // everything, and the mute
  let programme = null // everything except the voice — this is what ducks
  let reverb = null
  let filter = null // the pad's lowpass; chroma opens it
  let voices = []
  let started = false
  let muted = false
  let colour = { l: 0.44, c: 0.004, h: 250 }

  let noiseBuffer = null
  let atmosphereBus = null
  let atmosphere = null // { id, gain, teardown() }

  let musicBus = null
  let musicTone = null // high shelf — the colour's brightness on the music
  let musicSource = null
  let musicGain = null
  let tempo = 1 // wanted playback rate, remembered until the music exists
  let intensity = 0.34 // 0 whisper … 1 shout; the neutral answer sits here

  let voiceBus = null
  let voiceSource = null
  let unduckTimer = null

  /** name → AudioBuffer, once decoded. Missing means "not ready, use the fallback". */
  const beds = new Map()
  const spoken = new Map()
  let musicBuffer = null

  /** url → Promise<ArrayBuffer>, started during the intro. */
  let downloads = null

  /**
   * Whether the search is over.
   *
   * Through the questions the room tracks the colour and climbs — each answer
   * pushes it somewhere new, and that rising tension is what makes the wait
   * before the reveal work. Once the colour exists, holding that tension would
   * be wrong: the room drops an octave, the filter closes, the music falls
   * back to its own pace, and the whole thing exhales.
   */
  let atRest = false

  /*
    Levels, measured rather than chosen.

    The mix used to sit at -30 LUFS, which is quiet enough that someone opening
    the link on a laptop at normal system volume hears almost nothing — and
    what they would be missing is the one thing this has that a colour picker
    does not. Rendered offline through this exact chain, the numbers below put
    the questions screen at -23.5 LUFS with 8.9 dB of true-peak headroom left,
    so nothing clips even when the bed, a world and the reveal chord land
    together.

    The atmospheres come up furthest. At 0.3 against a bed of 0.5 the ten field
    recordings sat 5 to 10 dB under the music: the most distinctive and most
    expensive part of the sound was a rumour. They are now within a couple of
    decibels of the bed, which is where a world you are pointing at belongs.
  */
  const MASTER_LEVEL = 1.0
  const MUSIC_LEVEL = 0.62
  const ATMOSPHERE_LEVEL = 0.52
  const VOICE_LEVEL = 0.72
  // The pad is a tint on the music, not a drone of its own. Set this to 0 and
  // the room still works; it just stops changing colour with the screen.
  const AMBIENT_LEVEL = 0.017
  // How far everything else drops while the question is being read. Enough to
  // hear every word over, gentle enough that nobody notices it happening.
  const DUCK = 0.3

  /* ---------------------------------------------------------------------
     Loading. Nothing here needs an AudioContext, so it can run on the intro
     screen — before the visitor has clicked anything, and therefore before a
     browser would let us make a sound.
  --------------------------------------------------------------------- */

  function prefetch() {
    if (downloads) return
    downloads = new Map()
    const want = [
      MUSIC_URL,
      ...Object.values(BED_URLS),
      ...Object.values(VOICE_URLS),
    ]
    want.forEach((url) => {
      downloads.set(
        url,
        fetch(url)
          .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
          // A missing file must never break the room: the fallbacks cover the
          // atmospheres, and the music and voice simply do not play.
          .catch(() => null),
      )
    })
  }

  async function decode(url, loopKey) {
    if (!downloads) prefetch()
    const bytes = await downloads.get(url)
    if (!bytes || !ctx) return null
    try {
      // decodeAudioData detaches the buffer, and a retry would find it empty.
      const raw = await ctx.decodeAudioData(bytes.slice(0))
      return loopKey ? trimToLoop(ctx, raw, LOOP_SECONDS[loopKey]) : raw
    } catch {
      return null
    }
  }

  /** Pull everything in, letting each part start sounding the moment it can. */
  function load() {
    decode(MUSIC_URL, 'music').then((buffer) => {
      if (!buffer || !started) return
      musicBuffer = buffer
      startMusic()
    })

    Object.entries(BED_URLS).forEach(([name, url]) => {
      decode(url, name).then((buffer) => {
        if (!buffer) return
        beds.set(name, buffer)
        // If this bed belongs to the world already under the pointer, the
        // synthesised stand-in is playing — swap it for the real thing.
        if (atmosphere?.synthetic && atmosphere.id) {
          const spec = getAtmosphere(atmosphere.id)
          if (spec?.layers?.some((l) => l.bed === name)) {
            const id = atmosphere.id
            stopAtmosphere()
            setAtmosphere(id)
          }
        }
      })
    })

    Object.entries(VOICE_URLS).forEach(([id, url]) => {
      decode(url).then((buffer) => buffer && spoken.set(id, buffer))
    })
  }

  /* ---------------------------------------------------------------------
     The graph.
  --------------------------------------------------------------------- */

  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)()

    master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)

    // Everything but the voice hangs off here, so one gain ducks the lot.
    programme = ctx.createGain()
    programme.gain.value = 1
    programme.connect(master)

    reverb = makeReverb(ctx)
    const wet = ctx.createGain()
    wet.gain.value = 0.42
    reverb.connect(wet)
    wet.connect(programme)

    filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 520
    filter.Q.value = 0.6
    filter.connect(programme)
    filter.connect(reverb)

    // The music keeps its own top end — a lowpass at 520 Hz would bury it —
    // but a shelf lets the colour tilt it warm or bright all the same.
    musicTone = ctx.createBiquadFilter()
    musicTone.type = 'highshelf'
    musicTone.frequency.value = 1400
    musicTone.gain.value = 0
    musicTone.connect(programme)

    musicBus = ctx.createGain()
    musicBus.gain.value = MUSIC_LEVEL * loudnessFor(intensity)
    musicBus.connect(musicTone)

    // Atmospheres bypass the pad's lowpass — a rain texture needs its highs.
    // They still go through the reverb, so they sit in the same room.
    noiseBuffer = makeNoiseBuffer(ctx)
    atmosphereBus = ctx.createGain()
    atmosphereBus.gain.value = ATMOSPHERE_LEVEL
    atmosphereBus.connect(programme)
    const atmoSend = ctx.createGain()
    atmoSend.gain.value = 0.3
    atmosphereBus.connect(atmoSend)
    atmoSend.connect(reverb)

    // The voice is dry and sits past the duck. Putting it in the room's reverb
    // would push it away, and the whole point is that it is close.
    voiceBus = ctx.createGain()
    voiceBus.gain.value = VOICE_LEVEL
    voiceBus.connect(master)

    // Root, fifth, octave — plus a slow detune so the pad never sits still.
    voices = [
      { mult: 1, level: 1.0, detune: 0 },
      { mult: semitone(7), level: 0.55, detune: 3 },
      { mult: 2, level: 0.3, detune: -4 },
    ].map(({ mult, level, detune }) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = ROOT_HZ * mult
      osc.detune.value = detune

      const gain = ctx.createGain()
      gain.gain.value = level * AMBIENT_LEVEL

      // Very slow amplitude drift keeps the pad breathing.
      const lfo = ctx.createOscillator()
      lfo.frequency.value = 0.03 + Math.random() * 0.05
      const lfoGain = ctx.createGain()
      lfoGain.gain.value = level * AMBIENT_LEVEL * 0.4
      lfo.connect(lfoGain)
      lfoGain.connect(gain.gain)

      osc.connect(gain)
      gain.connect(filter)
      osc.start()
      lfo.start()

      return { osc, gain, mult, level }
    })
  }

  /** Must be called from a user gesture — browsers will not start audio otherwise. */
  async function start() {
    if (started) return
    if (!ctx) build()
    if (ctx.state === 'suspended') await ctx.resume()
    started = true

    // Otherwise the ring/silent switch on an iPad mutes Web Audio — and the
    // room would be silent at exactly the moment somebody is being shown it.
    try {
      if ('audioSession' in navigator) navigator.audioSession.type = 'playback'
    } catch {
      /* older Safari, and every other browser */
    }
    watchInterruptions()

    const now = ctx.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(0, now)
    master.gain.linearRampToValueAtTime(muted ? 0 : MASTER_LEVEL, now + 2.4)

    applyColour(0.5)
    load()
  }

  function setMuted(next) {
    muted = next
    if (!ctx || !started) return
    glide(master.gain, muted ? 0 : MASTER_LEVEL, ctx.currentTime, 0.25)
  }

  /**
   * Come back after the browser takes the audio away.
   *
   * Safari suspends the context for a phone call, for Siri, for the screen
   * going off, and reports a state — "interrupted" — that is not in the spec.
   * Without this the room simply never returns, halfway through a pitch.
   */
  function watchInterruptions() {
    const revive = () => {
      if (ctx && started && ctx.state !== 'running') ctx.resume().catch(() => {})
    }
    ctx.addEventListener?.('statechange', revive)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) revive()
    })
  }

  /* ---------------------------------------------------------------------
     The music bed.
  --------------------------------------------------------------------- */

  /**
   * A looping source that enters somewhere other than its first sample.
   *
   * Two worlds sharing a recording would otherwise start on the same gust of
   * wind, and hovering between them would give the trick away.
   */
  function loopSource(buffer, { rate = 1, at = 0 } = {}) {
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    // The buffer is already exactly the loop — trimToLoop saw to that — so the
    // whole of it is the loop, with nothing to skip at either end.
    source.loopStart = 0
    source.loopEnd = buffer.duration
    source.playbackRate.value = rate
    source.start(ctx.currentTime, at % buffer.duration)
    return source
  }

  function startMusic() {
    if (!musicBuffer || musicSource) return
    const now = ctx.currentTime

    musicGain = ctx.createGain()
    musicGain.gain.value = 0
    musicGain.connect(musicBus)

    musicSource = loopSource(musicBuffer)
    musicSource.playbackRate.value = tempo
    musicSource.connect(musicGain)

    // Long enough that nobody catches it arriving.
    musicGain.gain.setTargetAtTime(1, now, 1.6)
  }

  /**
   * How hard the room is pushing.
   *
   * Each answer winds the music up a little. It is the same recording playing
   * faster, so it also rises in pitch, and the two together are what makes the
   * last question feel further from the first than four screens should. At
   * rest it unwinds — slower than it wound up, because letting go should take
   * longer than tensing.
   */
  function setTempo(next) {
    tempo = next
    if (!musicSource) return
    // Unwinding is given more than twice the time of winding up.
    glide(musicSource.playbackRate, next, ctx.currentTime, next < 1.001 ? 1.6 : 0.7)
  }

  /**
   * How loud the colour is.
   *
   * Question 02 asks whether the colour should whisper or be heard from across
   * the street, and that used to move a chroma multiplier and nothing else —
   * the one question about volume was the one question you could not hear. So
   * the bed answers it.
   *
   * Whisper to Shout is about nine decibels, which is a lot: roughly the
   * difference between a room you are in and a room next door. It has to be,
   * because this is felt on hover, in the second or so a pointer rests on a
   * card, and a polite few decibels inside that window reads as nothing at all.
   * Speak sits at exactly the level the bed plays everywhere else, so the
   * spread opens either side of normal rather than pushing everything up.
   *
   * The glide matters as much as the range. At a second and a half the change
   * arrived after the pointer had already moved on, which made a real
   * difference feel like no difference; two thirds of a second lands it while
   * you are still on the card. It then stays where the answer left it — a loud
   * colour is loud for the rest of the visit.
   */
  function setIntensity(v) {
    intensity = clamp(v, 0, 1)
    if (!musicBus || !started) return
    glide(musicBus.gain, MUSIC_LEVEL * loudnessFor(intensity), ctx.currentTime, 0.22)
  }

  /* ---------------------------------------------------------------------
     The colour.
  --------------------------------------------------------------------- */

  function applyColour(glide = 2.2) {
    if (!ctx || !started) return
    const now = ctx.currentTime
    const ratio = hueToRatio(colour.h)
    // Lighter colours sit an octave up; the room brightens with them.
    const octave = colour.l > 0.68 ? 2 : 1
    // At rest the whole room drops an octave — the same colour, an exhale lower.
    const settle = atRest ? 0.5 : 1

    voices.forEach(({ osc, mult }) => {
      osc.frequency.setTargetAtTime(ROOT_HZ * mult * ratio * octave * settle, now, glide)
    })

    // Chroma opens the filter — a grey colour sounds muffled, a vivid one bright.
    // Resting closes it down: less air, more body.
    const cutoff = (340 + colour.c * 3600 + colour.l * 420) * (atRest ? 0.62 : 1)
    filter.frequency.setTargetAtTime(cutoff, now, glide * 0.6)

    // The same idea on the music, in the only currency a finished recording
    // has: how much of its top is let through.
    const tilt = clamp(-6 + colour.c * 42, -6, 4) + (atRest ? -1.5 : 0)
    musicTone.gain.setTargetAtTime(tilt, now, glide * 0.6)
  }

  function setColour(next) {
    colour = next
    applyColour()
  }

  function setAtRest(next) {
    if (atRest === next) return
    atRest = next
    // Slower than a normal retune — this is meant to be felt settling, not
    // heard as a jump.
    applyColour(3.4)
  }

  /* ---------------------------------------------------------------------
     One-shot tones.
  --------------------------------------------------------------------- */

  function tone(kind = 'select') {
    if (!ctx || !started || muted) return
    const now = ctx.currentTime
    const ratio = hueToRatio(colour.h)

    const spec = {
      hover: { degrees: [12], gain: 0.035, dur: 0.5, type: 'sine' },
      select: { degrees: [12, 19], gain: 0.09, dur: 1.5, type: 'sine' },
      advance: { degrees: [19, 24], gain: 0.075, dur: 1.9, type: 'sine' },
      back: { degrees: [7, 12], gain: 0.055, dur: 1.2, type: 'sine' },
      tick: { degrees: [24], gain: 0.02, dur: 0.22, type: 'sine' },
      reveal: { degrees: [12, 19, 24, 28], gain: 0.11, dur: 4.5, type: 'sine' },
    }[kind] ?? { degrees: [12], gain: 0.05, dur: 0.8, type: 'sine' }

    spec.degrees.forEach((degree, i) => {
      const osc = ctx.createOscillator()
      osc.type = spec.type
      osc.frequency.value = ROOT_HZ * ratio * semitone(degree) * 2

      const gain = ctx.createGain()
      const at = now + i * (kind === 'reveal' ? 0.34 : 0.045)
      gain.gain.setValueAtTime(0, at)
      gain.gain.linearRampToValueAtTime(spec.gain, at + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + spec.dur)

      osc.connect(gain)
      gain.connect(filter)
      gain.connect(reverb)
      osc.start(at)
      osc.stop(at + spec.dur + 0.1)
    })
  }

  /* ---------------------------------------------------------------------
     The voice.
  --------------------------------------------------------------------- */

  function unduck(after = 0) {
    clearTimeout(unduckTimer)
    unduckTimer = setTimeout(() => {
      if (!ctx) return
      glide(programme.gain, 1, ctx.currentTime, 0.5)
    }, after * 1000)
  }

  /**
   * Read a question aloud, and get out of its way while it speaks.
   *
   * The duck lifts a beat after the last word rather than on it, so the room
   * comes back as if it had been waiting politely instead of snapping on.
   */
  function speak(questionId) {
    if (!ctx || !started) return
    const buffer = spoken.get(questionId)

    silence()
    if (!buffer) return

    const now = ctx.currentTime
    voiceSource = ctx.createBufferSource()
    voiceSource.buffer = buffer

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(1, now + 0.12)
    voiceSource.connect(gain)
    gain.connect(voiceBus)
    voiceSource.start(now)
    voiceSource.envelope = gain

    clearTimeout(unduckTimer)
    glide(programme.gain, DUCK, now, 0.22)
    unduck(buffer.duration + 0.45)
  }

  /** Cut the voice short — used when the visitor moves on mid-sentence. */
  function silence() {
    if (!voiceSource) return
    const dying = voiceSource
    voiceSource = null
    const now = ctx.currentTime
    try {
      glide(dying.envelope.gain, 0, now, 0.06)
      dying.stop(now + 0.4)
    } catch {
      /* already finished */
    }
    unduck(0.3)
  }

  /* ---------------------------------------------------------------------
     Atmospheres — one per world, faded in on hover.
  --------------------------------------------------------------------- */

  function stopAtmosphere(fade = 0.9) {
    if (!atmosphere) return
    const dying = atmosphere
    atmosphere = null

    glide(dying.gain.gain, 0, ctx.currentTime, fade / 3)
    clearTimeout(dying.grainTimer)
    // Let the tail run out before tearing the nodes down.
    setTimeout(() => dying.teardown(), fade * 1000 + 400)
  }

  /**
   * Start the atmosphere for a world, or pass null to fade back to silence.
   * Re-requesting the one already playing is a no-op, so a pointer resting on
   * a card does not restart it.
   */
  function setAtmosphere(worldId) {
    if (!ctx || !started) return
    if (atmosphere?.id === worldId) return

    stopAtmosphere()
    if (!worldId) return

    const spec = getAtmosphere(worldId)
    if (!spec) return

    const gain = ctx.createGain()
    gain.gain.value = 0
    gain.connect(atmosphereBus)

    const ready = spec.layers?.filter((l) => beds.has(l.bed)) ?? []
    const entry = ready.length
      ? fromRecordings(worldId, ready, gain)
      : fromNoise(worldId, spec.fallback, gain)

    // In quickly enough that a hover feels answered, but never on the beat.
    gain.gain.setTargetAtTime(1, ctx.currentTime, 0.22)
    atmosphere = entry
  }

  /** The real thing: field recordings, one filter each. */
  function fromRecordings(worldId, layers, gain) {
    const nodes = []

    layers.forEach((layer) => {
      const source = loopSource(beds.get(layer.bed), {
        rate: layer.rate ?? 1,
        at: layer.at ?? 0,
      })

      const band = ctx.createBiquadFilter()
      band.type = layer.band
      band.frequency.value = layer.freq
      band.Q.value = layer.q

      const level = ctx.createGain()
      level.gain.value = layer.gain

      source.connect(band)
      band.connect(level)
      level.connect(gain)
      nodes.push(source)
    })

    return {
      id: worldId,
      gain,
      synthetic: false,
      grainTimer: null,
      teardown: () => teardown(nodes, gain),
    }
  }

  /**
   * The stand-in, for the seconds before the recordings land — or the whole
   * session, if they never do.
   *
   * Almost every natural ambience *is* filtered noise: what separates surf
   * from desert wind from rain is which frequencies survive, how slowly the
   * filter breathes, and whether there are transients on top.
   */
  function fromNoise(worldId, spec, gain) {
    if (!spec) return { id: worldId, gain, synthetic: true, teardown: () => gain.disconnect() }
    const now = ctx.currentTime
    const nodes = []

    const source = ctx.createBufferSource()
    source.buffer = noiseBuffer
    source.loop = true

    const band = ctx.createBiquadFilter()
    band.type = spec.band
    band.frequency.value = spec.freq
    band.Q.value = spec.q

    const level = ctx.createGain()
    level.gain.value = spec.gain

    source.connect(band)
    band.connect(level)
    level.connect(gain)
    source.start()
    nodes.push(source)

    // A slow LFO on the filter is what turns flat hiss into surf, or wind.
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = spec.sway
    const lfoDepth = ctx.createGain()
    lfoDepth.gain.value = spec.depth
    lfo.connect(lfoDepth)
    lfoDepth.connect(band.frequency)
    lfo.start()
    nodes.push(lfo)

    // Some worlds hum rather than hiss — clay on a wheel, iron, basalt.
    if (spec.tone) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = spec.tone.hz
      const toneGain = ctx.createGain()
      toneGain.gain.value = spec.tone.gain
      osc.connect(toneGain)
      toneGain.connect(level)
      osc.start()
      nodes.push(osc)
    }

    const entry = {
      id: worldId,
      gain,
      synthetic: true,
      grainTimer: null,
      teardown: () => teardown(nodes, gain),
    }

    /**
     * Transients on top of the bed: raindrops, rustling stalks, a drip off
     * moss. Scheduled a quarter-second ahead in batches — timing them off JS
     * timers alone would audibly jitter, and one timer per grain at 42/s would
     * be wasteful. Intervals are randomised so they never form a pulse.
     */
    if (spec.grain) {
      let next = now + 0.1
      const tick = () => {
        if (atmosphere !== entry) return
        const t = ctx.currentTime
        while (next < t + 0.25) {
          spawnGrain(spec.grain, next, level)
          next += (1 / spec.grain.rate) * (0.45 + Math.random() * 1.1)
        }
        entry.grainTimer = setTimeout(tick, 120)
      }
      tick()
    }

    return entry
  }

  function teardown(nodes, gain) {
    nodes.forEach((n) => {
      try {
        n.stop()
      } catch {
        /* already stopped */
      }
    })
    gain.disconnect()
  }

  function spawnGrain(grain, at, destination) {
    const source = ctx.createBufferSource()
    source.buffer = noiseBuffer
    // Start somewhere random in the buffer so grains never repeat identically.
    const offset = Math.random() * (noiseBuffer.duration - grain.decay - 0.05)

    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = grain.freq * (0.7 + Math.random() * 0.6)
    band.Q.value = 3

    const env = ctx.createGain()
    env.gain.setValueAtTime(0, at)
    env.gain.linearRampToValueAtTime(grain.gain * (0.5 + Math.random() * 0.7), at + 0.004)
    env.gain.exponentialRampToValueAtTime(0.0001, at + grain.decay)

    source.connect(band)
    band.connect(env)
    env.connect(destination)
    source.start(at, offset, grain.decay + 0.05)
    source.stop(at + grain.decay + 0.05)
  }

  function dispose() {
    clearTimeout(unduckTimer)
    stopAtmosphere(0)
    if (!ctx) return
    voices.forEach(({ osc }) => {
      try {
        osc.stop()
      } catch {
        /* already stopped */
      }
    })
    try {
      musicSource?.stop()
    } catch {
      /* already stopped */
    }
    ctx.close()
    ctx = null
    started = false
  }

  return {
    prefetch,
    start,
    setMuted,
    setColour,
    setAtRest,
    setAtmosphere,
    setTempo,
    setIntensity,
    speak,
    silence,
    tone,
    dispose,
    get isStarted() {
      return started
    },
    get isMuted() {
      return muted
    },
  }
}
