"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type ComingSoonCtaProps = {
  comingSoon: boolean;
  message?: string;
  href?: string;
  label: string;
  className?: string;
  showArrow?: boolean;
};

export function ComingSoonCta({
  comingSoon,
  message = "พบกันเร็วๆนี้",
  href = "/auth",
  label,
  className,
  showArrow = false,
}: ComingSoonCtaProps) {
  if (comingSoon) {
    return (
      <span
        className={cn(
          "inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-full bg-bg-tertiary px-5 py-2 text-sm font-medium text-text-tertiary",
          className
        )}
        aria-disabled
      >
        {message}
      </span>
    );
  }

  return (
    <Link href={href} className={cn("inline-flex items-center justify-center gap-2", className)}>
      {label}
      {showArrow ? <ArrowRight className="h-5 w-5" /> : null}
    </Link>
  );
}
