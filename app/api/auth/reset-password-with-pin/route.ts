import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/parse-request";
import { resetPasswordWithPinSchema } from "@/lib/validations/auth";
import { resetPasswordWithPin } from "@/lib/student-auth-server";

export async function POST(request: Request) {
  try {
    const parsed = await parseJsonBody(request, resetPasswordWithPinSchema);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const { studentId, pin, newPassword } = parsed.data;
    const result = await resetPasswordWithPin(studentId, pin, newPassword);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      mustChangePassword: false,
    });
  } catch (err) {
    console.error("Reset password with PIN error:", err);
    return NextResponse.json({ error: "รีเซ็ตรหัสผ่านไม่สำเร็จ" }, { status: 500 });
  }
}
