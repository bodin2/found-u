"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Loader2, Shield } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { postSetupPin } from "@/lib/student-auth-api";
import { setRememberedDevice } from "@/lib/auth-device-memory";
import { AUTH_ROUTES } from "@/lib/auth-routes";
import { AUTH_COPY } from "@/lib/auth-copy";
import { validatePinPair } from "@/lib/auth-validation";
import { AuthLoadingScreen } from "@/components/auth/auth-loading-screen";
import { AuthCard, AuthCardHeader, AuthShell } from "@/components/auth/auth-shell";
import {
  authFormStackClass,
  authInputClassName,
  authLabelClass,
  authPrimaryButtonClass,
} from "@/components/auth/auth-ui";
import { FieldValidationMessage } from "@/components/ui/field-validation-message";
import { ValidationSummary } from "@/components/ui/validation-summary";
import { StatusAlert } from "@/components/ui/status-alert";
import { fieldErrorId, fieldId, recordToIssues } from "@/lib/feedback/types";

export default function SetupPinPage() {
  return (
    <Suspense fallback={<AuthLoadingScreen />}>
      <SetupPinContent />
    </Suspense>
  );
}

function SetupPinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReset = searchParams.get("reset") === "1";
  const { user, loading, sessionReady, mustSetupPin, isAdmin, appUser, refreshSession } = useAuth();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace(AUTH_ROUTES.login);
    if (!loading && user && isAdmin) router.replace("/home");
    if (!loading && sessionReady && user && !mustSetupPin && !isReset) {
      router.replace("/home");
    }
  }, [user, loading, sessionReady, router, mustSetupPin, isAdmin, isReset]);

  const showSetupForm = (mustSetupPin || isReset) && sessionReady;

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
    const nextErrors = validatePinPair(pin, confirmPin);
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setFormError(null);
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      await postSetupPin(pin);
      if (appUser?.studentId) {
        setRememberedDevice({
          studentId: appUser.studentId,
          nickname: appUser.nickname,
          firstName: appUser.firstName,
        });
      }
      await refreshSession();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : AUTH_COPY.setupPinFailed);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user || !showSetupForm) {
    return <AuthLoadingScreen message={AUTH_COPY.loading} />;
  }

  return (
    <AuthShell subtitle={isReset ? AUTH_COPY.setPinResetTitle : AUTH_COPY.setPinTitle}>
      <AuthCard>
        <AuthCardHeader
          icon={<Shield />}
          title={isReset ? AUTH_COPY.setPinResetTitle : AUTH_COPY.setPinTitle}
          description={
            isReset ? AUTH_COPY.setupPinResetDescription : AUTH_COPY.setupPinDescription
          }
        />

        <form onSubmit={handleSubmit} className={authFormStackClass} noValidate>
          <ValidationSummary issues={recordToIssues(fieldErrors)} />
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
              className={authInputClassName("pin", fieldErrors.pin)}
              required
              autoComplete="new-password"
            />
            <FieldValidationMessage id={fieldErrorId("pin")} message={fieldErrors.pin} />
          </div>
          <div>
            <label htmlFor={fieldId("confirmPin")} className={authLabelClass}>
              {AUTH_COPY.confirmPinField}
            </label>
            <input
              id={fieldId("confirmPin")}
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => {
                setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                clearFieldError("confirmPin");
              }}
              aria-invalid={fieldErrors.confirmPin ? true : undefined}
              aria-describedby={
                fieldErrors.confirmPin ? fieldErrorId("confirmPin") : undefined
              }
              className={authInputClassName("pin", fieldErrors.confirmPin)}
              required
              autoComplete="new-password"
            />
            <FieldValidationMessage
              id={fieldErrorId("confirmPin")}
              message={fieldErrors.confirmPin}
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
            {AUTH_COPY.savePin}
          </button>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
