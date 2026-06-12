"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { postResetPassword } from "@/lib/student-auth-api";

export default function ResetPasswordPage() {
  const router = useRouter();
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
          ใช้รหัสผ่านเดิมที่โรงเรียนสร้างให้ เพื่อตั้งรหัสผ่านใหม่ (กรณีลืมรหัสที่เปลี่ยนแล้ว)
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

        <Link href="/login" className="block text-center text-sm text-line-green mt-4 hover:underline">
          กลับหน้าเข้าสู่ระบบ
        </Link>
      </div>
    </div>
  );
}
