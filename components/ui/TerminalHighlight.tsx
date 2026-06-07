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
  color = "#00eaff", // default neon cyan
  delay = 0,
  animate = true,
}: TerminalHighlightProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const sweepRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    if (!sweepRef.current || !containerRef.current || !animate) return;

    gsap.fromTo(
      sweepRef.current,
      { clipPath: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)" },
      {
        clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
        ease: "power4.inOut",
        duration: 1.1, // Slowed down from 0.65
        delay: delay,
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 85%", // Triggers when slightly into view
        },
      }
    );
  }, { scope: containerRef, dependencies: [animate, delay] });

  return (
    <span
      ref={containerRef}
      style={{
        display: "inline-grid",
        whiteSpace: "nowrap",
        margin: "0 2px",
      }}
    >
      {/* Base Layer: Normal Text */}
      <span
        style={{
          gridArea: "1 / 1",
          padding: "0 4px",
        }}
      >
        {children}
      </span>

      {/* Sweep Layer: Neon Background + Black Text */}
      <span
        ref={sweepRef}
        aria-hidden="true"
        style={{
          gridArea: "1 / 1",
          padding: "0 4px",
          backgroundColor: color,
          color: "#000",
          clipPath: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)",
          pointerEvents: "none",
        }}
      >
        {children}
      </span>
    </span>
  );
}
