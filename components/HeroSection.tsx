"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ---- Local inline icon to avoid cross-component imports ---- */
function GitHubIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

/* ---- Character groups ---- */
const TOP    = ["J", "O", "N", "A"];
const BOTTOM = ["T", "H", "A", "N"];

export default function HeroSection({ animate = false }: { animate?: boolean }) {
  /* --- Refs --- */
  const runwayRef      = useRef<HTMLDivElement>(null);
  const greetingRef    = useRef<HTMLParagraphElement>(null);
  const topGroupRef    = useRef<HTMLSpanElement>(null);
  const bottomGroupRef = useRef<HTMLSpanElement>(null);
  const topCharRefs    = useRef<(HTMLSpanElement | null)[]>([]);
  const botCharRefs    = useRef<(HTMLSpanElement | null)[]>([]);
  const subContentRef  = useRef<HTMLDivElement>(null);

  /* ======================================================
     1.  MAGNETIC MOUSE EFFECT  (quickSetter + lerp via ticker)
  ====================================================== */
  useEffect(() => {
    const allChars = [
      ...topCharRefs.current,
      ...botCharRefs.current,
    ].filter(Boolean) as HTMLSpanElement[];

    // One quickSetter pair per character span
    const setters = allChars.map((el) => ({
      x: gsap.quickSetter(el, "x", "px") as (v: number) => void,
      y: gsap.quickSetter(el, "y", "px") as (v: number) => void,
    }));

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    // Per-character lerp state
    const cur = allChars.map(() => ({ x: 0, y: 0 }));
    const tgt = allChars.map(() => ({ x: 0, y: 0 }));

    const RADIUS   = 200; // px — proximity radius
    const MAX_PUSH = 60;  // px — max repulsion distance

    function onMouseMove(e: MouseEvent) {
      allChars.forEach((el, i) => {
        const r  = el.getBoundingClientRect();
        const cx = r.left + r.width  / 2;
        const cy = r.top  + r.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < RADIUS && dist > 0) {
          const force = (1 - dist / RADIUS) * MAX_PUSH;
          tgt[i].x = -(dx / dist) * force;
          tgt[i].y = -(dy / dist) * force;
        } else {
          tgt[i].x = 0;
          tgt[i].y = 0;
        }
      });
    }

    // Lerp smoothing runs every GSAP tick (already synced with Lenis)
    const tickFn = () => {
      allChars.forEach((_, i) => {
        cur[i].x = lerp(cur[i].x, tgt[i].x, 0.08);
        cur[i].y = lerp(cur[i].y, tgt[i].y, 0.08);
        setters[i].x(cur[i].x);
        setters[i].y(cur[i].y);
      });
    };

    gsap.ticker.add(tickFn);
    window.addEventListener("mousemove", onMouseMove);

    return () => {
      gsap.ticker.remove(tickFn);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  /* ======================================================
     2a. HIDE ON MOUNT
         Sets hero elements invisible immediately so nothing
         flashes under the PreLoader overlay.
  ====================================================== */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(
        [
          ".hero-greeting",
          ".hero-name-split",
          ".hero-building",
          ".hero-tagline",
          ".hero-sub",
          ".hero-impact",
          ".hero-buttons",
        ],
        { opacity: 0, y: -100 }
      );
    }, runwayRef);
    return () => ctx.revert();
  }, []);

  /* ======================================================
     2b. INTRO DROP-IN  (fires once animate flips to true)
         Every hero block slams in from above with back-ease snap.
         Called by PreLoader's onComplete via page.tsx state.
  ====================================================== */
  useEffect(() => {
    if (!animate) return;
    const ctx = gsap.context(() => {
      gsap.to(
        [
          ".hero-greeting",
          ".hero-name-split",
          ".hero-building",
          ".hero-tagline",
          ".hero-sub",
          ".hero-impact",
          ".hero-buttons",
        ],
        {
          y: 0,
          opacity: 1,
          ease: "back.out(1.5)",
          duration: 1.2,
          stagger: 0.1,
        }
      );
    }, runwayRef);
    return () => ctx.revert();
  }, [animate]);

  /* ======================================================
     3.  SCROLL TUNNEL  (runway → sticky, scrub: 2)
         TOP chars   → fly upward   (-120 vh)
         BOTTOM chars → fly downward (+120 vh)
         Greeting + sub-content fade out quickly
  ====================================================== */
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: runwayRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 2,
        },
      });

      // Letters part (drives the "portal opening")
      tl.to(topGroupRef.current,    { y: "-120vh", ease: "power2.in" }, 0)
        .to(bottomGroupRef.current, { y:  "120vh", ease: "power2.in" }, 0)
        // Greeting and sub-content fade out early so the void opens cleanly
        .to(greetingRef.current,   { opacity: 0, y: -32, ease: "none", duration: 0.22 }, 0)
        .to(subContentRef.current, { opacity: 0, y:  32, ease: "none", duration: 0.22 }, 0);
    }, runwayRef);

    return () => ctx.revert();
  }, []);

  return (
    /* 300 vh runway gives scrub room to feel heavy and deliberate */
    <div ref={runwayRef} className="hero-runway">
      <div className="hero-sticky" id="hero">
        <div className="container">

          <p ref={greetingRef} className="hero-greeting mono" data-hero-intro>
            Hi, my name is
          </p>

          {/* ---- The massive JONATHAN split heading ---- */}
          <h1 className="hero-name-split" aria-label="Jonathan" data-hero-intro>
            {/* TOP half — flies up on scroll */}
            <span ref={topGroupRef} className="hero-char-group" aria-hidden="true">
              {TOP.map((ch, i) => (
                <span
                  key={`t${i}`}
                  ref={(el) => { topCharRefs.current[i] = el; }}
                  className="hero-char"
                >
                  {ch}
                </span>
              ))}
            </span>

            {/* BOTTOM half — flies down on scroll */}
            <span ref={bottomGroupRef} className="hero-char-group" aria-hidden="true">
              {BOTTOM.map((ch, i) => (
                <span
                  key={`b${i}`}
                  ref={(el) => { botCharRefs.current[i] = el; }}
                  className="hero-char"
                >
                  {ch}
                </span>
              ))}
            </span>
          </h1>

          {/* ---- Sub-content fades out as the tunnel opens ---- */}
          <div ref={subContentRef} className="hero-sub-content">
            <p
              className="hero-building mono"
              style={{ color: "var(--gray-500)", fontSize: "14px", marginBottom: "24px" }}
              data-hero-intro
            >
              &gt; currently.building: smarter tools for real-world problems
            </p>

            <h2 className="hero-tagline" data-hero-intro>
              I build AI-powered tools and systems
              <br />
              that solve real-world problems.
            </h2>

            <p className="hero-sub" data-hero-intro>
              Computer Science student focused on AI, cybersecurity, and scalable systems.
            </p>

            <p
              className="hero-impact mono"
              style={{
                color: "var(--gray-400)",
                fontSize: "14px",
                marginBottom: "48px",
                maxWidth: "600px",
              }}
              data-hero-intro
            >
              Built and deployed 4 real-world systems across AI, cybersecurity, and large-scale data processing.
            </p>

            <div className="hero-buttons" data-hero-intro>
              <a
                href="https://github.com/Jonathan-Jesni"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                id="hero-github-btn"
              >
                <GitHubIcon size={18} />
                View My Work
              </a>
              <a
                href="/assets/Jonathan_Resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
                id="hero-resume-btn"
              >
                View Resume ↗
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
