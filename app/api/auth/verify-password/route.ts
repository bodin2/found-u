import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAuthRequest } from "@/lib/nfc-server";
import { parseJsonBody } from "@/lib/parse-request";
import { verifyPasswordSchema } from "@/lib/validations/auth";
import { getStudentAccount, verifySecret } from "@/lib/student-auth-server";

export async function POST(request: NextRequest) {
  const authUser = await verifyAuthRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = await parseJsonBody(request, verifyPasswordSchema);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const admin = createAdminClient();
    const { data: profileData } = await admin
      .from("accounts")
      .select("student_id")
      .eq("id", authUser.uid)
      .maybeSingle();
    const profile = profileData as { student_id?: string | null } | null;
    const studentId = profile?.student_id;
    if (!studentId) return NextResponse.json({ error: "ไม่พบข้อมูลนักเรียน" }, { status: 400 });

    const account = await getStudentAccount(studentId);
    if (!account) return NextResponse.json({ error: "ไม่พบบัญชีนักเรียน" }, { status: 404 });
    if (!account.currentPasswordHash) {
      return NextResponse.json({ error: "บัญชียังไม่ได้ตั้งรหัสผ่าน" }, { status: 400 });
    }
    if (!verifySecret(parsed.data.password, account.currentPasswordHash)) {
      return NextResponse.json({ error: "รหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Verify password error:", err);
    return NextResponse.json({ error: "ตรวจสอบรหัสผ่านไม่สำเร็จ" }, { status: 500 });
  }
}
