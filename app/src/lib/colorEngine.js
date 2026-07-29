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

/**
 * Interference film thickness ranges, as module constants rather than literals
 * inside `materialParams`.
 *
 * An array written inline is a new array every call, and `materialParams` is
 * called on every render. The panel keys its map-swap effect off these, so a
 * fresh identity meant the effect re-ran — and asked three for a material
 * update — on every pixel of every slider drag. Nothing about the film had
 * changed; only the box it arrived in.
 */
const FILM_PEARL = [120, 520]
/*
  A hundred and ten nanometres, starting at 270.

  The span has to stay inside one order or the same hue appears twice on one
  face, and concentric repeats are exactly what makes a surface read as a soap
  bubble instead of a lacquer. One full turn is λ/(2n): at the film index below
  that is 138 nm, so 110 is four-fifths of a turn — the colour walks once
  across the panel and repeats nowhere.

  This narrowed when the film index rose. The two numbers are not independent,
  and a range tuned against the old index would have banded against the new one.
*/
const FILM_IRIS = [270, 380]

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
    name: composeName(world, voice, hour),
    code: composeCode(colour),
    complete: Boolean(world && voice && hour && light),
  }
}

/**
 * Two words: a qualifier, then the world. "Ember Kiln", "Vivid Fathom".
 *
 * The qualifier goes to whichever answer changed the colour most. Whisper and
 * Shout move it further than any hour does — a whispered Indigo and a shouted
 * one are five times apart in chroma — so those take the name. Speak is the
 * neutral answer and hands the qualifier back to the hour, which is then the
 * thing that did the work.
 *
 * Two words, never three. A name a person will retype has to be sayable.
 */
function composeName(world, voice, hour) {
  if (!world) return 'Undecided'
  const qualifier = voice?.name || hour?.name
  return qualifier ? `${qualifier} ${world.name}` : world.name
}

/**
 * Lab code: hue to three digits, then lightness and chroma to two each.
 *
 * Chroma is here because without it the code was not a reference at all. Hue
 * and lightness alone are blind to question 02, so a whispered colour and a
 * shouted one — visibly a pale grey-blue and a saturated ultramarine — came
 * out of the engine sharing one number. A reference that cannot tell two
 * colours apart is worse than no reference: it is the one line on the passport
 * an architect actually checks, and it was quietly wrong.
 *
 * With all three of OKLCH's components in it, the code now identifies the
 * colour completely. The name carries the intent; this carries the colour.
 */
function composeCode({ l, c, h }) {
  const hue = String(Math.round(h)).padStart(3, '0')
  const lum = String(Math.round(l * 100)).padStart(2, '0')
  const chroma = String(Math.round(c * 100)).padStart(2, '0')
  return `MC ${hue} · ${lum} · ${chroma}`
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
    // Carried through so the panel can pick its surface maps by name. It used
    // to infer them from the numbers — flake from `flake > 0`, brushed from
    // `metalness > 0.6` — which quietly tied the choice of texture to the
    // choice of parameter value, and broke the moment either was retuned.
    effect,
    roughness,
    metalness: 0.0,
    // Ordinary lacquer. Raised only where an effect needs a stronger specular
    // to work with; unlike metalness, `ior` leaves the pigment untouched.
    ior: 1.5,
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
  }

  // Effects are deliberately restrained. Three.js will happily render a soap
  // bubble at iridescence 1, but a real iridescent lacquer still reads as its
  // base colour — the shift is a highlight on top, not a replacement. The
  // pigment has to survive every effect, or the answers stop meaning anything.
  switch (effect) {
    /*
      Pearl keeps the film it always had.

      Without a thickness map three reads only the *maximum* of the range, so
      pearl's look was never "120 to 520" — it was a flat 520 nm, and at IOR 1.3
      that is a faint magenta cast. Retuning the range for the interference
      lacquer silently moved pearl to 400 nm, which at the same IOR casts green
      instead. A finish nobody asked to change had its colour flipped. The range
      belongs to the effect, not to the material.
    */
    case 'pearl':
      return {
        ...base,
        sheen: 0.7,
        iridescence: 0.16,
        film: FILM_PEARL,
        envMapIntensity: base.envMapIntensity + 0.15,
      }
    case 'metallic':
      return { ...base, metalness: 0.72, roughness: clamp(roughness * 0.7 + 0.08, 0.06, 0.6) }
    /*
      Iridescent needs a brighter specular to interfere with, and there are two
      ways to buy one. `metalness: 0.12` was the wrong one: metalness folds the
      pigment into the reflection and takes 12% of the diffuse colour away with
      it. Raising the refractive index leaves the pigment at full strength.

      But only as far as a binder actually goes. Acrylic sits at 1.49, polyester
      at 1.57, epoxy between 1.55 and 1.6; 1.72 is flint glass, and a highlight
      75% brighter than any binder can return is precisely "showing what a real
      lacquer cannot" — the one rule this file is not allowed to break. Worse,
      the clearcoat above it is fixed at 1.5 in three, so 1.72 underneath would
      be a stack nobody could mix. At 1.58 F0 rises from 0.040 to 0.0505: a
      quarter more specular for the film to work with, and every number still
      lands inside a real can of paint.

      The mix factor stays well under 1 because an interference lacquer is
      partial coverage by platelets, not a film over the whole surface.
    */
    case 'iridescent':
      /*
        The film index is the whole effect, and 1.6 was very nearly nothing.

        Interference happens at the boundary between the film and what is under
        it, and the strength of that boundary is the square of the index
        mismatch. A film at 1.6 sitting on a binder at 1.58 reflects 0.000040 of
        what reaches it: optically the film was not there at all. Measured on
        the built panel, the hue spread across the face was 4.5 degrees against
        3.0 for no effect at all — inside the noise. "Break it into colours"
        broke nothing.

        Worse, that was self-inflicted. Raising the binder from 1.50 to 1.58 to
        brighten the specular collapsed the mismatch by a factor of twenty-six
        in the same edit that was supposed to make this visible.

        Real interference pigment is mica coated in rutile titanium dioxide,
        which sits near 2.6 and returns 0.0595 — a hundred and fifty times the
        old boundary. Two is deliberately short of that: three hundred and forty
        times stronger than before, still well under what the pigment on the
        shelf actually does. Visible, and quieter than the real thing.
      */
      return { ...base, iridescence: 0.55, iridescenceIOR: 2.0, ior: 1.58, film: FILM_IRIS }
    /*
      Flake takes no metalness — but not for the reason first written here.

      The tempting argument was that a metallic flake returns a dimmer
      reflection than a dielectric one on dark pigments. That is simply wrong: a
      clear-coated aluminium platelet hands back aluminium, around 0.91
      broadband. The real reason is duller and correct — there is no metalness
      map here, so any metalness applies to the binder between the flakes as
      well, and the binder is not metal. Setting it to zero costs the pigment
      nothing and misrepresents nothing.

      `flake` carries how hard the platelets may be tilted, dimmed on the dark
      answers. It mirrors `glint` on the sample card exactly, which has held
      this guard since v3.1 while the panel went without one.

      The envMapIntensity lift was propping up a sparkle that was never
      arriving; with the flakes now resolved it goes back down.
    */
    case 'glitter':
      return {
        ...base,
        metalness: 0,
        flake: 0.6 + colour.l * 0.4,
        envMapIntensity: base.envMapIntensity + 0.12,
      }
    default:
      return base
  }
}

/** Lightness at which we flip overlay text from chalk to void. */
export const inkOn = (colour) => (colour.l > 0.72 ? '#08090a' : '#f4f3f1')

export { oklchToCss, oklchToHex }
