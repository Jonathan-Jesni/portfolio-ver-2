"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Image from "next/image";
import { ArrowUpRightIcon, GitHubIcon } from "./icons";

gsap.registerPlugin(useGSAP);

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
  roomColor?: string;
}

const HUE_PALETTE: Record<string, number> = {
  ludex: 210,
  "file-converter": 160,
  webguardian: 0,
  "synthetic-data": 270,
};

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
  const groupRef = useRef<HTMLDivElement>(null);
  const imageLayerRef = useRef<HTMLDivElement>(null);
  const titleLayerRef = useRef<HTMLDivElement>(null);
  const tagsLayerRef = useRef<HTMLDivElement>(null);
  const linkLayerRef = useRef<HTMLDivElement>(null);

  const placeholderHue = HUE_PALETTE[id] ?? 210;

  useGSAP(() => {
    const groupEl = groupRef.current;
    if (!groupEl) return;
    const group: HTMLDivElement = groupEl;

    let isVisible = false;
    let isListening = false;
    const zLayers = [
      { el: imageLayerRef.current, zMultiplier: 1.0, xyMultiplier: 0.5 },
      { el: titleLayerRef.current, zMultiplier: 1.8, xyMultiplier: 1.0 },
      { el: tagsLayerRef.current, zMultiplier: 2.4, xyMultiplier: 1.3 },
      { el: linkLayerRef.current, zMultiplier: 2.8, xyMultiplier: 1.5 },
    ];

    gsap.set(group, { transformPerspective: 900 });

    function resetTilt() {
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
          x: 0,
          y: 0,
          z: zMultiplier * 4,
          duration: 0.9,
          ease: "power3.out",
          overwrite: "auto",
        });
      });
    }

    function onMouseMove(e: MouseEvent) {
      if (!isVisible) return;
      const r = group.getBoundingClientRect();
      const nx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
      const ny = (e.clientY - r.top - r.height / 2) / (r.height / 2);

      gsap.to(group, {
        rotateY: nx * 5,
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

    function addListeners() {
      if (isListening) return;
      group.addEventListener("mousemove", onMouseMove);
      group.addEventListener("mouseleave", resetTilt);
      isListening = true;
    }

    function removeListeners() {
      if (!isListening) return;
      group.removeEventListener("mousemove", onMouseMove);
      group.removeEventListener("mouseleave", resetTilt);
      isListening = false;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) {
          addListeners();
        } else {
          removeListeners();
          resetTilt();
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(group);

    return () => {
      observer.disconnect();
      removeListeners();
      gsap.killTweensOf([group, ...zLayers.map((layer) => layer.el).filter(Boolean)]);
    };
  }, { scope: groupRef });

  return (
    <div
      ref={groupRef}
      className="sc-project-group sc-card--3d"
      id={`project-${id}`}
      data-room-color={roomColor ?? "#050505"}
      style={{ touchAction: "pan-y" }}
    >
      <div
        ref={imageLayerRef}
        className="sc-deconstructed-image sc-z-layer sc-z-image"
      >
        {image ? (
          <div className="sc-image-wrap">
            <Image
              src={image}
              alt={imageAlt ?? title}
              className="sc-glass-image"
              fill
              sizes="(max-width: 767px) 100vw, 500px"
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

      <div className="sc-deconstructed-text">
        <div className="sc-deconstructed-text-inner">
          <div className="sc-text">
            <span className="sc-overline mono">Featured Project</span>

            <div ref={titleLayerRef} className="sc-z-layer">
              <h3 className="sc-title">
                {title}
                <span className="sc-subtitle"> — {subtitle}</span>
              </h3>
            </div>

            <p className="sc-description">{description}</p>

            <p className="sc-tech mono">Built with: {tech}</p>

            <div ref={tagsLayerRef} className="sc-z-layer">
              <div className="sc-tags">
                {tags.map((tag) => (
                  <span key={tag} className="sc-tag mono">{tag}</span>
                ))}
              </div>
            </div>

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
