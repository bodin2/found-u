import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_APP_SETTINGS, type AppSettings } from "@/lib/types";

export interface RateLimitCheckResult {
  allowed: boolean;
  reason?: "user_minute" | "user_hour" | "system_minute" | "system_hour";
  message?: string;
  userRemainingMinute: number;
  userRemainingHour: number;
  systemRemainingMinute: number;
  systemRemainingHour: number;
  resetMinute: Date;
  resetHour: Date;
}

export async function getAppSettingsAdmin(): Promise<AppSettings> {
  const admin = createAdminClient();
  const { data } = await admin.from("app_settings").select("settings").eq("id", "default").maybeSingle();
  const settings = (data?.settings as Record<string, unknown> | null | undefined) || {};
  return { ...DEFAULT_APP_SETTINGS, ...settings } as AppSettings;
}

export async function checkAndRecordRateLimitAtomic(
  userId: string,
  settings: AppSettings,
  endpoint: string
): Promise<RateLimitCheckResult> {
  const admin = createAdminClient();
  if (!settings.aiRateLimitEnabled) {
    await admin.from("ai_usage").insert({
      user_id: userId,
      endpoint,
      timestamp: new Date().toISOString(),
    });
    return {
      allowed: true,
      userRemainingMinute: Infinity,
      userRemainingHour: Infinity,
      systemRemainingMinute: Infinity,
      systemRemainingHour: Infinity,
      resetMinute: new Date(),
      resetHour: new Date(),
    };
  }

  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [userMinuteCount, userHourCount, systemMinuteCount, systemHourCount] = await Promise.all([
    admin
      .from("ai_usage")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("timestamp", oneMinuteAgo.toISOString()),
    admin
      .from("ai_usage")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("timestamp", oneHourAgo.toISOString()),
    admin
      .from("ai_usage")
      .select("*", { count: "exact", head: true })
      .gte("timestamp", oneMinuteAgo.toISOString()),
    admin
      .from("ai_usage")
      .select("*", { count: "exact", head: true })
      .gte("timestamp", oneHourAgo.toISOString()),
  ]);

  const userUsageInMinute = userMinuteCount.count ?? 0;
  const userUsageInHour = userHourCount.count ?? 0;
  const systemUsageInMinute = systemMinuteCount.count ?? 0;
  const systemUsageInHour = systemHourCount.count ?? 0;

  const userLimitPerMinute = settings.aiRateLimitPerMinute || 5;
  const userLimitPerHour = settings.aiRateLimitPerHour || 30;
  const systemLimitPerMinute = settings.systemAiRateLimitPerMinute || 20;
  const systemLimitPerHour = settings.systemAiRateLimitPerHour || 100;

  const userRemainingMinute = Math.max(0, userLimitPerMinute - userUsageInMinute);
  const userRemainingHour = Math.max(0, userLimitPerHour - userUsageInHour);
  const systemRemainingMinute = Math.max(0, systemLimitPerMinute - systemUsageInMinute);
  const systemRemainingHour = Math.max(0, systemLimitPerHour - systemUsageInHour);

  const resetMinute = new Date(now.getTime() + 60 * 1000);
  const resetHour = new Date(now.getTime() + 60 * 60 * 1000);

  let allowed = true;
  let reason: RateLimitCheckResult["reason"];
  let message: string | undefined;

  if (userUsageInMinute >= userLimitPerMinute) {
    allowed = false;
    reason = "user_minute";
    message = settings.aiRateLimitMessage || "AI rate limit exceeded. Please try again shortly.";
  } else if (userUsageInHour >= userLimitPerHour) {
    allowed = false;
    reason = "user_hour";
    message = settings.aiRateLimitMessage || "AI hourly limit reached. Please try again later.";
  } else if (settings.systemAiRateLimitEnabled) {
    if (systemUsageInMinute >= systemLimitPerMinute) {
      allowed = false;
      reason = "system_minute";
      message = "AI system is busy. Please try again shortly.";
    } else if (systemUsageInHour >= systemLimitPerHour) {
      allowed = false;
      reason = "system_hour";
      message = "AI system hourly limit reached. Please try again later.";
    }
  }

  if (allowed) {
    await admin.from("ai_usage").insert({
      user_id: userId,
      endpoint,
      timestamp: now.toISOString(),
    });
  }

  return {
    allowed,
    reason,
    message,
    userRemainingMinute: allowed ? userRemainingMinute - 1 : userRemainingMinute,
    userRemainingHour: allowed ? userRemainingHour - 1 : userRemainingHour,
    systemRemainingMinute: allowed ? systemRemainingMinute - 1 : systemRemainingMinute,
    systemRemainingHour: allowed ? systemRemainingHour - 1 : systemRemainingHour,
    resetMinute,
    resetHour,
  };
}

export async function getRateLimitQuota(userId: string, settings: AppSettings) {
  const admin = createAdminClient();
  if (!settings.aiRateLimitEnabled) {
    return {
      enabled: false,
      userRemainingMinute: Infinity,
      userRemainingHour: Infinity,
      systemRemainingMinute: Infinity,
      systemRemainingHour: Infinity,
    };
  }

  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [userMinuteSnapshot, userHourSnapshot, systemMinuteSnapshot, systemHourSnapshot] = await Promise.all([
    admin
      .from("ai_usage")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("timestamp", oneMinuteAgo.toISOString()),
    admin
      .from("ai_usage")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("timestamp", oneHourAgo.toISOString()),
    admin
      .from("ai_usage")
      .select("*", { count: "exact", head: true })
      .gte("timestamp", oneMinuteAgo.toISOString()),
    admin
      .from("ai_usage")
      .select("*", { count: "exact", head: true })
      .gte("timestamp", oneHourAgo.toISOString()),
  ]);

  const userLimitPerMinute = settings.aiRateLimitPerMinute || 5;
  const userLimitPerHour = settings.aiRateLimitPerHour || 30;
  const systemLimitPerMinute = settings.systemAiRateLimitPerMinute || 20;
  const systemLimitPerHour = settings.systemAiRateLimitPerHour || 100;

  return {
    enabled: true,
    userRemainingMinute: Math.max(0, userLimitPerMinute - (userMinuteSnapshot.count ?? 0)),
    userRemainingHour: Math.max(0, userLimitPerHour - (userHourSnapshot.count ?? 0)),
    userLimitPerMinute,
    userLimitPerHour,
    systemRemainingMinute: settings.systemAiRateLimitEnabled
      ? Math.max(0, systemLimitPerMinute - (systemMinuteSnapshot.count ?? 0))
      : Infinity,
    systemRemainingHour: settings.systemAiRateLimitEnabled
      ? Math.max(0, systemLimitPerHour - (systemHourSnapshot.count ?? 0))
      : Infinity,
    systemLimitPerMinute: settings.systemAiRateLimitEnabled ? systemLimitPerMinute : null,
    systemLimitPerHour: settings.systemAiRateLimitEnabled ? systemLimitPerHour : null,
  };
}
