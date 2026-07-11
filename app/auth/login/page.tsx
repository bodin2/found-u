"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, Fingerprint, Shield, UserRound } from "lucide-react";
import {
  getDeviceProfile,
  resolvePostLoginPath,
} from "@/lib/student-auth-api";
import {
  clearRememberedDevice,
  getRememberedDevice,
  setRememberedDevice,
} from "@/lib/auth-device-memory";
import { AuthCard, AuthCardHeader, AuthShell } from "@/components/auth/auth-shell";
import { AUTH_ROUTES } from "@/lib/auth-routes";
import { AUTH_COPY } from "@/lib/auth-copy";
import { captureReturnToFromQuery, consumeReturnTo } from "@/lib/auth-return-to";
import { StatusAlert } from "@/components/ui/status-alert";
import { AuthLoadingScreen } from "@/components/auth/auth-loading-screen";
import {
  authAvatarRingClass,
  authDividerSectionClass,
  authFieldStackClass,
  authFormStackClass,
  authInputClassName,
  authLabelClass,
  authInlineActionRowClass,
  authLinkClass,
  authPrimaryButtonClass,
  authSecondaryButtonClass,
  authSuccessBannerClass,
  authTouchTextActionClass,
} from "@/components/auth/auth-ui";
import { fieldErrorId, fieldId } from "@/lib/feedback/types";
import { cn } from "@/lib/utils";

