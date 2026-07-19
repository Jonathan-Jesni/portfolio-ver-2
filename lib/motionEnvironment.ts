import { probeWebGLSupport } from "./detectGPU";
import {
  IMMERSIVE_SCROLL_MEDIA_QUERY,
  STAGE_VIEWPORT_MEDIA_QUERY,
} from "./mediaQueries";

export interface MotionEnvironment {
  desktopScrub: boolean;
  /* Wide enough for the WebGL laptop stage (>=900px). Separate from
     desktopScrub: 768-899px runs the scrub story WITHOUT the canvas,
     exactly like main's split floors. */
  stageViewport: boolean;
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
      stageViewport: false,
      coarsePointer: false,
      reducedMotion: false,
      webglAvailable: true,
    };
  }

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const coarsePointer = !window.matchMedia("(pointer: fine)").matches;

  if (coarsePointer) {
    // Product policy: mobile is DOM-only; this is not a WebGL capability result.
    return {
      desktopScrub: false,
      stageViewport: false,
      coarsePointer: true,
      reducedMotion,
      webglAvailable: false,
    };
  }

  const graphics = probeWebGLSupport();

  return {
    desktopScrub: window.matchMedia(IMMERSIVE_SCROLL_MEDIA_QUERY).matches,
    stageViewport: window.matchMedia(STAGE_VIEWPORT_MEDIA_QUERY).matches,
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

export interface MotionEnvironmentWatchOptions {
  /**
   * When true, media-query "change" events are routed through the same
   * rAF debounce as resize (matches app/page.tsx's original watcher).
   * When false, media-query changes emit synchronously and only resize
   * is debounced (matches HeroSection.tsx's original watcher).
   */
  debounceAll?: boolean;
  /** Also react to orientationchange (matches app/page.tsx's watcher). */
  watchOrientation?: boolean;
}

/**
 * Subscribes to the media queries `resolveMotionEnvironment` reads from and
 * re-emits on every relevant change, rAF-debounced. Encapsulates the
 * matchMedia + rAF-debounce watcher that used to be hand-rolled separately
 * in app/page.tsx and components/HeroSection.tsx.
 */
export function subscribeMotionEnvironment(
  onChange: (env: MotionEnvironment) => void,
  options: MotionEnvironmentWatchOptions = {},
): () => void {
  const { debounceAll = false, watchOrientation = false } = options;
  if (typeof window === "undefined") return () => undefined;

  let frame = 0;
  const emit = () => onChange(resolveMotionEnvironment());
  const scheduleEmit = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(emit);
  };
  const onMediaChange = debounceAll ? scheduleEmit : emit;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pointer = window.matchMedia("(pointer: fine)");
  const hover = window.matchMedia("(hover: hover)");

  if (debounceAll) {
    scheduleEmit();
  } else {
    emit();
  }

  reduced.addEventListener("change", onMediaChange);
  pointer.addEventListener("change", onMediaChange);
  hover.addEventListener("change", onMediaChange);
  window.addEventListener("resize", scheduleEmit, { passive: true });
  if (watchOrientation) {
    window.addEventListener("orientationchange", scheduleEmit);
  }

  return () => {
    cancelAnimationFrame(frame);
    reduced.removeEventListener("change", onMediaChange);
    pointer.removeEventListener("change", onMediaChange);
    hover.removeEventListener("change", onMediaChange);
    window.removeEventListener("resize", scheduleEmit);
    if (watchOrientation) {
      window.removeEventListener("orientationchange", scheduleEmit);
    }
  };
}
