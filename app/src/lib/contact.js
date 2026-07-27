import { effectName } from './colorEngine.js'

/**
 * Where a finished colour goes.
 *
 * The prototype has no backend by design: the hand-off is a prepared mail,
 * which is honest about what it is and works from any device in the room.
 */
export const CONTACT = {
  name: 'Lionel Schlessinger',
  role: 'Owner & CEO, Monopol Colors',
  email: 'L.Schlessinger@monopol-colors.ch',
  labUrl: 'https://www.monopol-colors.ch/de/kompetenz/colordesign/',
}

/**
 * Build the hand-off mail: subject, and a body that carries the full formula.
 *
 * Three things this deliberately does not do.
 *
 * It does not draw rules out of dashes. A mail body is rendered in whatever
 * proportional font the reader's client uses, so a row of dashes arrives as a
 * ragged line of debris — and blank lines separate just as well.
 *
 * It does not align values with padded spaces, for the same reason: "Finish
 * ······ Silk" only lines up in a monospaced font, and Apple Mail is not one.
 * Labelled colons survive every client.
 *
 * And it does not ask for anything. This mail used to end with four empty
 * fields — Name, Practice, Project, Phone — which meant the last act of a
 * two-minute composed experience was filling in a form inside a raw compose
 * window. The sender's name is already in the From line. A mail that gets sent
 * without a project name beats a complete one that never does.
 */
export function buildMailto(formula, recipe, link) {
  const { name, code, hex, cmyk, surface, colour } = formula
  const effect = formula.effect === 'none' ? 'Pure pigment' : effectName(formula.effect)

  const lines = [
    `I designed a colour in your digital Color Lab and I would like to see it for real.`,
    ``,
    `${name}`,
    `${code}`,
    ``,
    // The link first, so the colour can be looked at before it is read about.
    ...(link ? [`See it: ${link}`, ``] : []),
    `Finish: ${surface}`,
    `Effect: ${effect}`,
    `HEX: ${hex.toUpperCase()}`,
    `CMYK: ${cmyk.c} / ${cmyk.m} / ${cmyk.y} / ${cmyk.k} (indicative)`,
    `OKLCH: L ${colour.l.toFixed(3)} · C ${colour.c.toFixed(3)} · H ${colour.h.toFixed(1)}°`,
    ``,
    `How I got there:`,
    ...recipe.map((option) => `  · ${option.title}`),
    ``,
    `Happy to tell you about the project. When could we mix it?`,
  ]

  const subject = `Color Lab – ${name} (${code})`
  return `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`
}
