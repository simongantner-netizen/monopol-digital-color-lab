import { motion } from 'framer-motion'

/**
 * The door.
 *
 * One job: make someone put their headphones on and press the button. The
 * headphone prompt has to arrive before the invitation, not after — once the
 * button is on screen, nobody reads anything else.
 */

const ease = [0.16, 1, 0.3, 1]

/**
 * A full turn around the hue circle for the word "colour".
 *
 * Not a naive rainbow: at equal chroma, yellow burns and blue sinks, so each
 * stop carries its own lightness and chroma to hold a steady visual weight
 * against the near-black background. The final stop is the first one again,
 * which is what makes the loop close without a jump.
 */
const SPECTRUM = [
  'oklch(0.86 0.17 95)', // yellow
  'oklch(0.79 0.18 70)', // amber
  'oklch(0.72 0.19 42)', // orange
  'oklch(0.67 0.20 22)', // red
  'oklch(0.67 0.21 356)', // crimson
  'oklch(0.65 0.20 328)', // magenta
  'oklch(0.63 0.20 300)', // violet
  'oklch(0.64 0.18 272)', // indigo
  'oklch(0.68 0.16 245)', // blue
  'oklch(0.74 0.13 215)', // cyan
  'oklch(0.76 0.14 178)', // teal
  'oklch(0.78 0.17 148)', // green
  'oklch(0.82 0.18 120)', // lime
  'oklch(0.86 0.17 95)', // back to yellow
]

const rise = {
  hidden: { opacity: 0, y: 26, filter: 'blur(10px)' },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 1.25, delay: 0.5 + i * 0.16, ease },
  }),
}

/**
 * Typographic reveal, one word at a time.
 *
 * Each line is a window with `overflow: hidden`; the words rise into it from
 * below their own baseline, so they appear to be uncovered rather than faded
 * in — the letterforms are never shown half-transparent or blurred, which is
 * what makes a wordmark-grade typeface look cheap. The line, not the letter,
 * is the unit: per-character animation on a headline this size reads as a
 * gimmick, per-word reads as speech.
 */
function Line({ children, delay = 0 }) {
  return (
    <span className="block overflow-hidden py-[0.08em]">
      <motion.span
        className="block"
        initial={{ y: '110%' }}
        animate={{ y: 0 }}
        transition={{ duration: 1.35, delay, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.span>
    </span>
  )
}

/** A word inside a Line, with its own small offset so the line un-stiffens. */
function Word({ children, className = '', delay = 0 }) {
  return (
    <motion.span
      className={`inline-block ${className}`}
      initial={{ y: '18%', opacity: 0.55 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1.5, delay: 0.55 + delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
      {/* Trailing space has to live outside the transform to survive it. */}
      <span className="inline-block w-[0.26em]" />
    </motion.span>
  )
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

/** Companion to the headphones: a screen and a tablet, drawn the same way. */
function Screens() {
  return (
    <svg width="34" height="30" viewBox="0 0 34 30" fill="none" aria-hidden="true">
      {/* Display, drawn on */}
      <motion.rect
        x="1.6"
        y="4.4"
        width="20.5"
        height="14"
        rx="1.6"
        stroke="currentColor"
        strokeWidth="1.15"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.4, delay: 1.15, ease }}
      />
      {/* Stand */}
      <motion.path
        d="M8.6 22.4h6.5M11.85 18.4v4"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, delay: 2.05, ease }}
      />
      {/* Tablet, leaning in beside it */}
      <motion.rect
        x="24"
        y="9"
        width="8.6"
        height="13.4"
        rx="1.4"
        stroke="currentColor"
        strokeWidth="1.15"
        initial={{ opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 2.25, ease }}
      />
      {/* A slow glint travelling across the display */}
      <motion.rect
        x="1.6"
        y="4.4"
        width="20.5"
        height="14"
        rx="1.6"
        fill="currentColor"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.14, 0] }}
        transition={{ duration: 3.2, delay: 3.4, repeat: Infinity, repeatDelay: 3.6, ease: 'easeInOut' }}
      />
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
        <Line delay={0.55}>
          <Word>Every</Word>
          <Word delay={0.09}>
            {/*
              The one word that is the subject of the whole application gets
              the one treatment nothing else does: it is never white. It drifts
              around the full hue circle, forever, slowly enough that you catch
              it having moved rather than watch it move.

              The last stop repeats the first so the loop closes seamlessly —
              without that the colour snaps back at the wrap. Lightness and
              chroma are tuned per hue so every step reads at roughly the same
              weight on black; a literal spectrum would flash at yellow and go
              muddy at blue. Linear easing, because a colour wheel has no
              accents to land on.
            */}
            <motion.span
              className="accent inline-block"
              initial={{ color: SPECTRUM[0] }}
              animate={{ color: SPECTRUM }}
              transition={{ duration: 34, repeat: Infinity, ease: 'linear' }}
            >
              colour
            </motion.span>
          </Word>
        </Line>

        <Line delay={0.78}>
          <Word className="text-ash">begins</Word>
          <Word className="text-ash" delay={0.07}>
            with
          </Word>
          <Word className="text-ash" delay={0.14}>
            questions.
          </Word>
        </Line>

        <Line delay={1.06}>
          <Word>Design</Word>
          <Word delay={0.08}>yours.</Word>
        </Line>
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

      {/* Both conditions for the good version, before the button appears. */}
      <motion.div
        className="mt-12 flex flex-col items-center gap-7 text-chalk/55 sm:mt-14 sm:flex-row sm:gap-12"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 1.5, ease }}
      >
        <div className="flex flex-col items-center gap-3">
          <Headphones />
          <motion.p
            className="label text-[10px] text-chalk/45"
            initial={{ opacity: 0, letterSpacing: '0.5em' }}
            animate={{ opacity: 1, letterSpacing: '0.18em' }}
            transition={{ duration: 1.6, delay: 2.5, ease }}
          >
            Headphones recommended
          </motion.p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <Screens />
          <motion.p
            className="label text-[10px] text-chalk/45"
            initial={{ opacity: 0, letterSpacing: '0.5em' }}
            animate={{ opacity: 1, letterSpacing: '0.18em' }}
            transition={{ duration: 1.6, delay: 2.75, ease }}
          >
            Best on desktop and tablet
          </motion.p>
        </div>
      </motion.div>

      <motion.button
        type="button"
        onClick={onBegin}
        className="group pointer-events-auto relative mt-12 overflow-hidden rounded-full border border-white/15 px-11 py-4 text-chalk transition-colors duration-500 hover:border-white/40 sm:mt-14"
        initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 1.2, delay: 3.2, ease }}
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
        transition={{ duration: 1.4, delay: 3.9, ease }}
      >
        Takes about two minutes.
      </motion.p>
    </motion.section>
  )
}
