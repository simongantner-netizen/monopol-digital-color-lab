import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { getOption } from '../lib/questions'
import { composeFormula, inkOn } from '../lib/colorEngine'
import ColourName from './ColourName'
import Signature from './Signature'

/**
 * The colour arrives.
 *
 * The panel itself is rendered in WebGL behind this layer, so everything here
 * lives at the top and bottom edges — the middle of the screen belongs to the
 * colour and nothing is allowed to sit on top of it.
 */

const ease = [0.16, 1, 0.3, 1]

const rise = {
  hidden: { opacity: 0, y: 22, filter: 'blur(10px)' },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 1.2, delay: 0.9 + i * 0.13, ease },
  }),
}

/**
 * The name gets its own arrival, not a slot in the queue.
 *
 * Everything on this screen used to share one variant, so the colour's name
 * entered a tenth of a second apart from the footer — the same treatment for
 * the payoff and for the small print. It comes out of further away now, takes
 * longer to settle, and waits for the label above it to finish, so there is a
 * beat of nothing before the thing everyone is here for.
 */
const arrive = {
  hidden: { opacity: 0, y: 44, scale: 0.965, filter: 'blur(16px)' },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 1.6, delay: 1.35, ease },
  },
}

/** Deep-equal enough for three numbers that all come from the same table. */
const sameTweak = (a, b) =>
  !!a && !!b && a.hue === b.hue && a.lightness === b.lightness && a.chroma === b.chroma

