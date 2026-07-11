"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type FormStep = {
  id: string;
  label: string;
};

type FormStepperProps = {
  steps: FormStep[];
  currentStep: number;
  /** `quiet` — neutral progress for auth and other low-chrome flows */
  tone?: "default" | "quiet";
  className?: string;
};

const STEP_COLUMN_CLASS = "w-[3.25rem] sm:w-[4.25rem] md:w-[5.5rem]";

const stepperFocusRingClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green-light focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary";

const stepperPrimaryButtonClass = cn(
  "w-full min-w-0 min-h-11 py-2.5 px-4 sm:px-6 rounded-full font-medium text-white text-center",
  "bg-line-green-cta hover:bg-line-green-cta-hover",
  "transition-colors duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed",
  "flex items-center justify-center touch-manipulation",
  stepperFocusRingClass
);

const stepperSecondaryButtonClass = cn(
  "w-full min-w-0 min-h-11 py-2.5 px-4 sm:px-6 rounded-full font-medium text-center",
  "bg-bg-tertiary text-text-primary hover:bg-bg-secondary",
  "transition-colors duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed",
  "flex items-center justify-center touch-manipulation",
  stepperFocusRingClass
);

export function FormStepper({
  steps,
  currentStep,
  tone = "default",
  className,
}: FormStepperProps) {
  return (
    <nav aria-label="ขั้นตอนฟอร์ม" className={cn("w-full max-w-lg mx-auto md:max-w-none", className)}>
      <ol className="flex w-full items-start">
        {steps.map((step, index) => {
          const done = index < currentStep;
          const active = index === currentStep;
          const isLast = index === steps.length - 1;

          return (
            <li
              key={step.id}
              className={cn("flex items-start min-w-0", !isLast && "flex-1")}
            >
              <div
                className={cn(
                  "flex flex-col items-center shrink-0",
                  STEP_COLUMN_CLASS
                )}
              >
                <span
                  className={cn(
                    "flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full text-sm shrink-0 transition-colors",
                    tone === "quiet"
                      ? cn(
                          done && "bg-text-secondary text-white",
                          active && !done && "bg-bg-primary text-text-primary ring-1 ring-border-light",
                          !done && !active && "bg-bg-tertiary text-text-secondary"
                        )
                      : cn(
                          "font-semibold",
                          done && "bg-line-green-cta text-white",
                          active &&
                            !done &&
                            "bg-line-green-light text-line-green-link ring-2 ring-line-green-cta",
                          !done && !active && "bg-bg-tertiary text-text-secondary"
                        )
                  )}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.5} /> : index + 1}
                </span>
                <span
                  className={cn(
                    "mt-2 w-full text-center text-[11px] sm:text-xs font-medium leading-snug px-0.5 break-words",
                    active
                      ? tone === "quiet"
                        ? "text-text-primary"
                        : "text-line-green-link"
                      : "text-text-secondary"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {!isLast && (
                <div
                  className={cn(
                    "h-0.5 flex-1 min-w-[0.75rem] mx-1 sm:mx-2 rounded-full self-start mt-[18px]",
                    index < currentStep
                      ? tone === "quiet"
                        ? "bg-text-secondary/40"
                        : "bg-line-green-cta"
                      : "bg-border-light"
                  )}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

type FormStepperActionsProps = {
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  nextLabel?: string;
  submitLabel?: string;
  backLabel?: string;
  isSubmitting?: boolean;
  nextDisabled?: boolean;
  /** Mobile sticky anchor — `bottom-nav` for app shell; `viewport` for auth/setup */
  stickyAnchor?: "bottom-nav" | "viewport";
  /** Align actions inside parent padding (auth cards) instead of bleeding to edges */
  inset?: boolean;
  className?: string;
  children?: ReactNode;
};

export function FormStepperActions({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onSubmit,
  nextLabel = "ถัดไป",
  submitLabel = "ส่ง",
  backLabel = "ย้อนกลับ",
  isSubmitting = false,
  nextDisabled = false,
  stickyAnchor = "bottom-nav",
  inset = false,
  className,
  children,
}: FormStepperActionsProps) {
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  const stickyBottomClass =
    stickyAnchor === "viewport"
      ? "bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
      : "bottom-[var(--bottom-nav-height)]";

  return (
    <div
      className={cn(
        inset
          ? cn(
              "sticky z-20 mt-6 pt-4 border-t border-border-light bg-bg-primary",
              stickyBottomClass,
              "md:static md:bottom-auto md:pb-0"
            )
          : cn(
              "sticky z-20 -mx-4 px-4 pt-3 pb-3",
              stickyBottomClass,
              "md:static md:bottom-auto md:mx-0 md:px-0 md:py-0 md:pb-0",
              "bg-bg-secondary border-t border-border-light md:border-0 md:bg-transparent"
            ),
        className
      )}
    >
      <div
        className={cn(
          "grid gap-3 w-full",
          isFirst ? "grid-cols-1" : "grid-cols-2",
          !inset && "max-w-lg mx-auto md:max-w-none"
        )}
      >
        {!isFirst && (
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className={stepperSecondaryButtonClass}
          >
            {backLabel}
          </button>
        )}
        {isLast ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || nextDisabled}
            aria-busy={isSubmitting}
            className={stepperPrimaryButtonClass}
          >
            {isSubmitting ? "กำลังส่ง..." : submitLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled || isSubmitting}
            aria-busy={isSubmitting}
            className={stepperPrimaryButtonClass}
          >
            {nextLabel}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
