"use client";

import { useEffect, useRef, useCallback } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ============================================================
   CANVAS SEQUENCE
   Apple-style scroll-scrubbed image sequence.
   
   HOW IT WORKS:
   ─────────────
   • An array of Image objects is preloaded into memory on mount.
   • A GSAP ScrollTrigger scrubs a "progress" value 0→1 as the user
     scrolls through the runway element.
   • On each RAF tick we map that progress → frame index and paint
     the correct frame onto the <canvas> via drawImage().
   • We use double-buffering: we draw into an offscreen canvas and
     blit to the visible one to prevent flicker on slow machines.

   DROPPING IN YOUR BLENDER FRAMES:
   ─────────────────────────────────
   Place your 120 WebP files in /public/sequence/ named:
     frame-000.webp, frame-001.webp, … frame-119.webp
   Then pass  src="/sequence/frame-[i].webp"  totalFrames={120}.
   The [i] token is zero-padded to `padLength` digits.

   PLACEHOLDER MODE (default):
   ─────────────────────────────
   When `placeholder` is true (default), we skip network loads and
   draw directly to canvas — colored gradient blocks with frame
   numbers so you can see the scroll scrub working immediately.
   ============================================================ */

interface CanvasSequenceProps {
  /** Runway trigger element — the scrollable div this sequence lives inside. */
  runwaySelector: string;
  /** Total number of frames in the sequence. */
  totalFrames?: number;
  /**
   * URL template. Use [i] as the zero-padded frame number token.
   * Example: "/sequence/frame-[i].webp"
   * This is ignored when placeholder=true.
   */
  src?: string;
  /** Number of digits for zero-padding the frame index. Default 3. */
  padLength?: number;
  /** When true (default), renders colored placeholder blocks instead of images. */
  placeholder?: boolean;
  /** How far into the scroll runway the animation starts (0→1). Default 0. */
  start?: number;
  /** How far into the scroll runway the animation ends (0→1). Default 1. */
  end?: number;
  className?: string;
}

