/* power4.inOut — matches the {J} logo's scroll-to feel. */
export const power4InOut = (t: number) =>
  t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

/* Canonical scroll-Y for a nav target. Scroll-target markers are untransformed
   siblings of the transformed section content, so getBoundingClientRect()
   yields their stable layout position from any current scroll position. */
export const absoluteTop = (el: HTMLElement) => {
  const rect = el.getBoundingClientRect();
  return rect.top + window.scrollY;
};

export const IMMERSIVE_SCROLL_MEDIA_QUERY =
  "(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
export const NAV_CLEARANCE_GAP = 24;
export type ScrollTargetKind = "landing" | "spy";

export interface ScrollTargetMetrics {
  landingY: number | null;
  spyY: number | null;
}

export interface ScrollTargetSnapshot {
  navClearance: number;
  maxScrollY: number;
  targets: ReadonlyMap<string, ScrollTargetMetrics>;
}

let targetSnapshot: ScrollTargetSnapshot = {
  navClearance: NAV_CLEARANCE_GAP,
  maxScrollY: 0,
  targets: new Map(),
};

export function measureNavClearance(
  nav: HTMLElement | null =
    typeof document === "undefined" ? null : document.getElementById("navbar"),
  gap = NAV_CLEARANCE_GAP
): number {
  if (!nav) return Math.max(0, gap);
  const rect = nav.getBoundingClientRect();
  const bottom = Math.max(rect.bottom, rect.top + nav.offsetHeight);
  return Math.max(0, Math.ceil(bottom + gap));
}

/** Layout eligibility only. GPU signals never decide the page structure. */
export function matchesImmersiveScrollViewport(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(IMMERSIVE_SCROLL_MEDIA_QUERY).matches
  );
}

function markerFor(id: string, kind: ScrollTargetKind): HTMLElement | null {
  const attribute = `data-scroll-${kind}`;
  return (
    Array.from(document.querySelectorAll<HTMLElement>(`[${attribute}]`)).find(
      (element) => element.getAttribute(attribute)?.trim() === id
    ) ?? document.getElementById(id)
  );
}

function measureMarker(
  marker: HTMLElement,
  kind: ScrollTargetKind,
  clearance: number,
  maximum: number
): number {
  const rawOffset = Number(
    marker.getAttribute(`data-scroll-${kind}-offset`) ?? 0
  );
  const offset = Number.isFinite(rawOffset) ? rawOffset : 0;
  const navOffset =
    marker.getAttribute(`data-scroll-${kind}-clearance`) === "none"
      ? 0
      : clearance;
  return Math.min(
    maximum,
    Math.max(0, Math.round(absoluteTop(marker) + offset - navOffset))
  );
}

/** Rebuild after ScrollTrigger refreshes and responsive geometry changes. */
export function refreshScrollTargets(
  additionalIds: readonly string[] = []
): ScrollTargetSnapshot {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return targetSnapshot;
  }

  const ids = new Set(additionalIds);
  targetSnapshot.targets.forEach((_, id) => ids.add(id));
  document
    .querySelectorAll<HTMLElement>("[data-scroll-landing], [data-scroll-spy]")
    .forEach((element) => {
      const landing = element.getAttribute("data-scroll-landing")?.trim();
      const spy = element.getAttribute("data-scroll-spy")?.trim();
      if (landing) ids.add(landing);
      if (spy) ids.add(spy);
    });

  const navClearance = measureNavClearance();
  const maximum = Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight
  );
  const targets = new Map<string, ScrollTargetMetrics>();
  ids.forEach((id) => {
    const landing = markerFor(id, "landing");
    const spy = markerFor(id, "spy");
    targets.set(id, {
      landingY: landing
        ? measureMarker(landing, "landing", navClearance, maximum)
        : null,
      spyY: spy ? measureMarker(spy, "spy", navClearance, maximum) : null,
    });
  });

  targetSnapshot = { navClearance, maxScrollY: maximum, targets };
  return targetSnapshot;
}

export function getScrollTargetY(
  id: string,
  kind: ScrollTargetKind = "landing"
): number | null {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  const target =
    targetSnapshot.targets.get(id) ??
    refreshScrollTargets([id]).targets.get(id);
  return kind === "landing"
    ? target?.landingY ?? null
    : target?.spyY ?? null;
}

export function getScrollTargetSnapshot(): ScrollTargetSnapshot {
  return targetSnapshot;
}

export function observeScrollTargets(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => undefined;
  }

  let frame = 0;
  let disposed = false;
  const schedule = () => {
    if (disposed) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => refreshScrollTargets());
  };
  const observer =
    typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
  const nav = document.getElementById("navbar");
  if (nav) observer?.observe(nav);
  observer?.observe(document.body);
  window.addEventListener("resize", schedule, { passive: true });
  void document.fonts?.ready.then(schedule).catch(() => undefined);
  schedule();

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer?.disconnect();
    window.removeEventListener("resize", schedule);
  };
}
