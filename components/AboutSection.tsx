"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import TerminalBlock from "./TerminalBlock";

gsap.registerPlugin(ScrollTrigger);

/* -------------------------------------------------------
   Bio paragraphs — exact text from the original site.
   Each entry is an array of segments so we can bold
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
    Whether it&apos;s building a multimodal phishing detector as a browser extension, generating
    synthetic training data in Blender, or engineering a deterministic document converter — I focus
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
  const stickyRef = useRef<HTMLDivElement>(null);
  const textColRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const runway = runwayRef.current;
    if (!runway) return;

    const ctx = gsap.context(() => {
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
            color: "rgba(255, 255, 255, 1)",
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

    }, runway);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={runwayRef}
      id="about"
      className="about-runway"
      style={{ height: "250vh" }}
    >
      <div ref={stickyRef} className="about-sticky">
        {/* ---- Inner layout: two columns on desktop ---- */}
        <div className="about-split-container">

          {/* ===== LEFT: Section header + bio ===== */}
          <div ref={textColRef} className="about-split-text">
            {/* Section label */}
            <div className="section-label" style={{ marginBottom: "48px" }}>
              <span className="section-title">About</span>
              <span className="section-line" />
            </div>

            {/* Bio paragraphs — each word is a individually animatable span */}
            <div className="about-bio">
              {BIO_PARAGRAPHS.map((para, idx) => (
                <p key={idx} className="about-bio-para">
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
    // Split the string on spaces and wrap each word
    const tokens = node.split(/(\s+)/);
    return (
      <>
        {tokens.map((token, i) =>
          /^\s+$/.test(token) ? (
            // Preserve whitespace tokens as-is
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

  // React element — recurse into children
  if (React.isValidElement(node)) {
    const el = node as React.ReactElement<{ children?: ReactChild }>;
    const { children, ...rest } = el.props as { children?: ReactChild; [key: string]: unknown };
    return React.cloneElement(el, rest as Record<string, unknown>, <BioWords node={children} />);
  }

  return <>{node}</>;
}
