import { useRef, useState } from 'react'

/**
 * The colour's name, as a field rather than a label.
 *
 * The engine's two-word name is a good opening offer, but the person who
 * designed the colour should be able to call it what they want — that is the
 * moment it stops being a demo and starts being theirs. A real <input> rather
 * than contentEditable: it gets caret handling, selection and mobile keyboards
 * for free, and screen readers understand it.
 *
 * Fully controlled, with no local draft copy. An earlier version kept its own
 * state and synced back on blur, which meant clearing the field raced the
 * parent and left the colour nameless. Here `value` is always the parent's
 * truth, and clearing simply hands back `null` so the generated name returns.
 */
export default function ColourName({ name, onRename, size = 'large', className = '' }) {
  const inputRef = useRef(null)
  const [editing, setEditing] = useState(false)

  const scale =
    size === 'large'
      ? 'text-[clamp(2.4rem,6.4vw,5rem)] leading-[0.95] tracking-[-0.035em]'
      : 'text-[clamp(2rem,5vw,3.2rem)] leading-[1] tracking-[-0.03em]'

  const focus = () => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }

  // pointer-events-auto is load-bearing: the reveal screen sets
  // pointer-events-none on its whole section so the 3D panel behind it stays
  // reachable, and every interactive child has to opt back in. Without it the
  // field looks editable and silently ignores every click.
  return (
    <div className={`group pointer-events-auto relative w-full ${className}`}>
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => onRename(e.target.value.slice(0, 40))}
        onFocus={() => setEditing(true)}
        onBlur={() => {
          setEditing(false)
          // Empty means "give me the generated one back", not "no name".
          if (!name.trim()) onRename(null)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Escape') inputRef.current?.blur()
        }}
        spellCheck={false}
        maxLength={40}
        placeholder="Name your colour"
        aria-label="Name of your colour"
        className={`w-full cursor-text truncate bg-transparent text-center font-light text-chalk caret-[var(--lab-colour)] outline-none placeholder:text-dim ${scale}`}
      />

      {/* Always-visible hairline, so the name reads as a field at a glance. */}
      <span className="pointer-events-none absolute inset-x-0 -bottom-1 mx-auto h-px w-[min(100%,18ch)] bg-white/10" />

      {/* Coloured underline draws itself in on hover and stays while editing. */}
      <span
        className={`pointer-events-none absolute inset-x-0 -bottom-1 mx-auto h-px w-[min(100%,18ch)] origin-center transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          editing ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
        }`}
        style={{ background: 'var(--lab-colour)' }}
      />

      {/*
        The prompt stays on screen rather than waiting for a hover. A hidden
        affordance is not an affordance — if you have to discover that you can
        rename the colour, the feature may as well not be there.

        Plain CSS, deliberately: a motion.span writes `opacity: 1` inline as
        its animation target, which outranks any opacity class.
      */}
      {!editing && (
        <button
          type="button"
          tabIndex={-1}
          onClick={focus}
          className="label absolute -bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-1.5 text-[9px] whitespace-nowrap text-dim opacity-70 transition-opacity duration-500 group-hover:opacity-100"
        >
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path
              d="M6.6 1.4 8.6 3.4M1 9l.5-2.2 5-5 2 2-5 5L1 9Z"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Click to rename
        </button>
      )}
    </div>
  )
}
