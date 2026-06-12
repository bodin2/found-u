import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAuthRequest } from "@/lib/nfc-server";
import { parseJsonBody } from "@/lib/parse-request";

const SHOWN_NAME_MAX = 40;
const profilePatchSchema = z.object({
  shownName: z.string().trim().max(SHOWN_NAME_MAX).optional(),
});

export async function PATCH(request: NextRequest) {
  const authUser = await verifyAuthRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = await parseJsonBody(request, profilePatchSchema);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const shownName = parsed.data.shownName?.trim() ?? "";

    const admin = createAdminClient();
    const { error } = await admin
      .from("profiles")
      .update({
        shown_name: shownName || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", authUser.uid);
    if (error) throw error;

    return NextResponse.json({ ok: true, shownName: shownName || null });
  } catch (error) {
    console.error("profile update error:", error);
    return NextResponse.json({ error: "อัปเดตโปรไฟล์ไม่สำเร็จ" }, { status: 500 });
  }
}
