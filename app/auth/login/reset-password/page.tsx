"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { KeyRound, Loader2, RotateCcw } from "lucide-react";
import { postResetPassword, postResetPasswordWithPin } from "@/lib/student-auth-api";
import { AUTH_ROUTES } from "@/lib/auth-routes";
import { AUTH_COPY } from "@/lib/auth-copy";
import {
  isValidPin,
  isValidStudentId,
  isValidNewPassword,
  AUTH_VALIDATION_MESSAGES,
} from "@/lib/auth-validation";
import { FieldValidationMessage } from "@/components/ui/field-validation-message";
import { ValidationSummary } from "@/components/ui/validation-summary";
import { StatusAlert } from "@/components/ui/status-alert";
import { cn } from "@/lib/utils";
import { fieldErrorId, fieldId, recordToIssues } from "@/lib/feedback/types";
import { AuthCard, AuthCardHeader, AuthFooter, AuthShell } from "@/components/auth/auth-shell";
import {
  authFormStackClass,
  authHintClass,
  authInputClassName,
  authLabelClass,
  authLinkClass,
  authPrimaryButtonClass,
  authSegmentTrackClass,
  authTabActiveClass,
  authTabInactiveClass,
} from "@/components/auth/auth-ui";

type ResetMode = "pin" | "school";

