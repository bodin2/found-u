"use client";

import { Home } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export function NotFoundHomeButton() {
  const { user, loading } = useAuth();
  const href = !loading && user ? "/home" : "/";

  return (
    <a
      href={href}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-line-green px-6 py-3.5 font-medium text-white transition-colors hover:bg-line-green-hover"
    >
      <Home className="w-5 h-5" />
      หน้าแรก
    </a>
  );
}
