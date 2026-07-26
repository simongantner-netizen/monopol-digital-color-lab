import { motion } from 'framer-motion'
import { getOption } from '../lib/questions'
import { effectName } from '../lib/colorEngine'
import { CONTACT, buildMailto } from '../lib/contact'
import ColourName from './ColourName'
import Signature from './Signature'

/**
 * The passport, and the way back to the real lab.
 *
 * The digital lab is not a replacement for the physical one — it is the thing
 * that makes an architect want to book it. So the last screen is a formula
 * sheet you could hand to a technician, and one button that gets it to Lionel.
 */

const ease = [0.16, 1, 0.3, 1]

const rise = {
  hidden: { opacity: 0, y: 20, filter: 'blur(9px)' },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 1.05, delay: 0.35 + i * 0.11, ease },
  }),
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-white/[0.06] py-2.5 last:border-b-0">
      <span className="label text-[10px] text-dim">{label}</span>
      <span className="tnum text-right text-[0.84rem] font-light text-chalk">{value}</span>
    </div>
  )
}

export default function Finale({ formula, answers, onRestart, onBackToRefine, onRename }) {
  const recipe = [
    getOption('world', answers?.world),
    getOption('voice', answers?.voice),
    getOption('hour', answers?.hour),
    getOption('light', answers?.light),
  ].filter(Boolean)

  const { cmyk, colour } = formula

  return (
    <motion.section
      className="no-scrollbar fixed inset-0 z-30 flex flex-col items-center overflow-y-auto overscroll-contain px-5 py-16 sm:px-8 sm:py-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(12px)' }}
      transition={{ duration: 0.8, ease }}
    >
      <div className="mx-auto w-full max-w-lg">
        <motion.p
          className="label mb-4 text-center text-dim"
          variants={rise}
          initial="hidden"
          animate="show"
          custom={0}
        >
          Colour passport
        </motion.p>

        <motion.div variants={rise} initial="hidden" animate="show" custom={1}>
          <ColourName name={formula.name} onRename={onRename} size="small" />
        </motion.div>

        <motion.div
          className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur-2xl sm:p-7"
          variants={rise}
          initial="hidden"
          animate="show"
          custom={2}
        >
          {/* The colour itself, as a physical-feeling chip. */}
          <div
            className="mb-6 h-24 w-full rounded-xl sm:h-28"
            style={{
              background: formula.css,
              boxShadow: `inset 0 1px 0 rgb(255 255 255 / 0.22), 0 18px 60px -18px ${formula.css}`,
            }}
          />

          <Row label="Reference" value={formula.code} />
          <Row label="Finish" value={formula.surface} />
          <Row label="Effect" value={effectName(formula.effect)} />
          <Row label="Hex" value={formula.hex.toUpperCase()} />
          <Row label="CMYK" value={`${cmyk.c} · ${cmyk.m} · ${cmyk.y} · ${cmyk.k}`} />
          <Row
            label="OKLCH"
            value={`${colour.l.toFixed(3)} · ${colour.c.toFixed(3)} · ${colour.h.toFixed(0)}°`}
          />

          <p className="mt-5 text-[0.72rem] leading-relaxed font-light text-dim">
            Screen values are indicative. The binding colour is the one mixed and
            approved in the lab.
          </p>
        </motion.div>

        {/* Hand-off */}
        <motion.div
          className="mt-8"
          variants={rise}
          initial="hidden"
          animate="show"
          custom={3}
        >
          <a
            href={buildMailto(formula, recipe)}
            className="group relative flex w-full items-center justify-between overflow-hidden rounded-full border border-white/15 py-4 pr-4 pl-8 transition-colors duration-500 hover:border-white/40"
          >
            <span
              className="absolute inset-0 origin-bottom scale-y-0 transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-y-100"
              style={{ background: formula.css, opacity: 0.22 }}
            />
            <span className="relative text-left">
              <span className="block text-[0.95rem] font-light text-chalk">
                Send it to {CONTACT.name.split(' ')[0]}
              </span>
              <span className="block text-[0.74rem] font-light text-dim">{CONTACT.role}</span>
            </span>
            <span
              className="relative flex size-9 items-center justify-center rounded-full"
              style={{ background: formula.css }}
            >
              <svg width="13" height="10" viewBox="0 0 13 10" fill="none" aria-hidden="true">
                <path
                  d="M8 1l4 4-4 4M12 5H0"
                  stroke={colour.l > 0.72 ? '#08090a' : '#f4f3f1'}
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </a>

          <a
            href={CONTACT.labUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex w-full items-center justify-center rounded-full border border-white/10 py-3.5 text-ash transition-colors duration-400 hover:border-white/25 hover:text-chalk"
          >
            <span className="label text-[10px]">Book a session in the real lab</span>
          </a>
        </motion.div>

        <motion.div
          className="mt-8 flex items-center justify-center gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 1.3, ease }}
        >
          <button
            type="button"
            onClick={onBackToRefine}
            className="label text-[10px] text-dim transition-colors duration-300 hover:text-chalk"
          >
            Keep adjusting
          </button>
          <span className="h-3 w-px bg-white/10" />
          <button
            type="button"
            onClick={onRestart}
            className="label text-[10px] text-dim transition-colors duration-300 hover:text-chalk"
          >
            Design another
          </button>
        </motion.div>

        <motion.div
          className="mt-14"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, delay: 1.7, ease }}
        >
          <Signature />
        </motion.div>
      </div>
    </motion.section>
  )
}
