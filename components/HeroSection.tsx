"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import dynamic from "next/dynamic";
import { GitHubIcon } from "./ui/icons";
import { TerminalHighlight } from "./ui/TerminalHighlight";
import { CircuitUnderline } from "./ui/CircuitUnderline";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const InteractiveModel = dynamic(() => import("./InteractiveModel"), { ssr: false });

const TOP = ["J", "O", "N", "A"];
const BOTTOM = ["T", "H", "A", "N"];

export default function HeroSection({ animate = false }: { animate?: boolean }) {
  const runwayRef = useRef<HTMLDivElement>(null);
  const topGroupRef = useRef<HTMLSpanElement>(null);
  const bottomGroupRef = useRef<HTMLSpanElement>(null);
  const topCharRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const botCharRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const subContentRef = useRef<HTMLDivElement>(null);

  /* ── Magnetic character repulsion (pointer interaction) ── */
  useGSAP(() => {
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

      function resetTargets() {
        tgt.forEach((target) => {
          target.x = 0;
          target.y = 0;
        });
      }

      function onMouseMove(e: MouseEvent) {
        if (!isActive) return;

        allChars.forEach((el, i) => {
          const r = el.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
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
        window.addEventListener("mousemove", onMouseMove);
        gsap.ticker.add(tickFn);
      }

      function stopInteraction() {
        if (!isActive) return;
        isActive = false;
        window.removeEventListener("mousemove", onMouseMove);
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
  }, { scope: runwayRef });

  /* ── Initial hidden state for entrance animation ── */
  useGSAP(() => {
    gsap.set(
      [
        ".hero-name-split",
        ".hero-tagline",
        ".hero-sub",
        ".hero-buttons",
      ],
      { opacity: 0, y: -80 }
    );
  }, { scope: runwayRef });

  /* ── Entrance animation (fires after preloader) ── */
  useGSAP(() => {
    if (!animate) return;

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.to(
        [
          ".hero-name-split",
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
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      /* Instant reveal — no transforms */
      gsap.set(
        [".hero-name-split", ".hero-tagline", ".hero-sub", ".hero-buttons"],
        { opacity: 1, y: 0 }
      );
    });

    return () => mm.revert();
  }, { scope: runwayRef, dependencies: [animate] });

  /* ── Scroll-out parallax (name flies apart, sub-content fades) ── */
  useGSAP(() => {
    const mm = gsap.matchMedia();

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
      tl.to(topGroupRef.current,    { y: "-120vh", ease: "power2.in" }, 0)
        .to(bottomGroupRef.current, { y: "120vh",  ease: "power2.in" }, 0)
        .to(subContentRef.current,  { opacity: 0, y: 28, ease: "none", duration: 0.20 }, 0);
    });

    return () => mm.revert();
  }, { scope: runwayRef });

  return (
    <div ref={runwayRef} className="hero-runway" id="hero-runway">
      {/*
        The full-screen Canvas sits here as an absolute background layer.
        It covers the entire hero sticky area so shards can fly across
        the whole viewport without being clipped by any CSS column.
      */}
      <div className="hero-3d-layer" aria-hidden="true">
        <InteractiveModel />
      </div>

      <div className="hero-sticky" id="hero" style={{ pointerEvents: "none" }}>
        <div className="container">
          {/* Restore inner grid so the text is constrained to the 55fr left column */}
          <div className="hero-inner-grid">
            <div className="hero-text-col" style={{ pointerEvents: "auto" }}>
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

            <div ref={subContentRef} className="hero-sub-content">
              <h2 className="hero-tagline">
                I build <TerminalHighlight delay={1.2} animate={animate}>AI-powered tools</TerminalHighlight> and systems<br />
                that solve <CircuitUnderline delay={1.8} color="#00eaff" animate={animate}>real-world problems</CircuitUnderline>.
              </h2>

              <p className="hero-sub">
                CS student focused on AI, <CircuitUnderline delay={2.0} animate={animate}>cybersecurity</CircuitUnderline>, and <TerminalHighlight delay={1.4} color="#b829ff" animate={animate}>scalable systems</TerminalHighlight>.
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
      </div>
    </div>
  );
}
