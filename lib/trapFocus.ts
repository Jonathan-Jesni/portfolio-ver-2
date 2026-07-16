const FOCUSABLE_SELECTOR =
  '[href], a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface TrapFocusOptions {
  fallbackFocus?: HTMLElement | null;
}

function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (element) =>
      !element.hidden &&
      !element.hasAttribute("hidden") &&
      !element.hasAttribute("disabled"),
  );
}

export function trapFocus(
  container: HTMLElement,
  options: TrapFocusOptions = {},
): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Tab") return;

    const focusable = focusableElements(container);
    if (focusable.length === 0) {
      if (options.fallbackFocus) {
        event.preventDefault();
        options.fallbackFocus.focus();
      }
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (!active || !focusable.includes(active)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  document.addEventListener("keydown", onKeyDown);
  return () => document.removeEventListener("keydown", onKeyDown);
}
