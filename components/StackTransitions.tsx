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
      /* Overlay nodes we inject (e.g. the CRT bezel-iris) — torn down on revert */
      const createdEls: HTMLElement[] = [];

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

        /* ── Boundary 0 · Projects → Building — CRT collapse (no shader) ──
           A fixed, full-viewport layer is the whole trick: scaling it about
           its own centre IS the viewport centre, so the blade forms dead
           centre regardless of how the tall, pinned Projects section sits.

             · a dark void establishes over the outgoing deck
             · a champagne field SQUASHES scaleY 1 → 0.005 while its
               brightness is driven sky-high, concentrating into a blinding
               gold blade across the centre of the void
             · the blade PINCHES scaleX 1 → 0 inward from both sides and
               winks out as the void clears, revealing the Building bento

           Fully scrub-tied — scrolling up rewinds the whole power cycle. */
        if (i === 0) {
          const fx = document.createElement("div");
          fx.className = "crt-fx";
          fx.setAttribute("aria-hidden", "true");
          fx.innerHTML =
            '<div class="crt-fx__void"></div>' +
            '<div class="crt-fx__blade"></div>';
          document.body.appendChild(fx);
          createdEls.push(fx);

          const voidEl = fx.querySelector<HTMLElement>(".crt-fx__void");
          const blade = fx.querySelector<HTMLElement>(".crt-fx__blade");

          /* the dark void establishes over the pinned deck … */
          if (voidEl) {
            tl.fromTo(
              voidEl,
              { opacity: 0 },
              { opacity: 1, ease: "power2.out", duration: 0.22 },
              0
            );
            /* … then clears right at the end to reveal Building underneath */
            tl.to(voidEl, { opacity: 0, ease: "power2.in", duration: 0.2 }, 0.74);
          }

          if (blade) {
            /* champagne field flicks on … */
            tl.fromTo(
              blade,
              { opacity: 0 },
              { opacity: 0.95, ease: "power1.out", duration: 0.12 },
              0.04
            );
            /* … then SQUASHES into a blade while brightness goes sky-high */
            tl.fromTo(
              blade,
              { scaleY: 1, scaleX: 1, transformOrigin: "center center", filter: "brightness(1)" },
              { scaleY: 0.005, filter: "brightness(3.4)", ease: "power3.in", duration: 0.5 },
              0.06
            );
            /* PINCH — the blade winks inward from left + right, then gone */
            tl.to(blade, { scaleX: 0, ease: "power2.in", duration: 0.3 }, 0.6);
            tl.to(blade, { opacity: 0, ease: "none", duration: 0.05 }, 0.9);
          }
        } else if (veil) {
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

      return () => {
        createdEls.forEach((el) => el.remove());
      };
    });

    return () => mm.revert();
  });

  return null;
}
