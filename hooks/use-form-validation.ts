"use client";

import { useCallback, useMemo, useState } from "react";
import {
  type FeedbackSeverity,
  type ValidationIssue,
  fieldId,
  getFieldLabel,
  recordToIssues,
} from "@/lib/feedback/types";

type UseFormValidationOptions = {
  labelOverrides?: Record<string, string>;
};

export function useFormValidation(options: UseFormValidationOptions = {}) {
  const { labelOverrides } = options;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<Record<string, string>>({});

  const clearField = useCallback((name: string, severity: FeedbackSeverity = "error") => {
    if (severity === "error") {
      setErrors((prev) => {
        if (!prev[name]) return prev;
        const next = { ...prev };
        delete next[name];
        return next;
      });
      return;
    }
    setWarnings((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const setFieldError = useCallback((name: string, message: string) => {
    setErrors((prev) => ({ ...prev, [name]: message }));
  }, []);

  const setFieldWarning = useCallback((name: string, message: string) => {
    setWarnings((prev) => ({ ...prev, [name]: message }));
  }, []);

  const clearAll = useCallback(() => {
    setErrors({});
    setWarnings({});
  }, []);

  const errorIssues = useMemo(
    () => recordToIssues(errors, "error", labelOverrides),
    [errors, labelOverrides]
  );

  const warningIssues = useMemo(
    () => recordToIssues(warnings, "warning", labelOverrides),
    [warnings, labelOverrides]
  );

  const getFieldLabelFor = useCallback(
    (name: string) => getFieldLabel(name, labelOverrides),
    [labelOverrides]
  );

  const getFieldDomId = useCallback((name: string) => fieldId(name), []);

  return {
    errors,
    warnings,
    setErrors,
    setWarnings,
    setFieldError,
    setFieldWarning,
    clearField,
    clearAll,
    errorIssues,
    warningIssues,
    getFieldLabelFor,
    getFieldDomId,
  };
}

export type { ValidationIssue };
