"use client";

import React, { useState, useEffect, useRef } from "react";

const CHARS = "!<>-_\\\\/[]{}—=+*^?#_";

interface HoverScrambleTextProps {
  text: string;
  className?: string;
  duration?: number;
}

export function HoverScrambleText({ text, className = "", duration = 300 }: HoverScrambleTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isHovering, setIsHovering] = useState(false);
  const frameRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;

    // Attach hover listener to the closest interactive parent (button or link)
    // so that the scramble triggers even if the user hovers the padding.
    const parent = el.closest('a, button') || el.parentElement;
    if (!parent) return;

    const onEnter = () => {
      startRef.current = performance.now();
      setIsHovering(true);
    };

    parent.addEventListener("mouseenter", onEnter);
    return () => {
      parent.removeEventListener("mouseenter", onEnter);
    };
  }, []);

  useEffect(() => {
    if (!isHovering) return;

    const animate = (time: number) => {
      const elapsed = time - startRef.current;
      
      // Calculate how many characters should be resolved
      const resolvedCount = Math.floor((elapsed / duration) * text.length);

      if (resolvedCount >= text.length) {
        setDisplayText(text);
        setIsHovering(false); // Finished resolving, ready for next hover
        return;
      }

      const nextText = text.split("").map((char, index) => {
        if (char === " ") return " ";
        if (index < resolvedCount) {
          return char;
        }
        return CHARS[Math.floor(Math.random() * CHARS.length)];
      }).join("");

      setDisplayText(nextText);
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameRef.current);
    };
  }, [isHovering, text, duration]);

  return (
    <span 
      ref={spanRef}
      className={`relative inline-block ${className}`}
      style={{ position: "relative", display: "inline-block" }}
    >
      <span style={{ visibility: "hidden" }}>{text}</span>
      <span style={{ position: "absolute", left: 0, top: 0, whiteSpace: "nowrap" }}>
        {displayText}
      </span>
    </span>
  );
}
