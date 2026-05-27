import { NextRequest, NextResponse } from "next/server";
import { verifyAuthRequest } from "@/lib/nfc-server";
import { adminDb } from "@/lib/firebase-admin";
import { getStudentAccount, verifySecret } from "@/lib/student-auth-server";

export async function POST(request: NextRequest) {
  const authUser = await verifyAuthRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const password = (body.password as string | undefined)?.trim() || "";
    if (!password) {
      return NextResponse.json({ error: "กรุณากรอกรหัสผ่าน" }, { status: 400 });
    }

    const userDoc = await adminDb.collection("users").doc(authUser.uid).get();
    const studentId = userDoc.data()?.studentId as string | undefined;
    if (!studentId) {
      return NextResponse.json({ error: "ไม่พบข้อมูลนักเรียน" }, { status: 400 });
    }

    const account = await getStudentAccount(studentId);
    if (!account) {
      return NextResponse.json({ error: "ไม่พบบัญชีนักเรียน" }, { status: 404 });
    }

    if (!verifySecret(password, account.currentPasswordHash)) {
      return NextResponse.json({ error: "รหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Verify password error:", err);
    return NextResponse.json({ error: "ตรวจสอบรหัสผ่านไม่สำเร็จ" }, { status: 500 });
  }
}
