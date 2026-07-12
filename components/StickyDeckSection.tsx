"use client";

import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import Image from "next/image";
import { PROJECTS } from "../lib/data";
import { ArrowUpRightIcon } from "./ui/icons";
import { CometCard } from "@/components/ui/comet-card";
import { HoverScrambleText } from "./ui/HoverScrambleText";
import { getLenis } from "../lib/lenisInstance";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* ─── Accent hues per project ─────────────────────────────────────── */
const CARD_HUES: Record<string, string> = {
  "neuro-genesis":  "188, 45%, 52%",  /* cyan  (01) */
  "double-unet":    "38, 56%, 52%",   /* gold  (02) */
  bandwidth:        "209, 34%, 64%",  /* blue  (03) */
  synthrescue:      "44, 60%, 56%",   /* gold  (04) */
  ludex:            "214, 30%, 62%",  /* blue  (05) */
};

const N = PROJECTS.length;
const pad = (n: number) => String(n).padStart(2, "0");
const hueOf = (id: string) => CARD_HUES[id] ?? "188, 45%, 52%";

/* power4.inOut — mirrors the {J} logo's scroll-to feel for click jumps */
const power4InOut = (t: number) =>
  t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

type Project = (typeof PROJECTS)[number];

interface LightboxState {
  images: string[];
  alts: string[];
  title: string;
  hue: string;
  start: number;
}

/* ═══════════════════════════════════════════════════════════════════
   LIGHTBOX — enlarged image viewer

   Portalled to document.body: a position:fixed overlay rendered in-tree
   would anchor to the transformed .stack-section, not the viewport.
   Pauses Lenis while open and restores focus to the trigger on close.
   ═══════════════════════════════════════════════════════════════════ */
