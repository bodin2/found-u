export function scrollToField(fieldId: string): void {
  if (typeof document === "undefined") return;

  const element = document.getElementById(fieldId);
  if (!element) return;

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  element.scrollIntoView({
    behavior: prefersReducedMotion ? "auto" : "smooth",
    block: "center",
  });

  const focusable =
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLButtonElement
      ? element
      : (element.querySelector("input, textarea, select, button") as HTMLElement | null);

  focusable?.focus({ preventScroll: true });
}
