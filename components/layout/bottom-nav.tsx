"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Camera, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

// Navigation items
const navItems = [
  { href: "/", icon: Home, label: "หน้าแรก" },
  { href: "/lost", icon: Search, label: "แจ้งของหาย" },
  { href: "/found", icon: Camera, label: "แจ้งเจอของ" },
  { href: "/tracking", icon: Clock, label: "ติดตาม" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom md:hidden">
      {/* Container ให้ตรงกับ max-w-md ของ layout */}
      <div className="w-full">
        <div className="flex items-center justify-around bg-bg-primary border-t border-border-light px-2 py-2 transition-colors">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all duration-200",
                  isActive
                    ? "text-line-green"
                    : "text-text-tertiary hover:text-text-secondary"
                )}
              >
                <div
                  className={cn(
                    "p-2 rounded-full transition-all duration-200",
                    isActive && "bg-line-green-light"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-all",
                      isActive && "stroke-[2.5]"
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "text-xs mt-1 font-medium",
                    isActive && "text-line-green"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
