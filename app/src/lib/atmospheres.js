/**
 * One atmosphere per world.
 *
 * Hovering "The sea, three hours after the storm" should sound like it — and
 * from real recordings, not an impression of one. Filtered noise can imitate
 * surf; it cannot imitate the particular way a wave drags gravel back down a
 * beach, and that detail is the difference between a sound effect and a place.
 *
 * The recordings are shared. Ten beds cover twelve worlds because what makes a
 * world is not only which recording plays but how it is heard: the same wind
 * is a chalk cliff when only its highs survive, and untouched sand when only
 * its body does. Sharing beds is also what keeps the whole soundtrack small
 * enough to arrive during the intro.
 *
 * Each bed is a seamless loop, cut from the calmest stretch of the source and
 * crossfaded onto itself, then gain-matched to -20 LUFS so the numbers below
 * mean the same thing from one world to the next.
 *
 *   bed     which recording
 *   band    lowpass | bandpass | highpass — how the world is heard
 *   freq    corner or centre of that filter, Hz
 *   q       resonance; above ~2 the filter starts to sing
 *   gain    level of this layer within the world
 *   rate    playback speed. Below 1 the bed drops in pitch and slows — the
 *           cheapest way to make one stone rumble read as three different
 *           weights of stone.
 *   at      where in the loop to enter, so two worlds sharing a bed never
 *           start on the same sound
 *
 * The gains are measured, not chosen. The first version of this file set them
 * by eye and four worlds came out silent: a filter throws away however much
 * energy happens to sit outside it, and that amount depends entirely on the
 * recording. Moss — a quiet woodland take, low-passed down to where it had
 * almost nothing left — ended up 23 dB under the rest. So each world's real
 * filter chain is rendered offline, measured, and its gains scaled so every
 * one of the twelve arrives at the same loudness. Change a filter and the
 * gain beside it is no longer right; re-measure rather than guess.
 *
 * `fallback` is the old synthesised version of the world, kept for the case
 * where a recording has not arrived yet — a conference-room wifi should cost
 * the room its detail, not its sound.
 */

/** The shared recordings. Keys are what the layers below refer to. */
export const BEDS = ['wind', 'sea', 'forest', 'birds', 'rain', 'hum', 'rumble', 'pen', 'stone', 'dawn']

