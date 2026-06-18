import { NextRequest, NextResponse } from "next/server";
import { verifyAuthRequest, isAdminUser } from "@/lib/nfc-server";
import { parseJsonBody } from "@/lib/parse-request";
import { adminResetStudentSchema } from "@/lib/validations/auth";
import { resetStudentAccountByAdmin } from "@/lib/student-auth-server";

export async function POST(request: NextRequest) {
  const authUser = await verifyAuthRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isAdminUser(authUser.uid))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const parsed = await parseJsonBody(request, adminResetStudentSchema);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

    await resetStudentAccountByAdmin(parsed.data.studentId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Admin reset student error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "รีเซ็ตบัญชีไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
