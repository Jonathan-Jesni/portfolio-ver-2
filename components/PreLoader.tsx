"use client";

import * as React from "react";
import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import { shaderMaterial, useProgress } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { getLenis } from "../lib/lenisInstance";

/* ================================================================
   PreLoader — "Liquid Obsidian" honest-manifest burn loader

   ┌──────────────────────────────────────────────────────────────┐
   │ LOAD-BEARING ARCHITECTURAL ASSUMPTION — DO NOT BREAK         │
   │                                                              │
   │ useProgress reads THREE.DefaultLoadingManager, which is      │
   │ GLOBAL, not per-Canvas. This loader only sees the heavy      │
   │ assets (hardware_laptop.glb + screen/keyboard textures)      │
   │ because the main 3D scene (InteractiveModel) mounts          │
   │ CONCURRENTLY as a sibling underneath this overlay in         │
   │ app/page.tsx, loading via useGLTF/useTexture into that same  │
   │ global manager.                                              │
   │                                                              │
   │ If the 3D scene is ever lazy-mounted AFTER the preloader     │
   │ finishes, useProgress sees nothing, the manifest stays       │
   │ empty, and this component degrades to gating on time alone   │
   │ — covered by the FAILSAFE_MS ceiling below, but the honest   │
   │ manifest is lost. Keep the scene mounting concurrent.        │
   └──────────────────────────────────────────────────────────────┘

   Burn implementation decision: STANDALONE shader, deliberately
   NOT shared with components/BurnTransition.tsx. That effect is a
   directional fire *line* (bottom→up, ~99% transparent, scroll-
   scrub driven via the burnControls singleton); this one is a
   radial *hole* opening center→out on a fully opaque liquid-metal
   field, driven by a one-shot GSAP tween. A shared multi-mode
   shader would be more complexity, not less. For visual DNA, the
   hash/noise/fbm GLSL helpers and the hot-rim color ramp
   (WHITE_HOT / ORANGE / CHAMPAGNE / CHAR) are lifted verbatim
   from BurnTransition.tsx so the burn edge reads as the same fire.
   ================================================================ */

/* ── Timing constants ── */
const FLOOR_MS = 1800;      // minimum display time — prevents fast-connection flash
const FAILSAFE_MS = 9000;   // hard ceiling — forces exit if assets stall/404/never register
const PRINT_INTERVAL_MS = 90; // terminal print cadence (legible even on gigabit)
const BURN_DURATION_S = 1.5;
const HERO_HANDOFF_AT = 0.4; // fire onComplete at 40% of the burn (curtain-midpoint parity)
const READY_LINE = "> SYSTEM READY. [OK]";

