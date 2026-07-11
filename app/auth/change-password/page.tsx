"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { postChangePassword } from "@/lib/student-auth-api";
import { AUTH_ROUTES } from "@/lib/auth-routes";
import { AUTH_COPY } from "@/lib/auth-copy";
import { validateChangePasswordFields } from "@/lib/auth-validation";
import { AuthLoadingScreen } from "@/components/auth/auth-loading-screen";
import { AuthCard, AuthCardHeader, AuthShell } from "@/components/auth/auth-shell";
import {
  authFormStackClass,
  authHintClass,
  authInputClassName,
  authLabelClass,
  authPrimaryButtonClass,
} from "@/components/auth/auth-ui";
import { FieldValidationMessage } from "@/components/ui/field-validation-message";
import { ValidationSummary } from "@/components/ui/validation-summary";
import { StatusAlert } from "@/components/ui/status-alert";
import { fieldErrorId, fieldId, recordToIssues } from "@/lib/feedback/types";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, loading, mustChangePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace(AUTH_ROUTES.login);
  }, [user, loading, router]);

  const clearFieldError = (name: string) => {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validateChangePasswordFields(
      currentPassword,
      newPassword,
      confirmPassword
    );
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setFormError(null);
      return;
    }
    if (!user) return;

    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      await postChangePassword(currentPassword, newPassword);
      router.replace("/home");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : AUTH_COPY.changePasswordFailed);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return <AuthLoadingScreen message={AUTH_COPY.loading} />;
  }

  return (
    <AuthShell subtitle={mustChangePassword ? AUTH_COPY.setNewPasswordTitle : AUTH_COPY.changePasswordTitle}>
      <AuthCard>
        <AuthCardHeader
          icon={<KeyRound />}
          title={mustChangePassword ? AUTH_COPY.setNewPasswordTitle : AUTH_COPY.changePasswordTitle}
          description={
            mustChangePassword
              ? AUTH_COPY.mustChangePasswordDescription
              : AUTH_COPY.changePasswordDescription
          }
        />

        <form onSubmit={handleSubmit} className={authFormStackClass} noValidate>
          <ValidationSummary issues={recordToIssues(fieldErrors)} />
          <div>
            <label htmlFor={fieldId("currentPassword")} className={authLabelClass}>
              {AUTH_COPY.currentPasswordField}
            </label>
            <input
              id={fieldId("currentPassword")}
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                clearFieldError("currentPassword");
              }}
              aria-invalid={fieldErrors.currentPassword ? true : undefined}
              aria-describedby={
                fieldErrors.currentPassword ? fieldErrorId("currentPassword") : undefined
              }
              className={authInputClassName("default", fieldErrors.currentPassword)}
              autoComplete="current-password"
              required
            />
            <FieldValidationMessage
              id={fieldErrorId("currentPassword")}
              message={fieldErrors.currentPassword}
            />
          </div>
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
              aria-describedby={
                fieldErrors.newPassword ? fieldErrorId("newPassword") : undefined
              }
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
              minLength={8}
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
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden /> : null}
            {mustChangePassword ? AUTH_COPY.saveNewPassword : AUTH_COPY.savePassword}
          </button>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
