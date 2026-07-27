import { motion } from 'framer-motion'

/**
 * The pause.
 *
 * Two and a half seconds of almost nothing between the last answer and the
 * colour. The three words are the real sequence in the physical lab — pigment,
 * then binder, then you carry it to the window and look at it in daylight.
 */

const ease = [0.16, 1, 0.3, 1]
const STAGES = ['Pigment', 'Binder', 'Light']

export default function Composing({ formula }) {
  return (
    <motion.section
      className="pointer-events-none fixed inset-0 z-30 flex flex-col items-center justify-center px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(16px)' }}
      transition={{ duration: 0.7, ease }}
    >
      <div className="relative flex h-24 items-center justify-center">
        {STAGES.map((stage, i) => (
          <motion.span
            key={stage}
            className="absolute text-[clamp(1.5rem,min(3vw,4.5vh),2.2rem)] font-light tracking-[-0.02em] text-chalk"
            initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: [14, 0, 0, -12],
              filter: ['blur(8px)', 'blur(0px)', 'blur(0px)', 'blur(8px)'],
            }}
            transition={{
              duration: 0.92,
              delay: i * 0.72,
              times: [0, 0.28, 0.72, 1],
              ease,
            }}
          >
            {stage}
          </motion.span>
        ))}
      </div>

      {/* A hairline that fills in the colour being mixed. */}
      <div className="relative mt-4 h-px w-40 overflow-hidden bg-white/10 sm:w-56">
        <motion.span
          className="absolute inset-y-0 left-0 block"
          style={{ background: formula.css }}
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 2.5, ease: [0.5, 0, 0.2, 1] }}
        />
      </div>
    </motion.section>
  )
}
