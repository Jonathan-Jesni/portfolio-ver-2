"use client";

import { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame, extend, useThree } from "@react-three/fiber";
import { shaderMaterial, PresentationControls, Float } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ─────────────────────────────────────────────────────────────────────
   DOT GRID — GPU particle background
   All physics (repulsion, spring-return, twinkle) live in GLSL.
   The only CPU work is writing uMouse once per mousemove event.
   ───────────────────────────────────────────────────────────────── */
const dotGridVertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2  uMouse;      // NDC -1..+1 per axis, canvas-local
  uniform float uRepelRadius;  // world-units repulsion radius
  uniform float uRepelStrength;
  uniform float uAspect;     // canvas W/H for correct NDC→world mapping

  attribute float aSeed;   // per-vertex random [0,1] for twinkle

  varying float vOpacity;

  void main() {
    // ── 1. Start at rest position ──
    vec3 pos = position;

    // ── 2. Convert mouse from NDC → world-space XY ──
    // Camera sits at z=6.5 with fov=45. At z=0 plane:
    //   half_h = tan(fov/2) * 6.5  ≈  2.69
    //   half_w = half_h * aspect
    float halfH = 2.693;
    float halfW = halfH * uAspect;
    vec2 mouseWorld = vec2(uMouse.x * halfW, uMouse.y * halfH);

    // ── 3. Repulsion ──
    vec2  delta = pos.xy - mouseWorld;
    float dist  = length(delta);
    if (dist < uRepelRadius && dist > 0.0001) {
      // Smooth falloff: strongest at center, zero at edge
      float strength = pow(1.0 - dist / uRepelRadius, 2.5) * uRepelStrength;
      pos.xy += normalize(delta) * strength;
    }

    // ── 4. Twinkle — noise from seed + time ──
    float twinkle = 0.5 + 0.5 * sin(uTime * (1.2 + aSeed * 2.8) + aSeed * 6.2831);
    // Occasional bright flash
    float flash = step(0.97, fract(aSeed * 17.31 + uTime * (0.08 + aSeed * 0.12)));
    vOpacity = mix(0.04, 0.18, twinkle) + flash * 0.22;

    gl_Position  = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 1.8;
  }
`;

const dotGridFragmentShader = /* glsl */ `
  varying float vOpacity;

  void main() {
    // Soft circular dot (anti-aliased disc inside gl_PointSize quad)
    vec2  uv   = gl_PointCoord - 0.5;
    float disc = 1.0 - smoothstep(0.35, 0.5, length(uv));
    gl_FragColor = vec4(1.0, 1.0, 1.0, vOpacity * disc);
  }
