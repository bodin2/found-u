"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthLoadingScreen } from "@/components/auth/auth-loading-screen";
import { AUTH_COPY } from "@/lib/auth-copy";
import { useAuth } from "@/contexts/auth-context";
import { LoadingModal } from "@/components/ui/loading-modal";
import { TutorialSystem } from "@/components/ui/tutorial-system";
import { StudentRegistrationModal } from "@/components/auth/student-registration-modal";
import { AUTH_ROUTES } from "@/lib/auth-routes";
import { captureReturnToFromQuery, consumeReturnTo, saveReturnTo } from "@/lib/auth-return-to";
import {
  deferAfterNavigation,
  isTutorialDismissedThisSession,
  markTutorialDismissedThisSession,
  resolveActiveModal,
} from "@/lib/auth-modal-queue";
import { isAuthOnlyRoute, isProtectedRoute, isPublicRoute } from "@/lib/route-access";

function AuthBootstrapScreen() {
  return <AuthLoadingScreen message={AUTH_COPY.loading} />;
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const {
    user,
    appUser,
    loading,
    authHydrating,
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
  const pathname = usePathname() ?? "";
  const [deferredTutorialPath, setDeferredTutorialPath] = useState<string | null>(null);
  const [tutorialDismissed, setTutorialDismissed] = useState(() =>
    isTutorialDismissedThisSession()
  );

  const authPending = loading || authHydrating;
  const isProtected = isProtectedRoute(pathname);

  useEffect(() => {
    captureReturnToFromQuery();
  }, [pathname]);

  const needsStudentVerification =
    !authPending &&
    sessionReady &&
    !!user &&
    !!appUser &&
    !isBanned &&
    !mustChangePassword &&
    !mustSetupPin &&
    !isStudentVerified &&
    !isAdmin;

  const tutorialEligible =
    !authPending &&
    sessionReady &&
    !isAuthActionLoading &&
    !!user &&
    isStudentVerified &&
    !hasSeenTutorial &&
    !isPublicRoute(pathname) &&
    !tutorialDismissed &&
    pathname !== AUTH_ROUTES.changePassword &&
    pathname !== AUTH_ROUTES.setupPin;

  useEffect(() => {
    if (!tutorialEligible) return;
    return deferAfterNavigation(() => {
      setDeferredTutorialPath(pathname);
    });
  }, [tutorialEligible, pathname]);

  const showTutorial =
    tutorialEligible && deferredTutorialPath === pathname;
  const activeModal = resolveActiveModal({
    needsRegistration: needsStudentVerification,
    showTutorial,
  });

  const postAuthDestination = () => consumeReturnTo("/home");

  useLayoutEffect(() => {
    if (authPending) return;

    if (user && pathname === "/") {
      router.replace(postAuthDestination());
      return;
    }

    if (!user && isProtected) {
      saveReturnTo(`${pathname}${typeof window !== "undefined" ? window.location.search : ""}`);
      router.replace(AUTH_ROUTES.hub);
      return;
    }

    if (user && isAuthOnlyRoute(pathname)) {
      if (mustChangePassword) {
        router.replace(AUTH_ROUTES.changePassword);
      } else if (mustSetupPin) {
        router.replace(AUTH_ROUTES.setupPin);
      } else if (isStudentVerified || isAdmin) {
        router.replace(postAuthDestination());
      }
      return;
    }

    if (user && mustChangePassword && pathname !== AUTH_ROUTES.changePassword) {
      router.replace(AUTH_ROUTES.changePassword);
      return;
    }

    if (user && mustSetupPin && !isAdmin && pathname !== AUTH_ROUTES.setupPin) {
      router.replace(AUTH_ROUTES.setupPin);
      return;
    }

    if (user && isBanned && pathname !== "/banned") {
      router.replace("/banned");
      return;
    }

    if (user && !isBanned && pathname === "/banned") {
      router.replace(postAuthDestination());
    }
  }, [
    user,
    loading,
    authHydrating,
    authPending,
    pathname,
    router,
    isProtected,
    mustChangePassword,
    mustSetupPin,
    isStudentVerified,
    isAdmin,
    isBanned,
  ]);

  if (authPending && isProtected) {
    return <AuthBootstrapScreen />;
  }

  if (user && pathname === "/") {
    return null;
  }

  if (isProtected && !user && !authPending) {
    return null;
  }

  if (!authPending && user && isBanned && pathname !== "/banned") {
    return null;
  }

  if (
    !authPending &&
    user &&
    mustChangePassword &&
    pathname !== AUTH_ROUTES.changePassword
  ) {
    return null;
  }

  if (
    !authPending &&
    user &&
    mustSetupPin &&
    !isAdmin &&
    pathname !== AUTH_ROUTES.setupPin
  ) {
    return null;
  }

  const handleTutorialComplete = () => {
    markTutorialDismissedThisSession();
    setTutorialDismissed(true);
  };

  return (
    <>
      {children}
      <LoadingModal isOpen={isAuthActionLoading} message="กำลังดำเนินการ..." />
      <StudentRegistrationModal open={activeModal === "registration"} />

      {activeModal === "tutorial" && appUser && (
        <TutorialSystem
          isOpen
          userId={appUser.uid}
          onComplete={handleTutorialComplete}
        />
      )}
    </>
  );
}
