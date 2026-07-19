/* Main's two-floor model: the pinned/scrub story starts at 768px on
   mouse-driven devices, while the WebGL laptop stage needs >=900px
   (below that the canvas never mounts and CSS rescues #projects —
   see globals.css ~2514 and evolution.css ~855). Touch devices are
   excluded from immersive by the hover/pointer clauses regardless
   of width. */
export const IMMERSIVE_SCROLL_MEDIA_QUERY =
  "(min-width: 768px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

export const TOUCH_MEDIA_QUERY =
  "(max-width: 767px), (hover: none), (pointer: coarse)";

/* The 3D canvas visibility floor — must stay in sync with the CSS that
   hides .hero-3d-layer/.visual-stage below 900px (globals.css
   min-width:900 blocks, evolution.css max-width:900 block). */
export const STAGE_VIEWPORT_MEDIA_QUERY = "(min-width: 900px)";
