"use client";

import React, { useRef, useState } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { RollingHeadline } from "./ui/RollingHeadline";
import { HoverScrambleText } from "./ui/HoverScrambleText";
import { GitHubIcon, LinkedInIcon, MailIcon, DownloadIcon } from "./ui/icons";
import { burnControls } from "../lib/burnControls";
import {
  IMMERSIVE_SCROLL_MEDIA_QUERY,
  TOUCH_MEDIA_QUERY,
} from "../lib/mediaQueries";

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface ContactSectionProps {
  /** Pass preloaderDone so RollingHeadline waits for entry animation */
  animate?: boolean;
}

// Three reveal modes, selected by gsap.matchMedia:
//   · Desktop full-motion — burn-driven static reveal (see branch below).
//   · Mobile full-motion — surface-matched mask lift, then button grid floats in.
//   · Reduced motion — everything appears instantly on scroll entry.
export default function ContactSection({ animate = true }: ContactSectionProps) {
  // Section container — the ScrollTrigger trigger root
  const sectionRef = useRef<HTMLElement>(null);

  // The surface-matched atmospheric mask (mobile lift reveal only)
  const maskRef = useRef<HTMLDivElement>(null);

  // The button grid — animated by the mobile lift; static on desktop
  const buttonsRef = useRef<HTMLDivElement>(null);

  // State to trigger the RollingHeadline animation ONLY when the shroud lifts
  const [headlineReady, setHeadlineReady] = useState(false);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const mask = maskRef.current;
      const buttons = buttonsRef.current;

      if (!section || !mask || !buttons) return;
      const mm = gsap.matchMedia();

      try {
        // Reduced motion keeps the complete chapter and burn palette without
        // a sweeping mask or displacement.
        mm.add("(prefers-reduced-motion: reduce)", () => {
          gsap.set(mask, { display: "none", clearProps: "transform,willChange" });
          gsap.set(buttons, { opacity: 1, y: 0, clearProps: "willChange" });
          setHeadlineReady(true);
        });

      // Desktop: the burn IS the entrance. Contact sits fully formed beneath
      // the burning About sheet, so clearProps strips the JSX pre-paint state
      // (opacity 0 / translateY) and the ember front uncovers finished UI.
      // Only RollingHeadline keeps a cue, fired by the burn's midpoint signal.
        mm.add(IMMERSIVE_SCROLL_MEDIA_QUERY, () => {
          gsap.set(mask, { display: "none", clearProps: "transform,willChange" });
          gsap.set(buttons, { clearProps: "opacity,transform,willChange" });

          const unsub = burnControls.onHeadline((forward) => setHeadlineReady(forward));
          return () => unsub();
        });

      // ── Mobile full-motion branch — atmospheric lift (unchanged) ──────────
      // No pinning/burn on mobile, so keep the original shroud-lift reveal.
        mm.add(
          TOUCH_MEDIA_QUERY,
          () => {
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
              return;
            }
            gsap.set(mask, {
              display: "block",
              yPercent: 0,
              willChange: "transform",
            });
            gsap.set(buttons, { opacity: 0, y: 24 });

            const tl = gsap.timeline({
              paused: true,
              onComplete: () => {
                gsap.set(mask, { clearProps: "willChange" });
              },
              onReverseComplete: () => {
                setHeadlineReady(false);
                gsap.set(mask, { willChange: "transform" });
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
                duration: 1,
              },
              0,
            );

        // Trigger the rolling headline when the sweep passes over the title
            tl.call(() => setHeadlineReady(true), undefined, 0.38);

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
              0.32,
            );

            const trigger = ScrollTrigger.create({
              trigger: section,
              start: "top 82%",
              end: "bottom 18%",
              onEnter: () => tl.play(),
              onLeave: () => tl.progress(1).pause(),
              onEnterBack: () => tl.progress(1).pause(),
              onLeaveBack: () => tl.reverse(),
            });

            return () => {
              trigger.kill();
              tl.kill();
              gsap.set(mask, {
                display: "none",
                clearProps: "transform,willChange",
              });
              gsap.set(buttons, {
                opacity: 1,
                y: 0,
                clearProps: "willChange",
              });
            };
          },
        );
      } catch {
        gsap.set(mask, { display: "none", clearProps: "transform,willChange" });
        gsap.set(buttons, { opacity: 1, y: 0, clearProps: "willChange" });
        setHeadlineReady(true);
        window.dispatchEvent(new CustomEvent("portfolio:motion-failed"));
      }

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
        backgroundColor: "var(--surface-0)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* ── Content layer (sits beneath the mobile mask) ──────────────────── */}
      <div
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
            just want to connect, my inbox is open.
          </p>

          {/* Button grid — sequentially revealed by the secondary GSAP tween */}
          <div
            ref={buttonsRef}
            className="contact-links"
            style={{
              // Ensure initial paint state matches GSAP set() — prevents flash
              opacity: 0,
              transform: "none",
              willChange: "auto",
            }}
          >
            <a
              href="mailto:jonathan.jesni.m@gmail.com"
              className="contact-link"
              id="contact-email-btn"
            >
              <MailIcon />
              <HoverScrambleText text="Let's Work Together" />
            </a>

            <a
              href="https://github.com/Jonathan-Jesni?tab=repositories"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-link"
              id="contact-projects-btn"
            >
              <GitHubIcon />
              <HoverScrambleText text="View Projects" />
            </a>

            <a
              href="https://www.linkedin.com/in/jonathan-jesni/"
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
           Matches the exact linen base (#FAFFFA) so it blends seamlessly
           with the body background on arrival.
           GSAP translates this from yPercent: 0 → yPercent: -100
           (sliding off the top) as scroll advances.
      ─────────────────────────────────────────────────────────────────────── */}
      <div
        ref={maskRef}
        className="contact-mask"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 10,
          backgroundColor: "var(--surface-0)",
          top: "-2px",
          bottom: "-2px",
          display: "none",
          borderBottom: "1px solid var(--border-subtle)",
          boxShadow: "0 20px 50px rgba(13, 11, 9, 0.5)",
        }}
      />
    </section>
  );
}
