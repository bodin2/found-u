"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { m, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useIsDesktop } from "@/hooks/use-media-query";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { MotionProvider } from "@/components/motion/motion-provider";
import { duration, easeOut } from "@/lib/motion";

export type ResponsiveModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** sm | md | lg for centered desktop dialog */
  size?: "sm" | "md" | "lg";
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  /** Close on Escape. Default true. */
  closeOnEscape?: boolean;
  ariaLabelledBy?: string;
  /** Fallback name when no title / ariaLabelledBy is provided */
  ariaLabel?: string;
};

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

const iconButtonClass = cn(
  "inline-flex items-center justify-center min-w-11 min-h-11 rounded-lg shrink-0",
  "text-text-tertiary hover:bg-bg-secondary hover:text-text-secondary",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30",
  "touch-manipulation"
);

function ResponsiveModalInner({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  size = "md",
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  ariaLabelledBy,
  ariaLabel,
}: ResponsiveModalProps) {
  const isDesktop = useIsDesktop();
  const reduced = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const autoTitleId = useId();
  const autoDescriptionId = useId();
  useLockBodyScroll(open);
  useFocusTrap(panelRef, {
    active: open,
    restoreFocus: true,
  });

  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, closeOnEscape]);

  const titleId = ariaLabelledBy ?? (title ? autoTitleId : undefined);
  const descriptionId = description ? autoDescriptionId : undefined;
  const labelledByProps = titleId
    ? { "aria-labelledby": titleId }
    : { "aria-label": ariaLabel ?? "กล่องโต้ตอบ" };

  const motionDuration = reduced ? 0 : duration.fast;
  const motionDurationNormal = reduced ? 0 : duration.normal;

  const backdropVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: motionDuration },
  };

  const sheetVariants = reduced
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0 },
      }
    : {
        initial: { y: "100%" },
        animate: { y: 0 },
        exit: { y: "100%" },
        transition: { duration: motionDurationNormal, ease: easeOut },
      };

  const dialogVariants = reduced
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0 },
      }
    : {
        initial: { opacity: 0, scale: 0.96, y: 8 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.98, y: 4 },
        transition: { duration: motionDurationNormal, ease: easeOut },
      };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <m.div
          className="overlay-modal fixed inset-0 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-4"
          role="presentation"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={backdropVariants}
          onClick={closeOnBackdrop ? onClose : undefined}
        >
          <m.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            {...labelledByProps}
            aria-describedby={descriptionId}
            className={cn(
              "relative flex flex-col bg-bg-card border border-border-light shadow-sm outline-none w-full",
              isDesktop
                ? cn("rounded-2xl max-h-[85vh]", sizeClasses[size])
                : "rounded-t-2xl max-h-[min(85dvh,100%)] safe-bottom border-b-0",
              className
            )}
            variants={isDesktop ? dialogVariants : sheetVariants}
            onClick={(e) => e.stopPropagation()}
          >
            {!isDesktop && (
              <div className="flex justify-center pt-2 pb-1 shrink-0" aria-hidden>
                <span className="w-10 h-1 rounded-full bg-border-medium" />
              </div>
            )}

            {(title || showCloseButton) && (
              <div className="flex items-start justify-between gap-3 px-4 pt-3 md:pt-5 pb-2 shrink-0">
                <div className="min-w-0 flex-1">
                  {title && (
                    <h2
                      id={titleId}
                      className="text-balance break-words text-xl font-semibold leading-[1.3] text-text-primary"
                    >
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p
                      id={descriptionId}
                      className="text-sm text-text-secondary mt-1 text-pretty break-words"
                    >
                      {description}
                    </p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className={iconButtonClass}
                    aria-label="ปิด"
                  >
                    <X className="w-5 h-5" aria-hidden />
                  </button>
                )}
              </div>
            )}

            {children && (
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-2 min-h-0 min-w-0">
                {children}
              </div>
            )}

            {footer && (
              <div className="shrink-0 px-4 py-3 md:py-4 border-t border-border-light bg-bg-card safe-bottom">
                {footer}
              </div>
            )}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function ResponsiveModal(props: ResponsiveModalProps) {
  return (
    <MotionProvider>
      <ResponsiveModalInner {...props} />
    </MotionProvider>
  );
}
