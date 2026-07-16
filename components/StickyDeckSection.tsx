"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import Image from "next/image";
import { FEATURED_PROJECTS, SECONDARY_PROJECTS } from "../lib/data";
import { ArrowUpRightIcon } from "./ui/icons";
import { CometCard } from "@/components/ui/comet-card";
import { HoverScrambleText } from "./ui/HoverScrambleText";
import { getLenis } from "../lib/lenisInstance";
import { PROJECT_PHASES } from "../lib/chapterPhases";
import { IMMERSIVE_SCROLL_MEDIA_QUERY } from "../lib/mediaQueries";
import { trapFocus } from "../lib/trapFocus";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* ─── Accent hues per project ─────────────────────────────────────── */
const CARD_HUES: Record<string, string> = {
  "neuro-genesis":  "188, 45%, 52%",  /* cyan  (01) */
  "double-unet":    "38, 56%, 52%",   /* gold  (02) */
  bandwidth:        "209, 34%, 64%",  /* blue  (03) */
  synthrescue:      "44, 60%, 56%",   /* gold  (04) */
  ludex:            "214, 30%, 62%",  /* blue  (05) */
};

const N = FEATURED_PROJECTS.length;
const pad = (n: number) => String(n).padStart(2, "0");
const hueOf = (id: string) => CARD_HUES[id] ?? "188, 45%, 52%";

/* Each project gets an intentional reading beat. The two narrow ranges are
   the only places where slides crossfade; rail jumps target the centre of a
   hold, never the sticky track's release boundary. */
const PROJECT_HOLDS = PROJECT_PHASES.holds;
if (
  process.env.NODE_ENV !== "production" &&
  PROJECT_HOLDS.length !== FEATURED_PROJECTS.length
) {
  throw new Error("PROJECT_PHASES.holds must match FEATURED_PROJECTS length");
}

const projectPositionAt = (progress: number) => {
  const p = Math.max(0, Math.min(1, progress));
  if (p <= PROJECT_HOLDS[0].end) return 0;
  if (p < PROJECT_HOLDS[1].start) {
    return (p - PROJECT_HOLDS[0].end) /
      (PROJECT_HOLDS[1].start - PROJECT_HOLDS[0].end);
  }
  if (p <= PROJECT_HOLDS[1].end) return 1;
  if (p < PROJECT_HOLDS[2].start) {
    return 1 + (p - PROJECT_HOLDS[1].end) /
      (PROJECT_HOLDS[2].start - PROJECT_HOLDS[1].end);
  }
  return 2;
};

/* power4.inOut — mirrors the {J} logo's scroll-to feel for click jumps */
const power4InOut = (t: number) =>
  t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

