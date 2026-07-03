"use client";

import { useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/* ─────────────────────────────────────────────────────────────
   MemProbe — temporary OOM-investigation instrumentation.

   Inert unless the URL contains `memprobe` (e.g. /?memprobe=1).
   With the flag on it samples every 2s, logging one structured
   `[memprobe]` line to the console and mirroring it in a small
   fixed HUD so a human reproducing the crash can watch live:

     · JS heap used / limit (Chrome performance.memory)
     · DOM node count
     · ScrollTrigger count, gsap ticker callback count
     · worst rAF frame time since the last sample (stutter signal)
     · per-renderer THREE info for the hero + burn canvases
       (programs / textures / geometries / draw calls) via GlProbe
     · Matter.js counters from GravityPit (window.__pit)

   Remove this file (and its GlProbe mounts) once the leak is found.
   ───────────────────────────────────────────────────────────── */

const FLAG = "memprobe";

const flagOn = () =>
  typeof window !== "undefined" && window.location.search.includes(FLAG);

/* Mounted INSIDE an R3F <Canvas> to expose that renderer's live info
   object and surface context-loss events (classic stutter→OOM signature). */
export function GlProbe({ name }: { name: string }) {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    if (!flagOn()) return;
    const w = window as unknown as { __gl?: Record<string, unknown> };
    (w.__gl ??= {})[name] = gl.info;

    const canvas = gl.domElement;
    const onLost = (e: Event) => {
      e.preventDefault();
      console.error(`[memprobe] WEBGL CONTEXT LOST — renderer "${name}"`);
    };
    const onRestored = () =>
      console.warn(`[memprobe] webgl context restored — renderer "${name}"`);
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    return () => {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      if (w.__gl) delete w.__gl[name];
    };
  }, [gl, name]);

  return null;
}

type GlSnapshot = { progs: number; tex: number; geo: number; calls: number } | null;

function snapshotGl(info: unknown): GlSnapshot {
  const i = info as {
    programs?: unknown[];
    memory?: { textures: number; geometries: number };
    render?: { calls: number };
  } | null;
  if (!i) return null;
  return {
    progs: i.programs?.length ?? 0,
    tex: i.memory?.textures ?? 0,
    geo: i.memory?.geometries ?? 0,
    calls: i.render?.calls ?? 0,
  };
}

const MB = (b: number) => (b / 1048576).toFixed(1);

function Hud() {
  const [text, setText] = useState("memprobe: sampling…");
  const maxFrameRef = useRef(0);

  useEffect(() => {
    /* Worst frame delta since last sample — the stutter signal */
    let last = performance.now();
    let raf = 0;
    const frame = (t: number) => {
      const d = t - last;
      last = t;
      if (d > maxFrameRef.current) maxFrameRef.current = d;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const id = setInterval(() => {
      const w = window as unknown as {
        __gl?: Record<string, unknown>;
        __pit?: { mounts: number; engines: number; bodies: number; pairs: number };
      };
      const mem = (performance as unknown as {
        memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
      }).memory;

      const data = {
        heapMB: mem ? `${MB(mem.usedJSHeapSize)} / ${MB(mem.jsHeapSizeLimit)}` : "n/a",
        dom: document.getElementsByTagName("*").length,
        scrollTriggers: ScrollTrigger.getAll().length,
        tickerCbs:
          (gsap.ticker as unknown as { _listeners?: unknown[] })._listeners?.length ?? "n/a",
        maxFrameMs: Math.round(maxFrameRef.current),
        hero: snapshotGl(w.__gl?.hero),
        burn: snapshotGl(w.__gl?.burn),
        pit: w.__pit ?? null,
      };
      maxFrameRef.current = 0;

      console.log("[memprobe]", JSON.stringify(data));
      const gl = (g: GlSnapshot, n: string) =>
        g ? `${n} progs:${g.progs} tex:${g.tex} geo:${g.geo} calls:${g.calls}` : `${n} —`;
      setText(
        [
          `heap ${data.heapMB} MB`,
          `dom ${data.dom}  st ${data.scrollTriggers}  ticker ${data.tickerCbs}`,
          `maxFrame ${data.maxFrameMs}ms`,
          gl(data.hero, "hero"),
          gl(data.burn, "burn"),
          data.pit
            ? `pit mounts:${data.pit.mounts} engines:${data.pit.engines} bodies:${data.pit.bodies} pairs:${data.pit.pairs}`
            : "pit —",
        ].join("\n"),
      );
    }, 2000);

    return () => {
      clearInterval(id);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 8,
        left: 8,
        zIndex: 10000,
        pointerEvents: "none",
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 10,
        lineHeight: 1.5,
        whiteSpace: "pre",
        color: "#C9A852",
        background: "rgba(13,11,9,0.85)",
        border: "1px solid rgba(201,168,82,0.3)",
        padding: "6px 8px",
        borderRadius: 4,
      }}
    >
      {text}
    </div>
  );
}

export default function MemProbe() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (flagOn()) setOn(true);
  }, []);

  /* Runtime introspection for the investigation console: lets DevTools /
     driver scripts enumerate ticker callbacks and ScrollTriggers and
     surgically disable suspects to attribute per-frame allocation. */
  useEffect(() => {
    if (!flagOn()) return;
    const w = window as unknown as { __gsap?: unknown; __ST?: unknown };
    w.__gsap = gsap;
    w.__ST = ScrollTrigger;
    return () => {
      delete w.__gsap;
      delete w.__ST;
    };
  }, []);

  return on ? <Hud /> : null;
}
