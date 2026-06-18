"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { postChangePassword } from "@/lib/student-auth-api";
import { AUTH_ROUTES } from "@/lib/auth-routes";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, loading, mustChangePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace(AUTH_ROUTES.login);
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("รหัสผ่านใหม่ไม่ตรงกัน");
      return;
    }
    if (!user) return;

    setSubmitting(true);
    setError(null);
    try {
      await postChangePassword(currentPassword, newPassword);
      router.replace("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "เปลี่ยนรหัสผ่านไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-line-green" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-bg-primary rounded-2xl border border-border-light p-6 shadow-card">
        <KeyRound className="w-10 h-10 text-line-green mb-4" />
        <h1 className="text-xl font-bold text-text-primary mb-2">
          {mustChangePassword ? "ตั้งรหัสผ่านใหม่" : "เปลี่ยนรหัสผ่าน"}
        </h1>
        <p className="text-sm text-text-secondary mb-6">
          {mustChangePassword
            ? "ครั้งแรกที่เข้าใช้งาน กรุณาเปลี่ยนรหัสผ่านจากโรงเรียนเป็นรหัสของคุณเอง"
            : "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัว และมีทั้งตัวอักษรและตัวเลข"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">รหัสผ่านปัจจุบัน</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border-light bg-bg-secondary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">รหัสผ่านใหม่</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border-light bg-bg-secondary"
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
              className="w-full px-4 py-3 rounded-xl border border-border-light bg-bg-secondary"
              required
              minLength={8}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-line-green text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            บันทึกรหัสผ่าน
          </button>
        </form>
      </div>
    </div>
  );
}
