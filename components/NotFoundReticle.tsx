"use client";

import { useEffect, useRef } from "react";

/* Mirrors CursorReticle's scrambleIn() (components/CursorReticle.tsx,
   ~lines 186-202) so the 404 label decodes with the same "detection" read
   as the live cursor. Same glyph set as HoverScrambleText
   (components/ui/HoverScrambleText.tsx) — already duplicated there, so a
   local copy here matches existing practice rather than a shared refactor. */
const CHARS = "!<>-_\\/[]{}~=+*^?#_";
const SCRAMBLE_MS = 250;

export default function NotFoundReticle({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Reduced motion: leave the server-rendered final text untouched.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const start = performance.now();
    const frame = (t: number) => {
      const solved = Math.floor(((t - start) / SCRAMBLE_MS) * text.length);
      if (solved >= text.length) {
        el.textContent = text;
        return;
      }
      el.textContent = text
        .split("")
        .map((c, i) => (c === " " || i < solved ? c : CHARS[(Math.random() * CHARS.length) | 0]))
        .join("");
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => cancelAnimationFrame(raf);
  }, [text]);

  return (
    <span ref={ref} className="nf-label">
      {text}
    </span>
  );
}
