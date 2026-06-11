/* Shared handle to the raw Lenis instance created in SmoothScroll.tsx.
   There is no <ReactLenis> provider in this app (Lenis is instantiated
   imperatively and driven off the GSAP ticker), so useLenis() would
   always return undefined — components that need to pause/resume
   smooth scrolling (e.g. the PreLoader's scroll lock) reach it through
   this module singleton instead. */
import type Lenis from "lenis";

let instance: Lenis | null = null;

export const setLenis = (l: Lenis | null) => {
  instance = l;
};

export const getLenis = () => instance;
