"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Ban, Clock, LogOut, Loader2 } from "lucide-react";
import { cn, formatThaiDate } from "@/lib/utils";

export default function BannedPage() {
  const router = useRouter();
  const { 
    user, 
    appUser, 
    loading, 
    logout, 
    isBanned, 
    banStatus, 
    banReason, 
    timeoutRemaining 
  } = useAuth();
  const [countdown, setCountdown] = useState(timeoutRemaining);

  // Redirect if not banned
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
        return;
      }
      if (!isBanned) {
        router.push("/");
        return;
      }
    }
  }, [user, loading, isBanned, router]);

  // Countdown timer for timeout
  useEffect(() => {
    if (banStatus !== "timeout" || timeoutRemaining <= 0) return;

    setCountdown(timeoutRemaining);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Refresh the page to check if timeout is over
          window.location.reload();
          return 0;
        }
        return prev - 1;
      });
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [banStatus, timeoutRemaining]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // Format countdown
  const formatCountdown = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} นาที`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) {
      return `${hours} ชั่วโมง ${mins > 0 ? `${mins} นาที` : ""}`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days} วัน ${remainingHours > 0 ? `${remainingHours} ชั่วโมง` : ""}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-secondary">
        <Loader2 className="w-10 h-10 text-line-green animate-spin" />
      </div>
    );
  }

  const isTimeout = banStatus === "timeout";

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-secondary p-4">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-bg-card rounded-3xl shadow-card p-8 text-center">
          {/* Icon */}
          <div
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6",
              isTimeout
                ? "bg-amber-100 dark:bg-amber-900/30"
                : "bg-red-100 dark:bg-red-900/30"
            )}
          >
            {isTimeout ? (
              <Clock className="w-10 h-10 text-amber-500" />
            ) : (
              <Ban className="w-10 h-10 text-red-500" />
            )}
          </div>

          {/* Title */}
          <h1
            className={cn(
              "text-2xl font-bold mb-2",
              isTimeout ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
            )}
          >
            {isTimeout ? "บัญชีถูก Timeout" : "บัญชีถูกระงับ"}
          </h1>

          {/* Description */}
          <p className="text-text-secondary mb-6">
            {isTimeout
              ? "บัญชีของคุณถูก Timeout ชั่วคราว"
              : "บัญชีของคุณถูกระงับการใช้งาน"}
          </p>

          {/* Reason */}
          {banReason && (
            <div className="bg-bg-secondary rounded-xl p-4 mb-6">
              <p className="text-sm text-text-secondary mb-1">เหตุผล:</p>
              <p className="text-text-primary font-medium">{banReason}</p>
            </div>
          )}

          {/* Timeout Countdown */}
          {isTimeout && countdown > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 mb-6">
              <p className="text-sm text-amber-600 dark:text-amber-400 mb-1">
                เวลาที่เหลือ:
              </p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {formatCountdown(countdown)}
              </p>
            </div>
          )}

          {/* Banned Date */}
          {appUser?.bannedAt && (
            <p className="text-xs text-text-tertiary mb-6">
              {isTimeout ? "Timeout เมื่อ:" : "ถูกระงับเมื่อ:"}{" "}
              {formatThaiDate(new Date(appUser.bannedAt))}
            </p>
          )}

          {/* Info */}
          <div className="bg-bg-secondary rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-text-secondary">
              {isTimeout
                ? "กรุณารอจนกว่า Timeout จะหมดอายุ หลังจากนั้นคุณจะสามารถใช้งานได้ตามปกติ"
                : "หากคุณเชื่อว่าเป็นความผิดพลาด กรุณาติดต่อผู้ดูแลระบบ"}
            </p>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full px-6 py-3 rounded-xl bg-bg-secondary hover:bg-bg-tertiary text-text-primary font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            ออกจากระบบ
          </button>
        </div>

        {/* User Info */}
        {appUser && (
          <div className="mt-4 text-center">
            <p className="text-sm text-text-tertiary">
              เข้าสู่ระบบในฐานะ: {appUser.email}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
