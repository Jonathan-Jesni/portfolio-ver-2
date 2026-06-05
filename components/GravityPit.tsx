"use client";

import { useEffect, useRef, useState } from "react";
import Matter from "matter-js";

const {
  Engine, Runner, Bodies, Composite,
  Mouse, MouseConstraint, Body,
} = Matter;

/* ---- Skill pills ---- */
const PILLS = [
  "Python", "Java", "C/C++", "Dart", "Flask", "Flutter",
  "Deep Learning", "Computer Vision", "Recommender Systems",
  "YOLO", "Semantic Segmentation", "PyTorch", "TensorFlow",
  "Keras", "OpenCV", "NumPy", "Pandas", "Blender",
  "GPU Computing", "React.js", "JavaScript", "HTML5", "CSS3", "Tailwind CSS",
];

const PILL_H   = 34;   // px — pill height
const CHAR_W   = 7.0;  // px — JetBrains Mono 11px average char width
const H_PAD    = 36;   // px — total horizontal padding

function pillWidth(text: string) {
  return Math.max(text.length * CHAR_W + H_PAD, 72);
}

/* ================================================================
   STATIC GRID LAYOUT
   Lay pills in left-to-right, top-to-bottom rows.
   Returns { x, y } of the top-left corner for each pill.
   ================================================================ */
function buildStaticGrid(containerW: number): { x: number; y: number }[] {
  const GUTTER     = 8;   // px gap between pills
  const PAD_X      = 20;  // container horizontal padding
  const PAD_Y      = 20;  // container vertical padding

  const positions: { x: number; y: number }[] = [];
  let curX = PAD_X;
  let curY = PAD_Y;
  let rowH = PILL_H + GUTTER; // uniform row height

  for (const label of PILLS) {
    const pw = pillWidth(label);

    /* Wrap to next row if pill doesn't fit */
    if (curX + pw > containerW - PAD_X && curX > PAD_X) {
      curX = PAD_X;
      curY += rowH;
    }

    positions.push({ x: curX, y: curY });
    curX += pw + GUTTER;
  }

  return positions;
}

/* ================================================================
   COMPONENT
   ================================================================ */
export default function GravityPit() {
  const containerRef  = useRef<HTMLDivElement>(null);
  const pillRefs      = useRef<(HTMLDivElement | null)[]>([]);

  /*
    physicsActive — false on mount (static, silent grid).
    Flips to true on first user pointer-down inside the pit.
    Once active it never reverts — the physics engine stays alive
    for the remainder of the session.
  */
  const [physicsActive, setPhysicsActive] = useState(false);
  const engineRef     = useRef<Matter.Engine | null>(null);
  const runnerRef     = useRef<Matter.Runner | null>(null);
  const bodiesRef     = useRef<Matter.Body[]>([]);
  const rafIdRef      = useRef<number>(0);
  const staticPos     = useRef<{ x: number; y: number }[]>([]);

  /* ── PHASE 1: Apply static grid positions to DOM on mount ── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const W = container.offsetWidth;
    const positions = buildStaticGrid(W);
    staticPos.current = positions;

    /* Size and position every pill in the static layout */
    PILLS.forEach((label, i) => {
      const el = pillRefs.current[i];
      if (!el) return;
      const pw   = pillWidth(label);
      const pos  = positions[i];

      el.style.width           = `${pw}px`;
      el.style.height          = `${PILL_H}px`;
      el.style.transformOrigin = `${pw / 2}px ${PILL_H / 2}px`;
      el.style.transform       = `translate(${pos.x}px, ${pos.y}px) rotate(0rad)`;
      el.style.transition      = "transform 0.3s var(--ease-out-expo)";
    });
  }, []);

  /* ── PHASE 2: Activate physics on first interaction ── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function activatePhysics() {
      if (engineRef.current) return; // already active — idempotent

      const W = container!.offsetWidth;
      const H = container!.offsetHeight;

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

      /*
        Pill bodies — positioned at the CURRENT static grid positions
        (not dropped from above). This means the pills are already
        in their exact visual positions when physics starts.
        The user's first drag "shatters" the silent grid.
      */
      const positions = staticPos.current;
      const bodies = PILLS.map((label, i) => {
        const pw  = pillWidth(label);
        const pos = positions[i] ?? { x: W / 2, y: H / 2 };

        /* Centre of the pill = top-left + half-dimensions */
        const cx = pos.x + pw / 2;
        const cy = pos.y + PILL_H / 2;

        return Bodies.rectangle(cx, cy, pw, PILL_H, {
          chamfer:     { radius: PILL_H / 2 },
          restitution: 0.30,
          friction:    0.12,
          frictionAir: 0.022,
          density:     0.0018,
          label,
          /* CRITICAL: start at rest — no angular velocity */
          isStatic:    false,
        });
      });
      bodiesRef.current = bodies;
      Composite.add(world, bodies);

      /* Mouse / drag constraint */
      const mouse = Mouse.create(container!);

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

      /* Velocity clamping */
      const MAX_SPEED = 22;
      Matter.Events.on(engine, "beforeUpdate", () => {
        bodies.forEach((body) => {
          if (body.speed > MAX_SPEED) {
            const scale = MAX_SPEED / body.speed;
            Body.setVelocity(body, {
              x: body.velocity.x * scale,
              y: body.velocity.y * scale,
            });
          }
        });
      });

      /* RAF loop: sync DOM to physics bodies */
      const sync = () => {
        bodies.forEach((body, i) => {
          const el = pillRefs.current[i];
          if (!el) return;
          const pw = pillWidth(PILLS[i]);
          const x  = body.position.x - pw / 2;
          const y  = body.position.y - PILL_H / 2;
          /* Remove the CSS transition once physics takes over */
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

      /* Mark state */
      setPhysicsActive(true);
    }

    /* Listen for the first pointer-down inside the pit */
    container.addEventListener("pointerdown", activatePhysics, { once: true });

    return () => {
      container.removeEventListener("pointerdown", activatePhysics);
    };
  }, []);

  /* ── Cleanup physics engine on unmount ── */
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafIdRef.current);
      if (runnerRef.current)  Runner.stop(runnerRef.current);
      if (engineRef.current)  {
        Engine.clear(engineRef.current);
        Composite.clear(engineRef.current.world, false);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`gravity-pit${physicsActive ? " physics-active" : ""}`}
      id="gravity-pit"
      data-lenis-prevent
    >
      {/* Corner label — only shows until physics activates */}
      {!physicsActive && (
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
            color:         "rgba(255,255,255,0.15)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            pointerEvents: "none",
            userSelect:    "none",
            zIndex:        2,
          }}
        >
          Click to interact
        </p>
      )}

      {PILLS.map((label, i) => (
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
