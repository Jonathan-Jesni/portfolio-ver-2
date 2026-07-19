import { expect, test, type Locator, type Page } from "playwright/test";

const DESKTOP_PROJECTS = new Set([
  "desktop-1440",
  "desktop-1024",
  /* The 768-1023px fine-pointer band runs the immersive scrub story
     (canvas only >=900) — this band shipped broken once, so it stays
     under test. */
  "desktop-960",
  "desktop-wide-short-1536",
  "desktop-short-1150",
]);

const MOBILE_PROJECTS = new Set(["mobile-390", "tablet-768"]);

async function openPortfolio(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const loader = page.locator("#preloader-overlay");
  await expect
    .poll(() => page.locator("html").getAttribute("data-motion-ready"), {
      timeout: 15_000,
    })
    .toBe("true");
  await expect(loader).toHaveCount(0, { timeout: 8_000 });
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
}

async function waitForScrollToSettle(page: Page) {
  await page.waitForTimeout(80);
  await page.evaluate(() => new Promise<void>((resolve) => {
    let lastY = window.scrollY;
    let stableFrames = 0;
    const startedAt = performance.now();

    const frame = () => {
      const currentY = window.scrollY;
      stableFrames = Math.abs(currentY - lastY) < 0.5 ? stableFrames + 1 : 0;
      lastY = currentY;

      if (performance.now() - startedAt >= 240 && stableFrames >= 8) {
        resolve();
        return;
      }
      requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  }));
}

async function keyboardNavigate(page: Page, hash: string) {
  const link = page.locator(`#navbar a[href="${hash}"]`);
  await expect(link).toBeVisible();
  await link.focus();
  await page.keyboard.press("Enter");
  await waitForScrollToSettle(page);
}

async function expectExposed(locator: Locator) {
  await expect(locator).toBeAttached();
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible();
  const presentation = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      opacity: Number.parseFloat(style.opacity || "1"),
      visibility: style.visibility,
      display: style.display,
    };
  });

  expect(presentation.display).not.toBe("none");
  expect(presentation.visibility).not.toBe("hidden");
  expect(presentation.opacity).toBeGreaterThan(0.9);
}

test("a hard load renders one visual stage and hands off to the cinematic hero", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440");

  await page.goto("/", { waitUntil: "domcontentloaded" });
  const loader = page.locator("#preloader-overlay");
  await expect(loader).toBeAttached({ timeout: 6_000 });

  const stageCanvas = page.locator(".hero-3d-layer canvas");
  const poster = page.locator(".hero-laptop-poster");
  await expect
    .poll(async () => (await stageCanvas.count()) + (await poster.count()), {
      timeout: 8_000,
    })
    .toBeGreaterThan(0);
  const initialCanvasCount = await stageCanvas.count();
  expect(initialCanvasCount).toBeLessThanOrEqual(1);

  await expect(loader).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator("html")).toHaveAttribute("data-motion-ready", "true");
  await expect(page.getByRole("heading", { name: "Jonathan Jesni" })).toBeVisible();
  await expect(page.locator(".hero-buttons")).toBeVisible();
  await expect(stageCanvas).toHaveCount(initialCanvasCount);
});

