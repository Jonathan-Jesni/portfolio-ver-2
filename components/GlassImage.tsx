"use client";

/**
 * GlassImage — WebGL glass refraction shader on project images.
 *
 * ARCHITECTURE: Single shared WebGL renderer (module singleton).
 * ──────────────────────────────────────────────────────────────
 * Browsers cap WebGL contexts at ~8-16 per page. One R3F <Canvas>
 * per card blows straight through that limit and crashes the tab.
 *
 * Solution: one offscreen WebGL renderer shared by ALL GlassImage
 * instances. Each instance owns only a lightweight 2D <canvas> (zero
 * WebGL cost). On every RAF tick the shared renderer draws the
 * relevant texture + shader into the offscreen buffer, then
 * `transferToImageBitmap` blits it to the 2D canvas — completely
 * asynchronous and context-safe.
 */

import { useEffect, useRef, useState, useCallback } from "react";

/* ============================================================
   GLSL — vertex + fragment shaders
   ============================================================ */
const VERT_SRC = /* glsl */ `
attribute vec2 a_position;
attribute vec2 a_uv;
varying vec2 vUv;
void main() {
  vUv = a_uv;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAG_SRC = /* glsl */ `
precision highp float;

uniform sampler2D uTexture;
uniform float     uTime;
uniform float     uHover;
uniform vec2      uMouse;

varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; }
  return v;
}

