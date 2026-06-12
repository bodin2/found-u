import { AppShellSkeleton } from "@/components/layout/app-shell-skeleton";

export default function AppLoading() {
  return (
    <AppShellSkeleton
      showMobileHeader
      showDesktopHeader
      showSidebar
      showDashboard
    />
  );
}
