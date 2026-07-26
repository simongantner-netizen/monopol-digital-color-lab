/**
 * Colour maths in OKLCH.
 *
 * We think in OKLCH rather than HSL everywhere in this app: it is perceptually
 * uniform, so "a little lighter" or "a little more saturated" behaves the way
 * the eye expects. That matters here — the whole experience is one long colour
 * transition and HSL would visibly lurch through the yellows and cyans.
 *
 * Conversion maths after Björn Ottosson's Oklab.
 */

const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v))

/** OKLCH → linear sRGB (may fall outside 0..1 = outside the display gamut). */
function oklchToLinearRgb({ l, c, h }) {
  const hRad = (h * Math.PI) / 180
  const a = c * Math.cos(hRad)
  const b = c * Math.sin(hRad)

  const lp = l + 0.3963377774 * a + 0.2158037573 * b
  const mp = l - 0.1055613458 * a - 0.0638541728 * b
  const sp = l - 0.0894841775 * a - 1.291485548 * b

  const L = lp * lp * lp
  const M = mp * mp * mp
  const S = sp * sp * sp

  return {
    r: 4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    g: -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    b: -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  }
}

const inGamut = ({ r, g, b }, eps = 0.0001) =>
  r >= -eps && r <= 1 + eps && g >= -eps && g <= 1 + eps && b >= -eps && b <= 1 + eps

/**
 * Pull chroma down until the colour fits inside sRGB.
 *
 * Naive clamping of out-of-gamut channels shifts the hue — a deep saturated
 * blue clips to purple. Binary-searching chroma instead keeps hue and lightness
 * intact and only gives up the saturation the display cannot show anyway.
 */
export function toGamut({ l, c, h }) {
  const lc = clamp(l, 0, 1)
  if (inGamut(oklchToLinearRgb({ l: lc, c, h }))) return { l: lc, c, h }

  let lo = 0
  let hi = c
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2
    if (inGamut(oklchToLinearRgb({ l: lc, c: mid, h }))) lo = mid
    else hi = mid
  }
  return { l: lc, c: lo, h }
}

const gammaEncode = (x) =>
  x >= 0.0031308 ? 1.055 * Math.pow(x, 1 / 2.4) - 0.055 : 12.92 * x

/** OKLCH → { r, g, b } in 0..1, gamut-mapped and gamma-encoded (sRGB). */
export function oklchToRgb(colour) {
  const lin = oklchToLinearRgb(toGamut(colour))
  return {
    r: clamp(gammaEncode(lin.r)),
    g: clamp(gammaEncode(lin.g)),
    b: clamp(gammaEncode(lin.b)),
  }
}

/** OKLCH → "#rrggbb". */
export function oklchToHex(colour) {
  const { r, g, b } = oklchToRgb(colour)
  const hex = (v) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}`
}

/** OKLCH → "rgb(r g b)" with 0..255 integers, for CSS. */
export function oklchToCss(colour, alpha = 1) {
  const { r, g, b } = oklchToRgb(colour)
  const to255 = (v) => Math.round(v * 255)
  return alpha === 1
    ? `rgb(${to255(r)} ${to255(g)} ${to255(b)})`
    : `rgb(${to255(r)} ${to255(g)} ${to255(b)} / ${alpha})`
}

/** Approximate WCAG relative luminance — used to pick readable text on a colour. */
export function relativeLuminance(colour) {
  const { r, g, b } = oklchToRgb(colour)
  const lin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** Interpolate two OKLCH colours, taking the shorter way around the hue circle. */
export function mixOklch(a, b, t) {
  let dh = b.h - a.h
  if (dh > 180) dh -= 360
  if (dh < -180) dh += 360
  return {
    l: a.l + (b.l - a.l) * t,
    c: a.c + (b.c - a.c) * t,
    h: (a.h + dh * t + 360) % 360,
  }
}

/** Rough CMYK preview for the colour passport. Indicative only — not a proof. */
export function toCmyk(colour) {
  const { r, g, b } = oklchToRgb(colour)
  const k = 1 - Math.max(r, g, b)
  if (k >= 0.999) return { c: 0, m: 0, y: 0, k: 100 }
  const d = 1 - k
  return {
    c: Math.round(((1 - r - k) / d) * 100),
    m: Math.round(((1 - g - k) / d) * 100),
    y: Math.round(((1 - b - k) / d) * 100),
    k: Math.round(k * 100),
  }
}

export { clamp }
