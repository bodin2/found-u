"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function isVisible(el: HTMLElement): boolean {
  // offsetParent is null for `position: fixed` / `display: none` — use client rects instead
  return Boolean(el.getClientRects().length);
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) =>
      !el.hasAttribute("disabled") &&
      el.getAttribute("aria-hidden") !== "true" &&
      !el.closest("[aria-hidden='true']") &&
      el.tabIndex !== -1 &&
      isVisible(el)
  );
}

type UseFocusTrapOptions = {
  /** When false, trap is inactive (e.g. dialog closed). Default true when container exists. */
  active: boolean;
  /** Restore focus to the previously focused element on deactivate. Default true. */
  restoreFocus?: boolean;
  /** Prefer focusing this element when the trap activates. */
  initialFocusRef?: RefObject<HTMLElement | null>;
};

/**
 * Traps Tab/Shift+Tab inside `containerRef` while `active`.
 * Saves and restores document focus around the trap lifecycle.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  { active, restoreFocus = true, initialFocusRef }: UseFocusTrapOptions
) {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusInitial = () => {
      const preferred = initialFocusRef?.current;
      if (preferred && container.contains(preferred)) {
        preferred.focus();
        return;
      }
      const focusables = getFocusableElements(container);
      if (focusables.length > 0) {
        focusables[0].focus();
        return;
      }
      if (!container.hasAttribute("tabindex")) {
        container.tabIndex = -1;
      }
      container.focus();
    };

    // Defer so portal content / AnimatePresence children are mounted
    const frame = requestAnimationFrame(focusInitial);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      const focusables = getFocusableElements(container);
      if (focusables.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement;

      if (event.shiftKey) {
        if (current === first || !container.contains(current)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (current === last || !container.contains(current)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown, true);

      if (restoreFocus) {
        const prev = previouslyFocusedRef.current;
        if (prev && document.contains(prev)) {
          prev.focus();
        }
      }
      previouslyFocusedRef.current = null;
    };
  }, [active, containerRef, initialFocusRef, restoreFocus]);
}
