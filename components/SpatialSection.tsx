"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface SpatialSectionProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  /* ScrollTrigger `end` for the reveal scrub — controls how much scroll the
     drop-in is spread across. Larger = slower glide. Must stay shorter than
     the runway height so a settled hold tail remains for the boundary
     slide-over (see .sp-runway in globals.css). */
  revealEnd?: string;
  /* Where the nav's scroll-to anchor sits, as % down the runway. Must stay
     below (runwayHeight − nextSectionOverlapMargin − 100vh) / runwayHeight,
     or the next section's overlap margin (see .stack-section--* in
     globals.css) will already be bleeding into view when landed on. Default
     55% is safe for runway/margin combos with more headroom; nav-linked
     sections with tighter overlap (e.g. Skills) should pass a lower value. */
  anchorPercent?: number;
}

export default function SpatialSection({
  id,
  children,
  className = "",
  revealEnd = "top top+=240%",
  anchorPercent = 55,
}: SpatialSectionProps) {
  const runwayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const runway = runwayRef.current;
      const content = contentRef.current;
      if (!runway || !content) return;

      const mm = gsap.matchMedia();

      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        // Query .sp-reveal children inside the content block
        const reveals = Array.from(
          content.querySelectorAll<HTMLElement>(".sp-reveal")
        );

        // ---- Initial states ----
        gsap.set(content, { opacity: 0, clipPath: "inset(100% 0 0% 0)", y: -60 });
        reveals.forEach((el) => {
          gsap.set(el, { clipPath: "inset(0 0 110% 0)", yPercent: 6 });
        });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: runway,
            start: "top top",
            // The reveal is spread across `revealEnd` of scroll (default 240vh)
            // for a smooth glide-in, leaving the rest of the runway as a settled
            // hold for the boundary slide-over. Per-section so Building and
            // Skills can pace independently (see globals.css runway heights).
            end: revealEnd,
            scrub: 2,
          },
        });

        // section content drops in and locks into the reading plateau —
        // gentle power ease (no overshoot) over a long window so it glides
        tl.to(
          content,
          {
            clipPath: "inset(0% 0 0% 0)",
            opacity: 1,
            y: 0,
            ease: "power2.out",
            duration: 0.5,
          },
          0
        );

        // each .sp-reveal child eases in, staggered, after the content settles
        reveals.forEach((el, i) => {
          tl.to(
            el,
            {
              clipPath: "inset(-20% -20% -20% -20%)",
              yPercent: 0,
              ease: "power2.out",
              duration: 0.22,
            },
            0.30 + i * 0.10
          );
        });

        // Exit is handled by the StackTransitions sheet choreography —
        // content stays visible while the next section slides over it.
      });

      mm.add("(max-width: 767px), (prefers-reduced-motion: reduce)", () => {
        /* Fade in on scroll entry only — no clip-path, no transforms */
        gsap.set(content, { opacity: 0 });

        ScrollTrigger.create({
          trigger: runway,
          start: "top 80%",
          once: true,
          onEnter: () => {
            gsap.to(content, { opacity: 1, duration: 0.4, ease: "power1.out" });
          },
        });
      });

      return () => mm.revert();
    }, runwayRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={runwayRef} className={`sp-runway ${className}`} style={{ position: "relative" }}>
      {/* Anchor target placed anchorPercent down the runway so content is
          settled but the nav landing stays clear of the next section's
          overlap margin (see anchorPercent doc above). */}
      <div id={id} style={{ position: "absolute", top: `${anchorPercent}%`, width: "100%", pointerEvents: "none" }} aria-hidden="true" />
      <div className="sp-sticky">
        <div ref={contentRef} className="sp-content">
          {children}
        </div>
      </div>
    </section>
  );
}
