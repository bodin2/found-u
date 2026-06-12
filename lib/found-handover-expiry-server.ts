import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_APP_SETTINGS } from "@/lib/types";

/**
 * เปลี่ยนสถานะรายการของเจอที่เลยกำหนดส่งห้องบุคคลเป็น expired (ใช้ Admin SDK)
 */
export async function expireOverdueFoundItemsAdmin(): Promise<number> {
  const admin = createAdminClient();
  const { data: settingsRow } = await admin.from("app_settings").select("settings").eq("id", "default").maybeSingle();
  const settingsData = (settingsRow?.settings || {}) as {
    foundHandoverDeadlineEnabled?: boolean;
    foundHandoverDeadlineMinutes?: number;
  };
  const enabled =
    settingsData?.foundHandoverDeadlineEnabled ??
    DEFAULT_APP_SETTINGS.foundHandoverDeadlineEnabled ??
    true;

  if (!enabled) return 0;

  const minutes = Math.max(
    1,
    settingsData?.foundHandoverDeadlineMinutes ??
      DEFAULT_APP_SETTINGS.foundHandoverDeadlineMinutes ??
      60
  );

  const nowMs = Date.now();
  const { data: rows } = await admin
    .from("found_items")
    .select("id, handover_deadline_at, created_at")
    .eq("status", "pending_room_confirm");
  if (!rows || rows.length === 0) return 0;

  let count = 0;

  for (const data of rows) {
    const row = data as { id: string; handover_deadline_at?: string | null; created_at?: string | null };
    let deadlineMs: number | null = null;

    if (row.handover_deadline_at) {
      deadlineMs = new Date(row.handover_deadline_at).getTime();
    } else if (row.created_at) {
      const createdMs = new Date(row.created_at).getTime();
      deadlineMs = createdMs + minutes * 60 * 1000;
    }

    if (deadlineMs !== null && deadlineMs < nowMs) {
      await admin
        .from("found_items")
        .update({
          status: "expired",
          expired_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      count++;
    }
  }

  return count;
}
