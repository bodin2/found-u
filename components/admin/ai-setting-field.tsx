"use client";

import {
  AI_SETTING_HELP,
  formatEffectiveHint,
} from "@/lib/admin/ai-setting-help";
import type { AppSettings } from "@/lib/types";
import InfoTooltip from "@/components/ui/info-tooltip";

type AiSettingFieldProps = {
  settingKey: string;
  label?: string;
  children: React.ReactNode;
  settings?: AppSettings;
};

export function AiSettingField({
  settingKey,
  label,
  children,
  settings,
}: AiSettingFieldProps) {
  const help = AI_SETTING_HELP[settingKey];
  const effective = settings ? formatEffectiveHint(settingKey, settings) : null;
  const tooltipContent = help
    ? `${help.description}\nใช้เมื่อ: ${help.whenToUse}\nแนะนำ: ${help.recommended}`
    : "";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1 min-w-0">
        <label className="text-sm font-medium text-text-primary">
          {label ?? help?.label ?? settingKey}
        </label>
        {help ? <InfoTooltip content={tooltipContent} /> : null}
      </div>
      {help ? (
        <p className="text-xs text-text-secondary text-pretty">{help.description}</p>
      ) : null}
      {effective ? (
        <p className="text-xs text-text-secondary text-pretty">{effective}</p>
      ) : null}
      {children}
    </div>
  );
}