/* ── Fullscreen-quad vertex shader: plane spans clip space directly ── */
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

  uniform float uTime;          // pre-integrated churn clock (CPU-side speed lerp)
  uniform float uSpeed;         // 0→1 load progress, lerped — drives churn violence
  uniform float uBurnProgress;  // 0→1 GSAP exit tween — radial burn mask
  uniform vec2  uResolution;

  /* ── liquid obsidian field palette ── */
  const vec3 OBSIDIAN = vec3(0.039, 0.039, 0.039); // #0a0a0a
  const vec3 GUNMETAL = vec3(0.102, 0.110, 0.118); // #1a1c1e
  const vec3 SHEEN    = vec3(0.941, 0.910, 0.824); // faint cream specular glint

  /* ── hot-rim ramp — lifted verbatim from BurnTransition.tsx ── */
  const vec3 WHITE_HOT = vec3(1.000, 0.961, 0.882); // #FFF5E1
  const vec3 ORANGE    = vec3(1.000, 0.353, 0.071); // #FF5A12
  const vec3 CHAMPAGNE = vec3(0.788, 0.659, 0.463); // #C9A876
  const vec3 CHAR      = vec3(0.043, 0.035, 0.027);

  /* ── 2D value-noise → fbm — lifted verbatim from BurnTransition.tsx ── */
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i + vec2(0.0, 0.0));
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < 5; i++) {
      v += amp * noise(p);
      p = rot * p * 2.0;
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    /* aspect-correct coords so the fluid never stretches */
    float aspect = uResolution.x / uResolution.y;
    vec2 st = vec2(vUv.x * aspect, vUv.y);
    vec2 p = st * 3.0;

    /* ── the churning liquid: domain-warped fbm. uSpeed widens the
          warp so the metal visibly boils harder as load nears 100% ── */
    vec2 warp = vec2(
      fbm(p + vec2(0.0, uTime * 0.18)),
      fbm(p + vec2(5.2, 1.3) - uTime * 0.15)
    );
    float churn = fbm(p + warp * (0.8 + uSpeed * 1.1) + vec2(0.0, -uTime * 0.10));

    vec3 col = mix(OBSIDIAN, GUNMETAL, smoothstep(0.30, 0.78, churn));

    /* thin liquid-metal glints riding the warp crests */
    float glint = pow(smoothstep(0.62, 0.95, fbm(p * 1.7 - warp + vec2(uTime * 0.06, 0.0))), 3.0);
    col += SHEEN * glint * (0.035 + uSpeed * 0.055);

    /* soft vignette for depth */
    float vig = smoothstep(1.15, 0.35, length(vUv - 0.5) * 1.6);
    col *= mix(0.82, 1.0, vig);

    /* ── radial burn-through mask, center → out ──
       front is the burn radius in aspect-corrected units; the fbm
       raggedness keeps the hole organic, never a clean circle. */
    vec2 center = vec2(0.5 * aspect, 0.5);
    float dist = length(st - center);
    float maxR = length(center);              // reaches the corners
    float ragged = (fbm(p * 1.5 + warp) - 0.5) * 0.22;

    const float RIM = 0.16;                   // charred-rim band width
    float front = mix(-RIM * 1.5, maxR + RIM * 2.0, clamp(uBurnProgress, 0.0, 1.0));
    float d = front - (dist + ragged);        // d > 0 ⇒ burned side (inside the hole)

    if (d > RIM) discard;                     // fully burned — page shows through

    if (d > 0.0) {
      /* charred rim just inside the hole: white-hot front edge →
         superheated orange → char, dissolving to transparent */
      float u = d / RIM;
      vec3 rim = mix(WHITE_HOT, ORANGE, smoothstep(0.0, 0.30, u));
      rim = mix(rim, CHAMPAGNE, smoothstep(0.25, 0.50, u));
      rim = mix(rim, CHAR, smoothstep(0.45, 0.85, u));
      float fade = 1.0 - smoothstep(0.55, 1.0, u);
      gl_FragColor = vec4(rim, fade);
      return;
    }

    /* pre-heat glow on the unburned side, hugging the front */
    float heat = max(1.0 - (-d) / (RIM * 0.9), 0.0);
    col = mix(col, ORANGE, pow(heat, 2.2) * 0.7);
    col += WHITE_HOT * pow(heat, 5.0) * 0.6;

    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ── Material defined OUTSIDE the component (drei shaderMaterial →
      auto uniform setters; safe to mutate via ref in useFrame) ── */
const LiquidObsidianMaterial = shaderMaterial(
  {
    uTime: 0,
    uSpeed: 0,
    uBurnProgress: 0,
    uResolution: new THREE.Vector2(1, 1),
  },
  VERTEX,
  FRAGMENT
);
extend({ LiquidObsidianMaterial });

type LiquidObsidianMaterialImpl = THREE.ShaderMaterial & {
  uTime: number;
  uSpeed: number;
  uBurnProgress: number;
  uResolution: THREE.Vector2;
};

declare module "@react-three/fiber" {
  interface ThreeElements {
    liquidObsidianMaterial: React.PropsWithChildren<{
      ref?: React.Ref<LiquidObsidianMaterialImpl>;
      key?: string;
      transparent?: boolean;
      depthWrite?: boolean;
      depthTest?: boolean;
    }>;
  }
}

/* ── Mutable FX bridge: GSAP tweens this plain object on the React
      side; the plane copies it into uniforms each frame. Keeps GSAP
      out of THREE internals and survives re-renders. ── */
interface FxState {
  burnProgress: number;
  speedTarget: number;
}

function ObsidianPlane({ fx }: { fx: React.RefObject<FxState> }) {
  const matRef = useRef<LiquidObsidianMaterialImpl>(null);
  const size = useThree((s) => s.size);
  const churnTimeRef = useRef(0);
  const speedRef = useRef(0);

  useEffect(() => {
    if (matRef.current) matRef.current.uResolution.set(size.width, size.height);
  }, [size]);

  useFrame((_, delta) => {
    const mat = matRef.current;
    if (!mat) return;

    /* Clamp delta: GLB parse / texture upload can stall the main
       thread for 100ms+; an unclamped delta telescopes that stall
       into a single huge time jump and the liquid visibly glitches.
       Capped at ~30fps the worst case is a brief, smooth slowdown. */
    const safeDelta = Math.min(delta, 0.033);

    /* LERP uSpeed toward the progress-mapped target — progress
       arrives in jumps (0 → 34 → 100); hard-assigning would make
       the churn stutter. */
    const target = fx.current.speedTarget;
    speedRef.current += (target - speedRef.current) * Math.min(1, safeDelta * 3);

    /* integrate the clock on the CPU so a changing speed never
       causes a time-jump artifact (uTime * speed would snap) */
    churnTimeRef.current += safeDelta * (0.45 + speedRef.current * 2.2);

    mat.uTime = churnTimeRef.current;
    mat.uSpeed = speedRef.current;
    mat.uBurnProgress = fx.current.burnProgress;
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <liquidObsidianMaterial
        ref={matRef}
        key={(LiquidObsidianMaterial as unknown as { key: string }).key}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ── Manifest helpers ── */
function shortName(url: string): string {
  /* GLTFLoader registers its internal buffers/images as blob: URLs —
     real assets, but a full UUID is noise. Show a short blob id. */
  if (url.startsWith("blob:")) {
    const id = url.split("/").pop() ?? "";
    return `BLOB ${id.slice(0, 8)}`;
  }
  const clean = url.split("?")[0].split("#")[0];
  const segments = clean.split("/").filter(Boolean);
  const name = segments.length > 0 ? segments[segments.length - 1] : clean;
  return name.length > 36 ? `…${name.slice(-35)}` : name;
}

interface PreLoaderProps {
  onComplete: () => void;
}

export default function PreLoader({ onComplete }: PreLoaderProps) {
  const [lines, setLines] = useState<string[]>(["> INIT RENDER PIPELINE ..."]);
  const [floorPassed, setFloorPassed] = useState(false);
  const [readyPrinted, setReadyPrinted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const terminalRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  const fxRef = useRef<FxState>({ burnProgress: 0, speedTarget: 0 });
  const manifestQueueRef = useRef<string[]>([]);
  const seenUrlsRef = useRef<Set<string>>(new Set());
  const assetsDoneRef = useRef(false);
  const readyInjectedRef = useRef(false);
  const burnStartedRef = useRef(false);
  const handoffCallRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  /* ── Scroll lock — keyed to isComplete, NOT unmount. The component
        never truly unmounts (page.tsx renders it unconditionally and
        `return null` keeps the fiber alive), so unmount-tied cleanups
        would hold the page scroll-locked forever. With [isComplete]:
        mount locks; when isComplete flips true the cleanup releases,
        and the re-run bails before re-locking. The lock therefore
        survives the 40% hero handoff and releases exactly when the
        burn finishes and the overlay leaves the DOM. Applied in the
        reduced-motion path too (it completes in ~400ms, but the
        static overlay shouldn't scroll either).

        Two layers, on purpose:
        - overflow:hidden hides the scrollbar and blocks native scroll
          even if Lenis hasn't initialized yet;
        - lenis.stop() keeps Lenis from integrating wheel velocity in
          the background and "kicking" the page when the lock lifts.
          (Null-guarded: if Lenis isn't up yet, overflow already has
          scroll blocked — no retry needed.) ── */
  useEffect(() => {
    if (isComplete) return;
    document.documentElement.style.overflow = "hidden";
    getLenis()?.stop();
    return () => {
      document.documentElement.style.overflow = "";
      getLenis()?.start();
    };
  }, [isComplete]);

  /* Component is mounted ssr:false, so window exists at first render */
  const prefersReduced = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  /* ── Gate condition A: assets fully loaded. loaded > 0 guards the
        nothing-ever-registered case (degraded mode per the header
        comment) — there the failsafe ceiling is the only exit. ── */
  const { progress, loaded } = useProgress();
  const assetsDone = progress >= 100 && loaded > 0;

  useEffect(() => {
    assetsDoneRef.current = assetsDone;
  }, [assetsDone]);

  /* Map real progress onto the shader's churn-violence target */
  useEffect(() => {
    fxRef.current.speedTarget = Math.min(progress / 100, 1);
  }, [progress]);

  /* ── Reduced motion: no shader, no burn — static overlay, near-
        immediate handoff and unmount (parity with the old loader) ── */
  useEffect(() => {
    if (!prefersReduced) return;
    const t = setTimeout(() => {
      onCompleteRef.current();
      setIsComplete(true);
    }, 400);
    return () => clearTimeout(t);
  }, [prefersReduced]);

  /* ── Honest manifest capture: CHAIN onto the global manager's
        onProgress (fired per itemEnd, i.e. per completed asset).
        drei's useProgress assigned these handlers at module load —
        we must wrap, never replace, or its store goes dead. URLs are
        deduped and queued; useProgress().item is NOT used because it
        only surfaces the current item per render and drops URLs when
        many assets resolve between renders. ── */
  useEffect(() => {
    /* isComplete-keyed (not unmount-keyed): the component renders null
       after completion but never unmounts, so the wrap must be
       restored when the loader finishes, not at fiber teardown. */
    if (prefersReduced || isComplete) return;
    const manager = THREE.DefaultLoadingManager;
    const prevOnProgress = manager.onProgress;

    manager.onProgress = (url: string, itemsLoaded: number, itemsTotal: number) => {
      prevOnProgress?.call(manager, url, itemsLoaded, itemsTotal);
      if (!seenUrlsRef.current.has(url)) {
        seenUrlsRef.current.add(url);
        manifestQueueRef.current.push(url);
      }
    };

    return () => {
      manager.onProgress = prevOnProgress;
    };
  }, [prefersReduced, isComplete]);

  /* ── The exit. Idempotent: gate and failsafe can both call it. ── */
  const startBurn = useCallback(() => {
    if (burnStartedRef.current) return;
    burnStartedRef.current = true;

    /* failsafe path may arrive before READY printed — snap it in */
    if (!readyInjectedRef.current) {
      readyInjectedRef.current = true;
      setLines((ls) => [...ls, READY_LINE]);
    }

    gsap.to(fxRef.current, {
      burnProgress: 1,
      duration: BURN_DURATION_S,
      ease: "power2.inOut",
      onComplete: () => setIsComplete(true), // unmount → frees this GL context
    });

    if (terminalRef.current) {
      gsap.to(terminalRef.current, {
        opacity: 0,
        duration: 0.45,
        ease: "power2.out",
        delay: 0.25,
      });
    }

    /* Hero handoff mid-burn: the page underneath is NOT statically
       waiting — HeroSection animates in on this signal, so it must
       fire as the hole opens (≈40%), not before or after. */
    handoffCallRef.current = gsap.delayedCall(
      BURN_DURATION_S * HERO_HANDOFF_AT,
      () => onCompleteRef.current()
    );
  }, []);

  /* ── Gate condition B (1800ms floor) + the failsafe ceiling.
        isComplete-keyed so the (already-guarded) ceiling timer is
        cleared once the loader finishes. ── */
  useEffect(() => {
    if (prefersReduced || isComplete) return;
    const floor = setTimeout(() => setFloorPassed(true), FLOOR_MS);
    const ceiling = setTimeout(() => startBurn(), FAILSAFE_MS);
    return () => {
      clearTimeout(floor);
      clearTimeout(ceiling);
    };
  }, [prefersReduced, startBurn, isComplete]);

  /* ── Print queue drain: one line per tick keeps the terminal
        legible even when 50 assets resolve in 50ms. Once drained AND
        assets are done (condition C), inject SYSTEM READY exactly
        once. ── */
  useEffect(() => {
    /* isComplete-keyed so the interval stops once the loader is done
       (the component renders null but never unmounts) */
    if (prefersReduced || isComplete) return;
    const id = setInterval(() => {
      const queue = manifestQueueRef.current;
      if (queue.length > 0) {
        const url = queue.shift()!;
        setLines((ls) => [...ls.slice(-39), `> FETCHING: ${shortName(url)} ... [OK]`]);
      } else if (assetsDoneRef.current && !readyInjectedRef.current) {
        readyInjectedRef.current = true;
        setLines((ls) => [...ls.slice(-39), READY_LINE]);
        setReadyPrinted(true);
      }
    }, PRINT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [prefersReduced, isComplete]);

  /* ── The logic gate: A is folded into C (READY only prints once
        assetsDone && queue drained), so burn ⇐ B && C. ── */
  useEffect(() => {
    if (floorPassed && readyPrinted) startBurn();
  }, [floorPassed, readyPrinted, startBurn]);

  /* Kill in-flight tweens if we unmount mid-burn */
  useEffect(() => {
    const fx = fxRef.current;
    return () => {
      gsap.killTweensOf(fx);
      handoffCallRef.current?.kill();
    };
  }, []);

  if (isComplete) return null;

  if (prefersReduced) {
    return (
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          backgroundColor: "#0a0a0a",
          pointerEvents: "none",
        }}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      id="preloader-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* ── WebGL layer: alpha canvas + discard reveals the page DOM
            beneath as the burn opens. Two GL contexts are live during
            load (this + the main scene); unmounting this component is
            what reclaims the memory. ── */}
      <Canvas
        dpr={[1, 1]}
        gl={{ alpha: true, antialias: false }}
        style={{ position: "absolute", inset: 0 }}
        onCreated={({ gl }) => {
          gl.setClearAlpha(0);
          setLines((ls) => [...ls, "> WEBGL CONTEXT ACQUIRED [OK]"]);
        }}
      >
        <ObsidianPlane fx={fxRef} />
      </Canvas>

      {/* ── DOM terminal manifest — bottom-left, plain mono, capped ── */}
      <div
        ref={terminalRef}
        style={{
          position: "absolute",
          left: "24px",
          bottom: "24px",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          gap: "3px",
          maxWidth: "min(80vw, 560px)",
          fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace",
          fontSize: "12px",
          lineHeight: 1.5,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "rgba(226, 226, 226, 0.7)",
          whiteSpace: "nowrap",
        }}
      >
        {lines.slice(-12).map((line, i) => (
          <span key={`${i}-${line}`} style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {line}
          </span>
        ))}
        <span style={{ animation: "preloader-caret 1s steps(2) infinite" }}>_</span>
        <style>{`@keyframes preloader-caret { 50% { opacity: 0; } }`}</style>
      </div>
    </div>
  );
}
