"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import dynamic from "next/dynamic";

/* Lazy-load GlassImage — avoids SSR WebGL issues */
const GlassImage = dynamic(() => import("./GlassImage"), { ssr: false });

/* -------------------------------------------------------
   Types
------------------------------------------------------- */
interface SpatialCardProps {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  tech: string;
  tags: readonly string[];
  github: string;
  image?: string | null;
  imageAlt?: string | null;
  pipeline?: readonly string[];
}

/* -------------------------------------------------------
   Icons
------------------------------------------------------- */
function GitHubIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function ArrowUpRightIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

/* -------------------------------------------------------
   Per-project hue palette for placeholder/identity tinting
------------------------------------------------------- */
const HUE_PALETTE: Record<string, number> = {
  ludex:            210,
  "file-converter": 160,
  webguardian:      0,
  "synthetic-data": 270,
};

/* -------------------------------------------------------
   Component
   No longer owns a scroll runway — it's a pure display
   card. The parent HorizontalScrollSection handles pinning.
------------------------------------------------------- */
export default function SpatialCard({
  id,
  title,
  subtitle,
  description,
  tech,
  tags,
  github,
  image,
  imageAlt,
  pipeline,
}: SpatialCardProps) {
  const cardRef       = useRef<HTMLDivElement>(null);
  const imageLayerRef = useRef<HTMLDivElement>(null);
  const titleLayerRef = useRef<HTMLDivElement>(null);
  const tagsLayerRef  = useRef<HTMLDivElement>(null);
  const linkLayerRef  = useRef<HTMLDivElement>(null);

  const placeholderHue = HUE_PALETTE[id] ?? 210;

  /* ---- 3D Gyroscopic tilt + Z-axis inner parallax ---- */
  useEffect(() => {
    const cardEl: HTMLDivElement | null = cardRef.current;
    if (!cardEl) return;
    const card: HTMLDivElement = cardEl;

    const zLayers = [
      { el: imageLayerRef.current, zMultiplier: 1.0, xyMultiplier: 0.6 },
      { el: titleLayerRef.current, zMultiplier: 1.8, xyMultiplier: 1.0 },
      { el: tagsLayerRef.current,  zMultiplier: 2.4, xyMultiplier: 1.3 },
      { el: linkLayerRef.current,  zMultiplier: 2.8, xyMultiplier: 1.5 },
    ];

    gsap.set(card, { transformPerspective: 900 });

    function onMouseMove(e: MouseEvent) {
      const r  = card.getBoundingClientRect();
      const nx = (e.clientX - r.left  - r.width  / 2) / (r.width  / 2);
      const ny = (e.clientY - r.top   - r.height / 2) / (r.height / 2);

      gsap.to(card, {
        rotateY:  nx * 7,
        rotateX: -ny * 7,
        duration: 0.35,
        ease: "power2.out",
        overwrite: "auto",
      });

      zLayers.forEach(({ el, zMultiplier, xyMultiplier }) => {
        if (!el) return;
        gsap.to(el, {
          x: nx * 6 * xyMultiplier,
          y: ny * 6 * xyMultiplier,
          z: zMultiplier * 12,
          duration: 0.4,
          ease: "power2.out",
          overwrite: "auto",
        });
      });
    }

    function onMouseLeave() {
      gsap.to(card, {
        rotateX: 0,
        rotateY: 0,
        duration: 0.9,
        ease: "power3.out",
        overwrite: "auto",
      });
      zLayers.forEach(({ el, zMultiplier }) => {
        if (!el) return;
        gsap.to(el, {
          x: 0, y: 0,
          z: zMultiplier * 4,
          duration: 0.9,
          ease: "power3.out",
          overwrite: "auto",
        });
      });
    }

    card.addEventListener("mousemove", onMouseMove);
    card.addEventListener("mouseleave", onMouseLeave);

    return () => {
      card.removeEventListener("mousemove", onMouseMove);
      card.removeEventListener("mouseleave", onMouseLeave);
      gsap.killTweensOf([card, ...zLayers.map(l => l.el).filter(Boolean)]);
    };
  }, []);

  return (
    /* sc-panel: the self-contained card — no runway wrapper */
    <article
      ref={cardRef}
      className="sc-panel sc-card--3d"
      id={`project-${id}`}
      /* touch-action: pan-y lets vertical scroll pass through on mobile */
      style={{ touchAction: "pan-y" }}
    >
      <div className="sc-panel-inner">

        {/* ── Image / pipeline layer ── */}
        <div ref={imageLayerRef} className="sc-z-layer sc-z-image">
          {image ? (
            <div className="sc-image-wrap">
              <GlassImage
                src={image}
                alt={imageAlt}
                placeholderLabel={title}
                placeholderHue={placeholderHue}
                className="sc-glass-image"
              />
            </div>
          ) : pipeline ? (
            <div className="sc-pipeline-strip">
              {pipeline.map((step, idx) => (
                <span key={step} className="sc-pipeline-row">
                  <span className="sc-pipeline-step mono">{step}</span>
                  {idx < pipeline.length - 1 && (
                    <span className="sc-pipeline-arrow mono">→</span>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <div className="sc-image-wrap">
              <GlassImage
                src={null}
                alt={imageAlt ?? title}
                placeholderLabel={title.toUpperCase()}
                placeholderHue={placeholderHue}
                className="sc-glass-image"
              />
            </div>
          )}
        </div>

        {/* ── Text block ── */}
        <div className="sc-text">
          <span className="sc-overline mono">Featured Project</span>

          {/* Title layer — mid Z */}
          <div ref={titleLayerRef} className="sc-z-layer">
            <h3 className="sc-title">
              {title}
              <span className="sc-subtitle"> — {subtitle}</span>
            </h3>
          </div>

          <p className="sc-description">{description}</p>

          <p className="sc-tech mono">Built with: {tech}</p>

          {/* Tags layer — higher Z */}
          <div ref={tagsLayerRef} className="sc-z-layer">
            <div className="sc-tags">
              {tags.map((tag) => (
                <span key={tag} className="sc-tag mono">{tag}</span>
              ))}
            </div>
          </div>

          {/* Links — highest Z */}
          <div ref={linkLayerRef} className="sc-z-layer">
            <div className="sc-links">
              <a
                href={github}
                target="_blank"
                rel="noopener noreferrer"
                className="sc-link"
                id={`${id}-github`}
              >
                <GitHubIcon />
                Source
                <ArrowUpRightIcon />
              </a>
            </div>
          </div>
        </div>

      </div>
    </article>
  );
}