type LoginView = "quick" | "full";

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthLoadingScreen />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user,
    loading,
    authHydrating,
    isStudentVerified,
    isAdmin,
    mustChangePassword,
    mustSetupPin,
    signInWithStudentId,
    signInWithPin,
    signInWithPasskey,
  } = useAuth();

  const authPending = loading || authHydrating;

  const [view, setView] = useState<LoginView>("full");
  const [viewReady, setViewReady] = useState(false);
  const [rememberedId, setRememberedId] = useState("");
  const [rememberedName, setRememberedName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [profileHint, setProfileHint] = useState<{
    hasLoggedInOnce?: boolean;
    quickUnlockAvailable?: boolean;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsRegistrationHint, setNeedsRegistrationHint] = useState(false);

  useEffect(() => {
    captureReturnToFromQuery();
  }, []);

  const navigateAfterLogin = (result: {
    mustChangePassword: boolean;
    mustSetupPin: boolean;
  }) => {
    const returnTo =
      !result.mustChangePassword && !result.mustSetupPin
        ? consumeReturnTo("/home")
        : undefined;
    router.replace(
      resolvePostLoginPath({
        mustChangePassword: result.mustChangePassword,
        mustSetupPin: result.mustSetupPin,
        returnTo,
      })
    );
  };

  const initRememberedDevice = useCallback(async () => {
    const remembered = getRememberedDevice();
    if (!remembered?.studentId) {
      setView("full");
      setViewReady(true);
      return;
    }

    try {
      const profile = await getDeviceProfile(remembered.studentId);
      if (profile.quickUnlockAvailable) {
        setRememberedId(remembered.studentId);
        setRememberedName(profile.nickname || profile.firstName || remembered.nickname || "");
        setView("quick");
      } else {
        setStudentId(remembered.studentId);
        setView("full");
      }
    } catch {
      setStudentId(remembered.studentId);
      setView("full");
    } finally {
      setViewReady(true);
    }
  }, []);

  useEffect(() => {
    void initRememberedDevice();
  }, [initRememberedDevice]);

  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError && oauthError !== "auth") {
      setErrorMsg(decodeURIComponent(oauthError));
    } else if (oauthError === "auth") {
      setErrorMsg(AUTH_COPY.oauthSignInFailed);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && !authPending) {
      if (mustChangePassword) router.replace(AUTH_ROUTES.changePassword);
      else if (mustSetupPin) router.replace(AUTH_ROUTES.setupPin);
      else if (isStudentVerified || isAdmin) {
        router.replace(
          resolvePostLoginPath({ returnTo: consumeReturnTo("/home") })
        );
      }
    }
  }, [
    user,
    authPending,
    router,
    mustChangePassword,
    mustSetupPin,
    isStudentVerified,
    isAdmin,
  ]);

  useEffect(() => {
    if (view !== "full" || studentId.length !== 5) {
      setProfileHint(null);
      return;
    }

    const timer = setTimeout(() => {
      void getDeviceProfile(studentId)
        .then((profile) => {
          if (profile.exists) {
            setProfileHint({
              hasLoggedInOnce: profile.hasLoggedInOnce,
              quickUnlockAvailable: profile.quickUnlockAvailable,
            });
          } else {
            setProfileHint(null);
          }
        })
        .catch(() => setProfileHint(null));
    }, 300);

    return () => clearTimeout(timer);
  }, [studentId, view]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setNeedsRegistrationHint(false);
    try {
      const result = await signInWithStudentId(studentId, password);
      setRememberedDevice({
        studentId,
        nickname: undefined,
      });
      navigateAfterLogin(result);
    } catch (err) {
      const loginErr = err as Error & { needsRegistration?: boolean };
      setErrorMsg(loginErr.message || AUTH_COPY.signInFailed);
      setNeedsRegistrationHint(Boolean(loginErr.needsRegistration));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const result = await signInWithPin(rememberedId, pin);
      navigateAfterLogin(result);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : AUTH_COPY.pinIncorrect);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const result = await signInWithPasskey();
      navigateAfterLogin(result);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : AUTH_COPY.passkeyFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const switchToFullLogin = () => {
    setView("full");
    setPin("");
    setErrorMsg(null);
    if (rememberedId) setStudentId(rememberedId);
  };

  const switchAccount = () => {
    clearRememberedDevice();
    setRememberedId("");
    setRememberedName("");
    setStudentId("");
    setPassword("");
    setPin("");
    setView("full");
    setErrorMsg(null);
  };

  const isFirstLoginOnDevice = profileHint?.hasLoggedInOnce === false;
  const showSecondaryOnFull = !isFirstLoginOnDevice;

  const isRedirectingAfterLogin =
    !!user && (mustChangePassword || mustSetupPin || isStudentVerified || isAdmin);

  if (authPending || !viewReady || isRedirectingAfterLogin) {
    return <AuthLoadingScreen message={AUTH_COPY.loadingAccount} />;
  }

  return (
    <AuthShell
      subtitle={view === "quick" ? "ยินดีต้อนรับกลับ" : "เข้าสู่ระบบนักเรียน"}
      banner={
        searchParams.get("setup") === "done" ? (
          <div className={authSuccessBannerClass}>
            {AUTH_COPY.setupCompleteBanner}
          </div>
        ) : undefined
      }
    >
      <AuthCard>
        {view === "quick" ? (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className={authAvatarRingClass}>
                <UserRound className="w-5 h-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-text-secondary">สวัสดี</p>
                <h2 className="text-base font-semibold text-text-primary truncate">
                  {rememberedName || `นักเรียน ${rememberedId}`}
                </h2>
                <p className="text-xs text-text-secondary font-mono">{rememberedId}</p>
              </div>
            </div>

            <form onSubmit={handlePinLogin} className={authFieldStackClass}>
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
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className={authInputClassName("pin")}
                  placeholder="••••••"
                  autoComplete="current-password"
                  autoFocus
                  required
                />
              </div>
              <SubmitButton loading={submitting} label={AUTH_COPY.signIn} />
            </form>

            <div className={authDividerSectionClass}>
              <button
                type="button"
                onClick={handlePasskeyLogin}
                disabled={submitting}
                className={authSecondaryButtonClass}
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
                ) : (
                  <Fingerprint className="w-5 h-5 text-text-secondary" aria-hidden />
                )}
                {AUTH_COPY.signInWithPasskey}
              </button>
              <div className={authInlineActionRowClass}>
                <Link
                  href={AUTH_ROUTES.forgotPin}
                  className={cn(authLinkClass, "min-h-11 inline-flex items-center")}
                >
                  {AUTH_COPY.forgotPin}
                </Link>
                <button
                  type="button"
                  onClick={switchToFullLogin}
                  className={authTouchTextActionClass}
                >
                  {AUTH_COPY.signInWithPassword}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <AuthCardHeader
              icon={<Shield />}
              title={AUTH_COPY.signIn}
              description={AUTH_COPY.signInDescription}
            />

            <form onSubmit={handlePasswordLogin} className={authFieldStackClass}>
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
                  placeholder="12345"
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
              <Link href={AUTH_ROUTES.resetPassword} className={`text-sm ${authLinkClass}`}>
                {AUTH_COPY.forgotPassword}
              </Link>
              <SubmitButton loading={submitting} label={AUTH_COPY.signIn} />
            </form>

            {showSecondaryOnFull ? (
              <div className={authDividerSectionClass}>
                <button
                  type="button"
                  onClick={handlePasskeyLogin}
                  disabled={submitting}
                  className={authSecondaryButtonClass}
                >
                  <Fingerprint className="w-5 h-5 text-text-secondary" aria-hidden />
                  {AUTH_COPY.signInWithPasskey}
                </button>
              </div>
            ) : null}

            <div className={cn(authFormStackClass, "mt-6")}>
              {rememberedId ? (
                <button
                  type="button"
                  onClick={() => {
                    setView("quick");
                    setErrorMsg(null);
                  }}
                  className={`w-full text-sm ${authLinkClass}`}
                >
                  {AUTH_COPY.backToPinSignIn}
                </button>
              ) : null}

              {getRememberedDevice() ? (
                <button
                  type="button"
                  onClick={switchAccount}
                  className={cn(authTouchTextActionClass, "w-full justify-center")}
                >
                  {AUTH_COPY.useOtherAccount}
                </button>
              ) : null}

              <Link
                href={AUTH_ROUTES.hub}
                className={cn(authTouchTextActionClass, "w-full justify-center")}
              >
                {AUTH_COPY.backToHub}
              </Link>

              {!needsRegistrationHint ? (
                <p className="text-sm text-center text-text-secondary">
                  {AUTH_COPY.noAccountRegister}{" "}
                  <Link href={AUTH_ROUTES.register} className={authLinkClass}>
                    สมัครสมาชิก
                  </Link>
                </p>
              ) : null}
            </div>
          </>
        )}

        {errorMsg ? <StatusAlert variant="error" message={errorMsg} className="mt-4" /> : null}
        {needsRegistrationHint ? (
          <p className="mt-4 text-sm text-center">
            <Link href={AUTH_ROUTES.register} className={`${authLinkClass} font-medium`}>
              {AUTH_COPY.noAccountRegisterLink}
            </Link>
          </p>
        ) : null}
      </AuthCard>
    </AuthShell>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      aria-busy={loading}
      className={authPrimaryButtonClass}
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden /> : null}
      {label}
    </button>
  );
}
