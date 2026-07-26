import * as THREE from 'three'

/**
 * Procedural normal maps for the special-effect lacquers.
 *
 * Generated rather than loaded: a metallic flake map is just noise with the
 * right statistics, and generating it keeps the prototype a single self-
 * contained bundle with no texture downloads.
 */

const SIZE = 512

/**
 * DataTexture defaults to no mipmaps and nearest-ish minification, so
 * high-frequency noise aliases badly the moment the panel is drawn smaller
 * than the texture — it reads as sandpaper instead of lacquer. Every map here
 * goes through this.
 */
function finish(texture, repeat) {
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeat, repeat)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

/**
 * Metallic flake. Cells of constant normal, each tilted a random amount —
 * that is physically what a flake lacquer is: thousands of tiny mirrors
 * suspended at random angles in a clear binder.
 */
export function createFlakeNormalMap(cell = 3, strength = 0.85) {
  const data = new Uint8Array(SIZE * SIZE * 4)
  const cells = Math.ceil(SIZE / cell)

  // One random normal per cell, looked up per pixel.
  const normals = new Float32Array(cells * cells * 3)
  for (let i = 0; i < cells * cells; i++) {
    // Cosine-ish distribution around straight up, so most flakes lie flat.
    const theta = Math.random() * Math.PI * 2
    const tilt = Math.pow(Math.random(), 1.6) * strength
    normals[i * 3] = Math.cos(theta) * tilt
    normals[i * 3 + 1] = Math.sin(theta) * tilt
    normals[i * 3 + 2] = Math.sqrt(Math.max(0.02, 1 - tilt * tilt))
  }

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const ci = (Math.floor(y / cell) * cells + Math.floor(x / cell)) * 3
      const i = (y * SIZE + x) * 4
      data[i] = (normals[ci] * 0.5 + 0.5) * 255
      data[i + 1] = (normals[ci + 1] * 0.5 + 0.5) * 255
      data[i + 2] = (normals[ci + 2] * 0.5 + 0.5) * 255
      data[i + 3] = 255
    }
  }

  return finish(new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat), 5)
}

/**
 * Fine brushed grain for the metallic finish — anisotropic streaks along one
 * axis, which is what gives brushed metal its directional highlight.
 */
export function createBrushedNormalMap() {
  const data = new Uint8Array(SIZE * SIZE * 4)

  for (let y = 0; y < SIZE; y++) {
    // One streak value per row, smoothed along it.
    let carry = 0
    for (let x = 0; x < SIZE; x++) {
      carry = carry * 0.86 + (Math.random() - 0.5) * 0.14
      const nx = carry
      const ny = (Math.random() - 0.5) * 0.02
      const nz = Math.sqrt(Math.max(0.02, 1 - nx * nx - ny * ny))
      const i = (y * SIZE + x) * 4
      data[i] = (nx * 0.5 + 0.5) * 255
      data[i + 1] = (ny * 0.5 + 0.5) * 255
      data[i + 2] = (nz * 0.5 + 0.5) * 255
      data[i + 3] = 255
    }
  }

  return finish(new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat), 3)
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

  return finish(new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat), 4)
}
