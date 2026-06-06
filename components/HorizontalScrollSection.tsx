"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface HorizontalScrollSectionProps {
  children: React.ReactNode;
  /** Extra scroll length as a multiple of viewport height.
   *  (totalProjects * 0.7) is a good heuristic. */
  scrollMultiplier?: number;
}

const DEFAULT_BG = "#050505";

/**
 * HorizontalScrollSection
 * ──────────────────────────────────────────────────────────────────────
 * Pins the section and translates .hscroll-track horizontally via a
 * GSAP tween (not onUpdate/gsap.set) so we can use containerAnimation.
 *
 * Features:
 * ① Progress bar — glowing accent stripe at viewport bottom, fills L→R.
 * ② 3D Coverflow — each .sc-project-group enters with rotationY: -15 /
 *    scale: 0.8, centers perfectly, then exits with rotationY: 15 /
 *    scale: 0.8. All driven by containerAnimation (horizontal position).
 * ③ Room morph — .hscroll-outer background eases to each project's
 *    data-room-color as it centers in the viewport.
 *
 * Mobile (< 768px): everything disabled, children stack vertically.
 */
export default function HorizontalScrollSection({
  children,
  scrollMultiplier = 2.5,
}: HorizontalScrollSectionProps) {
  const outerRef       = useRef<HTMLDivElement>(null);
  const trackRef       = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px)", () => {
      const outerEl       = outerRef.current;
      const trackEl       = trackRef.current;
      const progressBarEl = progressBarRef.current;
      if (!outerEl || !trackEl || !progressBarEl) return;

      const outer:       HTMLDivElement = outerEl;
      const track:       HTMLDivElement = trackEl;
      const progressBar: HTMLDivElement = progressBarEl;

      function getScrollDistance() {
        return track.scrollWidth - outer.offsetWidth;
      }

      /* ── Coverflow: set initial state before tween is created ────────
       * Starting at scale 0.8 / rotationY -15 / opacity 0.4 ensures no
       * flash of full-opacity content on mount.
       */
      const groups = track.querySelectorAll<HTMLElement>(".sc-project-group");
      gsap.set(groups, { scale: 0.85, rotationY: -15, opacity: 0.4, transformPerspective: 1200 });

      /* ── Main scroll tween ───────────────────────────────────────────
       * gsap.to() drives the horizontal translation. Storing it in
       * `scrollTween` lets us pass it as containerAnimation to child
       * ScrollTriggers so they fire based on horizontal position.
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
            /* Progress bar scaleX mirrors tunnel progress */
            gsap.set(progressBar, { scaleX: self.progress });
          },
          onLeave() {
            gsap.to(progressBar, { opacity: 0, duration: 0.4, ease: "power2.out" });
          },
          onEnterBack() {
            gsap.to(progressBar, { opacity: 1, duration: 0.2 });
          },
          onLeaveBack() {
            /* Reset room to default when scrolled above the tunnel */
            gsap.to(outer, { backgroundColor: DEFAULT_BG, duration: 0.6, ease: "power2.out", overwrite: "auto" });
          },
        },
      });

      /* ── Per-group: coverflow + room morph ───────────────────────────
       * Three linked ScrollTriggers per group, all using containerAnimation.
       */
      const coverfTweens: (gsap.core.Tween | gsap.core.Timeline)[] = [];

      groups.forEach((group) => {
        const roomColor = group.dataset.roomColor ?? DEFAULT_BG;

        /* ── Enter: right edge → center ── */
        const enterTween = gsap.fromTo(
          group,
          { scale: 0.85, rotationY: -15, opacity: 0.4 },
          {
            scale: 1,
            rotationY: 0,
            opacity: 1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: group,
              containerAnimation: scrollTween,
              start: "left right",   /* group's left edge at viewport right */
              end: "center center",  /* group's center at viewport center   */
              scrub: true,
            },
          }
        );

        /* ── Exit: center → left edge leaves viewport ── */
        const exitTween = gsap.fromTo(
          group,
          { scale: 1, rotationY: 0, opacity: 1 },
          {
            scale: 0.85,
            rotationY: 15,
            opacity: 0.4,
            ease: "power2.in",
            scrollTrigger: {
              trigger: group,
              containerAnimation: scrollTween,
              start: "center center",  /* card is perfectly centered */
              end: "right left",       /* card's right edge leaves left side */
              scrub: true,
            },
          }
        );

        /* ── Room morph: fires when card center hits viewport center ── */
        const morphTrigger = ScrollTrigger.create({
          trigger: group,
          containerAnimation: scrollTween,
          start: "center center+=5%",  /* slight offset so it snaps cleanly */
          onEnter() {
            gsap.to(outer, {
              backgroundColor: roomColor,
              duration: 0.6,
              ease: "power2.out",
              overwrite: "auto",
            });
          },
          onEnterBack() {
            gsap.to(outer, {
              backgroundColor: roomColor,
              duration: 0.6,
              ease: "power2.out",
              overwrite: "auto",
            });
          },
        });

        coverfTweens.push(enterTween, exitTween);
        coverfTweens.push(morphTrigger as unknown as gsap.core.Tween);
      });

      const onResize = () => ScrollTrigger.refresh();
      window.addEventListener("resize", onResize);

      return () => {
        scrollTween.kill();
        coverfTweens.forEach((t) => t.kill());
        window.removeEventListener("resize", onResize);
      };
    });

    return () => mm.revert();
  }, { scope: outerRef, dependencies: [scrollMultiplier] });

  return (
    <div ref={outerRef} className="hscroll-outer">
      <div ref={trackRef} className="hscroll-track">
        {children}
      </div>
      <div ref={progressBarRef} className="hscroll-progress-bar" />
    </div>
  );
}
