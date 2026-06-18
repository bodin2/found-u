"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { LoadingModal } from "@/components/ui/loading-modal";
import { TutorialSystem } from "@/components/ui/tutorial-system";
import { StudentRegistrationModal } from "@/components/auth/student-registration-modal";
import { AUTH_ROUTES, isAuthPublicPath } from "@/lib/auth-routes";
import { isKnownRoute } from "@/lib/known-routes";

const PUBLIC_PATHS = ["/", "/banned"];

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    isAuthPublicPath(pathname) ||
    !isKnownRoute(pathname)
  );
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const {
    user,
    appUser,
    loading,
    sessionReady,
    isAuthActionLoading,
    isStudentVerified,
    isAdmin,
    hasSeenTutorial,
    mustChangePassword,
    mustSetupPin,
    isBanned,
  } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showTutorial, setShowTutorial] = useState(false);

  const needsStudentVerification =
    !!user &&
    !!appUser &&
    sessionReady &&
    !isBanned &&
    !mustChangePassword &&
    !mustSetupPin &&
    !isStudentVerified &&
    !isAdmin;

  useEffect(() => {
    if (user && pathname === "/") {
      router.replace("/home");
      return;
    }

    if (loading) return;

    if (!user && !isPublicPath(pathname)) {
      router.push(AUTH_ROUTES.hub);
      return;
    }

    if (user && (pathname === AUTH_ROUTES.hub || pathname === AUTH_ROUTES.login)) {
      if (mustChangePassword) {
        router.push(AUTH_ROUTES.changePassword);
      } else if (mustSetupPin) {
        router.push(AUTH_ROUTES.setupPin);
      } else if (isStudentVerified || isAdmin) {
        router.push("/home");
      }
      return;
    }

    if (user && mustChangePassword && pathname !== AUTH_ROUTES.changePassword) {
      router.push(AUTH_ROUTES.changePassword);
      return;
    }

    if (user && mustSetupPin && !isAdmin && pathname !== AUTH_ROUTES.setupPin) {
      router.push(AUTH_ROUTES.setupPin);
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
    mustSetupPin,
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
      !isPublicPath(pathname)
    ) {
      setShowTutorial(true);
    }
  }, [loading, user, isStudentVerified, hasSeenTutorial, pathname]);

  if (user && pathname === "/") {
    return null;
  }

  if (!loading && !user && !isPublicPath(pathname)) {
    return null;
  }

  if (!loading && user && isBanned && pathname !== "/banned") {
    return null;
  }

  if (
    !loading &&
    user &&
    mustChangePassword &&
    pathname !== AUTH_ROUTES.changePassword
  ) {
    return null;
  }

  if (
    !loading &&
    user &&
    mustSetupPin &&
    !isAdmin &&
    pathname !== AUTH_ROUTES.setupPin
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
