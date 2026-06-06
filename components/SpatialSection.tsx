"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface SpatialSectionProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export default function SpatialSection({
  id,
  children,
  className = "",
}: SpatialSectionProps) {
  const runwayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const runway = runwayRef.current;
      const content = contentRef.current;
      if (!runway || !content) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
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
            end: "bottom bottom",
            scrub: 1.5,
          },
        });

        // 0 → 0.38: section content drops in and locks into the reading plateau
        tl.to(
          content,
          {
            clipPath: "inset(0% 0 0% 0)",
            opacity: 1,
            y: 0,
            ease: "back.out(1.5)",
            duration: 0.38,
          },
          0
        );

        // 0.25 → 0.72: each .sp-reveal child snaps in, staggered
        reveals.forEach((el, i) => {
          tl.to(
            el,
            {
              clipPath: "inset(0 0 0% 0)",
              yPercent: 0,
              ease: "back.out(1.5)",
              duration: 0.12,
            },
            0.25 + i * 0.06
          );
        });

        // 0.72 → 1.0: graceful opacity exit
        tl.to(
          content,
          {
            opacity: 0,
            ease: "power1.in",
            duration: 0.28,
          },
          0.72
        );
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
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
    <section ref={runwayRef} id={id} className={`sp-runway ${className}`}>
      <div className="sp-sticky">
        <div ref={contentRef} className="sp-content">
          {children}
        </div>
      </div>
    </section>
  );
}
