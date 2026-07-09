"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { scrollToField } from "@/lib/feedback/scroll-to-field";
import {
  VALIDATION_SUMMARY_TITLES,
  type FeedbackSeverity,
  type ValidationIssue,
} from "@/lib/feedback/types";
import { feedbackVariantStyles } from "@/lib/feedback/variant-styles";

export type ValidationSummaryProps = {
  issues: ValidationIssue[];
  minCount?: number;
  title?: string;
  severity?: FeedbackSeverity;
  className?: string;
};

function IssueList({ issues }: { issues: ValidationIssue[] }) {
  return (
    <ul className="validation-summary__list space-y-1.5 mt-2">
      {issues.map((issue) => (
        <li key={`${issue.fieldId}-${issue.message}`} className="text-sm leading-relaxed">
          <button
            type="button"
            className="validation-summary__link"
            onClick={() => scrollToField(issue.fieldId)}
          >
            {issue.fieldLabel}
          </button>
          <span className="text-text-secondary">: {issue.message}</span>
        </li>
      ))}
    </ul>
  );
}

export function ValidationSummary({
  issues,
  minCount = 2,
  title,
  severity = "error",
  className,
}: ValidationSummaryProps) {
  if (issues.length < minCount) return null;

  const variant = severity === "error" ? "error" : "warning";
  const { icon: Icon, iconClass, panelClass, titleClass } = feedbackVariantStyles[variant];
  const heading = title ?? VALIDATION_SUMMARY_TITLES[severity];

  return (
    <div role="alert" aria-live="polite" className={cn(panelClass, className)}>
      <div className="flex gap-3">
        <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", iconClass)} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-medium", titleClass)}>{heading}</p>
          <IssueList issues={issues} />
        </div>
      </div>
    </div>
  );
}

export type ValidationSummaryGroupProps = {
  errors?: ValidationIssue[];
  warnings?: ValidationIssue[];
  minCount?: number;
  className?: string;
};

export function ValidationSummaryGroup({
  errors = [],
  warnings = [],
  minCount = 2,
  className,
}: ValidationSummaryGroupProps) {
  if (errors.length < minCount && warnings.length < minCount) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <ValidationSummary issues={errors} minCount={minCount} severity="error" />
      <ValidationSummary issues={warnings} minCount={minCount} severity="warning" />
    </div>
  );
}
