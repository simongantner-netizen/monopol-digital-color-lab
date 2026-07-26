import { motion, AnimatePresence } from 'framer-motion'
import MonopolMark from './MonopolMark'

/**
 * The persistent frame: mark, progress, sound.
 *
 * Deliberately thin. Everything here has to survive on screen for the whole
 * session without ever competing with the colour.
 */

function SoundBars({ active }) {
  const bars = [0.45, 1, 0.65, 0.9, 0.35]
  return (
    <svg width="22" height="14" viewBox="0 0 22 14" fill="none" aria-hidden="true">
      {bars.map((h, i) => (
        <motion.rect
          key={i}
          x={i * 4.6}
          width="1.6"
          rx="0.8"
          fill="currentColor"
          initial={false}
          animate={
            active
              ? {
                  height: [3, 12 * h, 4.5, 10 * h, 3],
                  y: [5.5, 7 - 6 * h, 4.75, 7 - 5 * h, 5.5],
                }
              : { height: 1.6, y: 6.2 }
          }
          transition={
            active
              ? { duration: 1.8 + i * 0.26, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
          }
        />
      ))}
    </svg>
  )
}

export default function Chrome({
  phase,
  step,
  total,
  muted,
  audioReady,
  onToggleSound,
  onBack,
  onRestart,
}) {
  const inQuestions = phase === 'questions'
  // Available everywhere past the door — including mid-question, where the
  // only other way out was answering your way to the end.
  const canRestart = phase !== 'intro' && phase !== 'composing'

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {/* Mark */}
      <motion.div
        className="absolute top-6 left-6 sm:top-8 sm:left-10"
        initial={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 1.1, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <MonopolMark className="h-6 w-auto text-chalk opacity-95 sm:h-8" />
      </motion.div>

      {/* Start over + sound, top right */}
      <div className="absolute top-5 right-5 flex items-center gap-2 sm:top-7 sm:right-10">
        <AnimatePresence>
          {canRestart && (
            <motion.button
              type="button"
              onClick={onRestart}
              className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-ash backdrop-blur-md transition-colors duration-300 hover:border-white/25 hover:text-chalk"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M12.2 7a5.2 5.2 0 1 1-1.6-3.75M12.4 1.3v3.1H9.3"
                  stroke="currentColor"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="label hidden text-[10px] sm:inline">Back to the start</span>
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {audioReady && (
            <motion.button
              type="button"
              onClick={onToggleSound}
              className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-chalk/70 backdrop-blur-md transition-colors duration-300 hover:border-white/25 hover:text-chalk"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
              aria-pressed={!muted}
            >
              <SoundBars active={!muted} />
              <span className="label hidden text-[10px] sm:inline">
                {muted ? 'Sound off' : 'Sound on'}
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Progress — four marks, one per question */}
      <AnimatePresence>
        {inQuestions && (
          <motion.div
            className="absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-2.5 sm:bottom-9"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {Array.from({ length: total }).map((_, i) => (
              <motion.span
                key={i}
                className="block h-px rounded-full"
                initial={false}
                animate={{
                  width: i === step ? 34 : 14,
                  backgroundColor:
                    i < step
                      ? 'var(--lab-colour)'
                      : i === step
                        ? 'rgb(244 243 241 / 0.85)'
                        : 'rgb(244 243 241 / 0.18)',
                }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back */}
      <AnimatePresence>
        {inQuestions && step > 0 && (
          <motion.button
            type="button"
            onClick={onBack}
            className="pointer-events-auto absolute bottom-6 left-6 flex items-center gap-2 text-ash transition-colors duration-300 hover:text-chalk sm:bottom-8 sm:left-10"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
              <path
                d="M5 1 1 5l4 4M1 5h12"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="label text-[10px]">Back</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
