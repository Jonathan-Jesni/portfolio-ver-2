"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

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
   Icons (inline — no extra dep)
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
   Component
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
  // Outer scroll runway (250vh gives enough room to breathe)
  const runwayRef = useRef<HTMLDivElement>(null);
  // The sticky viewport-height shell
  const stickyRef = useRef<HTMLDivElement>(null);
  // The card that gets scaled/blurred
  const cardRef = useRef<HTMLDivElement>(null);
  // The text block that gets the clip-path wipe
  const textRef = useRef<HTMLDivElement>(null);

  /* ---- GSAP ScrollTrigger fly-through ---- */
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!runwayRef.current || !cardRef.current) return;

      // Set initial state before the timeline touches it
      gsap.set(cardRef.current, {
        scale: 0.8,
        filter: "blur(12px)",
        opacity: 0,
        y: -60,
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: runwayRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
        },
      });

      // 0 → 35%: Approach — card rushes from deep space and locks into place
      tl.to(
        cardRef.current,
        {
          scale: 1,
          y: 0,
          filter: "blur(0px)",
          opacity: 1,
          ease: "back.out(1.4)",
          duration: 0.35,
        },
        0
      );

      // 35% → 65%: Reading plateau — hold perfectly still
      tl.to(
        cardRef.current,
        {
          scale: 1,
          filter: "blur(0px)",
          opacity: 1,
          ease: "none",
          duration: 0.3,
        },
        0.35
      );

      // 65% → 100%: Fly past — card overshoots and fades
      tl.to(
        cardRef.current,
        {
          scale: 1.5,
          filter: "blur(15px)",
          opacity: 0,
          ease: "power2.in",
          duration: 0.35,
        },
        0.65
      );
    }, runwayRef);

    return () => ctx.revert();
  }, []);

  /* ---- Clip-path text wipe via IntersectionObserver ---- */
  useEffect(() => {
    const textEl = textRef.current;
    if (!textEl) return;

    // Split children into individually-revealable lines
    const lines = Array.from(textEl.querySelectorAll<HTMLElement>("[data-reveal]"));

    // Set initial clipped state
    gsap.set(lines, { clipPath: "inset(0 0 110% 0)", yPercent: 8 });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            gsap.to(lines, {
              clipPath: "inset(0 0 0% 0)",
              yPercent: 0,
              duration: 0.8,
              ease: "power3.out",
              stagger: 0.07,
            });
            observer.disconnect();
          }
        });
      },
      // Fire when ~60% of the text block is in view (i.e. plateau)
      { threshold: 0.6 }
    );

    observer.observe(textEl);
    return () => observer.disconnect();
  }, []);

  return (
    /* ---- Outer scroll runway ---- */
    <div ref={runwayRef} className="sc-runway" id={`project-${id}`}>
      {/* ---- Sticky shell ---- */}
      <div ref={stickyRef} className="sc-sticky">
        {/* ---- The actual card ---- */}
        <article ref={cardRef} className="sc-card project-card">

          {/* Image or pipeline */}
          {image ? (
            <div className="project-image-wrap">
              <img
                src={image}
                alt={imageAlt ?? title}
                className="project-image"
                loading="lazy"
                decoding="async"
              />
            </div>
          ) : pipeline ? (
            <div className="project-pipeline">
              {pipeline.map((step, idx) => (
                <span key={step} className="pipeline-row">
                  <span className="pipeline-step">{step}</span>
                  {idx < pipeline.length - 1 && (
                    <span className="pipeline-arrow">→</span>
                  )}
                </span>
              ))}
            </div>
          ) : null}

          {/* Text block — each child tagged for wipe-in */}
          <div ref={textRef} className="sc-text">
            <span className="project-overline" data-reveal>Featured Project</span>

            <h3 className="project-title" data-reveal>
              {title}{" "}
              <span className="project-subtitle">— {subtitle}</span>
            </h3>

            <p className="project-description" data-reveal>{description}</p>

            <p className="project-tech" data-reveal>Built with: {tech}</p>

            <div className="project-tags" data-reveal>
              {tags.map((tag) => (
                <span key={tag} className="project-tag">{tag}</span>
              ))}
            </div>

            <div className="project-links" data-reveal>
              <a
                href={github}
                target="_blank"
                rel="noopener noreferrer"
                className="project-link"
                id={`${id}-github`}
              >
                <GitHubIcon />
                Source
                <ArrowUpRightIcon />
              </a>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
