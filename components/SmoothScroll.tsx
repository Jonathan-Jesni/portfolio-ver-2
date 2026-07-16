"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { setLenis } from "../lib/lenisInstance";
import { shouldUseSmoothScroll } from "../lib/motionEnvironment";
import { IMMERSIVE_SCROLL_MEDIA_QUERY } from "../lib/mediaQueries";

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const media = window.matchMedia(IMMERSIVE_SCROLL_MEDIA_QUERY);
    let lenis: Lenis | null = null;
    let tickerFn: ((time: number) => void) | null = null;
    let refreshFrame = 0;

    const stop = () => {
      if (!lenis) {
        setLenis(null);
        return;
      }

      setLenis(null);
      lenis.off("scroll", ScrollTrigger.update);
      if (tickerFn) gsap.ticker.remove(tickerFn);
      lenis.destroy();
      lenis = null;
      tickerFn = null;
    };

    const start = () => {
      if (lenis || !shouldUseSmoothScroll()) return;

      /*
       * Drive Lenis from the GSAP ticker so ScrollTrigger's scrub values
       * remain frame-perfect with the eased scroll position.
       */
      lenis = new Lenis({
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
      tickerFn = (time: number) => {
        lenis?.raf(time * 1000);
      };
      gsap.ticker.add(tickerFn);
      gsap.ticker.lagSmoothing(0);
    };

    const sync = () => {
      if (media.matches) start();
      else stop();

      cancelAnimationFrame(refreshFrame);
      refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh());
    };

    media.addEventListener("change", sync);
    sync();

    return () => {
      cancelAnimationFrame(refreshFrame);
      media.removeEventListener("change", sync);
      stop();
    };
  }, []);

  return <>{children}</>;
}
