'use client';

import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

/**
 * MotionBorder
 * -----------
 * Renders a single SVG overlay that covers its parent container.
 * Draws a mathematically calculated, pixel-perfect "H" shape that
 * connects two equal-width cards with horizontal bridges.
 *
 * CRITICAL SYNC: The layout math here MUST match the CSS in globals.css:
 *   .building-grid: grid-template-columns: 1fr 1fr; gap: 20px;
 *
 * The fractions are computed dynamically from the measured parent width
 * so this is fully responsive. On mobile (single column), the SVG hides.
 */

interface MotionBorderProps {
  borderRadius?: number;
  dotColor?: string;
  dotSize?: number;
  duration?: number;
  trackColor?: string;
  trackWidth?: number;
  /** Uniform padding between the border path and the card edges */
  borderPadding?: number;
  /** Fraction from top/bottom where the bridges sit (0–0.5) */
  bridgePosition?: number;
  /** Radius of the curves where bridges meet card edges */
  bridgeCurveRadius?: number;
  /** Fixed pixel gap between the two cards — must match CSS gap */
  cardGapPx?: number;
}

const MotionBorder: React.FC<MotionBorderProps> = ({
  borderRadius = 18,
  dotColor = 'rgba(255,255,255,0.9)',
  dotSize = 5,
  duration = 12,
  trackColor = 'rgba(255,255,255,0.06)',
  trackWidth = 1,
  borderPadding = 2, // Tight padding to hug the cards closely
  bridgePosition = 0.38,
  bridgeCurveRadius = 10,
  cardGapPx = 20,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const dot1Refs = useRef<Array<SVGCircleElement | null>>([]);
  const dot2Refs = useRef<Array<SVGCircleElement | null>>([]);

  const [size, setSize] = useState({ w: 0, h: 0 });

  const N = 200; // super dense trail particle count
  const pathPointsRef = useRef<{ x: number; y: number }[]>([]);
  const pathLengthRef = useRef<number>(0);

  // Compute the H path from the live parent dimensions
  const pathD = React.useMemo(() => {
    if (size.w === 0 || size.h === 0) return '';

    // Hide on mobile (single-column stack)
    if (size.w <= 640) {
      return '';
    }

    const W = size.w;
    const H = size.h;
    const pad = borderPadding;
    const r = borderRadius + pad; // concentric border radius
    const cr = bridgeCurveRadius;

    // ═══ LAYOUT MATH — must stay in sync with .building-grid CSS ═══
    // grid: repeat(2, 1fr) + gap: cardGapPx
    // Each card occupies: (W - cardGapPx) / 2
    const cardW = (W - cardGapPx) / 2;

    // Left card: x in [0, cardW]
    const lL = 0 - pad;
    const lR = cardW + pad;
    const lT = 0 - pad;
    const lB = H + pad;

    // Right card: x in [cardW + cardGapPx, W]
    const rL = cardW + cardGapPx - pad;
    const rR = W + pad;
    const rT = 0 - pad;
    const rB = H + pad;

    // Bridge Y positions (fraction-based, symmetric from top and bottom)
    const upperBridgeY = lT + (lB - lT) * bridgePosition;
    const lowerBridgeY = lB - (lB - lT) * bridgePosition;

    return [
      // ═══ TOP-LEFT CORNER of left card ═══
      `M ${lL + r},${lT}`,

      // ─── Top edge of left card → right ───
      `L ${lR - r},${lT}`,
      `Q ${lR},${lT} ${lR},${lT + r}`,

      // ─── Right edge of left card → down to upper bridge ───
      `L ${lR},${upperBridgeY - cr}`,

      // ─── Curve into upper bridge (going right) ───
      `Q ${lR},${upperBridgeY} ${lR + cr},${upperBridgeY}`,

      // ─── Across upper bridge ───
      `L ${rL - cr},${upperBridgeY}`,

      // ─── Curve arriving at right card (going up) ───
      `Q ${rL},${upperBridgeY} ${rL},${upperBridgeY - cr}`,

      // ─── Left edge of right card → up to top ───
      `L ${rL},${rT + r}`,
      `Q ${rL},${rT} ${rL + r},${rT}`,

      // ─── Top edge of right card → right ───
      `L ${rR - r},${rT}`,
      `Q ${rR},${rT} ${rR},${rT + r}`,

      // ─── Right edge of right card → all the way down ───
      `L ${rR},${rB - r}`,
      `Q ${rR},${rB} ${rR - r},${rB}`,

      // ─── Bottom edge of right card → left ───
      `L ${rL + r},${rB}`,
      `Q ${rL},${rB} ${rL},${rB - r}`,

      // ─── Left edge of right card → up to lower bridge ───
      `L ${rL},${lowerBridgeY + cr}`,

      // ─── Curve into lower bridge (going left) ───
      `Q ${rL},${lowerBridgeY} ${rL - cr},${lowerBridgeY}`,

      // ─── Across lower bridge ───
      `L ${lR + cr},${lowerBridgeY}`,

      // ─── Curve arriving at left card (going down) ───
      `Q ${lR},${lowerBridgeY} ${lR},${lowerBridgeY + cr}`,

      // ─── Right edge of left card → down to bottom ───
      `L ${lR},${lB - r}`,
      `Q ${lR},${lB} ${lR - r},${lB}`,

      // ─── Bottom edge of left card → left ───
      `L ${lL + r},${lB}`,
      `Q ${lL},${lB} ${lL},${lB - r}`,

      // ─── Left edge of left card → up to top ───
      `L ${lL},${lT + r}`,
      `Q ${lL},${lT} ${lL + r},${lT}`,

      'Z',
    ].join(' ');
  }, [size, borderRadius, borderPadding, bridgePosition, bridgeCurveRadius, cardGapPx]);

  // Precompute the high-resolution LUT when the path changes
  useLayoutEffect(() => {
    if (!pathD || !pathRef.current) return;
    const path = pathRef.current;
    const pathLength = path.getTotalLength();
    pathLengthRef.current = pathLength;

    const pointsCount = 5000;
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < pointsCount; i++) {
      const p = path.getPointAtLength((i / (pointsCount - 1)) * pathLength);
      points.push({ x: p.x, y: p.y });
    }
    pathPointsRef.current = points;
  }, [pathD]);

  // Observe parent size
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !svg.parentElement) return;
    const parent = svg.parentElement;

    const ro = new ResizeObserver(() => {
      setSize({ w: parent.clientWidth, h: parent.clientHeight });
    });

    ro.observe(parent);
    setSize({ w: parent.clientWidth, h: parent.clientHeight });
    return () => ro.disconnect();
  }, []);



  // Animate two dots along the path with smooth tapering trails (LUT-based)
  useGSAP(
    () => {
      if (!pathD || !pathRef.current) return;

      const tl = gsap.timeline({ repeat: -1, ease: 'none' });

      tl.to(
        {},
        {
          duration,
          onUpdate: function () {
            const progress = this.progress();
            const points = pathPointsRef.current;
            const pointsCount = points.length;
            const pathLength = pathLengthRef.current;
            if (pointsCount === 0 || pathLength === 0) return;

            const spacingPixels = 1.0;
            const spacingProgress = spacingPixels / pathLength;

            // Dot 1 and its trail
            for (let i = 0; i < N; i++) {
              const circle = dot1Refs.current[i];
              if (!circle) continue;
              const trailProgress = (progress - i * spacingProgress + 1) % 1;
              const index = Math.floor(trailProgress * (pointsCount - 1));
              const p = points[index];
              if (p) gsap.set(circle, { x: p.x, y: p.y });
            }

            // Dot 2 and its trail (50% offset)
            for (let i = 0; i < N; i++) {
              const circle = dot2Refs.current[i];
              if (!circle) continue;
              const trailProgress = (progress + 0.5 - i * spacingProgress + 1) % 1;
              const index = Math.floor(trailProgress * (pointsCount - 1));
              const p = points[index];
              if (p) gsap.set(circle, { x: p.x, y: p.y });
            }
          },
        }
      );
    },
    { dependencies: [pathD, duration] }
  );

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: -1, // sits behind the cards inside the grid
        display: (size.w === 0 || size.w <= 640) ? 'none' : 'block',
        overflow: 'visible',
      }}
      viewBox={`0 0 ${size.w} ${size.h}`}
    >
      {pathD && (
        <>
          {/* Track path */}
          <path
            ref={pathRef}
            d={pathD}
            fill="none"
            stroke={trackColor}
            strokeWidth={trackWidth}
          />

          {/* Dot 1 Trail */}
          {Array.from({ length: N }).map((_, idx) => {
            const i = N - 1 - idx;
            const isLead = i === 0;
            const t = isLead ? 0 : (i - 1) / (N - 2);
            const sizeFactor = isLead ? 1.0 : 0.65 * Math.pow(1 - t, 1.8);
            const opacity = isLead ? 1.0 : 0.75 * Math.pow(1 - t, 1.5);
            const rr = (dotSize / 2) * sizeFactor;
            return (
              <circle
                key={`dot1-${i}`}
                ref={(el) => { dot1Refs.current[i] = el; }}
                cx={0}
                cy={0}
                r={rr}
                fill={dotColor}
                opacity={opacity}
              />
            );
          })}

          {/* Dot 2 Trail — 50% offset */}
          {Array.from({ length: N }).map((_, idx) => {
            const i = N - 1 - idx;
            const isLead = i === 0;
            const t = isLead ? 0 : (i - 1) / (N - 2);
            const sizeFactor = isLead ? 1.0 : 0.65 * Math.pow(1 - t, 1.8);
            const opacity = isLead ? 1.0 : 0.75 * Math.pow(1 - t, 1.5);
            const rr = (dotSize / 2) * sizeFactor;
            return (
              <circle
                key={`dot2-${i}`}
                ref={(el) => { dot2Refs.current[i] = el; }}
                cx={0}
                cy={0}
                r={rr}
                fill={dotColor}
                opacity={opacity}
              />
            );
          })}
        </>
      )}
    </svg>
  );
};

export default MotionBorder;
