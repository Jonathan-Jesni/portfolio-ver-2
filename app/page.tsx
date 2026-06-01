"use client";

import { useRef, useEffect } from "react";
import SpatialCard from "../components/SpatialCard";
import SpatialSection from "../components/SpatialSection";
import HeroSection from "../components/HeroSection";
import AboutSection from "../components/AboutSection";
import dynamic from "next/dynamic";

const GravityPit = dynamic(() => import("../components/GravityPit"), { ssr: false });

/* ============================================================
   DATA — extracted from index-old.html
   ============================================================ */

const PROJECTS = [
  {
    id: "ludex",
    title: "Ludex",
    subtitle: "Hybrid Recommendation System",
    description:
      "A hybrid recommendation engine fusing TF-IDF content modeling with implicit-feedback collaborative filtering (ALS). Serves personalized game recommendations via anchor-based profiling, score-normalized fusion, and MMR-based re-ranking — handling cold-start users out of the box.",
    tech: "Python, Scikit-learn, Implicit ALS, Steam API",
    tags: ["Machine Learning", "Recommendation Systems", "Python"],
    github: "https://github.com/Jonathan-Jesni/Ludex",
    image: "/assets/ludex-recommendations.png",
    imageAlt: "Ludex personalized game recommendations interface",
  },
  {
    id: "file-converter",
    title: "File Converter",
    subtitle: "Document Processing Engine",
    description:
      "A deterministic two-pass document conversion engine — structural analysis separated from rendering. Handles paragraph reconstruction, list detection, heading inference, and conservative table extraction with fully explainable outputs. No OCR, no ML, fully deterministic.",
    tech: "Python, Two-Pass Architecture",
    tags: ["Python", "Document Processing", "Systems Design"],
    github: "https://github.com/Jonathan-Jesni/pdf_converter",
    image: null,
    imageAlt: null,
    pipeline: ["PDF", "Parse", "Structure", "Render", "DOCX"],
  },
  {
    id: "webguardian",
    title: "WebGuardian",
    subtitle: "Phishing Detection System",
    description:
      "Multimodal phishing detection combining Char-CNN + LSTM (URL analysis) and MobileNetV2 (visual analysis) via late fusion. Achieves 98.73% accuracy on 3,000 real-world webpages with ~35ms inference — deployed as a production Chrome extension for real-time, on-device threat detection.",
    tech: "Python, Char-CNN + LSTM, MobileNetV2, Chrome Extension",
    tags: ["Deep Learning", "Cybersecurity", "Computer Vision"],
    github: "https://github.com/Jonathan-Jesni",
    image: "/assets/webguardian-phishing.png",
    imageAlt: "Phishing detection warning overlay",
  },
  {
    id: "synthetic-data",
    title: "Synthetic Data Object Detection",
    subtitle: "Detection Pipeline",
    description:
      "End-to-end object detection trained on zero real-world images — entirely synthetic data generated in Blender with randomized 3D scenes. YOLOv8 Nano on 640×640 renders achieves 0.997 precision, 1.000 recall, and 0.995 mAP@50, proving synthetic-only training can match real-data performance.",
    tech: "Python, Blender, YOLOv8, Ultralytics",
    tags: ["Computer Vision", "Synthetic Data", "Deep Learning"],
    github:
      "https://github.com/Jonathan-Jesni/synthetic-data-object-detection",
    image: "/assets/object-detection-main.png",
    imageAlt: "Synthetic object detection with bounding boxes",
  },
] as const;



const BUILDING = [
  {
    id: "building-converter-v2",
    status: "In Progress",
    title: "Document Processing Suite",
    description:
      "Expanding the File Converter into a full document processing system with multi-format conversion, document compression, and extended format support.",
    tags: ["Python", "Document Processing", "Pipeline"],
    steps: ["INGEST", "PARSE", "STRUCTURE", "COMPRESS", "RENDER"],
  },
  {
    id: "building-exploration",
    status: "Exploring",
    title: "New Projects",
    description:
      "Researching next areas — interested in LLM tooling, automated security auditing, and distributed systems.",
    tags: ["LLMs", "Security", "Research"],
    steps: ["RESEARCH", "PROTOTYPE", "EVALUATE", "REFINE", "DEPLOY"],
  },
];


/* ============================================================
   PIPELINE GRID — Agentic Automation Pipeline layout
   ============================================================ */

type BuildingItem = (typeof BUILDING)[number];

