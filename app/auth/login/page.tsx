"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { m } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, Fingerprint, Shield, UserRound } from "lucide-react";
import {
  getDeviceProfile,
  postPasskeyLogin,
  postPinLogin,
  postStudentLogin,
  resolvePostLoginPath,
} from "@/lib/student-auth-api";
import {
  clearRememberedDevice,
  getRememberedDevice,
  setRememberedDevice,
} from "@/lib/auth-device-memory";
import { MotionProvider } from "@/components/motion/motion-provider";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { slideUp } from "@/lib/motion";
import { AuthPageHeader } from "@/components/auth/auth-page-header";
import { AUTH_ROUTES } from "@/lib/auth-routes";

type LoginView = "quick" | "full";

const secondaryButtonClass =
  "w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-border-light bg-bg-primary font-medium hover:bg-bg-secondary transition-colors disabled:opacity-50";

export default function LoginPage() {
  return (
    <MotionProvider>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-bg-secondary">
            <Loader2 className="w-10 h-10 animate-spin text-line-green" />
          </div>
        }
      >
        <LoginPageContent />
      </Suspense>
    </MotionProvider>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reduced = useReducedMotion();
  const {
    user,
    loading,
    isStudentVerified,
    isAdmin,
    mustChangePassword,
    mustSetupPin,
    refreshSession,
  } = useAuth();

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
      setErrorMsg("เข้าสู่ระบบไม่สำเร็จ");
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && !loading) {
      if (mustChangePassword) router.replace(AUTH_ROUTES.changePassword);
      else if (mustSetupPin) router.replace(AUTH_ROUTES.setupPin);
      else if (isStudentVerified || isAdmin) router.replace("/home");
    }
  }, [user, loading, router, mustChangePassword, mustSetupPin, isStudentVerified, isAdmin]);

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
      const result = await postStudentLogin(studentId, password);
      setRememberedDevice({
        studentId: result.studentId || studentId,
        nickname: result.nickname,
      });
      await refreshSession();
      router.push(resolvePostLoginPath(result));
    } catch (err) {
      const loginErr = err as Error & { needsRegistration?: boolean };
      setErrorMsg(loginErr.message || "เข้าสู่ระบบไม่สำเร็จ");
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
      const result = await postPinLogin(rememberedId, pin);
      await refreshSession();
      router.push(resolvePostLoginPath(result));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "PIN ไม่ถูกต้อง");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const result = await postPasskeyLogin();
      await refreshSession();
      router.push(resolvePostLoginPath(result));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "PassKey ไม่สำเร็จ");
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

  if (loading || !viewReady || isRedirectingAfterLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-secondary">
        <Loader2 className="w-10 h-10 animate-spin text-line-green" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-secondary flex flex-col">
      <AuthPageHeader
        subtitle={view === "quick" ? "ยินดีต้อนรับกลับ" : "เข้าสู่ระบบนักเรียน"}
      />

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-4 sm:py-6">
        <div className="bg-bg-primary rounded-2xl border border-border-light shadow-card p-5 sm:p-6">
          {view === "quick" ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-line-green/10 flex items-center justify-center">
                  <UserRound className="w-6 h-6 text-line-green" />
                </div>
                <div>
                  <p className="text-sm text-text-tertiary">สวัสดี</p>
                  <h2 className="text-lg font-bold text-text-primary">
                    {rememberedName || `นักเรียน ${rememberedId}`}
                  </h2>
                  <p className="text-xs text-text-tertiary font-mono">{rememberedId}</p>
                </div>
              </div>

              <form onSubmit={handlePinLogin} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    ใส่ PIN 6 หลัก
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full px-4 py-3 rounded-xl border border-border-light bg-bg-primary font-mono text-2xl tracking-[0.5em] text-center"
                    placeholder="••••••"
                    autoFocus
                    required
                  />
                </div>
                <SubmitButton loading={submitting} label="เข้าสู่ระบบ" />
              </form>

              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={handlePasskeyLogin}
                  disabled={submitting}
                  className={secondaryButtonClass}
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Fingerprint className="w-5 h-5 text-text-secondary" />
                  )}
                  เข้าด้วย PassKey
                </button>
                <div className="flex justify-between text-sm pt-1">
                  <Link href={AUTH_ROUTES.forgotPin} className="text-line-green hover:underline">
                    ลืม PIN?
                  </Link>
                  <button
                    type="button"
                    onClick={switchToFullLogin}
                    className="text-text-secondary hover:text-text-primary"
                  >
                    เข้าด้วยวิธีอื่น
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Shield className="w-7 h-7 text-line-green mb-2" />
              <h2 className="text-xl font-bold text-text-primary mb-0.5">เข้าสู่ระบบ</h2>
              <p className="text-sm text-text-secondary mb-4">
                ใช้เลขประจำตัวและรหัสผ่าน หรือ Passkey
              </p>

              <m.form
                onSubmit={handlePasswordLogin}
                className="space-y-3"
                initial={reduced ? false : slideUp.initial}
                animate={slideUp.animate}
                transition={slideUp.transition}
              >
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    เลขประจำตัว (5 หลัก)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value.replace(/\D/g, "").slice(0, 5))}
                    className="w-full px-4 py-2.5 rounded-xl border border-border-light bg-bg-primary font-mono text-lg tracking-widest"
                    placeholder="12345"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    รหัสผ่าน
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border-light bg-bg-primary"
                    required
                  />
                </div>
                <Link
                  href={AUTH_ROUTES.resetPassword}
                  className="text-sm text-line-green hover:underline block"
                >
                  ลืมรหัสผ่าน?
                </Link>
                <SubmitButton loading={submitting} label="เข้าสู่ระบบ" />
              </m.form>

              {showSecondaryOnFull && (
                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={handlePasskeyLogin}
                    disabled={submitting}
                    className={secondaryButtonClass}
                  >
                    <Fingerprint className="w-5 h-5 text-text-secondary" />
                    เข้าสู่ระบบด้วย PassKey
                  </button>
                </div>
              )}

              {rememberedId && (
                <button
                  type="button"
                  onClick={() => {
                    setView("quick");
                    setErrorMsg(null);
                  }}
                  className="w-full mt-4 text-sm text-line-green hover:underline"
                >
                  กลับไปหน้า PIN
                </button>
              )}

              {getRememberedDevice() && (
                <button
                  type="button"
                  onClick={switchAccount}
                  className="w-full mt-2 text-sm text-text-tertiary hover:text-text-secondary"
                >
                  ใช้บัญชีอื่น
                </button>
              )}

              <Link
                href={AUTH_ROUTES.hub}
                className="block w-full mt-3 text-sm text-center text-text-secondary hover:text-text-primary"
              >
                กลับ
              </Link>

              <p className="text-sm text-center text-text-secondary mt-4">
                ยังไม่ได้สมัคร?{" "}
                <Link href={AUTH_ROUTES.register} className="text-line-green hover:underline">
                  เริ่มใช้งาน
                </Link>
              </p>
            </>
          )}

          {errorMsg && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
          )}
          {needsRegistrationHint && (
            <p className="mt-2 text-sm text-center">
              <Link href={AUTH_ROUTES.register} className="text-line-green hover:underline font-medium">
                ยังไม่ได้สมัคร? เริ่มใช้งานที่นี่
              </Link>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-3 bg-line-green text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
      {label}
    </button>
  );
}
