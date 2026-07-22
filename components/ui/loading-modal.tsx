"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useMounted } from "@/hooks/use-mounted";

interface LoadingModalProps {
  isOpen: boolean;
  message?: string;
}

export function LoadingModal({
  isOpen,
  message = "กำลังโหลด…",
}: LoadingModalProps) {
  const mounted = useMounted();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useLockBodyScroll(isOpen);
  useFocusTrap(panelRef, { active: isOpen, restoreFocus: true });

  useEffect(() => {
    if (!isOpen) return;
    // Block Escape from dismissing loading overlays unintentionally
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="overlay-modal fixed inset-0 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy="true"
        className="bg-bg-card border border-border-light rounded-2xl p-6 flex flex-col items-center shadow-sm max-w-sm w-full outline-none"
      >
        <Loader2
          className="w-10 h-10 text-line-green animate-spin mb-4 motion-reduce:animate-none"
          aria-hidden
        />
        <p
          id={titleId}
          className="text-center text-balance break-words text-xl font-semibold leading-[1.3] text-text-primary"
        >
          {message}
        </p>
      </div>
    </div>,
    document.body
  );
}
