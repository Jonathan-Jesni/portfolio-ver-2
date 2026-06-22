/* ============================================================
   Capture the /assets-render/projects-header route into the
   laptop's WebGL screen texture (public/assets/textures/bg.jpg).

   The laptop screen "boots" into this image and crossfades into
   the live #projects DOM header, so the capture must stay
   pixel-matched to that header (1440x900 @ 2x = 2880x1800, the
   GLB screen face's 16:10 aspect). Re-run this whenever the
   header copy or the site palette changes.

   Usage: start the dev server, then `npm run capture:header`.
   ============================================================ */
import { chromium } from "playwright";

const URL =
  process.env.CAPTURE_URL ||
  "http://localhost:3000/assets-render/projects-header";
const OUT = "public/assets/textures/bg.jpg";

const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  // Wait for the editorial fonts so the captured type matches the live header.
  await page.evaluate(() => document.fonts.ready);
  // Strip the Next.js dev-mode indicator badge so it never lands in the texture.
  await page.evaluate(() => {
    for (const sel of [
      "nextjs-portal",
      "[data-next-badge-root]",
      "[data-next-badge]",
      "#__next-build-watcher",
      "#__next-dev-tools-indicator",
    ]) {
      document.querySelectorAll(sel).forEach((el) => el.remove());
    }
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: OUT, type: "jpeg", quality: 92 });
  console.log(`Captured ${OUT} from ${URL}`);
} finally {
  await browser.close();
}
