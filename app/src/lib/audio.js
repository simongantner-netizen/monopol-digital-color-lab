/**
 * Procedural sound design.
 *
 * Everything is synthesised in the browser — no audio files, nothing to load,
 * nothing to license. The point is that the colour is audible: hue picks the
 * root note, chroma opens the filter, lightness lifts the register. Move the
 * colour and the room changes pitch with it.
 *
 * Kept deliberately quiet. This should sit under the experience, not on it.
 */

import { getAtmosphere } from './atmospheres.js'

// A pentatonic set has no semitone clashes, so any two voices sounding together
// stay consonant however the colour moves. Degrees in semitones from the root.
const PENTATONIC = [0, 2, 4, 7, 9]
const ROOT_HZ = 55 // A1 — the drone lives low

const semitone = (n) => Math.pow(2, n / 12)

/** Hue → a scale degree, so neighbouring colours are neighbouring notes. */
function hueToRatio(hue) {
  const step = Math.round((hue / 360) * 12) % 12
  const octave = Math.floor(step / PENTATONIC.length)
  const degree = PENTATONIC[step % PENTATONIC.length]
  return semitone(degree + octave * 12)
}

/**
 * Looping white noise, generated once and shared by every atmosphere.
 * Four seconds is long enough that the loop point is inaudible under a filter.
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

export function createAudioEngine() {
  let ctx = null
  let master = null
  let ambientGain = null
  let reverb = null
  let filter = null
  let voices = []
  let started = false
  let muted = false
  let colour = { l: 0.44, c: 0.004, h: 250 }

  let noiseBuffer = null
  let atmosphereBus = null
  let atmosphere = null // { id, nodes, stop() }

  // The drone sits well under the interaction tones — it should be felt as
  // room rather than heard as a note.
  const AMBIENT_LEVEL = 0.042
  const MASTER_LEVEL = 0.62
  const ATMOSPHERE_LEVEL = 0.5

  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)()

    master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)

    reverb = makeReverb(ctx)
    const wet = ctx.createGain()
    wet.gain.value = 0.42
    reverb.connect(wet)
    wet.connect(master)

    filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 520
    filter.Q.value = 0.6
    filter.connect(master)
    filter.connect(reverb)

    ambientGain = ctx.createGain()
    ambientGain.gain.value = 0
    ambientGain.connect(filter)

    // Atmospheres bypass the drone's lowpass — a rain texture needs its highs.
    // They still go through the reverb, so they sit in the same room.
    noiseBuffer = makeNoiseBuffer(ctx)
    atmosphereBus = ctx.createGain()
    atmosphereBus.gain.value = ATMOSPHERE_LEVEL
    atmosphereBus.connect(master)
    const atmoSend = ctx.createGain()
    atmoSend.gain.value = 0.3
    atmosphereBus.connect(atmoSend)
    atmoSend.connect(reverb)

    // Root, fifth, octave — plus a slow detune so the drone never sits still.
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
      gain.connect(ambientGain)
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

    const now = ctx.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(0, now)
    master.gain.linearRampToValueAtTime(muted ? 0 : MASTER_LEVEL, now + 2.4)
    ambientGain.gain.setValueAtTime(0, now)
    ambientGain.gain.linearRampToValueAtTime(1, now + 3.2)

    applyColour(0.5)
  }

  function setMuted(next) {
    muted = next
    if (!ctx || !started) return
    const now = ctx.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setTargetAtTime(muted ? 0 : MASTER_LEVEL, now, 0.25)
  }

  /** Retune the drone to the current colour. */
  function applyColour(glide = 2.2) {
    if (!ctx || !started) return
    const now = ctx.currentTime
    const ratio = hueToRatio(colour.h)
    // Lighter colours sit an octave up; the room brightens with them.
    const octave = colour.l > 0.68 ? 2 : 1

    voices.forEach(({ osc, mult }) => {
      osc.frequency.setTargetAtTime(ROOT_HZ * mult * ratio * octave, now, glide)
    })

    // Chroma opens the filter — a grey colour sounds muffled, a vivid one bright.
    const cutoff = 340 + colour.c * 3600 + colour.l * 420
    filter.frequency.setTargetAtTime(cutoff, now, glide * 0.6)
  }

  function setColour(next) {
    colour = next
    applyColour()
  }

  /**
   * One-shot tones. Each is a short sine with a fast attack and a long tail
   * into the reverb, tuned relative to the current colour so the interface
   * always sounds in key with what is on screen.
   */
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
     Atmospheres — one per world, faded in on hover.
  --------------------------------------------------------------------- */

  function stopAtmosphere(fade = 0.55) {
    if (!atmosphere) return
    const dying = atmosphere
    atmosphere = null

    const now = ctx.currentTime
    dying.gain.gain.cancelScheduledValues(now)
    dying.gain.gain.setTargetAtTime(0, now, fade / 3)
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

    const now = ctx.currentTime
    const nodes = []

    const gain = ctx.createGain()
    gain.gain.value = 0
    gain.connect(atmosphereBus)

    // The bed: looping noise through one shaped filter.
    const source = ctx.createBufferSource()
    source.buffer = noiseBuffer
    source.loop = true

    const band = ctx.createBiquadFilter()
    band.type = spec.band
    band.frequency.value = spec.freq
    band.Q.value = spec.q

    source.connect(band)
    band.connect(gain)
    source.start()
    nodes.push(source)

    // The breathing: a slow LFO on the filter is what turns flat hiss into
    // surf, or wind, or rain.
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
      toneGain.connect(gain)
      osc.start()
      nodes.push(osc)
    }

    gain.gain.setTargetAtTime(spec.gain, now, 0.25)

    const entry = {
      id: worldId,
      gain,
      grainTimer: null,
      teardown() {
        nodes.forEach((n) => {
          try {
            n.stop()
          } catch {
            /* already stopped */
          }
        })
        gain.disconnect()
      },
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
          spawnGrain(spec.grain, next, gain)
          next += (1 / spec.grain.rate) * (0.45 + Math.random() * 1.1)
        }
        entry.grainTimer = setTimeout(tick, 120)
      }
      tick()
    }

    atmosphere = entry
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
    stopAtmosphere(0)
    if (!ctx) return
    voices.forEach(({ osc }) => {
      try {
        osc.stop()
      } catch {
        /* already stopped */
      }
    })
    ctx.close()
    ctx = null
    started = false
  }

  return {
    start,
    setMuted,
    setColour,
    setAtmosphere,
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
