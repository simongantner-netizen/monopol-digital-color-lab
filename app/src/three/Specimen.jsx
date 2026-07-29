import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import {
  createFlakeMaps,
  createBrushedNormalMap,
  createToothNormalMap,
  createIridescenceThicknessMap,
} from './flakeTexture'

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

/**
 * Clear space between the panel and whatever the interface has reserved below
 * it. The panel is allowed to be close to the type; it is not allowed to touch
 * it, and a name set at four rem needs visible air above its ascenders.
 */
const BOTTOM_MARGIN = 0.045

/**
 * How much taller than its flat height a tilted panel reaches.
 *
 * A square rotated in its own plane puts its corners above its edge, and the
 * face leaning toward the lens is magnified by perspective. Used for sizing
 * only — the true reach is measured every frame further down.
 */
const TILT_ALLOWANCE = 1.18

/** How far the panel breathes, in world units, when there is room for it. */
const DRIFT = 0.07

/** Scratch matrix for the reach measurement — the frame loop allocates nothing. */
const clampMatrix = new THREE.Matrix4()

/**
 * Lay each map across the panel the number of times it was designed for.
 *
 * This is where every surface on this panel was quietly being lost.
 * `RoundedBox` is an `ExtrudeGeometry` underneath, and three's default UV
 * generator writes object-space coordinates straight into the UV attribute —
 * so this panel's UVs run 0…5.68, not 0…1, and `geometry.center()` moves the
 * positions without touching them. Every `texture.repeat` was therefore
 * multiplied by 5.6 behind our backs: the flake map tiled 28 times across the
 * panel, which put six to twelve flakes inside a single device pixel, and
 * mipmapping averaged them into a flat sheen. The tooth and the brushed grain
 * went the same way — the panel that was built to prove real materials had, in
 * the end, no surface on it at all.
 *
 * Measured rather than divided by a constant, because a hardcoded assumption
 * about these UVs is exactly what was wrong the first time. The offset lines
 * the map up with the face, whose UV origin is not at a corner either.
 */
function applyTiling(geometry, maps) {
  const uv = geometry?.attributes?.uv
  if (!uv) return

  let minU = Infinity
  let maxU = -Infinity
  let minV = Infinity
  let maxV = -Infinity
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i)
    const v = uv.getY(i)
    if (u < minU) minU = u
    if (u > maxU) maxU = u
    if (v < minV) minV = v
    if (v > maxV) maxV = v
  }

  const spanU = Math.max(1e-6, maxU - minU)
  const spanV = Math.max(1e-6, maxV - minV)

  maps.forEach((texture) => {
    const tiles = texture.userData.tiles ?? 1
    texture.repeat.set(tiles / spanU, tiles / spanV)
    texture.offset.set(-minU * texture.repeat.x, -minV * texture.repeat.y)
    texture.needsUpdate = true
  })
}

