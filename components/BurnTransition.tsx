"use client";

import { useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { burnControls } from "../lib/burnControls";

/* ─────────────────────────────────────────────────────────────
   BurnTransition — full-viewport R3F burn overlay for the
   About → Contact boundary.

   A single fullscreen quad runs a procedural fragment shader that
   renders ONLY the moving fire line: an fbm-ragged ember band
   (white-hot core → superheated orange → charred-champagne trail)
   sweeping bottom-up as uProgress 0 → 1, with a charred-paper
   dissolve on its burned side. Everything else is fully
   transparent — the real About DOM shows through ahead of the
   front (no shroud pop), and the dead-still (sticky) Contact
   section shows through behind it as a synced clip-path wipe in
   StackTransitions removes the About DOM the fire has passed.

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
  const vec3 WHITE_HOT = vec3(1.000, 0.961, 0.882); // #FFF5E1 core line
  const vec3 ORANGE    = vec3(1.000, 0.353, 0.071); // #FF5A12 superheated
  const vec3 CHAMPAGNE = vec3(0.788, 0.659, 0.463); // #C9A876 outer trailing edge
  const vec3 CHAR      = vec3(0.043, 0.035, 0.027); // charred paper trail

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

    /* mostly-vertical field → a ragged, roughly horizontal burn front
       sweeping bottom-up. The 0.72 vertical bias keeps the front tight
       enough for the DOM clip-wipe (StackTransitions) to ride exactly
       behind it, hidden inside the glow. */
    float field = mix(n, vUv.y, 0.72);

    /* remap progress so the canvas is FULLY TRANSPARENT at 0.0 (no
       pixels lit — no pop) and completely clear again at 1.0 */
    const float EDGE   = 0.12;                   // ember band width (field units)
    const float CHAR_W = 0.10;                   // charred trail width
    float p = mix(-0.15, 1.0 + EDGE, clamp(uProgress, 0.0, 1.0));

    /* signed distance to the front: d > 0 = unburned side (real About
       DOM shows through), d < 0 = burned side (Contact shows through) */
    float d = field - p;

    /* living flicker on the hot core */
    float flick = 0.8 + 0.2 * noise(vec2(st.x * 6.0 + uTime * 2.0, uTime * 4.0));

    vec3 col;
    float alpha;
    if (d >= 0.0) {
      /* ── ember band on the unburned side: white-hot core line →
            superheated orange → charred-champagne outer trailing edge,
            fading to fully transparent so unburned About stays visible ── */
      float t = clamp(d / EDGE, 0.0, 1.0);
      col = mix(WHITE_HOT, ORANGE, smoothstep(0.05, 0.45, t));
      col = mix(col, CHAMPAGNE, smoothstep(0.45, 0.90, t));
      alpha = 1.0 - smoothstep(0.20, 1.0, t);
    } else {
      /* ── charred trail on the burned side: the paper blackens, then
            dissolves to transparent, cleanly revealing Contact ── */
      float u = clamp(-d / CHAR_W, 0.0, 1.0);
      col = mix(WHITE_HOT, ORANGE, smoothstep(0.0, 0.25, u));
      col = mix(col, CHAR, smoothstep(0.20, 0.70, u));
      alpha = 1.0 - smoothstep(0.45, 1.0, u);
    }

    /* white-hot bloom pulsing right on the front line */
    float core = max(1.0 - abs(d) / (EDGE * 0.5), 0.0);
    col += WHITE_HOT * pow(core, 3.0) * (0.4 + 0.4 * flick);

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
    /* eslint-disable react-hooks/immutability -- in-place uniform writes
       are the canonical R3F per-frame pattern (no allocation, no React
       work). The "immutable" alternative — passing `uniforms` as a JSX
       prop — leaves the GPU bound to DIFFERENT uniform instances and
       shipped as the invisible-canvas bug this file fixes. */
    material.uniforms.uProgress.value = burnControls.getProgress();
    material.uniforms.uActive.value = active ? 1 : 0;
    material.uniforms.uTime.value = state.clock.elapsedTime;
    /* eslint-enable react-hooks/immutability */
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
