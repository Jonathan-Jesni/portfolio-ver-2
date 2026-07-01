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
import { detectGPU } from "../lib/detectGPU";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Preload assets outside component render loop.
const DRACO_DECODER_PATH = "https://www.gstatic.com/draco/versioned/decoders/1.5.5/";
useGLTF.preload("/assets/hardware_laptop.glb", DRACO_DECODER_PATH);
// Keep bg.jpg in this preload list — PreLoader.tsx reads useProgress() off the
// THREE.DefaultLoadingManager global, so removing this call would empty the
// manifest and force the 9s failsafe.
useTexture.preload("/assets/textures/bg.jpg");
useTexture.preload("/assets/textures/Mac Keyboard.jpg");

/* ── Boot-screen canvas dimensions ── */
const BOOT_W = 1536;
const BOOT_H = 987;

/* ── Phase thresholds (hero scroll progress, 0→1) ── */
const BOOT_P1 = 0.40;
const BOOT_P2 = 0.75;

const COVER_OVERSHOOT = 0.90;

/* ─────────────────────────────────────────────────────────────────────
   BOOT-SCREEN DRAWING — pure function, called from useFrame.
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
  ctx.fillStyle = "#0D0B09";
  ctx.fillRect(0, 0, W, H);

  if (progress <= 0) return;

  // ── Phase 1: spinning-dots (40–75 %) ──────────────────────────────
  if (!prefersReduced && progress >= BOOT_P1 && progress < BOOT_P2) {
    const dp = (progress - BOOT_P1) / (BOOT_P2 - BOOT_P1);
    const fadeIn  = Math.min(1, dp / 0.15);
    const fadeOut = 1 - Math.min(1, Math.max(0, (dp - 0.85) / 0.15));
    const alpha   = fadeIn * fadeOut;

    if (alpha > 0) {
      ctx.save();
      ctx.globalAlpha = alpha;

      const cx   = W / 2;
      const cy   = H / 2;
      const ring = Math.min(W, H) * 0.065;
      const dr   = Math.min(W, H) * 0.012;
      const N    = 8;
      const angle = clockTime * 2.5;

      for (let i = 0; i < N; i++) {
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
    return;
  }

  // ── Phase 2: header bitmap fade-in (75–100 %) ─────────────────────
  if (progress >= BOOT_P2 && bgImage) {
    const raw = (progress - BOOT_P2) / (1 - BOOT_P2);
    const t   = Math.max(0, Math.min(1, raw));
    const alpha = t * t * (3 - 2 * t);

    if (alpha <= 0) return;

    const imgW = "naturalWidth" in bgImage
      ? (bgImage as HTMLImageElement).naturalWidth
      : (bgImage as ImageBitmap).width;
    const imgH = "naturalHeight" in bgImage
      ? (bgImage as HTMLImageElement).naturalHeight
      : (bgImage as ImageBitmap).height;

    if (imgW > 0 && imgH > 0) {
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
   LAPTOP SCENE
   ───────────────────────────────────────────────────────────────── */
