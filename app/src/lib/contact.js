import { effectName } from './colorEngine.js'

/**
 * Where a finished colour goes.
 *
 * ── BEFORE THE PRESENTATION ────────────────────────────────────────────────
 * Replace `email` with Lionel's real address. Everything else is live.
 * The prototype has no backend by design: the hand-off is a prepared mail,
 * which is honest about what it is and works from any device in the room.
 * ───────────────────────────────────────────────────────────────────────────
 */
export const CONTACT = {
  name: 'Lionel Schlessinger',
  role: 'Owner & CEO, Monopol Colors',
  email: 'colorlab@monopol-colors.ch', // ← placeholder
  labUrl: 'https://www.monopol-colors.ch/de/kompetenz/colordesign/',
}

/** Build the hand-off mail: subject, and a body that carries the full formula. */
export function buildMailto(formula, recipe) {
  const { name, code, hex, cmyk, surface, colour } = formula
  const effect = formula.effect === 'none' ? 'Pure pigment' : effectName(formula.effect)

  const lines = [
    `I designed a colour in your digital Color Lab and I would like to see it for real.`,
    ``,
    `———————————————————————`,
    `${name}`,
    `${code}`,
    `———————————————————————`,
    ``,
    `Finish       ${surface}`,
    `Effect       ${effect}`,
    `HEX          ${hex.toUpperCase()}`,
    `CMYK         ${cmyk.c} / ${cmyk.m} / ${cmyk.y} / ${cmyk.k}   (indicative)`,
    `OKLCH        L ${colour.l.toFixed(3)}  C ${colour.c.toFixed(3)}  H ${colour.h.toFixed(1)}°`,
    ``,
    `How I got there:`,
    ...recipe.map((option) => `  · ${option.title}`),
    ``,
    `Please get in touch about a session in the Color Lab.`,
    ``,
    `Name:`,
    `Practice:`,
    `Project:`,
    `Phone:`,
  ]

  const subject = `Color Lab — ${name} (${code})`
  return `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`
}
