import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAuthRequest } from "@/lib/nfc-server";
import { parseJsonBody } from "@/lib/parse-request";
import { changePasswordSchema } from "@/lib/validations/auth";
import { getStudentAccount, hashSecret, verifySecret } from "@/lib/student-auth-server";

export async function POST(request: NextRequest) {
  const authUser = await verifyAuthRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = await parseJsonBody(request, changePasswordSchema);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { currentPassword, newPassword } = parsed.data;

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
    if (!verifySecret(currentPassword, account.currentPasswordHash)) {
      return NextResponse.json({ error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" }, { status: 401 });
    }

    const { error: updateAccountError } = await admin
      .from("accounts")
      .update({
        current_password_hash: hashSecret(newPassword),
        must_change_password: false,
        updated_at: new Date().toISOString(),
      })
      .eq("student_id", studentId);
    if (updateAccountError) throw updateAccountError;

    await admin.auth.admin.updateUserById(authUser.uid, { password: newPassword });
    await admin
      .from("accounts")
      .update({
        must_change_password: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", authUser.uid);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json({ error: "เปลี่ยนรหัสผ่านไม่สำเร็จ" }, { status: 500 });
  }
}
