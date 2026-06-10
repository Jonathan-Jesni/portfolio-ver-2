"use client";

import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import TerminalBlock from "./TerminalBlock";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* -------------------------------------------------------
   Bio paragraphs — each entry is an array of segments so we can bold
   specific words while still splitting at the word level.
------------------------------------------------------- */
const BIO_PARAGRAPHS = [
  <>
    I&apos;m a 3rd-year Computer Science student at IIIT Pune who builds real tools — not just
    coursework. My focus areas are <strong>AI</strong>, <strong>cybersecurity</strong>, and{" "}
    <strong>systems design</strong>, and I gravitate toward projects that solve practical, tangible
    problems.
  </>,
  <>
    Whether it&apos;s training a dual-stacked U-Net for medical image segmentation, generating
    synthetic disaster scene data in Blender, or engineering a deterministic document converter — I focus
    on software that <strong>works in the real world</strong>.
  </>,
  <>
    I&apos;m always working on something new. Currently leveling up and looking for opportunities to
    build at scale.
  </>,
];

/* -------------------------------------------------------
   Component
------------------------------------------------------- */
export default function AboutSection() {
  const runwayRef = useRef<HTMLElement>(null);
  const textColRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const runway = runwayRef.current;
    if (!runway) return;

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      /* ---- Gather every .reveal-word span inside the text column ---- */
      const words = textColRef.current
        ? Array.from(textColRef.current.querySelectorAll<HTMLElement>(".reveal-word"))
        : [];

      /* ---- Main timeline: word-by-word color scrub ---- */
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: runway,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
        },
      });

      if (words.length > 0) {
        tl.to(
          words,
          {
            color: "rgba(228, 222, 207, 1)",
            ease: "none",
            stagger: {
              each: 0.04,
              from: "start",
            },
          },
          0
        );
      }

      /* ---- Terminal: scrubbed slide-in (reverses on scroll-back) ---- */
      if (terminalRef.current) {
        tl.fromTo(
          terminalRef.current,
          { y: 150, opacity: 0 },
          { y: 0, opacity: 1, duration: 2.0, ease: "power4.out" },
          0
        );
      }
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      /* Words are immediately visible; terminal fades in once */
      if (textColRef.current) {
        const words = Array.from(textColRef.current.querySelectorAll<HTMLElement>(".reveal-word"));
        gsap.set(words, { color: "rgba(228, 222, 207, 1)" });
      }
      if (terminalRef.current) {
        gsap.set(terminalRef.current, { opacity: 0 });
        ScrollTrigger.create({
          trigger: runway,
          start: "top 75%",
          once: true,
          onEnter: () => {
            gsap.to(terminalRef.current, { opacity: 1, duration: 0.4, ease: "power1.out" });
          },
        });
      }
    });

    return () => mm.revert();
  }, { scope: runwayRef });

  return (
    <section
      ref={runwayRef}
      className="about-runway"
      style={{ height: "250vh", position: "relative" }}
    >
      {/* Anchor target placed halfway down the runway so text is mostly revealed */}
      <div id="about" style={{ position: "absolute", top: "45%", width: "100%", pointerEvents: "none" }} aria-hidden="true" />
      <div className="about-sticky">
        {/* ---- Inner layout: two columns on desktop ---- */}
        <div className="about-split-container">

          {/* ===== LEFT: Section header + bio ===== */}
          <div ref={textColRef} className="about-split-text">
            {/* Section header — editorial display heading */}
            <header className="ed-header" style={{ marginBottom: "28px" }}>
              <div className="ed-header-row">
                <span className="ed-eyebrow">04 / Profile</span>
                <span className="ed-meta">Pune · Muscat</span>
              </div>
              <h2 className="ed-heading ed-heading--md">
                About <em>me</em>
              </h2>
            </header>

            {/* Bio paragraphs — each word is individually animatable;
                the first paragraph reads as an oversized editorial lede */}
            <div className="about-bio" data-skew>
              {BIO_PARAGRAPHS.map((para, idx) => (
                <p
                  key={idx}
                  className={idx === 0 ? "about-bio-para about-bio-para--lede" : "about-bio-para"}
                >
                  <BioWords node={para} />
                </p>
              ))}
            </div>
          </div>

          {/* ===== RIGHT: Animated terminal cage ===== */}
          <div ref={terminalRef} className="about-terminal-wrap">
            <TerminalBlock />
          </div>

        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------
   BioWords — walks a React node tree and wraps every
   text-word inside a .reveal-word <span> while leaving
   <strong> nodes and entities intact.
------------------------------------------------------- */
type ReactChild = React.ReactNode;

function BioWords({ node }: { node: ReactChild }): React.ReactElement {
  if (typeof node === "string") {
    const tokens = node.split(/(\s+)/);
    return (
      <>
        {tokens.map((token, i) =>
          /^\s+$/.test(token) ? (
            <React.Fragment key={i}>{token}</React.Fragment>
          ) : token === "" ? null : (
            <span className="reveal-word" key={i}>
              {token}
            </span>
          )
        )}
      </>
    );
  }

  if (typeof node === "number" || typeof node === "boolean") {
    return <>{node}</>;
  }

  if (node === null || node === undefined) {
    return <></>;
  }

  if (Array.isArray(node)) {
    return (
      <>
        {node.map((child, i) => (
          <BioWords key={i} node={child} />
        ))}
      </>
    );
  }

  if (React.isValidElement(node)) {
    const el = node as React.ReactElement<{ children?: ReactChild }>;
    const { children, ...rest } = el.props as { children?: ReactChild; [key: string]: unknown };
    return React.cloneElement(el, rest as Record<string, unknown>, <BioWords node={children} />);
  }

  return <>{node}</>;
}
