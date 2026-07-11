"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Fingerprint, KeyRound, Loader2, Shield } from "lucide-react";
import { postPasskeyLogin, postStudentLogin } from "@/lib/student-auth-api";
import { AUTH_ROUTES } from "@/lib/auth-routes";
import { AUTH_COPY } from "@/lib/auth-copy";
import { AUTH_VALIDATION_MESSAGES, isValidStudentId } from "@/lib/auth-validation";
import { AuthCard, AuthCardHeader, AuthFooter, AuthShell } from "@/components/auth/auth-shell";
import {
  authDividerSectionClass,
  authFieldStackClass,
  authHintClass,
  authInputClassName,
  authLabelClass,
  authLinkClass,
  authPrimaryButtonClass,
  authSecondaryButtonClass,
} from "@/components/auth/auth-ui";
import { StatusAlert } from "@/components/ui/status-alert";
import { fieldId } from "@/lib/feedback/types";

export default function ForgotPinPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidStudentId(studentId)) {
      setError(AUTH_VALIDATION_MESSAGES.studentId);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await postStudentLogin(studentId, password);
      router.push(`${AUTH_ROUTES.setupPin}?reset=1`);
      void result;
    } catch (err) {
      setError(err instanceof Error ? err.message : AUTH_COPY.verificationFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasskeyRecovery = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await postPasskeyLogin();
      router.push(`${AUTH_ROUTES.setupPin}?reset=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : AUTH_COPY.passkeyFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell subtitle="ลืม PIN">
      <AuthCard>
        <AuthCardHeader
          icon={<Shield />}
          title={AUTH_COPY.forgotPinTitle}
          description={AUTH_COPY.forgotPinDescription}
        />

        <form onSubmit={handlePasswordRecovery} className={authFieldStackClass} noValidate>
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
              onChange={(e) => setStudentId(e.target.value.replace(/\D/g, "").slice(0, 5))}
              className={authInputClassName("studentId")}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label htmlFor={fieldId("password")} className={authLabelClass}>
              {AUTH_COPY.passwordField}
            </label>
            <input
              id={fieldId("password")}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authInputClassName("default")}
              autoComplete="current-password"
              required
            />
          </div>
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
            {AUTH_COPY.verifyWithPassword}
          </button>
        </form>

        <div className={authDividerSectionClass}>
          <button
            type="button"
            onClick={handlePasskeyRecovery}
            disabled={submitting}
            aria-busy={submitting}
            className={authSecondaryButtonClass}
          >
            <Fingerprint className="w-5 h-5" aria-hidden />
            {AUTH_COPY.verifyWithPasskey}
          </button>
        </div>

        {error ? <StatusAlert variant="error" message={error} className="mt-4" /> : null}

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
