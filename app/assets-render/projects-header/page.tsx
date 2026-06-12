import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects Header — Texture Render",
  robots: { index: false, follow: false },
};

/* ================================================================
   ISOLATED TEXTURE-CAPTURE ROUTE — /assets-render/projects-header

   Renders ONLY the "01 / Projects | Selected Work" header from
   StickyDeckSection, pixel-matched to the live section, for
   screenshotting as the laptop's WebGL screen texture (bg.jpg).

   Capture at 16:10 (the GLB screen face aspect), e.g.:
   chrome --headless=new --window-size=1440,900
          --force-device-scale-factor=2 --hide-scrollbars
          --screenshot=out.png http://localhost:3000/assets-render/projects-header

   This route inherits the root layout (font CSS variables, grain
   overlay, SmoothScroll), so the header sits inside a fixed,
   full-viewport obsidian (#070B14 = --surface-0) panel at
   z-index 9999 that covers any inherited chrome. The font
   variables (Instrument Serif / JetBrains Mono / Jakarta) still
   cascade in — that's required for the type to match.

   Perfectly static: the scroll cue is rendered at its resting
   position with its float animation disabled.
   ================================================================ */
export default function ProjectsHeaderRender() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#070B14",
        overflow: "hidden",
      }}
    >
      {/* Same structure + classes as the live header
          (components/StickyDeckSection.tsx) so globals.css drives
          identical framing: min-height 100dvh, flex centering,
          eyebrow rule line, indented display heading. */}
      <div className="container sd-header">
        <header className="ed-header">
          <div className="ed-header-row">
            <span className="ed-eyebrow">01 / Projects</span>
          </div>
          <h2 className="ed-heading ed-heading--indent">
            Selected <em>Work</em>
          </h2>
        </header>
        <span
          className="sd-header-cue"
          aria-hidden="true"
          style={{ animation: "none" }}
        >
          scroll ↓
        </span>
      </div>
    </div>
  );
}