function Lightbox({ images, alts, title, hue, start, onClose }: LightboxState & { onClose: () => void }) {
  const [i, setI] = useState(start);
  const dialogRef = useRef<HTMLDivElement>(null);
  const multi = images.length > 1;

  const prev = () => setI((v) => (v - 1 + images.length) % images.length);
  const next = () => setI((v) => (v + 1) % images.length);

  useEffect(() => {
    const lenis = getLenis();
    lenis?.stop();
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Tab") {
        /* minimal focus trap */
        const f = dialogRef.current?.querySelectorAll<HTMLElement>("button");
        if (!f || f.length === 0) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      lenis?.start();
      previouslyFocused?.focus?.();
    };
    // prev/next only call setI (functional) so a mount-time closure is safe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={dialogRef}
      className="cs-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} screenshots`}
      tabIndex={-1}
      onClick={onClose}
    >
      <button className="cs-lightbox-close" aria-label="Close" onClick={(e) => { e.stopPropagation(); onClose(); }}>
        ✕
      </button>
      <div className="cs-lightbox-stage" style={{ "--card-hue": hue } as React.CSSProperties} onClick={(e) => e.stopPropagation()}>
        {/* quality 95: these are technical result images (detection grids,
            curves) where visible compression artifacts would undercut them.
            width/height are nominal — .cs-lightbox-img CSS (auto + max
            constraints) controls layout from the real intrinsic ratio. */}
        <Image
          className="cs-lightbox-img"
          src={images[i]}
          alt={alts[i] ?? title}
          width={2400}
          height={1500}
          quality={85}
          sizes="92vw"
        />

        {multi && (
          <>
            <button className="cs-lightbox-arrow cs-lightbox-prev" aria-label="Previous image" onClick={(e) => { e.stopPropagation(); prev(); }}>‹</button>
            <button className="cs-lightbox-arrow cs-lightbox-next" aria-label="Next image" onClick={(e) => { e.stopPropagation(); next(); }}>›</button>
          </>
        )}

        <div className="cs-lightbox-caption mono">{alts[i] ?? title}</div>

        {multi && (
          <div className="cs-lightbox-dots">
            {images.map((_, d) => (
              <button
                key={d}
                className={`cs-dot${d === i ? " is-active" : ""}`}
                aria-label={`Image ${d + 1}`}
                aria-current={d === i}
                onClick={(e) => { e.stopPropagation(); setI(d); }}
              />
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PROJECT VISUAL — image carousel + caption (image-based projects)

   Holds the carousel index so the under-image caption (imageAlts[cur])
   and the crossfading images stay in lock-step. The image body opens
   the lightbox; arrows/dots are siblings (not nested in the clickable)
   and stopPropagation so they never trigger it.
   ═══════════════════════════════════════════════════════════════════ */
function ProjectVisual({ project, hue, metric, priority, eager, onOpen }: {
  project: Project;
  hue: string;
  metric: string;
  priority: boolean;
  eager: boolean;
  onOpen: (start: number) => void;
}) {
  const images = (project.images ?? []) as readonly string[];
  const alts = (project.imageAlts ?? []) as readonly string[];
  const [cur, setCur] = useState(0);
  const multi = images.length > 1;

  /* Neuro-Genesis only: upgrade the cover slide (idx 0) to an ambient
     looping video on capable desktops. Lazy-initializer (evaluated once,
     client-only render) rather than an effect — react-hooks/set-state-in-effect
     forbids unconditional setState in an effect body, and this only needs
     to be read once at mount. */
  const isNeuroGenesis = project.id === "neuro-genesis";
  const [useLoop] = useState(() =>
    isNeuroGenesis &&
    typeof window !== "undefined" &&
    window.matchMedia("(min-width: 900px)").matches &&
    window.matchMedia("(prefers-reduced-motion: no-preference)").matches
  );
  const [loopFailed, setLoopFailed] = useState(false);
  const loopVideoRef = useRef<HTMLVideoElement>(null);
  /* Once an image has been shown, keep it mounted — prevents unmount/
     refetch flashes when navigating back after the ±1 window moves on.
     State (not a ref) because render reads it — react-hooks/refs forbids
     reading ref.current during render. Updated via the React-docs
     "adjust state during render" pattern (guarded by tracked prev
     cur/eager) rather than an effect, since react-hooks/set-state-in-effect
     forbids unconditional setState inside a useEffect body. */
  const [shown, setShown] = useState<Set<number>>(() => new Set([0]));
  const [trackedCur, setTrackedCur] = useState(cur);
  const [trackedEager, setTrackedEager] = useState(eager);
  if (cur !== trackedCur || eager !== trackedEager) {
    setTrackedCur(cur);
    setTrackedEager(eager);
    const lo = Math.max(0, cur - 1);
    const hi = Math.min(images.length - 1, cur + 1);
    const toAdd = eager ? [cur, lo, hi] : [cur];
    if (!toAdd.every((i) => shown.has(i))) {
      const next = new Set(shown);
      toAdd.forEach((i) => next.add(i));
      setShown(next);
    }
  }

  const prev = () => setCur((v) => (v - 1 + images.length) % images.length);
  const next = () => setCur((v) => (v + 1) % images.length);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(cur); }
    else if (multi && e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    else if (multi && e.key === "ArrowRight") { e.preventDefault(); next(); }
  };

  /* Play/pause the ambient loop with visibility — saves decode work while
     the deck (or this slide) is offscreen. */
  useEffect(() => {
    if (!useLoop || loopFailed) return;
    const video = loopVideoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.1 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [useLoop, loopFailed]);

  return (
    <div className="cs-visual-col">
      <CometCard rotateDepth={10} translateDepth={6}>
        <div className="cs-visual" style={{ "--card-hue": hue } as React.CSSProperties}>
          <div className="sd-card-accent" aria-hidden="true" />

          {/* Clickable image surface (role=button) — arrows/dots sit outside it */}
          <div
            className="cs-imgwrap"
            role="button"
            tabIndex={0}
            data-cursor-ignore
            aria-label={`Enlarge ${project.title} screenshot`}
            onClick={() => onOpen(cur)}
            onKeyDown={onKey}
          >
            {images.map((src, idx) => {
              const show =
                idx === 0 ||
                (eager && Math.abs(idx - cur) <= 1) ||
                shown.has(idx);
              const useVideoForThisSlide = idx === 0 && useLoop && !loopFailed;
              return (
                <div key={src} className={`cs-img-slide${idx === cur ? " is-cur" : ""}`} aria-hidden={idx !== cur}>
                  {show && (
                    useVideoForThisSlide ? (
                      <video
                        ref={loopVideoRef}
                        className="sd-img"
                        src="/assets/Neuro-genesis/cover-loop.mp4"
                        poster="/assets/Neuro-genesis/cover.jpg"
                        muted
                        loop
                        playsInline
                        autoPlay
                        preload="none"
                        onError={() => setLoopFailed(true)}
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <Image
                        src={src}
                        alt={alts[idx] ?? project.title}
                        fill
                        sizes="(max-width: 900px) 100vw, 55vw"
                        className="sd-img"
                        priority={priority && idx === 0}
                      />
                    )
                  )}
                </div>
              );
            })}
            <div className="sd-img-vignette" aria-hidden="true" />
          </div>

          {multi && (
            <>
              <button type="button" className="cs-arrow cs-arrow-prev" aria-label="Previous image" onClick={(e) => { e.stopPropagation(); prev(); }}>‹</button>
              <button type="button" className="cs-arrow cs-arrow-next" aria-label="Next image" onClick={(e) => { e.stopPropagation(); next(); }}>›</button>
              <div className="cs-dots">
                {images.map((_, d) => (
                  <button
                    key={d}
                    type="button"
                    className={`cs-dot${d === cur ? " is-active" : ""}`}
                    aria-label={`Show image ${d + 1}`}
                    aria-current={d === cur}
                    onClick={(e) => { e.stopPropagation(); setCur(d); }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </CometCard>

      {/* Caption lives UNDER the image (not overlaid): current image's
          caption, then the project's metric in a dimmer line. */}
      <div className="cs-caption mono">
        <span className="cs-caption-alt">{alts[cur] ?? project.title}</span>
        <span className="cs-caption-metric">{metric}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PROJECT SLIDE — one case-study card (visual column + copy column)
   ═══════════════════════════════════════════════════════════════════ */
function ProjectSlide({ project, index, hue, eager, onOpen }: {
  project: Project;
  index: number;
  hue: string;
  eager: boolean;
  onOpen: (start: number) => void;
}) {
  const tags = project.tags as readonly string[];
  const metric = (project as { metric?: string }).metric ?? tags[0];
  const note = (project as { note?: string }).note;
  const hasImage = "images" in project && project.images && project.images.length > 0;
  const pipeline = (project as { pipeline?: readonly string[] }).pipeline;

  /* Touch-only: tap a tag to toggle its glow on/off (desktop keeps :hover,
     and stays untouched — no extra tab stops). */
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: none)");
    const update = () => setIsTouch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const [glow, setGlow] = useState<Set<number>>(new Set());
  const toggleGlow = (i: number) =>
    setGlow((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  return (
    <article
      className="cs-slide"
      data-project-id={project.id}
      data-cursor-label={project.title}
      style={{ "--card-hue": hue } as React.CSSProperties}
      aria-label={`Project: ${project.title}`}
    >
      {/* LEFT — visual column */}
      {hasImage ? (
        <ProjectVisual project={project} hue={hue} metric={metric} priority={index === 0} eager={eager} onOpen={onOpen} />
      ) : (
        <div className="cs-visual-col">
          <CometCard rotateDepth={10} translateDepth={6}>
            <div className="cs-visual" style={{ "--card-hue": hue } as React.CSSProperties}>
              <div className="sd-card-accent" aria-hidden="true" />
              {pipeline ? (
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
            </div>
          </CometCard>
          <div className="cs-caption mono">
            <span className="cs-caption-metric">{metric}</span>
          </div>
        </div>
      )}

      {/* RIGHT — copy */}
      <div className="cs-text">
        <h3 className="cs-title">{project.title}</h3>
        <span className="cs-subtitle" style={{ color: `hsl(${hue})` }}>
          {project.subtitle}
        </span>
        <p className="cs-desc">{project.description}</p>
        {note && <p className="cs-note mono">{note}</p>}
        <ul className="sd-card-tags" aria-label="Technologies">
          {tags.map((tag, ti) => (
            <li
              key={tag}
              className={`sd-tag mono${glow.has(ti) ? " is-glow" : ""}`}
              {...(isTouch
                ? {
                    role: "button" as const,
                    tabIndex: 0,
                    "aria-pressed": glow.has(ti),
                    onClick: () => toggleGlow(ti),
                    onKeyDown: (e: React.KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleGlow(ti);
                      }
                    },
                  }
                : {})}
            >
              {tag}
            </li>
          ))}
        </ul>
        <div className="cs-links">
          {((project as { links?: readonly { label: string; href: string; demo?: boolean }[] }).links
            ?? [{ label: "View Source", href: project.github }]).map((l, li) => (
            <a
              key={li}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`sd-card-link${l.demo ? " cs-demo" : ""}`}
              aria-label={`${l.label}, ${project.title}`}
            >
              <span>{l.label}</span>
              <ArrowUpRightIcon />
            </a>
          ))}
        </div>
      </div>
    </article>
  );
}

export default function StickyDeckSection({ portfolioSectionRef }: { portfolioSectionRef?: React.RefObject<HTMLElement | null> }) {
  const fallbackRef = useRef<HTMLElement>(null);
  const sectionRef = portfolioSectionRef || fallbackRef;
  const trackRef = useRef<HTMLDivElement>(null);
  /* the active scrub trigger — read by the rail's click-to-jump handler */
  const stRef = useRef<ScrollTrigger | null>(null);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  /* Active slide index, mirrored from render()'s imperative scrub so the
     image-gating logic below (a plain render decision, not layout/paint)
     can read it without touching the opacity/transform writes themselves. */
  const [activeSlide, setActiveSlide] = useState(0);
  const activeIdxRef = useRef(0);
  /* Whether the desktop scrub ScrollTrigger is live — false on mobile /
     reduced-motion, where slides stack in normal flow and all should be
     eager. */
  const [scrubActive, setScrubActive] = useState(false);

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

    /* Per-slide cache of the last applied nearness — skips redundant style
       writes for far slides whose `a` hasn't meaningfully changed between
       scroll updates (only 1-2 slides actually move per frame). */
    const lastA = slides.map(() => -1);

    /* Single render pass — every readout derives from the SAME progress
       value (p ∈ [0, N-1]) so the visual, text, counter, rail and ghost
       can never drift out of sync. */
    const render = (p: number) => {
      slides.forEach((slide, i) => {
        const a = Math.max(0, 1 - Math.abs(i - p)); /* nearness 0→1 */
        if (Math.abs(a - lastA[i]) < 0.001) return;
        lastA[i] = a;
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
      if (idx !== activeIdxRef.current) {
        activeIdxRef.current = idx;
        setActiveSlide(idx);
      }
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
      setScrubActive(true);

      render(0); /* first project fully formed at entry — no dead lead-in */

      return () => {
        stRef.current = null;
        setScrubActive(false);
        gsap.set(slides, { clearProps: "opacity,pointerEvents" });
        texts.forEach((t) => t && (t.style.transform = ""));
        lastA.fill(-1);
      };
    });

    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }, { scope: sectionRef });

  /* Jump to a project by scrolling to its position within the sticky track.
     Routed through the shared Lenis instance so it inherits the site's eased
     momentum (matching the {J} logo's power4.inOut feel). */
  const jumpTo = (i: number) => {
    const st = stRef.current;
    const lenis = getLenis();
    if (!st) {
      /* mobile / reduced-motion: slides are stacked in normal flow.
         Move the active "glow" to the tapped box (the scrub-driven
         render() that normally does this never runs on mobile), then
         scroll to the i-th card directly (clear of the floating nav). */
      const thumbs = trackRef.current?.querySelectorAll<HTMLElement>(".cs-thumb");
      thumbs?.forEach((th, ti) => th.classList.toggle("is-active", ti === i));
      const el = trackRef.current?.querySelectorAll<HTMLElement>(".cs-slide")[i];
      if (!el) return;
      if (lenis) {
        lenis.scrollTo(el, { duration: 1.0, easing: power4InOut, offset: -96 });
      } else {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }
    const target = st.start + (i / (N - 1)) * (st.end - st.start);
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
            <span className="ed-eyebrow">Projects</span>
          </div>
          <h2 className="ed-heading ed-heading--indent">
            Selected <em>Work</em>
          </h2>
        </header>
      </div>

      {/* ── Case-study stage ─────────────────────────────────────────────
             One project on screen at a time. Desktop holds the inner
             viewport with position:sticky and scrubs the active project;
             the thumbnail rail jumps on click. Mobile / reduced-motion
             fall back to a plain vertical stack (CSS), no scrub. ── */}
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
              const hue = hueOf(project.id);
              const eager = !scrubActive || Math.abs(i - activeSlide) <= 1;
              return (
                <ProjectSlide
                  key={project.id}
                  project={project}
                  index={i}
                  hue={hue}
                  eager={eager}
                  onOpen={(start) =>
                    setLightbox({
                      images: [...((project.images ?? []) as readonly string[])],
                      alts: [...((project.imageAlts ?? []) as readonly string[])],
                      title: project.title,
                      hue,
                      start,
                    })
                  }
                />
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

      {/* ── Outro / CTA — a centered closing beat. Its trailing height
             pushes the section bottom (where StackTransitions boundary 0
             fires the CRT collapse) past the CTA, so the fold happens
             AFTER the CTA has settled, not over it. ── */}
      <div className="sd-outro">
        <div className="container sd-cta" data-skew>
          <p>There&apos;s more on GitHub.</p>
          <a
            href="https://github.com/Jonathan-Jesni?tab=repositories"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
            id="projects-cta-btn"
          >
            <HoverScrambleText text="View all repositories" />
          </a>
        </div>
      </div>

      {lightbox && <Lightbox {...lightbox} onClose={() => setLightbox(null)} />}
    </section>
  );
}