function LaptopScene({
  canvasWrapperDOMRef,
  portfolioSectionRef,
  lowPerf = false,
}: {
  canvasWrapperDOMRef: React.RefObject<HTMLDivElement | null>;
  portfolioSectionRef?: React.RefObject<HTMLElement | null>;
  lowPerf?: boolean;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { nodes, materials } = useGLTF("/assets/hardware_laptop.glb", DRACO_DECODER_PATH) as any;
  const screenTex   = useTexture("/assets/textures/bg.jpg");
  const keyboardTex = useTexture("/assets/textures/Mac Keyboard.jpg");

  const globalContainerRef  = useRef<THREE.Group>(null);
  const lidHingeGroupRef    = useRef<THREE.Group>(null);
  const parallaxGroupRef    = useRef<THREE.Group>(null);
  const { camera, size, invalidate } = useThree();

  const bootProgressRef     = useRef(0);
  const lastBootProgressRef = useRef(-1);
  // Timestamp of the last scroll event. useFrame self-perpetuates for 700ms
  // after this to let the GSAP scrub:0.6 tail finish easing.
  const scrollSettleRef     = useRef(0);

  const prefersReduced = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  /* ── Boot-screen canvas + CanvasTexture ── */
  const boot = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width  = BOOT_W;
    canvas.height = BOOT_H;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#0D0B09";
    ctx.fillRect(0, 0, BOOT_W, BOOT_H);

    const tex = new THREE.CanvasTexture(canvas);
    tex.flipY       = false;
    tex.colorSpace  = THREE.SRGBColorSpace;
    tex.anisotropy  = 8;
    return { canvas, ctx, tex };
  }, []);

  useEffect(() => {
    return () => { boot.tex.dispose(); };
  }, [boot]);

  /* ── Texture mapping & material calibrations ── */
  useMemo(() => {
    if (screenTex) {
      screenTex.flipY      = false;
      screenTex.colorSpace = THREE.SRGBColorSpace;
    }
    if (keyboardTex) {
      keyboardTex.flipY      = false;
      keyboardTex.colorSpace = THREE.SRGBColorSpace;
    }

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
      materials.Screen.roughness = 0.35;
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

    lidHingeGroupRef.current.rotation.x = 1.7285;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: "#hero",
        start: "top top",
        end: "bottom bottom",
        scrub: 0.3,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          bootProgressRef.current = self.progress;
          // Mark the last scroll time so useFrame can keep ticking for
          // the 350ms GSAP scrub:0.3 settle tail.
          scrollSettleRef.current = performance.now();
          invalidate();
        },
      },
    });

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

    const FACE_CY      = 0.6879;
    const FACE_FRONT_Z = -0.8689;
    const FACE_HALF_W  = 1.4766;
    const FACE_HALF_H  = 0.9485;
    const coverZ = () => {
      const t      = Math.tan(THREE.MathUtils.degToRad(45 / 2));
      const aspect = size.width / Math.max(1, size.height);
      const d = Math.min(FACE_HALF_H / t, FACE_HALF_W / (aspect * t)) * COVER_OVERSHOOT;
      return FACE_FRONT_Z + d;
    };
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
          onEnter: () => {
            gsap.set(layerEl, { zIndex: 30 });
          },
          onLeaveBack: () => {
            gsap.set(layerEl, { zIndex: 0, opacity: 1 });
          },
          onLeave: () => {
            gsap.set(layerEl, { zIndex: 0 });
          },
          onEnterBack: () => {
            gsap.set(layerEl, { zIndex: 30 });
          },
        },
      });

      fadeTl
        .set(projectsEl, { opacity: 1, pointerEvents: "auto" }, 0.001)
        .set(canvasWrapperDOMRef.current, { pointerEvents: "none" }, 0.001)
        .to(layerEl, { opacity: 0, ease: "power2.in", duration: 1 }, 0);
    }

  }, [camera, size, canvasWrapperDOMRef, portfolioSectionRef, invalidate]);

  /* ── Boot-screen rendering ──────────────────────────────────────────
     With frameloop="demand" this only runs when a frame was requested.
     Self-perpetuates (via invalidate) in two cases where time drives the
     animation rather than scroll:
       1. inDots — spinner reads state.clock.elapsedTime every frame
       2. scrub tail — GSAP scrub:0.6 eases for ~600ms after last scroll
     Outside those windows it's a no-op and no new frame is scheduled.  ── */
  useFrame((state) => {
    const progress = bootProgressRef.current;
    const inDots   = !prefersReduced && progress >= BOOT_P1 && progress < BOOT_P2;
    const inScrubTail = performance.now() - scrollSettleRef.current < 350;

    if (progress !== lastBootProgressRef.current || inDots) {
      lastBootProgressRef.current = progress;
      drawBootScreen(
        boot.ctx,
        progress,
        state.clock.elapsedTime,
        screenTex?.image as HTMLImageElement | ImageBitmap | null,
        prefersReduced,
      );
      boot.tex.needsUpdate = true;
    }

    // Keep scheduling frames while time-driven animation is running.
    if (inDots || inScrubTail) {
      invalidate();
    }
  });

  /* ── Pointer parallax ──────────────────────────────────────────────
     Attaches a pointermove listener on the canvas wrapper DOM element and
     calls invalidate() so demand mode fires a frame on each move. The
     actual lerp still happens in useFrame (which runs because invalidate
     was just called). On lowPerf / reduced-motion the listener is never
     attached, saving per-event work entirely. ── */
  useFrame((state) => {
    const g = parallaxGroupRef.current;
    if (!g || prefersReduced || lowPerf) return;
    const fade = 1 - Math.max(0, Math.min(1, (bootProgressRef.current - 0.55) / 0.2));
    const targetX = state.pointer.y * 0.10 * fade;
    const targetY = state.pointer.x * 0.16 * fade;
    g.rotation.x += (targetX - g.rotation.x) * 0.06;
    g.rotation.y += (targetY - g.rotation.y) * 0.06;
  });

  useEffect(() => {
    if (prefersReduced || lowPerf) return;
    const el = canvasWrapperDOMRef.current;
    if (!el) return;
    // Throttle to ~30fps — a demand frame every ~32ms is plenty for the 0.06
    // lerp parallax, and it halves per-move invalidate churn on iGPU.
    let lastMove = 0;
    const onMove = () => {
      const now = performance.now();
      if (now - lastMove < 32) return;
      lastMove = now;
      invalidate();
    };
    el.addEventListener("pointermove", onMove, { passive: true });
    return () => el.removeEventListener("pointermove", onMove);
  }, [prefersReduced, lowPerf, canvasWrapperDOMRef, invalidate]);

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
   WEBGL FALLBACK
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

