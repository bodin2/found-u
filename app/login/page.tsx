"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  Loader2,
  Search,
  Bell,
  MapPin,
  Users,
  ChevronRight,
  Package,
  Shield,
  Zap,
  Heart
} from "lucide-react";
import { cn } from "@/lib/utils";

// Feature data
const features = [
  {
    icon: Search,
    title: "ค้นหาของหาย",
    description: "ค้นหาของที่หายได้ง่ายๆ ด้วยระบบค้นหาอัจฉริยะ",
    color: "bg-blue-500",
    lightColor: "bg-blue-100 dark:bg-blue-900/30"
  },
  {
    icon: Bell,
    title: "แจ้งเตือนทันที",
    description: "รับการแจ้งเตือนเมื่อมีคนพบของที่ตรงกับของคุณ",
    color: "bg-amber-500",
    lightColor: "bg-amber-100 dark:bg-amber-900/30"
  },
  {
    icon: MapPin,
    title: "ระบุตำแหน่ง",
    description: "บอกตำแหน่งที่พบหรือทำหายได้แม่นยำ",
    color: "bg-rose-500",
    lightColor: "bg-rose-100 dark:bg-rose-900/30"
  },
  {
    icon: Users,
    title: "ชุมชนช่วยเหลือ",
    description: "เพื่อนๆ ในโรงเรียนช่วยกันตามหาของ",
    color: "bg-violet-500",
    lightColor: "bg-violet-100 dark:bg-violet-900/30"
  }
];

// Google Icon Component
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signIn } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeFeature, setActiveFeature] = useState(0);
  const featuresRef = useRef<HTMLDivElement>(null);

  // Auto-rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      router.replace("/");
    }
  }, [user, loading, router]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMsg(null);
    try {
      await signIn();
    } catch (error: any) {
      console.error("Error signing in:", error);
      setIsSigningIn(false);

      if (error.code === 'auth/popup-closed-by-user') {
        setErrorMsg("การเข้าสู่ระบบถูกยกเลิก");
      } else if (error.code === 'auth/popup-blocked') {
        setErrorMsg("Browser บล็อก Popup กรุณาอนุญาตให้เปิด Popup");
      } else if (error.code === 'auth/cancelled-popup-request') {
        setErrorMsg("มีหน้าต่าง Login เปิดอยู่แล้ว");
      } else {
        setErrorMsg("เกิดข้อผิดพลาด กรุณาลองใหม่");
      }
    }
  };

  // Loading state
  if (loading || (user && !loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-secondary">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-line-green mx-auto mb-4" />
          <p className="text-text-secondary text-sm">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-secondary flex flex-col">
      {/* Header with Login Button */}
      <header className="sticky top-0 z-50 bg-bg-primary/80 backdrop-blur-lg border-b border-border-light">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-line-green flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-text-primary">BD2Fondue</span>
          </div>
          <button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
              "bg-bg-tertiary hover:bg-bg-secondary border border-border-light",
              "text-text-primary",
              isSigningIn && "opacity-70 cursor-not-allowed"
            )}
          >
            {isSigningIn ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            <span className="hidden sm:inline">เข้าสู่ระบบ</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-32">
        <div className="max-w-lg mx-auto px-4 py-8">
          {/* Hero Section */}
          <section className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
              ของหาย?{" "}
              <span className="text-line-green">ไม่ต้องกังวล</span>
              <br />
              เราช่วยคุณได้
            </h1>

            <p className="text-text-secondary text-base max-w-sm mx-auto">
              ระบบแจ้งของหายและของเจอสำหรับโรงเรียน
              ช่วยให้คุณตามหาของที่หายได้ง่ายขึ้น
            </p>
          </section>

          {/* Animated Feature Showcase */}
          <section className="mb-10">
            <div className="bg-bg-primary rounded-3xl shadow-card overflow-hidden">
              {/* Feature Display */}
              <div className="relative h-48 bg-gradient-to-br from-line-green to-line-green-dark p-6 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    {(() => {
                      const Icon = features[activeFeature].icon;
                      return <Icon className="w-8 h-8 text-white" />;
                    })()}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    {features[activeFeature].title}
                  </h3>
                  <p className="text-white/80 text-sm">
                    {features[activeFeature].description}
                  </p>
                </div>
              </div>

              {/* Feature Dots */}
              <div className="flex justify-center gap-2 py-4">
                {features.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveFeature(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-300",
                      activeFeature === index
                        ? "w-6 bg-line-green"
                        : "bg-border-medium hover:bg-border-light"
                    )}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Feature Grid */}
          <section className="mb-10" ref={featuresRef}>
            <h2 className="text-lg font-semibold text-text-primary mb-4 px-1">
              ฟีเจอร์หลัก
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className={cn(
                      "bg-bg-primary rounded-2xl p-4 shadow-sm border border-border-light",
                      "transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
                      feature.lightColor
                    )}>
                      <Icon className={cn("w-5 h-5", feature.color.replace("bg-", "text-"))} />
                    </div>
                    <h3 className="font-semibold text-text-primary text-sm mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-text-tertiary text-xs leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Trust Badges */}
          <section className="mb-10">
            <div className="flex flex-wrap justify-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-bg-primary border border-border-light text-sm">
                <Shield className="w-4 h-4 text-line-green" />
                <span className="text-text-secondary">ปลอดภัย</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-bg-primary border border-border-light text-sm">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-text-secondary">รวดเร็ว</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-bg-primary border border-border-light text-sm">
                <Heart className="w-4 h-4 text-rose-500" />
                <span className="text-text-secondary">ฟรี</span>
              </div>
            </div>
          </section>

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-6 p-4 bg-status-error-light border border-status-error/30 rounded-2xl flex items-center gap-3 text-status-error text-sm animate-fade-in">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </main>

      {/* Fixed Bottom CTA */}
      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-bg-primary/95 backdrop-blur-lg border-t border-border-light">
        <div className="max-w-lg mx-auto px-4 py-4">
          <button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className={cn(
              "w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl",
              "bg-line-green hover:bg-line-green-hover text-white font-semibold",
              "transition-all duration-200 shadow-lg shadow-line-green/25",
              "active:scale-[0.98]",
              isSigningIn && "opacity-70 cursor-not-allowed"
            )}
          >
            {isSigningIn ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>กำลังเข้าสู่ระบบ...</span>
              </>
            ) : (
              <>
                <GoogleIcon />
                <span>เริ่มต้นใช้งาน</span>
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>

          <p className="text-center text-[10px] text-text-tertiary mt-2 opacity-80">
            อยู่ระหว่างการพัฒนาโดย <a href="https://itsim.tech/" target="_blank" rel="noopener noreferrer" className="text-line-green hover:opacity-80 underline decoration-dashed underline-offset-4 transition-all">Athivaratz</a> & <a href="https://www.instagram.com/ratchanon_roj/" target="_blank" rel="noopener noreferrer" className="text-line-green hover:opacity-80 underline decoration-dashed underline-offset-4 transition-all">ratchanon_roj</a>
          </p>
        </div>
      </div>
    </div>
  );
}
