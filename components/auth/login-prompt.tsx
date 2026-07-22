"use client";

import { useRouter } from "next/navigation";
import { LogIn, Lock, ArrowRight } from "lucide-react";
import { AUTH_ROUTES } from "@/lib/auth-routes";

interface LoginPromptProps {
  title?: string;
  description?: string;
  feature?: string;
  showBackButton?: boolean;
}

export default function LoginPrompt({
  title = "กรุณาเข้าสู่ระบบ",
  description = "คุณต้องเข้าสู่ระบบเพื่อใช้งานฟีเจอร์นี้",
  feature,
  showBackButton = true,
}: LoginPromptProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div
        className="w-20 h-20 rounded-full bg-bg-tertiary flex items-center justify-center mb-6"
        aria-hidden
      >
        <Lock className="w-10 h-10 text-text-tertiary" />
      </div>

      <h2 className="text-xl font-semibold text-text-primary mb-2 text-balance break-words max-w-md">
        {title}
      </h2>

      <p className="text-text-secondary mb-2 max-w-sm text-pretty break-words">
        {description}
      </p>

      {feature ? (
        <div className="bg-line-green-light rounded-xl px-4 py-2.5 mb-6 max-w-sm">
          <p className="text-sm text-line-green-link font-medium text-pretty break-words">
            {feature}
          </p>
        </div>
      ) : null}

      <div className="w-full max-w-xs space-y-3 mt-4">
        <button
          type="button"
          onClick={() => router.push(AUTH_ROUTES.login)}
          className="w-full min-h-11 py-3.5 bg-line-green-cta text-white rounded-full font-medium hover:bg-line-green-cta-hover transition-colors flex items-center justify-center gap-2 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/40 focus-visible:ring-offset-2"
        >
          <LogIn className="w-5 h-5" aria-hidden />
          เข้าสู่ระบบ
        </button>

        {showBackButton ? (
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="w-full min-h-11 py-3.5 bg-bg-tertiary text-text-primary rounded-full font-medium hover:bg-bg-secondary transition-colors flex items-center justify-center gap-2 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30"
          >
            กลับหน้าหลัก
            <ArrowRight className="w-4 h-4" aria-hidden />
          </button>
        ) : null}
      </div>

      <p className="text-xs text-text-secondary mt-6 max-w-xs text-pretty">
        ใช้เลขประจำตัวและรหัสผ่านจากโรงเรียน หรือ Passkey
      </p>
    </div>
  );
}
