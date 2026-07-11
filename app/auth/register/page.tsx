"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { FormStepper } from "@/components/ui/form-stepper";
import { completeRegistration, lookupRegistration } from "@/lib/student-auth-api";
import {
  AUTH_VALIDATION_MESSAGES,
  isValidStudentId,
  validatePasswordPair,
  validatePinPair,
} from "@/lib/auth-validation";
import { AUTH_ROUTES } from "@/lib/auth-routes";
import { AUTH_COPY } from "@/lib/auth-copy";
import { AuthCard, AuthCardHeader, AuthFooter, AuthShell } from "@/components/auth/auth-shell";
import {
  authFormStackClass,
  authHintClass,
  authInputClassName,
  authLabelClass,
  authLinkClass,
  authMetaLabelClass,
  authPrimaryButtonClass,
  authProfileValueClass,
  authSecondaryButtonClass,
  authStickyActionsShellClass,
  authDualActionGridClass,
  authStickyScrollPadClass,
  authTouchTextActionClass,
} from "@/components/auth/auth-ui";
import { FieldValidationMessage } from "@/components/ui/field-validation-message";
import { ValidationSummary } from "@/components/ui/validation-summary";
import { StatusAlert } from "@/components/ui/status-alert";
import { fieldErrorId, fieldId, recordToIssues } from "@/lib/feedback/types";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "student-id", label: AUTH_COPY.registerStepStudentId },
  { id: "confirm", label: AUTH_COPY.registerStepConfirm },
  { id: "password", label: AUTH_COPY.registerStepPassword },
  { id: "pin", label: AUTH_COPY.registerStepPin },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [studentId, setStudentId] = useState("");
  const [registrationToken, setRegistrationToken] = useState("");
  const [profile, setProfile] = useState<{
    firstName: string;
    lastName: string;
    gradeLevel?: string | null;
    roomNumber?: string | null;
  } | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLookup = async () => {
    if (!isValidStudentId(studentId)) {
      setErrors({ studentId: AUTH_VALIDATION_MESSAGES.studentId });
      setFormError(null);
      return;
    }
    setSubmitting(true);
    setErrors({});
    setFormError(null);
    try {
      const result = await lookupRegistration(studentId);
      if (!result.found) {
        setErrors({
          studentId: result.message || AUTH_COPY.studentIdNotFound,
        });
        return;
      }
      if (result.alreadyRegistered) {
        setErrors({
          studentId: result.message || AUTH_COPY.alreadyRegistered,
        });
        return;
      }
      if (!result.canRegister || !result.registrationToken) {
        setFormError(AUTH_COPY.cannotRegister);
        return;
      }
      setProfile({
        firstName: result.firstName || "",
        lastName: result.lastName || "",
        gradeLevel: result.gradeLevel,
        roomNumber: result.roomNumber,
      });
      setRegistrationToken(result.registrationToken);
      setStep(1);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : AUTH_COPY.lookupFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    setErrors({});
    setFormError(null);
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      const next = validatePasswordPair(password, confirmPassword);
      if (Object.keys(next).length > 0) {
        setErrors(next);
        return;
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      const next = validatePinPair(pin, confirmPin);
      if (Object.keys(next).length > 0) {
        setErrors(next);
        return;
      }
      setSubmitting(true);
      try {
        await completeRegistration({
          studentId,
          registrationToken,
          password,
          pin,
        });
        router.push("/home");
      } catch (err) {
        setFormError(err instanceof Error ? err.message : AUTH_COPY.registerFailed);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    setErrors({});
    setFormError(null);
    if (step === 1) {
      setProfile(null);
      setRegistrationToken("");
    }
    setStep((s) => Math.max(0, s - 1));
  };

  return (
    <AuthShell subtitle={AUTH_COPY.registerSubtitle}>
      <AuthCard className={step > 0 ? authStickyScrollPadClass : undefined}>
        <AuthCardHeader
          icon={<UserPlus />}
          title={AUTH_COPY.registerTitle}
          description={AUTH_COPY.registerDescription}
        />

        <FormStepper steps={[...STEPS]} currentStep={step} tone="quiet" className="mb-5" />

        <div className={authFormStackClass}>
          {step === 0 ? (
            <>
              <ValidationSummary issues={recordToIssues(errors)} />
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
                    if (errors.studentId) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.studentId;
                        return next;
                      });
                    }
                  }}
                  aria-invalid={errors.studentId ? true : undefined}
                  aria-describedby={errors.studentId ? fieldErrorId("studentId") : undefined}
                  className={authInputClassName("studentId", errors.studentId)}
                  placeholder="12345"
                  autoFocus
                />
                <FieldValidationMessage
                  id={fieldErrorId("studentId")}
                  message={errors.studentId}
                />
              </div>
              <p className={authHintClass}>{AUTH_COPY.registerStudentIdHint}</p>
            </>
          ) : null}

          {step === 1 && profile ? (
            <>
              <p className="text-sm font-medium text-text-primary">{AUTH_COPY.profilePanelTitle}</p>
              <dl className="grid gap-3">
                <div>
                  <dt className={authMetaLabelClass}>{AUTH_COPY.fullNameLabel}</dt>
                  <dd className={authProfileValueClass}>
                    {profile.firstName} {profile.lastName}
                  </dd>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className={authMetaLabelClass}>{AUTH_COPY.gradeLevelLabel}</dt>
                    <dd className={authProfileValueClass}>{profile.gradeLevel || "—"}</dd>
                  </div>
                  <div>
                    <dt className={authMetaLabelClass}>{AUTH_COPY.roomLabel}</dt>
                    <dd className={authProfileValueClass}>{profile.roomNumber || "—"}</dd>
                  </div>
                </div>
                <div>
                  <dt className="sr-only">{AUTH_COPY.studentIdMetaPrefix}</dt>
                  <dd className={`${authMetaLabelClass} font-mono`}>
                    {AUTH_COPY.studentIdMetaPrefix}: {studentId}
                  </dd>
                </div>
              </dl>
              <p className={authHintClass}>{AUTH_COPY.profileMismatchHint}</p>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <ValidationSummary issues={recordToIssues(errors)} />
              <div>
                <label htmlFor={fieldId("password")} className={authLabelClass}>
                  {AUTH_COPY.passwordField}
                </label>
                <input
                  id={fieldId("password")}
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.password;
                        return next;
                      });
                    }
                  }}
                  aria-invalid={errors.password ? true : undefined}
                  aria-describedby={errors.password ? fieldErrorId("password") : undefined}
                  className={authInputClassName("default", errors.password)}
                  minLength={8}
                  autoFocus
                />
                <FieldValidationMessage id={fieldErrorId("password")} message={errors.password} />
                <p className={`${authHintClass} mt-1`}>{AUTH_COPY.passwordRules}</p>
              </div>
              <div>
                <label htmlFor={fieldId("confirmPassword")} className={authLabelClass}>
                  {AUTH_COPY.confirmPasswordField}
                </label>
                <input
                  id={fieldId("confirmPassword")}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.confirmPassword;
                        return next;
                      });
                    }
                  }}
                  aria-invalid={errors.confirmPassword ? true : undefined}
                  aria-describedby={
                    errors.confirmPassword ? fieldErrorId("confirmPassword") : undefined
                  }
                  className={authInputClassName("default", errors.confirmPassword)}
                />
                <FieldValidationMessage
                  id={fieldErrorId("confirmPassword")}
                  message={errors.confirmPassword}
                />
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <ValidationSummary issues={recordToIssues(errors)} />
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
                    if (errors.pin) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.pin;
                        return next;
                      });
                    }
                  }}
                  aria-invalid={errors.pin ? true : undefined}
                  aria-describedby={errors.pin ? fieldErrorId("pin") : undefined}
                  className={authInputClassName("pin", errors.pin)}
                  placeholder="••••••"
                  autoFocus
                />
                <FieldValidationMessage id={fieldErrorId("pin")} message={errors.pin} />
                <p className={`${authHintClass} mt-1`}>{AUTH_COPY.pinQuickUnlock}</p>
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
                    if (errors.confirmPin) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.confirmPin;
                        return next;
                      });
                    }
                  }}
                  aria-invalid={errors.confirmPin ? true : undefined}
                  aria-describedby={errors.confirmPin ? fieldErrorId("confirmPin") : undefined}
                  className={authInputClassName("pin", errors.confirmPin)}
                  placeholder="••••••"
                />
                <FieldValidationMessage
                  id={fieldErrorId("confirmPin")}
                  message={errors.confirmPin}
                />
              </div>
            </>
          ) : null}

          {formError ? <StatusAlert variant="error" message={formError} /> : null}
        </div>

        {step === 0 ? (
          <button
            type="button"
            onClick={handleLookup}
            disabled={submitting || !isValidStudentId(studentId)}
            aria-busy={submitting}
            className={cn(authPrimaryButtonClass, "mt-6")}
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {AUTH_COPY.searchStudent}
          </button>
        ) : (
          <div className={authStickyActionsShellClass}>
            <div className={authDualActionGridClass}>
              <button
                type="button"
                onClick={handleBack}
                disabled={submitting}
                aria-busy={submitting}
                className={authSecondaryButtonClass}
              >
                {AUTH_COPY.backStep}
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={submitting}
                aria-busy={submitting}
                className={authPrimaryButtonClass}
              >
                {submitting && step === 3 ? (
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
                ) : null}
                {step === 3
                  ? AUTH_COPY.startUsing
                  : step === 1
                    ? AUTH_COPY.confirmProfile
                    : AUTH_COPY.nextStep}
              </button>
            </div>
            {step === 1 ? (
              <button
                type="button"
                onClick={() => {
                  setStep(0);
                  setProfile(null);
                  setRegistrationToken("");
                  setErrors({});
                  setFormError(null);
                }}
                className={cn(authTouchTextActionClass, "w-full justify-center mt-3")}
              >
                {AUTH_COPY.notMeEditId}
              </button>
            ) : null}
          </div>
        )}

      </AuthCard>

      {step === 0 ? (
        <AuthFooter>
          <Link href={AUTH_ROUTES.login} className={authLinkClass}>
            {AUTH_COPY.hasAccountSignIn}
          </Link>
        </AuthFooter>
      ) : null}
    </AuthShell>
  );
}