`;

const DotGridMaterial = shaderMaterial(
  {
    uTime:          0,
    uMouse:         new THREE.Vector2(0, 0),
    uRepelRadius:   1.1,
    uRepelStrength: 0.55,
    uAspect:        1.0,
  },
  dotGridVertexShader,
  dotGridFragmentShader
);

extend({ DotGridMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    dotGridMaterial: React.PropsWithChildren<{
      ref?:            React.Ref<THREE.ShaderMaterial & DotGridUniforms>;
      uTime?:          number;
      uMouse?:         THREE.Vector2;
      uRepelRadius?:   number;
      uRepelStrength?: number;
      uAspect?:        number;
      transparent?:    boolean;
      depthWrite?:     boolean;
    }>;
  }
}

interface DotGridUniforms {
  uTime:          number;
  uMouse:         THREE.Vector2;
  uRepelRadius:   number;
  uRepelStrength: number;
  uAspect:        number;
}

function DotGrid() {
  const matRef  = useRef<THREE.ShaderMaterial & DotGridUniforms>(null);
  const { size } = useThree();

  // Build flat grid geometry once
  const [geometry, seedAttr] = useMemo(() => {
    const cols = 80;
    const rows = 45;
    const spacingX = 0.175;
    const spacingY = 0.175;
    const totalW = (cols - 1) * spacingX;
    const totalH = (rows - 1) * spacingY;

    const positions = new Float32Array(cols * rows * 3);
    const seeds     = new Float32Array(cols * rows);
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        positions[idx * 3 + 0] = c * spacingX - totalW / 2;
        positions[idx * 3 + 1] = r * spacingY - totalH / 2;
        positions[idx * 3 + 2] = 0;
        seeds[idx] = Math.random();
        idx++;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const seedBuf = new THREE.BufferAttribute(seeds, 1);
    geo.setAttribute('aSeed', seedBuf);
    return [geo, seedBuf] as const;
  }, []);

  useFrame((state, delta) => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uTime      += delta;
    mat.uMouse.copy(state.pointer);
    mat.uAspect     = size.width / size.height;
  });

  return (
    <points geometry={geometry}>
      <dotGridMaterial
        ref={matRef}
        transparent
        depthWrite={false}
      />
    </points>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   VERTEX SHADER
   uExplodeProgress 0→1: pushes vertices out along their normals with
   strong lateral (X/Y) bias so the center clears completely by ~0.6.
   ─────────────────────────────────────────────────────────────────── */
const vertexShader = /* glsl */ `
  uniform float uExplodeProgress;
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
  }

  void main() {
    vNormal = normalize(normalMatrix * normal);

    vec3 pos = position;

    if (uExplodeProgress > 0.0) {
      float rand      = hash(floor(position * 3.5));
      float randAngle = rand * 6.28318;
      float randPhase = rand * 3.14159;

      vec3 explodeDir = normalize(normal);
      explodeDir.x += sin(randAngle) * 2.2;
      explodeDir.y += cos(randAngle) * 1.8 + 0.4;
      explodeDir.z *= 0.12;

      // Ease-in²: centre clears fast, shards keep drifting
      float progress = uExplodeProgress * uExplodeProgress;
      float dist     = 12.0 * progress;
      pos += normalize(explodeDir) * dist;

      // Slow weightless float when fully exploded
      pos.x += sin(uTime * 0.35 + randAngle) * 0.07 * uExplodeProgress;
      pos.y += cos(uTime * 0.25 + randPhase) * 0.07 * uExplodeProgress;
    }

    vec4 worldPos  = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position    = projectionMatrix * viewMatrix * worldPos;
  }
