import * as THREE from 'three'

/**
 * Procedural maps for the sample panel's surfaces.
 *
 * Generated rather than loaded: a metallic flake map is just noise with the
 * right statistics, and generating it keeps the prototype a single self-
 * contained bundle with no texture downloads.
 */

const SIZE = 512

/**
 * How many times a map should tile across the panel — *not* `texture.repeat`.
 *
 * Repeat is measured in UV units, and this panel's UVs do not run 0…1. Storing
 * the intent instead of the raw repeat lets the panel measure its own UV span
 * once and convert; see `applyTiling` in `Specimen.jsx` for what went wrong
 * when this was written as a repeat directly.
 *
 * Every map here is designed to be read at roughly one texel per device pixel.
 * Below that, mipmapping averages the structure away and the surface reads as
 * a flat sheen — which is precisely the failure this replaced.
 *
 * DataTexture also defaults to no mipmaps and nearest-ish minification, so
 * high-frequency noise aliases badly the moment the panel is drawn smaller
 * than the texture. Every map goes through this.
 */
function finish(texture, tiles) {
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.userData.tiles = tiles
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

/**
 * Metallic flake: mirrors suspended in a matt binder.
 *
 * The first version tilted *every* cell, which left no binder at all — the
 * panel became one evenly crumpled surface rather than a scatter of glints,
 * and evenly crumpled reads as slightly rough paint. A flake lacquer is two
 * surfaces at once, and only the second one sparkles: a minority of platelets
 * lying at random angles, polished, in a binder that is not.
 *
 * So the normals and the roughness are generated in the same cell loop and
 * are pixel-for-pixel the same decision. Flake cells get a tilt and a lower
 * roughness; binder cells stay flat and stay at 1.0, which multiplies out to
 * exactly whatever the gloss slider set.
 *
 * The flake multiplier is 0.45 and not the 0.2 first written here. Three
 * multiplies this map into the material's roughness, and 0.2 took the flake
 * cells to 0.028 at the glitter gloss — under the 0.09 floor that
 * `materialParams` holds deliberately, and under three's own 0.0525 clamp,
 * where the slider stops meaning anything at all. Pinning a third of the
 * surface to a mirror below a floor the rest of the engine respects is not a
 * flake lacquer; it is a leak in the one rule the client already rejected once.
 * At 0.45 the platelets land near 0.063: visibly sharper than the binder,
 * still short of the clamp, and still moving when the slider moves.
 *
 * Coverage is a third, not a half. Above about 40% the glints start to touch
 * and the panel turns into a sheet of foil.
 */
export function createFlakeMaps(cell = 3, tilt = 0.55, coverage = 0.3) {
  const normalData = new Uint8Array(SIZE * SIZE * 4)
  const roughData = new Uint8Array(SIZE * SIZE * 4)
  const cells = Math.ceil(SIZE / cell)

  // One decision per cell, looked up per pixel.
  const normals = new Float32Array(cells * cells * 3)
  const rough = new Uint8Array(cells * cells)

  for (let i = 0; i < cells * cells; i++) {
    const isFlake = Math.random() < coverage
    if (isFlake) {
      const theta = Math.random() * Math.PI * 2
      // Cosine-ish distribution around straight up, so most platelets lie
      // nearly flat and only a few catch a light at any one angle.
      const amount = Math.pow(Math.random(), 1.6) * tilt
      normals[i * 3] = Math.cos(theta) * amount
      normals[i * 3 + 1] = Math.sin(theta) * amount
      normals[i * 3 + 2] = Math.sqrt(Math.max(0.02, 1 - amount * amount))
      rough[i] = 115 // 0.45 — polished, but not past the engine's own floor
    } else {
      normals[i * 3] = 0
      normals[i * 3 + 1] = 0
      normals[i * 3 + 2] = 1
      rough[i] = 255 // 1.0 — leaves the binder exactly as the gloss set it
    }
  }

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const c = Math.floor(y / cell) * cells + Math.floor(x / cell)
      const i = (y * SIZE + x) * 4

      normalData[i] = (normals[c * 3] * 0.5 + 0.5) * 255
      normalData[i + 1] = (normals[c * 3 + 1] * 0.5 + 0.5) * 255
      normalData[i + 2] = (normals[c * 3 + 2] * 0.5 + 0.5) * 255
      normalData[i + 3] = 255

      // Three reads the green channel of a roughness map, so that it can share
      // a texture with occlusion and metalness. Written to all three anyway —
      // a map that only makes sense in one channel is a map nobody can debug.
      roughData[i] = rough[c]
      roughData[i + 1] = rough[c]
      roughData[i + 2] = rough[c]
      roughData[i + 3] = 255
    }
  }

  return {
    normal: finish(new THREE.DataTexture(normalData, SIZE, SIZE, THREE.RGBAFormat), 1),
    roughness: finish(new THREE.DataTexture(roughData, SIZE, SIZE, THREE.RGBAFormat), 1),
  }
}

