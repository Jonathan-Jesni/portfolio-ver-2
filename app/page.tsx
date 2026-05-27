"use client";

import { useEffect, useRef } from "react";
import SpatialCard from "../components/SpatialCard";

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

type Project = (typeof PROJECTS)[number];

const BUILDING = [
  {
    id: "building-converter-v2",
    status: "In Progress",
    title: "Document Processing Suite",
    description:
      "Expanding the File Converter into a full document processing system with multi-format conversion, document compression, and extended format support.",
    tags: ["Python", "Document Processing", "Pipeline"],
  },
  {
    id: "building-exploration",
    status: "Exploring",
    title: "New Projects",
    description:
      "Researching next areas — interested in LLM tooling, automated security auditing, and distributed systems.",
    tags: ["LLMs", "Security", "Research"],
  },
];

const SKILLS = [
  {
    category: "Languages",
    status: "CORE",
    items: [
      { name: "Python", tag: "core" },
      { name: "Java", tag: "oop" },
      { name: "C / C++", tag: "systems" },
      { name: "Dart", tag: "ui" },
      { name: "Flask", tag: "api" },
      { name: "Flutter", tag: "mobile" },
    ],
  },
  {
    category: "Libraries & Tools",
    status: "LOADED",
    items: [
      { name: "PyTorch", tag: "training" },
      { name: "TensorFlow", tag: "models" },
      { name: "OpenCV", tag: "vision" },
      { name: "NumPy", tag: "compute" },
      { name: "Pandas", tag: "data" },
    ],
  },
  {
    category: "AI / Machine Learning",
    status: "ACTIVE",
    items: [
      { name: "Machine Learning", tag: "pipelines" },
      { name: "Deep Learning", tag: "cnn" },
      { name: "Computer Vision", tag: "analysis" },
      { name: "Recommender Systems", tag: "matching" },
      { name: "YOLO", tag: "real-time" },
    ],
  },
  {
    category: "Cybersecurity",
    status: "SECURE",
    items: [
      { name: "Threat Detection", tag: "real-time" },
      { name: "Phishing Analysis", tag: "nlp/cv" },
      { name: "Network Security", tag: "monitoring" },
    ],
  },
  {
    category: "Graphics / Simulation",
    status: "RENDER",
    items: [
      { name: "Blender", tag: "bpy" },
      { name: "Synthetic Data", tag: "generation" },
    ],
  },
  {
    category: "Systems Engineering",
    status: "ONLINE",
    items: [
      { name: "System Architecture", tag: "design" },
      { name: "Pipeline Design", tag: "etl" },
      { name: "Performance Optimization", tag: "optimization" },
      { name: "GPU Computing", tag: "cuda" },
    ],
  },
];

/* ============================================================
   SVG ICONS
   ============================================================ */

function GitHubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function LinkedInIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function MailIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function ArrowUpRightIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

/* ============================================================
   COMPONENT
   ============================================================ */

