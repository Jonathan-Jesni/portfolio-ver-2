"use client";

import { useEffect, useRef, useState, startTransition } from "react";
import Matter from "matter-js";

const {
  Engine, Runner, Bodies, Composite,
  Mouse, MouseConstraint, Body,
} = Matter;

interface GravityPitProps {
  pills: readonly string[];
}

/* Pill sizing. Shrinks on phones so the full set fits the pit; the
   same metrics drive the DOM layout AND the physics bodies, so they
   always agree. CHAR_W is tuned to the pill font at each FONT size. */
type PillMetrics = {
  PILL_H: number; CHAR_W: number; H_PAD: number;
  MIN_W: number; GUTTER: number; PAD: number; FONT: number;
};

function metricsFor(viewportW: number): PillMetrics {
  return viewportW <= 767
    ? { PILL_H: 26, CHAR_W: 5.9, H_PAD: 20, MIN_W: 54, GUTTER: 6, PAD: 14, FONT: 9 }
    : { PILL_H: 34, CHAR_W: 7.0, H_PAD: 36, MIN_W: 72, GUTTER: 8, PAD: 20, FONT: 11 };
}

function pillWidth(text: string, m: PillMetrics) {
  return Math.max(text.length * m.CHAR_W + m.H_PAD, m.MIN_W);
}

/* Module-level so they survive InViewMount unmount/remount cycles —
   temporary OOM-investigation counters, read by MemProbe via window.__pit */
let probeMounts = 0;
let probeEngines = 0;

// Lays pills in left-to-right, top-to-bottom rows; returns each
// pill's top-left corner.
function buildStaticGrid(
  containerW: number,
  m: PillMetrics,
  pills: readonly string[],
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  let curX = m.PAD;
  let curY = m.PAD;
  const rowH = m.PILL_H + m.GUTTER; // uniform row height

  for (const label of pills) {
    const pw = pillWidth(label, m);

    /* Wrap to next row if pill doesn't fit */
    if (curX + pw > containerW - m.PAD && curX > m.PAD) {
      curX = m.PAD;
      curY += rowH;
    }

    positions.push({ x: curX, y: curY });
    curX += pw + m.GUTTER;
  }

  return positions;
}

