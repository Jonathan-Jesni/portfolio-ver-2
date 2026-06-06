"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import dynamic from "next/dynamic";
import { GitHubIcon } from "./icons";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const CanvasSequence = dynamic(() => import("./CanvasSequence"), { ssr: false });

const TOP = ["J", "O", "N", "A"];
const BOTTOM = ["T", "H", "A", "N"];

export default function HeroSection({ animate = false }: { animate?: boolean }) {
  const runwayRef = useRef<HTMLDivElement>(null);
  const greetingRef = useRef<HTMLParagraphElement>(null);
  const topGroupRef = useRef<HTMLSpanElement>(null);
  const bottomGroupRef = useRef<HTMLSpanElement>(null);
  const topCharRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const botCharRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const subContentRef = useRef<HTMLDivElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const runway = runwayRef.current;
    if (!runway) return;

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
  }, { scope: runwayRef });

  useGSAP(() => {
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
    gsap.set(".hero-canvas-wrap", { opacity: 0 });
  }, { scope: runwayRef });

  useGSAP(() => {
    if (!animate) return;

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

    gsap.to(".hero-canvas-wrap", {
      opacity: 1,
      duration: 1.4,
      ease: "power2.out",
      delay: 0.5,
    });
  }, { scope: runwayRef, dependencies: [animate] });

  useGSAP(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: runwayRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 2,
      },
    });

    tl.to(topGroupRef.current, { y: "-120vh", ease: "power2.in" }, 0)
      .to(bottomGroupRef.current, { y: "120vh", ease: "power2.in" }, 0)
      .to(greetingRef.current, { opacity: 0, y: -28, ease: "none", duration: 0.20 }, 0)
      .to(subContentRef.current, { opacity: 0, y: 28, ease: "none", duration: 0.20 }, 0)
      .to(canvasWrapRef.current, { opacity: 0, scale: 1.08, ease: "power2.in", duration: 0.4 }, 0);
  }, { scope: runwayRef });

  return (
    <div ref={runwayRef} className="hero-runway" id="hero-runway">
      <div className="hero-sticky" id="hero">
        <div className="container">
          <div className="hero-inner-grid">
            <div className="hero-text-col">
              <p ref={greetingRef} className="hero-greeting mono">
                Hi, my name is
              </p>

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

            <div ref={canvasWrapRef} className="hero-canvas-wrap" aria-hidden="true">
              <CanvasSequence
                runwaySelector="#hero-runway"
                totalFrames={120}
                src="/sequence/frame-[i].webp"
                padLength={3}
                placeholder={true}
                start={0.05}
                end={0.75}
                className="hero-sequence-canvas"
              />
              <div className="hero-canvas-vignette" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
