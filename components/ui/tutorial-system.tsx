"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, Search, Camera, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateUserTutorialSeen } from "@/lib/firestore";

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  image?: string;
  bgColor: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    title: "ยินดีต้อนรับสู่ BD2Fondue",
    description: "ระบบแจ้งของหายและของเจอสำหรับโรงเรียน\nช่วยให้คุณตามหาของที่หายได้ง่ายขึ้น",
    icon: <Sparkles className="w-12 h-12 text-white" />,
    bgColor: "from-[#06C755] to-[#04a044]",
  },
  {
    id: 2,
    title: "แจ้งของหาย",
    description: "ของหาย? กรอกรายละเอียดสิ่งของที่หาย\nระบบจะสร้างรหัสติดตามให้อัตโนมัติ",
    icon: <Search className="w-12 h-12 text-white" />,
    bgColor: "from-red-500 to-red-600",
  },
  {
    id: 3,
    title: "แจ้งเจอของ",
    description: "เจอของตกหล่น? ถ่ายรูปและแจ้งสถานที่\nช่วยให้เจ้าของติดต่อกลับได้เร็วขึ้น",
    icon: <Camera className="w-12 h-12 text-white" />,
    bgColor: "from-[#06C755] to-[#04a044]",
  },
  {
    id: 4,
    title: "ติดตามสถานะ",
    description: "ใช้รหัสติดตามเพื่อเช็คสถานะของหาย\nหรือดูรายการทั้งหมดในหน้าติดตาม",
    icon: <Clock className="w-12 h-12 text-white" />,
    bgColor: "from-blue-500 to-blue-600",
  },
];

interface TutorialSystemProps {
  isOpen: boolean;
  userId: string;
  onComplete: () => void;
}

export function TutorialSystem({ isOpen, userId, onComplete }: TutorialSystemProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Minimum swipe distance
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

  const handleComplete = async () => {
    try {
      await updateUserTutorialSeen(userId);
    } catch (error) {
      console.error("Error updating tutorial status:", error);
    }
    onComplete();
  };

  const handleSkip = async () => {
    try {
      await updateUserTutorialSeen(userId);
    } catch (error) {
      console.error("Error updating tutorial status:", error);
    }
    onComplete();
  };

  // Touch handlers for swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "Escape") handleSkip();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleNext, handlePrev]);

  if (!isOpen) return null;

  const step = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80">
      {/* Tutorial Card */}
      <div
        className="relative w-full max-w-md mx-4 overflow-hidden animate-fade-in"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Main Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden">
          {/* Top Section with Icon */}
          <div
            className={cn(
              "relative h-64 flex items-center justify-center bg-gradient-to-br transition-all duration-500",
              step.bgColor
            )}
          >
            {/* Decorative circles */}
            <div className="absolute top-0 left-0 w-32 h-32 rounded-full bg-white/10 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-40 h-40 rounded-full bg-white/10 translate-x-1/4 translate-y-1/4" />

            {/* Icon container */}
            <div className="relative z-10 w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              {step.icon}
            </div>
          </div>

          {/* Content Section */}
          <div className="px-8 py-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-3">
              {step.title}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-center whitespace-pre-line leading-relaxed">
              {step.description}
            </p>

            {/* Progress Dots */}
            <div className="flex items-center justify-center gap-2 mt-8">
              {tutorialSteps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-all duration-300",
                    index === currentStep
                      ? "w-8 bg-[#06C755]"
                      : "bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                  )}
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-3 mt-8">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="flex-1 py-4 rounded-full border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                  ก่อนหน้า
                </button>
              )}
              <button
                onClick={isLastStep ? handleComplete : handleNext}
                className={cn(
                  "flex-1 py-4 rounded-full font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2",
                  "bg-[#06C755] hover:bg-[#05a647] active:scale-[0.98]",
                  currentStep === 0 && "w-full"
                )}
              >
                {isLastStep ? (
                  <>
                    เริ่มใช้งาน
                    <Sparkles className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    ถัดไป
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Swipe hint */}
        <p className="text-center text-white/60 text-xs mt-4">
          ปัดซ้าย-ขวาเพื่อเปลี่ยนหน้า
        </p>
      </div>
    </div>
  );
}
