"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface HorizontalScrollSectionProps {
  children: React.ReactNode;
  /** Extra scroll length as a multiple of viewport height. Default 2.5.
   *  Increase for more cards. (totalCards * 0.65) is a good heuristic. */
  scrollMultiplier?: number;
}

/**
 * HorizontalScrollSection
 * ──────────────────────────────────────────────────────────────────────
 * Pins the section, then translates its inner track horizontally
 * (right → left) as the user scrolls vertically — gallery / film-strip
 * style. Unpins automatically when the last card clears the viewport.
 *
 * Mobile (< 768px): pinning is disabled, children fall back to a normal
 * vertical flex column so touch scrolling is never hijacked.
 */
export default function HorizontalScrollSection({
  children,
  scrollMultiplier = 2.5,
}: HorizontalScrollSectionProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outer = outerRef.current;
    const track = trackRef.current;
    if (!outer || !track) return;

    /* ── Disable on mobile — never hijack touch scroll ── */
    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px)", () => {
      const outerEl = outerRef.current;
      const trackEl = trackRef.current;
      if (!outerEl || !trackEl) return;
      /* Capture as non-null so closures don't re-widen the type */
      const outer: HTMLDivElement = outerEl;
      const track: HTMLDivElement = trackEl;

      /* Measure how far we need to scroll the track horizontally.
         scrollWidth - offsetWidth = distance the track overflows. */
      function getScrollDistance() {
        return track.scrollWidth - outer.offsetWidth;
      }

      const st = ScrollTrigger.create({
        trigger: outer,
        start: "top top",
        /* end dynamically so the runway length matches the track width */
        end: () => `+=${getScrollDistance() * scrollMultiplier * 0.55}`,
        pin: true,
        pinSpacing: true,
        scrub: 1.2,  /* gentle lag — feels weighty, not snappy */
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate(self) {
          const dist = getScrollDistance();
          gsap.set(track, { x: -dist * self.progress });
        },
      });

      /* Refresh on resize so the end value stays accurate */
      window.addEventListener("resize", () => ScrollTrigger.refresh());

      return () => {
        st.kill();
      };
    });

    return () => mm.revert();
  }, [scrollMultiplier]);

  return (
    /* Outer: clips overflow, becomes the pin target */
    <div ref={outerRef} className="hscroll-outer">
      {/* Track: the wide flex row that slides left */}
      <div ref={trackRef} className="hscroll-track">
        {children}
      </div>
    </div>
  );
}
