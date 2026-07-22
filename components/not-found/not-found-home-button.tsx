import { Home } from "lucide-react";

export function NotFoundHomeButton() {
  return (
    <a
      href="/"
      className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-full bg-line-green-cta px-6 py-3.5 font-medium text-white transition-colors hover:bg-line-green-cta-hover touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/40 focus-visible:ring-offset-2"
    >
      <Home className="w-5 h-5" aria-hidden />
      หน้าแรก
    </a>
  );
}
