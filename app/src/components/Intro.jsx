import { motion } from 'framer-motion'

/**
 * The door.
 *
 * One job: make someone put their headphones on and press the button. The
 * headphone prompt has to arrive before the invitation, not after — once the
 * button is on screen, nobody reads anything else.
 */

const ease = [0.16, 1, 0.3, 1]

const rise = {
  hidden: { opacity: 0, y: 26, filter: 'blur(10px)' },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 1.25, delay: 0.5 + i * 0.16, ease },
  }),
}

function Headphones() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true">
      {/* Headband, drawn on. */}
      <motion.path
        d="M5.5 19.5v-4.8a9.5 9.5 0 0 1 19 0v4.8"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.85, ease }}
      />
      {/* Ear cups — solid, so the shape reads at 30px instead of dissolving
          into two specks the way an outlined contour does. */}
      {[3.1, 22.4].map((x, i) => (
        <motion.rect
          key={x}
          x={x}
          y="18.4"
          width="4.5"
          height="7.8"
          rx="2.2"
          fill="currentColor"
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.85 + i * 0.12, ease }}
        />
      ))}
      {/* Two sound rings, drifting out forever. */}
      {[0, 1].map((i) => (
        <motion.circle
          key={i}
          cx="15"
          cy="22"
          r="6"
          stroke="currentColor"
          strokeWidth="0.7"
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: [0, 0.32, 0], scale: [0.4, 2.1, 2.4] }}
          transition={{
            duration: 3.6,
            delay: 2.6 + i * 1.8,
            repeat: Infinity,
            repeatDelay: 0.4,
            ease: 'easeOut',
          }}
          style={{ transformOrigin: '15px 22px' }}
        />
      ))}
    </svg>
  )
}

export default function Intro({ onBegin }) {
  return (
    <motion.section
      className="pointer-events-none fixed inset-0 z-30 flex flex-col items-center justify-center px-6 text-center"
      exit={{ opacity: 0, filter: 'blur(14px)', scale: 1.04 }}
      transition={{ duration: 1, ease }}
    >
      <motion.p
        className="label mb-10 text-[9px] leading-relaxed text-dim sm:mb-14 sm:text-[11px]"
        variants={rise}
        initial="hidden"
        animate="show"
        custom={0}
      >
        Digital Color Lab
        <span className="mx-2.5 opacity-40">—</span>
        <span className="inline-block">an immersive experience for the eyes and ears</span>
      </motion.p>

      <h1 className="max-w-[19ch] text-[clamp(2.6rem,7.2vw,6.4rem)] leading-[0.98] font-light tracking-[-0.028em] text-chalk">
        <motion.span
          className="block"
          variants={rise}
          initial="hidden"
          animate="show"
          custom={1}
        >
          Every <span className="accent">colour</span>
        </motion.span>
        <motion.span
          className="block"
          variants={rise}
          initial="hidden"
          animate="show"
          custom={2}
        >
          <span className="text-ash">begins with questions.</span>{' '}
          <span className="whitespace-nowrap">Design yours.</span>
        </motion.span>
      </h1>

      <motion.p
        className="mt-8 max-w-[34ch] text-[clamp(0.95rem,1.5vw,1.15rem)] leading-relaxed font-light text-ash sm:mt-10"
        variants={rise}
        initial="hidden"
        animate="show"
        custom={3}
      >
        Answer four. We will mix the rest — the way we would if you were standing
        in the lab with us.
      </motion.p>

      {/* Headphones first, button second. */}
      <motion.div
        className="mt-14 flex flex-col items-center gap-3 text-chalk/55 sm:mt-16"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 1.15, ease }}
      >
        <Headphones />
        <motion.p
          className="label text-[10px] text-chalk/45"
          initial={{ opacity: 0, letterSpacing: '0.5em' }}
          animate={{ opacity: 1, letterSpacing: '0.18em' }}
          transition={{ duration: 1.6, delay: 2.2, ease }}
        >
          Headphones recommended
        </motion.p>
      </motion.div>

      <motion.button
        type="button"
        onClick={onBegin}
        className="group pointer-events-auto relative mt-12 overflow-hidden rounded-full border border-white/15 px-11 py-4 text-chalk transition-colors duration-500 hover:border-white/40 sm:mt-14"
        initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 1.2, delay: 2.7, ease }}
        whileHover={{ scale: 1.025 }}
        whileTap={{ scale: 0.985 }}
      >
        {/* The fill sweeps up in the live colour — grey now, yours later. */}
        <span
          className="absolute inset-0 origin-bottom scale-y-0 transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-y-100"
          style={{ background: 'var(--lab-colour)', opacity: 0.16 }}
        />
        <span className="label relative text-[11px]">Begin</span>
      </motion.button>

      <motion.p
        className="mt-7 text-[0.8rem] font-light text-dim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4, delay: 3.4, ease }}
      >
        Takes about two minutes.
      </motion.p>
    </motion.section>
  )
}
