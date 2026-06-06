"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    /*
     * Official GSAP + Lenis integration pattern:
     * Drive Lenis from the GSAP ticker so ScrollTrigger's scrub
     * values stay frame-perfect with Lenis's eased scroll position.
     * This is required for position:sticky to work inside Lenis.
     */
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      anchors: true,
      allowNestedScroll: true,
    });

    /* Feed Lenis scroll position into ScrollTrigger every frame */
    lenis.on("scroll", ScrollTrigger.update);

    /* Drive Lenis from the GSAP ticker — keeps them frame-locked */
    gsap.ticker.add((time: number) => {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.off("scroll", ScrollTrigger.update);
      lenis.destroy();
      gsap.ticker.remove((time: number) => {
        lenis.raf(time * 1000);
      });
    };
  }, []);

  return <>{children}</>;
}
