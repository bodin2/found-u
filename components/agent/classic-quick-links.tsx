"use client";

import { Search, Camera, Clock } from "lucide-react";
import { useAppMode } from "@/contexts/app-mode-context";
import { cn } from "@/lib/utils";

const links = [
  {
    href: "/lost",
    label: "แจ้งของหาย",
    icon: Search,
    agentPrompt: "ช่วยแจ้งของหายให้หน่อย",
  },
  {
    href: "/found",
    label: "แจ้งเจอของ",
    icon: Camera,
    agentPrompt: "ช่วยแจ้งเจอของให้หน่อย",
  },
  {
    href: "/tracking",
    label: "ติดตามรหัส",
    icon: Clock,
    agentPrompt: "ช่วยเช็คสถานะรหัสติดตามของฉัน",
  },
];

type ClassicQuickLinksProps = {
  className?: string;
  onAgentPrompt?: (prompt: string) => void;
};

export function ClassicQuickLinks({ className, onAgentPrompt }: ClassicQuickLinksProps) {
  const { switchToClassic } = useAppMode();

  return (
    <div className={cn("flex flex-wrap gap-2 justify-center", className)}>
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <button
            key={link.href}
            type="button"
            onClick={() => {
              if (onAgentPrompt) {
                onAgentPrompt(link.agentPrompt);
                return;
              }
              switchToClassic(link.href);
            }}
            className="inline-flex items-center gap-1.5 min-h-11 px-4 py-2.5 rounded-full text-sm font-medium bg-bg-card border border-border-light text-text-secondary hover:text-line-green hover:border-line-green/30 transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30"
          >
            <Icon className="w-4 h-4 shrink-0" aria-hidden />
            {link.label}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => {
          if (onAgentPrompt) {
            onAgentPrompt("แสดงรายการของที่ฉันแจ้งไว้");
            return;
          }
          switchToClassic("/list");
        }}
        className="inline-flex items-center gap-1.5 min-h-11 px-4 py-2.5 rounded-full text-sm font-medium bg-bg-card border border-border-light text-text-secondary hover:text-line-green hover:border-line-green/30 transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30"
      >
        ดูรายการของ
      </button>
    </div>
  );
}
