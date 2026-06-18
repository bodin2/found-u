import Link from "next/link";
import { Package } from "lucide-react";

export function AuthPageHeader({ subtitle }: { subtitle: string }) {
  return (
    <header className="border-b border-border-light bg-bg-primary/80 backdrop-blur-lg shrink-0">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
        <Link href="/auth" className="w-10 h-10 rounded-xl bg-line-green flex items-center justify-center">
          <Package className="w-5 h-5 text-white" />
        </Link>
        <div>
          <h1 className="font-bold text-text-primary">foundu.forum</h1>
          <p className="text-xs text-text-tertiary">{subtitle}</p>
        </div>
      </div>
    </header>
  );
}
