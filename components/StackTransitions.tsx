"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* ─────────────────────────────────────────────────────────────
   StackTransitions — "String-Tune" boundary choreography

   Every element marked [data-stack] becomes a sheet in a deck.
   At each boundary the outgoing section pins to the viewport
   (pinSpacing: false, so the incoming section keeps flowing and
   physically slides over it) while a scrub-tied timeline:

     · scales the outgoing sheet back and nudges it upward
     · fades in its obsidian veil (depth cue)
     · un-clips the incoming sheet from a rounded, inset "card"
       into a full-bleed surface as it reaches the top

   scrub: 1 keeps everything bound to scroll — scrolling up
   rewinds the transition frame-perfectly.
   ───────────────────────────────────────────────────────────── */

interface BoundaryConfig {
  /** End scale of the outgoing sheet */
  scale: number;
  /** End yPercent of the outgoing sheet (negative = pushed up) */
  y: number;
  /** Peak opacity of the outgoing sheet's veil */
  veil: number;
  /** Side inset (%) of the incoming sheet's clip at entry */
  inset: number;
  /** Top corner radius (px) of the incoming sheet at entry */
  radius: number;
}

/* Index i = transition from stack section i to i+1 */
const BOUNDARIES: BoundaryConfig[] = [
  { scale: 0.94, y: -4, veil: 0.32, inset: 3, radius: 44 }, /* Projects → Building  (sheet) */
  { scale: 0.97, y: -14, veil: 0.22, inset: 0, radius: 36 }, /* Building → Skills    (push)  */
  { scale: 0.92, y: -2, veil: 0.40, inset: 4, radius: 52 }, /* Skills   → About     (deep)  */
  { scale: 0.95, y: -6, veil: 0.30, inset: 0, radius: 32 }, /* About    → Contact   (slide) */
];

export default function StackTransitions() {
  useGSAP(() => {
    const sections = gsap.utils.toArray<HTMLElement>("[data-stack]");
    if (sections.length < 2) return;

    const mm = gsap.matchMedia();

    /* Desktop + full motion only — on mobile and reduced-motion the
       sections flow natively with no pinning */
    mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      sections.forEach((section, i) => {
        const next = sections[i + 1];
        if (!next) return;

        const cfg = BOUNDARIES[Math.min(i, BOUNDARIES.length - 1)];
        const veil = section.querySelector<HTMLElement>(":scope > .stack-veil");

        /* Pin the outgoing sheet for exactly the 100vh it takes the
           incoming sheet to travel across the viewport */
        ScrollTrigger.create({
          trigger: section,
          start: "bottom bottom",
          endTrigger: next,
          end: "top top",
          pin: true,
          pinSpacing: false,
        });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: next,
            start: "top bottom",
            end: "top top",
            scrub: 1,
          },
        });

        tl.to(
          section,
          {
            scale: cfg.scale,
            yPercent: cfg.y,
            transformOrigin: "center top",
            ease: "none",
          },
          0
        );

        if (veil) {
          /* Color-temperature drift: as a sheet is buried it doesn't just
             darken — it cools off the blue ground (#070B14) toward the
             warmer neutral obsidian ink (#121613), reading as physical
             depth/distance. Data-only; rides the same scrub. */
          tl.fromTo(
            veil,
            { backgroundColor: "#070B14", opacity: 0 },
            { backgroundColor: "#121613", opacity: cfg.veil, ease: "none" },
            0
          );
        }

        tl.fromTo(
          next,
          {
            clipPath: `inset(0% ${cfg.inset}% 0% ${cfg.inset}% round ${cfg.radius}px ${cfg.radius}px 0px 0px)`,
          },
          {
            clipPath: "inset(0% 0% 0% 0% round 0px 0px 0px 0px)",
            ease: "none",
          },
          0
        );
      });
    });

    return () => mm.revert();
  });

  return null;
}
