"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import Image from "next/image";
import { PROJECTS } from "../lib/data";
import { ArrowUpRightIcon } from "./icons";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* ─── Accent hues per project — used only for the subtle glow on the
       active card's top edge. Keeps the OLED dark palette intact while
       giving each card a unique identity marker.                        ─── */
const CARD_HUES: Record<string, string> = {
  ludex:             "210, 100%, 56%",   /* electric blue  */
  "file-converter":  "155, 72%,  48%",   /* teal-green     */
  webguardian:       "  0,  82%, 58%",   /* crimson        */
  "synthetic-data":  "270,  72%, 62%",   /* violet         */
};

/* ─── How many viewport-height units of scroll each card consumes.
       Increase to make the stacking feel slower / more deliberate.     ─── */
const SCROLL_PER_CARD = 1.0;

export default function StickyDeckSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const deckRef    = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const cards = gsap.utils.toArray<HTMLElement>(".sd-card");
    if (cards.length < 2) return;

    cards.forEach((card, i) => {
      if (i === cards.length - 1) return;

      /*
       * Jakub principle: blur signals depth loss, scale signals physical
       * recession. Use gsap.to() with its own duration + ease so the
       * animation has its own physics, decoupled from raw scroll speed.
       * scrub: true (pure scrub) would feel mechanical — this feels weighted.
       */
      gsap.to(card, {
        scale:   0.94,
        opacity: 0.5,
        filter:  "blur(2px)",
        ease:    "none",          /* scrub handles easing; ease:none is correct here */
        scrollTrigger: {
          trigger: cards[i + 1],
          start:   "top 88px",   /* when the next card's top hits just below the nav */
          end:     "top 20%",    /* by the time it's well above the fold */
          scrub:   1.2,          /* 1.2s lag — feels weighted, not instant */
        },
      });
    });
  }, { scope: sectionRef });


  /* Total scroll height: section-padding + (cards × SCROLL_PER_CARD × 100vh)
     The last card needs no extra scroll; subtract one unit.             */
  const totalScrollVh = `${PROJECTS.length * SCROLL_PER_CARD * 100}px`;

  return (
    <section
      ref={sectionRef}
      className="sticky-deck-section"
      id="projects"
      style={{ "--total-scroll": totalScrollVh } as React.CSSProperties}
    >
      {/* ── Section header ─────────────────────────────────────────────── */}
      <div className="container sd-header">
        <div className="section-label">
          <span className="section-title">Selected Work</span>
          <span className="section-line" />
        </div>
      </div>

      {/* ── The deck — each card pins via position:sticky ──────────────── */}
      <div ref={deckRef} className="sd-deck">
        {PROJECTS.map((project, idx) => {
          const hue     = CARD_HUES[project.id] ?? "210, 80%, 56%";
          const hasImg  = !!project.image;
          const hasPipe = !hasImg && "pipeline" in project;
          const tags    = project.tags as readonly string[];

          return (
            <article
              key={project.id}
              className="sd-card"
              style={{
                "--card-index": idx,
                "--card-hue": hue
              } as React.CSSProperties}
              id={`project-card-${project.id}`}
              aria-label={`Project: ${project.title}`}
            >
              {/* ── Top-edge accent line: each card's unique colour ── */}
              <div className="sd-card-accent" aria-hidden="true" />

              <div className="sd-card-inner">

                {/* ──────── Left col: metadata + copy ──────────────── */}
                <div className="sd-card-body">

                  <header className="sd-card-header">
                    <span className="sd-card-index mono" aria-hidden="true">
                      {(idx + 1).toString().padStart(2, "0")}
                    </span>
                    <div className="sd-card-titles">
                      <h3 className="sd-card-title">{project.title}</h3>
                      <p  className="sd-card-subtitle mono">{project.subtitle}</p>
                    </div>
                  </header>

                  <p className="sd-card-description">{project.description}</p>

                  <footer className="sd-card-footer">
                    <ul className="sd-card-tags" aria-label="Technologies">
                      {tags.map((tag) => (
                        <li key={tag} className="sd-tag mono">{tag}</li>
                      ))}
                    </ul>

                    <a
                      href={project.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sd-card-link"
                      id={`${project.id}-source-link`}
                      aria-label={`View ${project.title} source code on GitHub`}
                    >
                      <span>View Source</span>
                      <ArrowUpRightIcon />
                    </a>
                  </footer>
                </div>

                {/* ──────── Right col: visual ───────────────────────── */}
                <div className="sd-card-visual">
                  {hasImg ? (
                    <div className="sd-img-frame">
                      <Image
                        src={project.image as string}
                        alt={(project as { imageAlt?: string | null }).imageAlt ?? project.title}
                        fill
                        sizes="(max-width: 767px) 100vw, 45vw"
                        className="sd-img"
                        priority={idx === 0}
                      />
                      {/* Inner vignette — blends image into the card surface */}
                      <div className="sd-img-vignette" aria-hidden="true" />
                    </div>
                  ) : hasPipe ? (
                    /* Pipeline visualisation ─────────────────────────── */
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
                    /* Generic tinted placeholder ─────────────────────── */
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

              </div>
            </article>
          );
        })}
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
