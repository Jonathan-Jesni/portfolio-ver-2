/* eslint-disable react-hooks/purity */
/* eslint-disable react-hooks/immutability */
"use client";

import { useRef, useMemo, Suspense } from "react";
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
useTexture.preload("/assets/textures/bg.jpg");
useTexture.preload("/assets/textures/Mac Keyboard.jpg");

/* ─────────────────────────────────────────────────────────────────────
   DOT GRID — Background Physics Grid (Unchanged)
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
    gl_PointSize = 1.8;
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
  const screenTex = useTexture("/assets/textures/bg.jpg");
  const keyboardTex = useTexture("/assets/textures/Mac Keyboard.jpg");

  const globalContainerRef = useRef<THREE.Group>(null);
  const lidHingeGroupRef = useRef<THREE.Group>(null);
  const { camera, size } = useThree();

  // Texture mapping & material calibrations
  useMemo(() => {
    if (screenTex) {
      screenTex.flipY = false;
      screenTex.colorSpace = THREE.SRGBColorSpace;
    }
    if (keyboardTex) {
      keyboardTex.flipY = false;
      keyboardTex.colorSpace = THREE.SRGBColorSpace;
    }

    // The screen face must render the page texture EXACTLY (it crossfades
    // into the real DOM at the hero → projects boundary):
    //  - emissive-only (base map nulled, color black) so scene lights
    //    can't brighten or tint it,
    //  - toneMapped false so ACES tone mapping doesn't shift the obsidian
    //    background away from the DOM's #070B14,
    //  - anisotropy keeps the texture crisp at grazing zoom angles.
    if (materials.Image) {
      materials.Image.map = null;
      materials.Image.color?.set?.("#000000");
      materials.Image.emissiveMap = screenTex;
      materials.Image.emissive = new THREE.Color("#ffffff");
      materials.Image.emissiveIntensity = 1.0;
      materials.Image.toneMapped = false;
      materials.Image.metalness = 0;
      materials.Image.roughness = 1;
      materials.Image.needsUpdate = true;
    }
    if (screenTex) screenTex.anisotropy = 8;
    if (materials.Screen) {
      materials.Screen.roughness = 0.2;
      materials.Screen.metalness = 0.1;
    }
    // Map keyboard keys texture
    if (materials.Keys) {
      materials.Keys.map = keyboardTex;
      materials.Keys.roughness = 0.5;
      materials.Keys.metalness = 0.1;
      materials.Keys.needsUpdate = true;
    }
    // High-end matte silver look for the chassis body
    if (materials.Laptop) {
      materials.Laptop.roughness = 0.4;
      materials.Laptop.metalness = 0.1;
      materials.Laptop.color.set("#d1d5db");
    }
    if (materials.Keyboard) {
      materials.Keyboard.roughness = 0.5;
      materials.Keyboard.metalness = 0.1;
    }
  }, [screenTex, keyboardTex, materials]);

  useGSAP(() => {
    if (!globalContainerRef.current || !lidHingeGroupRef.current) return;

    // Phase 0: Initialize hardware positions before scrolling starts
    // Force the laptop lid to its physically closed rotation state
    lidHingeGroupRef.current.rotation.x = 1.7285;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: "#hero",
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        /* re-resolve the functional camera targets (cover-fit) on resize */
        invalidateOnRefresh: true,
      },
    });

    // Phase 1 (0% to 40% scroll): Calibration & Center Dolly
    // Smoothly open the laptop lid (1.7285 rad -> 0 rad)
    tl.to(
      lidHingeGroupRef.current.rotation,
      {
        x: 0,
        duration: 0.4,
        ease: "power2.inOut",
      },
      0
    );

    // Translate global container X from 1.7 to 0
    tl.to(
      globalContainerRef.current.position,
      {
        x: 0,
        duration: 0.4,
        ease: "power2.inOut",
      },
      0
    );

    // Un-tilt global container to [0.1577, 0, 0]
    // (0.1577 rad tilts the base forward perfectly so the 99-degree open screen becomes parallel to the viewport)
    tl.to(
      globalContainerRef.current.rotation,
      {
        x: 0.1577,
        y: 0,
        z: 0,
        duration: 0.4,
        ease: "power2.inOut",
      },
      0
    );

    // Phase 2 (75% to 100% scroll): Camera Dolly — "cover-fit" plunge.
    // ┌─────────────────────────────────────────────────────────────┐
    // │ The plunge ends with the display face EXACTLY filling the   │
    // │ viewport (CSS background-size: cover semantics), because    │
    // │ the boundary crossfade dissolves this face into the real    │
    // │ Projects header DOM — scale must match at the handoff.      │
    // │                                                             │
    // │ FACE_* constants are the display face's world-space rect at │
    // │ the END state of the open/untilt timeline (lid x=0,         │
    // │ container rot [0.1577,0,0], pos x=0), measured from the GLB.│
    // └─────────────────────────────────────────────────────────────┘
    const FACE_CY = 0.6879;     // face center Y (world)
    const FACE_FRONT_Z = -0.8689; // face front plane Z (world)
    const FACE_HALF_W = 1.4766;
    const FACE_HALF_H = 0.9485;
    const coverZ = () => {
      const t = Math.tan(THREE.MathUtils.degToRad(45 / 2)); // fov 45 vertical
      const aspect = size.width / Math.max(1, size.height);
      // closest distance at which the face still covers BOTH axes;
      // 0.95 pull-in pushes the display's ROUNDED CORNERS fully out of
      // frame (a flush 1.0 fit leaves bezel slivers at the corners) —
      // the ~5% scale overshoot at the crossfade is imperceptible
      const d = Math.min(FACE_HALF_H / t, FACE_HALF_W / (aspect * t)) * 0.95;
      return FACE_FRONT_Z + d;
    };
    tl.to(
      camera.position,
      {
        z: coverZ,        // functional + invalidateOnRefresh → responsive
        y: FACE_CY,       // dead center of the display face
        duration: 0.25,   // 0.75 -> 1.00
        ease: "power2.inOut",
      },
      0.75
    );

    // Force perfect planar alignment so the lens is completely flush/parallel
    tl.to(
      camera.rotation,
      {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.25,
        ease: "power2.inOut",
      },
      0.75
    );

    // Phase 3 — Boundary Crossfade (replaces the old 98% hard hot-swap).
    //
    // At hero scrub end the display face is full-bleed (cover-fit above)
    // showing the captured Projects header. Across the next viewport of
    // scroll — until the REAL #projects header pins at the viewport top —
    // the canvas layer is held fixed and dissolved out, so the texture
    // page melts into the identical DOM page with no cut.
    //
    //   window: [#hero bottom == viewport bottom] → [#projects top == top]
    //   onEnter:    sticky → fixed (same visual position), above sheets
    //   scrub:      projects revealed at t0; layer opacity 1 → 0 late-
    //               weighted (power2.in) so the rising page only shows
    //               through near the end, where it's almost settled
    //   onLeave:    display:none — frees compositing, restores clicks
    //   reverse:    every step mirrors back (clearProps restores the
    //               stylesheet's sticky/z-index and the mobile
    //               display:none media query — never hard-code those)
    const layerEl = canvasWrapperDOMRef.current?.closest<HTMLElement>(".hero-3d-layer");
    const projectsEl = portfolioSectionRef?.current;
    if (layerEl && projectsEl && canvasWrapperDOMRef.current) {
      const fadeTl = gsap.timeline({
        scrollTrigger: {
          trigger: "#hero",
          start: "bottom bottom",
          endTrigger: projectsEl,
          end: "top top",
          scrub: true,
          onEnter: () => gsap.set(layerEl, { position: "fixed", top: 0, left: 0, zIndex: 30 }),
          onLeaveBack: () => gsap.set(layerEl, { clearProps: "position,top,left,zIndex" }),
          onLeave: () => gsap.set(layerEl, { display: "none" }),
          onEnterBack: () => gsap.set(layerEl, { clearProps: "display" }),
        },
      });

      fadeTl
        /* 0.001, not 0: zero-time sets in a scrubbed timeline don't
           revert when the scrub reverses past the start — the wrapper
           would keep pointerEvents:none back in the hero and kill the
           laptop's drag interaction. */
        .set(projectsEl, { opacity: 1, pointerEvents: "auto" }, 0.001)
        .set(canvasWrapperDOMRef.current, { pointerEvents: "none" }, 0.001)
        .to(layerEl, { opacity: 0, ease: "power2.in", duration: 1 }, 0);
    }

  }, [camera, size, canvasWrapperDOMRef, portfolioSectionRef]);

  return (
    <group
      ref={globalContainerRef}
      position={[1.7, 0, 0]}
      rotation={[0.18, -0.35, 0.05]}
    >
      {/* Nested scale group defines global size and base positioning */}
      <group scale={[10, 10, 10]} position={[0, -0.65, 0]}>
        {/* Render base chassis in local flat space */}
        <primitive object={nodes.Base_Chassis} />

        {/* The Perfect Pivot Anchor Wrapper Tree */}
        {/* ZERO-OFFSET HINGE TRACKING MATRICES: DO NOT MODIFY */}
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
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
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
