"use client";

import dynamic from "next/dynamic";
import SmoothScroll from "@/components/SmoothScroll";
import ScrollIndicator from "@/components/ScrollIndicator";

// Dynamic import Scene with SSR disabled – Three.js needs the browser
const Scene = dynamic(() => import("@/components/Scene"), { ssr: false });

export default function ClientLayout({ children }) {
  return (
    <SmoothScroll>
      <Scene />
      <ScrollIndicator />
      <div className="scroll-content">{children}</div>
    </SmoothScroll>
  );
}
