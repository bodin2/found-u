"use client";

import { useState, useEffect, useCallback, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, Search, Camera, Clock, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateUserTutorialSeen } from "@/lib/database";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useMounted } from "@/hooks/use-mounted";

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  bgColor: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    title: "ยินดีต้อนรับสู่ Found-U",
    description:
      "ระบบแจ้งของหายและของเจอสำหรับโรงเรียน\nช่วยให้คุณตามหาของที่หายได้ง่ายขึ้น",
    icon: <Package className="w-10 h-10 text-line-green-link" aria-hidden />,
    bgColor: "bg-line-green-light",
  },
  {
    id: 2,
    title: "แจ้งของหาย",
    description:
      "ของหาย? กรอกรายละเอียดสิ่งของที่หาย\nระบบจะสร้างรหัสติดตามให้อัตโนมัติ",
    icon: <Search className="w-10 h-10 text-status-error" aria-hidden />,
    bgColor: "bg-status-error-light",
  },
  {
    id: 3,
    title: "แจ้งเจอของ",
    description:
      "เจอของตกหล่น? ถ่ายรูปและแจ้งสถานที่\nช่วยให้เจ้าของติดต่อกลับได้เร็วขึ้น",
    icon: <Camera className="w-10 h-10 text-line-green-link" aria-hidden />,
    bgColor: "bg-line-green-light",
  },
  {
    id: 4,
    title: "ติดตามสถานะ",
    description:
      "ใช้รหัสติดตามเพื่อเช็คสถานะของหาย\nหรือดูรายการทั้งหมดในหน้าติดตาม",
    icon: <Clock className="w-10 h-10 text-status-info" aria-hidden />,
    bgColor: "bg-status-info-light",
  },
];

interface TutorialSystemProps {
  isOpen: boolean;
  userId: string;
  onComplete: () => void;
}

export function TutorialSystem({ isOpen, userId, onComplete }: TutorialSystemProps) {
  const mounted = useMounted();
  const [currentStep, setCurrentStep] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useLockBodyScroll(isOpen);
  useFocusTrap(panelRef, { active: isOpen, restoreFocus: true });

  const minSwipeDistance = 50;

  const handleNext = useCallback(() => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const persistAndFinish = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await updateUserTutorialSeen(userId);
    } catch (error) {
      console.error("Error updating tutorial status:", error);
    } finally {
      setIsSaving(false);
      onComplete();
    }
  }, [isSaving, onComplete, userId]);

  const handleComplete = () => {
    void persistAndFinish();
  };

  const handleSkip = useCallback(() => {
    void persistAndFinish();
  }, [persistAndFinish]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) handleNext();
    if (distance < -minSwipeDistance) handlePrev();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "Escape") handleSkip();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleNext, handlePrev, handleSkip]);

  useEffect(() => {
    if (isOpen) setCurrentStep(0);
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const step = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;
  const stepLabel = `ขั้นตอน ${currentStep + 1} จาก ${tutorialSteps.length}`;

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
        aria-describedby={descriptionId}
        className="relative w-full max-w-md outline-none"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <p className="sr-only" aria-live="polite">
          {stepLabel}: {step.title}
        </p>

        <button
          type="button"
          onClick={handleSkip}
          disabled={isSaving}
          className={cn(
            "absolute top-2 right-2 z-10 inline-flex items-center justify-center",
            "min-w-11 min-h-11 rounded-full bg-black/25 text-white",
            "hover:bg-black/40 transition-colors touch-manipulation",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
            "disabled:opacity-50"
          )}
          aria-label="ข้ามคำแนะนำ"
        >
          <X className="w-5 h-5" aria-hidden />
        </button>

        <div className="bg-bg-card rounded-2xl border border-border-light overflow-hidden">
          <div
            className={cn(
              "relative h-56 flex items-center justify-center transition-colors duration-300 motion-reduce:transition-none",
              step.bgColor
            )}
          >
            <div className="relative z-10 w-16 h-16 rounded-full bg-bg-card flex items-center justify-center border border-border-light">
              {step.icon}
            </div>
          </div>

          <div className="px-6 py-7 sm:px-8">
            <h2
              id={titleId}
              className="text-xl font-semibold text-text-primary text-center mb-3 text-balance break-words"
            >
              {step.title}
            </h2>
            <p
              id={descriptionId}
              className="text-center text-pretty break-words text-base leading-[1.5] text-text-secondary whitespace-pre-line"
            >
              {step.description}
            </p>

            <div
              className="flex items-center justify-center gap-1 mt-8"
              role="tablist"
              aria-label="ขั้นตอนคำแนะนำ"
            >
              {tutorialSteps.map((s, index) => {
                const active = index === currentStep;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-label={`ไปขั้นตอน ${index + 1}: ${s.title}`}
                    onClick={() => setCurrentStep(index)}
                    className={cn(
                      "inline-flex items-center justify-center min-w-11 min-h-11 rounded-full touch-manipulation",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/40"
                    )}
                  >
                    <span
                      className={cn(
                        "rounded-full transition-all duration-200 motion-reduce:transition-none",
                        active
                          ? "w-8 h-2.5 bg-line-green"
                          : "w-2.5 h-2.5 bg-bg-tertiary hover:bg-border-medium"
                      )}
                      aria-hidden
                    />
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 mt-8">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={isSaving}
                  className={cn(
                    "flex-1 min-h-11 py-3 px-4 rounded-full font-medium",
                    "bg-bg-tertiary text-text-primary hover:bg-bg-secondary",
                    "transition-colors flex items-center justify-center gap-2 touch-manipulation",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30",
                    "disabled:opacity-50"
                  )}
                >
                  <ChevronLeft className="w-5 h-5" aria-hidden />
                  ก่อนหน้า
                </button>
              )}
              <button
                type="button"
                onClick={isLastStep ? handleComplete : handleNext}
                disabled={isSaving}
                aria-busy={isSaving}
                className={cn(
                  "flex-1 min-h-11 py-3 px-4 rounded-full font-medium text-white",
                  "bg-line-green-cta hover:bg-line-green-cta-hover",
                  "transition-colors flex items-center justify-center gap-2 touch-manipulation",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/40 focus-visible:ring-offset-2",
                  "disabled:opacity-50",
                  currentStep === 0 && "w-full"
                )}
              >
                {isLastStep ? (isSaving ? "กำลังบันทึก..." : "เริ่มใช้งาน") : "ถัดไป"}
                {!isLastStep ? <ChevronRight className="w-5 h-5" aria-hidden /> : null}
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-white/70 text-xs mt-4" aria-hidden>
          ปัดซ้าย-ขวาเพื่อเปลี่ยนหน้า
        </p>
      </div>
    </div>,
    document.body
  );
}
