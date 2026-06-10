"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import AboutSection from "../components/AboutSection";
import HeroSection from "../components/HeroSection";
import StickyDeckSection from "../components/StickyDeckSection";
import PipelineGrid from "../components/PipelineGrid";
import SpatialSection from "../components/SpatialSection";
import ContactSection from "../components/ContactSection";
import StackTransitions from "../components/StackTransitions";

import { BUILDING } from "../lib/data";
import gsap from "gsap";
import ScrollToPlugin from "gsap/ScrollToPlugin";
import ScrollTrigger from "gsap/ScrollTrigger";
import { HoverScrambleText } from "../components/ui/HoverScrambleText";
gsap.registerPlugin(ScrollToPlugin, ScrollTrigger);

const GravityPit = dynamic(() => import("../components/GravityPit"), { ssr: false });
const PreLoader = dynamic(() => import("../components/PreLoader"), { ssr: false });

export default function Home() {
  const [preloaderDone, setPreloaderDone] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const portfolioSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (preloaderDone) {
      // Refresh ScrollTrigger calculations after preloader finishes and layout settles
      ScrollTrigger.refresh();
    }
  }, [preloaderDone]);

  function closeMobileMenu() {
    setIsMenuOpen(false);
  }

  return (
    <>
      <PreLoader onComplete={() => setPreloaderDone(true)} />

      <nav className="nav" id="navbar">
        <div className="nav-inner">
          <a href="#hero" className="nav-logo" id="nav-logo" onClick={(e) => {
            e.preventDefault();
            gsap.to(window, { scrollTo: { y: 0 }, duration: 1.5, ease: 'power4.inOut' });
          }}>
            <span className="bracket">&#123;</span>J<span className="bracket">&#125;</span>
          </a>
          <ul className="nav-links">
            <li><a href="#projects"><HoverScrambleText text="Projects" /></a></li>
            <li><a href="#skills"><HoverScrambleText text="Skills" /></a></li>
            <li><a href="#about"><HoverScrambleText text="About" /></a></li>
            <li><a href="#contact"><HoverScrambleText text="Contact" /></a></li>
          </ul>
          <a
            href="/assets/Jonathan_Resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-resume"
            id="nav-resume-btn"
          >
            <HoverScrambleText text="Resume" />
            <span className="nav-resume-arrow" aria-hidden="true">↗</span>
          </a>
          <button
            className="mobile-toggle"
            id="mobile-toggle"
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <span></span>
            <span></span>
          </button>
        </div>

      </nav>

      <div className={`mobile-menu${isMenuOpen ? " open" : ""}`} id="mobile-menu">
        <a href="#projects" onClick={closeMobileMenu}>Projects</a>
        <a href="#skills" onClick={closeMobileMenu}>Skills</a>
        <a href="#about" onClick={closeMobileMenu}>About</a>
        <a href="#contact" onClick={closeMobileMenu}>Contact</a>
        <a href="/assets/Jonathan_Resume.pdf" target="_blank" rel="noopener noreferrer" onClick={closeMobileMenu}>Resume ↗</a>
      </div>

      <HeroSection animate={preloaderDone} portfolioSectionRef={portfolioSectionRef} />

      {/* ── Linen stack: every section below the hero is a sheet in the
             Editorial Financial deck. StackTransitions pins each sheet
             and choreographs the scrub-tied boundary transitions. ── */}

      <div className="stack-section" data-stack style={{ zIndex: 1 }}>
        <StickyDeckSection portfolioSectionRef={portfolioSectionRef} />
        <div className="stack-veil" aria-hidden="true" />
      </div>

      <div className="stack-section" data-stack style={{ zIndex: 2 }}>
        <SpatialSection id="currently-building">
          <div className="container">
            <header className="ed-header" style={{ marginBottom: "56px" }}>
              <div className="ed-header-row sp-reveal">
                <span className="ed-eyebrow">02 / In Progress</span>
                <span className="ed-meta mono">live pipelines</span>
              </div>
              <h2 className="ed-heading ed-heading--md sp-reveal">
                Currently <em>building</em>
              </h2>
            </header>

            <PipelineGrid items={BUILDING} />
          </div>
        </SpatialSection>
        <div className="stack-veil" aria-hidden="true" />
      </div>

      <div className="stack-section" data-stack style={{ zIndex: 3 }}>
        <SpatialSection id="skills" className="skills-spatial">
          <div className="container">
            <header className="ed-header" style={{ marginBottom: "20px" }}>
              <div className="ed-header-row sp-reveal">
                <span className="ed-eyebrow">03 / Capabilities</span>
                <span className="ed-meta mono">drag to interact</span>
              </div>
              <h2 className="ed-heading ed-heading--md sp-reveal">
                The <em>stack</em>
              </h2>
            </header>
            <p className="sp-reveal" style={{ color: "var(--ink-2)", marginBottom: "20px", fontFamily: "var(--font-jakarta)", fontSize: "15px", letterSpacing: "-0.01em" }}>
              Technologies and frameworks I use to engineer robust, scalable systems.
            </p>
            <div style={{ touchAction: "none" }}>
              <GravityPit />
            </div>
          </div>
        </SpatialSection>
        <div className="stack-veil" aria-hidden="true" />
      </div>

      <div className="stack-section" data-stack style={{ zIndex: 4 }}>
        <AboutSection />
        <div className="stack-veil" aria-hidden="true" />
      </div>

      <div className="stack-section" data-stack style={{ zIndex: 5 }}>
        <ContactSection animate={preloaderDone} />

        <footer className="footer" id="footer">
          <p>Designed & Built by Jonathan</p>
        </footer>
        <div className="stack-veil" aria-hidden="true" />
      </div>

      <StackTransitions />
    </>
  );
}
