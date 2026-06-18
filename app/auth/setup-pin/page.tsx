"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Loader2, Shield } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { postSetupPin } from "@/lib/student-auth-api";
import { setRememberedDevice } from "@/lib/auth-device-memory";
import { AUTH_ROUTES } from "@/lib/auth-routes";

export default function SetupPinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-line-green" />
        </div>
      }
    >
      <SetupPinContent />
    </Suspense>
  );
}

function SetupPinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReset = searchParams.get("reset") === "1";
  const { user, loading, sessionReady, mustSetupPin, isAdmin, appUser, refreshSession } = useAuth();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace(AUTH_ROUTES.login);
    if (!loading && user && isAdmin) router.replace("/home");
    if (!loading && sessionReady && user && !mustSetupPin && !isReset) {
      router.replace("/home");
    }
  }, [user, loading, sessionReady, router, mustSetupPin, isAdmin, isReset]);

  const showSetupForm = (mustSetupPin || isReset) && sessionReady;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin !== confirmPin) {
      setError("PIN ไม่ตรงกัน");
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      setError("PIN ต้องเป็นตัวเลข 6 หลัก");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await postSetupPin(pin);
      if (appUser?.studentId) {
        setRememberedDevice({
          studentId: appUser.studentId,
          nickname: appUser.nickname,
          firstName: appUser.firstName,
        });
      }
      await refreshSession();
      // รอ state อัปเดต — useEffect ด้านบนจะพาไป /home เมื่อ mustSetupPin เป็น false
    } catch (err) {
      setError(err instanceof Error ? err.message : "ตั้ง PIN ไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user || !showSetupForm) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-line-green" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-bg-primary rounded-2xl border border-border-light p-6 shadow-card">
        <Shield className="w-10 h-10 text-line-green mb-4" />
        <h1 className="text-xl font-bold text-text-primary mb-2">
          {isReset ? "ตั้ง PIN ใหม่" : "ตั้ง PIN สำหรับเข้าใช้งานครั้งถัดไป"}
        </h1>
        <p className="text-sm text-text-secondary mb-6">
          ครั้งต่อไปเมื่อเปิดแอป คุณจะใช้ PIN 6 หลักเพื่อเข้าสู่ระบบได้ทันที เหมือนแอปธนาคาร
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">PIN 6 หลัก</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full px-4 py-3 rounded-xl border border-border-light bg-bg-secondary font-mono text-lg tracking-widest text-center"
              required
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ยืนยัน PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full px-4 py-3 rounded-xl border border-border-light bg-bg-secondary font-mono text-lg tracking-widest text-center"
              required
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-line-green text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            บันทึก PIN
          </button>
        </form>
      </div>
    </div>
  );
}
