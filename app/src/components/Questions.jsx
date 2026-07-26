import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QUESTIONS } from '../lib/questions'
import { composeFormula } from '../lib/colorEngine'

/**
 * The four questions.
 *
 * Every option carries the colour it would produce, computed through the same
 * engine as the real answer. Hovering a card is therefore an honest preview,
 * not a decoration — on question 02 you can literally see "whisper" and
 * "shout" as two intensities of the same hue before committing.
 */

const ease = [0.16, 1, 0.3, 1]

const COLUMN_CLASS = {
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
}

function OptionCard({ option, question, index, selected, previewHex, onPick, onHover }) {
  const compact = question.columns >= 4

  return (
    <motion.button
      type="button"
      onClick={() => onPick(question.id, option.id)}
      onMouseEnter={() => onHover(option.id)}
      onFocus={() => onHover(option.id)}
      onMouseLeave={() => onHover(null)}
      onBlur={() => onHover(null)}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.015] p-5 text-left backdrop-blur-[2px] transition-all duration-500 hover:border-white/25 focus-visible:border-white/40 focus-visible:outline-none sm:rounded-2xl sm:p-6"
      initial={{ opacity: 0, y: 22, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.85, delay: 0.28 + index * 0.07, ease }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.985 }}
      aria-pressed={selected}
    >
      {/* The colour this answer would make, breathing under the glass. */}
      <span
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-700 group-hover:opacity-100 group-focus-visible:opacity-100"
        style={{
          background: `radial-gradient(120% 90% at 50% 115%, ${previewHex}42 0%, transparent 62%)`,
        }}
      />
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-30 transition-opacity duration-700 group-hover:opacity-100"
        style={{ background: previewHex }}
      />

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
            style={{ background: previewHex }}
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
        question.options.map((option) => [
          option.id,
          composeFormula({ ...answers, [question.id]: option.id }).hex,
        ]),
      ),
    [question, answers],
  )

  return (
    <motion.section
      className="no-scrollbar fixed inset-0 z-30 flex flex-col items-center justify-center overflow-y-auto overscroll-contain px-5 py-24 sm:px-10"
      exit={{ opacity: 0, filter: 'blur(12px)' }}
      transition={{ duration: 0.55, ease }}
    >
      <AnimatePresence mode="wait">
        <div key={question.id} className="mx-auto w-full max-w-6xl">
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
                previewHex={previews[option.id]}
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
