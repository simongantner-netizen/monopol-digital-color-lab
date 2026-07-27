import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QUESTIONS } from '../lib/questions'
import { composeFormula } from '../lib/colorEngine'
import { oklchToCss, oklchToHex } from '../lib/oklch'

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
 * How each finish returns light, as a band across the card.
 *
 * Question 04 asks a comparative question — how should yours hold it — and
 * every one of its five cards used to carry exactly the same wash, because
 * gloss and effect leave the colour untouched. Five identical tiles is the one
 * place the interface answered a question with a shrug.
 *
 * These are CSS, not the renderer: one canvas serves the whole app, and it
 * cannot be in five places at once. They are a hint, in the same way the
 * colour wash on every other card is a hint — the honest article is the panel
 * two screens later, under real light. What they have to do is make the
 * difference between matt and gloss visible at a glance, side by side, which
 * is what the question actually asks.
 */
const FINISH = {
  // Light goes in and nothing comes out: no highlight anywhere.
  swallow: (c) => `linear-gradient(160deg, ${c}e6 0%, ${c}cc 100%)`,
  // Silk: one broad, soft sheen that never resolves into an edge.
  soft: (c) =>
    `linear-gradient(118deg, ${c}cc 0%, ${c}f2 34%, #ffffff26 52%, ${c}e6 72%, ${c}bf 100%)`,
  // High gloss: a narrow specular streak with a dark surround, the way a wet
  // surface hands the softbox straight back.
  return: (c) =>
    `linear-gradient(112deg, ${c}b3 0%, ${c}80 30%, #ffffff8c 44%, #ffffffd9 48%, ${c}99 58%, ${c}e6 100%)`,
  // Iridescent: the hue walks across the band instead of the highlight.
  break: (c) =>
    `linear-gradient(105deg, ${c}d9 0%, #7de3ff73 26%, ${c}e6 48%, #ff9ad673 70%, ${c}d9 100%)`,
  // Metallic flake: thousands of tiny mirrors, so thousands of tiny specks.
  fire: (c) =>
    `radial-gradient(circle at 22% 32%, #ffffffbf 0.6px, transparent 1.1px),` +
    `radial-gradient(circle at 68% 71%, #ffffffa6 0.6px, transparent 1.1px),` +
    `radial-gradient(circle at 44% 88%, #ffffff8c 0.5px, transparent 1px),` +
    `linear-gradient(120deg, ${c}cc 0%, ${c}f2 46%, ${c}bf 100%)`,
}

const FINISH_SIZE = {
  fire: '7px 7px, 11px 11px, 5px 5px, 100% 100%',
}

function OptionCard({ option, question, index, selected, preview, onPick, onHover }) {
  const compact = question.columns >= 4
  const finish = question.id === 'light' ? FINISH[option.id] : null

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

      {/* On question 04 the edge grows into the surface itself. */}
      {finish && (
        <span
          className="pointer-events-none absolute inset-x-0 bottom-0 h-11 opacity-85 transition-opacity duration-700 group-hover:opacity-100 sm:h-14"
          style={{
            backgroundImage: finish(preview.real),
            backgroundSize: FINISH_SIZE[option.id] ?? undefined,
          }}
        />
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
              // The surface bands need the colour as it really is, and as a
              // hex, because they layer alpha onto it.
              real: oklchToHex(colour),
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

            <h2 className="mx-auto max-w-[24ch] text-[clamp(1.6rem,3.6vw,2.9rem)] leading-[1.12] font-light tracking-[-0.025em] text-chalk text-balance">
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
