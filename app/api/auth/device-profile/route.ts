import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  getStudentAccount,
  isValidStudentId,
  normalizeStudentId,
} from "@/lib/student-auth-server";

export async function GET(request: NextRequest) {
  const studentId = normalizeStudentId(request.nextUrl.searchParams.get("studentId") || "");
  if (!isValidStudentId(studentId)) {
    return NextResponse.json({ error: "เลขประจำตัวไม่ถูกต้อง" }, { status: 400 });
  }

  const rate = checkRateLimit(`device-profile:${studentId}`);
  if (!rate.allowed) {
    return NextResponse.json({ error: "ลองบ่อยเกินไป กรุณารอสักครู่" }, { status: 429 });
  }

  const account = await getStudentAccount(studentId);
  if (!account || account.status === "disabled") {
    return NextResponse.json({ exists: false });
  }

  return NextResponse.json({
    exists: true,
    studentId: account.studentId,
    nickname: account.nickname,
    firstName: account.firstName,
    hasLoggedInOnce: account.hasLoggedInOnce,
    hasPin: !!account.pinHash,
    quickUnlockAvailable: account.hasLoggedInOnce && !!account.pinHash,
  });
}
