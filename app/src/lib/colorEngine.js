/**
 * The engine that turns four answers into one colour.
 *
 * Everything is derived, never stored: answers + manual tweaks in, a full
 * formula out. That keeps the live preview during the questions and the final
 * result on the same code path — the colour you watch being built is literally
 * the colour you end up with.
 */

import { getOption } from './questions.js'
import { oklchToHex, oklchToCss, toGamut, toCmyk, clamp } from './oklch.js'

/** Undecided grey. Not black — the lab is dark, the colour must still be visible. */
export const NEUTRAL = { l: 0.44, c: 0.004, h: 250 }

export const EMPTY_ANSWERS = { world: null, voice: null, hour: null, light: null }

export const NO_TWEAKS = {
  hue: 0, // degrees, ±30
  lightness: 0, // ±0.16
  chroma: 0, // ±0.06
  gloss: null, // overrides the answer when set
  effect: null, // overrides the answer when set
}

const SURFACE_STOPS = [
  { at: 0.04, name: 'Deep matt' },
  { at: 0.2, name: 'Matt' },
  { at: 0.42, name: 'Silk' },
  { at: 0.62, name: 'Satin' },
  { at: 0.82, name: 'Gloss' },
  { at: 1.0, name: 'High gloss' },
]

export const surfaceName = (gloss) =>
  SURFACE_STOPS.find((s) => gloss <= s.at + 0.001)?.name ?? 'High gloss'

export const EFFECTS = [
  { id: 'none', name: 'Pure', caption: 'Pigment only' },
  { id: 'pearl', name: 'Pearl', caption: 'Soft inner shimmer' },
  { id: 'metallic', name: 'Metallic', caption: 'Brushed, directional' },
  { id: 'iridescent', name: 'Iris', caption: 'Shifts with the angle' },
  { id: 'glitter', name: 'Flake', caption: 'Thousands of tiny mirrors' },
]

export const effectName = (id) => EFFECTS.find((e) => e.id === id)?.name ?? 'Pure'

/**
 * Compose the formula. Works with partial answers so the background can follow
 * along while the questions are still being answered.
 */
export function composeFormula(answers = EMPTY_ANSWERS, tweaks = NO_TWEAKS) {
  const world = getOption('world', answers.world)
  const voice = getOption('voice', answers.voice)
  const hour = getOption('hour', answers.hour)
  const light = getOption('light', answers.light)

  // 01 — the world sets the ground.
  let { l, c, h } = world ? { ...world.base } : { ...NEUTRAL }

  // 02 — the voice decides how much chroma the colour admits to.
  if (voice) c *= voice.chroma

  // 03 — the hour moves lightness and warmth. Negative warmth = towards the
  // reds, which is what late sun actually does to a facade.
  if (hour) {
    l += hour.lightness
    h += hour.warmth
    c *= hour.chroma
  }

  // Manual refinement on top.
  h += tweaks.hue
  l += tweaks.lightness
  c += tweaks.chroma

  // Floor at 0.23: "Basalt" after dark otherwise resolves to #08090d, which is
  // the interface background — a matt panel in it would be invisible. OKLCH
  // lightness is darker than it sounds, so the floor has to sit this high to
  // clear the background while still reading as black.
  const colour = toGamut({
    l: clamp(l, 0.23, 0.97),
    c: clamp(c, 0, 0.37),
    h: ((h % 360) + 360) % 360,
  })

  const gloss = clamp(tweaks.gloss ?? light?.gloss ?? 0.34, 0, 1)
  const effect = tweaks.effect ?? light?.effect ?? 'none'

  return {
    colour,
    gloss,
    effect,
    hex: oklchToHex(colour),
    css: oklchToCss(colour),
    cmyk: toCmyk(colour),
    surface: surfaceName(gloss),
    name: composeName(world, hour),
    code: composeCode(colour),
    complete: Boolean(world && voice && hour && light),
  }
}

/**
 * Two words: the hour, then the world. "Ember Kiln", "Nocturne Fathom".
 * The name is fixed by the four answers and survives refinement — the code
 * carries the numbers, the name carries the intent.
 */
function composeName(world, hour) {
  if (!world) return 'Undecided'
  return hour ? `${hour.name} ${world.name}` : world.name
}

/** Lab code: hue to three digits, lightness to two. Reads like a real sample. */
function composeCode({ l, h }) {
  const hue = String(Math.round(h)).padStart(3, '0')
  const lum = String(Math.round(l * 100)).padStart(2, '0')
  return `MC ${hue} · ${lum}`
}

/**
 * Three.js material parameters.
 *
 * Gloss is deliberately not mapped linearly to roughness: the visible
 * difference between matt and silk lives in the top of the roughness range,
 * so the curve is weighted there. Squaring keeps the low-gloss end readable.
 */
export function materialParams({ colour, gloss, effect }) {
  /*
    The top of the gloss range is deliberately short of a mirror.

    At roughness 0.03 with a full clearcoat the panel stops being a lacquer and
    becomes a reflector: it hands back the studio softbox at almost full
    strength and, at the angle the panel happens to be tilted, the highlight
    covers most of its face. The colour disappears behind its own shine — which
    is the one failure a paint manufacturer cannot ship.

    A real high-gloss lacquer on a wall always shows its pigment plus a
    highlight. Holding the floor at 0.075, capping the clearcoat below full and
    easing off the reflection strength keeps the shine convincing at maximum
    while leaving the colour legible from every angle.
  */
  const roughness = clamp(Math.pow(1 - gloss, 1.55), 0.09, 0.98)

  const base = {
    roughness,
    metalness: 0.0,
    // One coat, not two. A wall lacquer is single-layer; the clearcoat here is
    // modelling the depth of that layer, not a second mirror on top of it.
    clearcoat: clamp((gloss - 0.45) * 1.0, 0, 0.55),
    // Below about 0.1 the softbox reflects with a hard rectangular edge, which
    // is what makes it read as a mirror rather than as a highlight.
    clearcoatRoughness: clamp(0.35 - gloss * 0.21, 0.14, 0.4),
    iridescence: 0,
    iridescenceIOR: 1.3,
    sheen: 0,
    // Clamped rather than given a flatter slope on purpose: envMapIntensity
    // scales the diffuse image-based light as well as the reflection, so
    // lowering the slope would darken the matt finishes too. The ceiling only
    // bites above gloss 0.47 — matt and silk stay exactly as they were.
    envMapIntensity: clamp(0.75 + gloss * 0.85, 0.75, 1.15),
    flake: 0,
  }

  // Effects are deliberately restrained. Three.js will happily render a soap
  // bubble at iridescence 1, but a real iridescent lacquer still reads as its
  // base colour — the shift is a highlight on top, not a replacement. The
  // pigment has to survive every effect, or the answers stop meaning anything.
  switch (effect) {
    case 'pearl':
      return { ...base, sheen: 0.7, iridescence: 0.16, envMapIntensity: base.envMapIntensity + 0.15 }
    case 'metallic':
      return { ...base, metalness: 0.72, roughness: clamp(roughness * 0.7 + 0.08, 0.06, 0.6) }
    case 'iridescent':
      return { ...base, iridescence: 0.5, iridescenceIOR: 1.6, metalness: 0.12 }
    case 'glitter':
      return { ...base, metalness: 0.34, flake: 1, envMapIntensity: base.envMapIntensity + 0.3 }
    default:
      return base
  }
}

/** Lightness at which we flip overlay text from chalk to void. */
export const inkOn = (colour) => (colour.l > 0.72 ? '#08090a' : '#f4f3f1')

export { oklchToCss, oklchToHex }
