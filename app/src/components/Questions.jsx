import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QUESTIONS } from '../lib/questions'
import { composeFormula } from '../lib/colorEngine'
import { clamp, oklchToCss } from '../lib/oklch'

/**
 * The four questions.
 *
 * Every option carries the colour it would produce, computed through the same
 * engine as the real answer. A card is therefore an honest preview, not a
 * decoration — on question 02 you can literally see "whisper" and "shout" as
 * two intensities of the same hue before committing.
 *
 * The colour is on the card before you touch it. It used to appear only on
 * hover, which meant twelve worlds all looked like the same grey tile and the
 * only way to find out what any of them looked like was to visit all twelve in
 * turn. Hovering now deepens a colour that is already there, rather than
 * switching one on.
 */

/**
 * A version of a colour that survives being shown on near-black.
 *
 * Basalt and Indigo are genuinely dark, and painted honestly at this size they
 * are indistinguishable from the card they sit on — the tint would be missing
 * in exactly the places it is most needed. So lightness gets a floor.
 *
 * Chroma barely gets one, and that is the correction. A floor of 0.028 was
 * inventing saturation for worlds that have none: Basalt is all but
 * achromatic at 0.009, and lifting it painted a violet-grey tile at hue 265 —
 * near enough to Threshold's violet that the two sat side by side in the grid
 * looking like the same answer twice. A neutral world should read neutral.
 * The floor is now low enough only to stop a hue collapsing to pure grey.
 */
const legible = (colour, alpha = 1, floor = 0.5) =>
  oklchToCss(
    { ...colour, l: Math.max(colour.l, floor), c: Math.max(colour.c, 0.012) },
    alpha,
  )

const ease = [0.16, 1, 0.3, 1]

const COLUMN_CLASS = {
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
}

/**
 * Metallic flake, as a field of specks with no pattern in it.
 *
 * The first attempt at this stacked three tiled radial gradients at 5, 7 and
 * 11 pixels, on the theory that co-prime periods would not line up. They line
 * up immediately: every layer is still a lattice, and three lattices beating
 * against each other produce a coarser one. The band read as a window screen,
 * which is the single most artificial thing that has been on this screen.
 *
 * Noise has no period, so there is nothing to beat. `feTurbulence` renders one
 * irregular field, the alpha row of the matrix keeps only its brightest
 * fraction, and what is left is a scatter of one-pixel glints. Costs one
 * filter pass at paint time, ships as a string, and downloads nothing.
 *
 * The gain and offset were not guessed. Rendered into a canvas and counted,
 * `6.5 / 4.4` covers 5.2% of the field, peaks at full white and leaves a
 * quarter of a percent above alpha 150 — a sparse scatter with a few real
 * glints in it. `3.4 / 1.78` covers forty per cent, which is not sparkle but
 * haze. The field is 320 wide so it never repeats inside a card at any column
 * count; a tile that repeated would put the lattice straight back.
 */
