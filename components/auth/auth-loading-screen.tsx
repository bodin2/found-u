import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AuthLoadingScreenProps = {
  message?: string;
  className?: string;
};

export function AuthLoadingScreen({
  message = "กำลังโหลด…",
  className,
}: AuthLoadingScreenProps) {
  return (
    <div
      className={cn(
        "min-h-[100dvh] flex items-center justify-center bg-bg-secondary",
        "pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="w-8 h-8 animate-spin text-text-secondary" aria-hidden />
      <span className="sr-only">{message}</span>
    </div>
  );
}
