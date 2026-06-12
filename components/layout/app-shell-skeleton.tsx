"use client";

import { cn } from "@/lib/utils";

function SkeletonBar({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-bg-tertiary",
        className
      )}
      aria-hidden
    />
  );
}

function SidebarSkeleton() {
  return (
    <aside className="w-72 bg-bg-card border-r border-border-light fixed left-0 top-0 h-screen hidden md:flex flex-col z-50">
      <div className="p-6 border-b border-border-light">
        <div className="flex items-center gap-3 mb-6">
          <SkeletonBar className="h-12 w-12 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonBar className="h-4 w-24" />
            <SkeletonBar className="h-3 w-20" />
          </div>
        </div>
        <div className="bg-bg-secondary rounded-xl p-3">
          <div className="flex items-center gap-3">
            <SkeletonBar className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <SkeletonBar className="h-3.5 w-28" />
              <SkeletonBar className="h-3 w-36" />
            </div>
          </div>
        </div>
      </div>
      <nav className="p-4 flex-1 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBar key={i} className="h-14 w-full rounded-lg" />
        ))}
      </nav>
    </aside>
  );
}

function MobileHeaderSkeleton() {
  return (
    <header className="px-5 pt-6 pb-6 bg-gradient-to-br from-line-green to-line-green md:hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <SkeletonBar className="h-12 w-12 rounded-full bg-white/20 shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <SkeletonBar className="h-3.5 w-28 bg-white/20" />
            <SkeletonBar className="h-5 w-36 bg-white/20" />
          </div>
        </div>
        <SkeletonBar className="h-10 w-10 rounded-full bg-white/20 shrink-0" />
      </div>
      <SkeletonBar className="h-4 w-32 bg-white/20" />
    </header>
  );
}

function DesktopHeaderSkeleton() {
  return (
    <header className="hidden md:block bg-bg-card border-b border-border-light sticky top-0 z-10 -mx-6 lg:-mx-8 xl:-mx-12 px-6 lg:px-8 xl:px-12">
      <div className="pt-5 pb-4">
        <SkeletonBar className="h-8 w-64 max-w-full" />
        <SkeletonBar className="h-4 w-28 mt-2" />
      </div>
    </header>
  );
}

export function DashboardListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 min-h-[12rem]" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="bg-bg-secondary rounded-xl p-4 border border-border-light"
        >
          <div className="flex items-center gap-3">
            <SkeletonBar className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <SkeletonBar className="h-4 w-40" />
              <SkeletonBar className="h-3 w-56 max-w-full" />
            </div>
            <SkeletonBar className="h-6 w-16 rounded-full shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AppShellSkeleton({
  showMobileHeader = true,
  showDesktopHeader = true,
  showSidebar = true,
  showDashboard = false,
  className,
}: {
  showMobileHeader?: boolean;
  showDesktopHeader?: boolean;
  showSidebar?: boolean;
  showDashboard?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-h-screen bg-bg-primary", className)}>
      {showMobileHeader && <MobileHeaderSkeleton />}

      <div className="hidden md:flex min-h-screen bg-bg-primary">
        {showSidebar && <SidebarSkeleton />}
        <main className="flex-1 ml-72 bg-bg-secondary px-0 pb-6 pt-0 md:px-8 md:pb-8 xl:px-12 xl:pb-12">
          {showDesktopHeader && <DesktopHeaderSkeleton />}
          {showDashboard && (
            <div className="mt-8">
              <SkeletonBar className="h-7 w-48 mb-4" />
              <SkeletonBar className="h-10 w-full max-w-md mb-4 rounded-xl" />
              <DashboardListSkeleton />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