/**
 * Interference film thickness, as broad soft zones.
 *
 * Three only varies the thickness of an iridescent film where this map says
 * so. Without it the shader takes the *maximum* of the thickness range and
 * holds it across the whole surface — the minimum is never read at all — so
 * the panel gets one flat, uniform interference tint and nothing shifts.
 *
 * Low frequency on purpose. A noise map at the flake's resolution would be
 * mathematically correct and visually worthless: the eye would average the
 * colours back into grey, and a real interference lacquer does not look like
 * confetti anyway. It shows wide zones that walk from one neighbour hue to
 * the next as you move past it — which is also what the sample band under
 * question 04 promises, in three broad stops rather than a spectrum.
 */
export function createIridescenceThicknessMap(size = 128) {
  const data = new Uint8Array(size * size * 4)

  // Value noise: a coarse random lattice, smoothed between its points. Wraps
  // by construction, so the map can tile without a seam.
  const lattice = (cells) => {
    const points = new Float32Array(cells * cells)
    for (let i = 0; i < points.length; i++) points[i] = Math.random()
    const at = (i, j) => points[(j % cells) * cells + (i % cells)]
    const smooth = (t) => t * t * (3 - 2 * t)

    return (u, v) => {
      const x = u * cells
      const y = v * cells
      const x0 = Math.floor(x)
      const y0 = Math.floor(y)
      const fx = smooth(x - x0)
      const fy = smooth(y - y0)
      const top = at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx
      const bottom = at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx
      return top * (1 - fy) + bottom * fy
    }
  }

  // Two octaves. The coarse one makes the zones, the finer one keeps their
  // edges from looking like a stretched gradient.
  const coarse = lattice(6)
  const fine = lattice(13)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      const n = (coarse(u, v) + fine(u, v) * 0.35) / 1.35
      const b = Math.round(Math.min(1, Math.max(0, n)) * 255)
      const i = (y * size + x) * 4
      data[i] = b
      data[i + 1] = b // the channel three actually reads
      data[i + 2] = b
      data[i + 3] = 255
    }
  }

  return finish(new THREE.DataTexture(data, size, size, THREE.RGBAFormat), 1)
}

/**
 * Fine brushed grain for the metallic finish — anisotropic streaks along one
 * axis, which is what gives brushed metal its directional highlight.
 *
 * Correlated in both directions, and the second one is the fix. The first
 * version carried its running value along each row and reset it at every line
 * break, which gave the map a correlation length of about seven texels
 * horizontally and exactly none vertically: not brushed metal but a stack of
 * unrelated seven-pixel dashes, whose vertical frequency sits at Nyquist. It
 * was invisible only because the map was tiled seventeen times over and its
 * normal scale was being reset to the tooth's value on every render. With both
 * of those fixed it would have surfaced as crawling noise under the panel's
 * drift. Brushing leaves grooves that survive across neighbouring lines, so the
 * carry now survives too.
 */
export function createBrushedNormalMap() {
  const data = new Uint8Array(SIZE * SIZE * 4)
  const previous = new Float32Array(SIZE)

  for (let y = 0; y < SIZE; y++) {
    let carry = 0
    for (let x = 0; x < SIZE; x++) {
      carry = carry * 0.86 + (Math.random() - 0.5) * 0.14
      // Most of the groove comes from the line above; the rest is this row's
      // own wander. That is what makes a streak a streak rather than a dash.
      const nx = previous[x] * 0.82 + carry * 0.18
      previous[x] = nx
      const ny = (Math.random() - 0.5) * 0.02
      const nz = Math.sqrt(Math.max(0.02, 1 - nx * nx - ny * ny))
      const i = (y * SIZE + x) * 4
      data[i] = (nx * 0.5 + 0.5) * 255
      data[i + 1] = (ny * 0.5 + 0.5) * 255
      data[i + 2] = (nz * 0.5 + 0.5) * 255
      data[i + 3] = 255
    }
  }

  return finish(new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat), 1)
}

/**
 * Barely-there surface tooth, always applied. A perfectly smooth digital
 * surface is the tell that gives away a fake material — real paint has a
 * texture even at high gloss.
 */
export function createToothNormalMap() {
  const data = new Uint8Array(SIZE * SIZE * 4)

  // Blurred across neighbours rather than per-pixel white noise: paint tooth
  // is a low-frequency undulation, and pure per-pixel noise just shimmers.
  const field = new Float32Array(SIZE * SIZE * 2)
  for (let i = 0; i < SIZE * SIZE * 2; i++) field[i] = Math.random() - 0.5

  const at = (x, y, c) => field[((y & (SIZE - 1)) * SIZE + (x & (SIZE - 1))) * 2 + c]

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const smooth = (c) =>
        (at(x, y, c) + at(x + 1, y, c) + at(x, y + 1, c) + at(x + 1, y + 1, c)) * 0.25

      const nx = smooth(0) * 0.16
      const ny = smooth(1) * 0.16
      const nz = Math.sqrt(Math.max(0.02, 1 - nx * nx - ny * ny))
      const i = (y * SIZE + x) * 4
      data[i] = (nx * 0.5 + 0.5) * 255
      data[i + 1] = (ny * 0.5 + 0.5) * 255
      data[i + 2] = (nz * 0.5 + 0.5) * 255
      data[i + 3] = 255
    }
  }

  return finish(new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat), 1)
}