test("desktop-to-mobile resize clears magnetic hero glyph offsets", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440");
  await openPortfolio(page);

  const glyphs = page.locator(".hero-char");
  await expect(glyphs).toHaveCount(13);

  const readOffsets = () => glyphs.evaluateAll((elements) =>
    elements.map((element) => {
      const transform = getComputedStyle(element).transform;
      if (transform === "none") return { x: 0, y: 0 };
      const matrix = new DOMMatrixReadOnly(transform);
      return { x: matrix.m41, y: matrix.m42 };
    }),
  );
  const greatestOffset = async () =>
    Math.max(
      0,
      ...(await readOffsets()).map(({ x, y }) => Math.hypot(x, y)),
    );

  const firstGlyph = await glyphs.first().boundingBox();
  expect(firstGlyph).not.toBeNull();
  if (!firstGlyph) return;

  await page.mouse.move(1430, 880);
  await page.mouse.move(
    firstGlyph.x + firstGlyph.width / 2 + 24,
    firstGlyph.y + firstGlyph.height / 2 + 12,
    { steps: 4 },
  );
  await expect
    .poll(greatestOffset, { message: "Magnetic glyph interaction did not activate" })
    .toBeGreaterThan(1);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    window.dispatchEvent(new Event("orientationchange"));
  });
  await expect(page.locator(".hero-runway")).toHaveClass(
    /hero-runway--static/,
    { timeout: 8_000 },
  );

  await expect
    .poll(greatestOffset, {
      message: "Desktop magnetic X/Y offsets survived the mobile mode switch",
    })
    .toBeLessThan(0.1);
  await page.waitForTimeout(160);
  expect(await greatestOffset()).toBeLessThan(0.1);

  const maskGeometry = await page.locator(".hero-name-mask").evaluateAll((masks) =>
    masks.map((mask, maskIndex) => {
      const maskRect = mask.getBoundingClientRect();
      const violations = Array.from(mask.querySelectorAll<HTMLElement>(".hero-char"))
        .map((character, characterIndex) => ({
          characterIndex,
          rect: character.getBoundingClientRect(),
        }))
        .filter(({ rect }) =>
          rect.left < maskRect.left - 1 ||
          rect.right > maskRect.right + 1 ||
          rect.top < maskRect.top - 1 ||
          rect.bottom > maskRect.bottom + 1
        )
        .map(({ characterIndex, rect }) => ({
          characterIndex,
          rect: {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
          },
        }));

      return {
        maskIndex,
        mask: {
          left: maskRect.left,
          right: maskRect.right,
          top: maskRect.top,
          bottom: maskRect.bottom,
        },
        withinViewport:
          maskRect.left >= -1 &&
          maskRect.right <= window.innerWidth + 1,
        violations,
      };
    }),
  );

  expect(maskGeometry).toHaveLength(2);
  expect(
    maskGeometry.filter(({ withinViewport }) => !withinViewport),
    `Hero name masks escaped the mobile viewport: ${JSON.stringify(maskGeometry)}`,
  ).toEqual([]);
  expect(
    maskGeometry.flatMap(({ maskIndex, violations }) =>
      violations.map((violation) => ({ maskIndex, ...violation })),
    ),
    `Hero glyphs escaped their masks after resize: ${JSON.stringify(maskGeometry)}`,
  ).toEqual([]);
});

test("desktop chapter landings and project rail stay inside the readable viewport", async ({ page }, testInfo) => {
  test.skip(!DESKTOP_PROJECTS.has(testInfo.project.name));
  await openPortfolio(page);

  const desktopRuntime = await page.evaluate(() => ({
    motionReady: document.documentElement.dataset.motionReady,
    scrubReady: document.querySelector<HTMLElement>(".cs-track")?.dataset.scrubReady,
    hover: matchMedia("(hover: hover)").matches,
    finePointer: matchMedia("(pointer: fine)").matches,
  }));
  expect(
    desktopRuntime.scrubReady,
    `Desktop scrub did not initialize: ${JSON.stringify(desktopRuntime)}`,
  ).toBe("true");

  await keyboardNavigate(page, "#projects");

  const firstProject = page.locator('[data-project-id="neuro-genesis"]');
  await expect(firstProject).toHaveAttribute("aria-hidden", "false");
  await expect(firstProject).toBeVisible();

  const projectGeometry = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      const bounds = element.getBoundingClientRect();
      return { top: bounds.top, bottom: bounds.bottom };
    };

    const nav = rect("#navbar");
    const topbar = rect(".cs-topbar");
    const progress = rect(".cs-progress");
    const rail = rect(".cs-rail");
    const visual = rect('[data-project-id="neuro-genesis"] .cs-visual-col');
    const copy = rect('[data-project-id="neuro-genesis"] .cs-text');
    const track = rect(".cs-track");
    const viewport = rect(".cs-viewport");
    const marker = rect(".chapter-marker--projects-landing");

    return {
      scrollY: window.scrollY,
      viewportHeight: window.innerHeight,
      navBottom: nav.bottom,
      trackTop: track.top,
      stickyViewportTop: viewport.top,
      landingMarkerTop: marker.top,
      topbarTop: topbar.top,
      contentBottom: Math.max(visual.bottom, copy.bottom),
      progressTop: progress.top,
      progressBottom: progress.bottom,
      railTop: rail.top,
      railBottom: rail.bottom,
    };
  });

  expect(projectGeometry.topbarTop).toBeGreaterThanOrEqual(projectGeometry.navBottom + 20);
  expect(projectGeometry.contentBottom).toBeLessThanOrEqual(projectGeometry.progressTop - 8);
  expect(projectGeometry.progressBottom).toBeLessThanOrEqual(projectGeometry.railTop);
  expect(
    projectGeometry.railBottom,
    `Project landing geometry: ${JSON.stringify(projectGeometry)}`,
  ).toBeLessThanOrEqual(projectGeometry.viewportHeight - 20);

  const firstRailButton = page.getByRole("button", { name: "Go to Neuro-Genesis Engine" });
  const bandwidthRailButton = page.getByRole("button", { name: "Go to BandWidth" });
  await firstRailButton.focus();
  await page.keyboard.press("End");
  await expect(bandwidthRailButton).toBeFocused();
  await expect(bandwidthRailButton).toHaveAttribute("aria-current", "true");
  await expect(page.locator('[data-project-id="bandwidth"]')).toHaveAttribute("aria-hidden", "false");

  const bandWidthTarget = await page.locator(".cs-track").evaluate((track) => {
    const bounds = track.getBoundingClientRect();
    const start = bounds.top + window.scrollY;
    const travel = Math.max(1, bounds.height - window.innerHeight);
    return (window.scrollY - start) / travel;
  });
  expect(bandWidthTarget).toBeGreaterThan(0.78);
  expect(bandWidthTarget).toBeLessThan(0.93);
});

