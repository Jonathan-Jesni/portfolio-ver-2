export interface WebGLProbeResult {
  available: boolean;
  renderer: string;
  webglVersion: 0 | 1 | 2;
  maxTextureSize: number;
  maxRenderbufferSize: number;
  isIntegrated: boolean;
  isSoftware: boolean;
}

type ProbeGlobal = typeof globalThis & {
  __PORTFOLIO_WEBGL_PROBE__?: WebGLProbeResult;
};

const NO_WEBGL: WebGLProbeResult = {
  available: false,
  renderer: "unavailable",
  webglVersion: 0,
  maxTextureSize: 0,
  maxRenderbufferSize: 0,
  isIntegrated: false,
  isSoftware: false,
};

function readCachedProbe(): WebGLProbeResult | undefined {
  return (globalThis as ProbeGlobal).__PORTFOLIO_WEBGL_PROBE__;
}

function cacheProbe(result: WebGLProbeResult): WebGLProbeResult {
  (globalThis as ProbeGlobal).__PORTFOLIO_WEBGL_PROBE__ = result;
  return result;
}

function rendererName(gl: WebGLRenderingContext | WebGL2RenderingContext): string {
  const debugInfo = gl.getExtension("WEBGL_debug_renderer_info") as {
    UNMASKED_RENDERER_WEBGL: number;
  } | null;

  return String(
    debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER),
  ).trim();
}

function rendererHints(renderer: string) {
  const isSoftware =
    /swiftshader|llvmpipe|lavapipe|software raster|microsoft basic render/i.test(renderer);
  const isIntegrated =
    /\bintel\b|\biris\b|\buhd\b|\bhd graphics\b|radeon\(tm\) graphics|\bvega \d|\badreno\b|\bmali\b|powervr/i.test(
      renderer,
    );

  return { isIntegrated, isSoftware };
}

/**
 * Run the single disposable WebGL probe used by the portfolio.
 *
 * Renderer metadata is a rendering-quality hint only. It never selects,
 * removes, or skips a chapter of the cinematic experience.
 */
export function probeWebGLSupport(): WebGLProbeResult {
  const cached = readCachedProbe();
  if (cached) return cached;
  if (typeof document === "undefined") return NO_WEBGL;

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;

  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  let webglVersion: 0 | 1 | 2 = 0;

  try {
    const attributes: WebGLContextAttributes = {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
    };

    gl = canvas.getContext("webgl2", attributes);
    if (gl) {
      webglVersion = 2;
    } else {
      gl = canvas.getContext("webgl", attributes);
      webglVersion = gl ? 1 : 0;
    }

    if (!gl) return cacheProbe(NO_WEBGL);

    const renderer = rendererName(gl);
    const maxTextureSize = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 0;
    const maxRenderbufferSize =
      Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)) || 0;
    const { isIntegrated, isSoftware } = rendererHints(renderer);

    return cacheProbe({
      available: true,
      renderer,
      webglVersion,
      maxTextureSize,
      maxRenderbufferSize,
      isIntegrated,
      isSoftware,
    });
  } catch {
    return cacheProbe(NO_WEBGL);
  } finally {
    // This context belongs only to the probe and is released before the
    // application renderer mounts.
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    canvas.remove();
    gl = null;
  }
}
