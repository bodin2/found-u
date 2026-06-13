import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_APP_SETTINGS, type AppSettings } from "@/lib/types";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("app_settings")
      .select("settings")
      .eq("id", "default")
      .maybeSingle();

    const settings = (data?.settings ?? {}) as AppSettings;

    return NextResponse.json({
      comingSoonEnabled:
        settings.comingSoonEnabled ?? DEFAULT_APP_SETTINGS.comingSoonEnabled ?? false,
      comingSoonMessage:
        settings.comingSoonMessage ??
        DEFAULT_APP_SETTINGS.comingSoonMessage ??
        "พบกันเร็วๆนี้",
    });
  } catch (err) {
    console.error("public-settings error:", err);
    return NextResponse.json({
      comingSoonEnabled: DEFAULT_APP_SETTINGS.comingSoonEnabled ?? true,
      comingSoonMessage: DEFAULT_APP_SETTINGS.comingSoonMessage ?? "พบกันเร็วๆนี้",
    });
  }
}
