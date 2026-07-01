/* ── GPU tier detection ────────────────────────────────────────────────────
   Probes WEBGL_debug_renderer_info before a Canvas mounts so we can set
   antialias (a context-creation flag, not toggleable post-mount) correctly.
   Returns "low" for Intel/Mesa iGPU and software renderers, "high" otherwise.
   Falls back to "high" if the extension is unavailable (privacy mode, etc.).
   ──────────────────────────────────────────────────────────────────────── */
export function detectGPU(): "low" | "high" {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") ??
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return "high";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (!ext) return "high";
    const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string;
    // Do NOT call loseContext() — on some GPU drivers it propagates a context-
    // lost event to all active WebGL contexts on the page. Let GC collect it.
    canvas.remove();
    return /intel|mesa|llvmpipe|swiftshader/i.test(renderer) ? "low" : "high";
  } catch {
    return "high";
  }
}
