"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ---- Local inline icon ---- */
function GitHubIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

const TOP    = ["J", "O", "N", "A"];
const BOTTOM = ["T", "H", "A", "N"];

export default function HeroSection({ animate = false }: { animate?: boolean }) {
  const runwayRef      = useRef<HTMLDivElement>(null);
  const greetingRef    = useRef<HTMLParagraphElement>(null);
  const topGroupRef    = useRef<HTMLSpanElement>(null);
  const bottomGroupRef = useRef<HTMLSpanElement>(null);
  const topCharRefs    = useRef<(HTMLSpanElement | null)[]>([]);
  const botCharRefs    = useRef<(HTMLSpanElement | null)[]>([]);
  const subContentRef  = useRef<HTMLDivElement>(null);

  /* ---- 1. MAGNETIC MOUSE EFFECT ---- */
  useEffect(() => {
    const allChars = [
      ...topCharRefs.current,
      ...botCharRefs.current,
    ].filter(Boolean) as HTMLSpanElement[];

    const setters = allChars.map((el) => ({
      x: gsap.quickSetter(el, "x", "px") as (v: number) => void,
      y: gsap.quickSetter(el, "y", "px") as (v: number) => void,
    }));

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const cur = allChars.map(() => ({ x: 0, y: 0 }));
    const tgt = allChars.map(() => ({ x: 0, y: 0 }));

    const RADIUS   = 200;
    const MAX_PUSH = 56;

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

    const tickFn = () => {
      allChars.forEach((_, i) => {
        cur[i].x = lerp(cur[i].x, tgt[i].x, 0.075);
        cur[i].y = lerp(cur[i].y, tgt[i].y, 0.075);
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

  /* ---- 2a. HIDE ON MOUNT ---- */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(
        [
          ".hero-greeting",
          ".hero-name-split",
          ".hero-building",
          ".hero-tagline",
          ".hero-sub",
          ".hero-buttons",
        ],
        { opacity: 0, y: -80 }
      );
    }, runwayRef);
    return () => ctx.revert();
  }, []);

  /* ---- 2b. INTRO DROP-IN — fires after PreLoader curtain ---- */
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
          ".hero-buttons",
        ],
        {
          y: 0,
          opacity: 1,
          ease: "power4.out",
          duration: 1.1,
          stagger: 0.08,
        }
      );
    }, runwayRef);
    return () => ctx.revert();
  }, [animate]);

  /* ---- 3. SCROLL TUNNEL ---- */
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

      tl.to(topGroupRef.current,    { y: "-120vh", ease: "power2.in" }, 0)
        .to(bottomGroupRef.current, { y:  "120vh", ease: "power2.in" }, 0)
        .to(greetingRef.current,   { opacity: 0, y: -28, ease: "none", duration: 0.20 }, 0)
        .to(subContentRef.current, { opacity: 0, y:  28, ease: "none", duration: 0.20 }, 0);
    }, runwayRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={runwayRef} className="hero-runway">
      <div className="hero-sticky" id="hero">
        <div className="container">

          <p ref={greetingRef} className="hero-greeting mono">
            Hi, my name is
          </p>

          {/* Massive JONATHAN split heading */}
          <h1 className="hero-name-split" aria-label="Jonathan">
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

          {/* Sub-content — fades as tunnel opens */}
          <div ref={subContentRef} className="hero-sub-content">
            <p
              className="hero-building mono"
              style={{ color: "var(--ink-3)", fontSize: "12px", marginBottom: "24px", letterSpacing: "0.08em", textTransform: "uppercase" }}
            >
              &gt; currently.building: smarter tools for real-world problems
            </p>

            <h2 className="hero-tagline">
              I build AI-powered tools and systems<br />
              that solve real-world problems.
            </h2>

            <p className="hero-sub">
              CS student focused on AI, cybersecurity, and scalable systems.
            </p>

            <div className="hero-buttons">
              <a
                href="https://github.com/Jonathan-Jesni"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                id="hero-github-btn"
              >
                <GitHubIcon size={16} />
                View My Work
                <span className="btn-arrow" aria-hidden="true">↗</span>
              </a>
              <a
                href="/assets/Jonathan_Resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
                id="hero-resume-btn"
              >
                Resume
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
