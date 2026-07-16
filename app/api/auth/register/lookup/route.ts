import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  isValidStudentId,
  lookupRegistrationForStudent,
  normalizeStudentId,
} from "@/lib/student-auth-server";

export async function GET(request: NextRequest) {
  const studentId = normalizeStudentId(request.nextUrl.searchParams.get("studentId") || "");
  if (!isValidStudentId(studentId)) {
    return NextResponse.json({ error: "เลขประจำตัวไม่ถูกต้อง" }, { status: 400 });
  }

  const rate = checkRateLimit(`register-lookup:${studentId}`);
  if (!rate.allowed) {
    return NextResponse.json({ error: "ลองบ่อยเกินไป กรุณารอสักครู่" }, { status: 429 });
  }

  const result = await lookupRegistrationForStudent(studentId);

  if (result.status === "notFound" || result.status === "disabled") {
    return NextResponse.json({
      found: false,
      message: "ไม่พบข้อมูล กรุณาตรวจสอบเลขประจำตัวหรือติดต่อผู้ดูแลระบบ",
    });
  }

  if (result.status === "alreadyRegistered") {
    return NextResponse.json({
      found: true,
      alreadyRegistered: true,
      message: "คุณเคยสมัครสมาชิกไปแล้ว กรุณาเข้าสู่ระบบ",
    });
  }

  return NextResponse.json({
    found: true,
    canRegister: true,
    studentId: result.studentId,
    firstName: result.firstName,
    lastName: result.lastName,
    gradeLevel: result.gradeLevel ?? null,
    roomNumber: result.roomNumber ?? null,
    registrationToken: result.registrationToken,
  });
}
