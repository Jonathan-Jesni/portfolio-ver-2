"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { burnControls } from "../lib/burnControls";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* ─────────────────────────────────────────────────────────────
   StackTransitions — "String-Tune" boundary choreography

   Every element marked [data-stack] becomes a sheet in a deck.
   At each generic boundary the outgoing section pins to the
   viewport (pinSpacing: false, so the incoming section keeps
   flowing and physically slides over it) while a scrub-tied
   timeline:

     · scales the outgoing sheet back and nudges it upward
     · fades in its obsidian veil (depth cue)
     · un-clips the incoming sheet from a rounded, inset "card"
       into a full-bleed surface as it reaches the top

   Two boundaries override the generic recipe:
     · 0 (Projects → Building) adds the CRT-collapse overlay
     · 3 (About → Contact) is the WebGL burn — no pin at all;
       see the dedicated block inside the loop

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

/* Index i = transition from stack section i to i+1.
   (About → Contact has no entry: boundary 3 is the WebGL burn and
   never reads this config.) */
const BOUNDARIES: BoundaryConfig[] = [
  { scale: 0.94, y: -4, veil: 0.32, inset: 3, radius: 44 }, /* Projects → Building  (sheet) */
  { scale: 0.97, y: -14, veil: 0.22, inset: 0, radius: 36 }, /* Building → Skills    (push)  */
  { scale: 0.92, y: -2, veil: 0.40, inset: 4, radius: 52 }, /* Skills   → About     (deep)  */
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

        /* ═══════════════════════════════════════════════════════════════
           Boundary 3 · About → Contact — BURN AWAY (sticky, NO pin)

           Contact is held dead-still at top:0 with position:sticky, NOT a
           ScrollTrigger pin. The Contact section lives in a 200vh runway
           (.contact-runway) with its content sticky (.contact-sticky) —
           the same robust pattern AboutSection uses, and the one the
           Lenis integration is explicitly built to support.

           Why no pin: a ScrollTrigger pin that *engages* while Lenis
           momentum carries the scroll across its start point — right at
           the bottom of the page — locks the main thread in a refresh
           loop and hard-freezes the tab. This happened with BOTH
           pinSpacing modes. Sticky is pure CSS: nothing toggles, nothing
           resizes, nothing can feed back.

           This trigger only READS scroll (scrub, no pin): it scrubs the
           burn 0 → 1 across the runway's 100vh of sticky travel, fires
           the headline at the midpoint, and toggles the overlay's alpha.

           Overlap geometry (globals.css, desktop + full-motion only):
           .about-runway grows to 350vh (words finish at 150vh) and
           .contact-runway is pulled up by -200vh, so for the WHOLE burn
           window BOTH stickies sit overlapped dead-still at top:0 —
           About (z6, opaque sticky) above, Contact (z5) hidden beneath.
           The swap happens in place: unburned shader pixels are
           TRANSPARENT (the real About DOM shows through — no shroud
           pop), and a clip-path wipe on .about-sticky rides exactly
           behind the ember front's centerline (enters ~0.23, tops out
           ~0.80), removing About just as the fire chars it to reveal
           Contact through the burn holes. clip-path also clips
           hit-testing, so the spent About never blocks Contact's links.
           ═══════════════════════════════════════════════════════════════ */
        if (i === 3) {
          const aboutSticky = section.querySelector<HTMLElement>(".about-sticky");
          const burnProxy = { value: 0 };
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: next,
              start: "top top",
              end: "bottom bottom",
              scrub: 1,
              onToggle: (self) => burnControls.setActive(self.isActive),
            },
          });

          // Drive the burn amount + force a demand-render every tick.
          tl.to(
            burnProxy,
            {
              value: 1,
              ease: "none",
              duration: 1,
              onUpdate: () => {
                burnControls.setProgress(burnProxy.value);
                burnControls.invalidate();
              },
            },
            0
          );

          // Wipe the real About DOM bottom-up, riding exactly behind the
          // shader's front centerline: with field = mix(noise, uv.y, 0.72)
          // and p = mix(-0.15, 1.12, progress), the front enters the
          // bottom at progress ≈ 0.23 and exits the top at ≈ 0.80. The
          // ember band + char trail straddle the straight clip line, so
          // its raggedness is hidden inside the glow.
          if (aboutSticky) {
            tl.fromTo(
              aboutSticky,
              { clipPath: "inset(0% 0% 0% 0%)" },
              { clipPath: "inset(0% 0% 100% 0%)", ease: "none", duration: 0.57 },
              0.23
            );
          }

          // Pointer handoff — a transparent box still hit-tests, so the
          // About wrapper (z6, overlapping Contact for the whole burn and
          // parked over it at page bottom) would be a glass wall over
          // Contact's links forever. The instant the fire clears the
          // button region (~0.45) the wrapper stops intercepting; the
          // zero-duration set reverts automatically on scroll-back.
          tl.set(section, { pointerEvents: "none" }, 0.45);

          // Roll the contact headline in as the burn crosses its
          // midpoint; direction-aware so it re-arms on scroll-up.
          tl.call(
            () => {
              const forward = tl.scrollTrigger ? tl.scrollTrigger.direction === 1 : true;
              burnControls.fireHeadline(forward);
            },
            undefined,
            0.5
          );

          return; // skip all generic slide/scale/clip choreography
        }

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
        // Park the burn overlay (transparent + idle) when the desktop
        // context reverts — e.g. resize below 768px or unmount.
        burnControls.setActive(false);
        burnControls.setProgress(0);
        burnControls.invalidate();
      };
    });

    return () => mm.revert();
  });

  return null;
}
