"use client";

import { useRef } from "react";
import type { BuildingItem } from "@/lib/data";
import { CometCard } from "@/components/ui/comet-card";

export default function PipelineGrid({ items }: { items: readonly BuildingItem[] }) {
  const gridRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="pipeline-wrapper"
      ref={gridRef}
      style={{ touchAction: "pan-y" }}
    >
      {/* Dot-grid background texture */}
      <svg className="pipeline-grid-bg" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <pattern id="pipeline-dot-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="0.5" cy="0.5" r="0.5" fill="rgba(255,255,255,0.07)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pipeline-dot-grid)" />
      </svg>

      <div className="building-grid">
        {items.map((item, idx) => (
          <CometCard
            key={item.id}
            rotateDepth={15}
            translateDepth={10}
          >
            <div
              id={item.id}
              className="building-card pipeline-card sp-reveal"
              data-pipeline-index={idx}
              style={{ height: "100%" }}
            >
              <div className="building-card-inner">
                {/* Status row */}
                <div className="building-status">
                  <span className="status-dot" aria-hidden="true">
                    <span className="status-dot-pulse" />
                  </span>
                  <span className="mono building-status-label">{item.status}</span>
                  <span className="pipeline-node-id mono">
                    node_{String(idx).padStart(2, "0")}
                  </span>
                </div>

                <h3 className="pipeline-title">{item.title}</h3>

                {/* Pipeline steps — static labels, no playhead */}
                <div className="pipe-steps-row" aria-label="Pipeline steps">
                  {item.steps.map((step, si) => (
                    <span key={step} className="pipe-step">
                      <span className="pipe-step-label mono pipe-step--lit">[{step}]</span>
                      {si < item.steps.length - 1 && (
                        <span className="pipe-arrow mono" aria-hidden="true">→</span>
                      )}
                    </span>
                  ))}
                </div>

                <p className="pipeline-desc">{item.description}</p>

                <div className="project-tags">
                  {item.tags.map((tag) => (
                    <span key={tag} className="project-tag">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </CometCard>
        ))}
      </div>
    </div>
  );
}
