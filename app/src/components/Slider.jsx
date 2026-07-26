import { useCallback, useRef, useState } from 'react'

/**
 * A slider whose track shows what it will do.
 *
 * The gradient across each track is the actual range of colours that slider
 * produces, generated through the colour engine. You aim at the result rather
 * than at a number — which is how the physical lab works too: nobody says
 * "add 4% chroma", they point at the tile they want.
 *
 * Pointer, touch and keyboard all supported; the visual thumb is decoration
 * over a real focusable slider role.
 */
export default function Slider({
  label,
  value,
  min,
  max,
  step = 0.001,
  gradient,
  readout,
  accent,
  onChange,
  onCommit,
}) {
  const trackRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const pct = ((value - min) / (max - min)) * 100

  const valueFromEvent = useCallback(
    (clientX) => {
      const rect = trackRef.current?.getBoundingClientRect()
      if (!rect) return value
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      const raw = min + ratio * (max - min)
      return Math.round(raw / step) * step
    },
    [min, max, step, value],
  )

  const handleDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    onChange(valueFromEvent(e.clientX))
  }

  const handleMove = (e) => {
    if (!dragging) return
    onChange(valueFromEvent(e.clientX))
  }

  const handleUp = (e) => {
    if (!dragging) return
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    setDragging(false)
    onCommit?.()
  }

  const handleKey = (e) => {
    const nudge = (max - min) / 40
    const big = (max - min) / 8
    const moves = {
      ArrowLeft: -nudge,
      ArrowDown: -nudge,
      ArrowRight: nudge,
      ArrowUp: nudge,
      PageDown: -big,
      PageUp: big,
    }
    if (e.key === 'Home') return onChange(min), onCommit?.()
    if (e.key === 'End') return onChange(max), onCommit?.()
    const delta = moves[e.key]
    if (delta === undefined) return
    e.preventDefault()
    onChange(Math.min(max, Math.max(min, value + delta)))
    onCommit?.()
  }

  return (
    <div className="select-none">
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="label text-[10px] text-ash">{label}</span>
        <span className="tnum text-[0.72rem] font-light text-dim">{readout}</span>
      </div>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={readout}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        onKeyDown={handleKey}
        className="group relative flex h-7 cursor-ew-resize touch-none items-center focus-visible:outline-none"
      >
        {/* The range itself, rendered as colour. */}
        <span
          className="absolute inset-x-0 h-[3px] rounded-full transition-[height] duration-300 group-hover:h-[5px] group-focus-visible:h-[5px]"
          style={{ background: gradient }}
        />

        {/* Centre notch — where the answers left it. */}
        {min < 0 && max > 0 && (
          <span className="absolute left-1/2 h-2.5 w-px -translate-x-1/2 bg-white/25" />
        )}

        <span
          className="pointer-events-none absolute size-3.5 -translate-x-1/2 rounded-full border-2 border-white bg-void shadow-[0_2px_12px_rgba(0,0,0,0.55)] transition-transform duration-200"
          style={{
            left: `${pct}%`,
            transform: `translateX(-50%) scale(${dragging ? 1.28 : 1})`,
            background: accent,
          }}
        />
      </div>
    </div>
  )
}
