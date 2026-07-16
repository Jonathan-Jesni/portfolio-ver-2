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
//   · Mobile full-motion — a finite opacity/translate entrance.
//   · Reduced motion — everything appears instantly.
export default function ContactSection({ animate = true }: ContactSectionProps) {
  // Section container — the ScrollTrigger trigger root
  const sectionRef = useRef<HTMLElement>(null);

  // Retained failure-contract surface; hidden in every current mode.
  const maskRef = useRef<HTMLDivElement>(null);

  // The button grid — animated by the mobile fade; static on desktop
  const buttonsRef = useRef<HTMLDivElement>(null);

  // State gates RollingHeadline until the active entrance reaches the heading.
  const [headlineReady, setHeadlineReady] = useState(false);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const mask = maskRef.current;
      const buttons = buttonsRef.current;

      if (!section || !mask || !buttons) return;
      const links = Array.from(
        buttons.querySelectorAll<HTMLElement>(".contact-link"),
      );
      const mm = gsap.matchMedia();

      try {
        // Reduced motion keeps the complete chapter and burn palette without
        // a sweeping mask or displacement.
        mm.add("(prefers-reduced-motion: reduce)", () => {
          gsap.set(mask, { display: "none", clearProps: "transform,willChange" });
          gsap.set([buttons, ...links], {
            opacity: 1,
            y: 0,
            filter: "none",
            clearProps: "willChange",
          });
          setHeadlineReady(true);
        });

      // Desktop: the burn IS the entrance. Contact sits fully formed beneath
      // the burning About sheet, so clearProps strips the JSX pre-paint state
      // (opacity 0 / translateY) and the ember front uncovers finished UI.
      // Only RollingHeadline keeps a cue, fired by the burn's midpoint signal.
        mm.add(IMMERSIVE_SCROLL_MEDIA_QUERY, () => {
          gsap.set(mask, { display: "none", clearProps: "transform,willChange" });
          gsap.set([buttons, ...links], {
            clearProps: "opacity,transform,filter,willChange",
          });

          const unsub = burnControls.onHeadline((forward) => setHeadlineReady(forward));
          return () => unsub();
        });

      // Mobile: a lightweight, finite content fade. StackTransitions owns the
      // single About → Contact section cross-fade at this boundary.
        mm.add(
          TOUCH_MEDIA_QUERY,
          () => {
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
              return;
            }
            gsap.set(mask, {
              display: "none",
              clearProps: "transform,willChange",
            });
            gsap.set([buttons, ...links], {
              opacity: 0,
              y: 12,
              filter: "blur(3px)",
              willChange: "opacity,transform",
            });

            const tl = gsap.timeline({
              paused: true,
              onComplete: () => {
                gsap.set([buttons, ...links], { clearProps: "willChange" });
              },
              onReverseComplete: () => {
                setHeadlineReady(false);
                gsap.set([buttons, ...links], {
                  willChange: "opacity,transform",
                });
              },
            });

            tl.to(
              [buttons, ...links],
              {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                duration: 0.42,
                stagger: 0.05,
                ease: "power3.out",
              },
              0.08,
            );

            tl.call(() => setHeadlineReady(true), undefined, 0.12);

            const trigger = ScrollTrigger.create({
              trigger: section,
              start: "top 82%",
              end: "bottom 18%",
              onEnter: () => tl.play(),
              onLeave: () => tl.progress(1).pause(),
              onEnterBack: () => tl.play(),
              onLeaveBack: () => tl.reverse(),
            });

            return () => {
              trigger.kill();
              tl.kill();
              gsap.set(mask, {
                display: "none",
                clearProps: "transform,willChange",
              });
              gsap.set([buttons, ...links], {
                opacity: 1,
                y: 0,
                filter: "none",
                clearProps: "willChange",
              });
            };
          },
        );
      } catch {
        gsap.set(mask, { display: "none", clearProps: "transform,willChange" });
        gsap.set([buttons, ...links], {
          opacity: 1,
          y: 0,
          filter: "none",
          clearProps: "willChange",
        });
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
      {/* ── Contact content layer ─────────────────────────────────────────── */}
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
              transform: "translateY(12px)",
              filter: "blur(3px)",
              willChange: "opacity, transform",
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

      {/* Retained failure-contract surface; every current mode keeps it hidden. */}
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
