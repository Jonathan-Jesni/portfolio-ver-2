"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* ─────────────────────────────────────────────────────────────
   HeadlineReveal — Kinetic Line-by-Line Reveal (global layer)

   Unifies the editorial header entrance across the sections that
   SpatialSection does NOT already drive — Projects (.sd-header) and
   About (.about-split-text). SpatialSection's own .sp-reveal handles
   the Building + Skills headers, so those are excluded here to avoid
   double-animating.

   Vocabulary is deliberately identical to SpatialSection's .sp-reveal:
   each line un-clips from a bottom mask (clipPath inset) while rising
   a few percent (yPercent), on a back.out ease. The eyebrow/meta row
   reveals first, the display heading a beat behind — a true line-by-
   line cascade of the header block.

   Scrub-tied to the header's entry so scrolling up rewinds it.
   Desktop + full motion only; mobile / reduced-motion never run the
   hidden initial state, so headers are simply shown flat.
   ───────────────────────────────────────────────────────────── */
export default function HeadlineReveal() {
  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add(
      "(min-width: 769px) and (prefers-reduced-motion: no-preference)",
      () => {
        /* Only headers SpatialSection isn't already revealing */
        const headers = gsap.utils
          .toArray<HTMLElement>(".ed-header")
          .filter((h) => !h.closest(".sp-content"));

        const triggers: ScrollTrigger[] = [];

        headers.forEach((header) => {
          const row = header.querySelector<HTMLElement>(".ed-header-row");
          const heading = header.querySelector<HTMLElement>(".ed-heading");
          const lines = [row, heading].filter(Boolean) as HTMLElement[];
          if (!lines.length) return;

          /* Hidden state — clipped behind a bottom mask, nudged down */
          gsap.set(lines, { clipPath: "inset(0 0 110% 0)", yPercent: 8 });

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: header,
              start: "top 92%",
              end: "top 48%",
              scrub: 1,
            },
          });
          if (tl.scrollTrigger) triggers.push(tl.scrollTrigger);

          lines.forEach((line, i) => {
            tl.to(
              line,
              {
                /* negative inset so serif italics / descenders never clip */
                clipPath: "inset(-20% -20% -20% -20%)",
                yPercent: 0,
                ease: "back.out(1.4)",
                duration: 0.5,
              },
              i * 0.18
            );
          });
        });

        return () => {
          triggers.forEach((t) => t.kill());
          const lines = headers.flatMap((h) =>
            [
              h.querySelector<HTMLElement>(".ed-header-row"),
              h.querySelector<HTMLElement>(".ed-heading"),
            ].filter(Boolean) as HTMLElement[]
          );
          gsap.set(lines, { clearProps: "clipPath,transform" });
        };
      }
    );

    return () => mm.revert();
  });

  return null;
}
