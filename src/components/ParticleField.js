"use client";

import { useRef, useMemo, useCallback, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { vertexShader, fragmentShader } from "@/shaders/particles";
import { scrollState } from "./SmoothScroll";

const PARTICLE_COUNT = 10000;
const FIELD_SPREAD = 30;
const FIELD_DEPTH = 120;

export default function ParticleField() {
  const pointsRef = useRef();
  const materialRef = useRef();
  const mouseTarget = useRef(new THREE.Vector2(0, 0));
  const mouseCurrent = useRef(new THREE.Vector2(0, 0));
  const mouseIntensity = useRef(0);
  const prevMouse = useRef(new THREE.Vector2(0, 0));

  const { size } = useThree();

  // Generate particle attributes
  const { positions, scales, speeds } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const scales = new Float32Array(PARTICLE_COUNT);
    const speeds = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      // Distribute particles in a cylindrical tunnel volume
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.pow(Math.random(), 0.5) * FIELD_SPREAD;

      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = Math.sin(angle) * radius;
      positions[i3 + 2] = (Math.random() - 0.3) * FIELD_DEPTH;

      scales[i] = 0.3 + Math.random() * 1.2;
      speeds[i] = 0.5 + Math.random() * 2.0;
    }

    return { positions, scales, speeds };
  }, []);

  // Shader material uniforms
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uScrollProgress: { value: 0 },
      uMouseIntensity: { value: 0 },
    }),
    []
  );

  // Use window-level mouse tracking (since the canvas gets pointer-events
  // but the scroll-content layer sits on top for scroll events)
  useEffect(() => {
    const onMouseMove = (e) => {
      mouseTarget.current.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );
    };
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  // Animation loop
  useFrame((state) => {
    if (!materialRef.current) return;

    // Smooth mouse interpolation
    mouseCurrent.current.lerp(mouseTarget.current, 0.08);

    // Calculate mouse velocity for intensity
    const mouseVel = mouseCurrent.current
      .clone()
      .sub(prevMouse.current)
      .length();
    prevMouse.current.copy(mouseCurrent.current);

    // Intensity ramps up fast, decays slowly
    const targetIntensity = Math.min(mouseVel * 15, 1.0);
    mouseIntensity.current +=
      (targetIntensity - mouseIntensity.current) *
      (targetIntensity > mouseIntensity.current ? 0.3 : 0.02);

    // Update uniforms
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    materialRef.current.uniforms.uMouse.value.copy(mouseCurrent.current);
    materialRef.current.uniforms.uScrollProgress.value = scrollState.progress;
    materialRef.current.uniforms.uMouseIntensity.value =
      mouseIntensity.current;

    // Drive camera Z from scroll progress
    // Fly from z=20 to z=-80 as user scrolls
    const targetZ = 20 - scrollState.progress * 100;
    state.camera.position.z += (targetZ - state.camera.position.z) * 0.05;

    // Subtle camera sway from mouse
    state.camera.position.x +=
      (mouseCurrent.current.x * 2 - state.camera.position.x) * 0.02;
    state.camera.position.y +=
      (mouseCurrent.current.y * 1.5 - state.camera.position.y) * 0.02;

    state.camera.lookAt(0, 0, state.camera.position.z - 30);
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={PARTICLE_COUNT}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aScale"
          array={scales}
          count={PARTICLE_COUNT}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aSpeed"
          array={speeds}
          count={PARTICLE_COUNT}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
