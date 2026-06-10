"use client";

import type { BuildingItem } from "@/lib/data";
import { CometCard } from "@/components/ui/comet-card";
import MotionBorder from "@/components/ui/motion-border";

export default function PipelineGrid({ items }: { items: readonly BuildingItem[] }) {
  return (
    <div
      className="pipeline-wrapper"
      style={{ touchAction: "pan-y", position: "relative" }}
    >
      {/* Dot-grid background texture */}
      <svg className="pipeline-grid-bg" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <pattern id="pipeline-dot-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="0.5" cy="0.5" r="0.5" fill="rgba(240,232,210,0.04)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pipeline-dot-grid)" />
      </svg>

      <div className="building-grid" style={{ position: "relative" }}>
        {/*
          MotionBorder — "H" circuit that connects both cards.
          Sits directly INSIDE .building-grid so its 100% height
          tightly hugs the cards and ignores the wrapper's 32px padding.
        */}
        <MotionBorder
          cardGapPx={64}
          borderRadius={18}
          borderPadding={12}
          bridgePosition={0.38}
          bridgeCurveRadius={10}
          duration={12}
          dotColor="rgba(201, 168, 118, 0.95)"
          dotSize={5}
          trackColor="rgba(201, 168, 118, 0.14)"
          trackWidth={1}
        />

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
