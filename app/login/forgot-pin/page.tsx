"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Fingerprint, KeyRound, Loader2, Shield } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import {
  postPasskeyLogin,
  postStudentLogin,
} from "@/lib/student-auth-api";

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export default function ForgotPinPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await postStudentLogin(studentId, password);
      router.push("/login/setup-pin?reset=1");
      void result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "ยืนยันตัวตนไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleRecovery = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await signIn();
      router.push("/login/setup-pin?reset=1");
    } catch (err: unknown) {
      const authError = err as { code?: string };
      if (authError.code !== "auth/popup-closed-by-user") {
        setError("เข้าสู่ระบบ Google ไม่สำเร็จ");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasskeyRecovery = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await postPasskeyLogin();
      router.push("/login/setup-pin?reset=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "PassKey ไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-bg-primary rounded-2xl border border-border-light p-6 shadow-card">
        <Shield className="w-10 h-10 text-line-green mb-4" />
        <h1 className="text-xl font-bold text-text-primary mb-2">ลืม PIN</h1>
        <p className="text-sm text-text-secondary mb-6">
          ยืนยันตัวตนด้วยวิธีใดวิธีหนึ่งด้านล่าง แล้วตั้ง PIN ใหม่
        </p>

        <form onSubmit={handlePasswordRecovery} className="space-y-3 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">เลขประจำตัว (5 หลัก)</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.replace(/\D/g, "").slice(0, 5))}
              className="w-full px-4 py-2.5 rounded-xl border border-border-light font-mono tracking-widest"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">รหัสผ่านระบบ</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border-light"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-line-green text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />}
            ยืนยันด้วยรหัสผ่าน
          </button>
        </form>

        <div className="space-y-2">
          <button
            type="button"
            onClick={handleGoogleRecovery}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-border-light font-medium hover:bg-bg-secondary disabled:opacity-50"
          >
            <GoogleIcon />
            ยืนยันด้วย Google
          </button>
          <button
            type="button"
            onClick={handlePasskeyRecovery}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-border-light font-medium hover:bg-bg-secondary disabled:opacity-50"
          >
            <Fingerprint className="w-5 h-5" />
            ยืนยันด้วย PassKey
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <Link href="/login" className="block text-center text-sm text-line-green mt-4 hover:underline">
          กลับหน้าเข้าสู่ระบบ
        </Link>
      </div>
    </div>
  );
}
