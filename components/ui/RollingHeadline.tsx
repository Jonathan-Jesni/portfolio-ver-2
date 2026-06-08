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

    if (manualTrigger) {
      // Play immediately without a ScrollTrigger (triggered programmatically)
      gsap.fromTo(".char-track", 
        { yPercent: 0 },
        {
          yPercent: -500, // Translate up by 500% to roll through 5 ghost characters
          ease: "power4.out", // High-acceleration curve gives a snappy start and smooth settle
          duration: 1.0, // Slower, longer duration for more rolls
          stagger: 0.02, // Slightly more relaxed stagger
        }
      );
    } else {
      const runway = containerRef.current.closest('.sp-runway');

      // Use GSAP native scoped selector string with fromTo to guarantee the start coordinates are mapped
      gsap.fromTo(".char-track", 
        { yPercent: 0 },
        {
          yPercent: -500, // Translate up by 500% to roll through 5 ghost characters
          ease: "power4.out", // High-acceleration curve gives a snappy start and smooth settle
          duration: 1.0, // Slower, longer duration for more rolls
          stagger: 0.02, // Slightly more relaxed stagger
          scrollTrigger: {
            trigger: runway || containerRef.current,
            start: runway ? "top -40%" : "top 95%", // Delay if inside a SpatialSection runway
            toggleActions: "restart none none reset", // Roll on enter, snap back on leave reverse
          },
        }
      );
    }
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
