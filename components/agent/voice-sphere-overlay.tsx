"use client";

import { useEffect, useCallback, useId, useRef } from "react";
import { X, Mic } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { MotionProvider } from "@/components/motion/motion-provider";
import { duration, easeOut } from "@/lib/motion";
import { thaiCopy } from "@/lib/copy/thai-student";
import { cn } from "@/lib/utils";

type VoiceSphereOverlayProps = {
  open: boolean;
  onClose: () => void;
  onTranscript: (text: string) => void;
};

function VoiceSphereOverlayInner({ open, onClose, onTranscript }: VoiceSphereOverlayProps) {
  const reduced = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useLockBodyScroll(open);
  useFocusTrap(panelRef, { active: open, restoreFocus: true });

  const handleFinalTranscript = useCallback(
    (text: string) => {
      if (text.trim()) onTranscript(text.trim());
    },
    [onTranscript]
  );

  const { isListening, transcript, isSupported, start, stop, error } = useVoiceInput({
    onFinalTranscript: handleFinalTranscript,
  });

  useEffect(() => {
    if (open && isSupported) {
      void start();
    } else {
      stop();
    }
    return () => stop();
  }, [open, isSupported, start, stop]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  const fade = reduced
    ? { duration: 0 }
    : { duration: duration.fast, ease: easeOut };

  const sheet = reduced
    ? { duration: 0 }
    : { duration: duration.normal, ease: easeOut };

  return (
    <AnimatePresence>
      {open ? (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={fade}
          className="overlay-modal fixed inset-0 z-[1000] flex items-end justify-center bg-black/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          role="presentation"
          onClick={onClose}
        >
          <m.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: 16 }}
            transition={sheet}
            className="w-full max-w-md rounded-2xl border border-border-light bg-bg-primary p-5 shadow-card outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2
                  id={titleId}
                  className="text-balance text-base font-semibold leading-[1.4] text-text-primary"
                >
                  พูดถามได้เลย
                </h2>
                <p className="mt-0.5 text-sm text-text-secondary">
                  {isSupported
                    ? isListening
                      ? thaiCopy.voice.listening
                      : thaiCopy.voice.tapToSpeak
                    : thaiCopy.voice.notSupported}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30 touch-manipulation"
                aria-label={thaiCopy.voice.close}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            {isSupported ? (
              <>
                <div className="flex flex-col items-center py-4">
                  <div
                    className={cn(
                      "agent-avatar mb-4 h-20 w-20",
                      isListening &&
                        "ring-2 ring-line-green/40 ring-offset-2 ring-offset-bg-primary"
                    )}
                    aria-hidden
                  >
                    <Mic className="h-9 w-9" strokeWidth={2} />
                  </div>
                  {transcript ? (
                    <p className="px-2 text-center text-base leading-[1.5] text-text-primary">
                      {transcript}
                    </p>
                  ) : (
                    <p className="text-center text-pretty text-sm text-text-secondary">
                      พูดชื่อสิ่งของ สถานที่ หรือรหัสติดตาม
                    </p>
                  )}
                  {error ? (
                    <p className="mt-3 text-center text-sm text-status-error">{error}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full min-h-11 rounded-full bg-bg-tertiary py-3 font-medium text-text-primary transition-colors hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30 touch-manipulation"
                >
                  ปิด
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="w-full min-h-11 rounded-full bg-line-green-cta py-3 font-medium text-white transition-colors hover:bg-line-green-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30 touch-manipulation"
              >
                ปิด
              </button>
            )}
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}

export function VoiceSphereOverlay(props: VoiceSphereOverlayProps) {
  return (
    <MotionProvider>
      <VoiceSphereOverlayInner {...props} />
    </MotionProvider>
  );
}
