import { probeWebGLSupport } from "./detectGPU";
import { IMMERSIVE_SCROLL_MEDIA_QUERY } from "./mediaQueries";

export interface MotionEnvironment {
  desktopScrub: boolean;
  coarsePointer: boolean;
  reducedMotion: boolean;
  webglAvailable: boolean;
}

export interface AdaptiveQualityState {
  dpr: number;
  antialias: boolean;
  environmentResolution: 32 | 64;
  shaderDetailScale: number;
  parallaxScale: number;
}

const PIXEL_BUDGET = 2_500_000;

export function resolveMotionEnvironment(): MotionEnvironment {
  if (typeof window === "undefined") {
    return {
      desktopScrub: false,
      coarsePointer: false,
      reducedMotion: false,
      webglAvailable: true,
    };
  }

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const coarsePointer = !window.matchMedia("(pointer: fine)").matches;
  const graphics = probeWebGLSupport();

  return {
    desktopScrub: window.matchMedia(IMMERSIVE_SCROLL_MEDIA_QUERY).matches,
    coarsePointer,
    reducedMotion,
    webglAvailable: graphics.available,
  };
}

/**
 * Rendering quality is deliberately local and continuous. It never decides
 * which chapters a visitor receives, and it is never persisted in storage.
 */
export function resolveAdaptiveQuality(
  width = typeof window === "undefined" ? 1 : window.innerWidth,
  height = typeof window === "undefined" ? 1 : window.innerHeight,
): AdaptiveQualityState {
  const graphics = probeWebGLSupport();
  const viewportPixels = Math.max(1, width * height);
  const pixelBudgetDpr = Math.sqrt(PIXEL_BUDGET / viewportPixels);
  const deviceDpr =
    typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const constrained =
    !graphics.available || graphics.isSoftware || graphics.isIntegrated;

  return {
    dpr: Math.max(0.5, Math.min(deviceDpr, 1.35, pixelBudgetDpr)),
    antialias: graphics.available && !graphics.isSoftware,
    environmentResolution: constrained ? 32 : 64,
    shaderDetailScale: !graphics.available
      ? 0.5
      : graphics.isSoftware
        ? 0.55
        : constrained
          ? 0.78
          : 1,
    parallaxScale: !graphics.available
      ? 0.3
      : graphics.isSoftware
        ? 0.35
        : constrained
          ? 0.7
          : 1,
  };
}

export function shouldUseSmoothScroll(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(IMMERSIVE_SCROLL_MEDIA_QUERY).matches
  );
}
