"use client";

import { Loader2 } from "lucide-react";

interface LoadingModalProps {
  isOpen: boolean;
  message?: string;
}

export function LoadingModal({ isOpen, message = "กำลังโหลด..." }: LoadingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 flex flex-col items-center shadow-xl max-w-sm w-full mx-4">
        <Loader2 className="w-10 h-10 text-[#06C755] animate-spin mb-4" />
        <p className="text-lg font-medium text-gray-900 dark:text-white">{message}</p>
      </div>
    </div>
  );
}
