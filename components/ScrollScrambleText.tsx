"use client";

import React, { useRef, useState, useCallback } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* ─────────────────────────────────────────────────────────────
   ScrollScrambleText — scroll-bound glyph-stamp heading

   A scroll-triggered sibling of HoverScrambleText. Instead of
   resolving on mouse-enter, it stamps the heading into existence as
   the section snaps into view: the text rapidly cycles through raw
   terminal syntax (0 1 _ [ ] < > …) and freezes left → right into its
   final, immaculate typographic state — a champagne 50×2px hairline
   tick blinking beside it like a metronome to ground the interface.

   · Mixed markup is preserved: pass `segments` and any `em: true`
     word keeps its serif-italic accent styling while it scrambles.
   · A hidden sizer reserves the final width so glyph jitter never
     reflows the layout — only the absolutely-stacked live copy moves.
   · Desktop + full motion only. On mobile / reduced-motion the final
     text renders flat with no scramble and the tick sits solid.
   ───────────────────────────────────────────────────────────── */

/* Raw terminal syntax the heading stamps through before it freezes */
const GLYPHS = "01_[]<>/{}=+*?#".split("");

export interface ScrambleSegment {
  text: string;
  em?: boolean;
}

interface ScrollScrambleTextProps {
  segments: ScrambleSegment[];
  /** ms to fully resolve the line, left → right */
  duration?: number;
  /** ScrollTrigger start — when the stamp fires */
  start?: string;
  className?: string;
}

export default function ScrollScrambleText({
  segments,
  duration = 620,
  start = "top 62%",
  className = "",
}: ScrollScrambleTextProps) {
  const full = segments.map((s) => s.text).join("");

  const rootRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  /* Defaults to the final text so SSR / no-JS / reduced-motion all
     render the immaculate state — the scramble only ever overwrites
     this on the client, on desktop, once the section enters. */
  const [display, setDisplay] = useState(full);
  const [stamping, setStamping] = useState(false);

  /* A scrambled copy with the first `resolved` characters locked in */
  const scrambleFrom = useCallback(
    (resolved: number) =>
      full
        .split("")
        .map((ch, i) => {
          if (ch === " ") return " ";
          if (i < resolved) return ch;
          return GLYPHS[(Math.random() * GLYPHS.length) | 0];
        })
        .join(""),
    [full]
  );

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
  }, []);

  /* Armed: frozen scramble, waiting for the section to enter */
  const arm = useCallback(() => {
    stop();
    setStamping(false);
    setDisplay(scrambleFrom(0));
  }, [scrambleFrom, stop]);

  /* Stamp: rapid cycle, resolving left → right, then freeze */
  const run = useCallback(() => {
    stop();
    setStamping(true);
    startTimeRef.current = performance.now();

    const tick = (t: number) => {
      const elapsed = t - startTimeRef.current;
      const resolved = Math.floor((elapsed / duration) * full.length);

      if (resolved >= full.length) {
        setDisplay(full);
        setStamping(false);
        return;
      }
      setDisplay(scrambleFrom(resolved));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [duration, full, scrambleFrom, stop]);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const trigger = root.closest<HTMLElement>(".about-runway") || root;

      const mm = gsap.matchMedia();

      mm.add("(min-width: 769px) and (prefers-reduced-motion: no-preference)", () => {
        arm(); // start scrambled + frozen, waiting to enter

        const st = ScrollTrigger.create({
          trigger,
          start,
          onEnter: run,
          onLeaveBack: arm, // re-arm so re-entry replays the stamp
        });

        return () => {
          st.kill();
          stop();
          setStamping(false);
          setDisplay(full); // restore the final state on teardown
        };
      });

      return () => mm.revert();
    },
    { scope: rootRef }
  );

  /* Slice the live string back into the original segments so the <em>
     word keeps its serif-italic accent styling while it scrambles */
  let cursor = 0;
  const liveSegments = segments.map((seg, i) => {
    const slice = display.slice(cursor, cursor + seg.text.length);
    cursor += seg.text.length;
    return seg.em ? (
      <em key={i}>{slice}</em>
    ) : (
      <React.Fragment key={i}>{slice}</React.Fragment>
    );
  });

  return (
    <span ref={rootRef} className={`scramble ${className}`.trim()}>
      <span
        className={`scramble-tick${stamping ? " is-stamping" : ""}`}
        aria-hidden="true"
      />
      <span className="scramble-stage" aria-hidden="true">
        {/* sizer — reserves the final width so glyphs never reflow */}
        <span className="scramble-sizer">
          {segments.map((seg, i) =>
            seg.em ? (
              <em key={i}>{seg.text}</em>
            ) : (
              <React.Fragment key={i}>{seg.text}</React.Fragment>
            )
          )}
        </span>
        {/* live — the stamping copy, stacked over the sizer */}
        <span className="scramble-live">{liveSegments}</span>
      </span>
      <span className="sr-only">{full}</span>
    </span>
  );
}