export default function Specimen({
  params,
  colour,
  presence = 0,
  interactive = true,
  heightFraction = 0.44,
  reservePx = 460,
  reserveFraction = 0,
  slot = null,
}) {
  const meshRef = useRef()
  const materialRef = useRef()
  const tilt = useRef({ x: 0, y: 0 })

  /**
   * The panel's settled height, before the drift is added on top.
   *
   * Kept apart from mesh.position.y on purpose: damping toward a target from a
   * value that already has this frame's wobble baked into it makes the wobble
   * feed itself, and the amount of room left over stops being knowable.
   */
  const baseY = useRef(0)

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
     * The interface below reserves its space first; the panel takes what is
     * left. Two kinds of claim, because two kinds of block:
     *
     *   reservePx        text that is a roughly fixed height whatever the
     *                    screen — a name, a code, a recipe, a button
     *   reserveFraction  blocks sized in viewport units, like the refine
     *                    bench at max-h-[58vh]
     *
     * The larger claim wins. A percentage-only rule leaves too little for text
     * on a low window; a pixel-only rule underestimates the bench on a phone,
     * where its columns stack and it grows to fill the screen.
     */
    const claim = Math.max(reservePx, reserveFraction * state.size.height)
    /*
      The interface can ask, but it cannot have everything. On a short window
      the reveal's claim — a name, a code, a recipe, a swatch row, a button and
      a caption — comes to most of the screen, and taken literally it leaves the
      panel a sliver of a band to live in. Capped, the panel keeps a workable
      share and the text below scrolls if it must.
    */
    const reserved = Math.min(claim, state.size.height * 0.6)
    // That claim is made in CSS pixels; the panel lives in world units.
    const reservedWorld = (reserved / state.size.height) * h

    /*
      The band the panel is allowed to occupy: clear of the top edge, clear of
      the interface below, with air on both sides of it.

      The camera is aimed at the origin, so the centre of frame on this plane
      is y = 0 — not the camera's own height. Adding camera.position.y here
      pushed the panel up by exactly that offset and clipped it off the top.
    */
    const top = h / 2 - TOP_MARGIN * h
    const bottom = -h / 2 + reservedWorld + BOTTOM_MARGIN * h
    const band = Math.max(0.5, top - bottom)

    /*
      The panel takes the smallest of what it may be: its share of the height,
      what the band can hold once tilted, and never so wide it crowds the sides.

      The band gives up room for the drift before it is divided. A panel sized
      to fill its band exactly would fit — and then have nowhere left to move,
      which is the stillness this was meant to cure.
    */
    const panel = Math.min(
      heightFraction * h,
      Math.max(0.4, band - 2 * DRIFT) / TILT_ALLOWANCE,
      w * 0.56,
    )

    return { scale: panel / PANEL_SIZE, top, bottom }
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
  /**
   * Follow a slot in the page instead of framing against the viewport.
   *
   * The passport gives the panel a place of its own in the document, and that
   * place scrolls. So the slot is measured every frame and converted into world
   * units — the canvas is fixed and fills the window, which makes the mapping a
   * single ratio. Returns null when there is no slot, or when it has scrolled
   * far enough out of the window that the panel should stop being drawn.
   */
  const followSlot = (state) => {
    const el = slot?.current
    if (!el) return null

    const rect = el.getBoundingClientRect()
    if (!rect.height) return null

    const h = state.viewport.height
    const worldPerPx = h / state.size.height

    // Gone from the window, or nearly — let it go rather than render it
    // hanging off an edge.
    const visible =
      rect.bottom > rect.height * 0.35 && rect.top < state.size.height - rect.height * 0.2
    if (!visible) return null

    // The panel is square; the slot is a band, so its height is the constraint.
    const size = Math.min(rect.height, rect.width) * worldPerPx
    const centreY = rect.top + rect.height / 2
    return {
      scale: (size / PANEL_SIZE) / TILT_ALLOWANCE,
      y: h / 2 - centreY * worldPerPx,
      x: (rect.left + rect.width / 2 - state.size.width / 2) * worldPerPx,
    }
  }

  const settle = (state, mesh, layout) => {
    const s = mesh.scale.x
    if (s < 0.01) return { centre: mesh.position.y, drift: 0 }

    const e = clampMatrix.makeRotationFromEuler(mesh.rotation).elements
    const half = (PANEL_SIZE / 2) * s
    const depth = 0.15 * s

    // Row 1 and row 2 of the rotation matrix (three.js stores column-major).
    const extentY = Math.abs(e[1]) * half + Math.abs(e[5]) * half + Math.abs(e[9]) * depth
    const extentZ = Math.abs(e[2]) * half + Math.abs(e[6]) * half + Math.abs(e[10]) * depth

    const camDist = state.camera.position.z
    const perspective = camDist / Math.max(0.001, camDist - extentZ)
    const reach = extentY * perspective

    // Where the panel's *centre* may sit for its silhouette to stay inside the
    // band. Both ends, not just the top.
    const highest = layout.top - reach
    const lowest = layout.bottom + reach

    return {
      centre: (highest + lowest) / 2,
      // Whatever room is left over is what the panel is allowed to breathe by.
      // When the band is generous this is the full drift and nothing has
      // changed; when it is tight the breathing narrows smoothly to nothing.
      drift: Math.min(DRIFT, Math.max(0, (highest - lowest) / 2)),
    }
  }

  const tooth = useMemo(() => createToothNormalMap(), [])
  const flake = useMemo(() => createFlakeMaps(), [])
  const brushed = useMemo(() => createBrushedNormalMap(), [])
  const film = useMemo(() => createIridescenceThicknessMap(), [])

  const maps = useMemo(
    () => [tooth, flake.normal, flake.roughness, brushed, film],
    [tooth, flake, brushed, film],
  )

  useEffect(() => () => maps.forEach((t) => t.dispose()), [maps])

  // The panel's UVs are only knowable once the geometry exists, so the tiling
  // is applied here rather than where the maps are made.
  useEffect(() => {
    applyTiling(meshRef.current?.geometry, maps)
  }, [maps])

  /*
    Seed the material once, from the live params rather than from three's
    defaults: the frame loop only damps *towards* these, so starting on a
    hardcoded matt grey would show one wrong frame every time the panel appears.

    Mount only, and that is the whole design. Re-seeding whenever the params
    change is exactly what the JSX props were doing wrong — it overwrites the
    damped value with its own destination and turns every dial into a switch.
    The frame loop owns these from here on.
  */
  const seed = useRef(false)
  useEffect(() => {
    const material = materialRef.current
    if (!material || seed.current) return
    seed.current = true
    material.roughness = params.roughness
    material.metalness = params.metalness
    material.clearcoat = params.clearcoat
    material.clearcoatRoughness = params.clearcoatRoughness
    material.ior = params.ior
    material.iridescence = params.iridescence
    material.iridescenceIOR = params.iridescenceIOR
    material.sheen = params.sheen
    material.envMapIntensity = params.envMapIntensity
    material.color.copy(colour)
    material.sheenColor.copy(colour)
  }, [params, colour])

  /*
    Swap the surface with the effect. Changing which maps a material carries
    needs a shader recompile, so this is kept out of the frame loop.

    Keyed on the effect's name, not on its numbers. Reading the finish back out
    of `metalness > 0.6` worked only for as long as nobody retuned metalness —
    and the fix to the flake lacquer does exactly that, taking it to zero.
  */
  useEffect(() => {
    const material = materialRef.current
    if (!material) return

    const glitter = params.effect === 'glitter'
    const metallic = params.effect === 'metallic'

    material.normalMap = glitter ? flake.normal : metallic ? brushed : tooth
    /*
      The flake's tilt may now have its nominal strength: at the old tiling a
      high value bought nothing but aliasing, so it had been held back.

      Held back again on the dark pigments, though, and by the same curve the
      sample card already uses (`glint` in Questions.jsx). A white speck on a
      near-black lacquer is the highest contrast anything here can reach, and at
      full tilt more platelets swing into line with the studio strip until the
      panel stops being a panel and becomes a starfield. The card has carried
      this guard since v3.1; the panel never did.
    */
    const scale = glitter ? 0.9 * (params.flake ?? 1) : metallic ? 0.28 : 0.06
    material.normalScale.set(scale, scale)

    // Only the flake lacquer has two surfaces in it — polished platelets in a
    // binder that stays exactly as matt as the gloss slider left it.
    material.roughnessMap = glitter ? flake.roughness : null

    // Pearl carries a little iridescence too, but as an even inner glow. The
    // varying film belongs to the interference lacquer alone — and each of them
    // keeps its own thickness, because three reads the maximum of this range
    // whenever there is no map and one shared range would retune both at once.
    material.iridescenceThicknessMap = params.effect === 'iridescent' ? film : null
    material.iridescenceThicknessRange = params.film ?? [120, 520]

    material.needsUpdate = true
  }, [params.effect, params.flake, params.film, flake, brushed, tooth, film])

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

    /*
      A slot in the page wins over framing against the viewport.

      On the passport the panel belongs to the document rather than to the
      window: it sits in the sheet, above the values, and scrolls with them.
      Everywhere else there is no slot and the panel frames itself as before.
    */
    const following = followSlot(state)

    // Presence eases the panel in from behind; framing keeps it inside the
    // window and clear of whichever controls the current phase needs.
    const layout = framing(state)
    const away = presence < 0.5 || (slot?.current && !following)
    const target = away ? 0.001 : (following?.scale ?? layout.scale)
    mesh.scale.setScalar(damp(mesh.scale.x, target, 4.5, dt))
    mesh.position.x = damp(mesh.position.x, following?.x ?? 0, 5, dt)
    mesh.position.z = damp(mesh.position.z, away ? -6 : 0, 4, dt)

    /*
      Vertical placement, measured after rotation and scale are final.

      Following a slot, the slot has already reserved its own margins in the
      page, so there is nothing to negotiate — the panel sits where the document
      put it and keeps only enough drift to walk the highlight across the
      surface. It tracks harder than the free-floating case, because a panel
      that lagged behind the page while scrolling would read as detached.

      Free-floating, the band decides. This used to be a hard clamp applied on
      top of the drift: the panel drank up whatever height was going and was
      shoved back down whenever its corners crossed the top edge. That caught
      the drift as well, so on reaching the top it stopped moving and hung there
      dead — and with no matching floor it settled straight through the colour's
      name. Now it is centred between the two limits and breathes by whatever is
      left over, so nothing ever stops it; it simply has less room to move when
      there is less to be had.
    */
    if (following) {
      baseY.current = damp(baseY.current, following.y, 9, dt)
      mesh.position.y = baseY.current + Math.sin(t * 0.42) * DRIFT * 0.4
    } else {
      const { centre, drift } = settle(state, mesh, layout)
      baseY.current = damp(baseY.current, centre, 3.5, dt)
      mesh.position.y = baseY.current + Math.sin(t * 0.42) * drift
    }

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
    material.ior = damp(material.ior, params.ior, 5, dt)
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
        Almost nothing is a prop here, and that is the point.

        Every surface value on this material is either damped in the frame loop
        or set when the effect changes. Passing those same values as JSX props
        as well does not seed them — it fights them. React-three-fiber diffs
        props on every render and writes back anything it considers changed,
        and it considers an object changed whenever the reference changes. A
        prop written as `normalScale={new THREE.Vector2(0.06, 0.06)}` is a new
        object every single render, so it was re-applied on every render: pick
        "Let it catch fire", and the flake's normal scale held for the 620 ms
        until the next phase, then snapped back to the tooth's 0.06 and stayed
        there. By the time the panel appeared in the reveal it had been reset
        three times over. The flake lacquer this whole file exists to render was
        being switched off between the answer and the result — which is a second
        cause of exactly the complaint that started this, alongside the tiling.

        Numbers were quieter about it but no better off: they are compared by
        value, so they are written back precisely when they change, which is
        precisely when the damping was supposed to be doing the work. The
        comment below the frame loop promised a dial and the code delivered a
        switch.

        So the material is declared bare and seeded once, imperatively, on
        mount. The one constant left as a prop is genuinely constant.
      */}
      <meshPhysicalMaterial
        ref={materialRef}
        sheenRoughness={0.55}
        transparent
        opacity={0}
      />
    </RoundedBox>
  )
}
