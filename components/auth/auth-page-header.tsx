import Link from "next/link";
import { Package } from "lucide-react";

export function AuthPageHeader({ subtitle }: { subtitle: string }) {
  return (
    <header className="border-b border-border-light bg-bg-primary shrink-0">
      <div className="max-w-md mx-auto px-[var(--spacing-page-x)] py-3 flex items-center gap-3">
        <Link
          href="/auth"
          aria-label="กลับหน้าเลือกวิธีเข้าใช้งาน Found-U"
          className="w-11 h-11 shrink-0 rounded-xl bg-bg-tertiary flex items-center justify-center text-line-green-link touch-manipulation"
        >
          <Package className="w-5 h-5" aria-hidden />
        </Link>
        <div className="min-w-0">
          <h1 className="font-semibold text-text-primary truncate">foundu.forum</h1>
          <p className="text-xs text-text-secondary truncate">{subtitle}</p>
        </div>
      </div>
    </header>
  );
}
