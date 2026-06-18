"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Fingerprint, KeyRound, Loader2, Shield } from "lucide-react";
import {
  postPasskeyLogin,
  postStudentLogin,
} from "@/lib/student-auth-api";
import { AUTH_ROUTES } from "@/lib/auth-routes";

export default function ForgotPinPage() {
  const router = useRouter();
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
      router.push(`${AUTH_ROUTES.setupPin}?reset=1`);
      void result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "ยืนยันตัวตนไม่สำเร็จ");
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
            onClick={handlePasskeyRecovery}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-border-light font-medium hover:bg-bg-secondary disabled:opacity-50"
          >
            <Fingerprint className="w-5 h-5" />
            ยืนยันด้วย PassKey
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <p className="mt-4 text-xs text-text-tertiary text-center">
          หากลืมทั้งรหัสผ่านและ PIN กรุณาติดต่อผู้ดูแลระบบหรือ Support
        </p>

        <Link href={AUTH_ROUTES.login} className="block text-center text-sm text-line-green mt-4 hover:underline">
          กลับหน้าเข้าสู่ระบบ
        </Link>
      </div>
    </div>
  );
}
