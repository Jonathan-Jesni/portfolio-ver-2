/* eslint-disable react-hooks/immutability */
"use client";

import { useRef, useMemo, useEffect, useState, Suspense, Component } from "react";
import type { ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  useGLTF,
  useTexture,
  Environment,
  Lightformer,
  PerformanceMonitor,
} from "@react-three/drei";
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

     0.00–0.40   Black (#0D0B09) — lid is closed or just opening
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
  // #0D0B09 = body background = --surface-0. toneMapped:false on the material
  // means this exact hex reaches the compositor without ACES shifting it.
  ctx.fillStyle = "#0D0B09";
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
      // header at that same fraction (with #0D0B09 already filling the margin)
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
  // Parent of the scroll-driven group: holds pointer-parallax only, so it
  // never fights the GSAP timeline that owns globalContainerRef's transform.
  const parallaxGroupRef    = useRef<THREE.Group>(null);
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
    ctx.fillStyle = "#0D0B09";
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
      // No anisotropy: screenTex isn't bound to a material (only its
      // .image is read for the canvas, see below), but flipY/colorSpace
      // keep it valid should it ever be reassigned to one.
    }
    if (keyboardTex) {
      keyboardTex.flipY      = false;
      keyboardTex.colorSpace = THREE.SRGBColorSpace;
    }

    // The screen face must render EXACTLY like the real #projects DOM header
    // (it dissolves into that DOM at the hero→projects boundary):
    //  - emissive-only (base map null, color black) — scene lights can't tint it
    //  - toneMapped:false — ACES doesn't shift #0D0B09 away from the DOM colour
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
    //
    // fromTo() instead of to() — locks the "from" values explicitly so that
    // invalidateOnRefresh cannot re-read them from the Three.js object's
    // current (already-animated) state on a ScrollTrigger.refresh() call.
    // With to(), a refresh mid-scroll would re-record a partially-animated
    // position as the new start, causing the laptop to snap to the centre.
    tl.fromTo(
      lidHingeGroupRef.current.rotation,
      { x: 1.7285 },
      { x: 0, duration: 0.4, ease: "power2.inOut" },
      0
    );
    tl.fromTo(
      globalContainerRef.current.position,
      { x: 1.7 },
      { x: 0, duration: 0.4, ease: "power2.inOut" },
      0
    );
    tl.fromTo(
      globalContainerRef.current.rotation,
      { x: 0.18, y: -0.35, z: 0.05 },
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
    // fromTo() — same reason as Phase 1: locks the camera's starting
    // state (z:6.5, y:0 from the Canvas camera prop) so that
    // invalidateOnRefresh cannot re-read a mid-plunge camera position as
    // the new "from", which would cause the sudden zoom snap.
    tl.fromTo(
      camera.position,
      { z: 6.5, y: 0 },
      { z: coverZ, y: FACE_CY, duration: 0.25, ease: "power2.inOut" },
      0.75
    );
    tl.fromTo(
      camera.rotation,
      { x: 0, y: 0, z: 0 },
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
          // NOTE: We deliberately do NOT use visibility:hidden on onLeave.
          // opacity:0 from the scrub already hides it visually, and
          // visibility:hidden applied via a callback is unreliable during
          // fast programmatic nav jumps (the callback may not fire), leaving
          // the layer permanently invisible when scrolling back to the hero.
          onEnter: () => {
            gsap.set(layerEl, { zIndex: 30 });
          },
          onLeaveBack: () => {
            // Drop back below hero text once we leave the crossfade zone
            // going upward. Scrub already drives opacity back to 1.
            gsap.set(layerEl, { zIndex: 0, opacity: 1 });
          },
          onLeave: () => {
            // Drop z-index only — do NOT hide visibility. The sections'
            // opaque backgrounds naturally cover the fixed layer, and
            // keeping it "visible" ensures it reappears correctly on
            // any backward nav without depending on callback ordering.
            gsap.set(layerEl, { zIndex: 0 });
          },
          onEnterBack: () => {
            gsap.set(layerEl, { zIndex: 30 });
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

  /* ── Pointer parallax ──────────────────────────────────────────────
     A featherweight tilt toward the cursor so the laptop feels alive
     even before the first scroll. Eased (lerp) so it never snaps, and
     faded to zero as the boot progress approaches the camera plunge so
     it can't perturb the pixel-exact cover-fit dissolve. Disabled for
     reduced motion. ── */
  useFrame((state) => {
    const g = parallaxGroupRef.current;
    if (!g || prefersReduced) return;
    // 1 before the plunge zone, ramping to 0 across 0.55→0.75 progress.
    const fade = 1 - Math.max(0, Math.min(1, (bootProgressRef.current - 0.55) / 0.2));
    const targetX = state.pointer.y * 0.10 * fade;
    const targetY = state.pointer.x * 0.16 * fade;
    g.rotation.x += (targetX - g.rotation.x) * 0.06;
    g.rotation.y += (targetY - g.rotation.y) * 0.06;
  });

  return (
    <group ref={parallaxGroupRef}>
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
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   WEBGL FALLBACK — an unsupported/lost context throws during Canvas
   render; without a boundary that would blank the whole React tree.
   Here it degrades silently to no 3D (the hero text/site still works).
   ───────────────────────────────────────────────────────────────── */
class WebGLBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/* ─────────────────────────────────────────────────────────────────────
   INTERACTIVE MODEL — top-level export
   ───────────────────────────────────────────────────────────────── */
export interface InteractiveModelProps {
  portfolioSectionRef?: React.RefObject<HTMLElement | null>;
}

export default function InteractiveModel({ portfolioSectionRef }: InteractiveModelProps) {
  const canvasWrapperDOMRef = useRef<HTMLDivElement>(null);
  // Adaptive resolution: start at a balanced 1.5×, let PerformanceMonitor
  // pull it down to 1× on sustained frame drops and back up to 2× when the
  // GPU has headroom. Cheaper than a fixed dpr={[1,2]} on weak hardware.
  const [dpr, setDpr] = useState(1.5);

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
      <WebGLBoundary>
      <Canvas
        camera={{ position: [0, 0, 6.5], fov: 45 }}
        dpr={dpr}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
      >
        <PerformanceMonitor
          onIncline={() => setDpr(2)}
          onDecline={() => setDpr(1)}
        />

        <ambientLight intensity={1.5} />
        <directionalLight position={[8, 12, 6]} intensity={2.2} />
        <directionalLight position={[-8, 6, -6]} intensity={0.6} />
        <pointLight position={[0, 4, 3]} intensity={1.0} />

        {/* Procedural image-based lighting: soft reflections on the metal
            chassis/keys without fetching an external HDRI (which would add a
            network dependency to the carefully-gated preloader manifest). The
            emissive, toneMapped:false screen face is unaffected. */}
        <Environment resolution={128} background={false}>
          <Lightformer intensity={0.8} position={[3, 3, 4]} scale={[6, 6, 1]} color="#eef2f4" />
          <Lightformer intensity={0.4} position={[-4, 2, -3]} scale={[5, 5, 1]} color="#9fb4d8" />
          <Lightformer form="ring" intensity={0.3} position={[0, 5, 2]} scale={[3, 3, 1]} color="#ffffff" />
        </Environment>


        <Suspense fallback={null}>
          <LaptopScene
            canvasWrapperDOMRef={canvasWrapperDOMRef}
            portfolioSectionRef={portfolioSectionRef}
          />
        </Suspense>
      </Canvas>
      </WebGLBoundary>
    </div>
  );
}
