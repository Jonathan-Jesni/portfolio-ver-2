"use client";

import { useEffect, useRef } from "react";
import Matter from "matter-js";

const {
  Engine, Runner, Bodies, Composite,
  Mouse, MouseConstraint, Body,
} = Matter;

/* ---- Skill pills ---- */
const PILLS = [
  "Python", "PyTorch", "TensorFlow", "Java", "C++",
  "OpenCV", "NumPy", "Pandas", "Flask", "Flutter",
  "Machine Learning", "Deep Learning", "Computer Vision",
  "YOLO", "Blender", "Cybersecurity", "Systems Design", "GPU Computing",
];

const PILL_H      = 36;   // px — pill height
const CHAR_W      = 7.5;  // px — estimated char width for JetBrains Mono 12px
const H_PAD       = 40;   // px — total horizontal padding

function pillWidth(text: string) {
  return Math.max(text.length * CHAR_W + H_PAD, 80);
}

export default function GravityPit() {
  const containerRef = useRef<HTMLDivElement>(null);
  // One ref slot per pill div
  const pillRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const W = container.offsetWidth;
    const H = container.offsetHeight; // matches CSS 400 px

    /* ---- Physics world ---- */
    const engine = Engine.create({ gravity: { y: 1.8 } });
    const world  = engine.world;

    const runner = Runner.create();
    Runner.run(runner, engine);

    /* ---- Static boundary walls ---- */
    const walls = [
      // ground
      Bodies.rectangle(W / 2, H + 25, W + 50, 50, { isStatic: true }),
      // left wall
      Bodies.rectangle(-25, H / 2, 50, H + 50, { isStatic: true }),
      // right wall
      Bodies.rectangle(W + 25, H / 2, 50, H + 50, { isStatic: true }),
      // ceiling (stops pills bouncing out the top)
      Bodies.rectangle(W / 2, -25, W + 50, 50, { isStatic: true }),
    ];
    Composite.add(world, walls);

    /* ---- Pill bodies — dropped in from above, staggered ---- */
    const bodies = PILLS.map((label, i) => {
      const pw = pillWidth(label);
      const x  = pw / 2 + 20 + Math.random() * Math.max(W - pw - 40, 10);
      const y  = -(PILL_H / 2) - i * 80; // staggered above container

      const body = Bodies.rectangle(x, y, pw, PILL_H, {
        chamfer:    { radius: PILL_H / 2 },
        restitution: 0.35,
        friction:    0.1,
        frictionAir: 0.018,
        density:     0.0018,
        label,
      });

      // Slight random spin on spawn
      Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.08);
      return body;
    });
    Composite.add(world, bodies);

    /* ---- DOM pill sizing + transform-origin ---- */
    bodies.forEach((body, i) => {
      const el = pillRefs.current[i];
      if (!el) return;
      const pw = pillWidth(PILLS[i]);
      el.style.width           = `${pw}px`;
      el.style.height          = `${PILL_H}px`;
      // Rotation pivot = pill centre
      el.style.transformOrigin = `${pw / 2}px ${PILL_H / 2}px`;
    });

    /* ---- Mouse / drag constraint ---- */
    const mouse = Mouse.create(container);

    // CRITICAL: strip wheel listeners so Lenis keeps control of scroll.
    // The `mousewheel` property is a runtime-only Matter.js internal
    // that @types/matter-js doesn't declare, so we use `any`.
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

    /* ---- RAF loop: sync DOM pills with physics bodies ---- */
    let rafId: number;
    const sync = () => {
      bodies.forEach((body, i) => {
        const el = pillRefs.current[i];
        if (!el) return;
        const pw = pillWidth(PILLS[i]);
        const x  = body.position.x - pw / 2;
        const y  = body.position.y - PILL_H / 2;
        el.style.transform = `translate(${x}px, ${y}px) rotate(${body.angle}rad)`;
      });
      rafId = requestAnimationFrame(sync);
    };
    rafId = requestAnimationFrame(sync);

    return () => {
      cancelAnimationFrame(rafId);
      Runner.stop(runner);
      Engine.clear(engine);
      Composite.clear(world, false);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="gravity-pit"
      id="gravity-pit"
      data-lenis-prevent          /* tell Lenis to yield inside the physics pit */
    >
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
