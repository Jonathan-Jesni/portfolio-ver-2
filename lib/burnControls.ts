/* ─────────────────────────────────────────────────────────────
   Burn bridge — a tiny, dependency-free controller so the
   vanilla-GSAP StackTransitions boundary can drive the R3F burn
   overlay (BurnTransition) without prop-drilling or forcing a
   React re-render on every scrub tick.

   Kept free of three/react imports on purpose: StackTransitions
   and ContactSection import only this, so none of the WebGL
   weight leaks into their bundles (or onto the server).

   IMPORTANT — the store lives on globalThis, NOT in module scope.
   BurnTransition is loaded via next/dynamic, and in dev Turbopack
   gives that chunk its own copy of this module: with module-scoped
   state the GSAP scrub wrote into one copy while the canvas
   listened to the other ("split-brain"), so uniforms never moved
   and the overlay rendered permanently transparent. A globalThis
   singleton is shared by every copy (chunks AND HMR re-evals).

     · progress  : 0→1 burn amount, polled each frame by the plane
     · active    : boundary gate — 0 ⇒ overlay transparent + idle
     · invalidate: R3F demand-loop poke, registered by the canvas
     · headline  : signal fired as the burn passes its midpoint,
                   so "Get In Touch" rolls in on cue
   ───────────────────────────────────────────────────────────── */

interface BurnStore {
  progress: number;
  active: boolean;
  invalidateFn: (() => void) | null;
  headlineListeners: Set<(forward: boolean) => void>;
}

const g = globalThis as unknown as { __BURN_STORE__?: BurnStore };

const store: BurnStore = (g.__BURN_STORE__ ??= {
  progress: 0,
  active: false,
  invalidateFn: null,
  headlineListeners: new Set(),
});

export const burnControls = {
  /* progress — written by the GSAP scrub, polled by useFrame */
  setProgress(p: number) {
    store.progress = p;
  },
  getProgress() {
    return store.progress;
  },

  /* invalidate — BurnTransition registers R3F's invalidate(); the
     scrub calls invalidate() after every setProgress so the demand
     loop renders the new frame. */
  setInvalidate(fn: (() => void) | null) {
    store.invalidateFn = fn;
  },
  invalidate() {
    store.invalidateFn?.();
  },

  /* active — gates the overlay's alpha (polled by useFrame). Pokes
     invalidate() so the demand-loop repaints the moment the boundary
     toggles. */
  setActive(a: boolean) {
    if (store.active === a) return;
    store.active = a;
    store.invalidateFn?.();
  },
  getActive() {
    return store.active;
  },

  /* headline — fired once as the burn crosses its midpoint.
     `forward` reflects scroll direction so it re-arms on rewind. */
  fireHeadline(forward: boolean) {
    store.headlineListeners.forEach((l) => l(forward));
  },
  onHeadline(listener: (forward: boolean) => void) {
    store.headlineListeners.add(listener);
    return () => {
      store.headlineListeners.delete(listener);
    };
  },
};
