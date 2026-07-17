"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import dynamic from "next/dynamic";
import Image from "next/image";
import { LinkedInIcon } from "./ui/icons";
import { TerminalHighlight } from "./ui/TerminalHighlight";
import { HoverScrambleText } from "./ui/HoverScrambleText";
import { getLenis } from "../lib/lenisInstance";
import { getScrollTargetY, power4InOut, refreshScrollTargets } from "../lib/scrollTarget";
import {
  subscribeMotionEnvironment,
  type MotionEnvironment,
} from "../lib/motionEnvironment";
import { loaderControls } from "../lib/loaderControls";
import { MOTION_FAILED_EVENT } from "../lib/motionEvents";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const InteractiveModel = dynamic(() => import("./InteractiveModel"), { ssr: false });

/* Each name renders as its own masked line: per-char spans keep the
   magnetic repulsion alive while the line-level span is what the
   opposing entrance + scroll-out parallax translate. */
const FIRST_NAME = ["J", "o", "n", "a", "t", "h", "a", "n"];
const LAST_NAME = ["J", "e", "s", "n", "i"];

interface HeroSectionProps {
  animate?: boolean;
  environment?: MotionEnvironment;
  motionEnabled?: boolean;
  portfolioSectionRef?: React.RefObject<HTMLElement | null>;
}

