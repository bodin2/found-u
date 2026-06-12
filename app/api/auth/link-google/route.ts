import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAuthRequest } from "@/lib/nfc-server";
import { parseJsonBody } from "@/lib/parse-request";
import { linkGoogleSchema } from "@/lib/validations/auth";
import {
  getStudentAccount,
  isAdminWhitelisted,
  normalizeEmail,
  promoteAdminUser,
  syncAppUserFromStudent,
  verifyStudentPassword,
} from "@/lib/student-auth-server";

export async function POST(request: NextRequest) {
  const authUser = await verifyAuthRequest(request);
  if (!authUser || !authUser.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = await parseJsonBody(request, linkGoogleSchema);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const verified = await verifyStudentPassword(parsed.data.studentId, parsed.data.password);
    if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: 401 });

    const account = verified.account;
    const googleEmail = normalizeEmail(authUser.email);
    if (
      account.linkedGoogleEmail &&
      account.linkedGoogleEmail !== googleEmail &&
      account.linkedUid &&
      account.linkedUid !== authUser.uid
    ) {
      return NextResponse.json(
        { error: "เลขประจำตัวนี้ถูกผูกกับบัญชี Google อื่นแล้ว" },
        { status: 409 }
      );
    }

    const admin = createAdminClient();
    await admin
      .from("student_accounts")
      .update({
        linked_uid: authUser.uid,
        linked_google_email: googleEmail,
        has_logged_in_once: true,
        updated_at: new Date().toISOString(),
      })
      .eq("student_id", parsed.data.studentId);

    const { data: authData } = await admin.auth.admin.getUserById(authUser.uid);
    await syncAppUserFromStudent(authUser.uid, account, {
      email: googleEmail,
      displayName:
        (authData.user?.user_metadata?.display_name as string | undefined) ||
        `${account.firstName} ${account.lastName}`,
      photoURL:
        (authData.user?.user_metadata?.avatar_url as string | undefined) ||
        (authData.user?.identities?.find((identity) => identity.provider === "google")?.identity_data
          ?.avatar_url as string | undefined),
      authMethods: ["google", "password"],
    });

    return NextResponse.json({
      success: true,
      studentId: parsed.data.studentId,
      mustChangePassword: account.mustChangePassword,
    });
  } catch (err) {
    console.error("Link Google error:", err);
    return NextResponse.json({ error: "ลงทะเบียนไม่สำเร็จ" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const authUser = await verifyAuthRequest(request);
  if (!authUser || !authUser.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const email = normalizeEmail(authUser.email);
  const whitelisted = await isAdminWhitelisted(email);

  if (whitelisted) {
    const { data: authData } = await admin.auth.admin.getUserById(authUser.uid);
    await promoteAdminUser(
      authUser.uid,
      email,
      (authData.user?.user_metadata?.display_name as string | undefined) || email,
      (authData.user?.user_metadata?.avatar_url as string | undefined) || undefined
    );
    return NextResponse.json({ isAdmin: true, isStudentVerified: true, whitelisted: true });
  }

  const { data: profileData } = await admin
    .from("profiles")
    .select("role, is_student_verified, must_change_password, student_id")
    .eq("id", authUser.uid)
    .maybeSingle();
  const profile = profileData as
    | { role?: string | null; is_student_verified?: boolean | null; must_change_password?: boolean | null; student_id?: string | null }
    | null;

  return NextResponse.json({
    isAdmin: profile?.role === "admin",
    isStudentVerified: profile?.is_student_verified === true || profile?.role === "admin",
    whitelisted: false,
    mustChangePassword: profile?.must_change_password === true,
    studentId: profile?.student_id || null,
  });
}
