import { useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import Slider from './Slider'
import { composeFormula, EFFECTS, surfaceName } from '../lib/colorEngine'
import { oklchToCss } from '../lib/oklch'

/**
 * Refinement — the part that makes it yours.
 *
 * The four answers got you a colour that is already right. Everything here is
 * the conversation you would have with the technician afterwards: a touch
 * warmer, a shade deeper, and can we see that in a flake finish.
 */

const ease = [0.16, 1, 0.3, 1]

/** Sample the engine across a slider's range to paint its track. */
function useTrackGradient(base, key, min, max, tweaks, steps = 9) {
  return useMemo(() => {
    const stops = []
    for (let i = 0; i <= steps; i++) {
      const t = min + ((max - min) * i) / steps
      const { colour } = composeFormula(base, { ...tweaks, [key]: t })
      stops.push(oklchToCss(colour))
    }
    return `linear-gradient(90deg, ${stops.join(', ')})`
  }, [base, key, min, max, tweaks, steps])
}

export default function Refine({ formula, tweaks, setTweaks, onTick, onSelect, onDone, answers }) {
  const lastTick = useRef(0)

  // Throttle the tick — a slider drag fires dozens of changes a second and
  // one tone per change turns the sound design into a buzzer.
  const tick = () => {
    const now = performance.now()
    if (now - lastTick.current < 110) return
    lastTick.current = now
    onTick()
  }

  const set = (key) => (value) => {
    setTweaks((prev) => ({ ...prev, [key]: value }))
    tick()
  }

  const base = answers ?? {}
  const hueTrack = useTrackGradient(base, 'hue', -32, 32, tweaks)
  const lightTrack = useTrackGradient(base, 'lightness', -0.17, 0.17, tweaks)
  const chromaTrack = useTrackGradient(base, 'chroma', -0.07, 0.09, tweaks)

  // Built from the hex, not formula.css — appending a hex alpha pair to an
  // rgb() string produces invalid CSS and the track silently disappears.
  const glossTrack = `linear-gradient(90deg, ${formula.hex}3d 0%, ${formula.hex}cc 55%, #ffffff 100%)`

  const signed = (v, digits = 0) =>
    `${v > 0.0005 ? '+' : v < -0.0005 ? '−' : '±'}${Math.abs(v).toFixed(digits)}`

  return (
    <motion.section
      className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-end px-5 py-7 sm:px-8 sm:py-9"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(12px)' }}
      transition={{ duration: 0.8, ease }}
    >
      {/* The bench. The whole upper half stays clear for the panel itself —
          the identity line rides on the bench rather than floating over the
          colour, which is the one thing nothing is allowed to sit on. */}
      <motion.div
        className="pointer-events-auto mx-auto w-full max-w-5xl rounded-2xl border border-white/10 bg-black/35 p-5 backdrop-blur-2xl sm:rounded-3xl sm:p-7"
        initial={{ opacity: 0, y: 44, filter: 'blur(14px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 1.1, delay: 0.3, ease }}
      >
        <div className="mb-6 flex flex-wrap items-center gap-3.5 border-b border-white/[0.07] pb-5">
          <span
            className="block size-2 shrink-0 rounded-full"
            style={{ background: formula.css, boxShadow: `0 0 18px ${formula.css}` }}
          />
          <h2 className="text-[1.05rem] font-light tracking-[-0.01em] text-chalk">
            {formula.name}
          </h2>
          <span className="tnum label text-[10px] text-dim">{formula.code}</span>
          <span className="label ml-auto text-[10px] text-dim">Make it yours</span>
        </div>

        <div className="grid gap-x-9 gap-y-6 lg:grid-cols-[1.15fr_1fr]">
          {/* Colour */}
          <div className="space-y-5">
            <p className="label text-[10px] text-dim">The colour</p>
            <Slider
              label="Hue"
              value={tweaks.hue}
              min={-32}
              max={32}
              step={0.5}
              gradient={hueTrack}
              accent={formula.css}
              readout={`${signed(tweaks.hue)}°`}
              onChange={set('hue')}
            />
            <Slider
              label="Depth"
              value={tweaks.lightness}
              min={-0.17}
              max={0.17}
              step={0.002}
              gradient={lightTrack}
              accent={formula.css}
              readout={signed(tweaks.lightness * 100)}
              onChange={set('lightness')}
            />
            <Slider
              label="Intensity"
              value={tweaks.chroma}
              min={-0.07}
              max={0.09}
              step={0.001}
              gradient={chromaTrack}
              accent={formula.css}
              readout={signed(tweaks.chroma * 100)}
              onChange={set('chroma')}
            />
          </div>

          {/* Surface */}
          <div className="space-y-5">
            <p className="label text-[10px] text-dim">The surface</p>
            <Slider
              label="Gloss"
              value={formula.gloss}
              min={0}
              max={1}
              step={0.01}
              gradient={glossTrack}
              accent={formula.css}
              readout={surfaceName(formula.gloss)}
              onChange={set('gloss')}
            />

            <div>
              <p className="label mb-2.5 text-[10px] text-ash">Special effect</p>
              <div className="grid grid-cols-5 gap-1.5">
                {EFFECTS.map((effect) => {
                  const active = formula.effect === effect.id
                  return (
                    <button
                      key={effect.id}
                      type="button"
                      onClick={() => {
                        setTweaks((prev) => ({ ...prev, effect: effect.id }))
                        onSelect()
                      }}
                      title={effect.caption}
                      className={`rounded-lg border px-1 py-2.5 text-[0.72rem] font-light transition-all duration-400 ${
                        active
                          ? 'border-transparent text-void'
                          : 'border-white/10 text-ash hover:border-white/30 hover:text-chalk'
                      }`}
                      style={active ? { background: formula.css } : undefined}
                      aria-pressed={active}
                    >
                      {effect.name}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.07] pt-5">
          <button
            type="button"
            onClick={() => {
              setTweaks({ hue: 0, lightness: 0, chroma: 0, gloss: null, effect: null })
              onSelect()
            }}
            className="label text-[10px] text-dim transition-colors duration-300 hover:text-chalk"
          >
            Reset to your answers
          </button>

          <button
            type="button"
            onClick={onDone}
            className="group relative overflow-hidden rounded-full border border-white/15 px-9 py-3 text-chalk transition-colors duration-500 hover:border-white/40"
          >
            <span
              className="absolute inset-0 origin-bottom scale-y-0 transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-y-100"
              style={{ background: formula.css, opacity: 0.22 }}
            />
            <span className="label relative text-[11px]">This is the one</span>
          </button>
        </div>
      </motion.div>
    </motion.section>
  )
}