export default function Home() {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Intersection Observer for fade-in animations
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    document.querySelectorAll(".fade-in").forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

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
      <section className="hero" id="hero">
        <div className="container">
          <p className="hero-greeting fade-in">Hi, my name is</p>
          <h1 className="hero-name fade-in fade-in-delay-1">
            Jonathan<span className="accent">.</span>
          </h1>
          <p className="hero-building mono fade-in fade-in-delay-2" style={{ color: "var(--gray-500)", fontSize: "14px", marginBottom: "24px" }}>
            &gt; currently.building: smarter tools for real-world problems
          </p>
          <h2 className="hero-tagline fade-in fade-in-delay-3">
            I build AI-powered tools and systems
            <br />
            that solve real-world problems.
          </h2>
          <p className="hero-sub fade-in fade-in-delay-4">
            Computer Science student focused on AI, cybersecurity, and scalable
            systems.
          </p>
          <p className="hero-impact mono fade-in fade-in-delay-5" style={{ color: "var(--gray-400)", fontSize: "14px", marginBottom: "48px", maxWidth: "600px" }}>
            Built and deployed 4 real-world systems across AI, cybersecurity, and large-scale data processing.
          </p>
          <div className="hero-buttons fade-in fade-in-delay-6">
            <a
              href="https://github.com/Jonathan-Jesni"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              id="hero-github-btn"
            >
              <GitHubIcon size={18} />
              View My Work
            </a>
            <a
              href="/assets/Jonathan_Resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
              id="hero-resume-btn"
            >
              View Resume ↗
            </a>
          </div>
        </div>
      </section>

      <hr className="section-divider" />

      {/* ===== PROJECTS ===== */}
      <section className="projects" id="projects">
        <div className="container">
          <div className="section-label fade-in">
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

          <div className="projects-cta fade-in">
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
      <section className="about" id="about">
        <div className="container">
          <div className="section-label fade-in">
            <span className="section-number">02</span>
            <span className="section-title">&gt; about.me</span>
            <span className="section-line"></span>
          </div>

          <div className="about-content fade-in">
            <div className="about-text">
              <p>
                I&apos;m a 3rd-year Computer Science student at IIIT Pune who builds
                real tools — not just coursework. My focus areas are{" "}
                <strong>AI</strong>, <strong>cybersecurity</strong>, and{" "}
                <strong>systems design</strong>, and I gravitate toward projects
                that solve practical, tangible problems.
              </p>
              <p>
                Whether it&apos;s building a multimodal phishing detector as a browser
                extension, generating synthetic training data in Blender, or
                engineering a deterministic document converter — I focus on
                software that <strong>works in the real world</strong>.
              </p>
              <p>
                I&apos;m always working on something new. Currently leveling up and
                looking for opportunities to build at scale.
              </p>
            </div>

            <div className="about-snippet" id="about-code-snippet">
              <div className="snippet-header">
                <span className="snippet-dot"></span>
                <span className="snippet-dot"></span>
                <span className="snippet-dot"></span>
                <span className="snippet-filename">developer.js</span>
              </div>
              <pre className="snippet-body">{
`const developer = {
  current: "B.Tech CSE, IIIT Pune",
  year: "3rd Year",
  location: "Pune, India / Muscat, Oman",
  focus: ["AI", "Systems", "Security"],
  status: "open to internships"
};`
              }</pre>
            </div>
          </div>
        </div>
      </section>

      <hr className="section-divider" />

      {/* ===== CURRENTLY BUILDING ===== */}
      <section className="building" id="currently-building">
        <div className="container">
          <div className="section-label fade-in">
            <span className="section-number">03</span>
            <span className="section-title">&gt; currently.building</span>
            <span className="section-line"></span>
          </div>

          <div className="building-grid">
            {BUILDING.map((item, i) => (
              <div
                key={item.id}
                className={`building-card fade-in fade-in-delay-${i + 1}`}
                id={item.id}
              >
                <div className="building-status">
                  <span className="status-dot"></span>
                  <span className="mono">{item.status}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className="project-tags">
                  {item.tags.map((tag) => (
                    <span key={tag} className="project-tag">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="section-divider" />

      {/* ===== SKILLS ===== */}
      <section className="skills" id="skills">
        <div className="container">
          <div className="section-label fade-in">
            <span className="section-number">04</span>
            <span className="section-title">Skills</span>
            <span className="section-line"></span>
          </div>

          <div className="skills-grid">
            {SKILLS.map((group, i) => (
              <div
                key={group.category}
                className={`fade-in fade-in-delay-${Math.min(i + 1, 6)}`}
              >
                <h3 className="skill-category-title">
                  <span className="skill-status">[ {group.status} ]</span>
                  {group.category}
                </h3>
                <ul className="skill-list">
                  {group.items.map((skill) => (
                    <li key={skill.name} className="skill-item">
                      <span className="skill-name">{skill.name}</span>
                      <span className="skill-tag">({skill.tag})</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="section-divider" />

      {/* ===== CONTACT ===== */}
      <section className="contact" id="contact">
        <div className="container">
          <div className="contact-inner fade-in">
            <span className="section-number">05 — What&apos;s Next?</span>
            <h2 className="contact-heading">Get In Touch</h2>
            <p className="contact-text">
              I&apos;m actively looking for internships and opportunities to
              build impactful systems. Whether you have a question, a project
              idea, or just want to connect — my inbox is always open.
            </p>
            <div className="contact-links">
              <a
                href="mailto:jonathanjesni@gmail.com"
                className="contact-link"
                id="contact-email-btn"
              >
                <MailIcon />
                Email
              </a>
              <a
                href="https://github.com/Jonathan-Jesni"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-link"
                id="contact-github-btn"
              >
                <GitHubIcon />
                GitHub
              </a>
              <a
                href="https://www.linkedin.com/in/jonathan-jesni-b0184a210/"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-link"
                id="contact-linkedin-btn"
              >
                <LinkedInIcon />
                LinkedIn
              </a>
              <a
                href="/assets/Jonathan_Resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-link"
                id="contact-resume-btn"
              >
                Resume ↗
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="footer" id="footer">
        <p>Designed & Built by Jonathan</p>
      </footer>
    </>
  );
}
