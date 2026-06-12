"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { LoadingModal } from "@/components/ui/loading-modal";
import { TutorialSystem } from "@/components/ui/tutorial-system";
import { StudentRegistrationModal } from "@/components/auth/student-registration-modal";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/login/change-password",
  "/login/reset-password",
  "/banned",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/login");
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const {
    user,
    appUser,
    loading,
    isAuthActionLoading,
    isStudentVerified,
    isAdmin,
    hasSeenTutorial,
    mustChangePassword,
    isBanned,
  } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showTutorial, setShowTutorial] = useState(false);

  const needsStudentVerification =
    !!user && !isBanned && !mustChangePassword && !isStudentVerified && !isAdmin;

  useEffect(() => {
    if (loading) return;

    if (!user && !isPublicPath(pathname)) {
      router.push("/login");
      return;
    }

    if (user && pathname === "/") {
      router.push("/home");
      return;
    }

    if (user && pathname === "/login") {
      if (mustChangePassword) {
        router.push("/login/change-password");
      } else if (isStudentVerified || isAdmin) {
        router.push("/home");
      }
      return;
    }

    if (user && mustChangePassword && pathname !== "/login/change-password") {
      router.push("/login/change-password");
      return;
    }

    if (user && isBanned && pathname !== "/banned") {
      router.push("/banned");
      return;
    }

    if (user && !isBanned && pathname === "/banned") {
      router.push("/home");
    }
  }, [
    user,
    loading,
    pathname,
    router,
    mustChangePassword,
    isStudentVerified,
    isAdmin,
    isBanned,
  ]);

  useEffect(() => {
    if (
      !loading &&
      user &&
      isStudentVerified &&
      !hasSeenTutorial &&
      !PUBLIC_PATHS.includes(pathname)
    ) {
      setShowTutorial(true);
    }
  }, [loading, user, isStudentVerified, hasSeenTutorial, pathname]);

  if (!loading && !user && !isPublicPath(pathname)) {
    return null;
  }

  if (!loading && user && pathname === "/") {
    return null;
  }

  if (!loading && user && isBanned && pathname !== "/banned") {
    return null;
  }

  if (
    !loading &&
    user &&
    mustChangePassword &&
    pathname !== "/login/change-password"
  ) {
    return null;
  }

  return (
    <>
      {children}
      <LoadingModal isOpen={isAuthActionLoading} message="กำลังดำเนินการ..." />
      <StudentRegistrationModal open={needsStudentVerification} />

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
