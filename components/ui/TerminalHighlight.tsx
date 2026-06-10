"use client";

import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

interface TerminalHighlightProps {
  children: React.ReactNode;
  color?: string;
  delay?: number;
  animate?: boolean;
}

export function TerminalHighlight({
  children,
  color = "#C9A876", // default champagne gold
  delay = 0,
  animate = true,
}: TerminalHighlightProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const sweepRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    if (!sweepRef.current || !containerRef.current || !textRef.current || !animate) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 85%", // Triggers when slightly into view
      },
      delay: delay,
    });

    tl.fromTo(
      sweepRef.current,
      { scaleX: 0, transformOrigin: "left center" },
      { scaleX: 1, ease: "power4.inOut", duration: 0.5 }
    ).to(
      textRef.current,
      { color: "#070B14", duration: 0.15 },
      "-=0.25"
    );
  }, { scope: containerRef, dependencies: [animate, delay] });

  return (
    <span
      ref={containerRef}
      style={{
        position: "relative",
        display: "inline-block",
        padding: "0 4px",
        margin: "0 2px",
        whiteSpace: "nowrap",
      }}
    >
      <span
        ref={sweepRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: color,
          zIndex: 0,
        }}
      />
      <span ref={textRef} style={{ position: "relative", zIndex: 1 }}>
        {children}
      </span>
    </span>
  );
}