function PipelineGrid({ items }: { items: BuildingItem[] }) {
  const gridRef    = useRef<HTMLDivElement>(null);
  const lineRef    = useRef<SVGLineElement>(null);
  const packetRef  = useRef<SVGCircleElement>(null);

  /* ── Wire SVG connector to real card bounding rects ── */
  useEffect(() => {
    const wrapper = gridRef.current;
    if (!wrapper) return;

    function updateConnector() {
      const svgEl  = wrapper!.querySelector<SVGSVGElement>(".pipeline-connector-svg");
      const line   = lineRef.current;
      const packet = packetRef.current;
      if (!svgEl || !line || !packet) return;

      const cards = wrapper!.querySelectorAll<HTMLElement>(".pipeline-card");
      if (cards.length < 2) return;

      // Only draw the connector when both cards are side-by-side (desktop ≥ 640px)
      const isTwoCol = cards[0].getBoundingClientRect().top ===
                       cards[1].getBoundingClientRect().top;
      if (!isTwoCol) { line.style.display = "none"; packet.style.display = "none"; return; }
      line.style.display   = "";
      packet.style.display = "";

      const wrapRect = svgEl.getBoundingClientRect();
      const r0       = cards[0].getBoundingClientRect();
      const r1       = cards[1].getBoundingClientRect();

      // Midpoint Y of the first card, converted to SVG-local coords
      const y = (r0.top + r0.height / 2) - wrapRect.top;
      const x1 = r0.right  - wrapRect.left;
      const x2 = r1.left   - wrapRect.left;

      line.setAttribute("x1",  String(x1));
      line.setAttribute("y1",  String(y));
      line.setAttribute("x2",  String(x2));
      line.setAttribute("y2",  String(y));
      packet.setAttribute("cy", String(y));
      packet.setAttribute("cx", String(x1));
      // Expose gap to CSS keyframe animation
      wrapper!.style.setProperty("--pipe-gap", `${x2 - x1}px`);
    }

    const ro = new ResizeObserver(updateConnector);
    ro.observe(wrapper);
    updateConnector();
    return () => ro.disconnect();
  }, []);

  /* ── Sequential step illumination via IntersectionObserver ── */
  useEffect(() => {
    const cards = gridRef.current?.querySelectorAll<HTMLElement>(".pipeline-card");
    if (!cards) return;

    const observers: IntersectionObserver[] = [];

    cards.forEach((card) => {
      const steps = card.querySelectorAll<HTMLElement>(".pipe-step-label");
      let timer: ReturnType<typeof setTimeout> | null = null;

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.intersectionRatio >= 0.55) {
            steps.forEach((s) => s.classList.remove("pipe-step--lit"));
            if (timer) clearTimeout(timer);
            steps.forEach((s, i) => {
              timer = setTimeout(() => s.classList.add("pipe-step--lit"), i * 320);
            });
          } else {
            if (timer) clearTimeout(timer);
            steps.forEach((s) => s.classList.remove("pipe-step--lit"));
          }
        },
        { threshold: 0.55 }
      );

      obs.observe(card);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <div className="pipeline-wrapper" ref={gridRef}>

      {/* ── Dot-grid background ── */}
      <svg className="pipeline-grid-bg" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <pattern id="pipeline-dot-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="0.5" cy="0.5" r="0.5" fill="rgba(255,255,255,0.07)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pipeline-dot-grid)" />
      </svg>

      {/* ── SVG orchestration connector (desktop only) ── */}
      <svg
        className="pipeline-connector-svg"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none", zIndex: 1 }}
      >
        <line
          ref={lineRef}
          className="pipeline-connector-line"
          x1="0" y1="0" x2="0" y2="0"
        />
        <circle
          ref={packetRef}
          className="pipeline-packet"
          r="3"
          cx="0" cy="0"
        />
      </svg>

      {/* ── Card grid ── */}
      <div className="building-grid">
        {items.map((item, idx) => (
          <div
            key={item.id}
            id={item.id}
            className="building-card pipeline-card sp-reveal"
            data-pipeline-index={idx}
          >
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

            {/* Title */}
            <h3 className="pipeline-title">{item.title}</h3>

            {/* Step matrix */}
            <div className="pipe-steps-row" aria-label="Pipeline steps">
              {item.steps.map((step, si) => (
                <span key={step} className="pipe-step">
                  <span className="pipe-step-label mono">[{step}]</span>
                  {si < item.steps.length - 1 && (
                    <span className="pipe-arrow mono" aria-hidden="true">→</span>
                  )}
                </span>
              ))}
            </div>

            {/* Description */}
            <p className="pipeline-desc">{item.description}</p>

            {/* Tags */}
            <div className="project-tags">
              {item.tags.map((tag) => (
                <span key={tag} className="project-tag">{tag}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   SVG ICONS  (only those still used in this file)
   ============================================================ */

function GitHubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function LinkedInIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function MailIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

/* ============================================================
   COMPONENT
   ============================================================ */

export default function Home() {
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  function toggleMobileMenu() {
    mobileMenuRef.current?.classList.toggle("open");
  }

  function closeMobileMenu() {
    mobileMenuRef.current?.classList.remove("open");
  }

  return (
    <>
      {/* ===== NAV ===== */}
      <nav className="nav" id="navbar">
        <div className="nav-inner">
          <a href="#hero" className="nav-logo" id="nav-logo">
            <span className="bracket">{"{"}</span> J{" "}
            <span className="bracket">{"}"}</span>
          </a>
          <ul className="nav-links">
            <li>
              <a href="#projects">Projects</a>
            </li>
            <li>
              <a href="#skills">Skills</a>
            </li>
            <li>
              <a href="#about">About</a>
            </li>
            <li>
              <a href="#contact">Contact</a>
            </li>
          </ul>
          <a
            href="/assets/Jonathan_Resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-resume"
            id="nav-resume-btn"
          >
            Resume ↗
          </a>
          <button
            className="mobile-toggle"
            id="mobile-toggle"
            aria-label="Toggle menu"
            ref={toggleRef}
            onClick={toggleMobileMenu}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>

        {/* Mobile menu */}
        <div className="mobile-menu" id="mobile-menu" ref={mobileMenuRef}>
          <a href="#projects" onClick={closeMobileMenu}>
            Projects
          </a>
          <a href="#skills" onClick={closeMobileMenu}>
            Skills
          </a>
          <a href="#about" onClick={closeMobileMenu}>
            About
          </a>
          <a href="#contact" onClick={closeMobileMenu}>
            Contact
          </a>
          <a
            href="/assets/Jonathan_Resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeMobileMenu}
          >
            Resume ↗
          </a>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <HeroSection />

      <hr className="section-divider" />

      <section className="projects" id="projects">
        <div className="container">
          <div className="section-label">
            <span className="section-number">01</span>
            <span className="section-title">Featured Projects</span>
            <span className="section-line"></span>
          </div>

          {/* Spatial fly-through — one per project, stacked vertically */}
          {PROJECTS.map((project) => (
            <SpatialCard
              key={project.id}
              id={project.id}
              title={project.title}
              subtitle={project.subtitle}
              description={project.description}
              tech={project.tech}
              tags={project.tags}
              github={project.github}
              image={'image' in project ? project.image : null}
              imageAlt={'imageAlt' in project ? project.imageAlt : null}
              pipeline={'pipeline' in project ? (project.pipeline as readonly string[]) : undefined}
            />
          ))}

          <div className="projects-cta">
            <p>Want to explore more?</p>
            <a
              href="https://github.com/Jonathan-Jesni?tab=repositories"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
              id="projects-cta-btn"
            >
              View All Projects on GitHub →
            </a>
          </div>
        </div>
      </section>

      <hr className="section-divider" />

      {/* ===== ABOUT ===== */}
      <AboutSection />

      <hr className="section-divider" />

      {/* ===== CURRENTLY BUILDING ===== */}
      <SpatialSection id="currently-building">
        <div className="container">
          <div className="section-label">
            <span className="section-number sp-reveal">03</span>
            <span className="section-title sp-reveal">&gt; currently.building</span>
            <span className="section-line"></span>
          </div>

          <PipelineGrid items={BUILDING} />
        </div>
      </SpatialSection>

      <hr className="section-divider" />

      {/* ===== SKILLS — Matter.js Gravity Pit ===== */}
      <SpatialSection id="skills">
        <div className="container">
          <div className="section-label">
            <span className="section-number sp-reveal">04</span>
            <span className="section-title sp-reveal">skills.list</span>
            <span className="section-line"></span>
          </div>
          <p className="sp-reveal" style={{ color: 'var(--gray-400)', marginBottom: '32px' }}>
            Core technologies and frameworks I use to engineer robust, scalable systems.
          </p>
          <p className="sp-reveal" style={{ color: "var(--gray-500)", fontSize: "13px", fontFamily: "var(--font-jetbrains), monospace", marginBottom: "24px" }}>
            {`// drag the pills around`}
          </p>
          <GravityPit />
        </div>
      </SpatialSection>

      <hr className="section-divider" />

      {/* ===== CONTACT ===== */}
      <SpatialSection id="contact">
        <div className="container">
          <div className="contact-inner">
            <span className="section-number sp-reveal">05 — What&apos;s Next?</span>
            <h2 className="contact-heading sp-reveal">Get In Touch</h2>
            <p className="contact-text sp-reveal">
              I&apos;m actively looking for internships and opportunities to
              build impactful systems. Whether you have a question, a project
              idea, or just want to connect — my inbox is always open.
            </p>
            <div className="contact-links sp-reveal">
              <a href="mailto:jonathanjesni@gmail.com" className="contact-link" id="contact-email-btn">
                <MailIcon />
                Email
              </a>
              <a href="https://github.com/Jonathan-Jesni" target="_blank" rel="noopener noreferrer" className="contact-link" id="contact-github-btn">
                <GitHubIcon />
                GitHub
              </a>
              <a href="https://www.linkedin.com/in/jonathan-jesni-b0184a210/" target="_blank" rel="noopener noreferrer" className="contact-link" id="contact-linkedin-btn">
                <LinkedInIcon />
                LinkedIn
              </a>
              <a href="/assets/Jonathan_Resume.pdf" target="_blank" rel="noopener noreferrer" className="contact-link" id="contact-resume-btn">
                Resume ↗
              </a>
            </div>
          </div>
        </div>
      </SpatialSection>

      {/* ===== FOOTER ===== */}
      <footer className="footer" id="footer">
        <p>Designed & Built by Jonathan</p>
      </footer>
    </>
  );
}
