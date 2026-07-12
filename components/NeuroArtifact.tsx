"use client";

import { useRef, useMemo, useEffect, useCallback, Suspense, Component } from "react";
import type { ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Self-hosted decoder (same as the hero laptop) — a gstatic outage/block must
// not break this slide. Deliberately NO module-level useGLTF.preload here:
// this component is lazy-mounted well after the PreLoader's honest-manifest
// gate has already closed (see the warning block at the top of PreLoader.tsx)
// — registering into THREE.DefaultLoadingManager at this point would just be
// dead weight, not a manifest entry the loader ever sees.
const DRACO_DECODER_PATH = "/draco/";
const MODEL_PATH = "/assets/Neuro-genesis/artifact.glb";
const TARGET_SIZE = 1.9;

/* ─────────────────────────────────────────────────────────────────────
   ARTIFACT SCENE
   ───────────────────────────────────────────────────────────────── */
function ArtifactScene({ wrapperRef }: { wrapperRef: React.RefObject<HTMLDivElement | null> }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { scene } = useGLTF(MODEL_PATH, DRACO_DECODER_PATH) as any;

  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);
  const parallaxCur = useRef({ x: 0, y: 0 });
  const parallaxTarget = useRef({ x: 0, y: 0 });
  const { invalidate } = useThree();

  const prefersReduced = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  // Center + normalize the mesh once — mutates the loaded scene's own
  // transform so downstream group rotation pivots around the model's center.
  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = TARGET_SIZE / maxDim;
    scene.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    scene.scale.setScalar(scale);
    invalidate();
  }, [scene, invalidate]);

  useGSAP(() => {
    const st = ScrollTrigger.create({
      trigger: ".cs-track",
      start: "top bottom",
      end: "bottom top",
      onUpdate: (self) => {
        progressRef.current = self.progress;
        invalidate();
      },
    });
    return () => st.kill();
  }, {
    dependencies: [invalidate],
    revertOnUpdate: true,
  });

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;

    // Pointer-parallax lerp (skipped entirely on reduced-motion).
    let settled = true;
    if (!prefersReduced) {
      const c = parallaxCur.current;
      const t = parallaxTarget.current;
      const dx = t.x - c.x;
      const dy = t.y - c.y;
      c.x += dx * 0.08;
      c.y += dy * 0.08;
      settled = Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4;
    }

    g.rotation.y = progressRef.current * Math.PI * 1.2 + parallaxCur.current.y;
    g.rotation.x = parallaxCur.current.x;

    if (!settled) invalidate();
  });

  useEffect(() => {
    if (prefersReduced) return;
    const el = wrapperRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      const ny = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1;
      parallaxTarget.current.x = ny * 0.25;
      parallaxTarget.current.y = nx * 0.25;
      invalidate();
    };
    el.addEventListener("pointermove", onMove, { passive: true });
    return () => el.removeEventListener("pointermove", onMove);
  }, [prefersReduced, wrapperRef, invalidate]);

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   WEBGL FALLBACK
   ───────────────────────────────────────────────────────────────── */
class WebGLBoundary extends Component<
  { children: ReactNode; onFail?: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail?.();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export interface NeuroArtifactProps {
  onFail?: () => void;
}

export default function NeuroArtifact({ onFail }: NeuroArtifactProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const createdRef = useRef(false);
  const failedRef = useRef(false);

  const handleFail = useCallback(() => {
    if (failedRef.current) return;
    failedRef.current = true;
    onFail?.();
  }, [onFail]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (!createdRef.current) handleFail();
    }, 4000);
    return () => window.clearTimeout(timeoutId);
  }, [handleFail]);

  return (
    <div
      ref={wrapperRef}
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <WebGLBoundary onFail={handleFail}>
        <Canvas
          frameloop="demand"
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          camera={{ position: [0, 0, 3.2], fov: 40 }}
          style={{ width: "100%", height: "100%", display: "block" }}
          onCreated={() => { createdRef.current = true; }}
        >
          <ambientLight intensity={1.6} />
          <directionalLight position={[8, 12, 6]} intensity={2.0} />
          <directionalLight position={[-8, 6, -6]} intensity={0.6} />

          <Suspense fallback={null}>
            <ArtifactScene wrapperRef={wrapperRef} />
          </Suspense>
        </Canvas>
      </WebGLBoundary>
    </div>
  );
}
