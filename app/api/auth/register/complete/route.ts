import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/parse-request";
import { completeRegistrationSchema } from "@/lib/validations/auth";
import { registerStudentAccount } from "@/lib/student-auth-server";

export async function POST(request: Request) {
  try {
    const parsed = await parseJsonBody(request, completeRegistrationSchema);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const { studentId, registrationToken, password, pin } = parsed.data;
    const result = await registerStudentAccount({ studentId, registrationToken, password, pin });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      mustChangePassword: false,
      mustSetupPin: false,
      studentId: result.studentId,
      nickname: result.nickname,
      uid: result.uid,
    });
  } catch (err) {
    console.error("Registration complete error:", err);
    return NextResponse.json({ error: "สมัครสมาชิกไม่สำเร็จ" }, { status: 500 });
  }
}
