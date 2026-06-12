import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAuthRequest } from "@/lib/nfc-server";
import { studentIdToAuthEmail } from "@/lib/student-auth-server";
import type { Database } from "@/lib/database.types";

export async function POST(request: NextRequest) {
  const authUser = await verifyAuthRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data: profileData } = await admin
      .from("profiles")
      .select("student_id, auth_methods")
      .eq("id", authUser.uid)
      .maybeSingle();
    const profile = profileData as { student_id?: string | null; auth_methods?: unknown } | null;
    const studentId = profile?.student_id as string | undefined;

    if (studentId) {
      await admin
        .from("student_accounts")
        .update({
          linked_google_email: null,
          updated_at: new Date().toISOString(),
        })
        .eq("student_id", studentId);
    }

    const methods = Array.isArray(profile?.auth_methods)
      ? (profile.auth_methods as string[]).filter((method) => method !== "google")
      : [];

    const userUpdates: Database["public"]["Tables"]["profiles"]["Update"] = {
      auth_methods: methods,
      photo_url: null,
      updated_at: new Date().toISOString(),
    };
    if (studentId) {
      userUpdates.email = studentIdToAuthEmail(studentId);
    }

    await admin.from("profiles").update(userUpdates).eq("id", authUser.uid);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Disconnect Google error:", err);
    return NextResponse.json({ error: "ยกเลิกการเชื่อม Google ไม่สำเร็จ" }, { status: 500 });
  }
}
