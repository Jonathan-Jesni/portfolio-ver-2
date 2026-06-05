"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface HorizontalScrollSectionProps {
  children: React.ReactNode;
  /** Extra scroll length as a multiple of viewport height. Default 2.5.
   *  Increase for more projects. (totalProjects * 0.7) is a good heuristic. */
  scrollMultiplier?: number;
}

/**
 * HorizontalScrollSection
 * ──────────────────────────────────────────────────────────────────────
 * Pins the section, then translates its inner track horizontally
 * (right → left) as the user scrolls vertically — gallery / film-strip
 * style. Unpins automatically when the last card clears the viewport.
 *
 * Features:
 * - Progress bar: a 3px accent line at the bottom of the viewport that
 *   fills from left→right as the user scrolls through the tunnel.
 * - Cinematic group reveals: each .sc-project-group fades + slides in
 *   from the right as it enters the viewport, driven by containerAnimation
 *   so the trigger fires on horizontal position, not vertical scroll.
 *
 * Mobile (< 768px): pinning, progress bar, and reveals are all disabled.
 * Children fall back to a normal vertical flex column.
 */
export default function HorizontalScrollSection({
  children,
  scrollMultiplier = 2.5,
}: HorizontalScrollSectionProps) {
  const outerRef       = useRef<HTMLDivElement>(null);
  const trackRef       = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    /* ── Disable on mobile — never hijack touch scroll ── */
    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px)", () => {
      const outerEl       = outerRef.current;
      const trackEl       = trackRef.current;
      const progressBarEl = progressBarRef.current;
      if (!outerEl || !trackEl || !progressBarEl) return;

      /* Capture as non-null consts so closures never re-widen the type */
      const outer:       HTMLDivElement = outerEl;
      const track:       HTMLDivElement = trackEl;
      const progressBar: HTMLDivElement = progressBarEl;

      /* Total horizontal overflow the track needs to travel */
      function getScrollDistance() {
        return track.scrollWidth - outer.offsetWidth;
      }

      /* ── Cinematic group reveals ──────────────────────────────────────
       * Set all groups to their initial "off-screen" state before the
       * ScrollTrigger is created, so there's no flash of full-opacity content.
       */
      const groups = track.querySelectorAll<HTMLElement>(".sc-project-group");
      gsap.set(groups, { opacity: 0.08, x: 80 });

      /* ── Main scroll tween ───────────────────────────────────────────
       * We expose this tween as `scrollTween` and pass it as
       * containerAnimation to each group's ScrollTrigger. This is the
       * official GSAP pattern for triggers inside a pinned horizontal
       * scroll — the child ST fires based on horizontal progress, not
       * vertical scroll position.
       */
      const scrollTween = gsap.to(track, {
        x: () => -getScrollDistance(),
        ease: "none",
        scrollTrigger: {
          trigger: outer,
          start: "top top",
          end: () => `+=${getScrollDistance() * scrollMultiplier * 0.55}`,
          pin: true,
          pinSpacing: true,
          scrub: 1.2,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate(self) {
            /* Progress bar fills left-to-right */
            gsap.set(progressBar, { scaleX: self.progress });
          },
          onLeave() {
            /* Fade progress bar out once the tunnel is fully scrolled */
            gsap.to(progressBar, { opacity: 0, duration: 0.4, ease: "power2.out" });
          },
          onEnterBack() {
            /* Restore progress bar when user scrolls back into tunnel */
            gsap.to(progressBar, { opacity: 1, duration: 0.2 });
          },
        },
      });

      /* ── Per-group cinematic reveal ──────────────────────────────────
       * Each group gets its own ScrollTrigger with containerAnimation pointing
       * to the scrollTween. GSAP then evaluates the trigger's start/end in the
       * tween's coordinate space (horizontal pixels), not the page scroll.
       */
      const revealTweens: gsap.core.Tween[] = [];

      groups.forEach((group) => {
        const tween = gsap.to(group, {
          opacity: 1,
          x: 0,
          duration: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: group,
            containerAnimation: scrollTween,
            start: "left right",   /* fires when group's left edge hits viewport right */
            end: "left center",
            scrub: false,          /* one-shot animation, not scrubbed */
            toggleActions: "play none none reverse",
          },
        });
        revealTweens.push(tween);
      });

      /* Refresh on resize so end value and scroll distance stay accurate */
      const onResize = () => ScrollTrigger.refresh();
      window.addEventListener("resize", onResize);

      return () => {
        scrollTween.kill();
        revealTweens.forEach((t) => t.kill());
        window.removeEventListener("resize", onResize);
      };
    });

    return () => mm.revert();
  }, [scrollMultiplier]);

  return (
    /* Outer: clips overflow, becomes the GSAP pin target */
    <div ref={outerRef} className="hscroll-outer">
      {/* Track: the wide flex row that slides left */}
      <div ref={trackRef} className="hscroll-track">
        {children}
      </div>
      {/* Progress bar: fills left→right as tunnel is scrolled */}
      <div ref={progressBarRef} className="hscroll-progress-bar" />
    </div>
  );
}
