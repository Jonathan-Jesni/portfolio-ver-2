"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

/* ================================================================
   PreLoader — Premium counter + power4.inOut curtain reveal
   Art Director constraints:
     ✅ No glitch / hacker strings
     ✅ Monolithic 00 → 100 counter in JetBrains Mono
     ✅ power4.inOut black curtain slides out of viewport
     ✅ Hero animate fires exactly at curtain mid-point
   ================================================================ */

interface PreLoaderProps {
  onComplete: () => void;
}

export default function PreLoader({ onComplete }: PreLoaderProps) {
  const overlayRef      = useRef<HTMLDivElement>(null);
  const curtainRef      = useRef<HTMLDivElement>(null);
  const counterRef      = useRef<HTMLDivElement>(null);
  const labelRef        = useRef<HTMLParagraphElement>(null);
  const onCompleteRef   = useRef(onComplete);
  const [isDone, setIsDone] = useState(false);

  /* Keep the callback ref fresh without triggering re-runs */
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    let cancelled = false;

    const ctx = gsap.context(() => {
      const counter = counterRef.current!;
      const curtain = curtainRef.current!;
      const label   = labelRef.current!;

      /* ── Wait for both: page resources + minimum display time ── */
      const loadReady = new Promise<void>((resolve) => {
        if (document.readyState === "complete") resolve();
        else window.addEventListener("load", () => resolve(), { once: true });
      });

      /* 1800 ms minimum — enough to watch the counter feel weighty */
      const minDisplay = new Promise<void>((resolve) =>
        setTimeout(resolve, 1800)
      );

      /* ── Counter object — GSAP drives the numeric value via a proxy ── */
      const proxy = { val: 0 };

      const countTl = gsap.timeline();

      /* 
         Counter pacing:
         - 0 → 72  in ~1.1s  (power2.in — slow start, accelerates)
         - 72 → 100 in ~0.5s  (power1.in — deliberate last mile)
         This creates the tactile feel of real loading, not a uniform spin.
      */
      countTl
        .to(proxy, {
          val: 72,
          duration: 1.1,
          ease: "power2.in",
          onUpdate() {
            if (counter) counter.textContent = String(Math.floor(proxy.val)).padStart(2, "0");
          },
        })
        .to(proxy, {
          val: 100,
          duration: 0.5,
          ease: "power1.in",
          onUpdate() {
            if (counter) counter.textContent = String(Math.floor(proxy.val)).padStart(2, "0");
          },
        });

      /* ── Once both load + min time resolve, fire the curtain ── */
      Promise.all([loadReady, minDisplay]).then(() => {
        if (cancelled) return;

        /* Kill the counter mid-animation if resources loaded early;
           snap immediately to 100 before the reveal starts */
        countTl.kill();
        if (counter) counter.textContent = "100";

        /*
          ── Curtain reveal sequence ──────────────────────────────────

          The black overlay slides UP out of the viewport using
          power4.inOut — the characteristic ease of premium reveals.

          Architecture: the curtain div covers the entire screen (inset:0).
          We translate it from Y:0 to Y:-100vh. The content beneath it
          is already rendered and just becomes visible as the curtain lifts.

          Hero animate fires at the 40% mark of the curtain travel so
          the first hero elements are already sliding in by the time
          the curtain fully exits — this creates a simultaneous cinematic reveal.
        */
        const CURTAIN_DURATION = 1.0;

        gsap.timeline()
          /* Tiny pause at 100 — lets the eye register "done" before motion */
          .to({}, { duration: 0.18 })

          /* Label cross-fades to nothing */
          .to(label, {
            opacity: 0,
            duration: 0.25,
            ease: "power2.out",
          }, 0.18)

          /* Counter fades out slightly ahead of the curtain lift */
          .to(counter, {
            opacity: 0,
            y: -8,
            duration: 0.30,
            ease: "power3.out",
          }, 0.22)

          /* ── THE CURTAIN LIFT ──
             power4.inOut: starts slow, accelerates through the middle,
             decelerates perfectly as the curtain exits the screen. */
          .to(curtain, {
            yPercent: -100,
            duration: CURTAIN_DURATION,
            ease: "power4.inOut",
            onStart() {
              /* Hero content begins its drop-in mid-curtain */
              gsap.delayedCall(CURTAIN_DURATION * 0.4, () => {
                if (!cancelled) onCompleteRef.current();
              });
            },
            onComplete() {
              if (!cancelled) setIsDone(true);
            },
          }, 0.38); /* 0.38s after counter fades — tight but not rushed */
      });
    }, overlayRef);

    return () => {
      cancelled = true;
      ctx.revert();
    };
  }, []);

  /* Remove from DOM after curtain has fully exited */
  if (isDone) return null;

  return (
    <div
      ref={overlayRef}
      aria-hidden="true"
      id="preloader-overlay"
      style={{
        position:        "fixed",
        inset:           0,
        zIndex:          9998,
        pointerEvents:   "none",
        overflow:        "hidden",
      }}
    >
      {/* ── Black curtain — the element that actually moves ── */}
      <div
        ref={curtainRef}
        style={{
          position:        "absolute",
          inset:           0,
          backgroundColor: "#050505",
          zIndex:          1,
          /* GPU promotion — this element will be translated */
          willChange:      "transform",
          /* A single horizontal hairline at the curtain's bottom edge
             draws attention to the panel as it lifts */
          boxShadow:       "0 -1px 0 rgba(255,255,255,0.06)",
        }}
      />

      {/* ── Counter + label — centered inside the curtain ── */}
      <div
        style={{
          position:        "absolute",
          inset:           0,
          zIndex:          2,
          display:         "flex",
          flexDirection:   "column",
          alignItems:      "center",
          justifyContent:  "center",
          gap:             "12px",
          pointerEvents:   "none",
        }}
      >
        {/* 
          The monolithic counter. JetBrains Mono per AD spec.
          Tabular nums prevents the layout from shifting as digits change.
          Large, heavy, dead-centered — one element, no noise.
        */}
        <div
          ref={counterRef}
          style={{
            fontFamily:     "var(--font-jetbrains), 'JetBrains Mono', monospace",
            fontSize:       "clamp(96px, 18vw, 200px)",
            fontWeight:     600,
            lineHeight:     1,
            letterSpacing:  "-0.04em",
            color:          "rgba(255,255,255,0.92)",
            fontVariantNumeric: "tabular-nums",
            /* Subtle text-shadow gives it weight against pure black */
            textShadow:     "0 0 80px rgba(255,255,255,0.08)",
          }}
        >
          00
        </div>

        {/* Minimal label below — monospaced, dim, upper-case */}
        <p
          ref={labelRef}
          style={{
            fontFamily:    "var(--font-jetbrains), 'JetBrains Mono', monospace",
            fontSize:      "11px",
            fontWeight:    500,
            color:         "rgba(255,255,255,0.25)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            margin:        0,
          }}
        >
          Loading
        </p>
      </div>
    </div>
  );
}
