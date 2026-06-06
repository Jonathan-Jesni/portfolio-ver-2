"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import Image from "next/image";
import { PROJECTS } from "../lib/data";
import { ArrowUpRightIcon } from "./icons";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* ─── Accent hues per project ─────────────────────────────────────── */
const CARD_HUES: Record<string, string> = {
  ludex:            "210, 100%, 56%",  /* electric blue  */
  "file-converter": "155,  72%, 48%",  /* teal-green     */
  webguardian:      "  0,  82%, 58%",  /* crimson        */
  "synthetic-data": "270,  72%, 62%",  /* violet         */
};

export default function StickyDeckSection() {
  const sectionRef  = useRef<HTMLElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);

  const [activeIndex, setActiveIndex] = useState(0);

  useGSAP(() => {
    const imageCards = gsap.utils.toArray<HTMLElement>(".sd-img-card");
    if (imageCards.length < 1) return;

    imageCards.forEach((card, i) => {
      /* Crossfade the left text panel when this image card enters view */
      ScrollTrigger.create({
        trigger: card,
        start:   "top 60%",
        end:     "bottom 40%",
        onEnter:     () => setActiveIndex(i),
        onEnterBack: () => setActiveIndex(i),
      });

      /* Depth stacking: cards below the active one scale + blur out.
         For the last card, we use the .sd-spacer as the scroll trigger
         so it also fades back gracefully before the CTA appears. */
      const isLast = i === imageCards.length - 1;
      const nextEl = isLast ? document.querySelector(".sd-spacer") : imageCards[i + 1];

      gsap.to(card, {
        scale:   0.95,
        opacity: 0.5,
        filter:  "blur(2px)",
        ease:    "none",
        scrollTrigger: {
          trigger: nextEl,
          start:   "top 25vh",
          end:     isLast ? "bottom 60%" : "top 20%",
          scrub:   0.8,
        },
      });
    });
  }, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      className="sticky-deck-section"
      id="projects"
    >
      {/* ── Section header ─────────────────────────────────────────── */}
      <div className="container sd-header">
        <div className="section-label">
          <span className="section-title">Selected Work</span>
          <span className="section-line" />
        </div>
      </div>

      {/* ── Asymmetric split ─────────────────────────────────────────── */}
      <div className="sd-split">

        {/* ── LEFT: sticky glass text panel ───────────────────────── */}
        <div className="sd-split-left">
          <div className="sd-text-track">
            {PROJECTS.map((project, idx) => {
              const hue  = CARD_HUES[project.id] ?? "210, 80%, 56%";
              const tags = project.tags as readonly string[];
              const note = (project as { note?: string }).note;

              return (
                <div
                  key={project.id}
                  className={`sd-text-panel${activeIndex === idx ? " is-active" : ""}`}
                  aria-hidden={activeIndex !== idx}
                >
                  {/* Glass card shell */}
                  <div
                    className="sd-text-card"
                    style={{ "--card-hue": hue } as React.CSSProperties}
                  >
                    {/* Top-edge accent line matches the image card */}
                    <div className="sd-card-accent" aria-hidden="true" />

                    {/* Overline — matches old "Featured Project" */}
                    <p className="sd-text-overline mono">Featured Project</p>

                    {/* Title with inline subtitle — exactly as old design */}
                    <h3 className="sd-text-title">
                      {project.title}
                      <span className="sd-text-subtitle"> — {project.subtitle}</span>
                    </h3>

                    {/* Description */}
                    <p className="sd-text-description">{project.description}</p>

                    {/* Optional note (e.g. File Converter evolution note) */}
                    {note && (
                      <p className="sd-text-note mono">{note}</p>
                    )}

                    {/* Built with line — restored from old design */}
                    <p className="sd-text-built-with mono">
                      Built with: {project.tech}
                    </p>

                    {/* Tags */}
                    <ul className="sd-card-tags" aria-label="Technologies">
                      {tags.map((tag) => (
                        <li key={tag} className="sd-tag mono">{tag}</li>
                      ))}
                    </ul>

                    {/* GitHub link */}
                    <a
                      href={project.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sd-card-link sd-text-link"
                      id={`${project.id}-source-link`}
                      aria-label={`View ${project.title} source code on GitHub`}
                    >
                      <span>View Source</span>
                      <ArrowUpRightIcon />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: stacking image cards ─────────────────────────── */}
        <div ref={rightColRef} className="sd-split-right">
          {PROJECTS.map((project, idx) => {
            const hue     = CARD_HUES[project.id] ?? "210, 80%, 56%";
            const hasImg  = !!project.image;
            const hasPipe = !hasImg && "pipeline" in project;

            return (
              <div
                key={project.id}
                className="sd-img-card"
                style={{
                  "--card-index": idx,
                  "--card-hue":   hue,
                } as React.CSSProperties}
                id={`project-card-${project.id}`}
                aria-label={`Project visual: ${project.title}`}
              >
                <div className="sd-card-accent" aria-hidden="true" />

                {hasImg ? (
                  <div className="sd-img-frame">
                    <Image
                      src={project.image as string}
                      alt={(project as { imageAlt?: string | null }).imageAlt ?? project.title}
                      fill
                      sizes="(max-width: 900px) 100vw, 50vw"
                      className="sd-img"
                      priority={idx === 0}
                    />
                    <div className="sd-img-vignette" aria-hidden="true" />
                  </div>
                ) : hasPipe ? (
                  <div
                    className="sd-pipeline"
                    style={{ background: `hsl(${hue.split(",")[0]}, 22%, 5%)` }}
                    aria-label="Processing pipeline"
                  >
                    {(project as { pipeline: readonly string[] }).pipeline.map((step, si, arr) => (
                      <div key={step} className="sd-pipeline-step">
                        <span className="sd-pipeline-label mono">{step}</span>
                        {si < arr.length - 1 && (
                          <span className="sd-pipeline-arrow" aria-hidden="true">→</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className="sd-placeholder"
                    style={{ background: `hsl(${hue.split(",")[0]}, 16%, 6%)` }}
                    aria-hidden="true"
                  >
                    <span className="sd-placeholder-label mono">
                      {(project as any).title.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Spacer: gives the last card real scroll track to stick on.
              padding-bottom doesn't work — a physical child div does.   */}
          <div className="sd-spacer" aria-hidden="true" />
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="container sd-cta">
        <p>There&apos;s more on GitHub.</p>
        <a
          href="https://github.com/Jonathan-Jesni?tab=repositories"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline"
          id="projects-cta-btn"
        >
          View all repositories
        </a>
      </div>
    </section>
  );
}
