"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { postResetPassword } from "@/lib/student-auth-api";

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export default function ResetPasswordPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [studentId, setStudentId] = useState("");
  const [schoolPassword, setSchoolPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("รหัสผ่านใหม่ไม่ตรงกัน");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await postResetPassword(studentId, schoolPassword, newPassword);
      if (result.access_token && result.refresh_token) {
        router.push("/home");
      } else {
        router.push("/login");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "รีเซ็ตไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-bg-primary rounded-2xl border border-border-light p-6 shadow-card">
        <RotateCcw className="w-10 h-10 text-line-green mb-4" />
        <h1 className="text-xl font-bold text-text-primary mb-2">รีเซ็ตรหัสผ่าน</h1>
        <p className="text-sm text-text-secondary mb-6">
          ใช้รหัสผ่านเริ่มต้นจากโรงเรียนเพื่อตั้งรหัสผ่านใหม่ หรือเข้าด้วย Google หากเคยเชื่อมไว้
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">เลขประจำตัว (5 หลัก)</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.replace(/\D/g, "").slice(0, 5))}
              className="w-full px-4 py-3 rounded-xl border border-border-light font-mono tracking-widest"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">รหัสผ่านจากโรงเรียน (เดิม)</label>
            <input
              type="password"
              value={schoolPassword}
              onChange={(e) => setSchoolPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border-light"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">รหัสผ่านใหม่</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border-light"
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ยืนยันรหัสผ่านใหม่</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border-light"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-line-green text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            รีเซ็ตรหัสผ่าน
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border-light" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-bg-primary px-2 text-text-tertiary">หรือ</span>
          </div>
        </div>

        <button
          type="button"
          onClick={async () => {
            setSubmitting(true);
            setError(null);
            try {
              await signIn();
              router.push("/login/change-password");
            } catch (err: unknown) {
              const authError = err as { code?: string };
              if (authError.code !== "auth/popup-closed-by-user") {
                setError("เข้าสู่ระบบ Google ไม่สำเร็จ");
              }
            } finally {
              setSubmitting(false);
            }
          }}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-border-light font-medium hover:bg-bg-secondary disabled:opacity-50"
        >
          <GoogleIcon />
          เข้าด้วย Google แล้วเปลี่ยนรหัสผ่าน
        </button>

        <Link href="/login" className="block text-center text-sm text-line-green mt-4 hover:underline">
          กลับหน้าเข้าสู่ระบบ
        </Link>
      </div>
    </div>
  );
}
