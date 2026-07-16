export const IMMERSIVE_SCROLL_MEDIA_QUERY =
  "(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

export const TOUCH_MEDIA_QUERY =
  "(max-width: 1023px), (hover: none), (pointer: coarse)";

// Mirrors the natural-flow @media query in app/evolution.css; keep them synchronized.
export const TOUCH_OR_REDUCED_MEDIA_QUERY =
  `${TOUCH_MEDIA_QUERY}, (prefers-reduced-motion: reduce)`;
