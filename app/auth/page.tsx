"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import { AuthCard, AuthCardHeader, AuthShell } from "@/components/auth/auth-shell";
import {
  authFieldStackClass,
  authPrimaryButtonClass,
  authSecondaryButtonClass,
} from "@/components/auth/auth-ui";
import { AUTH_ROUTES } from "@/lib/auth-routes";
import { AUTH_COPY } from "@/lib/auth-copy";

export default function AuthHubPage() {
  return (
    <AuthShell subtitle="เลือกวิธีเข้าใช้งาน">
      <AuthCard>
        <AuthCardHeader
          icon={<Shield />}
          title={AUTH_COPY.hubTitle}
          description={AUTH_COPY.hubDescription}
        />
        <div className={authFieldStackClass}>
          <Link href={AUTH_ROUTES.register} className={authPrimaryButtonClass}>
            {AUTH_COPY.registerFirstTime}
          </Link>
          <Link href={AUTH_ROUTES.login} className={authSecondaryButtonClass}>
            {AUTH_COPY.signIn}
          </Link>
        </div>
      </AuthCard>
    </AuthShell>
  );
}
