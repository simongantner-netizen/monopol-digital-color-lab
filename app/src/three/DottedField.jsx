import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * The field.
 *
 * A grid of points on a slow standing wave — the room the whole experience
 * takes place in. It starts near-monochrome and takes on the colour as the
 * answers come in, so the space itself is the progress bar.
 *
 * The wave is computed in the vertex shader rather than on the CPU: 22k points
 * updated per frame in JS would cost a buffer upload every frame, and this
 * needs to stay smooth while React is animating the UI on top of it.
 */

const COLS = 168

/**
 * Twice the rows at half the depth spacing: the field covers exactly the same
 * ground as before, drawn with twice as many lines through it.
 *
 * Every second row is marked as an in-between line and stays invisible until
 * the colour arrives, when `density` fades it in. Doing it this way rather
 * than rebuilding the geometry per phase means one buffer, uploaded once, and
 * the change is a fade rather than a pop.
 */
const ROWS = 220
const SPACING = 0.44
const ROW_SPACING = SPACING / 2

const vertexShader = /* glsl */ `
  // uEnergy and uBloom are read in both stages, so their precision is pinned
  // explicitly — three defaults vertex to highp and fragment to mediump, and a
  // mismatched shared uniform fails program validation.
  uniform highp float uTime;
  uniform highp float uEnergy;   // 0..1 — how far through the questions we are
  uniform highp float uBloom;    // 0..1 — the reveal surge
  uniform highp vec3  uPointer;  // pointer projected onto the field plane
  uniform highp float uSize;

  attribute float aRand;
  attribute float aInfill;   // 1 on the lines that only appear with the colour

  varying float vLift;
  varying float vRand;
  varying float vRadial;
  varying float vInfill;

  void main() {
    vec3 pos = position;

    // Two crossing waves at incommensurate frequencies never repeat visibly.
    float w1 = sin(pos.x * 0.19 + uTime * 0.42);
    float w2 = cos(pos.z * 0.145 - uTime * 0.31);
    float wave = w1 * w2;

    // Distance from centre, used to swell the field outward on reveal.
    float radial = length(pos.xz) / 34.0;
    vRadial = radial;

    // A ring travelling out from the middle when the colour is revealed.
    float ripple = sin(radial * 9.0 - uTime * 1.6) * uBloom;

    float lift = wave * (1.1 + uEnergy * 1.5) + ripple * 1.4;

    // The pointer pushes the surface up locally — the field notices you.
    float d = distance(pos.xz, uPointer.xz);
    lift += exp(-d * d * 0.012) * 2.6;

    pos.y += lift;
    vLift = lift;
    vRand = aRand;
    vInfill = aInfill;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    // Perspective-correct point size, with the crests drawn slightly larger.
    // Capped: points that drift close to the camera would otherwise blow up
    // into bokeh discs and read as dirt on the lens rather than as a field.
    float crest = 0.72 + smoothstep(-1.6, 2.2, lift) * 0.75;
    gl_PointSize = min(uSize * crest * (34.0 / -mv.z) * (0.7 + aRand * 0.6), 7.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform highp vec3  uColour;
  uniform highp vec3  uBase;
  uniform highp float uEnergy;
  uniform highp float uBloom;
  uniform highp float uOpacity;
  uniform highp float uDensity;  // 0 the original field, 1 every line lit

  varying float vLift;
  varying float vRand;
  varying float vRadial;
  varying float vInfill;

  void main() {
    // Round, soft-edged points. Square dots read as "debug render".
    vec2 uv = gl_PointCoord - 0.5;
    float d = dot(uv, uv);
    if (d > 0.25) discard;
    float alpha = smoothstep(0.25, 0.02, d);

    // Crests take the colour first; troughs stay in the dark. As energy rises
    // the colour floods down into the troughs too.
    float exposure = smoothstep(-1.8, 2.0, vLift);
    float tint = clamp(exposure * (0.35 + uEnergy * 0.9) + uBloom * 0.8, 0.0, 1.0);

    vec3 colour = mix(uBase, uColour, tint);

    // Slight lift on the crests so the wave has specular-ish highlights.
    colour += vec3(exposure * 0.14 * (0.4 + uEnergy));

    float fade = 1.0 - smoothstep(0.42, 1.05, vRadial);
    float a = alpha * uOpacity * (0.3 + exposure * 0.9) * fade * (0.55 + vRand * 0.6);

    // The in-between lines are held back until the colour exists, and even then
    // sit a little under the original ones — the field gets denser without the
    // rows losing the reading that there are rows.
    a *= mix(1.0, uDensity * 0.82, vInfill);

    gl_FragColor = vec4(colour, a);
  }
`

export default function DottedField({
  colour,
  energy = 0,
  bloom = 0,
  opacity = 1,
  density = 0,
}) {
  const materialRef = useRef()
  const pointerTarget = useRef(new THREE.Vector3(0, 0, 60))

  const geometry = useMemo(() => {
    const positions = new Float32Array(COLS * ROWS * 3)
    const rands = new Float32Array(COLS * ROWS)
    const infill = new Float32Array(COLS * ROWS)
    let i = 0
    for (let ix = 0; ix < COLS; ix++) {
      for (let iz = 0; iz < ROWS; iz++) {
        positions[i * 3] = (ix - COLS / 2) * SPACING
        positions[i * 3 + 1] = 0
        positions[i * 3 + 2] = (iz - ROWS / 2) * ROW_SPACING
        rands[i] = Math.random()
        // Every other row is the new line between two old ones.
        infill[i] = iz % 2
        i++
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aRand', new THREE.BufferAttribute(rands, 1))
    geo.setAttribute('aInfill', new THREE.BufferAttribute(infill, 1))
    return geo
  }, [])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uEnergy: { value: 0 },
      uBloom: { value: 0 },
      uOpacity: { value: 1 },
      uDensity: { value: 0 },
      uSize: { value: 3.4 },
      uPointer: { value: new THREE.Vector3(0, 0, 60) },
      uColour: { value: new THREE.Color('#6b6f74') },
      uBase: { value: new THREE.Color('#333b45') },
    }),
    [],
  )

  useFrame((state, delta) => {
    const u = materialRef.current?.uniforms
    if (!u) return

    const dt = Math.min(delta, 0.05)
    u.uTime.value += dt

    // Everything eases rather than snaps — no value on this field is allowed
    // to change in a single frame.
    const ease = (uniform, target, speed) => {
      uniform.value += (target - uniform.value) * Math.min(1, dt * speed)
    }
    ease(u.uEnergy, energy, 1.6)
    ease(u.uBloom, bloom, 2.2)
    ease(u.uOpacity, opacity, 3)
    // Slower than the rest on purpose: the extra lines should be found rather
    // than switched on, arriving over a couple of seconds while the name lands.
    ease(u.uDensity, density, 0.9)

    u.uColour.value.lerp(colour, Math.min(1, dt * 2.4))

    // Pointer in normalised coords → a point on the field plane.
    const { x, y } = state.pointer
    pointerTarget.current.set(x * 26, 0, -y * 20 + 4)
    u.uPointer.value.lerp(pointerTarget.current, Math.min(1, dt * 3.5))
  })

  // Tilted rather than flat: at this camera height a level plane compresses
  // into a thin horizon band. Raising the far edge turns it into a room.
  return (
    <points
      geometry={geometry}
      frustumCulled={false}
      position={[0, -2.6, 6]}
      rotation={[-0.2, 0, 0]}
    >
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
