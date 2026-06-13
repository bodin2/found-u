"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { m } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, Package, Shield, Fingerprint, UserRound } from "lucide-react";
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
import { useMediaQuery } from "@/hooks/use-media-query";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { slideUp } from "@/lib/motion";

type LoginView = "quick" | "full";

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

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
  const compactViewport = useMediaQuery("(max-height: 700px)");
  const {
    user,
    loading,
    signIn,
    isStudentVerified,
    isAdmin,
    mustChangePassword,
    mustSetupPin,
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
      setErrorMsg("เข้าสู่ระบบ Google ไม่สำเร็จ");
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && !loading) {
      if (mustChangePassword) router.replace("/login/change-password");
      else if (mustSetupPin) router.replace("/login/setup-pin");
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
    try {
      const result = await postStudentLogin(studentId, password);
      setRememberedDevice({
        studentId: result.studentId || studentId,
        nickname: result.nickname,
      });
      router.push(resolvePostLoginPath(result));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
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
      router.push(resolvePostLoginPath(result));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "PassKey ไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await signIn();
    } catch (err: unknown) {
      const authError = err as { code?: string };
      if (authError.code !== "auth/popup-closed-by-user") {
        setErrorMsg("เข้าสู่ระบบ Google ไม่สำเร็จ");
      }
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
      <header className="border-b border-border-light bg-bg-primary/80 backdrop-blur-lg shrink-0">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-line-green flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-text-primary">foundu.forum</h1>
            <p className="text-xs text-text-tertiary">
              {view === "quick" ? "ยินดีต้อนรับกลับ" : "เข้าสู่ระบบนักเรียน"}
            </p>
          </div>
        </div>
      </header>

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
                  <Link href="/login/forgot-pin" className="text-line-green hover:underline">
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
              <h2 className="text-xl font-bold text-text-primary mb-0.5">ยินดีต้อนรับ</h2>
              <p className="text-sm text-text-secondary mb-4">
                {isFirstLoginOnDevice
                  ? "ครั้งแรกใช้เลขประจำตัวและรหัสผ่านจากโรงเรียน"
                  : "ใช้เลขประจำตัวและรหัสผ่าน หรือ Google ที่เชื่อมไว้"}
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
                  href="/login/reset-password"
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
                    onClick={handleGoogleSignIn}
                    disabled={submitting}
                    className={secondaryButtonClass}
                  >
                    <GoogleIcon />
                    เข้าสู่ระบบด้วย Google
                  </button>
                  {!compactViewport && (
                    <p className="text-xs text-text-tertiary text-center">
                      ใช้ได้เมื่อเคยเชื่อมบัญชี Google แล้ว
                    </p>
                  )}
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
            </>
          )}

          {errorMsg && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
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
