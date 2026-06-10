"use client";

import React, { useRef, useState, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

interface CircuitUnderlineProps {
  children: React.ReactNode;
  color?: string;
  delay?: number;
  animate?: boolean;
}

export function CircuitUnderline({
  children,
  color = "#C9A876", // champagne gold default
  delay = 0,
  animate = true,
}: CircuitUnderlineProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGPathElement>(null);
  const [width, setWidth] = useState(0);
  const [pathLength, setPathLength] = useState(0);

  // Track the exact pixel width of the text to draw a precise SVG
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Update path length when width changes
  useEffect(() => {
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength());
    }
  }, [width]);

  // Entrance Animation
  useGSAP(() => {
    if (!pathRef.current || pathLength === 0 || !animate) return;

    gsap.fromTo(
      pathRef.current,
      { strokeDasharray: pathLength, strokeDashoffset: pathLength },
      {
        strokeDashoffset: 0,
        ease: "power3.inOut",
        duration: 0.7, // Snappy SVG trace
        delay: delay,
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 85%",
        },
      }
    );
  }, { scope: containerRef, dependencies: [pathLength, delay, animate] });

  // Hover Data Packet Animation
  const handleMouseEnter = () => {
    if (!dotRef.current || pathLength === 0) return;
    
    // Kill any ongoing animation so it restarts clean
    gsap.killTweensOf(dotRef.current);
    
    gsap.fromTo(
      dotRef.current,
      { strokeDasharray: `0 ${pathLength * 2}`, strokeDashoffset: 0, opacity: 1 },
      {
        strokeDashoffset: -pathLength,
        ease: "power2.inOut",
        duration: 0.8, // Slowed down from 0.45
        onComplete: () => gsap.set(dotRef.current, { opacity: 0 }),
      }
    );
  };

  // The 45-degree angle drop size
  const drop = 8;
  const pathD = width > drop 
    ? `M 0 2 L ${width - drop} 2 L ${width} ${2 + drop}`
    : `M 0 2 L ${width} 2`; // fallback if too small

  return (
    <span
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      style={{
        position: "relative",
        display: "inline-block",
        whiteSpace: "nowrap",
        cursor: "default",
      }}
    >
      {children}
      
      {/* SVG Canvas for the Circuit Line */}
      {width > 0 && (
        <svg
          style={{
            position: "absolute",
            bottom: -drop - 2, // hang below text
            left: 0,
            width: width,
            height: drop + 4,
            pointerEvents: "none",
            overflow: "visible",
          }}
        >
          {/* Main static line (drawn on scroll) */}
          <path
            ref={pathRef}
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="square"
            strokeLinejoin="miter"
            style={{ opacity: 0.8 }}
          />
          
          {/* Data packet dot (invisible until hover) */}
          <path
            ref={dotRef}
            d={pathD}
            fill="none"
            stroke="#ffffff"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="miter"
            style={{ opacity: 0 }}
          />
        </svg>
      )}
    </span>
  );
}
