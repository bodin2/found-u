import { cn } from "@/lib/utils";
import { inputStateClass } from "@/components/ui/validated-field";

const authFocusRingClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green-light focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary";

/** WCAG AA primary actions — pill per DESIGN.md */
export const authPrimaryButtonClass = cn(
  "w-full min-h-11 py-3 px-8 rounded-full font-medium text-white no-underline",
  "bg-line-green-cta hover:bg-line-green-cta-hover",
  "transition-colors duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed",
  "flex items-center justify-center gap-2 touch-manipulation",
  authFocusRingClass
);

/** WCAG AA text links on light surfaces */
export const authLinkClass = cn(
  "text-line-green-link hover:text-line-green-link-hover hover:underline underline-offset-2",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green-light rounded-sm"
);

/** Readable helper / hint copy (not placeholder-tier gray) */
export const authHintClass = "text-xs text-text-secondary leading-relaxed";

/** Form field labels — matches ValidatedField */
export const authLabelClass = "block text-sm font-medium text-text-secondary mb-2";

/** Metadata keys in confirmation panels */
export const authMetaLabelClass = "text-xs font-medium text-text-secondary";

/** Secondary fill action — pill, no border per DESIGN.md */
export const authSecondaryButtonClass = cn(
  "w-full min-h-11 flex items-center justify-center gap-3 py-3 px-8 rounded-full no-underline",
  "bg-bg-tertiary text-text-primary font-medium",
  "hover:bg-bg-secondary transition-colors duration-200 ease-out",
  "disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation",
  authFocusRingClass
);

/** Muted icon well — accent reserved for links and primary CTA */
export const authIconWellClass =
  "inline-flex w-10 h-10 shrink-0 items-center justify-center rounded-xl bg-bg-tertiary text-text-secondary [&_svg]:w-5 [&_svg]:h-5";

export type AuthInputVariant = "default" | "studentId" | "pin" | "pinCompact";

/** Design-system filled inputs with optional error state */
export function authInputClassName(
  variant: AuthInputVariant = "default",
  error?: string,
  warning?: string
): string {
  return cn(
    "input-line",
    variant === "studentId" && "font-mono text-base sm:text-lg tracking-widest",
    variant === "pin" &&
      "font-mono text-lg sm:text-xl tracking-[0.3em] sm:tracking-[0.4em] text-center",
    variant === "pinCompact" &&
      "font-mono text-base sm:text-lg tracking-[0.25em] sm:tracking-[0.35em] text-center",
    inputStateClass(error, warning)
  );
}

/** Confirmation surface — neutral wash, not status green */
export const authSuccessPanelClass = cn(
  "rounded-xl bg-bg-secondary border border-border-light p-4 space-y-3"
);

/** Inline success banner (e.g. post-setup notice) */
export const authSuccessBannerClass = cn(
  "feedback-panel feedback-panel--success text-sm text-text-primary"
);

/** Segmented control — active tab */
export const authTabActiveClass = "bg-bg-primary text-text-primary font-medium ring-1 ring-border-light";

/** Segmented control — inactive tab */
export const authTabInactiveClass = cn(
  "text-text-secondary hover:text-text-primary",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green-light rounded-lg"
);

/** Segmented control track */
export const authSegmentTrackClass =
  "flex gap-1.5 sm:gap-2 mb-6 p-1 bg-bg-secondary rounded-xl";

/** Quick-unlock avatar — neutral, not brand-filled */
export const authAvatarRingClass =
  "w-11 h-11 rounded-full bg-bg-tertiary flex items-center justify-center text-text-secondary";

/* — Layout — */

/** Full viewport shell — dynamic height + notch safe area */
export const authShellRootClass = cn(
  "min-h-[100dvh] bg-bg-secondary flex flex-col",
  "pt-[env(safe-area-inset-top,0px)]"
);

export const authShellMainClass = cn(
  "flex-1 w-full max-w-md mx-auto min-h-0 overflow-y-auto overscroll-y-contain",
  "px-[var(--spacing-page-x)] py-4 sm:py-6 md:py-8",
  "pb-[max(1rem,env(safe-area-inset-bottom,0px))]",
  "max-md:landscape:py-3",
  "flex flex-col gap-4"
);

/** Metadata values in confirmation panels */
export const authProfileValueClass = "font-medium text-text-primary";

/** Primary content card — border only, 12px radius per DESIGN.md */
export const authCardClass = "bg-bg-primary rounded-xl border border-border-light p-5 sm:p-6";

export const authCardHeaderClass = "space-y-2 mb-5";

export const authCardTitleClass = "text-lg font-semibold text-text-primary text-balance";

export const authCardDescriptionClass = "text-sm text-text-secondary text-pretty leading-relaxed";

/** Tight stack for related fields / buttons */
export const authFieldStackClass = "flex flex-col gap-3";

/** Generous stack for form sections */
export const authFormStackClass = "flex flex-col gap-4";

/** Footer links below card actions */
export const authFooterClass = "mt-6 text-center text-sm";

/** Separated secondary actions below primary form */
export const authDividerSectionClass = "mt-6 pt-6 border-t border-border-light flex flex-col gap-3";

/** Sticky stepper actions bleed to card edges */
export const authStickyBleedClass = "-mx-5 px-5 sm:-mx-6 sm:px-6";

/** Scroll room above mobile sticky form actions (no bottom nav on auth) */
export const authStickyScrollPadClass =
  "pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0";

/** Sticky dual-action footer inside auth cards */
export const authStickyActionsShellClass = cn(
  "sticky z-20 mt-6 pt-4 border-t border-border-light bg-bg-primary",
  "bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]",
  "md:static md:bottom-auto md:pb-0"
);

/** Equal-width back / next columns — minmax prevents content from skewing tracks */
export const authDualActionGridClass =
  "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 w-full";

/** Side-by-side links that stack on narrow phones */
export const authInlineActionRowClass =
  "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between";

/** Text action with 44px touch target */
export const authTouchTextActionClass = cn(
  "inline-flex min-h-11 items-center text-sm text-text-secondary",
  "hover:text-text-primary active:text-text-primary touch-manipulation",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green-light rounded-sm"
);
