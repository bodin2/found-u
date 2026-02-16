"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { requestBetaAccess } from "@/lib/firestore";
import { 
  Beaker, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Send, 
  Loader2, 
  LogOut,
  Lock,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function PendingPage() {
  const router = useRouter();
  const { user, appUser, appSettings, betaStatus, isBetaApproved, isAdmin, logout, loading } = useAuth();
  const [isRequesting, setIsRequesting] = useState(false);
  const [localStatus, setLocalStatus] = useState(betaStatus);

  // Sync local status with context
  useEffect(() => {
    setLocalStatus(betaStatus);
  }, [betaStatus]);

  // Redirect logic
  useEffect(() => {
    if (loading) return;

    // If not logged in, go to login
    if (!user) {
      router.push("/login");
      return;
    }

    // If restrict mode is off OR user is approved, go to home
    if (!appSettings.restrictModeEnabled || isBetaApproved) {
      router.push("/");
      return;
    }
  }, [loading, user, appSettings.restrictModeEnabled, isBetaApproved, router]);

  const handleRequestAccess = async () => {
    if (!appUser) return;
    
    setIsRequesting(true);
    try {
      await requestBetaAccess(appUser.uid);
      setLocalStatus("pending");
    } catch (error) {
      console.error("Error requesting beta access:", error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-secondary">
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 text-line-green animate-spin mb-4" />
          <p className="text-text-secondary">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  // Don't render if should redirect
  if (!user || !appSettings.restrictModeEnabled || isBetaApproved) {
    return null;
  }

  const currentStatus = localStatus;
  const canRequest = appSettings.betaRequestsEnabled && currentStatus === "none";
  const showClosedMessage = !appSettings.betaRequestsEnabled && currentStatus === "none";

  return (
    <div className="min-h-screen bg-bg-secondary flex flex-col">
      {/* Header */}
      <header className="bg-bg-primary border-b border-border-light px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-line-green flex items-center justify-center">
            <Beaker className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-text-primary">BD2Fondue</h1>
            <p className="text-xs text-text-secondary">Beta Testing</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-xl hover:bg-bg-secondary transition-colors text-text-secondary"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-bg-primary rounded-3xl shadow-lg overflow-hidden">
            {/* Top Section with Gradient */}
            <div className="relative bg-gradient-to-br from-line-green to-line-green-dark px-6 pt-10 pb-16">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
                  <Lock className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">ช่วง Beta Testing</h2>
                <p className="text-white/80 text-sm mt-1">เปิดให้ใช้งานเฉพาะผู้ที่ได้รับสิทธิ์</p>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 pb-8 -mt-8">
              <div className="bg-bg-card rounded-2xl shadow-md p-6">
                {/* User Info */}
                {appUser && (
                  <div className="flex items-center gap-3 p-3 bg-bg-secondary rounded-xl mb-6">
                    {appUser.photoURL ? (
                      <img 
                        src={appUser.photoURL} 
                        alt="" 
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-line-green flex items-center justify-center text-white font-medium">
                        {appUser.displayName?.[0]?.toUpperCase() || "U"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary truncate">{appUser.displayName}</p>
                      <p className="text-sm text-text-secondary truncate">{appUser.email}</p>
                    </div>
                  </div>
                )}

                {/* Status: None - Can Request */}
                {canRequest && (
                  <>
                    <div className="text-center mb-6">
                      <p className="text-text-secondary text-sm">
                        ขอสิทธิ์เข้าใช้งานเพื่อเริ่มทดสอบระบบ
                        <br />
                        ผู้พัฒนาจะตรวจสอบและอนุมัติให้
                      </p>
                    </div>
                    <button
                      onClick={handleRequestAccess}
                      disabled={isRequesting}
                      className={cn(
                        "w-full py-4 rounded-full font-semibold text-white transition-all duration-200",
                        "bg-line-green hover:bg-line-green-hover active:scale-[0.98]",
                        isRequesting && "opacity-70 cursor-not-allowed"
                      )}
                    >
                      {isRequesting ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          กำลังส่งคำขอ...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <Send className="w-5 h-5" />
                          ขอสิทธิ์เข้าใช้งาน
                        </span>
                      )}
                    </button>
                  </>
                )}

                {/* Status: None - Requests Closed */}
                {showClosedMessage && (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-status-warning-light flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-status-warning" />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">
                      ปิดรับสมัครผู้ทดสอบระบบแล้ว
                    </h3>
                    <p className="text-sm text-text-secondary whitespace-pre-line">
                      {appSettings.betaClosedMessage}
                    </p>
                  </div>
                )}

                {/* Status: Pending */}
                {currentStatus === "pending" && (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-status-warning-light flex items-center justify-center">
                      <Clock className="w-8 h-8 text-status-warning" />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">
                      รอการอนุมัติ
                    </h3>
                    <p className="text-sm text-text-secondary">
                      คำขอของคุณอยู่ระหว่างการตรวจสอบ
                    </p>
                  </div>
                )}

                {/* Status: Rejected */}
                {currentStatus === "rejected" && (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-status-error-light flex items-center justify-center">
                      <XCircle className="w-8 h-8 text-status-error" />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">
                      ไม่ได้รับอนุมัติ
                    </h3>
                    <p className="text-sm text-text-secondary">
                      ขออภัย คำขอของคุณไม่ได้รับการอนุมัติ
                      <br />
                      กรุณาติดต่อผู้พัฒนาสำหรับข้อมูลเพิ่มเติม
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-text-tertiary mt-6">
            อยู่ระหว่างการพัฒนาโดย <a href="https://itsim.tech/" target="_blank" rel="noopener noreferrer" className="text-line-green hover:opacity-80 underline decoration-dashed underline-offset-4 transition-all">Athivaratz</a> & <a href="https://www.instagram.com/ratchanon_roj/" target="_blank" rel="noopener noreferrer" className="text-line-green hover:opacity-80 underline decoration-dashed underline-offset-4 transition-all">ratchanon_roj</a>
          </p>
        </div>
      </main>
    </div>
  );
}
