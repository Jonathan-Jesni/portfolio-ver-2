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
  circuit: SVGElement[],
) {
  gsap.killTweensOf([content, ...targets, ...circuit]);
  gsap.set([content, ...targets], {
    opacity: 1,
    y: 0,
    yPercent: 0,
    filter: "none",
    clipPath: "none",
  });
  gsap.set(circuit, {
    opacity: 1,
    strokeDasharray: 1,
    strokeDashoffset: 0,
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
      const circuit = Array.from(
        content.querySelectorAll<SVGElement>(
          "[data-circuit-draw], [data-circuit-glow], [data-circuit-runner]",
        ),
      );
      const support = reveals.filter(
        (element) => element !== heading && !cards.includes(element),
      );
      const completeTargets = Array.from(
        new Set<HTMLElement>([heading, ...reveals, ...cards, ...support]),
      );

      exposeCompleteContent(content, completeTargets, circuit);
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
              gsap.set(circuit, {
                opacity: 0,
                strokeDasharray: 1,
                strokeDashoffset: 1,
              });
              gsap.set(heading, { opacity: 0, y: 28, filter: "blur(4px)" });
              gsap.set(support, { opacity: 0, y: 18, filter: "blur(3px)" });
              gsap.set(cards, { opacity: 0, y: 34, filter: "blur(4px)" });

              timeline.to(
                circuit,
                {
                  opacity: 1,
                  strokeDashoffset: 0,
                  duration: 24,
                },
                0,
              );
              timeline.to(
                heading,
                {
                  opacity: 1,
                  y: 0,
                  filter: "blur(0px)",
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
                  filter: "blur(0px)",
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
                  filter: "blur(0px)",
                  ease: "power3.out",
                  stagger: 5,
                  duration: 30,
                },
                24,
              );

              /* Circuit drains first, then cards, then heading. */
              timeline.to(
                circuit,
                {
                  strokeDashoffset: -1,
                  opacity: 0.15,
                  duration: 32,
                },
                phase.hold,
              );
              timeline.to(
                [...cards, ...support],
                {
                  opacity: 0,
                  y: -18,
                  filter: "blur(3px)",
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
                  filter: "blur(3px)",
                  ease: "power2.in",
                  duration: 38,
                },
                phase.travel - 38,
              );
            } else {
              gsap.set(heading, { opacity: 0, y: 24, filter: "blur(4px)" });
              gsap.set(support, { opacity: 0, y: 18, filter: "blur(3px)" });

              timeline.to(
                heading,
                {
                  opacity: 1,
                  y: 0,
                  filter: "blur(0px)",
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
                  filter: "blur(0px)",
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
                  filter: "blur(2px)",
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
              exposeCompleteContent(content, completeTargets, circuit);
            };
          } catch {
            exposeCompleteContent(content, completeTargets, circuit);
            window.dispatchEvent(new CustomEvent("portfolio:motion-failed"));
          }
        });

        mm.add(
          TOUCH_MEDIA_QUERY,
          () => {
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
              exposeCompleteContent(content, completeTargets, circuit);
              return;
            }

            const targets =
              chapter === "building"
                ? [heading, ...support, ...cards, ...circuit]
                : [heading, ...support];
            gsap.set(targets, { opacity: 0, y: 12, filter: "blur(3px)" });
            gsap.set(circuit, {
              strokeDasharray: 1,
              strokeDashoffset: 1,
            });

            const finite = gsap.timeline({ paused: true });
            if (circuit.length) {
              finite.to(
                circuit,
                {
                  opacity: 1,
                  y: 0,
                  filter: "blur(0px)",
                  strokeDashoffset: 0,
                  duration: phase.touchDuration * 0.45,
                  ease: "power2.out",
                },
                0,
              );
            }
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
              exposeCompleteContent(content, completeTargets, circuit);
            };
          },
        );
      } catch {
        exposeCompleteContent(content, completeTargets, circuit);
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