`;

/* ─────────────────────────────────────────────────────────────────────
   FRAGMENT SHADER
   Stealth-wealth OLED: near-black fill, electric cyan + deep violet
   Fresnel edges, world-space CRT scanlines, glitch chromatic burst.
   ─────────────────────────────────────────────────────────────────── */
const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uGlitch;
  uniform float uExplodeProgress;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3  viewDir  = normalize(cameraPosition - vWorldPosition);
    float cosTheta = max(dot(normalize(vNormal), viewDir), 0.0);
    float fresnel  = pow(1.0 - cosTheta, 2.2);

    float scan = sin(vWorldPosition.y * 42.0 + uTime * 2.0) * 0.5 + 0.5;
    scan = pow(scan, 7.0) * 0.55;

    vec3 cyan   = vec3(0.0,   0.918, 1.0);
    vec3 violet = vec3(0.333, 0.0,   0.8);
    vec3 dark   = vec3(0.012, 0.0,   0.027);

    vec3 edgeColor = mix(violet, cyan, fresnel);

    float glitchPulse = uGlitch * step(0.45, fract(sin(uTime * 80.0) * 43758.5));
    vec3  glitched    = vec3(
      edgeColor.r + glitchPulse * 0.45,
      edgeColor.g,
      edgeColor.b - glitchPulse * 0.25
    );

    vec3 finalColor = mix(dark, glitched, fresnel * 0.65 + scan * 0.35);
    float alpha = (fresnel * 0.55 + scan * 0.30 + 0.04)
                * mix(1.0, 0.45, uExplodeProgress);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

/* ─── Custom shader material ────────────────────────────────────────── */
const HologramMaterial = shaderMaterial(
  { uTime: 0, uExplodeProgress: 0, uGlitch: 0 },
  vertexShader,
  fragmentShader
);

extend({ HologramMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    hologramMaterial: React.PropsWithChildren<{
      ref?: React.Ref<THREE.ShaderMaterial & {
        uTime: number;
        uExplodeProgress: number;
        uGlitch: number;
      }>;
      uTime?: number;
      uExplodeProgress?: number;
      uGlitch?: number;
      transparent?: boolean;
      side?: THREE.Side;
      depthWrite?: boolean;
    }>;
  }
}

/* ─────────────────────────────────────────────────────────────────────
   POSITIONED CORE
   useThree gives us the R3F viewport in world-units. We use its width
   to shift the mesh rightward so it sits in the right-hand 45% of the
   screen, even though the Canvas covers the full hero viewport.
   ─────────────────────────────────────────────────────────────────── */
interface CyberCoreProps {
  explodeRef: React.MutableRefObject<number>;
}

function CyberCore({ explodeRef }: CyberCoreProps) {
  const { viewport } = useThree();

  const matRef = useRef<THREE.ShaderMaterial & {
    uTime: number;
    uExplodeProgress: number;
    uGlitch: number;
  }>(null);

  const groupRef       = useRef<THREE.Group>(null);
  const glitchRef      = useRef(0);
  const glitchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Icosahedron detail=5 → 5120 triangles
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1.9, 5), []);

  // Right-hand offset: place the model at ~27.5% from the right edge
  // (mirrors the CSS grid's 45fr right column center)
  const xOffset = viewport.width * 0.255;

  useFrame((_, delta) => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uTime            += delta;
    mat.uExplodeProgress  = explodeRef.current;
    mat.uGlitch           = glitchRef.current;
  });

  function triggerGlitch() {
    glitchRef.current = 1;
    if (glitchTimerRef.current) clearTimeout(glitchTimerRef.current);
    glitchTimerRef.current = setTimeout(() => {
      glitchRef.current = 0;
    }, 280);
  }

  return (
    <group ref={groupRef} position={[xOffset, 0, 0]}>
      <Float speed={1.1} rotationIntensity={0.25} floatIntensity={0.55}>
        <PresentationControls
          global={false}
          snap={true}
          speed={1.6}
          zoom={1}
          polar={[-Math.PI / 3, Math.PI / 3]}
          azimuth={[-Math.PI / 1.4, Math.PI / 1.4]}
        >
          <mesh geometry={geometry} onPointerDown={triggerGlitch}>
            <hologramMaterial
              ref={matRef}
              transparent={true}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>

          {/* Inner energy core visible through the hologram gaps */}
          <mesh>
            <sphereGeometry args={[0.55, 24, 24]} />
            <meshBasicMaterial
              color="#00eaff"
              transparent={true}
              opacity={0.06}
            />
          </mesh>
        </PresentationControls>
      </Float>
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   INTERACTIVE MODEL — top-level export
   The Canvas is now a full-hero absolute layer so shards can fly
   across the entire screen without being clipped by the CSS column.
   pointer-events: none on the wrapper lets scroll pass through,
   but the <canvas> itself re-enables pointer-events for drag.
   ─────────────────────────────────────────────────────────────────── */
export default function InteractiveModel() {
  const explodeRef  = useRef(0);

  useEffect(() => {
    const st = ScrollTrigger.create({
      trigger: "#hero-runway",
      start:   "top top",
      end:     "bottom bottom",
      scrub:   true,
      onUpdate(self) {
        // Explosion starts at 12% scroll, fully dispersed by 68%
        const raw = (self.progress - 0.12) / 0.56;
        explodeRef.current = Math.max(0, Math.min(1, raw));
      },
    });

    return () => st.kill();
  }, []);

  return (
    // Full hero coverage — pointer-events:none so scroll isn't blocked
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
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
          pointerEvents: "auto",   // re-enable so drag works on the canvas
          touchAction: "none",
          display: "block",
        }}
      >
        {/* DotGrid renders BEFORE CyberCore so it is behind the hologram */}
        <DotGrid />
        <CyberCore explodeRef={explodeRef} />
      </Canvas>

      {/* Drag hint — sits in the lower-right quadrant to match the model */}
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
            color: "rgba(0, 234, 255, 0.3)",
          }}
        >
          Drag to interact
        </span>
      </div>
    </div>
  );
}