export default function HeroSection({
  animate = false,
  environment: environmentOverride,
  motionEnabled: motionOverride,
  portfolioSectionRef,
}: HeroSectionProps) {
  const runwayRef = useRef<HTMLDivElement>(null);
  const topGroupRef = useRef<HTMLSpanElement>(null);
  const bottomGroupRef = useRef<HTMLSpanElement>(null);
  const topCharRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const botCharRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const subContentRef = useRef<HTMLDivElement>(null);
  const [detectedEnvironment, setDetectedEnvironment] =
    useState<MotionEnvironment | null>(null);
  const [stageFailed, setStageFailed] = useState(false);
  const loaderSnapshot = useSyncExternalStore(
    loaderControls.subscribe,
    loaderControls.getSnapshot,
    loaderControls.getServerSnapshot,
  );
  const environment = environmentOverride ?? detectedEnvironment;
  const motionEnabled =
    motionOverride ?? environment?.desktopScrub ?? false;
  const webglAvailable = environment?.webglAvailable ?? true;
  const renderLaptop =
    motionEnabled &&
    webglAvailable &&
    !environment?.coarsePointer &&
    !environment?.reducedMotion;
  const mountVisualStage =
    environment != null &&
    /* Only mount the WebGL stage where the laptop actually renders — without
       this, 900-1023px fine-pointer windows paid for an empty GL context
       while nothing ever revealed #projects (review finding). */
    environment.desktopScrub &&
    webglAvailable &&
    !environment.coarsePointer &&
    !environment.reducedMotion &&
    !stageFailed;
  const showPoster =
    !environment?.coarsePointer &&
    (stageFailed ||
      (environment !== undefined &&
        environment !== null &&
        (!renderLaptop || !webglAvailable)));

  useEffect(() => {
    if (environmentOverride) return;
    return subscribeMotionEnvironment(setDetectedEnvironment);
  }, [environmentOverride]);

  /* ── Magnetic character repulsion (pointer interaction) ── */
  useGSAP(() => {
    if (!motionEnabled) return;
    const runway = runwayRef.current;
    if (!runway) return;

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const allChars = [
        ...topCharRefs.current,
        ...botCharRefs.current,
      ].filter(Boolean) as HTMLSpanElement[];
      if (!allChars.length) return;

      const setters = allChars.map((el) => ({
        x: gsap.quickSetter(el, "x", "px") as (v: number) => void,
        y: gsap.quickSetter(el, "y", "px") as (v: number) => void,
      }));

      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
      const cur = allChars.map(() => ({ x: 0, y: 0 }));
      const tgt = allChars.map(() => ({ x: 0, y: 0 }));
      const radius = 200;
      const maxPush = 56;
      let isActive = false;

      /* Cached untransformed char centers (viewport space) — measured
         once via getBoundingClientRect, then reused on every mousemove.
         Reading rects per mousemove is expensive (forced layout) and,
         worse, rects include the chars' own live push transform, which
         moves the measured center and feeds back into the force calc
         (wobble). Subtracting the char's current applied offset (cur)
         yields the rest-position center regardless of when we measure. */
      const centers = allChars.map(() => ({ x: 0, y: 0 }));
      let measureRaf = 0;

      function measureCenters() {
        allChars.forEach((el, i) => {
          const r = el.getBoundingClientRect();
          centers[i].x = r.left + r.width / 2 - cur[i].x;
          centers[i].y = r.top + r.height / 2 - cur[i].y;
        });
      }

      function resetTargets() {
        tgt.forEach((target) => {
          target.x = 0;
          target.y = 0;
        });
      }

      function onMouseMove(e: MouseEvent) {
        if (!isActive) return;

        allChars.forEach((_, i) => {
          const cx = centers[i].x;
          const cy = centers[i].y;
          const dx = e.clientX - cx;
          const dy = e.clientY - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < radius && dist > 0) {
            const force = (1 - dist / radius) * maxPush;
            tgt[i].x = -(dx / dist) * force;
            tgt[i].y = -(dy / dist) * force;
          } else {
            tgt[i].x = 0;
            tgt[i].y = 0;
          }
        });
      }

      /* Scroll/resize can move the chars (e.g. once the sticky hero
         releases post-scroll), so re-measure then — but batched to at
         most once per frame via rAF, never per raw scroll event. */
      function onScrollOrResize() {
        if (!isActive || measureRaf) return;
        measureRaf = requestAnimationFrame(() => {
          measureRaf = 0;
          measureCenters();
        });
      }

      const tickFn = () => {
        allChars.forEach((_, i) => {
          cur[i].x = lerp(cur[i].x, tgt[i].x, 0.075);
          cur[i].y = lerp(cur[i].y, tgt[i].y, 0.075);
          setters[i].x(cur[i].x);
          setters[i].y(cur[i].y);
        });
      };

      function startInteraction() {
        if (isActive) return;
        isActive = true;
        measureCenters();
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("scroll", onScrollOrResize, { passive: true });
        window.addEventListener("resize", onScrollOrResize);
        gsap.ticker.add(tickFn);
      }

      function stopInteraction() {
        isActive = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("scroll", onScrollOrResize);
        window.removeEventListener("resize", onScrollOrResize);
        if (measureRaf) {
          cancelAnimationFrame(measureRaf);
          measureRaf = 0;
        }
        gsap.ticker.remove(tickFn);
        resetTargets();
        allChars.forEach((_, i) => {
          cur[i].x = 0;
          cur[i].y = 0;
          setters[i].x(0);
          setters[i].y(0);
        });
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            startInteraction();
          } else {
            stopInteraction();
          }
        },
        { threshold: 0 }
      );

      observer.observe(runway);

      return () => {
        observer.disconnect();
        stopInteraction();
      };
    });

    return () => mm.revert();
  }, {
    scope: runwayRef,
    dependencies: [motionEnabled],
    revertOnUpdate: true,
  });

  /* ── Initial hidden state for entrance animation ──
     The name lines hide by offset inside their overflow-hidden masks
     (no opacity): Jonathan waits below its mask, Jesni above its own,
     so the entrance is a pure opposing mask-reveal. */
  useGSAP(() => {
    try {
      if (!motionEnabled) {
        const allChars = [
          ...topCharRefs.current,
          ...botCharRefs.current,
        ].filter(Boolean);
        gsap.set(allChars, { clearProps: "transform" });
        gsap.set([".name-part-1", ".name-part-2"], { yPercent: 0 });
        gsap.set(".hero-name-mask", { overflow: "visible" });
        gsap.set([".hero-tagline", ".hero-sub", ".hero-buttons"], { opacity: 1, y: 0 });
        return;
      }

      gsap.set(".name-part-1", { yPercent: 100 });
      gsap.set(".name-part-2", { yPercent: -100 });
      gsap.set(
        [".hero-tagline", ".hero-sub", ".hero-buttons"],
        { opacity: 0, y: -80 }
      );
    } catch {
      gsap.set([".name-part-1", ".name-part-2"], { yPercent: 0 });
      gsap.set(".hero-name-mask", { overflow: "visible" });
      gsap.set(
        [".hero-tagline", ".hero-sub", ".hero-buttons"],
        { opacity: 1, y: 0 }
      );
      window.dispatchEvent(new CustomEvent(MOTION_FAILED_EVENT));
    }
  }, {
    scope: runwayRef,
    dependencies: [motionEnabled],
    revertOnUpdate: true,
  });

  /* ── Entrance animation (fires after preloader) ── */
  useGSAP(() => {
    if (!animate) return;

    if (!motionEnabled) return;
    let mm: ReturnType<typeof gsap.matchMedia> | null = null;

    try {
      mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        /* Opposing mask-reveal: Jonathan rises UP into view while Jesni
           drops DOWN, simultaneously. Once the lines have landed, the
           masks release (overflow: visible) so the magnetic char
           repulsion and the scroll-out fly-apart are never clipped. */
        gsap.to(".name-part-1", {
          yPercent: 0,
          ease: "power3.out",
          duration: 1.35,
        });
        gsap.to(".name-part-2", {
          yPercent: 0,
          ease: "power3.out",
          duration: 1.35,
          onComplete: () => {
            gsap.set(".hero-name-mask", { overflow: "visible" });
          },
        });

        /* Supporting copy follows the name in */
        gsap.to([".hero-tagline", ".hero-sub", ".hero-buttons"], {
          y: 0,
          opacity: 1,
          ease: "power3.out",
          duration: 1.1,
          stagger: 0.08,
          delay: 0.25,
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        /* Instant reveal — no transforms */
        gsap.set([".name-part-1", ".name-part-2"], { yPercent: 0 });
        gsap.set(".hero-name-mask", { overflow: "visible" });
        gsap.set(
          [".hero-tagline", ".hero-sub", ".hero-buttons"],
          { opacity: 1, y: 0 }
        );
      });
    } catch {
      mm?.revert();
      gsap.set([".name-part-1", ".name-part-2"], { yPercent: 0 });
      gsap.set(".hero-name-mask", { overflow: "visible" });
      gsap.set(
        [".hero-tagline", ".hero-sub", ".hero-buttons"],
        { opacity: 1, y: 0 }
      );
      window.dispatchEvent(new CustomEvent(MOTION_FAILED_EVENT));
    }

    return () => mm?.revert();
  }, {
    scope: runwayRef,
    dependencies: [animate, motionEnabled],
    revertOnUpdate: true,
  });

  /* ── Scroll-out parallax (name flies apart, sub-content fades) ── */
  useGSAP(() => {
    const mm = gsap.matchMedia();

    if (!motionEnabled) return;
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: runwayRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 2,
        },
      });

      // The 3D model handles its own exit via the explode shader —
      // we only animate the text columns here.
      tl.to(topGroupRef.current, { y: "-120vh", ease: "power2.in" }, 0)
        .to(bottomGroupRef.current, { y: "120vh", ease: "power2.in" }, 0)
        .to(subContentRef.current, { opacity: 0, y: 28, ease: "none", duration: 0.20 }, 0);
    });

    return () => mm.revert();
  }, {
    scope: runwayRef,
    dependencies: [motionEnabled],
    revertOnUpdate: true,
  });

  /*
   * useGSAP contexts revert in hook order when the immersive media query
   * changes. This final layout effect runs after those contexts and resolves
   * the complete static composition in the same frame, preventing an old
   * entrance or pointer transform from surviving a resize/orientation change.
   */
  useLayoutEffect(() => {
    if (motionEnabled) return;

    const chars = [
      ...topCharRefs.current,
      ...botCharRefs.current,
    ].filter(Boolean);
    const groups = [topGroupRef.current, bottomGroupRef.current].filter(Boolean);

    gsap.killTweensOf([...chars, ...groups, subContentRef.current]);
    gsap.set(chars, { clearProps: "transform" });
    gsap.set(groups, { x: 0, y: 0, yPercent: 0 });
    gsap.set(".hero-name-mask", { overflow: "visible" });
    gsap.set(subContentRef.current, { opacity: 1, y: 0 });
  }, [motionEnabled]);

  return (
    <div ref={runwayRef} className={`hero-runway${motionEnabled ? "" : " hero-runway--static"}`} id="hero">
      {/*
        The full-screen Canvas sits here as an absolute background layer.
        It covers the entire hero sticky area so shards can fly across
        the whole viewport without being clipped by any CSS column.
      */}
      {mountVisualStage && (
        <div
          className="hero-3d-layer"
          aria-hidden="true"
          style={{
            display: "block",
            zIndex: loaderSnapshot.active ? 9998 : undefined,
            opacity: loaderSnapshot.active ? 1 : undefined,
          }}
        >
          <InteractiveModel
            portfolioSectionRef={portfolioSectionRef}
            renderLaptop={renderLaptop}
            onFail={() => setStageFailed(true)}
          />
        </div>
      )}

      <div className="hero-sticky" style={{ pointerEvents: "none" }}>
        <div className="container">
          {/* Constrains the text to the 55fr left column */}
          <div className="hero-inner-grid">
            <div className="hero-text-col" style={{ pointerEvents: "auto" }}>
              {/* Stacked, masked name: each line lives in an
                  overflow-hidden wrapper so the opposing entrance
                  (Jonathan up / Jesni down) reveals through a clean
                  mask. The masks release after the intro lands. */}
              <h1
                className="hero-name-split"
                aria-label="Jonathan Jesni"
                style={{ flexDirection: "column" }}
              >
                <div className="hero-name-mask" style={{ overflow: "hidden" }}>
                  <span
                    ref={topGroupRef}
                    className="hero-char-group name-part-1"
                    aria-hidden="true"
                    style={{ display: "flex" }}
                  >
                    {FIRST_NAME.map((ch, i) => (
                      <span
                        key={`t${i}`}
                        ref={(el) => { topCharRefs.current[i] = el; }}
                        className="hero-char"
                      >
                        {ch}
                      </span>
                    ))}
                  </span>
                </div>
                <div className="hero-name-mask" style={{ overflow: "hidden" }}>
                  <span
                    ref={bottomGroupRef}
                    className="hero-char-group name-part-2"
                    aria-hidden="true"
                    style={{ display: "flex" }}
                  >
                    {LAST_NAME.map((ch, i) => (
                      <span
                        key={`b${i}`}
                        ref={(el) => { botCharRefs.current[i] = el; }}
                        className="hero-char"
                      >
                        {ch}
                      </span>
                    ))}
                  </span>
                </div>
              </h1>

              <div ref={subContentRef} className="hero-sub-content">
                <h2 className="hero-tagline">
                  I engineer <TerminalHighlight delay={1.2} color="#C9A852" animate={animate && motionEnabled}>self-modifying models, computer vision pipelines, and multi-agent infrastructure</TerminalHighlight> from training through deployment.
                </h2>

                <p className="hero-sub">
                  Final-year CS at IIIT Pune, Class of 2027. Open to junior AI/ML roles and internships.
                </p>

                <div className="hero-buttons">
                  <a
                    href="#projects"
                    className="btn btn-primary"
                    id="hero-projects-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      refreshScrollTargets(["projects"]);
                      const y = getScrollTargetY("projects", "landing");
                      if (y == null) return;
                      const lenis = getLenis();
                      if (lenis) {
                        lenis.resize();
                        lenis.scrollTo(y, {
                          duration: 1.3,
                          easing: power4InOut,
                          force: true,
                          lock: false,
                        });
                      }
                      else window.scrollTo({ top: y, behavior: "smooth" });
                    }}
                  >
                    <HoverScrambleText text="Explore featured work" />
                  </a>
                  <a
                    href="https://www.linkedin.com/in/jonathan-jesni/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline"
                    id="hero-linkedin-btn"
                  >
                    <LinkedInIcon size={16} />
                    <HoverScrambleText text="Connect on LinkedIn" />
                  </a>
                  <a
                    href="/assets/Jonathan_Resume.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline"
                    id="hero-resume-btn"
                  >
                    <HoverScrambleText text="View resume" />
                    <span className="btn-arrow" aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>
            </div>
            {showPoster && (
              <div className="hero-laptop-poster" aria-hidden="true">
                <div className="hero-laptop-poster__lid">
                  <div className="hero-laptop-poster__screen">
                    <Image
                      src="/assets/Neuro-genesis/title-card.jpg"
                      alt=""
                      fill
                      sizes="(min-width: 900px) 42vw, 82vw"
                    />
                  </div>
                </div>
                <div className="hero-laptop-poster__base" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
