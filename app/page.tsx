"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import AboutSection from "../components/AboutSection";
import HeroSection from "../components/HeroSection";
import StickyDeckSection from "../components/StickyDeckSection";
import PipelineGrid from "../components/PipelineGrid";
import SpatialSection from "../components/SpatialSection";
import { GitHubIcon, LinkedInIcon, MailIcon } from "../components/ui/icons";
import { BUILDING } from "../lib/data";
import gsap from "gsap";
import ScrollToPlugin from "gsap/ScrollToPlugin";
import ScrollTrigger from "gsap/ScrollTrigger";
import { RollingHeadline } from "../components/ui/RollingHeadline";

gsap.registerPlugin(ScrollToPlugin, ScrollTrigger);

const GravityPit = dynamic(() => import("../components/GravityPit"), { ssr: false });
const PreLoader = dynamic(() => import("../components/PreLoader"), { ssr: false });

export default function Home() {
  const [preloaderDone, setPreloaderDone] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
            <li><a href="#projects">Projects</a></li>
            <li><a href="#skills">Skills</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
          <a
            href="/assets/Jonathan_Resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-resume"
            id="nav-resume-btn"
          >
            Resume
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

      <HeroSection animate={preloaderDone} />

      <hr className="section-divider" />

      <StickyDeckSection />

      <hr className="section-divider" />

      <SpatialSection id="currently-building">
        <div className="container">
          <div className="section-label">
            <span className="section-title sp-reveal mono">currently.building</span>
            <span className="section-line"></span>
          </div>

          <PipelineGrid items={BUILDING} />
        </div>
      </SpatialSection>

      <hr className="section-divider" />

      <SpatialSection id="skills">
        <div className="container">
          <div className="section-label">
            <span className="section-title sp-reveal">Skills</span>
            <span className="section-line"></span>
          </div>
          <p className="sp-reveal" style={{ color: "var(--ink-2)", marginBottom: "32px", fontFamily: "var(--font-jakarta)", fontSize: "15px", letterSpacing: "-0.01em" }}>
            Technologies and frameworks I use to engineer robust, scalable systems.
          </p>
          <p className="sp-reveal mono" style={{ color: "var(--ink-3)", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "24px" }}>
            {"// drag to interact"}
          </p>
          <div style={{ touchAction: "none" }}>
            <GravityPit />
          </div>
        </div>
      </SpatialSection>

      <hr className="section-divider" />

      <AboutSection />

      <hr className="section-divider" />

      <SpatialSection id="contact">
        <div className="container">
          <div className="contact-inner">
            <RollingHeadline text="Get In Touch" className="contact-heading sp-reveal" animate={preloaderDone} />
            <p className="contact-text sp-reveal">
              I&apos;m actively looking for internships and opportunities to build impactful systems.
              Whether you have a question, a project idea, or just want to connect — my inbox is open.
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

      <footer className="footer" id="footer">
        <p>Designed & Built by Jonathan</p>
      </footer>
    </>
  );
}