export default function ResetPasswordPage() {
  const router = useRouter();
  const modeTabsId = useId();
  const [mode, setMode] = useState<ResetMode>("pin");
  const [studentId, setStudentId] = useState("");
  const [pin, setPin] = useState("");
  const [schoolPassword, setSchoolPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const clearFieldError = (name: string) => {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const validateForm = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!isValidStudentId(studentId)) {
      errors.studentId = AUTH_VALIDATION_MESSAGES.studentId;
    }
    if (mode === "pin") {
      if (!isValidPin(pin)) {
        errors.pin = AUTH_VALIDATION_MESSAGES.pin;
      }
    } else if (!schoolPassword.trim()) {
      errors.schoolPassword = AUTH_VALIDATION_MESSAGES.schoolPasswordRequired;
    }
    if (!isValidNewPassword(newPassword)) {
      errors.newPassword = AUTH_VALIDATION_MESSAGES.passwordWeak;
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = AUTH_VALIDATION_MESSAGES.passwordMismatch;
    }
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setFormError(null);
      return;
    }
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      if (mode === "pin") {
        const result = await postResetPasswordWithPin(studentId, pin, newPassword);
        if (result.access_token && result.refresh_token) {
          router.push("/home");
        } else {
          router.push(AUTH_ROUTES.login);
        }
      } else {
        const result = await postResetPassword(studentId, schoolPassword, newPassword);
        if (result.access_token && result.refresh_token) {
          router.push("/home");
        } else {
          router.push(AUTH_ROUTES.login);
        }
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : AUTH_COPY.resetPasswordFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (next: ResetMode) => {
    setMode(next);
    setFieldErrors({});
    setFormError(null);
  };

  return (
    <AuthShell subtitle={AUTH_COPY.resetPasswordTitle}>
      <AuthCard>
        <AuthCardHeader
          icon={<RotateCcw />}
          title={AUTH_COPY.resetPasswordTitle}
          description={AUTH_COPY.resetPasswordDescription}
        />

        <div
          id={modeTabsId}
          role="tablist"
          aria-label="วิธียืนยันตัวตน"
          className={authSegmentTrackClass}
        >
          <button
            type="button"
            role="tab"
            id={`${modeTabsId}-pin`}
            aria-selected={mode === "pin"}
            aria-controls={`${modeTabsId}-panel`}
            onClick={() => switchMode("pin")}
            className={cn(
              "flex-1 min-h-11 py-2.5 px-1 text-xs sm:text-sm text-center leading-tight rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green-light touch-manipulation",
              mode === "pin" ? authTabActiveClass : authTabInactiveClass
            )}
          >
            {AUTH_COPY.tabVerifyPin}
          </button>
          <button
            type="button"
            role="tab"
            id={`${modeTabsId}-school`}
            aria-selected={mode === "school"}
            aria-controls={`${modeTabsId}-panel`}
            onClick={() => switchMode("school")}
            className={cn(
              "flex-1 min-h-11 py-2.5 px-1 text-xs sm:text-sm text-center leading-tight rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green-light touch-manipulation",
              mode === "school" ? authTabActiveClass : authTabInactiveClass
            )}
          >
            {AUTH_COPY.tabSchoolPassword}
          </button>
        </div>

        <form
          id={`${modeTabsId}-panel`}
          role="tabpanel"
          aria-labelledby={mode === "pin" ? `${modeTabsId}-pin` : `${modeTabsId}-school`}
          onSubmit={handleSubmit}
          className={authFormStackClass}
          noValidate
        >
          <ValidationSummary issues={recordToIssues(fieldErrors)} />
          <div>
            <label htmlFor={fieldId("studentId")} className={authLabelClass}>
              {AUTH_COPY.studentIdField}
            </label>
            <input
              id={fieldId("studentId")}
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={studentId}
              onChange={(e) => {
                setStudentId(e.target.value.replace(/\D/g, "").slice(0, 5));
                clearFieldError("studentId");
              }}
              aria-invalid={fieldErrors.studentId ? true : undefined}
              aria-describedby={fieldErrors.studentId ? fieldErrorId("studentId") : undefined}
              className={authInputClassName("studentId", fieldErrors.studentId)}
              autoComplete="username"
              required
            />
            <FieldValidationMessage
              id={fieldErrorId("studentId")}
              message={fieldErrors.studentId}
            />
          </div>

          {mode === "pin" ? (
            <div>
              <label htmlFor={fieldId("pin")} className={authLabelClass}>
                {AUTH_COPY.pinField}
              </label>
              <input
                id={fieldId("pin")}
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                  clearFieldError("pin");
                }}
                aria-invalid={fieldErrors.pin ? true : undefined}
                aria-describedby={fieldErrors.pin ? fieldErrorId("pin") : undefined}
                className={authInputClassName("pinCompact", fieldErrors.pin)}
                autoComplete="current-password"
                required
              />
              <FieldValidationMessage id={fieldErrorId("pin")} message={fieldErrors.pin} />
            </div>
          ) : (
            <div>
              <label htmlFor={fieldId("schoolPassword")} className={authLabelClass}>
                {AUTH_COPY.schoolPasswordField}
              </label>
              <input
                id={fieldId("schoolPassword")}
                type="password"
                value={schoolPassword}
                onChange={(e) => {
                  setSchoolPassword(e.target.value);
                  clearFieldError("schoolPassword");
                }}
                aria-invalid={fieldErrors.schoolPassword ? true : undefined}
                aria-describedby={
                  fieldErrors.schoolPassword ? fieldErrorId("schoolPassword") : undefined
                }
                className={authInputClassName("default", fieldErrors.schoolPassword)}
                autoComplete="current-password"
                required
              />
              <FieldValidationMessage
                id={fieldErrorId("schoolPassword")}
                message={fieldErrors.schoolPassword}
              />
              <p className={`${authHintClass} mt-1`}>{AUTH_COPY.schoolPasswordHint}</p>
            </div>
          )}

          <div>
            <label htmlFor={fieldId("newPassword")} className={authLabelClass}>
              {AUTH_COPY.newPasswordField}
            </label>
            <input
              id={fieldId("newPassword")}
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                clearFieldError("newPassword");
              }}
              aria-invalid={fieldErrors.newPassword ? true : undefined}
              aria-describedby={fieldErrors.newPassword ? fieldErrorId("newPassword") : undefined}
              className={authInputClassName("default", fieldErrors.newPassword)}
              autoComplete="new-password"
              required
              minLength={8}
            />
            <FieldValidationMessage
              id={fieldErrorId("newPassword")}
              message={fieldErrors.newPassword}
            />
            <p className={`${authHintClass} mt-1`}>{AUTH_COPY.passwordRules}</p>
          </div>
          <div>
            <label htmlFor={fieldId("confirmPassword")} className={authLabelClass}>
              {AUTH_COPY.confirmNewPasswordField}
            </label>
            <input
              id={fieldId("confirmPassword")}
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                clearFieldError("confirmPassword");
              }}
              aria-invalid={fieldErrors.confirmPassword ? true : undefined}
              aria-describedby={
                fieldErrors.confirmPassword ? fieldErrorId("confirmPassword") : undefined
              }
              className={authInputClassName("default", fieldErrors.confirmPassword)}
              autoComplete="new-password"
              required
            />
            <FieldValidationMessage
              id={fieldErrorId("confirmPassword")}
              message={fieldErrors.confirmPassword}
            />
          </div>
          {formError && <StatusAlert variant="error" message={formError} />}
          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            className={authPrimaryButtonClass}
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
            ) : (
              <KeyRound className="w-5 h-5" aria-hidden />
            )}
            {AUTH_COPY.saveNewPassword}
          </button>
        </form>

        <p className={`mt-6 text-center ${authHintClass}`}>
          {AUTH_COPY.forgotBothCredentials} {AUTH_COPY.forgotBothHelp}
        </p>

        <AuthFooter>
          <Link href={AUTH_ROUTES.login} className={authLinkClass}>
            {AUTH_COPY.backToSignIn}
          </Link>
        </AuthFooter>
      </AuthCard>
    </AuthShell>
  );
}
