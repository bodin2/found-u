import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseJsonBody } from "@/lib/parse-request";
import { resetPasswordSchema } from "@/lib/validations/auth";
import {
  checkRateLimit,
  ensureAuthUserForStudent,
  getStudentAccount,
  hashSecret,
  loginStudentWithPassword,
  verifySchoolPassword,
} from "@/lib/student-auth-server";

export async function POST(request: Request) {
  try {
    const parsed = await parseJsonBody(request, resetPasswordSchema);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const { studentId, schoolPassword, newPassword } = parsed.data;
    const rate = checkRateLimit(`reset:${studentId}`);
    if (!rate.allowed) {
      return NextResponse.json({ error: "ลองบ่อยเกินไป กรุณารอสักครู่" }, { status: 429 });
    }

    const verified = await verifySchoolPassword(studentId, schoolPassword);
    if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: 401 });

    const { account } = verified;
    const displayName = `${account.firstName} ${account.lastName}`.trim();
    const uid = await ensureAuthUserForStudent(studentId, displayName, newPassword);

    const admin = createAdminClient();
    const { error: updateError } = await admin
      .from("student_accounts")
      .update({
        linked_uid: uid,
        current_password_hash: hashSecret(newPassword),
        must_change_password: false,
        updated_at: new Date().toISOString(),
      })
      .eq("student_id", studentId);
    if (updateError) throw updateError;

    const refreshed = await getStudentAccount(studentId);
    if (!refreshed) return NextResponse.json({ error: "ไม่พบบัญชีนักเรียน" }, { status: 404 });

    const login = await loginStudentWithPassword(studentId, newPassword);
    if (!login.ok) return NextResponse.json({ error: login.error }, { status: 401 });

    return NextResponse.json({
      success: true,
      access_token: login.access_token,
      refresh_token: login.refresh_token,
      mustChangePassword: false,
    });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "รีเซ็ตรหัสผ่านไม่สำเร็จ" }, { status: 500 });
  }
}
