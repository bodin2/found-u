"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { fieldErrorId, fieldId, type FeedbackSeverity } from "@/lib/feedback/types";
import { FieldValidationMessage } from "@/components/ui/field-validation-message";

export type ValidatedFieldProps = {
  name: string;
  label: ReactNode;
  error?: string;
  warning?: string;
  required?: boolean;
  className?: string;
  labelClassName?: string;
  children: (props: {
    id: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
    className: string;
  }) => ReactNode;
};

function inputStateClass(error?: string, warning?: string): string {
  if (error) return "input-line--error";
  if (warning) return "input-line--warning";
  return "";
}

export function ValidatedField({
  name,
  label,
  error,
  warning,
  required,
  className,
  labelClassName,
  children,
}: ValidatedFieldProps) {
  const id = fieldId(name);
  const message = error || warning;
  const severity: FeedbackSeverity = error ? "error" : "warning";
  const describedBy = message ? fieldErrorId(name) : undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className={cn("block text-sm font-medium text-text-secondary mb-2", labelClassName)}>
        {label}
        {required ? <span className="text-[var(--status-error)]"> *</span> : null}
      </label>
      {message ? (
        <FieldValidationMessage id={describedBy} message={message} severity={severity} className="mb-1.5" />
      ) : null}
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        className: cn("input-line", inputStateClass(error, warning)),
      })}
    </div>
  );
}

export { inputStateClass };
