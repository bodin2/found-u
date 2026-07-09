"use client";

import { CheckCircle2, Fingerprint, Loader2, User, XCircle } from "lucide-react";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { StatusAlert } from "@/components/ui/status-alert";
import { cn } from "@/lib/utils";

export type ConnectionResultType = "passkey";

export type ConnectionResultData = {
  type: ConnectionResultType;
  success: boolean;
  errorMessage?: string;
  email?: string;
  studentId?: string;
  displayName?: string;
  passkeyCount?: number;
  passkeyDeviceLabel?: string;
  authMethods?: string[];
};

const AUTH_METHOD_LABELS: Record<string, string> = {
  password: "รหัสผ่าน",
  pin: "PIN",
  passkey: "Passkey",
};

function StatusRow({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-border-light last:border-0">
      <span className="text-sm text-text-secondary shrink-0">{label}</span>
      <span
        className={cn(
          "text-sm text-right break-all",
          emphasize ? "font-medium text-text-primary" : "text-text-primary"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function formatAuthMethods(methods?: string[]): string {
  if (!methods?.length) return "รหัสผ่าน";
  return methods.map((m) => AUTH_METHOD_LABELS[m] ?? m).join(", ");
}

type ConnectionResultModalProps = {
  open: boolean;
  onClose: () => void;
  loading?: boolean;
  loadingTitle?: string;
  loadingDescription?: string;
  result?: ConnectionResultData | null;
};

export function ConnectionResultModal({
  open,
  onClose,
  loading = false,
  loadingTitle = "กำลังดำเนินการ...",
  loadingDescription,
  result,
}: ConnectionResultModalProps) {
  const isSuccess = result?.success ?? false;

  const title = loading
    ? loadingTitle
    : isSuccess
      ? "ลงทะเบียน Passkey สำเร็จ"
      : "ลงทะเบียน Passkey ไม่สำเร็จ";

  const description = loading
    ? loadingDescription
    : isSuccess
      ? "อุปกรณ์นี้พร้อมใช้งาน Passkey สำหรับเข้าสู่ระบบอย่างรวดเร็วและปลอดภัย"
      : result?.errorMessage;

  const footer = (
    <button
      type="button"
      onClick={onClose}
      disabled={loading}
      className="w-full py-2.5 rounded-xl bg-line-green text-white text-sm font-medium disabled:opacity-60"
    >
      {loading ? "กรุณารอสักครู่..." : "ตกลง"}
    </button>
  );

  return (
    <ResponsiveModal
      open={open}
      onClose={loading ? () => {} : onClose}
      title={title}
      description={description}
      size="md"
      showCloseButton={!loading}
      closeOnBackdrop={!loading}
      footer={footer}
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-line-green" />
          <p className="text-sm text-text-secondary text-center">ระบบกำลังบันทึกและตรวจสอบสถานะบัญชี</p>
        </div>
      ) : result ? (
        <div className="space-y-4 pb-2">
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3",
              isSuccess ? "bg-line-green/10" : "bg-red-500/10"
            )}
          >
            {isSuccess ? (
              <CheckCircle2 className="w-6 h-6 text-line-green shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 text-red-500 shrink-0" />
            )}
            <div className="min-w-0">
              <p className={cn("text-sm font-medium", isSuccess ? "text-line-green" : "text-red-600")}>
                {isSuccess ? "สถานะ: พร้อมใช้งาน" : "สถานะ: ไม่สำเร็จ"}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                การลงทะเบียน Passkey
              </p>
            </div>
            <Fingerprint className="w-5 h-5 text-text-tertiary ml-auto shrink-0" />
          </div>

          {isSuccess && (
            <div className="rounded-xl border border-border-light bg-bg-secondary/50 px-4">
              {result.displayName && (
                <StatusRow label="ชื่อในระบบ" value={result.displayName} />
              )}
              {result.studentId && (
                <StatusRow label="เลขประจำตัว" value={result.studentId} emphasize />
              )}
              {result.passkeyCount != null && (
                <StatusRow
                  label="Passkey ที่ลงทะเบียน"
                  value={`${result.passkeyCount} อุปกรณ์`}
                  emphasize
                />
              )}
              {result.passkeyDeviceLabel && (
                <StatusRow label="อุปกรณ์ล่าสุด" value={result.passkeyDeviceLabel} />
              )}
              <StatusRow
                label="วิธีเข้าสู่ระบบที่ใช้ได้"
                value={formatAuthMethods(result.authMethods)}
              />
            </div>
          )}

          {isSuccess && (
            <p className="text-xs text-text-tertiary leading-relaxed">
              Passkey ผูกกับโดเมนที่ลงทะเบียน — หากเข้าเว็บคนละโดเมน ต้องลงทะเบียน Passkey ใหม่บนโดเมนนั้น
            </p>
          )}

          {!isSuccess && result.errorMessage && (
            <StatusAlert variant="error" message={result.errorMessage} />
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 py-4 text-sm text-text-secondary">
          <User className="w-4 h-4" />
          ไม่พบข้อมูลสถานะ
        </div>
      )}
    </ResponsiveModal>
  );
}
