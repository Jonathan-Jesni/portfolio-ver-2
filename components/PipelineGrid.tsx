"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Draggable from "gsap/Draggable";
import ScrollTrigger from "gsap/ScrollTrigger";
import type { BuildingItem } from "@/lib/data";

gsap.registerPlugin(useGSAP, Draggable, ScrollTrigger);

export default function PipelineGrid({ items }: { items: readonly BuildingItem[] }) {
  const gridRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const packetRef = useRef<SVGCircleElement>(null);
  const draggingFlags = useRef<boolean[]>([]);

  function updateConnector() {
    const wrapper = gridRef.current;
    const line = lineRef.current;
    const packet = packetRef.current;
    if (!wrapper || !line || !packet) return;

    const svgEl = wrapper.querySelector<SVGSVGElement>(".pipeline-connector-svg");
    if (!svgEl) return;

    const cards = wrapper.querySelectorAll<HTMLElement>(".pipeline-card");
    if (cards.length < 2) return;

    const r0 = cards[0].getBoundingClientRect();
    const r1 = cards[1].getBoundingClientRect();

    if (Math.abs(r0.top - r1.top) > 10) {
      line.style.display = packet.style.display = "none";
      return;
    }
    line.style.display = packet.style.display = "";

    const wr = svgEl.getBoundingClientRect();
    const y = r0.top + r0.height / 2 - wr.top;
    const x1 = r0.right - wr.left;
    const x2 = r1.left - wr.left;

    line.setAttribute("x1", String(x1));
    line.setAttribute("y1", String(y));
    line.setAttribute("x2", String(x2));
    line.setAttribute("y2", String(y));
    packet.setAttribute("cy", String(y));
    packet.setAttribute("cx", String(x1));
    wrapper.style.setProperty("--pipe-gap", `${x2 - x1}px`);
  }

  useGSAP(() => {
    const wrapper = gridRef.current;
    if (!wrapper) return;

    const ro = new ResizeObserver(updateConnector);
    ro.observe(wrapper);
    updateConnector();

    return () => ro.disconnect();
  }, { scope: gridRef });

  useGSAP(() => {
    const cards = Array.from(
      gridRef.current?.querySelectorAll<HTMLElement>(".pipeline-card") ?? []
    );
    if (!cards.length) return;

    const cleanups: (() => void)[] = [];

    cards.forEach((card, ci) => {
      function onMouseMove(e: MouseEvent) {
        if (draggingFlags.current[ci]) return;
        const r = card.getBoundingClientRect();
        const nx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
        const ny = (e.clientY - r.top - r.height / 2) / (r.height / 2);

        gsap.to(card, {
          rotateY: nx * 10,
          rotateX: -ny * 10,
          duration: 0.25,
          ease: "power2.out",
          overwrite: "auto",
        });

        card.querySelectorAll<HTMLElement>(".pipeline-z").forEach((el) =>
          gsap.to(el, { x: nx * 7, y: ny * 7, duration: 0.3, ease: "power2.out", overwrite: "auto" })
        );
      }

      function onMouseLeave() {
        if (draggingFlags.current[ci]) return;
        gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.8, ease: "power3.out", overwrite: "auto" });
        card.querySelectorAll<HTMLElement>(".pipeline-z").forEach((el) =>
          gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: "power3.out", overwrite: "auto" })
        );
      }

      card.addEventListener("mousemove", onMouseMove);
      card.addEventListener("mouseleave", onMouseLeave);

      cleanups.push(() => {
        card.removeEventListener("mousemove", onMouseMove);
        card.removeEventListener("mouseleave", onMouseLeave);
        gsap.killTweensOf(card, "rotateX,rotateY");
        card.querySelectorAll<HTMLElement>(".pipeline-z").forEach((el) =>
          gsap.killTweensOf(el, "x,y")
        );
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, { scope: gridRef });

  useGSAP(() => {
    const cards = Array.from(
      gridRef.current?.querySelectorAll<HTMLElement>(".pipeline-card") ?? []
    );
    if (!cards.length) return;

    const instances: Draggable[] = [];

    cards.forEach((card, ci) => {
      const drags = Draggable.create(card, {
        type: "x,y",
        inertia: false,
        bounds: { minX: -40, maxX: 40, minY: -40, maxY: 40 },
        onDragStart() {
          draggingFlags.current[ci] = true;
        },
        onDrag() {
          updateConnector();
        },
        onDragEnd() {
          draggingFlags.current[ci] = false;
          gsap.to(card, {
            x: 0,
            y: 0,
            ease: "elastic.out(1, 0.3)",
            duration: 1.2,
            onUpdate: updateConnector,
          });
        },
      });
      instances.push(...drags);
    });

    return () => instances.forEach((d) => d.kill());
  }, { scope: gridRef });

  useGSAP(() => {
    const cards = Array.from(
      gridRef.current?.querySelectorAll<HTMLElement>(".pipeline-card") ?? []
    );
    if (!cards.length) return;

    const draggables: Draggable[] = [];
    const scrollTriggers: ScrollTrigger[] = [];

    cards.forEach((card) => {
      const row = card.querySelector<HTMLElement>(".pipe-steps-row");
      const playhead = card.querySelector<HTMLElement>(".pipeline-playhead");
      if (!row || !playhead) return;
      const rowEl: HTMLElement = row;
      const playheadEl: HTMLElement = playhead;

      const steps = Array.from(rowEl.querySelectorAll<HTMLElement>(".pipe-step"));
      let lastHitIdx = -1;

      function runHitTest() {
        const phR = playheadEl.getBoundingClientRect();
        const phCX = (phR.left + phR.right) / 2;

        let newHit = -1;
        steps.forEach((step, i) => {
          const sr = step.getBoundingClientRect();
          const isPassed = phCX >= sr.left;
          const isHit = phCX >= sr.left && phCX <= sr.right;

          step.querySelector<HTMLElement>(".pipe-step-label")
            ?.classList.toggle("pipe-step--lit", isPassed);

          if (isHit) newHit = i;
        });

        if (newHit !== -1 && newHit !== lastHitIdx) {
          card.classList.remove("pipeline-card--executing");
          void card.offsetWidth;
          card.classList.add("pipeline-card--executing");
        }
        lastHitIdx = newHit;
      }

      const drags = Draggable.create(playhead, {
        type: "x",
        bounds: rowEl,
        onDrag: runHitTest,
        onDragEnd() {
          card.classList.remove("pipeline-card--executing");
          lastHitIdx = -1;
        },
      });
      draggables.push(...drags);

      const runway = card.closest<HTMLElement>(".sp-runway") ?? card;

      const st = ScrollTrigger.create({
        trigger: runway,
        start: "35% top",
        once: true,
        onEnter() {
          const maxX = rowEl.offsetWidth - playheadEl.offsetWidth;

          gsap.set(playheadEl, { x: 0 });
          lastHitIdx = -1;
          steps.forEach((step) =>
            step.querySelector<HTMLElement>(".pipe-step-label")
              ?.classList.remove("pipe-step--lit")
          );

          gsap.to(playheadEl, {
            x: maxX,
            duration: 4.0,
            ease: "power2.inOut",
            onUpdate: runHitTest,
            onComplete() {
              card.classList.remove("pipeline-card--executing");
              Draggable.get(playheadEl)?.update();
            },
          });
        },
      });
      scrollTriggers.push(st);
    });

    return () => {
      draggables.forEach((d) => d.kill());
      scrollTriggers.forEach((st) => st.kill());
    };
  }, { scope: gridRef });

  return (
    <div
      className="pipeline-wrapper"
      ref={gridRef}
      style={{ touchAction: "pan-y" }}
    >
      <svg className="pipeline-grid-bg" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <pattern id="pipeline-dot-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="0.5" cy="0.5" r="0.5" fill="rgba(255,255,255,0.07)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pipeline-dot-grid)" />
      </svg>

      <svg
        className="pipeline-connector-svg"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          overflow: "visible",
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        <line ref={lineRef} className="pipeline-connector-line" x1="0" y1="0" x2="0" y2="0" />
        <circle ref={packetRef} className="pipeline-packet" r="3" cx="0" cy="0" />
      </svg>

      <div className="building-grid">
        {items.map((item, idx) => (
          <div
            key={item.id}
            id={item.id}
            className="building-card pipeline-card sp-reveal"
            data-pipeline-index={idx}
          >
            <div className="building-card-inner">
              <div className="building-status">
                <span className="status-dot" aria-hidden="true">
                  <span className="status-dot-pulse" />
                </span>
                <span className="mono building-status-label">{item.status}</span>
                <span className="pipeline-node-id mono">
                  node_{String(idx).padStart(2, "0")}
                </span>
              </div>

              <h3 className="pipeline-title pipeline-z">{item.title}</h3>

              <div className="pipe-steps-row pipeline-z" aria-label="Pipeline steps">
                <div className="pipeline-playhead" aria-hidden="true" />
                {item.steps.map((step, si) => (
                  <span key={step} className="pipe-step">
                    <span className="pipe-step-label mono">[{step}]</span>
                    {si < item.steps.length - 1 && (
                      <span className="pipe-arrow mono" aria-hidden="true">→</span>
                    )}
                  </span>
                ))}
              </div>

              <p className="pipeline-desc pipeline-z">{item.description}</p>

              <div className="project-tags pipeline-z">
                {item.tags.map((tag) => (
                  <span key={tag} className="project-tag">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
