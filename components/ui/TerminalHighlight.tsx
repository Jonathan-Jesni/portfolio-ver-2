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
  color = "#C9A852",
  delay = 0,
  animate = true,
}: TerminalHighlightProps) {
  const containerRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const highlight = containerRef.current;
    if (!highlight) return;

    if (!animate) {
      gsap.set(highlight, { backgroundSize: "100% 100%", color: "#0D0B09" });
      return;
    }

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      /* A cloned inline background gives every wrapped line its own gold
         plate, so the long statement can wrap without crossing the laptop. */
      const tl = gsap.timeline({ delay });
      tl.fromTo(
        highlight,
        { backgroundSize: "0% 100%", color: "inherit" },
        { backgroundSize: "100% 100%", ease: "power4.inOut", duration: 0.5 }
      ).to(highlight, { color: "#0D0B09", duration: 0.15 }, "-=0.25");
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set(highlight, { backgroundSize: "100% 100%", color: "#0D0B09" });
    });

    return () => mm.revert();
  }, { scope: containerRef, dependencies: [animate, delay] });

  return (
    <span
      ref={containerRef}
      className="terminal-highlight"
      style={{ "--terminal-highlight-color": color } as React.CSSProperties}
    >
      {children}
    </span>
  );
}
