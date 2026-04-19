"use client";

import { useEffect, useRef } from "react";

const sections = [
  {
    tag: "SYSTEM://INITIALIZE",
    heading: "Neural\nData Stream",
    body: "Fly through 10,000 reactive particles. Move your mouse to shatter the field. Scroll to travel deeper.",
  },
  {
    tag: "MODULE://ABOUT",
    heading: "Built for\nthe Edge",
    body: "High-performance WebGL shaders running fluid dynamics at 60fps. Every particle responds to your presence in real time.",
  },
  {
    tag: "MODULE://TECHNOLOGY",
    heading: "GLSL\nCompute",
    body: "Custom vertex and fragment shaders with 3D simplex noise, mouse-driven repulsion fields, and vortex swirl dynamics — all on the GPU.",
  },
  {
    tag: "MODULE://EXPERIENCE",
    heading: "Scroll\nHijacked",
    body: "Lenis smooth scrolling synced to GSAP ScrollTrigger drives the camera through the particle tunnel. Pure, unbroken immersion.",
  },
  {
    tag: "SYSTEM://TERMINATE",
    heading: "End of\nTransmission",
    body: "You've reached the end of the data stream. The particles will remember your trajectory.",
  },
];

export default function Home() {
  const sectionRefs = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -50px 0px" }
    );

    sectionRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <main>
      {sections.map((section, i) => (
        <section key={i} className="section">
          <div
            className="section__inner fade-up"
            ref={(el) => (sectionRefs.current[i] = el)}
          >
            <p className="heading-sm">{section.tag}</p>
            <hr className="divider" />
            <h2
              className="heading-xl gap-sm"
              style={{ whiteSpace: "pre-line" }}
            >
              {section.heading}
            </h2>
            <p className="body-text gap-md">{section.body}</p>
          </div>
        </section>
      ))}
    </main>
  );
}
