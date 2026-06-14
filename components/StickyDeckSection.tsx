"use client";

import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import Image from "next/image";
import { PROJECTS } from "../lib/data";
import { ArrowUpRightIcon } from "./ui/icons";
import { CometCard } from "@/components/ui/comet-card";
import { getLenis } from "../lib/lenisInstance";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* ─── Accent hues per project ─────────────────────────────────────── */
const CARD_HUES: Record<string, string> = {
  ludex:            "214, 84%, 64%",  /* sapphire       */
  "file-converter": "158, 48%, 52%",  /* muted jade     */
  "double-unet":    "  6, 64%, 60%",  /* burnt coral    */
  synthrescue:      "268, 52%, 66%",  /* dusty violet   */
};

const N = PROJECTS.length;
const pad = (n: number) => String(n).padStart(2, "0");

/* power4.inOut — mirrors the {J} logo's scroll-to feel for click jumps */
const power4InOut = (t: number) =>
  t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

export default function StickyDeckSection({ portfolioSectionRef }: { portfolioSectionRef?: React.RefObject<HTMLElement | null> }) {
  const fallbackRef = useRef<HTMLElement>(null);
  const sectionRef = portfolioSectionRef || fallbackRef;
  const trackRef = useRef<HTMLDivElement>(null);
  /* the active scrub trigger — read by the rail's click-to-jump handler */
  const stRef = useRef<ScrollTrigger | null>(null);

  useGSAP(() => {
    const track = trackRef.current;
    if (!track) return;

    const slides = gsap.utils.toArray<HTMLElement>(".cs-slide", track);
    const texts  = slides.map((s) => s.querySelector<HTMLElement>(".cs-text"));
    const thumbs = gsap.utils.toArray<HTMLElement>(".cs-thumb", track);
    const fill   = track.querySelector<HTMLElement>(".cs-progress-fill");
    const knob   = track.querySelector<HTMLElement>(".cs-progress-knob");
    const curEl  = track.querySelector<HTMLElement>(".cs-counter-cur");
    const ghost  = track.querySelector<HTMLElement>(".cs-ghost");
    if (slides.length < 1) return;

    /* Single render pass — every readout derives from the SAME progress
       value (p ∈ [0, N-1]) so the visual, text, counter, rail and ghost
       can never drift out of sync. */
    const render = (p: number) => {
      slides.forEach((slide, i) => {
        const a = Math.max(0, 1 - Math.abs(i - p)); /* nearness 0→1 */
        slide.style.opacity = a.toFixed(3);
        slide.style.pointerEvents = a > 0.5 ? "auto" : "none";
        const t = texts[i];
        if (t) {
          /* text rise LAGS the visual crossfade: it only starts lifting
             once the slide is already ~25% faded in, so the picture
             leads and the copy settles in behind it. */
          const tE = Math.max(0, Math.min(1, (a - 0.25) / 0.75));
          t.style.transform = `translate3d(0, ${((1 - tE) * 26).toFixed(1)}px, 0)`;
        }
      });

      const idx = Math.round(p);
      if (curEl) curEl.textContent = pad(idx + 1);
      if (ghost) ghost.textContent = pad(idx + 1);
      const pct = (p / Math.max(1, N - 1)) * 100;
      if (fill) fill.style.width = `${pct}%`;
      if (knob) knob.style.left = `${pct}%`;
      thumbs.forEach((th, i) => th.classList.toggle("is-active", i === idx));
    };

    const mm = gsap.matchMedia();

    /* ── Desktop full-motion: scrub the projects via a CSS-sticky viewport ──
       NO ScrollTrigger pin. The stage is held in place by position:sticky
       (see .cs-viewport in globals.css) and this trigger only READS scroll
       to scrub the crossfade. A GSAP pin would use position:fixed, which is
       broken by .stack-section's transform (StackTransitions scales it) and
       can freeze the tab under Lenis — the exact reasons this codebase pins
       nothing and uses sticky everywhere (see StackTransitions / Contact). */
    mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      const st = ScrollTrigger.create({
        trigger: track,
        start: "top top",
        end: "bottom bottom",
        invalidateOnRefresh: true,
        /* Snap each project to its own scroll beat — no parked half-states */
        snap: {
          snapTo: 1 / (N - 1),
          duration: { min: 0.15, max: 0.35 },
          ease: "power2.inOut",
        },
        onUpdate: (self) => render(self.progress * (N - 1)),
        onRefresh: (self) => render(self.progress * (N - 1)),
      });
      stRef.current = st;

      render(0); /* first project fully formed at entry — no dead lead-in */

      return () => {
        stRef.current = null;
        gsap.set(slides, { clearProps: "opacity,pointerEvents" });
        texts.forEach((t) => t && (t.style.transform = ""));
      };
    });

    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }, { scope: sectionRef });

  /* Jump to a project by scrolling to its position within the sticky track.
     Routed through the shared Lenis instance so it inherits the site's eased
     momentum (matching the {J} logo's power4.inOut feel). */
  const jumpTo = (i: number) => {
    const st = stRef.current;
    if (!st) return; /* mobile / reduced-motion: slides are already stacked */
    const target = st.start + (i / (N - 1)) * (st.end - st.start);
    const lenis = getLenis();
    if (lenis) {
      lenis.scrollTo(target, { duration: 1.3, easing: power4InOut });
    } else {
      window.scrollTo({ top: target, behavior: "smooth" });
    }
  };

  return (
    <section
      ref={sectionRef}
      className="sticky-deck-section"
      id="projects"
      style={{ opacity: 0, pointerEvents: "none" }}
    >
      {/* ── Section header — standalone full-viewport page.
             PIXEL-CAPTURED into the laptop's WebGL screen texture
             (app/assets-render/projects-header) and crossfaded into this
             DOM at the hero→projects handoff. Do not alter markup/copy. ── */}
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

      {/* ── Case-study stage ─────────────────────────────────────────────
             One project on screen at a time. On desktop it pins and scroll
             scrubs the active project; the thumbnail rail jumps on click.
             On mobile / reduced-motion it falls back to a plain vertical
             stack (CSS), with no pin and no scrub. ── */}
      <div
        ref={trackRef}
        className="cs-track"
        style={{ "--cs-count": N } as React.CSSProperties}
      >
        <div className="cs-viewport">
        <span className="cs-ghost" aria-hidden="true">01</span>

        <div className="cs-topbar">
          <span className="cs-eyebrow">Selected Work</span>
          <span className="cs-counter">
            <span className="cs-counter-cur">01</span> / {pad(N)}
          </span>
        </div>

        <div className="cs-stagebox">
          {PROJECTS.map((project, i) => {
            const hue  = CARD_HUES[project.id] ?? "210, 80%, 56%";
            const tags = project.tags as readonly string[];
            const metric = (project as { metric?: string }).metric ?? tags[0];
            const note = (project as { note?: string }).note;
            const hasImage = "images" in project && project.images && project.images.length > 0;
            const pipeline = (project as { pipeline?: readonly string[] }).pipeline;

            return (
              <article
                key={project.id}
                className="cs-slide"
                data-project-id={project.id}
                aria-label={`Project: ${project.title}`}
              >
                {/* LEFT — large visual */}
                <CometCard rotateDepth={10} translateDepth={6}>
                  <div
                    className="cs-visual"
                    style={{ "--card-hue": hue } as React.CSSProperties}
                  >
                    <div className="sd-card-accent" aria-hidden="true" />

                    {hasImage ? (
                      <div className="sd-img-frame">
                        <Image
                          src={project.images![0]}
                          alt={project.imageAlts?.[0] ?? project.title}
                          fill
                          sizes="(max-width: 900px) 100vw, 55vw"
                          className="sd-img"
                          priority={i === 0}
                        />
                        <div className="sd-img-vignette" aria-hidden="true" />
                      </div>
                    ) : pipeline ? (
                      <div
                        className="sd-pipeline"
                        style={{ background: `hsl(${hue.split(",")[0]}, 15%, 8%)` }}
                        aria-label="Processing pipeline"
                      >
                        {pipeline.map((step, si, arr) => (
                          <React.Fragment key={step}>
                            <div className="sd-pipeline-node" style={{ animationDelay: `${si * 0.4}s` }}>
                              {step}
                            </div>
                            {si < arr.length - 1 && (
                              <div className="sd-pipeline-wire">
                                <div className="sd-pipeline-pulse" style={{ animationDelay: `${si * 0.4}s` }} />
                              </div>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    ) : (
                      <div
                        className="sd-placeholder"
                        style={{ background: `hsl(${hue.split(",")[0]}, 12%, 8%)` }}
                        aria-hidden="true"
                      >
                        <span className="sd-placeholder-label mono">{project.title.toUpperCase()}</span>
                      </div>
                    )}

                    <span className="cs-metric mono">{metric}</span>
                  </div>
                </CometCard>

                {/* RIGHT — copy */}
                <div className="cs-text">
                  <h3 className="cs-title">{project.title}</h3>
                  <span className="cs-subtitle" style={{ color: `hsl(${hue})` }}>
                    — {project.subtitle}
                  </span>
                  <p className="cs-desc">{project.description}</p>
                  {note && <p className="cs-note mono">{note}</p>}
                  <ul className="sd-card-tags" aria-label="Technologies">
                    {tags.map((tag) => (
                      <li key={tag} className="sd-tag mono">{tag}</li>
                    ))}
                  </ul>
                  <a
                    href={project.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sd-card-link cs-source"
                    id={`${project.id}-source-link`}
                    aria-label={`View ${project.title} source code on GitHub`}
                  >
                    <span>View Source</span>
                    <ArrowUpRightIcon />
                  </a>
                </div>
              </article>
            );
          })}
        </div>

        {/* Progress rail + clickable thumbnails */}
        <div className="cs-progress" aria-hidden="true">
          <div className="cs-progress-fill" />
          <div className="cs-progress-knob" />
        </div>

        <nav className="cs-rail" aria-label="Jump to project">
          {PROJECTS.map((project, i) => (
            <button
              key={project.id}
              type="button"
              className={`cs-thumb${i === 0 ? " is-active" : ""}`}
              onClick={() => jumpTo(i)}
              aria-label={`Go to ${project.title}`}
            >
              <span className="cs-thumb-num mono">{pad(i + 1)}</span>
              <span className="cs-thumb-name">{project.title}</span>
            </button>
          ))}
        </nav>
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="container sd-cta" data-skew>
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
