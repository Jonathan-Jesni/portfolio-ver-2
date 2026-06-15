/* eslint-disable react-hooks/purity */
/* eslint-disable react-hooks/immutability */
"use client";

import { useRef, useMemo, useEffect, Suspense } from "react";
import { Canvas, useFrame, extend, useThree } from "@react-three/fiber";
import { shaderMaterial, useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Preload assets outside component render loop.
// Draco decoder path offloads geometry decode to a worker so the GLB
// parse doesn't starve the main thread during the preloader. Must match
// the useGLTF call below exactly or the preload cache misses.
const DRACO_DECODER_PATH = "https://www.gstatic.com/draco/versioned/decoders/1.5.5/";
useGLTF.preload("/assets/hardware_laptop.glb", DRACO_DECODER_PATH);
// Keep bg.jpg in this preload list — PreLoader.tsx reads useProgress() off the
// THREE.DefaultLoadingManager global, so removing this call would empty the
// manifest and force the 9s failsafe.
useTexture.preload("/assets/textures/bg.jpg");
useTexture.preload("/assets/textures/Mac Keyboard.jpg");

/* ── Boot-screen canvas dimensions.
   Aspect ratio matches the screen face world-space rect:
   FACE_HALF_W (1.4766) / FACE_HALF_H (0.9485) ≈ 1.557.
   2048-wide so the header stays crisp when the camera plunges to cover-fit
   (a ~1440px viewport @ dpr 2 ≈ 2880 device px across the face); 1024 was the
   source of the zoom-in blur. The heavy per-frame upload only happens during
   the brief dots phase. ── */
const BOOT_W = 2048;
const BOOT_H = 1316;

/* ── Phase thresholds (hero scroll progress, 0→1) ── */
const BOOT_P1 = 0.40; // black  →  spinning-dots  start
const BOOT_P2 = 0.75; // dots   →  header bitmap   start

/* Camera cover-fit pull-in. Shared by coverZ() (how close the camera plunges)
   AND the boot bitmap draw (how much the header is pre-scaled) so the two stay
   locked: the camera can overshoot aggressively to push the laptop bezel fully
   off-screen, while the header drawn at the SAME factor still lands on the
   #projects DOM header pixel-for-pixel at the dissolve. Lower = more bezel
   clearance; the crossfade stays seamless at any value. TUNE IN A REAL BROWSER. */
const COVER_OVERSHOOT = 0.90;

/* ─────────────────────────────────────────────────────────────────────
   BOOT-SCREEN DRAWING — pure function, called from useFrame.

   Draws into an offscreen 2D canvas that is assigned as the screen
   face's emissiveMap (THREE.CanvasTexture). Three scroll-gated phases:

     0.00–0.40   Black (#070B14) — lid is closed or just opening
     0.40–0.75   Spinning-dot loader on black (skipped for reduced-motion)
     0.75–1.00   bg.jpg fades in cover-fit → final frame == captured header,
                 so the crossfade dissolve into the real #projects DOM is exact.

   progress  — raw 0-1 from the hero ScrollTrigger's onUpdate
   clockTime — state.clock.elapsedTime (rAF-driven, used only in dot phase)
   bgImage   — HTMLImageElement|ImageBitmap from screenTex.image (same-origin,
               safe to canvas.drawImage without CORS issues)
   ───────────────────────────────────────────────────────────────────── */
function drawBootScreen(
  ctx: CanvasRenderingContext2D,
  progress: number,
  clockTime: number,
  bgImage: HTMLImageElement | ImageBitmap | null,
  prefersReduced: boolean,
): void {
  const W = BOOT_W;
  const H = BOOT_H;

  ctx.clearRect(0, 0, W, H);
  // #070B14 = body background = --surface-0. toneMapped:false on the material
  // means this exact hex reaches the compositor without ACES shifting it.
  ctx.fillStyle = "#070B14";
  ctx.fillRect(0, 0, W, H);

  if (progress <= 0) return; // pure black — lid closed

  // ── Phase 1: spinning-dots (40–75 %) ──────────────────────────────
  if (!prefersReduced && progress >= BOOT_P1 && progress < BOOT_P2) {
    const dp = (progress - BOOT_P1) / (BOOT_P2 - BOOT_P1); // 0→1 within phase

    // Fade in over first 15 % of this phase, fade out over last 15 %.
    const fadeIn  = Math.min(1, dp / 0.15);
    const fadeOut = 1 - Math.min(1, Math.max(0, (dp - 0.85) / 0.15));
    const alpha   = fadeIn * fadeOut;

    if (alpha > 0) {
      ctx.save();
      ctx.globalAlpha = alpha;

      const cx   = W / 2;
      const cy   = H / 2;
      const ring = Math.min(W, H) * 0.065; // circle radius
      const dr   = Math.min(W, H) * 0.012; // dot radius
      const N    = 8;
      const angle = clockTime * 2.5; // rotations per second (wall-clock spin)

      for (let i = 0; i < N; i++) {
        // Trail: dots further behind the leading dot are progressively dimmer.
        const t  = i / N;
        const da = 0.15 + 0.85 * Math.pow(t, 1.5);
        const a  = t * Math.PI * 2 + angle;

        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * ring, cy + Math.sin(a) * ring, dr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${da})`;
        ctx.fill();
      }

      ctx.restore();
    }
    return; // dots phase — don't bleed into bitmap
  }

  // ── Phase 2: header bitmap fade-in (75–100 %) ─────────────────────
  // Final frame (progress=1) must equal captured-header pixel-for-pixel
  // so the dissolve into real #projects DOM is seamless.
  if (progress >= BOOT_P2 && bgImage) {
    const raw = (progress - BOOT_P2) / (1 - BOOT_P2);
    const t   = Math.max(0, Math.min(1, raw));
    // Smoothstep — soft ease-in for the bitmap reveal
    const alpha = t * t * (3 - 2 * t);

    if (alpha <= 0) return;

    // Cover-fit: same semantics as CSS background-size:cover
    const imgW = "naturalWidth" in bgImage
      ? (bgImage as HTMLImageElement).naturalWidth
      : (bgImage as ImageBitmap).width;
    const imgH = "naturalHeight" in bgImage
      ? (bgImage as HTMLImageElement).naturalHeight
      : (bgImage as ImageBitmap).height;

    if (imgW > 0 && imgH > 0) {
      // Cover-fit, pre-scaled by COVER_OVERSHOOT: the camera plunges to show
      // only the center COVER_OVERSHOOT fraction of the face, so drawing the
      // header at that same fraction (with #070B14 already filling the margin)
      // makes the visible header fill the viewport at the DOM header's exact
      // scale — the dissolve matches and the off-screen margin hides the bezel.
      const scale = Math.max(W / imgW, H / imgH) * COVER_OVERSHOOT;
      const dx    = (W - imgW * scale) / 2;
      const dy    = (H - imgH * scale) / 2;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(bgImage as CanvasImageSource, dx, dy, imgW * scale, imgH * scale);
      ctx.restore();
    }
  }
}

/* ─────────────────────────────────────────────────────────────────────
   DOT GRID — Background Physics Grid
   ───────────────────────────────────────────────────────────────── */
const dotGridVertexShader = /* glsl */ `
  uniform float uTime;
  attribute float aSeed;
  varying float vOpacity;

  void main() {
    float twinkle = 0.5 + 0.5 * sin(uTime * (1.2 + aSeed * 2.8) + aSeed * 6.2831);
    float flash = step(0.97, fract(aSeed * 17.31 + uTime * (0.08 + aSeed * 0.12)));
    vOpacity = mix(0.04, 0.18, twinkle) + flash * 0.22;

    gl_Position  = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = 2.0;
  }
`;

const dotGridFragmentShader = /* glsl */ `
  varying float vOpacity;
  void main() {
    vec2  uv   = gl_PointCoord - 0.5;
    float disc = 1.0 - smoothstep(0.35, 0.5, length(uv));
    gl_FragColor = vec4(1.0, 1.0, 1.0, vOpacity * disc);
  }
`;

const DotGridMaterial = shaderMaterial(
  { uTime: 0 },
  dotGridVertexShader,
  dotGridFragmentShader
);
extend({ DotGridMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    dotGridMaterial: React.PropsWithChildren<{
      ref?: React.Ref<THREE.ShaderMaterial & { uTime: number }>;
      uTime?: number;
      transparent?: boolean;
      depthWrite?: boolean;
    }>;
  }
}

function DotGrid() {
  const matRef = useRef<THREE.ShaderMaterial & { uTime: number }>(null);
  const geoRef = useRef<THREE.BufferGeometry>(null);
  const { size } = useThree();

  const repelRadius = 1.4;
  const repelForce = 0.04;
  const returnSpeed = 0.08;
  const friction = 0.82;

  const { cols, rows, basePos, currentPos, velocities, seeds } = useMemo(() => {
    const cols = 80;
    const rows = 45;
    const N = cols * rows;
    const spacingX = 0.175;
    const spacingY = 0.175;
    const totalW = (cols - 1) * spacingX;
    const totalH = (rows - 1) * spacingY;

    const basePos = new Float32Array(N * 3);
    const currentPos = new Float32Array(N * 3);
    const velocities = new Float32Array(N * 3);
    const seeds = new Float32Array(N);

    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * spacingX - totalW / 2;
        const y = r * spacingY - totalH / 2;

        basePos[idx * 3 + 0] = x;
        basePos[idx * 3 + 1] = y;
        basePos[idx * 3 + 2] = 0;

        currentPos[idx * 3 + 0] = x;
        currentPos[idx * 3 + 1] = y;
        currentPos[idx * 3 + 2] = 0;

        seeds[idx] = Math.random();
        idx++;
      }
    }
    return { cols, rows, basePos, currentPos, velocities, seeds };
  }, []);

  useFrame((state, delta) => {
    if (matRef.current) matRef.current.uTime += delta;
    if (!geoRef.current) return;

    const aspect = size.width / size.height;
    const halfH = 2.693;
    const halfW = halfH * aspect;
    const mx = state.pointer.x * halfW;
    const my = state.pointer.y * halfH;

    const N = cols * rows;
    for (let i = 0; i < N; i++) {
      const i3 = i * 3;
      const bx = basePos[i3 + 0];
      const by = basePos[i3 + 1];
      let cx = currentPos[i3 + 0];
      let cy = currentPos[i3 + 1];
      let vx = velocities[i3 + 0];
      let vy = velocities[i3 + 1];

      const dx = cx - mx;
      const dy = cy - my;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < repelRadius && dist > 0.001) {
        const force = Math.pow(1.0 - dist / repelRadius, 2.0) * repelForce;
        vx += (dx / dist) * force;
        vy += (dy / dist) * force;
      }

      vx += (bx - cx) * returnSpeed;
      vy += (by - cy) * returnSpeed;
      vx *= friction;
      vy *= friction;
      cx += vx;
      cy += vy;

      currentPos[i3 + 0] = cx;
      currentPos[i3 + 1] = cy;
      velocities[i3 + 0] = vx;
      velocities[i3 + 1] = vy;
    }

    const posAttr = geoRef.current.attributes.position as THREE.BufferAttribute;
    posAttr.copyArray(currentPos);
    posAttr.needsUpdate = true;
  });

  return (
    <points>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute
          attach="attributes-position"
          args={[currentPos, 3]}
          count={currentPos.length / 3}
        />
        <bufferAttribute
          attach="attributes-aSeed"
          args={[seeds, 1]}
          count={seeds.length}
        />
      </bufferGeometry>
      <dotGridMaterial ref={matRef} transparent depthWrite={false} />
    </points>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   LAPTOP SCENE — Native Hinge Origin and Phased GSAP Timeline
   ───────────────────────────────────────────────────────────────── */
function LaptopScene({
  canvasWrapperDOMRef,
  portfolioSectionRef,
}: {
  canvasWrapperDOMRef: React.RefObject<HTMLDivElement | null>;
  portfolioSectionRef?: React.RefObject<HTMLElement | null>;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { nodes, materials } = useGLTF("/assets/hardware_laptop.glb", DRACO_DECODER_PATH) as any;
  // screenTex is still loaded via useTexture so THREE.DefaultLoadingManager
  // captures it in the preloader manifest — removing this call would empty the
  // manifest and let the preloader fall back to the 9 s failsafe.
  const screenTex  = useTexture("/assets/textures/bg.jpg");
  const keyboardTex = useTexture("/assets/textures/Mac Keyboard.jpg");

  const globalContainerRef  = useRef<THREE.Group>(null);
  const lidHingeGroupRef    = useRef<THREE.Group>(null);
  const { camera, size }    = useThree();

  // Raw hero scroll progress (0→1) written by ScrollTrigger.onUpdate.
  // Read each frame to drive the boot-screen drawing.
  const bootProgressRef     = useRef(0);
  // Tracks the last drawn progress to avoid redundant canvas uploads.
  const lastBootProgressRef = useRef(-1);

  const prefersReduced = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  /* ── Boot-screen canvas + CanvasTexture ─────────────────────────────
     Created once; the canvas is the "screen" being drawn each frame.
     useMemo([]) is stable — React won't recompute it unless the
     component unmounts and remounts.  ── */
  const boot = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width  = BOOT_W;
    canvas.height = BOOT_H;
    const ctx = canvas.getContext("2d")!;
    // Pre-fill with "off" colour so there is no white flash before the
    // first useFrame tick uploads the texture.
    ctx.fillStyle = "#070B14";
    ctx.fillRect(0, 0, BOOT_W, BOOT_H);

    const tex = new THREE.CanvasTexture(canvas);
    // Match the exact emissiveMap settings tuned for the screen face:
    tex.flipY       = false;           // UV space is already WebGL-oriented in the GLB
    tex.colorSpace  = THREE.SRGBColorSpace;
    tex.anisotropy  = 8;              // clamp on upload if GPU max < 8
    return { canvas, ctx, tex };
  }, []);

  // Dispose the CanvasTexture when this component unmounts.
  useEffect(() => {
    return () => { boot.tex.dispose(); };
  }, [boot]);

  /* ── Texture mapping & material calibrations ── */
  useMemo(() => {
    if (screenTex) {
      screenTex.flipY      = false;
      screenTex.colorSpace = THREE.SRGBColorSpace;
      // anisotropy not needed — screenTex is no longer on any material;
      // keeping colorSpace/flipY so the texture is valid if reassigned.
    }
    if (keyboardTex) {
      keyboardTex.flipY      = false;
      keyboardTex.colorSpace = THREE.SRGBColorSpace;
    }

    // The screen face must render EXACTLY like the real #projects DOM header
    // (it dissolves into that DOM at the hero→projects boundary):
    //  - emissive-only (base map null, color black) — scene lights can't tint it
    //  - toneMapped:false — ACES doesn't shift #070B14 away from the DOM colour
    //  - boot.tex (CanvasTexture) replaces the static bg.jpg so the screen
    //    "boots" as the user scrolls; the final frame IS bg.jpg for the dissolve
    if (materials.Image) {
      materials.Image.map              = null;
      materials.Image.color?.set?.("#000000");
      materials.Image.emissiveMap      = boot.tex;
      materials.Image.emissive         = new THREE.Color("#ffffff");
      materials.Image.emissiveIntensity = 1.0;
      materials.Image.toneMapped       = false;
      materials.Image.metalness        = 0;
      materials.Image.roughness        = 1;
      materials.Image.needsUpdate      = true;
    }
    if (materials.Screen) {
      materials.Screen.roughness = 0.2;
      materials.Screen.metalness = 0.1;
    }
    if (materials.Keys) {
      materials.Keys.map       = keyboardTex;
      materials.Keys.roughness = 0.5;
      materials.Keys.metalness = 0.1;
      materials.Keys.needsUpdate = true;
    }
    if (materials.Laptop) {
      materials.Laptop.roughness = 0.4;
      materials.Laptop.metalness = 0.1;
      materials.Laptop.color.set("#d1d5db");
    }
    if (materials.Keyboard) {
      materials.Keyboard.roughness = 0.5;
      materials.Keyboard.metalness = 0.1;
    }
  }, [screenTex, keyboardTex, materials, boot.tex]);

  useGSAP(() => {
    if (!globalContainerRef.current || !lidHingeGroupRef.current) return;

    // Phase 0: Force lid to physically-closed rotation before any scroll
    lidHingeGroupRef.current.rotation.x = 1.7285;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: "#hero",
        start: "top top",
        end: "bottom bottom",
        /* scrub: 0.6 — the camera eases toward the target scroll position
           instead of snapping. Prevents the 1-frame jump / canvas pop on
           fast programmatic nav jumps (lenis.scrollTo). The crossfade
           timeline keeps scrub:true (tight) so both stay in sync — if the
           plunge lags by 0.6 s but the crossfade leads by 0 s, they would
           diverge; keeping different scrub values on independent triggers is
           fine here because they cover different scroll zones. */
        scrub: 0.6,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          // Raw scroll progress drives the boot screen — not the scrub-lagged
          // camera position. The boot phases are wide (40% bands) so the
          // visual mismatch between raw progress and lagged camera is negligible.
          bootProgressRef.current = self.progress;
        },
      },
    });

    // Phase 1 (0 % → 40 %): Open lid + centre + un-tilt
    tl.to(
      lidHingeGroupRef.current.rotation,
      { x: 0, duration: 0.4, ease: "power2.inOut" },
      0
    );
    tl.to(
      globalContainerRef.current.position,
      { x: 0, duration: 0.4, ease: "power2.inOut" },
      0
    );
    tl.to(
      globalContainerRef.current.rotation,
      { x: 0.1577, y: 0, z: 0, duration: 0.4, ease: "power2.inOut" },
      0
    );

    // Phase 2 (75 % → 100 %): Camera "cover-fit" plunge toward screen face.
    // ┌──────────────────────────────────────────────────────────────────┐
    // │ The final camera position frames the display face exactly        │
    // │ full-bleed (CSS background-size:cover semantics) so the boundary │
    // │ crossfade into the real #projects DOM is pixel-for-pixel exact.  │
    // └──────────────────────────────────────────────────────────────────┘
    const FACE_CY      = 0.6879;
    const FACE_FRONT_Z = -0.8689;
    const FACE_HALF_W  = 1.4766;
    const FACE_HALF_H  = 0.9485;
    const coverZ = () => {
      const t      = Math.tan(THREE.MathUtils.degToRad(45 / 2)); // fov 45 vertical
      const aspect = size.width / Math.max(1, size.height);
      // COVER_OVERSHOOT pull-in pushes the bezel/casing fully off-screen; the
      // boot bitmap is pre-scaled by the SAME factor so the dissolve still
      // matches the DOM header exactly.
      const d = Math.min(FACE_HALF_H / t, FACE_HALF_W / (aspect * t)) * COVER_OVERSHOOT;
      return FACE_FRONT_Z + d;
    };
    tl.to(
      camera.position,
      { z: coverZ, y: FACE_CY, duration: 0.25, ease: "power2.inOut" },
      0.75
    );
    tl.to(
      camera.rotation,
      { x: 0, y: 0, z: 0, duration: 0.25, ease: "power2.inOut" },
      0.75
    );

    // ── Phase 3: Boundary Crossfade ────────────────────────────────────
    // hero 3D layer is position:fixed in CSS (no sticky↔fixed swap needed).
    // Only zIndex and visibility change at the boundary — no reflow, no
    // position-recalculation, no frame-late paint.
    //
    // scrub:true (tight) — the opacity fade must be exact relative to the
    // scroll position so the crossfade matches the projects DOM reveal.
    // Keeping it tight here while the main hero tl uses 0.6 is intentional:
    // these triggers cover different scroll zones and don't interact.
    const layerEl     = canvasWrapperDOMRef.current?.closest<HTMLElement>(".hero-3d-layer");
    const projectsEl  = portfolioSectionRef?.current;
    if (layerEl && projectsEl && canvasWrapperDOMRef.current) {
      const fadeTl = gsap.timeline({
        scrollTrigger: {
          trigger: "#hero",
          start: "bottom bottom",
          endTrigger: projectsEl,
          end: "top top",
          scrub: true,
          // No position toggle — layer is always position:fixed in CSS.
          // Only zIndex changes to lift it above the stack sheets (z:1-6)
          // for the crossfade window, then drop back below hero text (z:0).
          onEnter: () => {
            gsap.set(layerEl, { zIndex: 30 });
          },
          onLeaveBack: () => {
            // Safety-reset: with scrub:true the scrub is already at progress=0
            // (opacity=1) when this fires, but an explicit set prevents any
            // sub-frame artefact from the zIndex re-ordering.
            gsap.set(layerEl, { zIndex: 0, opacity: 1 });
          },
          // visibility:hidden instead of display:none — avoids layout thrash
          // on show/hide while still removing the layer from compositing cost.
          onLeave: () => {
            gsap.set(layerEl, { visibility: "hidden" });
          },
          onEnterBack: () => {
            gsap.set(layerEl, { visibility: "visible", zIndex: 30 });
          },
        },
      });

      fadeTl
        /* 0.001, not 0: zero-time sets in a scrubbed timeline don't revert
           when the scrub reverses past the start — the wrapper would keep
           pointerEvents:none back in the hero and kill the laptop's drag. */
        .set(projectsEl, { opacity: 1, pointerEvents: "auto" }, 0.001)
        .set(canvasWrapperDOMRef.current, { pointerEvents: "none" }, 0.001)
        .to(layerEl, { opacity: 0, ease: "power2.in", duration: 1 }, 0);
    }

  }, [camera, size, canvasWrapperDOMRef, portfolioSectionRef]);

  /* ── Boot-screen rendering ──────────────────────────────────────────
     Redraws the offscreen canvas only when progress changed OR when the
     dots are actively spinning (every rAF frame in that phase) — avoids
     a GPU texture upload every frame during the static black/bitmap phases. ── */
  useFrame((state) => {
    const progress  = bootProgressRef.current;
    const inDots    = !prefersReduced && progress >= BOOT_P1 && progress < BOOT_P2;

    if (progress === lastBootProgressRef.current && !inDots) return;
    lastBootProgressRef.current = progress;

    drawBootScreen(
      boot.ctx,
      progress,
      state.clock.elapsedTime,
      screenTex?.image as HTMLImageElement | ImageBitmap | null,
      prefersReduced,
    );
    boot.tex.needsUpdate = true;
  });

  return (
    <group
      ref={globalContainerRef}
      position={[1.7, 0, 0]}
      rotation={[0.18, -0.35, 0.05]}
    >
      <group scale={[10, 10, 10]} position={[0, -0.65, 0]}>
        <primitive object={nodes.Base_Chassis} />
        <group ref={lidHingeGroupRef} position={[0, 0.008614, -0.10311]}>
          <primitive object={nodes.Lid_Screen} position={[0, -0.008614, 0.10311]} />
        </group>
      </group>
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   INTERACTIVE MODEL — top-level export
   ───────────────────────────────────────────────────────────────── */
export interface InteractiveModelProps {
  portfolioSectionRef?: React.RefObject<HTMLElement | null>;
}

export default function InteractiveModel({ portfolioSectionRef }: InteractiveModelProps) {
  const canvasWrapperDOMRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={canvasWrapperDOMRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "auto",
        touchAction: "none",
        zIndex: 0,
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 6.5], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[8, 12, 6]} intensity={2.2} />
        <directionalLight position={[-8, 6, -6]} intensity={0.6} />
        <pointLight position={[0, 4, 3]} intensity={1.0} />

        <DotGrid />
        <Suspense fallback={null}>
          <LaptopScene
            canvasWrapperDOMRef={canvasWrapperDOMRef}
            portfolioSectionRef={portfolioSectionRef}
          />
        </Suspense>
      </Canvas>

      {/* Drag hint */}
      <div
        style={{
          position: "absolute",
          bottom: "24px",
          right: "10%",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            fontFamily: "var(--font-jetbrains, monospace)",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "rgba(216, 188, 135, 0.35)",
          }}
        >
          Scroll to open & zoom
        </span>
      </div>
    </div>
  );
}
