# Jonathan Jesni - Portfolio

An interactive 3D developer portfolio. The hero is a scroll-driven WebGL laptop that "boots"
as you scroll and then dissolves - pixel-for-pixel - into the live Projects section, backed by
cinematic shader transitions and physics-based interactions.

🌐 **Live:** [jonathanjesni.com](https://jonathanjesni.com)

## Highlights

- **Scroll-driven 3D hero** - a Draco-compressed GLB laptop (React Three Fiber) opens, the
  screen boots, and the camera plunges into a cover-fit frame that crossfades seamlessly into
  the real `#projects` DOM.
- **WebGL transitions** - a liquid-obsidian preloader and an ember "burn" wipe between sections,
  authored as custom GLSL shaders.
- **Physics & motion** - a Matter.js "gravity pit" skills cloud, Lenis smooth scrolling, and a
  GSAP + ScrollTrigger timeline choreographing every section boundary.
- **Detection-reticle cursor** - a custom object-detection-style cursor (nodding to the CV work
  in the projects): corner brackets that snap to frame interactive targets with a scrambling
  `[ LABEL · 0.9X ]` confidence readout and a live pointer dot. Fine-pointer only, and disabled
  entirely under `prefers-reduced-motion`.
- **Mobile-tuned experience** - phones get a terminal-style boot preloader and a name-split
  scroll hero in place of the WebGL laptop, keeping the entrance cinematic without the GPU cost.
- **Built to behave** - adaptive DPR, `prefers-reduced-motion` fallbacks, a WebGL-unsupported
  boundary, full SEO (Open Graph / Twitter cards, `robots`, `sitemap`, `theme-color`), and a
  keyboard-visible focus system.

## Tech Stack

- **Framework:** Next.js 16 (App Router) · React 19 · TypeScript
- **3D / graphics:** three.js · @react-three/fiber · @react-three/drei (Draco GLB, `next/og`)
- **Motion:** GSAP + ScrollTrigger · Lenis (smooth scroll) · Matter.js (physics)
- **Fonts:** Plus Jakarta Sans, JetBrains Mono, Instrument Serif (via `next/font`)

> Styling is hand-written in `app/globals.css` - there is no Tailwind layer (the dependency is
> present but never imported, so utility classes are inert; edit the CSS directly).

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Script          | Description                          |
| --------------- | ------------------------------------ |
| `npm run dev`   | Start the dev server                 |
| `npm run build` | Production build                     |
| `npm run start` | Serve the production build           |
| `npm run lint`  | Run ESLint                           |
| `npm run test:e2e` | Run Playwright end-to-end tests   |
| `npm run capture:header` | Regenerate the laptop-screen texture (`bg.jpg`) from the live Projects header — run after any recolor or header change |
| `npm run images:downscale` | Downscale project images with sharp |

## Configuration

`NEXT_PUBLIC_SITE_URL` sets the absolute base for canonical links, Open Graph / Twitter image
URLs, and the sitemap. It falls back to `https://jonathanjesni.com`, so set it per environment
(e.g. your Vercel preview URL) when deploying.

```bash
# .env.local
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

## Customizing Content

- **Projects & "Currently Building" cards:** `lib/data.ts` (`PROJECTS` and `BUILDING`). Each
  project defines its copy, tags, links, carousel `images` + `imageAlts`, and metric.
- **Project images:** `public/assets/<Project>/…` (referenced from `lib/data.ts`).
- **Favicon & social cards:** `app/icon.png`, `app/apple-icon.png`, `app/opengraph-image.jpeg`,
  `app/twitter-image.jpeg` (with `*.alt.txt` for image alt text).
- **Resume link:** a Google Drive URL hardcoded on the "Resume" buttons in `app/page.tsx`
  (desktop nav + mobile menu), `components/HeroSection.tsx`, and `components/ContactSection.tsx`.
- **Site metadata:** `app/layout.tsx`. SEO routes: `app/robots.ts`, `app/sitemap.ts`.

## Project Structure

```
app/            App Router pages, layout, metadata, robots/sitemap, icons & OG images
components/     UI + 3D components (InteractiveModel, StickyDeckSection, BurnTransition, …)
lib/            Content & shared singletons (data.ts, lenisInstance.ts, burnControls.ts)
public/assets/  GLB model, textures, project images
scripts/        Asset tooling (header capture for the laptop screen, image downscaling)
tests/e2e/      Playwright end-to-end tests
```

## Deploy on Vercel

Deploys as a standard Next.js app on [Vercel](https://vercel.com/new). Set
`NEXT_PUBLIC_SITE_URL` in the project's environment variables so canonical/OG/sitemap URLs
resolve to your domain.