void main() {
  float t = uTime * 0.18;
  float bs = 3.5;
  float bL = fbm(vUv * bs + vec2(-0.001,  0.0) + t);
  float bR = fbm(vUv * bs + vec2( 0.001,  0.0) + t);
  float bD = fbm(vUv * bs + vec2( 0.0,  -0.001) + t);
  float bU = fbm(vUv * bs + vec2( 0.0,   0.001) + t);
  vec2 n = vec2(bR - bL, bU - bD);

  vec2 toMouse  = uMouse - vUv;
  float mDist   = length(toMouse);
  float lens    = uHover * 0.022 * (1.0 - smoothstep(0.0, 0.55, mDist));
  vec2 lensOff  = normalize(toMouse + 0.001) * lens * -1.0;

  float rStr    = 0.011 * uHover;
  vec2 refOff   = n * rStr + lensOff;
  float chrom   = 0.004 * uHover;

  vec2 uvB = vUv + refOff;
  float r  = texture2D(uTexture, uvB + n * chrom ).r;
  float g  = texture2D(uTexture, uvB             ).g;
  float b  = texture2D(uTexture, uvB - n * chrom ).b;

  vec4 col = vec4(r, g, b, 1.0);
  vec2 ed  = abs(vUv - 0.5) * 2.0;
  float rim = pow(max(ed.x, ed.y), 3.5) * 0.35;
  col.rgb  = mix(col.rgb, col.rgb * 0.55, rim);
  float sh  = smoothstep(0.72, 0.77, (vUv.x + vUv.y) * 0.5) *
              smoothstep(0.82, 0.77, (vUv.x + vUv.y) * 0.5);
  col.rgb  += sh * 0.065 * uHover;
  gl_FragColor = col;
}
`;

/* ============================================================
   SHARED RENDERER SINGLETON
   ============================================================ */
interface InstanceState {
  texture:    WebGLTexture | null;
  hover:      number;         /* animated 0→1 */
  hoverTarget:number;
  mouseX:     number;
  mouseY:     number;
  time:       number;
  output2d:   HTMLCanvasElement | null;
  width:      number;
  height:     number;
  dirty:      boolean;
}

interface SharedRenderer {
  gl:           WebGLRenderingContext;
  program:      WebGLProgram;
  posLoc:       number;
  uvLoc:        number;
  uTexture:     WebGLUniformLocation;
  uTime:        WebGLUniformLocation;
  uHover:       WebGLUniformLocation;
  uMouse:       WebGLUniformLocation;
  buf:          WebGLBuffer;
  instances:    Map<string, InstanceState>;
  rafId:        number;
  offscreen:    HTMLCanvasElement;
}

let shared: SharedRenderer | null = null;

function buildShader(
  gl: WebGLRenderingContext,
  type: number,
  src: string
): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(`Shader compile error:\n${gl.getShaderInfoLog(sh)}`);
  }
  return sh;
}

function getSharedRenderer(): SharedRenderer | null {
  if (shared) return shared;

  const offscreen = document.createElement("canvas");
  offscreen.width  = 640;
  offscreen.height = 200;

  const gl = offscreen.getContext("webgl", {
    alpha: false,
    antialias: false,
    powerPreference: "high-performance",
  }) as WebGLRenderingContext | null;

  if (!gl) return null; /* WebGL not available */

  const vert = buildShader(gl, gl.VERTEX_SHADER,   VERT_SRC);
  const frag = buildShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(`Program link error:\n${gl.getProgramInfoLog(prog)}`);
  }

  /* Full-screen quad — 2 triangles covering clip space */
  const verts = new Float32Array([
    -1, -1,  0, 0,
     1, -1,  1, 0,
    -1,  1,  0, 1,
     1,  1,  1, 1,
  ]);
  const buf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

  shared = {
    gl,
    program:   prog,
    posLoc:    gl.getAttribLocation(prog, "a_position"),
    uvLoc:     gl.getAttribLocation(prog, "a_uv"),
    uTexture:  gl.getUniformLocation(prog, "uTexture")!,
    uTime:     gl.getUniformLocation(prog, "uTime")!,
    uHover:    gl.getUniformLocation(prog, "uHover")!,
    uMouse:    gl.getUniformLocation(prog, "uMouse")!,
    buf,
    instances: new Map(),
    rafId:     0,
    offscreen,
  };

  startRenderLoop();
  return shared;
}

function startRenderLoop() {
  if (!shared) return;

  function tick() {
    if (!shared) return;
    shared.rafId = requestAnimationFrame(tick);

    const { gl, instances } = shared;
    let anyDirty = false;

    instances.forEach((inst) => {
      /* Smooth hover lerp at ~60fps */
      const prev = inst.hover;
      inst.hover += (inst.hoverTarget - inst.hover) * 0.12;
      if (Math.abs(inst.hover - prev) > 0.001) inst.dirty = true;
      /* Always dirty when time advances and hover > 0 (glass breathes) */
      if (inst.hover > 0.01) { inst.time += 0.016; inst.dirty = true; }
      if (inst.dirty) anyDirty = true;
    });

    if (!anyDirty) return;

    gl.useProgram(shared.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, shared.buf);

    const stride = 4 * 4; /* 4 floats × 4 bytes */
    gl.enableVertexAttribArray(shared.posLoc);
    gl.vertexAttribPointer(shared.posLoc, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(shared.uvLoc);
    gl.vertexAttribPointer(shared.uvLoc,  2, gl.FLOAT, false, stride, 8);

    instances.forEach((inst) => {
      if (!inst.dirty || !inst.texture || !inst.output2d) return;
      inst.dirty = false;

      /* Resize offscreen to match instance */
      const oc = shared!.offscreen;
      if (oc.width !== inst.width || oc.height !== inst.height) {
        oc.width  = inst.width;
        oc.height = inst.height;
        gl.viewport(0, 0, inst.width, inst.height);
      } else {
        gl.viewport(0, 0, inst.width, inst.height);
      }

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, inst.texture);
      gl.uniform1i(shared!.uTexture, 0);
      gl.uniform1f(shared!.uTime,   inst.time);
      gl.uniform1f(shared!.uHover,  inst.hover);
      gl.uniform2f(shared!.uMouse,  inst.mouseX, inst.mouseY);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      /* Blit from offscreen WebGL canvas → 2D output canvas */
      const ctx2d = inst.output2d.getContext("2d");
      if (ctx2d) {
        ctx2d.clearRect(0, 0, inst.width, inst.height);
        ctx2d.drawImage(oc, 0, 0, inst.width, inst.height);
      }
    });
  }

  shared.rafId = requestAnimationFrame(tick);
}

function loadTexture(
  gl: WebGLRenderingContext,
  src: string
): Promise<WebGLTexture> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      resolve(tex);
    };
    img.onerror = reject;
    img.src = src;
  });
}

/* Placeholder texture — drawn to an offscreen 2D canvas, then uploaded */
function makePlaceholderTexture(
  gl: WebGLRenderingContext,
  label: string,
  hue: number,
  w = 640,
  h = 200
): WebGLTexture {
  const pc = document.createElement("canvas");
  pc.width = w; pc.height = h;
  const ctx = pc.getContext("2d")!;

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, `hsl(${hue}, 18%, 10%)`);
  grad.addColorStop(1, `hsl(${hue + 20}, 25%, 14%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  /* Subtle grid */
  ctx.strokeStyle = `hsla(${hue}, 40%, 60%, 0.05)`;
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

  /* Label */
  ctx.fillStyle = `hsla(${hue}, 40%, 65%, 0.45)`;
  ctx.font = "500 12px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, w / 2, h / 2);

  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pc);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tex;
}

