"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResponsiveModal } from "@/components/ui/responsive-modal";

export type AppDialogVariant = "info" | "warning" | "error" | "success";

interface AppDialogProps {
  open: boolean;
  title: string;
  message: string;
  variant?: AppDialogVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

const variantStyles: Record<
  AppDialogVariant,
  { icon: typeof Info; iconClass: string; ringClass: string; confirmClass: string }
> = {
  info: {
    icon: Info,
    iconClass: "text-status-info",
    ringClass: "bg-status-info-light border-status-info/20",
    confirmClass: "bg-line-green-cta hover:bg-line-green-cta-hover",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-status-warning",
    ringClass: "bg-status-warning-light border-status-warning/20",
    confirmClass: "bg-line-green-cta hover:bg-line-green-cta-hover",
  },
  error: {
    icon: AlertTriangle,
    iconClass: "text-status-error",
    ringClass: "bg-status-error-light border-status-error/20",
    confirmClass: "bg-status-error hover:bg-status-error/90",
  },
  success: {
    icon: CheckCircle2,
    iconClass: "text-line-green",
    ringClass: "bg-line-green-light border-line-green/20",
    confirmClass: "bg-line-green-cta hover:bg-line-green-cta-hover",
  },
};

const actionButtonClass = cn(
  "min-h-11 py-3 px-4 rounded-full font-medium transition-colors touch-manipulation",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30 focus-visible:ring-offset-2"
);

export function AppDialog({
  open,
  title,
  message,
  variant = "info",
  confirmLabel = "ตกลง",
  cancelLabel = "ยกเลิก",
  showCancel = false,
  onConfirm,
  onCancel,
}: AppDialogProps) {
  const { icon: Icon, iconClass, ringClass, confirmClass } = variantStyles[variant];

  const handleClose = () => {
    (onCancel ?? onConfirm)();
  };

  return (
    <ResponsiveModal
      open={open}
      onClose={handleClose}
      showCloseButton={false}
      closeOnBackdrop={!showCancel}
      size="md"
      ariaLabel={title}
      footer={
        <div className={cn("flex gap-3", showCancel ? "flex-row" : "flex-col")}>
          {showCancel && (
            <button
              type="button"
              onClick={onCancel}
              className={cn(
                actionButtonClass,
                "flex-1 border border-border-light bg-bg-tertiary text-text-primary hover:bg-bg-secondary min-w-0"
              )}
            >
              <span className="truncate">{cancelLabel}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              actionButtonClass,
              "text-white min-w-0",
              showCancel ? "flex-1" : "w-full",
              confirmClass
            )}
          >
            <span className="truncate">{confirmLabel}</span>
          </button>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center py-2 min-w-0">
        <div
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center mb-4 border shrink-0",
            ringClass
          )}
          aria-hidden
        >
          <Icon className={cn("w-7 h-7", iconClass)} />
        </div>
        <h2 className="mb-2 max-w-full break-words text-balance text-xl font-semibold leading-[1.3] text-text-primary">
          {title}
        </h2>
        <p className="mb-2 max-w-full break-words text-pretty text-base leading-[1.5] text-text-secondary whitespace-pre-line">
          {message}
        </p>
      </div>
    </ResponsiveModal>
  );
}
