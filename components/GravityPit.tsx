"use client";

import { useEffect, useRef } from "react";
import Matter from "matter-js";

const {
  Engine, Runner, Bodies, Composite,
  Mouse, MouseConstraint, Body, Events,
} = Matter;

/* ---- Skill pills ---- */
const PILLS = [
  'Python', 'Java', 'C/C++', 'Dart', 'Flask', 'Flutter', 'Deep Learning', 
  'Computer Vision', 'Recommender Systems', 'YOLO', 'Semantic Segmentation', 
  'PyTorch', 'TensorFlow', 'Keras', 'OpenCV', 'NumPy', 'Pandas', 'Blender', 
  'GPU Computing', 'React.js', 'JavaScript', 'HTML5', 'CSS3', 'Tailwind CSS'
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

    /* ---- Static boundary walls (thickness=1000 prevents tunneling) ---- */
    const T = 1000; // wall thickness — far thicker than any pill can travel in one frame
    const walls = [
      // floor — inner top edge sits exactly at y=H
      Bodies.rectangle(W / 2, H + T / 2, W + T * 2, T, { isStatic: true }),
      // left wall — inner right edge sits exactly at x=0
      Bodies.rectangle(-(T / 2), H / 2, T, H + T * 2, { isStatic: true }),
      // right wall — inner left edge sits exactly at x=W
      Bodies.rectangle(W + T / 2, H / 2, T, H + T * 2, { isStatic: true }),
      // ceiling — well above spawn so pills never escape the top
      Bodies.rectangle(W / 2, -300 - T / 2, W + T * 2, T, { isStatic: true }),
    ];
    Composite.add(world, walls);

    /* ---- Pill bodies — dropped in from above, staggered ---- */
    const bodies = PILLS.map((label, i) => {
      const pw = pillWidth(label);
      
      // Spawn in a staggered 3-column layout to prevent massive pileups on load
      const cols = 3;
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      const cellWidth = W / cols;
      const cellCenter = col * cellWidth + cellWidth / 2;
      
      // Constrain X so pills never spawn intersecting the walls
      const minX = Math.max(cellCenter - 30, pw / 2 + 10);
      const maxX = Math.min(cellCenter + 30, W - pw / 2 - 10);
      const x = minX + Math.random() * Math.max(0, maxX - minX);
      
      // Stagger Y into discrete rows falling down
      const y  = -(PILL_H / 2) - row * 100 - Math.random() * 40;

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

    /* ---- Velocity clamping (prevents tunneling from explosive collisions) ---- */
    const MAX_SPEED = 25;
    Events.on(engine, "beforeUpdate", () => {
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
      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "16px",
          pointerEvents: "none",
          userSelect: "none",
          color: "rgba(255,255,255,0.2)",
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: "12px",
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
        }}
      >
        {`// ENGINE: MATTER.JS\n// GRAVITY_Y: 1.80\n// BODIES: ${PILLS.length}\n// STATUS: DRAG_TO_INTERACT`}
      </div>
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