export default function Reveal({ formula, answers, tweaks, onRefine, onRename, onPick }) {
  // The recipe, in the order it was mixed.
  const recipe = [
    getOption('world', answers.world),
    getOption('voice', answers.voice),
    getOption('hour', answers.hour),
    getOption('light', answers.light),
  ].filter(Boolean)

  /**
   * Neighbouring versions of the same colour, run through the real engine.
   * A button saying "you can adjust this" is a claim; showing four colours it
   * could become is proof — and it is what actually makes people click.
   *
   * Each one moves lightness AND chroma, not just hue. A hue-only spread is
   * invisible on a near-neutral answer like Basalt-whispered, which is exactly
   * the case where someone most needs to see that there is more to do.
   */
  const neighbours = useMemo(
    () =>
      [
        { hue: -28, lightness: -0.11, chroma: 0.035 },
        { hue: -14, lightness: 0.09, chroma: 0.015 },
        null, // the colour exactly as the answers mixed it
        { hue: 15, lightness: -0.09, chroma: 0.015 },
        { hue: 29, lightness: 0.11, chroma: 0.035 },
      ].map((t) => ({
        tweak: t,
        // All three axes have to be present as numbers. Leaving one undefined
        // reaches the engine as arithmetic on undefined, and the NaN comes out
        // the far end as an unparseable rgb() — a swatch that is simply not
        // there, with nothing logged to say why.
        css: composeFormula(answers, {
          hue: 0,
          lightness: 0,
          chroma: 0,
          ...(t ?? {}),
          gloss: null,
          effect: null,
        }).css,
      })),
    [answers],
  )

  // Which of the five is currently on the panel. Null tweaks mean the middle
  // one, which is why an explicit index beats comparing against the formula.
  const active = neighbours.findIndex(({ tweak }) =>
    tweak ? sameTweak(tweak, tweaks) : !tweaks?.hue && !tweaks?.lightness && !tweaks?.chroma,
  )

  return (
    <motion.section
      className="pointer-events-none fixed inset-0 z-30 flex flex-col items-center justify-between px-6 py-8 text-center sm:py-11"
      exit={{ opacity: 0, filter: 'blur(12px)' }}
      transition={{ duration: 0.6, ease }}
    >
      {/*
        The door says the colour does not exist yet. This is the sentence that
        answers it, and it has to be the same three words turned round — "Your
        colour" was a caption on the most expensive moment in the experience,
        and it closed nothing.
      */}
      <motion.p className="label text-dim" variants={rise} initial="hidden" animate="show" custom={0}>
        It exists now
      </motion.p>

      <div className="flex w-full max-w-3xl flex-col items-center">
        <motion.div className="w-full" variants={arrive} initial="hidden" animate="show">
          <ColourName name={formula.name} onRename={onRename} size="large" />
        </motion.div>

        {/* mt-12 rather than mt-5: the rename hint lives in this gap. */}
        <motion.div
          className="mt-12 flex items-center gap-3.5"
          variants={rise}
          initial="hidden"
          animate="show"
          custom={2}
        >
          <span
            className="block size-2.5 rounded-full"
            style={{ background: formula.css, boxShadow: `0 0 22px ${formula.css}` }}
          />
          <span className="tnum label text-ash">{formula.code}</span>
          <span className="h-3 w-px bg-white/15" />
          <span className="label text-ash">{formula.surface}</span>
        </motion.div>

        {/* The recipe — proof that the colour came from the answers. */}
        <motion.p
          className="mt-7 max-w-[46ch] text-[0.82rem] leading-relaxed font-light text-dim"
          variants={rise}
          initial="hidden"
          animate="show"
          custom={3}
        >
          {recipe.map((option, i) => (
            <span key={option.id}>
              {i > 0 && <span className="mx-2 opacity-40">·</span>}
              {option.title}
            </span>
          ))}
        </motion.p>

        {/* Proof that this is a starting point, not a result. */}
        <motion.div
          className="mt-9 flex flex-col items-center sm:mt-10"
          variants={rise}
          initial="hidden"
          animate="show"
          custom={4}
        >
          <p className="label mb-3.5 text-[10px] text-dim">This is a starting point</p>

          {/*
            Five colours you can actually have, not five illustrations of the
            idea that colours exist. They were already doing the persuading —
            showing what the colour could become is what makes people press
            Adjust — so letting them be taken is the smaller change: you switch
            in one click and still tune from wherever you land.

            They are also drawn big enough to read now. At twenty pixels and
            45% opacity you could tell there were dots; you could not tell which
            way any of them went, which is the only thing they are for.
          */}
          <div className="pointer-events-auto flex items-center gap-2.5">
            {neighbours.map(({ tweak, css }, i) => {
              const isCentre = tweak === null
              const isActive = i === active
              return (
                <motion.button
                  key={i}
                  type="button"
                  onClick={() => onPick(tweak)}
                  aria-label={isCentre ? 'The colour as mixed' : `Variation ${i + 1}`}
                  aria-pressed={isActive}
                  className={`block rounded-full transition-[box-shadow,opacity] duration-500 ${
                    isCentre ? 'size-11 sm:size-14' : 'size-8 sm:size-10'
                  } ${isActive ? 'opacity-100 ring-1 ring-white/50' : 'opacity-70 hover:opacity-100'}`}
                  style={{
                    background: css,
                    boxShadow: isActive ? `0 0 30px -4px ${css}` : 'none',
                  }}
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.94 }}
                  transition={{ duration: 0.4, ease }}
                />
              )
            })}
          </div>
        </motion.div>

        <motion.button
          type="button"
          onClick={onRefine}
          className="group pointer-events-auto relative mt-6 overflow-hidden rounded-full px-11 py-4 transition-transform duration-500"
          style={{ background: formula.css, color: inkOn(formula.colour) }}
          variants={rise}
          initial="hidden"
          animate="show"
          custom={5}
          whileHover={{ scale: 1.035 }}
          whileTap={{ scale: 0.985 }}
        >
          <span className="absolute inset-0 bg-white opacity-0 transition-opacity duration-500 group-hover:opacity-15" />
          <span className="label relative text-[11px]">Give it your final twist</span>
        </motion.button>

        {/* No explanatory line under the button — "Adjust this colour" on a
            filled button, over four visible alternatives, already says it. */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, delay: 2.6, ease }}
        >
          <Signature />
        </motion.div>
      </div>
    </motion.section>
  )
}
