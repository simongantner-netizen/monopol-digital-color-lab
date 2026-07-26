/**
 * One atmosphere per world.
 *
 * Hovering "The sea, three hours after the storm" should sound like it. All of
 * it is synthesised from filtered noise — no samples, nothing to download, and
 * nothing to license. The trick is that almost every natural ambience *is*
 * filtered noise: what separates surf from desert wind from rain is which
 * frequencies survive, how slowly the filter breathes, and whether there are
 * transients on top.
 *
 *   band     lowpass | bandpass | highpass
 *   freq     centre of the filter, Hz
 *   q        resonance — higher is more "tuned", more like a pitch
 *   sway     how fast the filter opens and closes, Hz (the breathing)
 *   depth    how far it travels, Hz
 *   gain     level of the bed
 *   grain    optional transients: rate per second, pitch, decay, level
 *   tone     optional sine underneath, for things that hum rather than hiss
 */

export const ATMOSPHERES = {
  // Chalk cliff — thin, dry, high air with nothing to absorb it.
  chalk: {
    band: 'highpass',
    freq: 1800,
    q: 0.7,
    sway: 0.11,
    depth: 900,
    gain: 0.2,
  },

  // Untouched sand — the long, even push of desert wind.
  sand: {
    band: 'bandpass',
    freq: 760,
    q: 0.85,
    sway: 0.075,
    depth: 420,
    gain: 0.34,
  },

  // Wheat a week before harvest — dry stalks rubbing, a fast dry rustle.
  ochre: {
    band: 'bandpass',
    freq: 2600,
    q: 1.1,
    sway: 0.42,
    depth: 900,
    gain: 0.22,
    grain: { rate: 26, freq: 4200, decay: 0.035, gain: 0.05 },
  },

  // Wet clay on the wheel — the low even hum of the wheel turning.
  clay: {
    band: 'lowpass',
    freq: 300,
    q: 2.4,
    sway: 0.16,
    depth: 90,
    gain: 0.3,
    tone: { hz: 78, gain: 0.035 },
  },

  // Poppies at a field edge — warm summer air with insects in it.
  cinnabar: {
    band: 'bandpass',
    freq: 1500,
    q: 0.9,
    sway: 0.14,
    depth: 620,
    gain: 0.2,
    grain: { rate: 7, freq: 5200, decay: 0.02, gain: 0.035 },
  },

  // Iron in the weather — a big cold sheet of metal, resonating.
  iron: {
    band: 'bandpass',
    freq: 210,
    q: 5.5,
    sway: 0.06,
    depth: 70,
    gain: 0.34,
    tone: { hz: 104, gain: 0.03 },
  },

  // Moss on the shaded side — muffled, damp, almost no high end. Drips.
  moss: {
    band: 'lowpass',
    freq: 380,
    q: 1,
    sway: 0.05,
    depth: 140,
    gain: 0.26,
    grain: { rate: 1.1, freq: 1500, decay: 0.13, gain: 0.05 },
  },

  // Copper at peace with the rain — full-band rain, dense droplets.
  verdigris: {
    band: 'bandpass',
    freq: 2000,
    q: 0.55,
    sway: 0.2,
    depth: 700,
    gain: 0.24,
    grain: { rate: 42, freq: 3400, decay: 0.05, gain: 0.045 },
  },

  // The sea three hours after a storm — slow, heavy, still moving.
  sea: {
    band: 'lowpass',
    freq: 480,
    q: 1.4,
    sway: 0.085,
    depth: 400,
    gain: 0.42,
  },

  // Ink a second before it dries — near silence, low and held.
  indigo: {
    band: 'lowpass',
    freq: 190,
    q: 1.8,
    sway: 0.04,
    depth: 60,
    gain: 0.24,
    tone: { hz: 58, gain: 0.04 },
  },

  // The pause between night and morning — high, thin, suspended.
  threshold: {
    band: 'highpass',
    freq: 3400,
    q: 1.6,
    sway: 0.055,
    depth: 1200,
    gain: 0.13,
    tone: { hz: 312, gain: 0.012 },
  },

  // Basalt split open — deep stone, a low grinding weight.
  basalt: {
    band: 'lowpass',
    freq: 150,
    q: 3.2,
    sway: 0.07,
    depth: 55,
    gain: 0.4,
    tone: { hz: 44, gain: 0.05 },
  },
}

export const getAtmosphere = (id) => ATMOSPHERES[id] ?? null
