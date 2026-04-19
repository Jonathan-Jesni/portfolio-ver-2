"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import ParticleField from "./ParticleField";

export default function Scene() {
  return (
    <div className="canvas-container">
      <Canvas
        camera={{
          position: [0, 0, 20],
          fov: 60,
          near: 0.1,
          far: 200,
        }}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "high-performance",
        }}
        dpr={[1, 1.5]}
        style={{ background: "#000000" }}
      >
        <Suspense fallback={null}>
          <color attach="background" args={["#000000"]} />
          <fog attach="fog" args={["#000000", 50, 150]} />
          <ParticleField />
        </Suspense>
      </Canvas>
    </div>
  );
}