type Project = (typeof FEATURED_PROJECTS)[number];

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
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const multi = images.length > 1;

  const prev = useCallback(
    () => setI((v) => (v - 1 + images.length) % images.length),
    [images.length]
  );
  const next = useCallback(() => setI((v) => (v + 1) % images.length), [images.length]);


  useEffect(() => {
    const lenis = getLenis();
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lenis?.stop();
    closeButtonRef.current?.focus();
    const dialog = dialogRef.current;
    const releaseFocusTrap = dialog
      ? trapFocus(dialog, { fallbackFocus: dialog })
      : () => undefined;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowLeft" && multi) {
        event.preventDefault();
        prev();
        return;
      }
      if (event.key === "ArrowRight" && multi) {
        event.preventDefault();
        next();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      releaseFocusTrap();
      document.body.style.overflow = previousBodyOverflow;
      lenis?.start();
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [multi, next, onClose, prev]);

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
      <button
        ref={closeButtonRef}
        type="button"
        className="cs-lightbox-close"
        aria-label="Close"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      >
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
          quality={95}
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
function ProjectVisual({ project, hue, priority, eager, onOpen }: {
  project: Project;
  hue: string;
  priority: boolean;
  eager: boolean;
  onOpen: (start: number) => void;
}) {
  const images = (project.images ?? []) as readonly string[];
  const alts = (project.imageAlts ?? []) as readonly string[];
  const [cur, setCur] = useState(0);
  const multi = images.length > 1;

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
              return (
                <div
                  key={src}
                  className={`cs-img-slide${idx === cur ? " is-cur" : ""}`}
                  aria-hidden={idx !== cur}
                >
                  {show && (
                    <Image
                      src={src}
                      alt={alts[idx] ?? project.title}
                      fill
                      sizes="(max-width: 900px) 100vw, 55vw"
                      className="sd-img"
                      priority={priority && idx === 0}
                    />
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

      {/* The descriptive caption stays with the current image. The lead
          outcome metric belongs in the copy hierarchy beside the visual. */}
      <div className="cs-caption mono">
        <span className="cs-caption-alt">{alts[cur] ?? project.title}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PROJECT SLIDE — one case-study card (visual column + copy column)
   ═══════════════════════════════════════════════════════════════════ */
function ProjectSlide({ project, index, hue, eager, active, scrubActive, onOpen }: {
  project: Project;
  index: number;
  hue: string;
  eager: boolean;
  active: boolean;
  scrubActive: boolean;
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
      id={`project-${project.id}`}
      className="cs-slide"
      data-project-id={project.id}
      data-cursor-label={project.title}
      style={{ "--card-hue": hue } as React.CSSProperties}
      aria-label={`Project: ${project.title}`}
      aria-hidden={scrubActive && !active}
      inert={scrubActive && !active ? true : undefined}
    >
      {/* LEFT — visual column */}
      {hasImage ? (
        <ProjectVisual project={project} hue={hue} priority={index === 0} eager={eager} onOpen={onOpen} />
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
        </div>
      )}

      {/* RIGHT — copy */}
      <div className="cs-text">
        <h3 className="cs-title">{project.title}</h3>
        <span className="cs-subtitle" style={{ color: `hsl(${hue})` }}>
          {project.subtitle}
        </span>
        <p className="cs-metric mono">{metric}</p>
        <p className="cs-desc">{project.description}</p>
        <ul className="cs-proof" aria-label={`${project.title} technical highlights`}>
          {((project as { proofPoints?: readonly string[] }).proofPoints ?? []).map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>

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

export default function StickyDeckSection({
  portfolioSectionRef,
  motionEnabled = true,
}: {
  portfolioSectionRef?: React.RefObject<HTMLElement | null>;
  motionEnabled?: boolean;
}) {
  const fallbackRef = useRef<HTMLElement>(null);
  const sectionRef = portfolioSectionRef || fallbackRef;
  const trackRef = useRef<HTMLDivElement>(null);
  const railButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  /* the active scrub trigger — read by the rail's click-to-jump handler */
  const stRef = useRef<ScrollTrigger | null>(null);
  const snapSuspendedRef = useRef(false);
  const snapResumeTimerRef = useRef<number | null>(null);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const closeLightbox = useCallback(() => setLightbox(null), []);
  /* Active slide index, mirrored from render()'s imperative scrub so the
     image-gating logic below (a plain render decision, not layout/paint)
     can read it without touching the opacity/transform writes themselves. */
  const [activeSlide, setActiveSlide] = useState(0);
  const activeIdxRef = useRef(0);
  /* Whether the desktop scrub ScrollTrigger is live — false on mobile /
     reduced-motion, where slides stack in normal flow and all should be
     eager. */
  const [scrubActive, setScrubActive] = useState(false);

  const suspendSnap = useCallback((fallbackMs: number) => {
    snapSuspendedRef.current = true;
    if (snapResumeTimerRef.current !== null) {
      window.clearTimeout(snapResumeTimerRef.current);
    }
    snapResumeTimerRef.current = window.setTimeout(() => {
      snapSuspendedRef.current = false;
      snapResumeTimerRef.current = null;
    }, fallbackMs);
  }, []);

  useEffect(() => () => {
    if (snapResumeTimerRef.current !== null) {
      window.clearTimeout(snapResumeTimerRef.current);
    }
  }, []);

  useEffect(() => {
    const exposeStaticDeck = () => {
      stRef.current?.kill();
      stRef.current = null;
      const section = sectionRef.current;
      if (section) {
        gsap.set(section, { clearProps: "opacity,pointerEvents" });
      }
      const track = trackRef.current;
      if (track) {
        track.dataset.scrubReady = "false";
        gsap.set(track.querySelectorAll(".cs-slide, .cs-text"), {
          clearProps: "opacity,transform,pointerEvents,visibility,willChange",
        });
      }
      setScrubActive(false);
      setActiveSlide(0);
      activeIdxRef.current = 0;
    };

    window.addEventListener("portfolio:motion-failed", exposeStaticDeck);
    return () =>
      window.removeEventListener("portfolio:motion-failed", exposeStaticDeck);
  }, [sectionRef]);

  useGSAP(() => {
    const track = trackRef.current;
    if (!track || !motionEnabled) return;

    const slides = gsap.utils.toArray<HTMLElement>(".cs-slide", track);
    const texts = slides.map((slide) => slide.querySelector<HTMLElement>(".cs-text"));
    const progress = track.querySelector<HTMLElement>(".cs-progress");
    const fill = track.querySelector<HTMLElement>(".cs-progress-fill");
    const knob = track.querySelector<HTMLElement>(".cs-progress-knob");
    if (slides.length !== N) return;

    const lastA = slides.map(() => -1);
    let progressWidth = 0;
    const measureProgress = () => {
      progressWidth = progress?.getBoundingClientRect().width ?? 0;
    };
    const resetPresentation = () => {
      track.dataset.scrubReady = "false";
      stRef.current = null;
      setScrubActive(false);
      gsap.set(slides, { clearProps: "opacity,pointerEvents" });
      texts.forEach((text) => {
        if (text) text.style.transform = "";
      });
      fill?.style.removeProperty("width");
      fill?.style.removeProperty("transform-origin");
      fill?.style.removeProperty("transform");
      knob?.style.removeProperty("transform");
      lastA.fill(-1);
    };

    /* p is the project position (0→2); scrollProgress remains the exact
       track phase (0→1), including the three reading holds. */
    const render = (p: number, scrollProgress: number) => {
      slides.forEach((slide, index) => {
        const nearness = Math.max(0, 1 - Math.abs(index - p));
        if (Math.abs(nearness - lastA[index]) < 0.001) return;
        lastA[index] = nearness;
        slide.style.opacity = nearness.toFixed(3);
        slide.style.pointerEvents = nearness > 0.5 ? "auto" : "none";

        const text = texts[index];
        if (text) {
          const textProgress = Math.max(0, Math.min(1, (nearness - 0.25) / 0.75));
          text.style.transform =
            `translate3d(0, ${((1 - textProgress) * 26).toFixed(1)}px, 0)`;
        }
      });

      const index = Math.round(p);
      if (index !== activeIdxRef.current) {
        activeIdxRef.current = index;
        setActiveSlide(index);
      }

      const percent = scrollProgress * 100;
      if (fill) fill.style.transform = `scaleX(${(percent / 100).toFixed(4)})`;
      if (knob) {
        knob.style.transform =
          `translate3d(${(progressWidth * scrollProgress).toFixed(2)}px, 0, 0) translateX(-50%)`;
      }
    };

    const mm = gsap.matchMedia();
    let cancelled = false;

    try {
      mm.add(
        IMMERSIVE_SCROLL_MEDIA_QUERY,
        () => {
          /* The data attribute turns on sticky/absolute enhancement CSS.
             Static document flow is the baseline if setup fails. */
          track.dataset.scrubReady = "true";
          setScrubActive(true);

          try {
            if (fill) {
              fill.style.width = "100%";
              fill.style.transformOrigin = "left center";
            }
            measureProgress();
            const renderProgress = (progress: number) =>
              render(projectPositionAt(progress), progress);
            const st = ScrollTrigger.create({
              trigger: track,
              start: "top top",
              end: "bottom bottom",
              invalidateOnRefresh: true,
              snap: {
                snapTo: (value) =>
                  snapSuspendedRef.current
                    ? value
                    : gsap.utils.snap(PROJECT_HOLDS.map((hold) => hold.midpoint), value),
                delay: 0.12,
                duration: { min: 0.15, max: 0.35 },
                ease: "power2.inOut",
              },
              onUpdate: (self) => renderProgress(self.progress),
              onRefresh: (self) => {
                measureProgress();
                renderProgress(self.progress);
              },
            });
            stRef.current = st;
            renderProgress(st.progress);

            return () => {
              st.kill();
              resetPresentation();
            };
          } catch {
            resetPresentation();
          }
        }
      );

      document.fonts?.ready.then(() => {
        if (!cancelled) ScrollTrigger.refresh();
      });
    } catch {
      resetPresentation();
    }

    return () => {
      cancelled = true;
      mm.revert();
      resetPresentation();
    };
  }, {
    scope: sectionRef,
    dependencies: [motionEnabled],
    revertOnUpdate: true,
  });

  /* Jump to a project by scrolling to its position within the sticky track.
     Routed through the shared Lenis instance so it inherits the site's eased
     momentum (matching the {J} logo's power4.inOut feel). */
  const jumpTo = (requestedIndex: number, immediate = false) => {
    const index = Math.max(0, Math.min(N - 1, requestedIndex));
    const st = stRef.current;
    const lenis = getLenis();
    const t = st?.getTween(true);
    if (t && typeof t !== "number") t.kill();
    suspendSnap(immediate ? 240 : 1_800);
    const finishProgrammaticScroll = () => suspendSnap(180);

    if (!st) {
      setActiveSlide(index);
      activeIdxRef.current = index;
      const slide = trackRef.current?.querySelectorAll<HTMLElement>(".cs-slide")[index];
      if (!slide) return;

      if (lenis) {
        if (immediate) {
          lenis.scrollTo(slide, {
            immediate: true,
            force: true,
            offset: -96,
            onComplete: finishProgrammaticScroll,
          });
        } else {
          lenis.scrollTo(slide, {
            duration: 1,
            easing: power4InOut,
            offset: -96,
            onComplete: finishProgrammaticScroll,
          });
        }
      } else {
        slide.scrollIntoView({
          behavior: immediate ? "auto" : "smooth",
          block: "start",
        });
      }
      return;
    }

    const midpoint = PROJECT_HOLDS[index].midpoint;
    const target = st.start + midpoint * (st.end - st.start);
    if (lenis) {
      if (immediate) {
        lenis.scrollTo(target, {
          immediate: true,
          force: true,
          onComplete: finishProgrammaticScroll,
        });
      } else {
        lenis.scrollTo(target, {
          duration: 1.3,
          easing: power4InOut,
          onComplete: finishProgrammaticScroll,
        });
      }
    } else {
      window.scrollTo({ top: target, behavior: immediate ? "auto" : "smooth" });
    }
  };

  const onRailKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = index - 1;
    else if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = index + 1;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = N - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const clamped = Math.max(0, Math.min(N - 1, nextIndex));
    railButtonRefs.current[clamped]?.focus();
    jumpTo(clamped, true);
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
        id="projects-first-case-study"
        className="cs-track"
        data-scrub-ready={scrubActive ? "true" : "false"}
        style={{ "--cs-count": N } as React.CSSProperties}
      >
        <div
          className="chapter-marker chapter-marker--projects-landing"
          data-scroll-landing="projects"
          data-scroll-landing-clearance="none"
          aria-hidden="true"
        />
        <div
          className="chapter-marker chapter-marker--projects-spy"
          data-scroll-spy="projects"
          data-scroll-spy-clearance="none"
          aria-hidden="true"
        />
        <div className="cs-viewport">
          <span className="cs-ghost" aria-hidden="true">{pad(activeSlide + 1)}</span>

          <div className="cs-topbar">
            <span className="cs-eyebrow">Selected Work</span>
            <span className="cs-counter">
              <span className="cs-counter-cur">{pad(activeSlide + 1)}</span> / {pad(N)}
            </span>
          </div>

          <div className="cs-stagebox">
            {FEATURED_PROJECTS.map((project, i) => {
              const hue = hueOf(project.id);
              const eager = !scrubActive || Math.abs(i - activeSlide) <= 1;
              return (
                <ProjectSlide
                  key={project.id}
                  project={project}
                  index={i}
                  hue={hue}
                  eager={eager}
                  active={i === activeSlide}
                  scrubActive={scrubActive}
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
            {FEATURED_PROJECTS.map((project, i) => (
              <button
                key={project.id}
                ref={(node) => {
                  railButtonRefs.current[i] = node;
                }}
                type="button"
                className={`cs-thumb${i === activeSlide ? " is-active" : ""}`}
                onClick={(event) => jumpTo(i, event.detail === 0)}
                onKeyDown={(event) => onRailKeyDown(event, i)}
                aria-label={`Go to ${project.title}`}
                aria-controls={`project-${project.id}`}
                aria-current={i === activeSlide ? "true" : undefined}
              >
                <span className="cs-thumb-num mono">{pad(i + 1)}</span>
                <span className="cs-thumb-name">{project.title}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="more-work">
        <div className="container">
          <header className="more-work-header">
            <span className="ed-eyebrow">More work</span>
            <h3>Additional systems</h3>
          </header>
          <div className="more-work-list">
            {SECONDARY_PROJECTS.map((project, index) => {
              const links = (project as { links?: readonly { label: string; href: string }[] }).links;
              const link = links?.[0] ?? { label: "View source", href: project.github };
              return (
                <article className="more-work-item" key={project.id}>
                  <span className="more-work-index mono">{pad(index + 4)}</span>
                  <div>
                    <h4>{project.title}</h4>
                    <p>{project.subtitle}</p>
                  </div>
                  <strong>{project.metric}</strong>
                  <a href={link.href} target="_blank" rel="noopener noreferrer">
                    <span>{link.label}</span>
                    <ArrowUpRightIcon />
                  </a>
                </article>
              );
            })}
          </div>
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

      {lightbox && <Lightbox {...lightbox} onClose={closeLightbox} />}
    </section>
  );
}
