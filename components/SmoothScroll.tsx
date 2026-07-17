"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { setLenis } from "../lib/lenisInstance";
import { IMMERSIVE_SCROLL_MEDIA_QUERY } from "../lib/mediaQueries";

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    /*
     * Drive Lenis from the GSAP ticker so ScrollTrigger's scrub values
     * remain frame-perfect with the eased scroll position.
     */
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) =>
        Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // The chapter coordinator owns every in-page destination.
      anchors: false,
      allowNestedScroll: true,
    });

    setLenis(lenis);
    lenis.on("scroll", ScrollTrigger.update);
    const tickerFn = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerFn);
    gsap.ticker.lagSmoothing(0);

    /* Many components (StackTransitions, ContactSection, etc.) key their
       own ScrollTriggers off this same immersive/touch boundary and
       rebuild them when it's crossed (resize, orientation change, DevTools
       device toggle). Schedule a refresh once those contexts have settled
       so ScrollTrigger's cached start/end positions don't go stale. */
    const media = window.matchMedia(IMMERSIVE_SCROLL_MEDIA_QUERY);
    let refreshFrame = 0;
    const scheduleRefresh = () => {
      cancelAnimationFrame(refreshFrame);
      refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh());
    };
    media.addEventListener("change", scheduleRefresh);

    return () => {
      cancelAnimationFrame(refreshFrame);
      media.removeEventListener("change", scheduleRefresh);
      setLenis(null);
      lenis.off("scroll", ScrollTrigger.update);
      gsap.ticker.remove(tickerFn);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
