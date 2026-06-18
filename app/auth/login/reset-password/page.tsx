"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound, Loader2, RotateCcw } from "lucide-react";
import { postResetPassword, postResetPasswordWithPin } from "@/lib/student-auth-api";
import { AUTH_ROUTES } from "@/lib/auth-routes";

type ResetMode = "pin" | "school";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [mode, setMode] = useState<ResetMode>("pin");
  const [studentId, setStudentId] = useState("");
  const [pin, setPin] = useState("");
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
      if (mode === "pin") {
        const result = await postResetPasswordWithPin(studentId, pin, newPassword);
        if (result.access_token && result.refresh_token) {
          router.push("/home");
        } else {
          router.push(AUTH_ROUTES.login);
        }
      } else {
        const result = await postResetPassword(studentId, schoolPassword, newPassword);
        if (result.access_token && result.refresh_token) {
          router.push("/home");
        } else {
          router.push(AUTH_ROUTES.login);
        }
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
        <p className="text-sm text-text-secondary mb-4">
          ยืนยันตัวตนด้วย PIN เพื่อตั้งรหัสผ่านใหม่
        </p>

        <div className="flex gap-2 mb-6 p-1 bg-bg-secondary rounded-xl">
          <button
            type="button"
            onClick={() => {
              setMode("pin");
              setError(null);
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              mode === "pin" ? "bg-bg-primary text-line-green shadow-sm" : "text-text-secondary"
            }`}
          >
            ใช้ PIN
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("school");
              setError(null);
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              mode === "school" ? "bg-bg-primary text-line-green shadow-sm" : "text-text-secondary"
            }`}
          >
            รหัสจากโรงเรียน
          </button>
        </div>

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

          {mode === "pin" ? (
            <div>
              <label className="block text-sm font-medium mb-1">PIN 6 หลัก</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full px-4 py-3 rounded-xl border border-border-light font-mono text-xl tracking-[0.4em] text-center"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1">รหัสผ่านจากโรงเรียน (เดิม)</label>
              <input
                type="password"
                value={schoolPassword}
                onChange={(e) => setSchoolPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border-light"
                required
              />
              <p className="text-xs text-text-tertiary mt-1">สำหรับบัญชีที่นำเข้าแบบเก่าพร้อมรหัสผ่านจากโรงเรียน</p>
            </div>
          )}

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
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />}
            รีเซ็ตรหัสผ่าน
          </button>
        </form>

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
