"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import gsap from "gsap";

export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Initialise Lenis — do NOT pass autoRaf: true because we drive the
    // raf loop through the GSAP ticker so ScrollTrigger stays in sync.
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Allow hash-link navigation (our nav anchors) to keep working
      anchors: true,
      // Let nested scrollable elements (e.g. modals) scroll natively
      allowNestedScroll: true,
    });

    // Keep GSAP ScrollTrigger in sync with Lenis — the official pattern
    // from the Lenis docs (time is in seconds, lenis.raf expects ms)
    gsap.ticker.add((time: number) => {
      lenis.raf(time * 1000);
    });

    // Remove GSAP's built-in lag compensation so there's no jitter
    // between the ticker and Lenis's animation frame
    gsap.ticker.lagSmoothing(0);

    return () => {
      // Clean up on unmount: remove the ticker callback and destroy Lenis
      gsap.ticker.remove((time: number) => {
        lenis.raf(time * 1000);
      });
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
