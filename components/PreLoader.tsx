"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

/* ================================================================
   40 glitch text strings — mix of sys errors, hex codes, binary
   ================================================================ */
const GLITCH_STRINGS = [
  ">_ SYS.ERR",          "0x00F8A3C1",        "01101110 10110011",  "0xDEADBEEF",
  ">_ KERNEL.PANIC",     "0xFF00CC12A3",       "11001011 00110101",  "0x4A3F00E8",
  ">_ NULL.REF",         "0x00BFFF004E",       "10110101 11001001",  "0xC0FFEE42",
  ">_ STACK.OVERFLOW",   "0x1A2B3C4D5E",       "01010111 00001100",  "0xFACE0FFF",
  ">_ SYS.HALT",         "0xBADF00D1B2",       "11110000 01010101",  "0x0000FFAA",
  ">_ MEM.CORRUPT",      "0xDEAD00001F",       "00101101 10101010",  "0xBAADF00D",
  ">_ BUS.ERROR",        "0xCAFEBABE00",       "11000011 11110001",  "0xFEEDFACE",
  ">_ SEGFAULT",         "0x00FF4400CC",       "10001111 01110000",  "0xABCDEF01",
  ">_ INIT.FAIL",        "0x12345678AB",       "01110110 10011100",  "0xF0F0F0F0",
  ">_ PROC.KILL",        "0xDEAD4E19FF",       "11101001 00110011",  "0x0F0F0F0F",
] as const;

/* ================================================================
   Corner label data — pure chrome aesthetic
   ================================================================ */
const CORNER_LABELS = [
  { pos: { top: "24px",    left:  "24px"  }, text: "[0000:0000]" },
  { pos: { top: "24px",    right: "24px"  }, text: "[FFFF:FFFF]" },
  { pos: { bottom: "24px", left:  "24px"  }, text: ">_ LOADING"  },
  { pos: { bottom: "24px", right: "24px"  }, text: "SYS.INIT..." },
] as const;

/* ================================================================
   Component
   ================================================================ */
interface PreLoaderProps {
  onComplete: () => void;
}

