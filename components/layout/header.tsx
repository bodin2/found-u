"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  showBack?: boolean;
  /** Navigate to path instead of router.back() */
  backHref?: string;
  rightAction?: React.ReactNode;
  className?: string;
}

export default function Header({
  title,
  showBack = true,
  backHref,
  rightAction,
  className,
}: HeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) router.push(backHref);
    else router.back();
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex items-center gap-3 px-4 py-3",
        "bg-bg-primary border-b border-border-light transition-colors",
        className
      )}
    >
      <div className="w-11 shrink-0 flex items-center justify-start">
        {showBack ? (
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center justify-center min-w-11 min-h-11 -ml-2 rounded-full hover:bg-bg-secondary transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30"
            aria-label="กลับ"
          >
            <ArrowLeft className="w-5 h-5 text-text-primary" />
          </button>
        ) : null}
      </div>

      <h1 className="min-w-0 flex-1 truncate text-center text-balance text-base font-semibold leading-[1.4] text-text-primary">
        {title}
      </h1>

      <div className="w-11 shrink-0 flex items-center justify-end">{rightAction}</div>
    </header>
  );
}
