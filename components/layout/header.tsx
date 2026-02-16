"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  className?: string;
}

export default function Header({
  title,
  showBack = false,
  rightAction,
  className,
}: HeaderProps) {
  const router = useRouter();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex items-center justify-between px-4 py-4 bg-bg-primary border-b border-border-light transition-colors",
        className
      )}
    >
      {/* Left: Back button or spacer */}
      <div className="w-10">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-bg-secondary transition-colors"
            aria-label="กลับ"
          >
            <ArrowLeft className="w-5 h-5 text-text-primary" />
          </button>
        )}
      </div>

      {/* Center: Title */}
      <h1 className="flex-1 text-center text-lg font-semibold text-text-primary truncate">
        {title}
      </h1>

      {/* Right: Action or spacer */}
      <div className="w-10 flex justify-end">{rightAction}</div>
    </header>
  );
}
