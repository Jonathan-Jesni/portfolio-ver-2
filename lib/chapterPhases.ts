export const PROJECT_PHASES = {
  travelSvh: 245,
  // keep in sync with --runway-featured-projects in app/evolution.css
  runwaySvh: 345,
  // Keep one hold per FEATURED_PROJECTS entry in lib/data.ts.
  holds: [
    { start: 0, end: 65 / 245, midpoint: 32.5 / 245 },
    { start: 85 / 245, end: 150 / 245, midpoint: 117.5 / 245 },
    { start: 170 / 245, end: 1, midpoint: 207.5 / 245 },
  ],
  transitions: [
    { start: 65 / 245, end: 85 / 245 },
    { start: 150 / 245, end: 170 / 245 },
  ],
} as const;