test("desktop navigation lands on settled Skills, About, and Contact tableaux", async ({ page }, testInfo) => {
  test.skip(!DESKTOP_PROJECTS.has(testInfo.project.name));
  await openPortfolio(page);

  await keyboardNavigate(page, "#skills");
  const skillsGeometry = await page.evaluate(() => {
    const nav = document.querySelector<HTMLElement>("#navbar")!.getBoundingClientRect();
    const skills = document.querySelector<HTMLElement>('[data-chapter="skills"] .ed-heading')!;
    const skillsRect = skills.getBoundingClientRect();
    const aboutRect = document.querySelector<HTMLElement>(".about-runway .ed-heading")!.getBoundingClientRect();
    return {
      navBottom: nav.bottom,
      skillsTop: skillsRect.top,
      skillsBottom: skillsRect.bottom,
      aboutTop: aboutRect.top,
      viewportHeight: window.innerHeight,
    };
  });
  expect(skillsGeometry.skillsTop).toBeGreaterThanOrEqual(skillsGeometry.navBottom + 20);
  expect(skillsGeometry.skillsBottom).toBeLessThanOrEqual(skillsGeometry.viewportHeight);
  expect(skillsGeometry.aboutTop).toBeGreaterThanOrEqual(skillsGeometry.viewportHeight - 1);

  await keyboardNavigate(page, "#about");
  const aboutGeometry = await page.locator(".about-runway .ed-heading").evaluate((heading) => {
    const navBottom = document.querySelector<HTMLElement>("#navbar")!.getBoundingClientRect().bottom;
    const bounds = heading.getBoundingClientRect();
    return { navBottom, top: bounds.top, bottom: bounds.bottom, viewportHeight: window.innerHeight };
  });
  expect(aboutGeometry.top).toBeGreaterThanOrEqual(aboutGeometry.navBottom + 20);
  expect(aboutGeometry.bottom).toBeLessThanOrEqual(aboutGeometry.viewportHeight);

  await keyboardNavigate(page, "#contact");
  await expect(page.locator(".contact-heading")).toBeVisible();
  const contactGeometry = await page.locator(".contact-inner").evaluate((contact) => {
    const bounds = contact.getBoundingClientRect();
    return { top: bounds.top, bottom: bounds.bottom, viewportHeight: window.innerHeight };
  });
  expect(contactGeometry.top).toBeGreaterThanOrEqual(0);
  expect(contactGeometry.bottom).toBeLessThanOrEqual(contactGeometry.viewportHeight);
});

