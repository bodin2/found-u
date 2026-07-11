"use client";

import { cn } from "@/lib/utils";
import { feedbackVariantStyles } from "@/lib/feedback/variant-styles";
import type { StatusAlertVariant } from "@/lib/feedback/types";

export type StatusAlertAction = {
  label: string;
  onClick: () => void;
};

export type StatusAlertProps = {
  variant?: StatusAlertVariant;
  title?: string;
  message: string;
  action?: StatusAlertAction;
  className?: string;
  centered?: boolean;
  id?: string;
};

export function StatusAlert({
  variant = "error",
  title,
  message,
  action,
  className,
  centered = false,
  id,
}: StatusAlertProps) {
  const { icon: Icon, iconClass, panelClass, messageClass, titleClass } =
    feedbackVariantStyles[variant];

  return (
    <div
      id={id}
      role={variant === "error" ? "alert" : "status"}
      className={cn(panelClass, centered && "text-center", className)}
    >
      <div className={cn("flex gap-3", centered && "flex-col items-center")}>
        <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", iconClass, centered && "mt-0")} aria-hidden />
        <div className={cn("min-w-0 flex-1", centered && "flex-1 w-full")}>
          {title ? (
            <p className={cn("text-sm font-medium", titleClass)}>{title}</p>
          ) : null}
          <p className={cn("text-sm leading-relaxed", title ? "mt-1" : "", messageClass)}>{message}</p>
          {action ? (
            <button
              type="button"
              onClick={action.onClick}
              className="mt-2 text-sm font-medium text-line-green-link hover:text-line-green-link-hover underline underline-offset-2"
            >
              {action.label}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
