"use client";

import React, { useRef, useCallback, useEffect } from "react";

/* ─── Types ──────────────────────────────────────────────────────────── */
export interface CometCardProps {
  /** Degrees of 3-D rotation on mouse movement. Higher = more dramatic. */
  rotateDepth?: number;
  /** Pixels of XY translation on mouse movement. Higher = more movement. */
  translateDepth?: number;
  /** Additional classes on the outermost wrapper. */
  className?: string;
  /** The content rendered inside the card shell. */
  children: React.ReactNode;
}

/* ─── Component ──────────────────────────────────────────────────────── */
export function CometCard({
  rotateDepth    = 17.5,
  translateDepth = 20,
  className      = "",
  children,
}: CometCardProps) {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const rafRef   = useRef<number | null>(null);
  const stateRef = useRef({ rx: 0, ry: 0, tx: 0, ty: 0 });
  /* Idle gate: the rAF lerp loop parks itself once the card has settled back to
     rest (no hover) so it isn't writing a transform every frame forever. Any
     pointer move (or leave) re-arms it via wake(). */
  const wakeRef  = useRef<() => void>(() => {});

  /* ── Derive the target tilt/translate from pointer position ── */
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const el = wrapRef.current;
      if (!el) return;

      const r  = el.getBoundingClientRect();
      /* Normalised coords: -1 to +1 from centre */
      const nx = (e.clientX - r.left  - r.width  / 2) / (r.width  / 2);
      const ny = (e.clientY - r.top   - r.height / 2) / (r.height / 2);

      stateRef.current = {
        rx: -ny * rotateDepth,
        ry:  nx * rotateDepth,
        tx:  nx * translateDepth,
        ty:  ny * translateDepth,
      };
      wakeRef.current();
    },
    [rotateDepth, translateDepth],
  );

  /* ── Reset on leave ── */
  const handleMouseLeave = useCallback(() => {
    stateRef.current = { rx: 0, ry: 0, tx: 0, ty: 0 };
    wakeRef.current();
  }, []);

  /* ── Animate: lerp the current transform toward the target each frame ── */
  useEffect(() => {
    let crx = 0, cry = 0, ctx = 0, cty = 0;
    const LERP = 0.09;
    /* Below this the card is visually at its target — stop writing/scheduling. */
    const EPS = 0.01;

    function tick() {
      const { rx, ry, tx, ty } = stateRef.current;
      const el = wrapRef.current;

      crx += (rx  - crx) * LERP;
      cry += (ry  - cry) * LERP;
      ctx += (tx  - ctx) * LERP;
      cty += (ty  - cty) * LERP;

      if (el) {
        el.style.transform = `
          perspective(900px)
          rotateX(${crx}deg)
          rotateY(${cry}deg)
          translate3d(${ctx * 0.4}px, ${cty * 0.4}px, 0)
        `;
      }

      /* Park the loop once we've converged on the target (typically rest, 0/0).
         Snap to the exact target for the final frame so we don't leave a sub-EPS
         residual transform, then stop scheduling until wake() re-arms. */
      const settled =
        Math.abs(rx - crx) < EPS && Math.abs(ry - cry) < EPS &&
        Math.abs(tx - ctx) < EPS && Math.abs(ty - cty) < EPS;

      if (settled) {
        crx = rx; cry = ry; ctx = tx; cty = ty;
        if (el) {
          el.style.transform = `
            perspective(900px)
            rotateX(${crx}deg)
            rotateY(${cry}deg)
            translate3d(${ctx * 0.4}px, ${cty * 0.4}px, 0)
          `;
        }
        rafRef.current = null;
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    /* wake(): (re)start the loop if it's parked. Called on every pointer move
       and on leave, so the card animates only while it has somewhere to go. */
    wakeRef.current = () => {
      if (rafRef.current === null) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  /* ── Bind pointer listeners ── */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    el.addEventListener("mousemove",  handleMouseMove,  { passive: true });
    el.addEventListener("mouseleave", handleMouseLeave, { passive: true });

    return () => {
      el.removeEventListener("mousemove",  handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseLeave]);

  return (
    <div
      ref={wrapRef}
      className={`comet-card-wrap ${className}`}
    >
      {/* ── Double-bezel outer shell ── */}
      <div className="comet-card-shell">
        {/* ── Inner refraction highlight (1 px top edge) ── */}
        <div className="comet-card-core" aria-hidden="false">
          {children}
        </div>
      </div>
    </div>
  );
}