test("touch layouts keep the full story in natural flow and restore menu focus", async ({ page }, testInfo) => {
  test.skip(!MOBILE_PROJECTS.has(testInfo.project.name));
  await openPortfolio(page);

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(horizontalOverflow).toBe(false);
  await expect(page.locator(".cs-track")).toHaveAttribute("data-scrub-ready", "false");

  const chapterTops = await page.evaluate(() => {
    const selectors = [
      "#hero",
      "#projects",
      '[data-chapter="building"]',
      '[data-chapter="skills"]',
      ".about-runway",
      ".contact-runway",
    ];
    return selectors.map((selector) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return element.getBoundingClientRect().top + window.scrollY;
    });
  });
  expect(chapterTops).toEqual([...chapterTops].sort((a, b) => a - b));

  for (const id of ["neuro-genesis", "double-unet", "bandwidth"]) {
    const project = page.locator(`[data-project-id="${id}"]`);
    await expect(project).not.toHaveAttribute("aria-hidden", "true");
    await expectExposed(project);
    expect(await project.evaluate((element) => getComputedStyle(element).position)).not.toBe("absolute");
  }

  for (const heading of [
    page.getByRole("heading", { name: /Currently building/i }),
    page.getByRole("heading", { name: /The stack/i }),
    page.getByRole("heading", { name: /About me/i }),
    page.locator(".contact-heading"),
  ]) {
    await expectExposed(heading);
  }

  const toggle = page.locator("#mobile-toggle");
  if (await toggle.isVisible()) {
    await toggle.focus();
    await page.keyboard.press("Enter");

    const menu = page.locator("#mobile-menu");
    const close = menu.locator(".mobile-menu-close");
    await expect(menu).toHaveAttribute("aria-hidden", "false");
    await expect
      .poll(() => menu.evaluate((element) => {
        const menuElement = element as HTMLElement;
        const active = document.activeElement as HTMLElement | null;
        const closeButton = menuElement.querySelector<HTMLElement>(".mobile-menu-close");
        if (menuElement.contains(active)) return "inside";
        return JSON.stringify({
          active: active ? `${active.tagName.toLowerCase()}#${active.id}` : null,
          menuInert: menuElement.inert,
          menuHasInertAttribute: menuElement.hasAttribute("inert"),
          closeInert: closeButton?.inert ?? null,
          closeDisabled: closeButton?.matches(":disabled") ?? null,
        });
      }))
      .toBe("inside");
    expect(await page.locator("html").evaluate((element) => element.style.overflow)).toBe("hidden");
    expect(await page.locator("body").evaluate((element) => element.style.overflow)).toBe("hidden");

    await close.focus();
    await page.keyboard.press("Shift+Tab");
    await expect(menu.locator("a[href]").last()).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveAttribute("aria-hidden", "true");
    await expect(toggle).toBeFocused();
    expect(await page.locator("html").evaluate((element) => element.style.overflow)).not.toBe("hidden");
    expect(await page.locator("body").evaluate((element) => element.style.overflow)).not.toBe("hidden");
  }

  const skipLink = page.locator(".skip-link");
  await skipLink.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("reduced motion preserves every chapter and its signature hero composition", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPortfolio(page);

  await expect(page.getByRole("heading", { name: "Jonathan Jesni" })).toBeVisible();
  await expect(page.locator(".hero-laptop-poster")).toBeVisible();
  await expect(page.locator(".hero-3d-layer canvas")).toHaveCount(0);

  for (const id of ["neuro-genesis", "double-unet", "bandwidth"]) {
    const project = page.locator(`[data-project-id="${id}"]`);
    await expect(project).not.toHaveAttribute("aria-hidden", "true");
    await expectExposed(project);
  }

  for (const selector of [
    '[data-chapter="building"] .ed-heading',
    '[data-chapter="skills"] .ed-heading',
    ".about-runway .ed-heading",
    ".contact-heading",
  ]) {
    await expectExposed(page.locator(selector));
  }
});

test("an enhancement failure exposes complete content without stale sticky or hidden states", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440");
  await openPortfolio(page);

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("portfolio:motion-failed"));
  });
  await expect(page.locator("html")).toHaveAttribute("data-motion-ready", "failed");

  for (const id of ["neuro-genesis", "double-unet", "bandwidth"]) {
    const project = page.locator(`[data-project-id="${id}"]`);
    await expect(project).not.toHaveAttribute("aria-hidden", "true");
    await expectExposed(project);
  }

  for (const selector of [
    '[data-chapter="building"] .sp-content',
    '[data-chapter="skills"] .sp-content',
    ".about-split-container",
    ".contact-links",
  ]) {
    await expectExposed(page.locator(selector));
  }

  const stickyPositions = await page.evaluate(() =>
    [".cs-viewport", ".sp-sticky", ".about-sticky", ".contact-sticky"].map((selector) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return getComputedStyle(element).position;
    }),
  );
  expect(stickyPositions).not.toContain("sticky");
});

test("desktop Projects-to-Building CRT wipe reveals building content through a positive scroll window", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440");
  await openPortfolio(page);

  const buildingSection = page.locator('[data-chapter="building"]');
  const buildingContent = page.locator('[data-chapter="building"] .sp-content');

  // Scroll well past the Projects -> Building boundary (the CRT collapse)
  // via real wheel input — Lenis (lib/lenisInstance.ts) intercepts wheel
  // events to smooth-scroll and would fight a direct window.scrollTo.
  let reachedBoundary = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    const top = await buildingSection.evaluate((element) => element.getBoundingClientRect().top);
    if (top <= 0) {
      reachedBoundary = true;
      break;
    }
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(50);
  }
  expect(reachedBoundary, "Could not scroll past the Projects -> Building boundary").toBe(true);
  await waitForScrollToSettle(page);

  await expectExposed(buildingContent);

  // The boundary-0 ScrollTrigger (trigger: outro CTA "bottom center",
  // endTrigger: Building "top top") must resolve to a positive window —
  // a degenerate end <= start silently keeps Building's autoAlpha gate
  // (now removed; SpatialSection owns the reveal) or, more generally,
  // any future scrub bound to it, from ever completing.
  const degenerateTriggers = await page.evaluate(() => {
    const st = (window as unknown as {
      ScrollTrigger?: { getAll: () => { start: number; end: number }[] };
    }).ScrollTrigger;
    if (!st) return null;
    return st
      .getAll()
      .filter((instance) => instance.end <= instance.start)
      .map((instance) => ({ start: instance.start, end: instance.end }));
  });
  expect(degenerateTriggers, "window.ScrollTrigger was not exposed for verification").not.toBeNull();
  expect(degenerateTriggers).toEqual([]);
});
