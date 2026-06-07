"use client";

import { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame, extend, useThree } from "@react-three/fiber";
import { shaderMaterial, PresentationControls, Float } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ─────────────────────────────────────────────────────────────────────
   DOT GRID — Premium CPU Physics + GPU Twinkle
   ───────────────────────────────────────────────────────────────── */
const dotGridVertexShader = /* glsl */ `
  uniform float uTime;
  attribute float aSeed;
  varying float vOpacity;

  void main() {
    // ── 1. Twinkle — noise from seed + time ──
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
  const { size, camera } = useThree();

  // Physics constants
  const repelRadius = 1.4;
  const repelForce = 0.04;
  const returnSpeed = 0.08;
  const friction = 0.82;

  // Initialize data buffers
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

    // Convert mouse NDC to World Space (Z=0 plane)
    const aspect = size.width / size.height;
    const halfH = 2.693; // tan(45/2) * 6.5
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

      // 1. Mouse Repulsion
      const dx = cx - mx;
      const dy = cy - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < repelRadius && dist > 0.001) {
        const force = Math.pow(1.0 - dist / repelRadius, 2.0) * repelForce;
        vx += (dx / dist) * force;
        vy += (dy / dist) * force;
      }

      // 2. Spring return to base position
      vx += (bx - cx) * returnSpeed;
      vy += (by - cy) * returnSpeed;

      // 3. Friction
      vx *= friction;
      vy *= friction;

      // 4. Update positions
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
      trigger: "#hero",
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
