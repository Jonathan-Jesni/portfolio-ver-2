"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import AboutSection from "../components/AboutSection";
import Footer from "../components/Footer";
import HeroSection from "../components/HeroSection";
import StickyDeckSection from "../components/StickyDeckSection";
import PipelineGrid from "../components/PipelineGrid";
import SpatialSection from "../components/SpatialSection";
import ContactSection from "../components/ContactSection";
import StackTransitions from "../components/StackTransitions";
import HeadlineReveal from "../components/HeadlineReveal";
import ScrollVelocitySkew from "../components/ScrollVelocitySkew";
import InViewMount from "../components/InViewMount";

import { BUILDING } from "../lib/data";
import gsap from "gsap";
import ScrollToPlugin from "gsap/ScrollToPlugin";
import ScrollTrigger from "gsap/ScrollTrigger";
import { HoverScrambleText } from "../components/ui/HoverScrambleText";
import { getLenis } from "../lib/lenisInstance";
import { power4InOut, absoluteTop } from "../lib/scrollTarget";
gsap.registerPlugin(ScrollToPlugin, ScrollTrigger);

/* Nav sections in document order (top → bottom of scroll). */
const NAV_ITEMS = [
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
] as const;

/* Land at the exact section top. The sections frame their own content (the
   Projects header is a full-screen vertically-centered title; Skills/Building
   are sticky with internal padding), so no extra nav clearance is needed — a
   positive offset just pushed the centered Projects title down too far. */
const NAV_OFFSET = 0;

const GravityPit = dynamic(() => import("../components/GravityPit"), { ssr: false });
const PreLoader = dynamic(() => import("../components/PreLoader"), { ssr: false });
const BurnTransition = dynamic(() => import("../components/BurnTransition"), { ssr: false });

