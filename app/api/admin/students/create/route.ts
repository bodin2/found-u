import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuthRequest, isAdminUser } from "@/lib/nfc-server";
import {
  createStudentAccountManual,
  isValidSchoolPassword,
  isValidStudentId,
  normalizeStudentId,
} from "@/lib/student-auth-server";
import { parseJsonBody } from "@/lib/parse-request";

const createStudentBodySchema = z.object({
  studentId: z.string().min(1, "กรุณากรอกเลขประจำตัว"),
  password: z.string().optional(),
  firstName: z.string().min(1, "กรุณากรอกชื่อ"),
  role: z.enum(["user", "admin"]).default("user"),
});

export async function POST(request: NextRequest) {
  const authUser = await verifyAuthRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isAdminUser(authUser.uid))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const parsed = await parseJsonBody(request, createStudentBodySchema);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { studentId, password, firstName, role } = parsed.data;

    const id = normalizeStudentId(studentId);
    if (!isValidStudentId(id)) {
      return NextResponse.json({ error: "เลขประจำตัวต้องเป็นตัวเลข 5 หลัก" }, { status: 400 });
    }
    if (password && !isValidSchoolPassword(password)) {
      return NextResponse.json(
        { error: "รหัสผ่านต้องเป็น a-z A-Z 0-9 ความยาว 7-8 ตัว" },
        { status: 400 }
      );
    }

    const result = await createStudentAccountManual({
      studentId: id,
      password: password || undefined,
      firstName: firstName.trim(),
      role,
      adminUid: authUser.uid,
    });

    return NextResponse.json({ success: true, ...result, role });
  } catch (err) {
    console.error("Create student error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "สร้างผู้ใช้ไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
