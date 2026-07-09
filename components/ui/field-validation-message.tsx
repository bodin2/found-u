"use client";

import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeedbackSeverity } from "@/lib/feedback/types";

export type FieldValidationMessageProps = {
  id?: string;
  message?: string;
  severity?: FeedbackSeverity;
  className?: string;
};

export function FieldValidationMessage({
  id,
  message,
  severity = "error",
  className,
}: FieldValidationMessageProps) {
  if (!message) return null;

  return (
    <p
      id={id}
      role={severity === "error" ? "alert" : "status"}
      className={cn(
        "field-validation-message",
        severity === "error" ? "field-validation-message--error" : "field-validation-message--warning",
        className
      )}
    >
      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />
      <span>{message}</span>
    </p>
  );
}