/* ============================================================
   REACT COMPONENT
   ============================================================ */
interface GlassImageProps {
  src?: string | null;
  alt?: string | null;
  placeholderLabel?: string;
  placeholderHue?: number;
  className?: string;
}

let instanceCounter = 0;

export default function GlassImage({
  src = null,
  alt = "",
  placeholderLabel = "IMAGE",
  placeholderHue = 210,
  className,
}: GlassImageProps) {
  const wrapRef    = useRef<HTMLDivElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const instanceId = useRef(`gi-${++instanceCounter}`);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => { setIsClient(true); }, []);

  /* ── Register instance with shared renderer ── */
  useEffect(() => {
    if (!isClient) return;

    const renderer = getSharedRenderer();
    if (!renderer) return;

    const { gl } = renderer;
    const id = instanceId.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = canvas.offsetWidth  || 640;
    const h = canvas.offsetHeight || 200;
    canvas.width  = w;
    canvas.height = h;

    const inst: InstanceState = {
      texture:     null,
      hover:       0,
      hoverTarget: 0,
      mouseX:      0.5,
      mouseY:      0.5,
      time:        0,
      output2d:    canvas,
      width:       w,
      height:      h,
      dirty:       true,
    };

    renderer.instances.set(id, inst);

    /* Load or generate texture */
    if (src) {
      loadTexture(gl, src).then((tex) => {
        inst.texture = tex;
        inst.dirty   = true;
      }).catch(() => {
        /* Fallback to placeholder on load failure */
        inst.texture = makePlaceholderTexture(gl, placeholderLabel, placeholderHue, w, h);
        inst.dirty   = true;
      });
    } else {
      inst.texture = makePlaceholderTexture(gl, placeholderLabel, placeholderHue, w, h);
      inst.dirty   = true;
    }

    /* Resize observer */
    const ro = new ResizeObserver(() => {
      const newW = canvas.offsetWidth  || 640;
      const newH = canvas.offsetHeight || 200;
      canvas.width  = newW;
      canvas.height = newH;
      inst.width    = newW;
      inst.height   = newH;
      inst.dirty    = true;
    });
    ro.observe(canvas);

    return () => {
      renderer.instances.delete(id);
      ro.disconnect();
    };
  }, [isClient, src, placeholderLabel, placeholderHue]);

  /* ── Mouse handlers ── */
  const onMouseEnter = useCallback(() => {
    const inst = shared?.instances.get(instanceId.current);
    if (inst) { inst.hoverTarget = 1; inst.dirty = true; }
  }, []);

  const onMouseLeave = useCallback(() => {
    const inst = shared?.instances.get(instanceId.current);
    if (inst) { inst.hoverTarget = 0; inst.mouseX = 0.5; inst.mouseY = 0.5; inst.dirty = true; }
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const inst = shared?.instances.get(instanceId.current);
    const wrap = wrapRef.current;
    if (!inst || !wrap) return;
    const r = wrap.getBoundingClientRect();
    inst.mouseX =      (e.clientX - r.left) / r.width;
    inst.mouseY = 1 - ((e.clientY - r.top)  / r.height); /* flip Y for WebGL */
    inst.dirty  = true;
  }, []);

  if (!isClient) {
    return (
      <div className={`glass-image-wrap ${className ?? ""}`} role="img" aria-label={alt ?? ""}>
        {src
          ? <img src={src} alt={alt ?? ""} className="glass-image-fallback" />
          : <div className="glass-image-placeholder">{placeholderLabel}</div>
        }
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className={`glass-image-wrap ${className ?? ""}`}
      role="img"
      aria-label={alt ?? ""}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
      style={{ cursor: "crosshair" }}
    >
      <canvas ref={canvasRef} className="glass-image-canvas" />
    </div>
  );
}
