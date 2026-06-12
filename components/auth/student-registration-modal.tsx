"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, GraduationCap } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { postLinkGoogle } from "@/lib/student-auth-api";

interface StudentRegistrationModalProps {
  open: boolean;
}

export function StudentRegistrationModal({ open }: StudentRegistrationModalProps) {
  const router = useRouter();
  const { user, refreshSession } = useAuth();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await postLinkGoogle(studentId, password);
      await refreshSession();
      if (result.mustChangePassword) {
        router.push("/login/change-password");
      } else {
        router.push("/home");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลงทะเบียนไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 overlay-modal overlay-modal-top flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
        <GraduationCap className="w-10 h-10 text-[#06C755] mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center">
          ลงทะเบียนนักเรียน
        </h2>
        <p className="text-sm text-gray-500 text-center mt-2 mb-6">
          กรุณาใส่เลขประจำตัวและรหัสผ่านที่โรงเรียนแจก เพื่อยืนยันว่าคุณเป็นนักเรียนในระบบ
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              เลขประจำตัว (5 หลัก)
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.replace(/\D/g, "").slice(0, 5))}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 font-mono text-lg tracking-widest"
              placeholder="12345"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              รหัสผ่านจากโรงเรียน
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#06C755] text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            ยืนยันตัวตน
          </button>
        </form>
      </div>
    </div>
  );
}
