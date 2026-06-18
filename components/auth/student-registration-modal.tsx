"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { AUTH_ROUTES } from "@/lib/auth-routes";

interface StudentRegistrationModalProps {
  open: boolean;
}

export function StudentRegistrationModal({ open }: StudentRegistrationModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!open || !user) return null;

  const goToLogin = () => {
    setLoading(true);
    router.push(AUTH_ROUTES.login);
  };

  return (
    <div className="fixed inset-0 overlay-modal overlay-modal-top flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
        <GraduationCap className="w-10 h-10 text-[#06C755] mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center">
          ยืนยันบัญชีนักเรียน
        </h2>
        <p className="text-sm text-gray-500 text-center mt-2 mb-6">
          กรุณาเข้าสู่ระบบด้วยเลขประจำตัวและรหัสผ่าน หรือ Passkey เพื่อยืนยันบัญชี
        </p>
        <button
          type="button"
          onClick={goToLogin}
          disabled={loading}
          className="w-full py-3 bg-[#06C755] text-white rounded-xl font-semibold disabled:opacity-50"
        >
          ไปหน้าเข้าสู่ระบบ
        </button>
      </div>
    </div>
  );
}
