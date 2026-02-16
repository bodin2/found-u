"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Loader2 } from "lucide-react";
import { LoadingModal } from "@/components/ui/loading-modal";
import { TutorialSystem } from "@/components/ui/tutorial-system";

// Pages that don't require beta approval
const PUBLIC_PATHS = ["/login", "/pending", "/banned"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { 
    user, 
    appUser, 
    appSettings,
    loading, 
    isAuthActionLoading, 
    isBetaApproved, 
    betaStatus, 
    hasSeenTutorial,
    isBanned,
  } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (!loading) {
      // Not logged in - redirect to login (except if already on login)
      if (!user && pathname !== "/login") {
        router.push("/login");
        return;
      }
      
      // Logged in and on login page - redirect to home
      if (user && pathname === "/login") {
        router.push("/");
        return;
      }

      // Check if user is banned - redirect to banned page
      if (user && isBanned && pathname !== "/banned") {
        router.push("/banned");
        return;
      }

      // If user is not banned but on banned page, redirect to home
      if (user && !isBanned && pathname === "/banned") {
        router.push("/");
        return;
      }

      // Check if restrict mode is enabled and user is not approved
      if (user && !isBanned && appSettings.restrictModeEnabled && !isBetaApproved && !PUBLIC_PATHS.includes(pathname)) {
        router.push("/pending");
        return;
      }
    }
  }, [user, loading, pathname, router, appSettings.restrictModeEnabled, isBetaApproved, isBanned]);

  // Show tutorial for first-time beta users
  useEffect(() => {
    if (!loading && user && isBetaApproved && !hasSeenTutorial && !PUBLIC_PATHS.includes(pathname)) {
      setShowTutorial(true);
    }
  }, [loading, user, isBetaApproved, hasSeenTutorial, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-secondary">
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 text-line-green animate-spin mb-4" />
          <p className="text-text-secondary">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  // If not logged in and on a protected route, don't render anything while redirecting
  if (!user && pathname !== "/login") {
    return null;
  }

  // If user is banned and not on banned page, don't render (will redirect)
  if (user && isBanned && pathname !== "/banned") {
    return null;
  }

  // If restrict mode is enabled and user is not approved, don't render (will redirect)
  if (user && !isBanned && appSettings.restrictModeEnabled && !isBetaApproved && !PUBLIC_PATHS.includes(pathname)) {
    return null;
  }

  return (
    <>
      {children}
      <LoadingModal isOpen={isAuthActionLoading} message="กำลังดำเนินการ..." />

      {/* Tutorial System */}
      {showTutorial && appUser && (
        <TutorialSystem
          isOpen={showTutorial}
          userId={appUser.uid}
          onComplete={() => setShowTutorial(false)}
        />
      )}
    </>
  );
}
