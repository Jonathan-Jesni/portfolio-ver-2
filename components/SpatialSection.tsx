"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { refreshScrollTargets } from "../lib/scrollTarget";
import {
  IMMERSIVE_SCROLL_MEDIA_QUERY,
  TOUCH_MEDIA_QUERY,
} from "../lib/mediaQueries";

gsap.registerPlugin(ScrollTrigger);

type SpatialChapter = "building" | "skills";

interface SpatialSectionProps {
  id: string;
  children: ReactNode;
  className?: string;
  chapter?: SpatialChapter;
}

const phaseFor = (chapter: SpatialChapter) =>
  chapter === "building"
    ? { travel: 220, entry: 60, hold: 120, landing: 60, touchDuration: 1.1 }
    : { travel: 210, entry: 50, hold: 110, landing: 50, touchDuration: 0.9 };

function exposeCompleteContent(
  content: HTMLElement,
  targets: HTMLElement[],
) {
  gsap.killTweensOf([content, ...targets]);
  gsap.set([content, ...targets], {
    opacity: 1,
    y: 0,
    yPercent: 0,
    filter: "none",
    clipPath: "none",
  });
}

export default function SpatialSection({
  id,
  children,
  className = "",
  chapter = id === "skills" ? "skills" : "building",
}: SpatialSectionProps) {
  const runwayRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const phase = phaseFor(chapter);

  useEffect(() => {
    const runway = runwayRef.current;
    const content = contentRef.current;
    if (!runway || !content) return;

    const ctx = gsap.context(() => {
      const reveals = Array.from(
        content.querySelectorAll<HTMLElement>(".sp-reveal"),
      );
      const heading =
        content.querySelector<HTMLElement>("[data-chapter-heading]") ??
        content.querySelector<HTMLElement>(".ed-header") ??
        reveals[0] ??
        content;
      const cards = Array.from(
        content.querySelectorAll<HTMLElement>(
          "[data-building-card], [data-chapter-card], .pipeline-card",
        ),
      );
      const support = reveals.filter(
        (element) => element !== heading && !cards.includes(element),
      );
      const completeTargets = Array.from(
        new Set<HTMLElement>([heading, ...reveals, ...cards, ...support]),
      );

      exposeCompleteContent(content, completeTargets);
      const mm = gsap.matchMedia();

      try {
        mm.add(IMMERSIVE_SCROLL_MEDIA_QUERY, () => {
          try {
            const timeline = gsap.timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                trigger: runway,
                start: "top top",
                end: "bottom bottom",
                scrub: true,
                invalidateOnRefresh: true,
                onRefresh: () => refreshScrollTargets([id]),
              },
            });

            if (chapter === "building") {
              gsap.set(heading, { opacity: 0, y: 28, filter: "none" });
              gsap.set(support, { opacity: 0, y: 18, filter: "none" });
              gsap.set(cards, { opacity: 0, y: 34, filter: "none" });

              timeline.to(
                heading,
                {
                  opacity: 1,
                  y: 0,
                  ease: "power3.out",
                  duration: 24,
                },
                12,
              );
              timeline.to(
                support,
                {
                  opacity: 1,
                  y: 0,
                  ease: "power3.out",
                  stagger: 3,
                  duration: 22,
                },
                18,
              );
              timeline.to(
                cards,
                {
                  opacity: 1,
                  y: 0,
                  ease: "power3.out",
                  stagger: 5,
                  duration: 30,
                },
                24,
              );

              timeline.to(
                [...cards, ...support],
                {
                  opacity: 0,
                  y: -18,
                  ease: "power2.in",
                  stagger: 5,
                  duration: 48,
                },
                phase.hold + 20,
              );
              timeline.to(
                heading,
                {
                  opacity: 0,
                  y: -12,
                  ease: "power2.in",
                  duration: 38,
                },
                phase.travel - 38,
              );
            } else {
              gsap.set(heading, { opacity: 0, y: 24, filter: "none" });
              gsap.set(support, { opacity: 0, y: 18, filter: "none" });

              timeline.to(
                heading,
                {
                  opacity: 1,
                  y: 0,
                  ease: "power3.out",
                  duration: 28,
                },
                0,
              );
              timeline.to(
                support,
                {
                  opacity: 1,
                  y: 0,
                  ease: "power3.out",
                  stagger: 4,
                  duration: 32,
                },
                12,
              );
              timeline.to(
                [heading, ...support],
                {
                  opacity: 0,
                  y: -14,
                  ease: "power2.in",
                  stagger: 5,
                  duration: 70,
                },
                phase.hold,
              );
            }

            return () => {
              timeline.scrollTrigger?.kill();
              timeline.kill();
              exposeCompleteContent(content, completeTargets);
            };
          } catch {
            exposeCompleteContent(content, completeTargets);
            window.dispatchEvent(new CustomEvent("portfolio:motion-failed"));
          }
        });

        mm.add(
          TOUCH_MEDIA_QUERY,
          () => {
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
              exposeCompleteContent(content, completeTargets);
              return;
            }

            const targets =
              chapter === "building"
                ? [heading, ...support, ...cards]
                : [heading, ...support];
            gsap.set(targets, { opacity: 0, y: 12, filter: "blur(3px)" });

            const finite = gsap.timeline({ paused: true });
            finite.to(
              [heading, ...support, ...cards],
              {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                duration: phase.touchDuration * 0.7,
                stagger: 0.05,
                ease: "power3.out",
              },
              phase.touchDuration * 0.15,
            );

            const trigger = ScrollTrigger.create({
              trigger: runway,
              start: "top 82%",
              end: "bottom 18%",
              onEnter: () => finite.play(),
              onEnterBack: () => finite.play(),
              onLeave: () => finite.progress(1).pause(),
              onLeaveBack: () => finite.reverse(),
            });

            return () => {
              trigger.kill();
              finite.kill();
              exposeCompleteContent(content, completeTargets);
            };
          },
        );
      } catch {
        exposeCompleteContent(content, completeTargets);
        window.dispatchEvent(new CustomEvent("portfolio:motion-failed"));
      }

      return () => mm.revert();
    }, runway);

    return () => ctx.revert();
  }, [chapter, id, phase.hold, phase.touchDuration, phase.travel]);

  return (
    <section
      ref={runwayRef}
      className={`sp-runway ${className}`}
      data-chapter={chapter}
      style={
        {
          position: "relative",
          "--chapter-landing": `${phase.landing}svh`,
        } as CSSProperties
      }
    >
      <div
        id={id}
        className="chapter-marker chapter-marker--landing"
        data-scroll-landing={id}
        data-scroll-landing-clearance="none"
        aria-hidden="true"
      />
      <div
        className="chapter-marker chapter-marker--spy"
        data-scroll-spy={id}
        data-scroll-spy-clearance="none"
        aria-hidden="true"
      />
      <div className="sp-sticky">
        <div ref={contentRef} className="sp-content">
          {children}
        </div>
      </div>
    </section>
  );
}