/* ---- Placeholder frame renderer ---- */
function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frameIndex: number,
  totalFrames: number
): void {
  const hue = (frameIndex / totalFrames) * 240 + 180; /* blue → cyan sweep */
  const lightness = 8 + (frameIndex / totalFrames) * 6;

  /* Background */
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, `hsl(${hue}, 22%, ${lightness}%)`);
  gradient.addColorStop(1, `hsl(${hue + 20}, 28%, ${lightness + 4}%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  /* Radial glow at centre — simulates the object's "core" */
  const glowRadius = Math.min(width, height) * 0.28;
  const glowProgress = Math.sin((frameIndex / totalFrames) * Math.PI);
  const glow = ctx.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, glowRadius
  );
  glow.addColorStop(0, `hsla(${hue}, 60%, 60%, ${0.12 * glowProgress})`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  /* Rotating wireframe diamond — placeholder for your 3D object */
  ctx.save();
  ctx.translate(width / 2, height / 2);
  const angle = (frameIndex / totalFrames) * Math.PI * 2;
  ctx.rotate(angle);
  const size = Math.min(width, height) * 0.18;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.6, 0);
  ctx.lineTo(0, size);
  ctx.lineTo(-size * 0.6, 0);
  ctx.closePath();
  ctx.strokeStyle = `hsla(${hue}, 70%, 65%, 0.5)`;
  ctx.lineWidth = 1;
  ctx.stroke();

  /* Inner lines */
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(0, size);
  ctx.moveTo(-size * 0.6, 0);
  ctx.lineTo(size * 0.6, 0);
  ctx.strokeStyle = `hsla(${hue}, 70%, 65%, 0.18)`;
  ctx.stroke();
  ctx.restore();

  /* Frame counter label */
  ctx.font = "500 11px 'JetBrains Mono', monospace";
  ctx.fillStyle = `hsla(${hue}, 50%, 60%, 0.4)`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(`frame ${String(frameIndex).padStart(3, "0")} / ${totalFrames}`, width - 14, height - 12);

  /* Progress bar at bottom */
  const barH = 2;
  ctx.fillStyle = `hsla(0, 0%, 100%, 0.05)`;
  ctx.fillRect(0, height - barH, width, barH);
  ctx.fillStyle = `hsla(${hue}, 60%, 55%, 0.35)`;
  ctx.fillRect(0, height - barH, width * (frameIndex / (totalFrames - 1)), barH);
}

export default function CanvasSequence({
  runwaySelector,
  totalFrames = 120,
  src = "/sequence/frame-[i].webp",
  padLength = 3,
  placeholder = true,
  start = 0,
  end = 1,
  className,
}: CanvasSequenceProps) {
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const offscreenRef  = useRef<HTMLCanvasElement | null>(null);
  const imagesRef     = useRef<HTMLImageElement[]>([]);
  const frameRef      = useRef(0);           /* current displayed frame */
  const progressRef   = useRef(0);           /* raw gsap scrub value */
  const rafRef        = useRef<number | null>(null);
  const loadedRef     = useRef(false);

  /* ── Render a single frame to the visible canvas ── */
  const renderFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width  = canvas.width;
    const height = canvas.height;

    if (placeholder) {
      drawPlaceholder(ctx, width, height, frameIndex, totalFrames);
      return;
    }

    const img = imagesRef.current[frameIndex];
    if (!img || !img.complete) return;

    /* Offscreen double-buffer for flicker prevention */
    if (!offscreenRef.current) {
      offscreenRef.current = document.createElement("canvas");
      offscreenRef.current.width  = width;
      offscreenRef.current.height = height;
    }
    const offCtx = offscreenRef.current.getContext("2d");
    if (!offCtx) return;

    offCtx.clearRect(0, 0, width, height);
    offCtx.drawImage(img, 0, 0, width, height);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(offscreenRef.current, 0, 0);
  }, [placeholder, totalFrames]);

  /* ── RAF render loop — only runs when progress changes ── */
  const scheduleRender = useCallback((newFrame: number) => {
    if (newFrame === frameRef.current) return;
    frameRef.current = newFrame;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      renderFrame(newFrame);
      rafRef.current = null;
    });
  }, [renderFrame]);

  /* ── GSAP ScrollTrigger ── */
  useEffect(() => {
    const runwayEl = document.querySelector(runwaySelector);
    if (!runwayEl) {
      console.warn(`[CanvasSequence] Runway not found: "${runwaySelector}"`);
      return;
    }

    /* Initial frame */
    renderFrame(0);

    const st = ScrollTrigger.create({
      trigger: runwayEl,
      start: `top+=${start * 100}% top`,
      end:   `top+=${end   * 100}% top`,
      scrub: true,
      onUpdate(self) {
        const rawProgress = self.progress; /* 0..1 */
        progressRef.current = rawProgress;
        const frameIndex = Math.min(
          Math.floor(rawProgress * (totalFrames - 1)),
          totalFrames - 1
        );
        scheduleRender(frameIndex);
      },
    });

    return () => {
      st.kill();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [runwaySelector, totalFrames, start, end, scheduleRender, renderFrame]);

  /* ── Image preload (real frames only) ── */
  useEffect(() => {
    if (placeholder || loadedRef.current) return;
    loadedRef.current = true;

    const images: HTMLImageElement[] = [];
    let loaded = 0;

    for (let i = 0; i < totalFrames; i++) {
      const img = new Image();
      const padded = String(i).padStart(padLength, "0");
      img.src = src.replace("[i]", padded);
      img.onload = () => {
        loaded++;
        /* Once first frame is ready, render it immediately */
        if (loaded === 1) renderFrame(frameRef.current);
      };
      images.push(img);
    }

    imagesRef.current = images;

    return () => {
      imagesRef.current = [];
    };
  }, [placeholder, totalFrames, src, padLength, renderFrame]);

  /* ── Canvas resize observer ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ro = new ResizeObserver(() => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width  = parent.offsetWidth;
      canvas.height = parent.offsetHeight;
      /* Re-render current frame at new size */
      renderFrame(frameRef.current);
    });
    ro.observe(canvas.parentElement ?? canvas);
    return () => ro.disconnect();
  }, [renderFrame]);

  return (
    <canvas
      ref={canvasRef}
      className={`canvas-seq ${className ?? ""}`}
      aria-hidden="true"
    />
  );
}
