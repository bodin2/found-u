import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/parse-request";
import { loginWithPinSchema } from "@/lib/validations/auth";
import { loginStudentWithPin } from "@/lib/student-auth-server";

export async function POST(request: Request) {
  try {
    const parsed = await parseJsonBody(request, loginWithPinSchema);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const result = await loginStudentWithPin(parsed.data.studentId, parsed.data.pin);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, retryAfterMs: result.retryAfterMs },
        { status: result.retryAfterMs ? 429 : 401 }
      );
    }

    return NextResponse.json({
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      mustChangePassword: result.mustChangePassword,
      mustSetupPin: result.mustSetupPin,
      studentId: result.studentId,
      nickname: result.nickname,
      uid: result.uid,
    });
  } catch (err) {
    console.error("PIN login error:", err);
    return NextResponse.json({ error: "เข้าสู่ระบบไม่สำเร็จ" }, { status: 500 });
  }
}