const SPARKLE_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='90'>
<filter id='s' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'>
<feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='1' seed='11' stitchTiles='stitch'/>
<feColorMatrix type='matrix' values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 6.5 0 0 0 -4.4'/>
</filter>
<rect width='320' height='90' filter='url(#s)'/>
</svg>`

const SPARKLE = `url("data:image/svg+xml,${encodeURIComponent(SPARKLE_SVG)}")`

/**
 * How each finish returns light, as a sample band across the foot of the card.
 *
 * Question 04 is comparative — how should yours hold it — so the five cards
 * have to differ, and until recently they did not. The first fix went too far
 * the other way and painted surfaces no coating can produce: a chrome streak
 * for gloss, a cyan-to-magenta oil slick for iris, a dot grid for flake. The
 * engine's own rule is a page away in `materialParams` — *the pigment has to
 * survive every effect* — and these broke it. Worse, they were promises the
 * panel two screens later does not keep, and a coatings manufacturer is
 * exactly the visitor who would notice.
 *
 * So they are built from the colour itself now, on two rules:
 *
 *   The pigment stays.  Every layer is either the answer's own colour at a
 *   different depth, or the same hue walked a few degrees. Nothing foreign is
 *   introduced anywhere.
 *
 *   Light adds, it does not wash.  Highlights blend in `screen`, not as white
 *   at some alpha over the top. White-over-colour desaturates — a 55% white
 *   veil on a cinnabar gives grey-pink, which is why the old silk band looked
 *   smeared. Screening lifts the colour toward a brighter version of itself
 *   and only reaches white in the core, which is what a specular highlight
 *   physically is.
 *
 * The strength of the sheen is the whole argument between matt and gloss: matt
 * has none, silk has a wide weak one, gloss a narrow bright one over a deeper
 * surround — a glossy surface reflects the dark room around its highlight, and
 * that contrast reads as gloss far more than the highlight does. Which is also
 * why the surround deepens further on pale colours than on dark ones.
 *
 * Still CSS, not the renderer: one canvas cannot be in five places. A hint, in
 * the way the colour wash on every other card is a hint — but now a hint the
 * real panel makes good on.
 */
const SURFACE = {
  // Light goes in and nothing comes out. No sheen at all, and the only
  // gradient is the fall of the light down the band.
  swallow: (t, d) => ({ base: `linear-gradient(168deg, ${t(0.012 * d)} 0%, ${t(-0.05 * d)} 100%)` }),

  // Silk: one broad sheen, soft enough that it never resolves into an edge.
  // Its first version was so gentle it was indistinguishable from matt, which
  // is the same shrug in quieter clothes — the answer has to be visible.
  soft: (t, d) => ({
    base: `linear-gradient(168deg, ${t(-0.005 * d)} 0%, ${t(-0.075 * d)} 100%)`,
    sheen:
      'radial-gradient(105% 185% at 30% -30%, #ffffff54 0%, #ffffff26 34%, #ffffff0a 62%, transparent 84%)',
  }),

  // High gloss: the same light gathered into a narrow core, and the surround
  // dropped away behind it.
  return: (t, d) => ({
    base: `linear-gradient(168deg, ${t(-0.04 * d)} 0%, ${t(-0.14 * d)} 100%)`,
    sheen:
      'radial-gradient(46% 150% at 30% -12%, #ffffffbf 0%, #ffffff59 18%, #ffffff1c 40%, transparent 70%)',
  }),

  // Iridescent: the hue walks, and comes back. An interference pigment shifts
  // the colour toward its neighbours and pastels as it goes — it does not hand
  // you a spectrum. Twenty-six degrees each way is a flip you can see without
  // ever leaving the family, and on a near-neutral pigment it correctly shows
  // almost nothing: there is no chroma there to flip.
  break: (t, d) => ({
    base:
      `linear-gradient(101deg, ${t(-0.01 * d)} 0%, ${t(0.055, 0.62, -26)} 28%, ` +
      `${t(0)} 51%, ${t(0.055, 0.62, 26)} 76%, ${t(-0.015 * d)} 100%)`,
    sheen: 'radial-gradient(125% 215% at 34% -42%, #ffffff26 0%, #ffffff10 46%, transparent 80%)',
  }),

  // Metallic flake: a gloss surface with the specks masked to where the light
  // falls, because that is the only place a flake has anything to return.
  fire: (t, d, l) => ({
    base: `linear-gradient(168deg, ${t(-0.025 * d)} 0%, ${t(-0.1 * d)} 100%)`,
    sheen:
      'radial-gradient(90% 195% at 31% -32%, #ffffff6b 0%, #ffffff2b 32%, #ffffff0d 58%, transparent 82%)',
    sparkle: 'radial-gradient(115% 240% at 31% -32%, #000 0%, #000000e6 40%, transparent 82%)',
    // A white speck on a near-black pigment is the highest contrast anything
    // on this screen can reach, and at full strength the band stops being a
    // panel and becomes a starfield. Held back on the darks only.
    glint: 0.6 + l * 0.4,
  }),
}

/**
 * The finish bands for one colour.
 *
 * `t` moves the colour in OKLCH — lightness, then optionally chroma and hue —
 * so every shade in a band is the answer's own colour seen under more or less
 * light. `d` deepens the fall on pale colours: white gloss lives almost
 * entirely on how dark its surround goes, dark gloss on its highlight.
 */
const surfaceFor = (colour, id) => {
  const t = (dl, dc = 1, dh = 0) =>
    oklchToCss({
      l: clamp(colour.l + dl, 0.03, 0.98),
      c: Math.max(0, colour.c * dc),
      h: (colour.h + dh + 360) % 360,
    })
  return SURFACE[id](t, 0.55 + colour.l * 0.8, colour.l)
}

function OptionCard({ option, question, index, selected, preview, onPick, onHover }) {
  const compact = question.columns >= 4
  const finish = preview.surface

  return (
    <motion.button
      type="button"
      onClick={() => onPick(question.id, option.id)}
      onMouseEnter={() => onHover(option.id)}
      onFocus={() => onHover(option.id)}
      onMouseLeave={() => onHover(null)}
      onBlur={() => onHover(null)}
      className={`group relative flex flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.015] p-5 text-left backdrop-blur-[2px] transition-all duration-500 hover:border-white/25 focus-visible:border-white/40 focus-visible:outline-none sm:rounded-2xl sm:p-6 ${
        // The surface band owns the foot of the card, so the caption moves up
        // out of its way rather than sitting on top of a gloss highlight.
        finish ? 'pb-16 sm:pb-20' : ''
      }`}
      initial={{ opacity: 0, y: 22, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.85, delay: 0.28 + index * 0.07, ease }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.985 }}
      aria-pressed={selected}
    >
      {/*
        The colour this answer would make, breathing under the glass.

        Two washes cross-fading rather than one wash changing strength: a
        gradient cannot be interpolated, so animating opacity between two fixed
        gradients is what makes the deepening smooth instead of stepped.
      */}
      <span
        className="pointer-events-none absolute -inset-px transition-opacity duration-700 group-hover:opacity-0"
        style={{
          background: `radial-gradient(130% 95% at 50% 118%, ${preview.rest} 0%, transparent 66%)`,
        }}
      />
      <span
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-700 group-hover:opacity-100 group-focus-visible:opacity-100"
        style={{
          background: `radial-gradient(120% 90% at 50% 115%, ${preview.lit} 0%, transparent 62%)`,
        }}
      />
      {/* The edge states the colour outright, for the worlds too dark to wash. */}
      {!finish && (
        <span
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] opacity-70 transition-opacity duration-700 group-hover:opacity-100"
          style={{ background: preview.edge }}
        />
      )}

      {/*
        On question 04 the edge grows into a sample of the surface itself.

        `isolate` matters: the sheen and the specks blend in `screen`, and
        without a stacking context of their own they would screen against the
        card, the colour wash and the page behind it as well — which lights up
        the whole tile instead of the sample.
      */}
      {finish && (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 isolate h-11 overflow-hidden opacity-90 transition-opacity duration-700 group-hover:opacity-100 sm:h-14">
          <span className="absolute inset-0" style={{ background: finish.base }} />
          {finish.sheen && (
            <span
              className="absolute inset-0 mix-blend-screen"
              style={{ background: finish.sheen }}
            />
          )}
          {finish.sparkle && (
            <span
              className="absolute inset-0 mix-blend-screen"
              style={{
                backgroundImage: SPARKLE,
                backgroundSize: '320px 90px',
                maskImage: finish.sparkle,
                WebkitMaskImage: finish.sparkle,
                opacity: finish.glint,
              }}
            />
          )}
        </span>
      )}

      {option.time && (
        <span className="tnum label relative mb-3 text-[10px] text-dim transition-colors duration-500 group-hover:text-ash">
          {option.time}
        </span>
      )}

      <span
        className={`relative font-light tracking-[-0.015em] text-chalk ${
          compact
            ? 'text-[clamp(1.05rem,1.7vw,1.4rem)] leading-tight'
            : 'text-[clamp(1.15rem,1.75vw,1.5rem)] leading-[1.15]'
        }`}
      >
        {option.title}
      </span>

      <span className="relative mt-2 text-[0.82rem] leading-snug font-light text-dim transition-colors duration-500 group-hover:text-ash">
        {option.caption}
      </span>

      {/* Selection mark — a filled dot in the colour it just produced. */}
      <AnimatePresence>
        {selected && (
          <motion.span
            className="absolute top-4 right-4 block size-1.5 rounded-full sm:top-5 sm:right-5"
            style={{ background: preview.edge }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  )
}

export default function Questions({ step, answers, onAnswer, onHover }) {
  const question = QUESTIONS[step]

  // Resolve each option through the real engine so the preview cannot drift
  // from the result.
  const previews = useMemo(
    () =>
      Object.fromEntries(
        question.options.map((option) => {
          const { colour } = composeFormula({ ...answers, [question.id]: option.id })
          return [
            option.id,
            {
              // At rest, hovered, and the edge that names the colour outright.
              rest: legible(colour, 0.3),
              lit: legible(colour, 0.62),
              edge: legible(colour, 1, 0.56),
              // Question 04 gets a sample of its finish instead of an edge,
              // built from the colour as it really is — no legibility floor,
              // because a band this size can carry a dark colour honestly.
              surface: question.id === 'light' ? surfaceFor(colour, option.id) : null,
            },
          ]
        }),
      ),
    [question, answers],
  )

  // No justify-center on the section. In a scrolling flex container, centring
  // content that overflows clips the top and makes it unreachable — on a phone
  // the first question lost its opening line. `m-auto` on the child centres it
  // when it fits and behaves like normal flow when it does not.
  return (
    <motion.section
      className="no-scrollbar fixed inset-0 z-30 flex flex-col items-center overflow-y-auto overscroll-contain px-5 py-20 sm:px-10 sm:py-24"
      exit={{ opacity: 0, filter: 'blur(12px)' }}
      transition={{ duration: 0.55, ease }}
    >
      <AnimatePresence mode="wait">
        <div key={question.id} className="m-auto w-full max-w-6xl">
          <motion.div
            className="mb-9 text-center sm:mb-12"
            initial={{ opacity: 0, y: 18, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -14, filter: 'blur(10px)' }}
            transition={{ duration: 0.9, ease }}
          >
            <p className="label mb-5 text-dim">
              <span className="tnum">{question.index}</span>
              <span className="mx-2.5 opacity-40">/</span>
              {question.label}
            </p>

            <h2 className="mx-auto max-w-[24ch] text-[clamp(1.6rem,min(3.6vw,5.5vh),2.9rem)] leading-[1.12] font-light tracking-[-0.025em] text-chalk text-balance">
              {question.prompt}
            </h2>

            <p className="mt-4 text-[0.85rem] font-light text-dim">{question.note}</p>
          </motion.div>

          <motion.div
            className={`grid gap-2.5 sm:gap-3.5 ${COLUMN_CLASS[question.columns]}`}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45, ease }}
          >
            {question.options.map((option, i) => (
              <OptionCard
                key={option.id}
                option={option}
                question={question}
                index={i}
                selected={answers[question.id] === option.id}
                preview={previews[option.id]}
                onPick={onAnswer}
                onHover={onHover}
              />
            ))}
          </motion.div>
        </div>
      </AnimatePresence>
    </motion.section>
  )
}
