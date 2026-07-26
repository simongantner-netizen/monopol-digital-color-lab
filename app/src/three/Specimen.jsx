import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { createFlakeNormalMap, createBrushedNormalMap, createToothNormalMap } from './flakeTexture'

/**
 * The sample panel.
 *
 * This is the whole argument for building the prototype in WebGL instead of
 * CSS: matt and silk and high gloss are not different colours, they are
 * different ways of returning light. A gradient cannot fake that, and a
 * coatings company would spot the fake immediately. Real PBR material under a
 * real studio environment, so the surface answers the light honestly.
 */

const damp = (current, target, lambda, dt) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt))

const PANEL_SIZE = 5.6

/** Clear space above the panel, as a fraction of the visible height. */
const TOP_MARGIN = 0.075

/** Scratch matrix for the clamp — reused so the frame loop allocates nothing. */
const clampMatrix = new THREE.Matrix4()

export default function Specimen({
  params,
  colour,
  presence = 0,
  interactive = true,
  heightFraction = 0.44,
  reservePx = 460,
}) {
  const meshRef = useRef()
  const materialRef = useRef()
  const tilt = useRef({ x: 0, y: 0 })

  /**
   * Size and position are derived from the live viewport every frame, never
   * from fixed world units and never memoised.
   *
   * Fixed units that frame nicely on a 16:9 laptop push the panel off the top
   * of a taller window. Memoising the calculation is just as bad: R3F applies
   * the camera props after the first render, so a useMemo would capture the
   * default camera and then never recompute — the panel would sit too high
   * forever, and survive resizes unchanged. Recomputing per frame costs four
   * multiplications and is always right.
   */
  const framing = (state) => {
    const h = state.viewport.height
    const w = state.viewport.width

    /**
     * The HTML below needs a roughly fixed number of pixels — a name, a code,
     * a recipe, a button. A percentage-only rule ignores that: on a wide, low
     * window 42% of the height still leaves too little for the text, and the
     * two collide. So the text is reserved first and the panel takes what is
     * left, which only ever bites on short windows.
     */
    const usable = Math.max(0.16, (state.size.height - reservePx) / state.size.height)
    const fraction = Math.min(heightFraction, usable)

    // A fraction of the visible height, but never so wide it crowds the sides.
    const panel = Math.min(fraction * h, w * 0.56)

    // The camera is aimed at the origin, so the centre of frame on this plane
    // is y = 0 — not the camera's own height. Adding camera.position.y here
    // pushed the panel up by exactly that offset and clipped it off the top.
    const topEdge = h / 2

    return {
      scale: panel / PANEL_SIZE,
      // 1.18 leaves room for the tilt: a rotated square reaches higher at its
      // corners than a flat one does at its edge. This is the resting target;
      // clampTop below is what actually guarantees it.
      y: topEdge - TOP_MARGIN * h - (panel / 2) * 1.18,
    }
  }

  /**
   * Hard guarantee that the panel never crosses the top edge.
   *
   * The resting position above is an estimate. The panel is tilted, follows
   * the pointer, and drifts — so its true silhouette is the projection of a
   * rotated box, not its flat height. Two things make it reach higher than
   * half its size: the corners of a rotated square sit above its edge, and the
   * face tipped toward the lens is magnified by perspective.
   *
   * So we measure. `extentY` is the standard rotated-AABB half-height, and
   * `extentZ` gives how far the nearest point leans toward the camera, which
   * becomes the perspective magnification. Then we clamp. Position only —
   * never scale — because a panel that changed size as you moved the mouse
   * would read as broken, whereas a few hundredths of drift does not.
   */
  const clampTop = (state, mesh) => {
    const s = mesh.scale.x
    if (s < 0.01) return

    const e = clampMatrix.makeRotationFromEuler(mesh.rotation).elements
    const half = (PANEL_SIZE / 2) * s
    const depth = 0.15 * s

    // Row 1 and row 2 of the rotation matrix (three.js stores column-major).
    const extentY = Math.abs(e[1]) * half + Math.abs(e[5]) * half + Math.abs(e[9]) * depth
    const extentZ = Math.abs(e[2]) * half + Math.abs(e[6]) * half + Math.abs(e[10]) * depth

    const camDist = state.camera.position.z
    const perspective = camDist / Math.max(0.001, camDist - extentZ)

    const limit = state.viewport.height / 2 - TOP_MARGIN * state.viewport.height
    mesh.position.y = Math.min(mesh.position.y, limit - extentY * perspective)
  }

  const tooth = useMemo(() => createToothNormalMap(), [])
  const flake = useMemo(() => createFlakeNormalMap(), [])
  const brushed = useMemo(() => createBrushedNormalMap(), [])

  useEffect(
    () => () => [tooth, flake, brushed].forEach((t) => t.dispose()),
    [tooth, flake, brushed],
  )

  // Swap the surface texture with the effect. Changing the map identity needs
  // a shader recompile, so this is kept out of the frame loop.
  useEffect(() => {
    const material = materialRef.current
    if (!material) return
    const map =
      params.flake > 0 ? flake : params.metalness > 0.6 ? brushed : tooth
    material.normalMap = map
    material.normalScale.set(
      params.flake > 0 ? 0.55 : params.metalness > 0.6 ? 0.28 : 0.06,
      params.flake > 0 ? 0.55 : params.metalness > 0.6 ? 0.28 : 0.06,
    )
    material.needsUpdate = true
  }, [params.flake, params.metalness, flake, brushed, tooth])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const mesh = meshRef.current
    const material = materialRef.current
    if (!mesh || !material) return

    const t = state.clock.elapsedTime

    // Rest pose plus a slow drift, so the highlight is always travelling and
    // the surface never looks like a flat swatch.
    const targetX = interactive ? -state.pointer.y * 0.34 : 0
    const targetY = interactive ? state.pointer.x * 0.45 : 0
    tilt.current.x = damp(tilt.current.x, targetX, 3, dt)
    tilt.current.y = damp(tilt.current.y, targetY, 3, dt)

    mesh.rotation.x = tilt.current.x + Math.sin(t * 0.24) * 0.07 - 0.14
    mesh.rotation.y = tilt.current.y + Math.sin(t * 0.19) * 0.13
    mesh.rotation.z = Math.sin(t * 0.16) * 0.03

    // Presence eases the panel in from behind; framing keeps it inside the
    // window and clear of whichever controls the current phase needs.
    const layout = framing(state)
    const target = presence < 0.5 ? 0.001 : layout.scale
    mesh.scale.setScalar(damp(mesh.scale.x, target, 4.5, dt))
    mesh.position.y = damp(mesh.position.y, layout.y, 3.5, dt) + Math.sin(t * 0.42) * 0.07
    mesh.position.z = damp(mesh.position.z, presence < 0.5 ? -6 : 0, 4, dt)

    // Last word on vertical placement — runs after rotation, scale and drift
    // are final, so nothing downstream can push the panel back off the top.
    clampTop(state, mesh)

    // Material properties are damped too — dragging the gloss slider should
    // feel like turning a dial on a real finish, not flipping a switch.
    material.roughness = damp(material.roughness, params.roughness, 6, dt)
    material.metalness = damp(material.metalness, params.metalness, 6, dt)
    material.clearcoat = damp(material.clearcoat, params.clearcoat, 6, dt)
    material.clearcoatRoughness = damp(
      material.clearcoatRoughness,
      params.clearcoatRoughness,
      6,
      dt,
    )
    material.iridescence = damp(material.iridescence, params.iridescence, 5, dt)
    material.iridescenceIOR = damp(material.iridescenceIOR, params.iridescenceIOR, 5, dt)
    material.sheen = damp(material.sheen, params.sheen, 5, dt)
    material.envMapIntensity = damp(material.envMapIntensity, params.envMapIntensity, 5, dt)
    material.color.lerp(colour, Math.min(1, dt * 3))
    material.sheenColor.lerp(colour, Math.min(1, dt * 3))
    material.opacity = damp(material.opacity, presence, 5, dt)
  })

  return (
    <RoundedBox
      ref={meshRef}
      args={[PANEL_SIZE, PANEL_SIZE, 0.3]}
      radius={0.1}
      smoothness={5}
      scale={0.001}
      castShadow
    >
      {/*
        Seeded from the live params rather than fixed defaults: the frame loop
        only damps *towards* these, so starting on a hardcoded matt grey would
        show one wrong frame every time the panel appears.
      */}
      <meshPhysicalMaterial
        ref={materialRef}
        color={colour}
        roughness={params.roughness}
        metalness={params.metalness}
        clearcoat={params.clearcoat}
        clearcoatRoughness={params.clearcoatRoughness}
        iridescence={params.iridescence}
        iridescenceIOR={params.iridescenceIOR}
        iridescenceThicknessRange={[120, 520]}
        sheen={params.sheen}
        sheenRoughness={0.55}
        sheenColor={colour}
        envMapIntensity={params.envMapIntensity}
        normalMap={tooth}
        normalScale={new THREE.Vector2(0.06, 0.06)}
        transparent
        opacity={0}
      />
    </RoundedBox>
  )
}
