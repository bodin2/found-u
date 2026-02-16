"use client";

import { useState } from "react";
import { X, Loader2, Clock, CheckCircle, XCircle, Beaker, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BetaStatus } from "@/lib/types";
import { requestBetaAccess } from "@/lib/firestore";

interface BetaAccessModalProps {
  isOpen: boolean;
  betaStatus: BetaStatus;
  userId: string;
  userEmail?: string;
  onClose?: () => void;
}

export function BetaAccessModal({
  isOpen,
  betaStatus,
  userId,
  userEmail,
  onClose,
}: BetaAccessModalProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [localStatus, setLocalStatus] = useState<BetaStatus>(betaStatus);

  if (!isOpen) return null;

  const handleRequestAccess = async () => {
    setIsRequesting(true);
    try {
      await requestBetaAccess(userId);
      setLocalStatus("pending");
    } catch (error) {
      console.error("Error requesting beta access:", error);
    } finally {
      setIsRequesting(false);
    }
  };

  const currentStatus = localStatus !== betaStatus ? localStatus : betaStatus;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-br from-[#06C755] to-[#05a647] px-6 pt-8 pb-12">
          <div className="flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Beaker className="w-10 h-10 text-white" />
            </div>
          </div>
          {onClose && currentStatus === "approved" && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-6 pb-8 -mt-6">
          <div className="bg-white dark:bg-gray-700 rounded-2xl shadow-lg p-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              🧪 ช่วง Beta Testing
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              เว็บไซต์ BD2Fondue กำลังอยู่ในช่วงทดสอบระบบ
              <br />
              เปิดให้ใช้งานเฉพาะผู้ที่ได้รับสิทธิ์เท่านั้น
            </p>

            {/* Status Display */}
            {currentStatus === "none" && (
              <>
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-600 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    ขอสิทธิ์เข้าใช้งานเพื่อเริ่มทดสอบระบบ
                    <br />
                    เราจะแจ้งผลผ่านทางอีเมลของคุณ
                  </p>
                  {userEmail && (
                    <p className="text-xs text-gray-400 mt-2">
                      📧 {userEmail}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleRequestAccess}
                  disabled={isRequesting}
                  className={cn(
                    "w-full py-4 rounded-full font-semibold text-white transition-all duration-200",
                    "bg-[#06C755] hover:bg-[#05a647] active:scale-[0.98]",
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

            {currentStatus === "pending" && (
              <div className="py-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Clock className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  รอการอนุมัติ
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  คำขอของคุณอยู่ระหว่างการพิจารณา
                  <br />
                  กรุณารอสักครู่...
                </p>
              </div>
            )}

            {currentStatus === "rejected" && (
              <div className="py-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  ไม่ได้รับอนุมัติ
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ขออภัย คำขอของคุณไม่ได้รับการอนุมัติ
                  <br />
                  กรุณาติดต่อผู้ดูแลระบบ
                </p>
              </div>
            )}
          </div>

          {/* Footer info */}
          <p className="text-center text-xs text-gray-400 mt-4">
            อยู่ระหว่างการพัฒนาโดย <a href="https://itsim.tech/" target="_blank" rel="noopener noreferrer" className="text-line-green hover:opacity-80 underline decoration-dashed underline-offset-4 transition-all">Athivaratz</a> & <a href="https://www.instagram.com/ratchanon_roj/" target="_blank" rel="noopener noreferrer" className="text-line-green hover:opacity-80 underline decoration-dashed underline-offset-4 transition-all">ratchanon_roj</a>
          </p>
        </div>
      </div>
    </div>
  );
}
