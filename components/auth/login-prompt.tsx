"use client";

import { useRouter } from "next/navigation";
import { LogIn, Lock, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

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
  const { signIn, loading } = useAuth();

  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6">
        <Lock className="w-10 h-10 text-gray-400 dark:text-gray-500" />
      </div>

      {/* Title */}
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h2>

      {/* Description */}
      <p className="text-gray-500 dark:text-gray-400 mb-2 max-w-sm">
        {description}
      </p>

      {/* Feature hint */}
      {feature && (
        <div className="bg-[#e8f8ef] dark:bg-[#06C755]/20 rounded-lg px-4 py-2 mb-6">
          <p className="text-sm text-[#06C755] font-medium">
            ✨ {feature}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="w-full max-w-xs space-y-3 mt-4">
        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full py-3.5 bg-[#06C755] text-white rounded-full font-medium hover:bg-[#05b34d] transition-colors flex items-center justify-center gap-2"
        >
          <LogIn className="w-5 h-5" />
          เข้าสู่ระบบด้วย Google
        </button>

        {showBackButton && (
          <button
            onClick={() => router.push("/")}
            className="w-full py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
          >
            กลับหน้าหลัก
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Security note */}
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-6 max-w-xs">
        🔒 ข้อมูลของคุณปลอดภัย เราใช้ Google Sign-In ซึ่งไม่เก็บรหัสผ่านของคุณ
      </p>
    </div>
  );
}
