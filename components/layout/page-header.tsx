import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
};

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-balance text-xl font-semibold leading-[1.3] text-text-primary">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-pretty text-base leading-[1.5] text-text-secondary">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
