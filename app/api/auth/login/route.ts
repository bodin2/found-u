import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/parse-request";
import { loginWithPasswordSchema } from "@/lib/validations/auth";
import { loginStudentWithPassword } from "@/lib/student-auth-server";

export async function POST(request: Request) {
  try {
    const parsed = await parseJsonBody(request, loginWithPasswordSchema);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const result = await loginStudentWithPassword(parsed.data.studentId, parsed.data.password);
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
      uid: result.uid,
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "เข้าสู่ระบบไม่สำเร็จ" }, { status: 500 });
  }
}