export const ATMOSPHERES = {
  // Chalk cliff — thin, dry, high air, and a long way below it, the sea.
  chalk: {
    layers: [
      { bed: 'wind', band: 'highpass', freq: 1150, q: 0.7, gain: 4.018 },
      { bed: 'sea', band: 'highpass', freq: 800, q: 0.6, gain: 0.884, at: 3 },
    ],
    fallback: { band: 'highpass', freq: 1800, q: 0.7, sway: 0.11, depth: 900, gain: 0.2 },
  },

  // Untouched sand — the long, even push of desert wind, nothing on top of it.
  sand: {
    layers: [{ bed: 'wind', band: 'lowpass', freq: 1500, q: 0.7, gain: 0.534 }],
    fallback: { band: 'bandpass', freq: 760, q: 0.85, sway: 0.075, depth: 420, gain: 0.34 },
  },

  // Wheat a week before harvest — dry stalks rubbing. The forest played bright
  // and a touch fast stops being leaves and becomes stalks.
  ochre: {
    layers: [
      { bed: 'forest', band: 'bandpass', freq: 2700, q: 0.85, gain: 1.775, rate: 1.06 },
      { bed: 'wind', band: 'lowpass', freq: 900, q: 0.7, gain: 0.394, at: 5 },
    ],
    fallback: {
      band: 'bandpass', freq: 2600, q: 1.1, sway: 0.42, depth: 900, gain: 0.22,
      grain: { rate: 26, freq: 4200, decay: 0.035, gain: 0.05 },
    },
  },

  // Wet clay on the wheel — the low even hum of the wheel turning under it.
  clay: {
    layers: [{ bed: 'hum', band: 'lowpass', freq: 430, q: 1.2, gain: 1.115, rate: 0.94 }],
    fallback: {
      band: 'lowpass', freq: 300, q: 2.4, sway: 0.16, depth: 90, gain: 0.3,
      tone: { hz: 78, gain: 0.035 },
    },
  },

  // Poppies at a field edge — warm summer air with birds far back in it.
  cinnabar: {
    layers: [
      { bed: 'birds', band: 'lowpass', freq: 5000, q: 0.6, gain: 0.572 },
      { bed: 'wind', band: 'lowpass', freq: 750, q: 0.7, gain: 0.4, at: 8 },
    ],
    fallback: {
      band: 'bandpass', freq: 1500, q: 0.9, sway: 0.14, depth: 620, gain: 0.2,
      grain: { rate: 7, freq: 5200, decay: 0.02, gain: 0.035 },
    },
  },

  // Iron in the weather — a big cold sheet of metal with wind working at it.
  iron: {
    layers: [
      { bed: 'rumble', band: 'bandpass', freq: 200, q: 3.2, gain: 3.056 },
      { bed: 'wind', band: 'bandpass', freq: 1100, q: 0.8, gain: 1.31, at: 2 },
    ],
    fallback: {
      band: 'bandpass', freq: 210, q: 5.5, sway: 0.06, depth: 70, gain: 0.34,
      tone: { hz: 104, gain: 0.03 },
    },
  },

  // Moss on the shaded side — the same forest, but heard through the damp.
  moss: {
    layers: [
      { bed: 'forest', band: 'lowpass', freq: 1500, q: 0.9, gain: 12.429, at: 9 },
      { bed: 'birds', band: 'lowpass', freq: 1200, q: 0.7, gain: 3.217, rate: 0.96, at: 5 },
    ],
    fallback: {
      band: 'lowpass', freq: 380, q: 1, sway: 0.05, depth: 140, gain: 0.26,
      grain: { rate: 1.1, freq: 1500, decay: 0.13, gain: 0.05 },
    },
  },

  // Copper at peace with the rain.
  verdigris: {
    layers: [{ bed: 'rain', band: 'highpass', freq: 220, q: 0.6, gain: 1.147 }],
    fallback: {
      band: 'bandpass', freq: 2000, q: 0.55, sway: 0.2, depth: 700, gain: 0.24,
      grain: { rate: 42, freq: 3400, decay: 0.05, gain: 0.045 },
    },
  },

  // The sea three hours after a storm — slow, heavy, still moving.
  sea: {
    layers: [{ bed: 'sea', band: 'lowpass', freq: 1900, q: 0.7, gain: 1.072 }],
    fallback: { band: 'lowpass', freq: 480, q: 1.4, sway: 0.085, depth: 400, gain: 0.42 },
  },

  // Ink a second before it dries. A nib working across paper, over a room tone
  // held so far down it registers as weight rather than as sound — the writing
  // is the only thing moving, which is the whole of "a second before it dries".
  indigo: {
    layers: [
      { bed: 'pen', band: 'bandpass', freq: 1100, q: 0.7, gain: 0.56 },
      { bed: 'rumble', band: 'lowpass', freq: 135, q: 1.4, gain: 0.35, rate: 0.72, at: 6 },
    ],
    fallback: {
      band: 'lowpass', freq: 190, q: 1.8, sway: 0.04, depth: 60, gain: 0.24,
      tone: { hz: 58, gain: 0.04 },
    },
  },

  // The pause between night and morning — thin high air, and the first birds
  // so far off you are not sure you heard them.
  threshold: {
    layers: [
      { bed: 'dawn', band: 'highpass', freq: 700, q: 0.6, gain: 0.862 },
      { bed: 'wind', band: 'highpass', freq: 2500, q: 0.9, gain: 0.313, at: 10 },
    ],
    fallback: {
      band: 'highpass', freq: 3400, q: 1.6, sway: 0.055, depth: 1200, gain: 0.13,
      tone: { hz: 312, gain: 0.012 },
    },
  },

  // Basalt split open — deep stone, a low grinding weight.
  basalt: {
    layers: [{ bed: 'stone', band: 'lowpass', freq: 600, q: 0.8, gain: 0.506 }],
    fallback: {
      band: 'lowpass', freq: 150, q: 3.2, sway: 0.07, depth: 55, gain: 0.4,
      tone: { hz: 44, gain: 0.05 },
    },
  },
}

export const getAtmosphere = (id) => ATMOSPHERES[id] ?? null
