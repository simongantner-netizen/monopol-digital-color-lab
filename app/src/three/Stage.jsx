import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import DottedField from './DottedField'
import Specimen from './Specimen'

/**
 * One canvas for the whole experience.
 *
 * The field and the sample panel share a single WebGL context that is never
 * unmounted — phases fade elements in and out instead. Remounting the canvas
 * between screens would cost a context rebuild and break the illusion that
 * you are in one continuous room the whole time.
 */

/**
 * A small studio, built from emissive planes.
 *
 * Environment presets would pull an HDRI off a CDN; these lightformers give a
 * comparable studio reflection with nothing to download, and they are shaped
 * deliberately for the shot we actually have.
 *
 * The key placements sit BEHIND the camera (positive z, camera is at z 13).
 * A panel facing the lens reflects what is behind the lens — lights in front
 * of the subject illuminate it but never appear in it, which is exactly how
 * the first attempt ended up looking like flat coloured card. This is the
 * standard product-photography softbox position, for the same reason.
 *
 * Lightformers aim at the origin by default, so no rotations are needed.
 */
function Studio() {
  return (
    <Environment resolution={256} frames={1} background={false}>
      <color attach="background" args={['#050607']} />

      {/*
        The softbox you see reflected in a gloss finish.

        Big and bright at once is what blew out the high-gloss panel: roughness
        can scatter a reflection but it cannot make an area light dimmer, so at
        maximum gloss the panel handed this emitter straight back and, once the
        pointer tilted it into line, the highlight covered most of its face.
        Larger and dimmer keeps the soft studio falloff — a bigger source
        wrapping further around the edges — without the blow-out.
      */}
      <Lightformer
        form="rect"
        intensity={1.5}
        position={[-5, 5.5, 9]}
        scale={[15, 13, 1]}
      />

      {/* Narrow strip — the crisp highlight that separates gloss from satin. */}
      <Lightformer
        form="rect"
        intensity={8}
        position={[6.5, 1.5, 8]}
        scale={[1.4, 9, 1]}
      />

      {/* Second, dimmer strip low left, so tilting the panel finds a new edge. */}
      <Lightformer
        form="rect"
        intensity={3.2}
        position={[-6, -4, 7]}
        scale={[0.9, 7, 1]}
      />

      {/* Broad top light for the matt finishes, which show gradient not mirror. */}
      <Lightformer form="rect" intensity={2.2} position={[0, 8, 1]} scale={[12, 6, 1]} />

      {/* Cool rim from behind, separating the panel from the dark field. */}
      <Lightformer
        form="circle"
        intensity={2.6}
        color="#b8ccff"
        position={[2, 3, -8]}
        scale={[7, 7, 1]}
      />

      {/* Warm bounce from below — keeps the shadow side from going dead. */}
      <Lightformer
        form="rect"
        intensity={1.1}
        color="#ffd4a6"
        position={[0, -6, 5]}
        scale={[10, 5, 1]}
      />
    </Environment>
  )
}

export default function Stage({
  hex,
  fieldHex,
  energy,
  bloom,
  density,
  specimenParams,
  specimenPresence,
  specimenHeight = 0.44,
  specimenReserve = 460,
  specimenReserveFraction = 0,
  fieldOpacity,
}) {
  // Two THREE.Color instances, mutated in place — allocating colours per frame
  // in the render loop would churn the GC for no reason.
  const colour = useMemo(() => new THREE.Color(), [])
  const fieldColour = useMemo(() => new THREE.Color(), [])
  colour.set(hex)
  fieldColour.set(fieldHex ?? hex)

  return (
    <Canvas
      className="!fixed inset-0"
      style={{ zIndex: 0 }}
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        // Khronos PBR Neutral: built to keep saturated colours faithful under
        // tone mapping. ACES would quietly desaturate the highlights, which is
        // unacceptable when the colour itself is the product.
        toneMapping: THREE.NeutralToneMapping,
      }}
      camera={{ position: [0, 0.6, 13], fov: 32, near: 0.1, far: 120 }}
    >
      <Suspense fallback={null}>
        <Studio />
        <DottedField
          colour={fieldColour}
          energy={energy}
          bloom={bloom}
          density={density}
          opacity={fieldOpacity}
        />
        <Specimen
          params={specimenParams}
          colour={colour}
          presence={specimenPresence}
          heightFraction={specimenHeight}
          reservePx={specimenReserve}
          reserveFraction={specimenReserveFraction}
        />
      </Suspense>
    </Canvas>
  )
}
