/**
 * A colour, written into the address bar.
 *
 * Until now the whole thing lived in React state: four answers, five
 * refinements, a name someone typed. Close the tab and it was gone — nothing
 * to send a colleague, nothing for Lionel to forward, no way back to your own
 * colour. For an experience whose entire promise is "this one is yours", that
 * was the wrong ending.
 *
 * The engine is deterministic, so the colour does not need storing: the
 * answers that made it do. That fits in a few dozen characters, needs no
 * backend, and survives on a static host.
 *
 * The format is positional and versioned:
 *
 *   #1~<world><voice><hour><light>~<hue>~<lightness>~<chroma>~<gloss>~<effect>~<name>
 *
 * Answers are single base-36 digits (their position in `questions.js`), or a
 * dash where unanswered. Every field after them may be empty, and trailing
 * empties are dropped — an untouched colour is a short link.
 *
 * The separator is a tilde and not the obvious dot, because half these fields
 * are decimals: a dot-separated `-12.5` splits into `-12` and `5`, and the
 * link silently restores a different colour. Tilde is unreserved in a URL and
 * cannot occur in a number.
 *
 * The leading version digit is not decoration. These links will outlive at
 * least one change to the colour engine, and a link that quietly renders the
 * wrong colour a year from now is worse than one that admits it cannot be
 * read. Bump it whenever the engine's maths changes, and old links stop
 * resolving instead of lying.
 */

import { QUESTIONS } from './questions.js'
import { EFFECTS, NO_TWEAKS } from './colorEngine.js'

const VERSION = '1'
const SEP = '~'

const questionById = (id) => QUESTIONS.find((q) => q.id === id)

/** Position of an answer within its question, as one base-36 digit. */
function indexOf(questionId, optionId) {
  const options = questionById(questionId)?.options ?? []
  const i = options.findIndex((o) => o.id === optionId)
  return i < 0 ? '-' : i.toString(36)
}

function optionAt(questionId, digit) {
  if (!digit || digit === '-') return null
  const options = questionById(questionId)?.options ?? []
  return options[parseInt(digit, 36)]?.id ?? null
}

/** Numbers go in at the precision their slider actually steps in, no further. */
const num = (v, decimals) =>
  v === null || v === undefined || Math.abs(v) < 1e-9 ? '' : Number(v.toFixed(decimals)).toString()

export function encodeColour(answers, tweaks, customName) {
  const fields = [
    VERSION,
    ['world', 'voice', 'hour', 'light'].map((id) => indexOf(id, answers[id])).join(''),
    num(tweaks.hue, 1),
    num(tweaks.lightness, 3),
    num(tweaks.chroma, 3),
    tweaks.gloss === null || tweaks.gloss === undefined ? '' : tweaks.gloss.toFixed(2),
    tweaks.effect ? String(EFFECTS.findIndex((e) => e.id === tweaks.effect)) : '',
    customName ? encodeURIComponent(customName) : '',
  ]

  // An untouched colour should not carry six empty fields around with it.
  while (fields.length > 2 && fields[fields.length - 1] === '') fields.pop()
  return fields.join(SEP)
}

/**
 * Read a link back. Returns null for anything it does not fully understand —
 * a half-restored colour would be a different colour, and showing someone the
 * wrong one under their own name is the one failure worth refusing.
 */
export function decodeColour(hash) {
  const raw = (hash || '').replace(/^#/, '')
  if (!raw) return null

  const fields = raw.split(SEP)
  if (fields[0] !== VERSION) return null

  const digits = fields[1] ?? ''
  if (digits.length !== 4) return null

  const answers = {
    world: optionAt('world', digits[0]),
    voice: optionAt('voice', digits[1]),
    hour: optionAt('hour', digits[2]),
    light: optionAt('light', digits[3]),
  }
  // A link is only worth opening if it resolves to a finished colour.
  if (Object.values(answers).some((v) => !v)) return null

  const number = (raw, fallback) => {
    if (raw === undefined || raw === '') return fallback
    const n = Number(raw)
    return Number.isFinite(n) ? n : fallback
  }

  const effectIndex = fields[6] === undefined || fields[6] === '' ? null : Number(fields[6])
  const customName = fields[7] ? decodeURIComponent(fields[7]) : null

  return {
    answers,
    tweaks: {
      ...NO_TWEAKS,
      hue: number(fields[2], 0),
      lightness: number(fields[3], 0),
      chroma: number(fields[4], 0),
      gloss: fields[5] === undefined || fields[5] === '' ? null : number(fields[5], null),
      effect: EFFECTS[effectIndex]?.id ?? null,
    },
    customName,
  }
}

/** The link as someone would paste it, absolute and complete. */
export const shareUrl = (answers, tweaks, customName) =>
  `${window.location.origin}${window.location.pathname}#${encodeColour(answers, tweaks, customName)}`

/**
 * Keep the address bar current without filling the back button with every
 * nudge of a slider.
 *
 * Guarded, because what can fail here is a browser quota and not a program
 * error. Safari throws a SecurityError once `history.replaceState` has been
 * called a hundred times in thirty seconds — Chrome only throttles silently,
 * Firefox warns. The caller debounces so this ceiling should now be
 * unreachable, but the trade is not close: an address bar that lags a moment
 * behind is a triviality, and an exception escaping into React's effect phase
 * takes the entire page down with it.
 */
export function writeHash(answers, tweaks, customName) {
  const next = `#${encodeColour(answers, tweaks, customName)}`
  if (window.location.hash === next) return
  try {
    window.history.replaceState(null, '', next)
  } catch {
    /* Over quota. The next write carries the colour instead. */
  }
}
