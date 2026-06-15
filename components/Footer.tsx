"use client";

import { useState, useEffect } from "react";
import gsap from "gsap";
import ScrollToPlugin from "gsap/ScrollToPlugin";
import { HoverScrambleText } from "./ui/HoverScrambleText";

gsap.registerPlugin(ScrollToPlugin);

/* ─────────────────────────────────────────────────────────────────────
   Footer — a quiet, classy sign-off, not a marketing block.

   Three balanced zones on a 1fr/auto/1fr grid (the {J} logo doubles as
   back-to-top, the status line is dead-centered, the stack credit sits
   right), over a sub-row aligned to the same edges (© + a timezone-
   derived visitor clock). Surface is a touch darker than --surface-0 so
   it reads as the floor of the page.
   ───────────────────────────────────────────────────────────────────── */
export default function Footer() {
  // Visitor's city + local time, derived from their timezone (no geolocation
  // prompt, no network). Rendered only after mount to dodge a hydration
  // mismatch (server and client clocks differ).
  const [clock, setClock] = useState<string | null>(null);

  useEffect(() => {
    const compute = () => {
      try {
        const now = new Date();
        const time = new Intl.DateTimeFormat([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(now);
        // getTimezoneOffset() is sign-flipped (UTC+5:30 → -330); flip it back.
        const offsetMin = -now.getTimezoneOffset();
        const sign = offsetMin >= 0 ? "+" : "-";
        const abs = Math.abs(offsetMin);
        const h = Math.floor(abs / 60);
        const m = abs % 60;
        return `UTC${sign}${h}:${String(m).padStart(2, "0")} — ${time}`;
      } catch {
        return "Bengaluru — IST";
      }
    };

    // Defer the first tick (avoids a synchronous setState in the effect body)
    const raf = requestAnimationFrame(() => setClock(compute()));
    const id = setInterval(() => setClock(compute()), 30_000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, []);

  // Reuse the {J} nav logo's scroll-to-top feel.
  const backToTop = () => {
    gsap.to(window, { scrollTo: { y: 0 }, duration: 1.5, ease: "power4.inOut" });
  };

  return (
    <footer className="site-footer" id="footer">
      <div className="footer-row">
        <button type="button" className="footer-logo" onClick={backToTop} aria-label="Back to top">
          <span className="bracket">&#123;</span>J<span className="bracket">&#125;</span>
        </button>

        <span className="footer-status">
          <span className="footer-dot" aria-hidden="true" />
          available for internships · summer 2026
        </span>

        <span className="footer-stack">
          <HoverScrambleText text="Next.js · Three.js · GSAP · R3F" />
        </span>
      </div>

      <div className="footer-sub">
        <span>© 2026 Jonathan Jesni</span>
        <span>{clock ?? "··:··"}</span>
      </div>
    </footer>
  );
}
