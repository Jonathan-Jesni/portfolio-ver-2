"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

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
  /** OLED tint for the room morph background (e.g. '#040a14') */
  roomColor?: string;
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
   Component — Deconstructed sibling layout.
   Image and text are distinct floating panels inside a
   project group. HorizontalScrollSection handles pinning,
   coverflow, and room morph via data-room-color.
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
  roomColor,
}: SpatialCardProps) {
  const groupRef      = useRef<HTMLDivElement>(null);
  const imageLayerRef = useRef<HTMLDivElement>(null);
  const titleLayerRef = useRef<HTMLDivElement>(null);
  const tagsLayerRef  = useRef<HTMLDivElement>(null);
  const linkLayerRef  = useRef<HTMLDivElement>(null);

  const placeholderHue = HUE_PALETTE[id] ?? 210;

  /* ---- 3D Gyroscopic tilt + Z-axis inner parallax on hover ---- */
  useEffect(() => {
    const groupEl: HTMLDivElement | null = groupRef.current;
    if (!groupEl) return;
    const group: HTMLDivElement = groupEl;

    const zLayers = [
      { el: imageLayerRef.current, zMultiplier: 1.0, xyMultiplier: 0.5 },
      { el: titleLayerRef.current, zMultiplier: 1.8, xyMultiplier: 1.0 },
      { el: tagsLayerRef.current,  zMultiplier: 2.4, xyMultiplier: 1.3 },
      { el: linkLayerRef.current,  zMultiplier: 2.8, xyMultiplier: 1.5 },
    ];

    gsap.set(group, { transformPerspective: 900 });

    function onMouseMove(e: MouseEvent) {
      const r  = group.getBoundingClientRect();
      const nx = (e.clientX - r.left  - r.width  / 2) / (r.width  / 2);
      const ny = (e.clientY - r.top   - r.height / 2) / (r.height / 2);

      gsap.to(group, {
        rotateY:  nx * 5,
        rotateX: -ny * 5,
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
      gsap.to(group, {
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

    group.addEventListener("mousemove", onMouseMove);
    group.addEventListener("mouseleave", onMouseLeave);

    return () => {
      group.removeEventListener("mousemove", onMouseMove);
      group.removeEventListener("mouseleave", onMouseLeave);
      gsap.killTweensOf([group, ...zLayers.map(l => l.el).filter(Boolean)]);
    };
  }, []);

  return (
    /* Project group: image panel + text panel as sibling floating blocks */
    <div
      ref={groupRef}
      className="sc-project-group sc-card--3d"
      id={`project-${id}`}
      data-room-color={roomColor ?? "#050505"}
      style={{ touchAction: "pan-y" }}
    >
      {/* ── Image Panel — dedicated screenshot / pipeline container ── */}
      <div
        ref={imageLayerRef}
        className="sc-deconstructed-image sc-z-layer sc-z-image"
      >
        {image ? (
          <div className="sc-image-wrap">
            {/* Plain img — sharp retina, correct orientation, object-fit: cover */}
            <img
              src={image}
              alt={imageAlt ?? title}
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
          /* Fallback tinted block for projects with neither image nor pipeline */
          <div
            className="sc-image-wrap"
            style={{
              background: `hsl(${placeholderHue}, 20%, 10%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              className="mono"
              style={{ color: `hsl(${placeholderHue}, 40%, 40%)`, fontSize: "11px", letterSpacing: "0.12em" }}
            >
              {title.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* ── Text Panel — glass-morphic floating plaque ── */}
      <div className="sc-deconstructed-text">
        <div className="sc-deconstructed-text-inner">
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
      </div>
    </div>
  );
}
