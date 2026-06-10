"use client";

import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import Image from "next/image";
import { PROJECTS } from "../lib/data";
import { ArrowUpRightIcon } from "./ui/icons";
import { CometCard } from "@/components/ui/comet-card";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* ─── Accent hues per project ─────────────────────────────────────── */
const CARD_HUES: Record<string, string> = {
  ludex:            "214, 84%, 64%",  /* sapphire       */
  "file-converter": "158, 48%, 52%",  /* muted jade     */
  "double-unet":    "  6, 64%, 60%",  /* burnt coral    */
  synthrescue:      "268, 52%, 66%",  /* dusty violet   */
};

export default function StickyDeckSection({ portfolioSectionRef }: { portfolioSectionRef?: React.RefObject<HTMLElement | null> }) {
  const fallbackRef = useRef<HTMLElement>(null);
  const sectionRef = portfolioSectionRef || fallbackRef;
  const rightColRef = useRef<HTMLDivElement>(null);

  /* Flatten the projects array so multi-image projects render separate physical cards */
  const flattenedCards: {
    projectIndex: number;
    project: typeof PROJECTS[number];
    type: "image" | "pipeline" | "placeholder";
    imageUrl?: string;
    imageAlt?: string;
    key: string;
  }[] = [];

  PROJECTS.forEach((project, pIdx) => {
    if ('images' in project && project.images && project.images.length > 0) {
      project.images.forEach((img, i) => {
        flattenedCards.push({
          projectIndex: pIdx,
          project: project,
          type: "image",
          imageUrl: img,
          imageAlt: project.imageAlts?.[i] ?? project.title,
          key: `${project.id}-img-${i}`,
        });
      });
    } else if ('pipeline' in project && project.pipeline) {
      flattenedCards.push({
        projectIndex: pIdx,
        project: project,
        type: "pipeline",
        key: `${project.id}-pipeline`,
      });
    } else {
      flattenedCards.push({
        projectIndex: pIdx,
        project: project,
        type: "placeholder",
        key: `${project.id}-placeholder`,
      });
    }
  });

  useGSAP(() => {
    const mm = gsap.matchMedia();

      const imageCards = gsap.utils.toArray<HTMLElement>(".sd-img-card");
      if (imageCards.length < 1) return;

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      /* Depth stacking: each card scales + blurs out as the next one
         arrives. The LAST card is deliberately skipped — the final
         text/image pair stays crisp and pinned, then both columns
         release simultaneously and scroll away as one stack. */
      imageCards.forEach((card, i) => {
        if (i === imageCards.length - 1) return;

        gsap.to(card, {
          scale:   0.95,
          opacity: 0.5,
          filter:  "blur(2px)",
          ease:    "none",
          scrollTrigger: {
            trigger: imageCards[i + 1],
            start:   "top 13vh",
            end:     "top 7%",
            scrub:   0.8,
          },
        });
      });

      /* ── Dual-Deck: Stack text panels natively ── */
      const textCards = gsap.utils.toArray<HTMLElement>(".sd-text-panel");
      textCards.forEach((textCard, i) => {
        if (i === textCards.length - 1) return;

        gsap.to(textCard, {
          scale:   0.95,
          filter:  "blur(2px)",
          ease:    "none",
          scrollTrigger: {
            trigger: textCards[i + 1],
            start:   "top 13vh",
            end:     "top 7%",
            scrub:   0.8,
          },
        });
      });

      return () => {
        ScrollTrigger.getAll().forEach((st) => st.kill());
      };
    });

    /* ── Release sync ──────────────────────────────────────────────
       The text panels are content-tall while the image cards keep a
       4/3 aspect, so the two columns would un-stick at different
       scroll positions. Measure both decks and size the left
       column's trailing spacer so the final text/image pair releases
       at the exact same scroll — they leave as one stack. */
    const root = sectionRef.current;
    const leftSpacer = root?.querySelector<HTMLElement>(".sd-split-left .sd-spacer");
    const leftTrack = root?.querySelector<HTMLElement>(".sd-text-track");
    const rightCol = root?.querySelector<HTMLElement>(".sd-split-right");

    const syncRelease = () => {
      if (!leftSpacer || !leftTrack || !rightCol) return;

      /* Mobile: single column, no parallel decks to synchronize */
      if (!window.matchMedia("(min-width: 901px)").matches) {
        leftSpacer.style.height = "";
        return;
      }

      const txts = leftTrack.querySelectorAll<HTMLElement>(".sd-text-panel");
      const imgs = rightCol.querySelectorAll<HTMLElement>(".sd-img-card");
      const lastTxt = txts[txts.length - 1];
      const lastImg = imgs[imgs.length - 1];
      if (!lastTxt || !lastImg) return;

      /* Measure with the spacer collapsed, then size it to the gap
         between the two columns' natural release points */
      leftSpacer.style.height = "0px";
      const stickyTop = (el: HTMLElement) => parseFloat(getComputedStyle(el).top) || 0;
      const releaseTxt =
        leftTrack.getBoundingClientRect().bottom - stickyTop(lastTxt) - lastTxt.offsetHeight;
      const releaseImg =
        rightCol.getBoundingClientRect().bottom - stickyTop(lastImg) - lastImg.offsetHeight;
      leftSpacer.style.height = `${Math.max(0, Math.round(releaseImg - releaseTxt))}px`;
    };

    syncRelease();
    ScrollTrigger.addEventListener("refreshInit", syncRelease);
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => {
      ScrollTrigger.removeEventListener("refreshInit", syncRelease);
      mm.revert();
    };
  }, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      className="sticky-deck-section"
      id="projects"
      style={{ opacity: 0, pointerEvents: "none" }}
    >
      {/* ── Section header — standalone full-viewport page.
             The 3D laptop background will layer behind this later. ── */}
      <div className="container sd-header">
        <header className="ed-header">
          <div className="ed-header-row">
            <span className="ed-eyebrow">01 / Projects</span>
          </div>
          <h2 className="ed-heading ed-heading--indent">
            Selected <em>Work</em>
          </h2>
        </header>
        <span className="sd-header-cue" aria-hidden="true">scroll ↓</span>
      </div>

      {/* ── Asymmetric split ─────────────────────────────────────────── */}
      <div className="sd-split">

        {/* ── LEFT: sticky glass text panel ───────────────────────── */}
        <div className="sd-split-left">
          <div className="sd-text-track">
            {flattenedCards.map((card, idx) => {
              const isFirstOfProject = idx === 0 || flattenedCards[idx - 1].projectIndex !== card.projectIndex;
              
              if (!isFirstOfProject) {
                return <div key={`spacer-${card.key}`} className="sd-text-spacer" aria-hidden="true" />;
              }

              const project = card.project;
              const hue  = CARD_HUES[project.id] ?? "210, 80%, 56%";
              const tags = project.tags as readonly string[];
              const note = (project as { note?: string }).note;

              return (
                <div
                  key={`text-${card.key}`}
                  className="sd-text-panel"
                  data-project-id={project.id}
                  style={{ "--card-index": card.projectIndex } as React.CSSProperties}
                >
                  <CometCard rotateDepth={8} translateDepth={6}>
                    {/* Glass card shell */}
                    <div
                      className="glass-panel"
                      style={{
                        "--card-hue": hue,
                        borderLeft: `2px solid hsl(${hue})`,
                      } as React.CSSProperties}
                    >
                      {/* Top-edge accent line matches the image card */}
                      <div className="sd-card-accent" aria-hidden="true" />

                      {/* Ghost folio numeral — editorial magazine index */}
                      <span className="sd-index-ghost mono" aria-hidden="true">
                        {String(card.projectIndex + 1).padStart(2, "0")}
                      </span>

                      {/* Title with inline subtitle */}
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

                      {/* Built with line */}
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
                  </CometCard>
                </div>
              );
            })}
            <div className="sd-spacer" aria-hidden="true" />
          </div>
        </div>

        {/* ── RIGHT: stacking image cards ─────────────────────────── */}
        <div ref={rightColRef} className="sd-split-right">
          {flattenedCards.map((card, idx) => {
            const project = card.project;
            const hue     = CARD_HUES[project.id] ?? "210, 80%, 56%";

            return (
              <div
                key={card.key}
                className="sd-img-card"
                style={{
                  "--card-index": idx,
                  "--card-hue":   hue,
                } as React.CSSProperties}
                id={`project-card-${card.key}`}
                data-project-index={card.projectIndex}
                data-project-id={project.id}
                aria-label={`Project visual: ${project.title}`}
              >
                <CometCard rotateDepth={12} translateDepth={8}>
                  <div className="sd-card-accent" aria-hidden="true" />

                  {card.type === "image" ? (
                    <div className="sd-img-frame">
                      <Image
                        src={card.imageUrl!}
                        alt={card.imageAlt!}
                        fill
                        sizes="(max-width: 900px) 100vw, 50vw"
                        className="sd-img"
                        priority={true}
                      />
                      <div className="sd-img-vignette" aria-hidden="true" />
                    </div>
                  ) : card.type === "pipeline" ? (
                    <div
                      className="sd-pipeline"
                      style={{ background: `hsl(${hue.split(",")[0]}, 22%, 5%)` }}
                      aria-label="Processing pipeline"
                    >
                      {('pipeline' in project ? (project as { pipeline: readonly string[] }).pipeline : []).map((step: string, si: number, arr: readonly string[]) => (
                        <React.Fragment key={step}>
                          <div 
                            className="sd-pipeline-node"
                            style={{ animationDelay: `${si * 0.4}s` } as React.CSSProperties}
                          >
                            {step}
                          </div>
                          {si < arr.length - 1 && (
                            <div className="sd-pipeline-wire">
                              <div 
                                className="sd-pipeline-pulse"
                                style={{ animationDelay: `${si * 0.4}s` } as React.CSSProperties}
                              />
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  ) : (
                    <div
                      className="sd-placeholder"
                      style={{ background: `hsl(${hue.split(",")[0]}, 16%, 6%)` }}
                      aria-hidden="true"
                    >
                      <span className="sd-placeholder-label mono">
                        {project.title.toUpperCase()}
                      </span>
                    </div>
                  )}
                </CometCard>
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
