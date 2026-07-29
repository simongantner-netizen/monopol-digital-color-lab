import { Component } from 'react'

/**
 * The last thing standing between one thrown error and a black screen.
 *
 * React unmounts the entire root when anything throws past it — including a
 * passive effect, which is where this app touches the browser: the address
 * bar, the audio context, WebGL. That is not a theoretical risk here. Safari
 * throws a SecurityError once `history.replaceState` has been called a hundred
 * times in thirty seconds, and until this was fixed one pull on a slider could
 * clear that in a single gesture. The failure mode was not a warning in a
 * console nobody had open; it was the page going black in front of whoever was
 * looking at it.
 *
 * The colour is gone by the time anyone reads this — it lived in React state.
 * But the address bar still holds it, because that is the whole point of the
 * link, so reloading lands on the same colour rather than back at the door.
 * Say that, and say nothing about what broke: this screen exists for a room
 * with a client in it, not for a developer.
 *
 * Deliberately a class. Hooks cannot catch.
 */
export default class Boundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, info) {
    // Kept for the console, where a developer would look, and nowhere else.
    console.error('Color Lab stopped:', error, info?.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children

    const link = typeof window === 'undefined' ? '' : window.location.href
    const hasColour = link.includes('#')

    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-7 bg-void px-6 text-center">
        <p className="label text-[10px] text-dim">Digital Color Lab</p>

        <h1 className="max-w-[22ch] text-[clamp(1.4rem,3vw,2.2rem)] leading-[1.15] font-light tracking-[-0.02em] text-chalk text-balance">
          Something in the room gave out.
        </h1>

        <p className="max-w-[34ch] text-[0.9rem] leading-relaxed font-light text-dim">
          {hasColour
            ? 'Your colour is still in the address bar. Reloading will open it again, exactly as you left it.'
            : 'Reloading will start the room again.'}
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="group relative overflow-hidden rounded-full border border-white/15 px-9 py-3 text-chalk transition-colors duration-500 hover:border-white/40"
        >
          <span className="label relative text-[11px]">Reload</span>
        </button>
      </div>
    )
  }
}
