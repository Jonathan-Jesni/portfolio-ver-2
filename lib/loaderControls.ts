type Invalidate = (() => void) | null;

export interface LoaderSnapshot {
  active: boolean;
  failed: boolean;
  stageReady: boolean;
}

const listeners = new Set<() => void>();

let snapshot: LoaderSnapshot = {
  active: true,
  failed: false,
  stageReady: false,
};
let burnProgress = 0;
let speedTarget = 0;
let invalidate: Invalidate = null;

function publish(next: Partial<LoaderSnapshot>) {
  const candidate = { ...snapshot, ...next };
  if (
    candidate.active === snapshot.active &&
    candidate.failed === snapshot.failed &&
    candidate.stageReady === snapshot.stageReady
  ) {
    return;
  }

  snapshot = candidate;
  listeners.forEach((listener) => listener());
}

/**
 * Mutable bridge between the DOM loader and the single R3F visual stage.
 * High-frequency shader values stay outside React; only lifecycle changes
 * publish a snapshot.
 */
export const loaderControls = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot(): LoaderSnapshot {
    return snapshot;
  },

  getServerSnapshot(): LoaderSnapshot {
    return snapshot;
  },

  getActive(): boolean {
    return snapshot.active;
  },

  setActive(active: boolean): void {
    publish({ active });
    invalidate?.();
  },

  getBurnProgress(): number {
    return burnProgress;
  },

  setBurnProgress(progress: number): void {
    burnProgress = Math.max(0, Math.min(1, progress));
    invalidate?.();
  },

  getSpeedTarget(): number {
    return speedTarget;
  },

  setSpeedTarget(speed: number): void {
    speedTarget = Math.max(0, Math.min(1, speed));
    invalidate?.();
  },

  markStageReady(): void {
    publish({ stageReady: true });
    invalidate?.();
  },

  fail(): void {
    burnProgress = 1;
    publish({ active: false, failed: true });
    invalidate?.();
  },

  setInvalidate(next: Invalidate): void {
    invalidate = next;
  },

  invalidate(): void {
    invalidate?.();
  },
};