export default function Home() {
  const [preloaderDone, setPreloaderDone] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>("");
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

  /* Contact is special-cased: it's revealed at the END of the burn (where its
     sticky still fills the viewport), i.e. footerTop − innerHeight. */
  const sectionTargetY = useCallback((id: string): number | null => {
    if (id === "contact") {
      const footer = document.getElementById("footer");
      if (footer) return absoluteTop(footer) - window.innerHeight;
      return document.documentElement.scrollHeight - window.innerHeight;
    }
    const el = document.getElementById(id);
    if (!el) return null;
    return Math.max(0, absoluteTop(el) - NAV_OFFSET);
  }, []);

  /* Route nav clicks through Lenis (the {J} logo's mechanism) so they inherit
     the site's eased momentum. force+lock keep the tween from being
     interrupted mid-flight — the About→Contact burn activating partway used to
     stall the scroll at the runway top (showing About instead of Contact). */
  const goToSection = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setIsMenuOpen(false);
    const y = sectionTargetY(id);
    if (y == null) return;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(y, { duration: 1.3, easing: power4InOut, force: true, lock: true });
    else window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  }, [sectionTargetY]);

  /* Scroll-spy — active link from canonical thresholds, so it stays correct
     through the pinned/sticky sections and flags Contact at the very bottom. */
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY + NAV_OFFSET + 1;
        let current = "";
        for (const item of NAV_ITEMS) {
          const t = sectionTargetY(item.id);
          if (t != null && y >= t) current = item.id;
        }
        if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) {
          current = "contact";
        }
        setActiveId(current);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [sectionTargetY]);

  return (
    <>
      <PreLoader onComplete={() => setPreloaderDone(true)} />

      <nav className="nav" id="navbar">
        <div className="nav-inner">
          <a href="#hero" className="nav-logo" id="nav-logo" onClick={(e) => {
            e.preventDefault();
            // Route through Lenis so Lenis emits scroll events → ScrollTrigger
            // stays in sync and crossfade callbacks (onLeaveBack etc.) fire
            // correctly on the way back to the top.
            const lenis = getLenis();
            if (lenis) lenis.scrollTo(0, { duration: 1.3, easing: power4InOut, force: true, lock: true });
            else gsap.to(window, { scrollTo: { y: 0 }, duration: 1.5, ease: 'power4.inOut' });
          }}>
            <span className="bracket">&#123;</span>J<span className="bracket">&#125;</span>
          </a>
          <ul className="nav-links">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className={activeId === item.id ? "is-active" : ""}
                  onClick={(e) => goToSection(e, item.id)}
                >
                  <HoverScrambleText text={item.label} />
                </a>
              </li>
            ))}
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
        {NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={activeId === item.id ? "is-active" : ""}
            onClick={(e) => goToSection(e, item.id)}
          >
            {item.label}
          </a>
        ))}
        <a href="/assets/Jonathan_Resume.pdf" target="_blank" rel="noopener noreferrer" onClick={closeMobileMenu}>Resume ↗</a>
      </div>

      <HeroSection animate={preloaderDone} portfolioSectionRef={portfolioSectionRef} />

      {/* ── Linen stack: every section below the hero is a sheet in the
             Editorial Financial deck. StackTransitions choreographs the
             scrub-tied boundary transitions (pinned slide-overs, the CRT
             collapse, and the About → Contact WebGL burn). ── */}

      <div className="stack-section" data-stack style={{ zIndex: 1 }}>
        <StickyDeckSection portfolioSectionRef={portfolioSectionRef} />
        <div className="stack-veil" aria-hidden="true" />
      </div>

      <div className="stack-section stack-section--building" data-stack style={{ zIndex: 2 }}>
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

      <div className="stack-section stack-section--skills" data-stack style={{ zIndex: 3 }}>
        {/* anchorPercent=40: Skills' 360vh runway + About's -100vh overlap
            margin means About starts entering the viewport at 44.4% down
            the runway ((360-100-100)/360) — 40% keeps the nav landing point
            (and scroll-spy "active" threshold) safely before that, per
            SpatialSection's anchorPercent doc. */}
        <SpatialSection id="skills" className="skills-spatial" anchorPercent={40}>
          <div className="container">
            <header className="ed-header" style={{ marginBottom: "20px" }}>
              <div className="ed-header-row sp-reveal">
                <span className="ed-eyebrow">03 / Skills</span>
                <span className="ed-meta mono">drag to interact</span>
              </div>
              <h2 className="ed-heading ed-heading--md sp-reveal">
                The <em>stack</em>
              </h2>
            </header>
            <p className="sp-reveal" style={{ color: "var(--ink-2)", marginBottom: "20px", fontFamily: "var(--font-jakarta)", fontSize: "15px", letterSpacing: "-0.01em" }}>
              Technologies and frameworks I use to engineer robust, scalable systems.
            </p>
            <InViewMount minHeight={420}>
              <GravityPit />
            </InViewMount>
          </div>
        </SpatialSection>
        <div className="stack-veil" aria-hidden="true" />
      </div>

      {/* About sits ABOVE Contact (z6 vs z5): during the burn overlap the
          fire + clip wipe eat About away to reveal Contact beneath it.
          Its surface paint lives on .about-sticky (wrapper is transparent)
          so only the viewport-locked sticky occludes Contact, never the
          full-height runway box. */}
      <div className="stack-section stack-section--about" data-stack style={{ zIndex: 6 }}>
        <AboutSection />
        <div className="stack-veil" aria-hidden="true" />
      </div>

      {/* Contact runway — a 200vh scroll track whose inner content is
          position:sticky (desktop only), holding Contact dead-still at
          top:0 for the 100vh the burn scrubs across. Sticky instead of a
          ScrollTrigger pin: a pin engaging under Lenis momentum at the
          page bottom hard-freezes the tab; sticky is pure CSS and can't. */}
      <div className="stack-section contact-runway" data-stack style={{ zIndex: 5 }}>
        <div className="contact-sticky">
          <ContactSection animate={preloaderDone} />
        </div>
        <div className="stack-veil" aria-hidden="true" />
      </div>

      <Footer />

      <BurnTransition />
      <StackTransitions />
      <HeadlineReveal />
      <ScrollVelocitySkew />
    </>
  );
}
