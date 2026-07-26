import { useId } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

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

/**
 * The pen path for "colour".
 *
 * Traced through the actual glyph metrics of Summer Loving, read out of the
 * font: the word spans 0–1459 units at 1000 upm, x-height tops out near 350,
 * the l and r rise to ~400, and l drops to -38. Coordinates below are in that
 * space with the baseline at y = 0 and y running up-negative, the way SVG
 * wants it.
 *
 * It is a stroke, not an outline — the route a hand takes across the word,
 * dipping through the round letters and climbing at the ascenders — because
 * that is what has to be revealed in order.
 */
/**
 * The pen strokes for "colour", in Summer Loving.
 *
 * The face sets the word as brush capitals — COLOUR — not as joined script,
 * so this is nine separate strokes in the order a hand makes them: each round
 * letter as one anticlockwise loop, the L as stem-then-foot, the R as stem,
 * bowl, leg. Coordinates were traced against the rendered word on a unit grid,
 * in the font's own space (1000 upm, baseline at y = 0, y negative upwards).
 *
 * They are separate paths rather than one path with jumps, and that is not a
 * stylistic choice: SVG restarts the dash pattern at every subpath, so a
 * single path with M-jumps reveals every letter simultaneously. Nine paths
 * with staggered delays give the order — and the small gaps between them are
 * the pen leaving the page.
 *
 * `len` is each stroke's measured length, `at` and `for` its share of the
 * animation, both normalised 0–1. Round letters get more time than short
 * strokes, and there is a beat before the R.
 */
const PEN_STROKES = [
  { d: 'M 258 -300 C 205 -352, 92 -334, 70 -214 C 50 -102, 112 -16, 198 -26 C 244 -32, 268 -64, 280 -96', len: 640, at: 0, for: 0.17 },
  { d: 'M 350 -330 C 262 -308, 218 -150, 252 -58 C 292 8, 392 -6, 428 -122 C 460 -228, 428 -320, 352 -332', len: 815, at: 0.15, for: 0.19 },
  { d: 'M 511 -392 C 490 -280, 458 -140, 440 -44', len: 360, at: 0.35, for: 0.09 },
  { d: 'M 440 -44 C 508 -32, 618 -28, 700 -26', len: 265, at: 0.44, for: 0.07 },
  { d: 'M 815 -312 C 726 -292, 682 -146, 712 -56 C 750 6, 848 -8, 886 -122 C 918 -224, 888 -302, 817 -314', len: 780, at: 0.52, for: 0.18 },
  { d: 'M 978 -300 C 962 -206, 952 -96, 990 -44 C 1030 6, 1090 -26, 1112 -128 C 1128 -212, 1138 -258, 1146 -292', len: 626, at: 0.68, for: 0.15 },
  { d: 'M 1222 -360 C 1196 -250, 1180 -116, 1168 -28', len: 340, at: 0.84, for: 0.08 },
  { d: 'M 1226 -354 C 1318 -366, 1378 -294, 1344 -226 C 1320 -180, 1268 -180, 1234 -190', len: 348, at: 0.9, for: 0.07 },
  { d: 'M 1256 -192 C 1330 -142, 1400 -76, 1466 -28', len: 270, at: 0.95, for: 0.05 },
]

/** How long the whole word takes to write. */
const WRITE_SECONDS = 2.9

/**
 * A word that writes itself.
 *
 * Summer Loving is a hand, so it arrives the way a hand arrives. The word is
 * SVG text; a single thick stroke runs along the pen path above and is used
 * as its mask. Animating that stroke's dashoffset walks the mask along the
 * route, so the letters appear in writing order, following the rise and fall
 * of the script rather than a straight edge sweeping past.
 *
 * Why the mask is a stroke and not the glyph outlines: font outlines are
 * contours. Animating their dashoffset traces the *edge* of each letter — the
 * shape gets drawn around, which reads as inking a stencil, not as writing.
 * The stroke is wide enough (520 units against a ~350 x-height) to cover the
 * letterforms completely, with a round cap so the leading edge is a nib.
 *
 * pathLength="1" normalises the path so the dash maths needs no measurement.
 */
function Handwritten({ children, delay = 0 }) {
  const reduced = useReducedMotion()
  const maskId = useId()

  // Sized from the font's own metrics rather than by eye. At 1.3em the type
  // scale is 0.0013em per unit, so the word (1412 units wide) occupies 1.84em,
  // and the SVG — wider, because the pen stroke overshoots the letters at both
  // ends — is offset back by its own left margin. The baseline sits at y = 0
  // in the viewBox, 90 units above its bottom edge, which is exactly how far
  // the SVG hangs below the text baseline.
  return (
    <span
      className="relative inline-block align-baseline"
      style={{ width: '1.84em', height: '0.56em' }}
      role="img"
      aria-label={children}
    >
      <svg
        viewBox="-90 -430 1700 520"
        className="absolute overflow-visible"
        style={{ width: '2.21em', left: '-0.117em', bottom: '-0.117em' }}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="-200" y="-500" width="1900" height="700">
            {PEN_STROKES.map((stroke, i) => (
              <motion.path
                key={i}
                d={stroke.d}
                fill="none"
                stroke="#fff"
                // Wide enough to cover the brush strokes it is revealing, tight
                // enough that the reveal still reads as a moving nib.
                strokeWidth="235"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={`${stroke.len} ${stroke.len}`}
                initial={{ strokeDashoffset: reduced ? 0 : stroke.len }}
                animate={{ strokeDashoffset: 0 }}
                transition={{
                  duration: reduced ? 0 : WRITE_SECONDS * stroke.for,
                  delay: reduced ? 0 : delay + WRITE_SECONDS * stroke.at,
                  // A stroke of the hand accelerates out and lands softly.
                  ease: [0.4, 0.02, 0.35, 1],
                }}
              />
            ))}
          </mask>
        </defs>

        <text
          x="0"
          y="0"
          fontSize="1000"
          fill="currentColor"
          mask={`url(#${maskId})`}
          style={{ fontFamily: "'Summer Loving', cursive" }}
        >
          {children}
        </text>
      </svg>
    </span>
  )
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
            <Handwritten delay={1.15}>colour</Handwritten>
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