export default function GravityPit({ pills }: GravityPitProps) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const pillRefs      = useRef<(HTMLDivElement | null)[]>([]);

  // Flips true on first pointer-down inside the pit and never reverts;
  // the physics engine then stays alive for the session.
  const [physicsActive, setPhysicsActive] = useState(false);
  const engineRef     = useRef<Matter.Engine | null>(null);
  const runnerRef     = useRef<Matter.Runner | null>(null);
  const bodiesRef     = useRef<Matter.Body[]>([]);
  const rafIdRef      = useRef<number>(0);
  const observerRef   = useRef<IntersectionObserver | null>(null);
  const mouseRef      = useRef<Matter.Mouse | null>(null);
  const mouseConstraintRef = useRef<Matter.MouseConstraint | null>(null);
  const beforeUpdateRef = useRef<(() => void) | null>(null);
  const staticPos     = useRef<{ x: number; y: number }[]>([]);
  /* Pill metrics, resolved from viewport width on mount (PHASE 1) and
     reused by the physics setup so layout + bodies stay consistent. */
  const metricsRef    = useRef<PillMetrics>(metricsFor(1280));

  /* Check reduced-motion preference — disable physics entirely if true */
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    startTransition(() => {
      setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    });
  }, []);

  /* ── PHASE 1: Apply static grid positions to DOM on mount ── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const m = metricsFor(window.innerWidth);
    metricsRef.current = m;
    const W = container.offsetWidth;
    const positions = buildStaticGrid(W, m, pills);
    staticPos.current = positions;

    /* Size and position every pill in the static layout */
    pills.forEach((label, i) => {
      const el = pillRefs.current[i];
      if (!el) return;
      const pw   = pillWidth(label, m);
      const pos  = positions[i];

      el.style.width           = `${pw}px`;
      el.style.height          = `${m.PILL_H}px`;
      el.style.fontSize        = `${m.FONT}px`;
      el.style.transformOrigin = `${pw / 2}px ${m.PILL_H / 2}px`;
      el.style.transform       = `translate(${pos.x}px, ${pos.y}px) rotate(0rad)`;
      /* Only add the smooth transition when motion is allowed */
      if (!reducedMotion) {
        el.style.transition = "transform 0.3s var(--ease-out-expo)";
      }
    });
  }, [pills, reducedMotion]);

  /* ── PHASE 2: Activate physics on first interaction ── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    /* Skip physics activation entirely under reduced motion */
    if (reducedMotion) return;

    function activatePhysics() {
      if (engineRef.current) return; // already active — idempotent

      const W = container!.offsetWidth;
      const H = container!.offsetHeight;
      const m = metricsRef.current;

      probeEngines++;
      /* Create engine with gravity */
      const engine = Engine.create({ gravity: { y: 1.6 } });
      const world  = engine.world;
      engineRef.current = engine;

      /* Static boundary walls */
      const T = 1000;
      const walls = [
        Bodies.rectangle(W / 2, H + T / 2,     W + T * 2, T, { isStatic: true }),
        Bodies.rectangle(-(T / 2), H / 2,       T, H + T * 2, { isStatic: true }),
        Bodies.rectangle(W + T / 2, H / 2,      T, H + T * 2, { isStatic: true }),
        Bodies.rectangle(W / 2, -300 - T / 2,   W + T * 2, T, { isStatic: true }),
      ];
      Composite.add(world, walls);

      // Bodies spawn at the current grid positions (not dropped from
      // above), so the first drag "shatters" the silent grid in place.
      const positions = staticPos.current;
      const bodies = pills.map((label, i) => {
        const pw  = pillWidth(label, m);
        const pos = positions[i] ?? { x: W / 2, y: H / 2 };

        /* Centre of the pill = top-left + half-dimensions */
        const cx = pos.x + pw / 2;
        const cy = pos.y + m.PILL_H / 2;

        return Bodies.rectangle(cx, cy, pw, m.PILL_H, {
          chamfer:     { radius: m.PILL_H / 2 },
          restitution: 0.30,
          friction:    0.12,
          frictionAir: 0.022,
          density:     0.0018,
          label,
          isStatic:    false,
        });
      });
      bodiesRef.current = bodies;
      Composite.add(world, bodies);

      /* Mouse / drag constraint */
      const mouse = Mouse.create(container!);
      mouseRef.current = mouse;

      /* Strip wheel listeners so Lenis keeps scroll control */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mWheelFn = (mouse as any).mousewheel as EventListenerOrEventListenerObject | null;
      if (mWheelFn) {
        (["mousewheel", "DOMMouseScroll", "wheel"] as const).forEach((evt) => {
          mouse.element.removeEventListener(evt, mWheelFn);
        });
      }

      const mc = MouseConstraint.create(engine, {
        mouse,
        constraint: {
          stiffness: 0.2,
          render: { visible: false } as never,
        },
      });
      Composite.add(world, mc);
      mouseConstraintRef.current = mc;

      /* Velocity clamping */
      const MAX_SPEED = 22;
      const clampVelocity = () => {
        bodies.forEach((body) => {
          if (body.speed > MAX_SPEED) {
            const scale = MAX_SPEED / body.speed;
            Body.setVelocity(body, {
              x: body.velocity.x * scale,
              y: body.velocity.y * scale,
            });
          }
        });
      };
      beforeUpdateRef.current = clampVelocity;
      Matter.Events.on(engine, "beforeUpdate", clampVelocity);

      /* RAF loop: sync DOM to physics bodies */
      const sync = () => {
        bodies.forEach((body, i) => {
          const el = pillRefs.current[i];
          if (!el) return;
          const pw = pillWidth(pills[i], m);
          const x  = body.position.x - pw / 2;
          const y  = body.position.y - m.PILL_H / 2;
          el.style.transition = "none";
          el.style.transform  = `translate(${x}px, ${y}px) rotate(${body.angle}rad)`;
        });
        rafIdRef.current = requestAnimationFrame(sync);
      };

      /* Start runner AFTER setting up everything */
      const runner = Runner.create();
      runnerRef.current = runner;
      Runner.run(runner, engine);

      /* Begin syncing */
      rafIdRef.current = requestAnimationFrame(sync);

      /* Pause the physics step + DOM sync whenever the pit scrolls out of
         view — otherwise the Runner and RAF loop burn CPU forever once the
         section is behind you. 200px margin resumes just before it re-enters. */
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            if (rafIdRef.current) return; // already running
            if (runnerRef.current) Runner.run(runnerRef.current, engine);
            rafIdRef.current = requestAnimationFrame(sync);
          } else {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = 0;
            if (runnerRef.current) Runner.stop(runnerRef.current);
          }
        },
        { rootMargin: "200px" }
      );
      observer.observe(container!);
      observerRef.current = observer;

      /* Mark state */
      setPhysicsActive(true);
    }

    /* Listen for the first pointer-down inside the pit */
    container.addEventListener("pointerdown", activatePhysics, { once: true });

    return () => {
      container.removeEventListener("pointerdown", activatePhysics);
    };
  }, [pills, reducedMotion]);

  /* ── Temporary OOM-investigation probe (inert without ?memprobe) ── */
  useEffect(() => {
    if (!window.location.search.includes("memprobe")) return;
    probeMounts++;
    const id = setInterval(() => {
      (window as unknown as { __pit: object }).__pit = {
        mounts: probeMounts,
        engines: probeEngines,
        bodies: engineRef.current?.world.bodies.length ?? 0,
        pairs: engineRef.current?.pairs.list.length ?? 0,
      };
    }, 1000);
    return () => clearInterval(id);
  }, []);

  /* ── Cleanup physics engine on unmount ── */
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;

      if (runnerRef.current) Runner.stop(runnerRef.current);

      const engine = engineRef.current;
      if (engine) {
        if (beforeUpdateRef.current) {
          Matter.Events.off(engine, "beforeUpdate", beforeUpdateRef.current);
        }
        if (mouseConstraintRef.current) {
          Composite.remove(engine.world, mouseConstraintRef.current, true);
        }
        if (mouseRef.current) {
          Mouse.clearSourceEvents(mouseRef.current);
        }
        Composite.clear(engine.world, false, true);
        Engine.clear(engine);
        probeEngines = Math.max(0, probeEngines - 1);
      }

      bodiesRef.current = [];
      beforeUpdateRef.current = null;
      mouseConstraintRef.current = null;
      mouseRef.current = null;
      runnerRef.current = null;
      engineRef.current = null;
    };
  }, [pills, reducedMotion]);

  return (
    <div
      ref={containerRef}
      className={`gravity-pit${physicsActive ? " physics-active" : ""}`}
      id="gravity-pit"
      data-lenis-prevent
      role="region"
      aria-label="Interactive skills playground, drag to activate physics"
    >
      {/* Corner label — only shows until physics activates, hidden under reduced motion */}
      {!physicsActive && !reducedMotion && (
        <p
          aria-hidden="true"
          style={{
            position:      "absolute",
            bottom:        "16px",
            right:         "20px",
            margin:        0,
            fontFamily:    "var(--font-jetbrains), monospace",
            fontSize:      "10px",
            fontWeight:    500,
            color:         "rgba(221,229,232,0.32)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            pointerEvents: "none",
            userSelect:    "none",
            zIndex:        2,
          }}
        >
          Drag to interact
        </p>
      )}

      {pills.map((label, i) => (
        <div
          key={label}
          ref={(el) => { pillRefs.current[i] = el; }}
          className="gravity-pill"
        >
          {label}
        </div>
      ))}
    </div>
  );
}
