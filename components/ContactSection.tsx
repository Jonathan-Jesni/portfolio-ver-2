"use client";

import React, { useRef, useState } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { RollingHeadline } from "./ui/RollingHeadline";
import { HoverScrambleText } from "./ui/HoverScrambleText";
import { GitHubIcon, LinkedInIcon, MailIcon, DownloadIcon } from "./ui/icons";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
interface ContactSectionProps {
  /** Pass preloaderDone so RollingHeadline waits for entry animation */
  animate?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// ContactSection
//
// Architecture: Atmospheric Fade — Option B (yPercent: -100)
//   A solid OLED-black mask (#050505) sits over the content.
//   As the user scrolls down into the section, a GSAP ScrollTrigger
//   scrubs a timeline that translates the mask upward (yPercent: 0 → -100),
//   physically "lifting" the shroud off the content beneath it.
//   A secondary tween on the same timeline then fades + lifts the
//   button grid into place.
//
// Compositor-thread only: all GSAP animates only `transform` (yPercent, y)
// and `opacity` — no layout properties are touched during scroll scrub.
//
// Memory: The entire animation is scoped to a gsap.context that is
// automatically reverted on component unmount (via useGSAP cleanup).
// ─────────────────────────────────────────────────────────────────────────────
export default function ContactSection({ animate = true }: ContactSectionProps) {
  // Section container — the ScrollTrigger trigger root
  const sectionRef = useRef<HTMLElement>(null);

  // The OLED-black atmospheric shroud mask
  const maskRef = useRef<HTMLDivElement>(null);

  // The inner content area whose children will be lift-revealed
  const contentRef = useRef<HTMLDivElement>(null);

  // The button grid — sequentially revealed after the mask lifts
  const buttonsRef = useRef<HTMLDivElement>(null);

  // State to trigger the RollingHeadline animation ONLY when the shroud lifts
  const [headlineReady, setHeadlineReady] = useState(false);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const mask = maskRef.current;
      const buttons = buttonsRef.current;

      if (!section || !mask || !buttons) return;

      // ── Reduced-motion branch ─────────────────────────────────────────────
      // Honour prefers-reduced-motion: instantly reveal everything on scroll
      // entry, no transforms, no scrub.
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(mask, { display: "none" });
        gsap.set(buttons, { opacity: 1, y: 0 });

        ScrollTrigger.create({
          trigger: section,
          start: "top 80%",
          once: true,
          onEnter: () => {
            setHeadlineReady(true);
            gsap.to(buttons, {
              opacity: 1,
              y: 0,
              duration: 0.4,
              ease: "power1.out",
            });
          },
        });
      });

      // ── Full-motion branch ────────────────────────────────────────────────
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Initial state: mask is fully covering content, buttons are hidden
        gsap.set(mask, { yPercent: 0 });
        gsap.set(buttons, { opacity: 0, y: 30 });

        // Build the master timeline scrubbed by scroll
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: "top bottom-=200px",
            end: "bottom bottom",
            scrub: 1,
          },
        });

        // Phase 1 (progress 0 → 0.65): Atmospheric shroud lifts upward.
        // yPercent: 0 → -100 moves the mask completely off-screen above,
        // physically revealing the contact grid beneath it.
        tl.to(
          mask,
          {
            yPercent: -100,
            ease: "power2.inOut",
            duration: 0.65,
          },
          0
        );

        // Trigger the rolling headline when the sweep passes over the title
        tl.call(
          () => {
            const isForward = tl.scrollTrigger ? tl.scrollTrigger.direction === 1 : true;
            setHeadlineReady(isForward);
          },
          undefined,
          0.4
        );

        // Phase 2 (progress 0.45 → 1.0): Buttons float up and become visible.
        // Delayed so they start appearing after the mask has lifted halfway,
        // giving the tactile sensation that the content is "lifting away from
        // the shroud" into focus.
        tl.to(
          buttons,
          {
            opacity: 1,
            y: 0,
            ease: "power3.out",
            duration: 0.55,
          },
          0.45
        );
      });

      return () => mm.revert();
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      id="contact"
      className="contact-section"
      style={{
        position: "relative",
        minHeight: "100vh",
        backgroundColor: "#070B14",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* ── Content layer (sits beneath the mask) ─────────────────────────── */}
      <div
        ref={contentRef}
        className="container"
        style={{ position: "relative", zIndex: 1, width: "100%" }}
      >
        <div className="contact-inner">
          {/* Rolling Headline — scroll-triggered tumbler animation */}
          <RollingHeadline
            text="Get In Touch"
            className="contact-heading"
            animate={animate && headlineReady}
            manualTrigger={true}
          />

          {/* Sub-copy */}
          <p className="contact-text">
            I&apos;m actively looking for internships and opportunities to build
            impactful systems. Whether you have a question, a project idea, or
            just want to connect — my inbox is open.
          </p>

          {/* Button grid — sequentially revealed by the secondary GSAP tween */}
          <div
            ref={buttonsRef}
            className="contact-links"
            style={{
              // Ensure initial paint state matches GSAP set() — prevents flash
              opacity: 0,
              transform: "translateY(30px)",
              willChange: "transform, opacity",
            }}
          >
            <a
              href="mailto:jonathanjesni@gmail.com"
              className="contact-link"
              id="contact-email-btn"
            >
              <MailIcon />
              <HoverScrambleText text="Let's Work Together" />
            </a>

            <a
              href="#projects"
              className="contact-link"
              id="contact-projects-btn"
            >
              <GitHubIcon />
              <HoverScrambleText text="View Projects" />
            </a>

            <a
              href="https://www.linkedin.com/in/jonathan-jesni-b0184a210/"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-link"
              id="contact-linkedin-btn"
            >
              <LinkedInIcon />
              <HoverScrambleText text="Connect on LinkedIn" />
            </a>

            <a
              href="/assets/Jonathan_Resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-link"
              id="contact-resume-btn"
            >
              <DownloadIcon />
              <HoverScrambleText text="View Resume ↗" />
            </a>
          </div>
        </div>
      </div>

      {/* ── Atmospheric Shroud Mask ───────────────────────────────────────────
           Sits above the content at z-index 10.
           Matches the exact obsidian base (#070B14) so it blends seamlessly
           with the body background on arrival.
           GSAP translates this from yPercent: 0 → yPercent: -100
           (sliding off the top) as scroll advances.
      ─────────────────────────────────────────────────────────────────────── */}
      <div
        ref={maskRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 10,
          backgroundColor: "#070B14",
          willChange: "transform",
          // Extend the mask slightly beyond the section top so no gap
          // is visible when the yPercent tween begins translating it.
          top: "-2px",
          bottom: "-2px",
          borderBottom: "1px solid rgba(201, 168, 118, 0.3)",
          boxShadow: "0 20px 50px rgba(201, 168, 118, 0.08)",
        }}
      />
    </section>
  );
}
