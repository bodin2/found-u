import { AlertTriangle, CheckCircle2, Info, type LucideIcon } from "lucide-react";
import type { StatusAlertVariant } from "@/lib/feedback/types";

export type FeedbackVariantStyle = {
  icon: LucideIcon;
  iconClass: string;
  panelClass: string;
  messageClass: string;
  titleClass: string;
};

export const feedbackVariantStyles: Record<StatusAlertVariant, FeedbackVariantStyle> = {
  info: {
    icon: Info,
    iconClass: "text-[var(--status-info)]",
    panelClass: "feedback-panel feedback-panel--info",
    messageClass: "text-text-secondary",
    titleClass: "text-text-primary",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-[var(--status-warning)]",
    panelClass: "feedback-panel feedback-panel--warning",
    messageClass: "text-amber-800 dark:text-amber-200",
    titleClass: "text-amber-900 dark:text-amber-100",
  },
  error: {
    icon: AlertTriangle,
    iconClass: "text-[var(--status-error)]",
    panelClass: "feedback-panel feedback-panel--error",
    messageClass: "text-red-700 dark:text-red-300",
    titleClass: "text-red-800 dark:text-red-200",
  },
  success: {
    icon: CheckCircle2,
    iconClass: "text-[var(--status-success)]",
    panelClass: "feedback-panel feedback-panel--success",
    messageClass: "text-text-secondary",
    titleClass: "text-text-primary",
  },
};