export interface InteractiveModelProps {
  portfolioSectionRef?: React.RefObject<HTMLElement | null>;
}

export default function InteractiveModel({ portfolioSectionRef }: InteractiveModelProps) {
  const canvasWrapperDOMRef = useRef<HTMLDivElement>(null);

  // GPU tier — detected once before Canvas mounts so antialias (a context-
  // creation flag) can be set correctly. "low" = Intel/Mesa iGPU or software
  // renderer. (No hardwareConcurrency fallback: ≤8 cores mislabels most capable
  // laptops as low-end, needlessly disabling antialias + defaulting degraded.)
  const [isLowGPU] = useState(() => {
    if (typeof window === "undefined") return false;
    return detectGPU() === "low";
  });

  const [dpr, setDpr] = useState(1);
  const [degraded, setDegraded] = useState(isLowGPU);
  const degradedRef = useRef(degraded);
  degradedRef.current = degraded;

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
        frameloop="demand"
        dpr={dpr}
        gl={{
          antialias: !isLowGPU,
          alpha: true,
          // "high-performance" routes to the dGPU on hybrid systems.
          // On a pure iGPU machine it has no effect but doesn't hurt.
          powerPreference: "high-performance",
        }}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
      >
        <PerformanceMonitor
          flipflops={3}
          onIncline={() => { if (!degradedRef.current) setDpr(1.2); }}
          onDecline={() => { setDpr(1); setDegraded(true); }}
        />

        {/* FrameloopGate removed: frameloop="demand" already renders zero
            frames when nobody calls invalidate(). When hero is offscreen the
            ScrollTrigger stops firing onUpdate → no invalidate → no frames. */}

        <ambientLight intensity={degraded ? 2.2 : 1.5} />
        <directionalLight position={[8, 12, 6]} intensity={2.2} />
        <directionalLight position={[-8, 6, -6]} intensity={0.6} />
        <pointLight position={[0, 4, 3]} intensity={1.0} />

        {/* Skip Environment IBL on degraded/iGPU — the extra ambient light
            above compensates so the model doesn't go flat. */}
        {!degraded && (
          <Environment resolution={64} background={false}>
            <Lightformer intensity={0.8} position={[3, 3, 4]} scale={[6, 6, 1]} color="#eef2f4" />
            <Lightformer intensity={0.4} position={[-4, 2, -3]} scale={[5, 5, 1]} color="#9fb4d8" />
            <Lightformer form="ring" intensity={0.3} position={[0, 5, 2]} scale={[3, 3, 1]} color="#ffffff" />
          </Environment>
        )}

        <Suspense fallback={null}>
          <LaptopScene
            canvasWrapperDOMRef={canvasWrapperDOMRef}
            portfolioSectionRef={portfolioSectionRef}
            lowPerf={degraded}
          />
        </Suspense>
      </Canvas>
      </WebGLBoundary>
    </div>
  );
}
