"use client";

import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface RollingHeadlineProps {
  text: string;
  className?: string;
  animate?: boolean;
  manualTrigger?: boolean;
}

export function RollingHeadline({ text, className = "", animate = true, manualTrigger = false }: RollingHeadlineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!animate || !containerRef.current) return;

    // yPercent -500 rolls each char up through its 5 ghost layers.
    const toVars: gsap.TweenVars = {
      yPercent: -500,
      ease: "power4.out",
      duration: 1.0,
      stagger: 0.02,
    };

    // manualTrigger plays now; otherwise bind to scroll. A .sp-runway
    // ancestor delays the start so it fires deeper into the runway.
    if (!manualTrigger) {
      const runway = containerRef.current.closest(".sp-runway");
      toVars.scrollTrigger = {
        trigger: runway || containerRef.current,
        start: runway ? "top -40%" : "top 95%",
        toggleActions: "restart none none reset", // roll in, snap back on leave-reverse
      };
    }

    gsap.fromTo(".char-track", { yPercent: 0 }, toVars);
  }, { scope: containerRef, dependencies: [animate, manualTrigger] });

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        display: "flex",
        flexWrap: "wrap",
        overflow: "hidden",
        justifyContent: "center", // Keep it centered in the middle of the container
        width: "100%"
      }}
    >
      {text.split("").map((char, i) => (
        <span
          key={i}
          style={{ position: "relative", display: "inline-block", overflow: "hidden" }}
        >
          <span
            className="char-track"
            style={{ display: "inline-block", willChange: "transform", position: "relative" }}
          >
            {/* Active Character Layer (1st) */}
            <span style={{ display: "inline-block", whiteSpace: "pre" }}>
              {char === " " ? "\u00A0" : char}
            </span>
            
            {/* Ghost Character Layers (5 extra rolls) */}
            {[1, 2, 3, 4, 5].map((ghostIndex) => (
              <span
                key={ghostIndex}
                style={{
                  position: "absolute",
                  top: `${ghostIndex * 100}%`,
                  left: 0,
                  display: "inline-block",
                  whiteSpace: "pre",
                }}
                aria-hidden="true"
              >
                {char === " " ? "\u00A0" : char}
              </span>
            ))}
          </span>
        </span>
      ))}
    </div>
  );
}
