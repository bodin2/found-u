"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import { AuthPageHeader } from "@/components/auth/auth-page-header";
import { AUTH_ROUTES } from "@/lib/auth-routes";

const secondaryButtonClass =
  "w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-border-light bg-bg-primary font-medium hover:bg-bg-secondary transition-colors";

export default function AuthHubPage() {
  return (
    <div className="min-h-screen bg-bg-secondary flex flex-col">
      <AuthPageHeader subtitle="เลือกวิธีเข้าใช้งาน" />

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-4 sm:py-6">
        <div className="bg-bg-primary rounded-2xl border border-border-light shadow-card p-5 sm:p-6">
          <Shield className="w-7 h-7 text-line-green mb-2" />
          <h2 className="text-xl font-bold text-text-primary mb-0.5">ยินดีต้อนรับ</h2>
          <p className="text-sm text-text-secondary mb-6">
            เลือกเริ่มใช้งานครั้งแรก หรือเข้าสู่ระบบด้วยบัญชีที่มีอยู่
          </p>
          <div className="space-y-3">
            <Link
              href={AUTH_ROUTES.register}
              className="w-full flex items-center justify-center gap-2 py-3 bg-line-green text-white rounded-xl font-semibold hover:bg-line-green-hover transition-colors"
            >
              เริ่มใช้งาน (สมัครสมาชิก)
            </Link>
            <Link href={AUTH_ROUTES.login} className={secondaryButtonClass}>
              เข้าสู่ระบบ
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
