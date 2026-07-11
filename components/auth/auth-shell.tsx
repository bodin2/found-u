import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AuthPageHeader } from "@/components/auth/auth-page-header";
import {
  authCardClass,
  authCardDescriptionClass,
  authCardHeaderClass,
  authCardTitleClass,
  authFooterClass,
  authIconWellClass,
  authShellMainClass,
  authShellRootClass,
} from "@/components/auth/auth-ui";

type AuthShellProps = {
  subtitle: string;
  children: ReactNode;
  banner?: ReactNode;
};

export function AuthShell({ subtitle, children, banner }: AuthShellProps) {
  return (
    <div className={authShellRootClass}>
      <AuthPageHeader subtitle={subtitle} />
      <main className={authShellMainClass}>
        {banner}
        {children}
      </main>
    </div>
  );
}

export function AuthCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={cn(authCardClass, className)}>{children}</section>;
}

type AuthCardHeaderProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
};

export function AuthCardHeader({
  icon,
  title,
  description,
}: AuthCardHeaderProps) {
  return (
    <header className={authCardHeaderClass}>
      <div className={cn("flex gap-3 items-start", !icon && "block")}>
        {icon ? <div className={authIconWellClass} aria-hidden>{icon}</div> : null}
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className={authCardTitleClass}>{title}</h2>
          {description ? <p className={authCardDescriptionClass}>{description}</p> : null}
        </div>
      </div>
    </header>
  );
}

export function AuthFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <footer className={cn(authFooterClass, className)}>{children}</footer>;
}
