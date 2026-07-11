"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { GraduationCap } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import {
  authCardClass,
  authCardDescriptionClass,
  authCardHeaderClass,
  authCardTitleClass,
  authFieldStackClass,
  authIconWellClass,
  authPrimaryButtonClass,
  authSecondaryButtonClass,
} from "@/components/auth/auth-ui";
import { AUTH_COPY } from "@/lib/auth-copy";
import { AUTH_ROUTES } from "@/lib/auth-routes";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { cn } from "@/lib/utils";

interface StudentRegistrationModalProps {
  open: boolean;
}

export function StudentRegistrationModal({ open }: StudentRegistrationModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  const isVisible = open && !!user;
  useLockBodyScroll(isVisible);

  useEffect(() => {
    if (isVisible && panelRef.current) {
      panelRef.current.focus();
    }
  }, [isVisible]);

  if (!isVisible || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="overlay-modal overlay-modal-top fixed inset-0 flex items-center justify-center bg-black/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
      role="presentation"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={cn(authCardClass, "w-full max-w-md outline-none")}
      >
        <header className={authCardHeaderClass}>
          <div className="flex gap-3 items-start">
            <div className={authIconWellClass} aria-hidden>
              <GraduationCap />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h2 id={titleId} className={authCardTitleClass}>
                {AUTH_COPY.studentVerificationTitle}
              </h2>
              <p id={descriptionId} className={authCardDescriptionClass}>
                {AUTH_COPY.studentVerificationDescription}
              </p>
            </div>
          </div>
        </header>

        <div className={authFieldStackClass}>
          <Link href={AUTH_ROUTES.register} className={authPrimaryButtonClass}>
            {AUTH_COPY.goToRegister}
          </Link>
          <button
            type="button"
            onClick={() => router.replace(AUTH_ROUTES.login)}
            className={authSecondaryButtonClass}
          >
            {AUTH_COPY.signInWithOtherAccount}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
