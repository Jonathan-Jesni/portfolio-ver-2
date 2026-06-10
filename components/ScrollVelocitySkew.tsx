"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* ─────────────────────────────────────────────────────────────
   ScrollVelocitySkew — Velocity Skew (global polish layer)

   Fast scrolls give any [data-skew] block a tiny ±2° lean; when the
   scroll settles the block springs flat again. The lean is invisible
   to name but reads as physical, "weighty" motion.

   It derives velocity from the Lenis-driven window scroll position
   (px/sec) inside the GSAP ticker — so it NEVER touches the locked
   Lenis instance or its physics, and needs no ScrollTrigger internals.

   IMPORTANT — what gets [data-skew]: only transform-free, non-sticky,
   non-pinned text blocks. A skew (transform) on any ancestor of a
   pinned .stack-section would make position:fixed resolve against it
   and break the pinning, so we never skew section frames, sticky
   shells, CometCard tiles, or the physics pit — only safe editorial
   prose / CTA blocks.

   Desktop + full motion only; on mobile / reduced-motion the matchMedia
   branch never runs, so [data-skew] elements stay perfectly flat.
   ───────────────────────────────────────────────────────────── */
export default function ScrollVelocitySkew() {
  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add(
      "(min-width: 769px) and (prefers-reduced-motion: no-preference)",
      () => {
        const targets = gsap.utils.toArray<HTMLElement>("[data-skew]");
        if (!targets.length) return;

        /* One smoothed setter per target — quickTo eases toward the
           latest skew value every frame, giving the spring-back. */
        const setters = targets.map((el) =>
          gsap.quickTo(el, "skewY", { duration: 0.5, ease: "power3" })
        );

        let lastY = window.scrollY;

        /* gsap.ticker passes (time, deltaTime[ms]) — derive px/sec */
        const apply = (_time: number, deltaTime: number) => {
          const y = window.scrollY;
          const v = deltaTime > 0 ? ((y - lastY) / deltaTime) * 1000 : 0;
          lastY = y;
          const skew = gsap.utils.clamp(-2, 2, v / -500);
          for (const set of setters) set(skew);
        };

        gsap.ticker.add(apply);

        return () => {
          gsap.ticker.remove(apply);
          gsap.set(targets, { skewY: 0 });
        };
      }
    );

    return () => mm.revert();
  });

  return null;
}
