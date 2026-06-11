"use client";

import { useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { burnControls } from "../lib/burnControls";

/* ─────────────────────────────────────────────────────────────
   BurnTransition — full-viewport R3F burn overlay for the
   About → Contact boundary.

   A single fullscreen quad runs a procedural fragment shader: an
   obsidian-ink shroud that an fbm "burn front" eats away from the
   bottom up as uProgress 0 → 1, leaving a white-hot → orange →
   charred-champagne ember edge and punching fully-transparent
   holes through to the dead-still (sticky) Contact section beneath.

   Uniforms
     · uProgress   — GSAP scrub, 0 → 1 (how much has burned)
     · uTime       — useFrame clock, drives the living flicker
     · uResolution — viewport px, keeps the noise aspect-uniform
     · uActive     — boundary gate (0 ⇒ fully transparent + idle)

   The canvas stays MOUNTED for the page lifetime on
   frameloop="demand": idle (no renders) when uActive is 0, and
   self-sustaining at 60fps while the burn is active so the flame
   keeps flickering even when the scroll is held still. The GSAP
   scrub also pokes invalidate() on every micro-delta.
   ───────────────────────────────────────────────────────────── */

/* Fullscreen-quad vertex shader: the plane spans clip space [-1,1]
   directly (no camera math); it just forwards uv to the fragment. */
const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform float uProgress;
  uniform float uTime;
  uniform float uActive;
  uniform vec2  uResolution;

  /* ── colour ramp ── */
  const vec3 WHITE_HOT = vec3(1.000, 0.961, 0.882); // #FFF5E1 core
  const vec3 ORANGE    = vec3(1.000, 0.353, 0.071); // #FF5A12 superheated
  const vec3 CHAMPAGNE = vec3(0.788, 0.659, 0.463); // #C9A876 charred trail
  const vec3 OBSIDIAN  = vec3(0.071, 0.086, 0.075); // #121613 ink shroud

  /* ── 2D value-noise → fbm ── */
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);          // smootherstep interp
    float a = hash(i + vec2(0.0, 0.0));
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);  // rotate each octave to break grid
    for (int i = 0; i < 5; i++) {
      v += amp * noise(p);
      p = rot * p * 2.0;
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    /* aspect-correct sample coords so the flame never stretches */
    vec2 st = vUv;
    st.x *= uResolution.x / uResolution.y;
    st *= 3.0;                                   // feature scale

    /* domain-warped fbm + upward drift → a living, flickering fire */
    vec2 warp = vec2(
      fbm(st + vec2(0.0, uTime * 0.15)),
      fbm(st + vec2(5.2, 1.3) - uTime * 0.12)
    );
    float n = fbm(st + warp * 0.6 + vec2(0.0, -uTime * 0.08));

    /* combine structured noise with a vertical gradient so the burn
       front organically creeps from the bottom (uv.y 0) upward */
    float field = mix(n, vUv.y, 0.42);

    /* remap progress to [-0.15, 1.0 + edge] so the shroud is whole at
       0.0 and completely gone (edges included) at 1.0 */
    const float EDGE = 0.12;                     // ember band width
    float p = mix(-0.15, 1.0 + EDGE, clamp(uProgress, 0.0, 1.0));

    /* alpha: burned (field < p) punches through to the DOM; a hair of
       softness on the cut keeps the front from aliasing */
    float alpha = smoothstep(p - 0.012, p, field);

    /* ember band: 0 at the burning front (hottest) → 1 into the shroud */
    float edge = smoothstep(p, p + EDGE, field);

    /* white-hot → orange → champagne → obsidian across the band */
    vec3 col = mix(WHITE_HOT, ORANGE, smoothstep(0.0, 0.45, edge));
    col = mix(col, CHAMPAGNE, smoothstep(0.40, 0.80, edge));
    col = mix(col, OBSIDIAN, smoothstep(0.80, 1.0, edge));

    /* extra white-hot bloom right at the leading edge */
    float heat = 1.0 - edge;
    col += WHITE_HOT * pow(heat, 3.0) * 0.6;

    /* subtle charred texture in the body of the shroud */
    col = mix(col, col * (0.82 + 0.18 * n), smoothstep(0.85, 1.0, edge));

    gl_FragColor = vec4(col, alpha * uActive);
  }
`;

function BurnPlane() {
  const invalidate = useThree((s) => s.invalidate);
  const size = useThree((s) => s.size);

  // The material is constructed imperatively so the uniform objects we
  // mutate in useFrame are the EXACT objects THREE binds to the program.
  // (Passing `uniforms` as a JSX prop on <shaderMaterial> left the GPU
  // bound to different uniform instances — JS values updated, GLSL
  // forever read 0, and the overlay rendered permanently transparent.)
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          uProgress: { value: 0 },
          uActive: { value: 0 },
          uTime: { value: 0 },
          uResolution: { value: new THREE.Vector2(1, 1) },
        },
        transparent: true,
        depthTest: false,
        depthWrite: false,
      }),
    []
  );

  useEffect(() => () => material.dispose(), [material]);

  // Expose R3F's invalidate() to the GSAP scrub and paint once on mount.
  useEffect(() => {
    burnControls.setInvalidate(invalidate);
    invalidate();
    return () => burnControls.setInvalidate(null);
  }, [invalidate]);

  // Keep the noise aspect-uniform; repaint when the viewport resizes.
  useEffect(() => {
    material.uniforms.uResolution.value.set(size.width, size.height);
    invalidate();
  }, [size, invalidate, material]);

  useFrame((state) => {
    const active = burnControls.getActive();
    material.uniforms.uProgress.value = burnControls.getProgress();
    material.uniforms.uActive.value = active ? 1 : 0;
    material.uniforms.uTime.value = state.clock.elapsedTime;
    // While the burn is live, self-sustain the demand loop so the flame
    // keeps flickering even when the scroll is held perfectly still.
    if (active) invalidate();
  });

  return (
    <mesh frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

export default function BurnTransition() {
  return (
    <Canvas
      className="burn-fx"
      style={{ position: "fixed", inset: 0, zIndex: 60, pointerEvents: "none" }}
      frameloop="demand"
      gl={{ alpha: true, antialias: false }}
      onCreated={({ gl }) => gl.setClearAlpha(0)}
    >
      <BurnPlane />
    </Canvas>
  );
}