export default function PreLoader({ onComplete }: PreLoaderProps) {
  const overlayRef    = useRef<HTMLDivElement>(null);
  const textRefs      = useRef<(HTMLSpanElement | null)[]>([]);
  const dotRef        = useRef<HTMLDivElement>(null);
  const ringRef       = useRef<HTMLDivElement>(null);
  /* Ref-ify onComplete so the effect never needs to list it as a dep */
  const onCompleteRef = useRef(onComplete);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    let cancelled = false;

    const ctx = gsap.context(() => {
      const texts = textRefs.current.filter(Boolean) as HTMLSpanElement[];
      const dot   = dotRef.current!;
      const ring  = ringRef.current!;

      /* ── Hand all transform control to GSAP immediately ────────────
         This is the CRITICAL FIX: no Math.random() in JSX.
         GSAP scatters elements on mount inside useEffect.
      ──────────────────────────────────────────────────────────────── */
      gsap.set(texts, {
        xPercent: -50,
        yPercent: -50,
        x:        () => gsap.utils.random(-window.innerWidth  * 0.50, window.innerWidth  * 0.50),
        y:        () => gsap.utils.random(-window.innerHeight * 0.50, window.innerHeight * 0.50),
        rotation: () => gsap.utils.random(-45, 45),
        scale:    () => gsap.utils.random(0.5, 2.2),
        opacity:  () => gsap.utils.random(0.15, 0.9),
      });

      /* Dot and ring start hidden, centered — GSAP owns their transforms */
      gsap.set([dot, ring], { xPercent: -50, yPercent: -50, scale: 0, opacity: 0 });

      /* ════════════════════════════════════════════════════════════════
         PHASE 1 — Infinite Glitch Chaos
         repeatRefresh: true forces re-randomization on every iteration
         so "random()" string values produce genuinely new numbers each loop.
      ════════════════════════════════════════════════════════════════ */
      const glitchTl = gsap.timeline({ repeat: -1, repeatRefresh: true });

      glitchTl.to(texts, {
        skewX:   "random(-38, 38)",
        skewY:   "random(-14, 14)",
        scale:   "random(0.15, 3.8)",
        x:       () => gsap.utils.random(-window.innerWidth  * 0.48, window.innerWidth  * 0.48),
        y:       () => gsap.utils.random(-window.innerHeight * 0.48, window.innerHeight * 0.48),
        color:   () => gsap.utils.random(["#00ffff", "#ffffff", "#1f1f1f", "#00ff88", "#ff3366", "#888888"]),
        opacity: "random(0.04, 1.0)",
        duration: 0.18,
        stagger:  { each: 0.014, from: "random" },
        ease:    "none",
        yoyo:    true,
        repeat:   1,
      });

      /* ════════════════════════════════════════════════════════════════
         SMART LOAD TRIGGER
         Both conditions must resolve before Phase 2 fires:
           1. window "load" event (all resources fetched)
           2. 1200 ms minimum cinematic display time
      ════════════════════════════════════════════════════════════════ */
      const loadReady = new Promise<void>((resolve) => {
        if (document.readyState === "complete") {
          resolve();
        } else {
          window.addEventListener("load", () => resolve(), { once: true });
        }
      });

      const minDisplay = new Promise<void>((resolve) =>
        setTimeout(resolve, 1200)
      );

      Promise.all([loadReady, minDisplay]).then(() => {
        if (cancelled) return;

        /* Kill glitch — Phase 2 takes over */
        glitchTl.kill();
        gsap.killTweensOf(texts);

        /* Compute ring expansion scale so it always covers the full viewport */
        const vw          = window.innerWidth;
        const vh          = window.innerHeight;
        const cornerDist  = Math.sqrt(vw * vw + vh * vh) / 2;
        const ringBase    = 6;   /* px — must match ring width/height in JSX */
        const targetScale = Math.ceil((cornerDist * 2.4) / ringBase);

        /* ════════════════════════════════════════════════════════════
           PHASE 2 — The Implosion
           All 40 text elements are sucked into the dead centre.
           power4.in gives the violent "gravity well" pull.
        ════════════════════════════════════════════════════════════ */
        gsap.timeline()

          .to(texts, {
            x:        0,
            y:        0,
            scale:    0,
            opacity:  0,
            skewX:    0,
            skewY:    0,
            rotation: 0,
            duration: 0.85,
            ease:     "power4.in",
            stagger:  { each: 0.008, from: "random" },
          })

          /* White dot swells from the convergence point */
          .to(dot, {
            scale:    1,
            opacity:  1,
            duration: 0.28,
            ease:     "back.out(2.5)",
          }, "-=0.05")

          /* Dot holds 0.1 s … then collapses */
          .to(dot, {
            opacity:  0,
            duration: 0.12,
            ease:     "power2.in",
            delay:    0.1,
          })

          /* ════════════════════════════════════════════════════════
             PHASE 3 — The Sonic Boom
             Ring detonates from the same centre point.
             onStart triggers Hero drop-in exactly at detonation.
          ════════════════════════════════════════════════════════ */
          .fromTo(
            ring,
            { scale: 1, opacity: 1 },
            {
              scale:    targetScale,
              opacity:  0,
              duration: 0.75,
              ease:     "expo.out",
              onStart() {
                onCompleteRef.current(); /* Hero knows it's time */
              },
            },
            "<" /* same moment the dot vanishes */
          )

          /* Overlay fades as the ring tears outward */
          .to(
            overlayRef.current,
            {
              opacity:  0,
              duration: 0.55,
              ease:     "power2.out",
              onComplete() {
                if (!cancelled) setIsDone(true);
              },
            },
            "<0.1"
          );
      });
    }, overlayRef);

    return () => {
      cancelled = true;
      ctx.revert();
    };
  }, []);

  /* Fully removed from DOM after animation completes */
  if (isDone) return null;

  return (
    <div
      ref={overlayRef}
      aria-hidden="true"
      id="preloader-overlay"
      style={{
        position:        "fixed",
        inset:           0,
        zIndex:          9999,
        backgroundColor: "#000000",
        overflow:        "hidden",
      }}
    >
      {/* ── CRT scanline texture ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset:    0,
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.13) 2px,
            rgba(0,0,0,0.13) 4px
          )`,
          pointerEvents: "none",
          zIndex:        1,
        }}
      />

      {/* ── Corner chrome labels ── */}
      {CORNER_LABELS.map(({ pos, text }, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            position:      "absolute",
            ...pos,
            fontFamily:    "var(--font-jetbrains), 'JetBrains Mono', monospace",
            fontSize:      "11px",
            color:         "rgba(255,255,255,0.18)",
            letterSpacing: "0.1em",
            userSelect:    "none",
            pointerEvents: "none",
            zIndex:        2,
          }}
        >
          {text}
        </span>
      ))}

      {/* ── Glitch text elements ──────────────────────────────────────────
          Rendered centred + invisible; GSAP scatters them in useEffect.
          CRITICAL: no Math.random() here → zero hydration mismatch risk.
      ────────────────────────────────────────────────────────────────── */}
      {GLITCH_STRINGS.map((str, i) => (
        <span
          key={i}
          ref={(el) => { textRefs.current[i] = el; }}
          aria-hidden="true"
          style={{
            position:      "absolute",
            left:          "50%",
            top:           "50%",
            /* No CSS transform — GSAP owns the transform matrix entirely */
            opacity:       0,
            fontFamily:    "var(--font-jetbrains), 'JetBrains Mono', 'Courier New', monospace",
            fontSize:      "clamp(9px, 1.3vw, 16px)",
            fontWeight:    700,
            color:         "#ffffff",
            whiteSpace:    "nowrap",
            userSelect:    "none",
            pointerEvents: "none",
            willChange:    "transform, opacity, color",
            letterSpacing: "0.06em",
            zIndex:        3,
          }}
        >
          {str}
        </span>
      ))}

      {/* ── White Dot — GSAP controls all transforms from the start ── */}
      <div
        ref={dotRef}
        aria-hidden="true"
        style={{
          position:        "absolute",
          left:            "50%",
          top:             "50%",
          width:           "4px",
          height:          "4px",
          borderRadius:    "50%",
          backgroundColor: "#ffffff",
          opacity:         0,
          willChange:      "transform, opacity",
          boxShadow:       "0 0 16px 6px rgba(255,255,255,0.8), 0 0 40px 14px rgba(255,255,255,0.3)",
          zIndex:          4,
        }}
      />

      {/* ── Ring — starts at 0 opacity, detonates in Phase 3 ── */}
      <div
        ref={ringRef}
        aria-hidden="true"
        style={{
          position:     "absolute",
          left:         "50%",
          top:          "50%",
          width:        "6px",
          height:       "6px",
          border:       "2px solid #ffffff",
          borderRadius: "50%",
          opacity:      0,
          willChange:   "transform, opacity",
          boxShadow:    "0 0 20px 6px rgba(255,255,255,0.6)",
          zIndex:       4,
        }}
      />
    </div>
  );
}
