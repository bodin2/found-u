import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAuthRequest } from "@/lib/nfc-server";
import { getStudentAccount, normalizeEmail, syncAppUserFromStudent } from "@/lib/student-auth-server";

export async function POST(request: NextRequest) {
  const authUser = await verifyAuthRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data: authData } = await admin.auth.admin.getUserById(authUser.uid);
    const user = authData.user;
    const googleIdentity = user?.identities?.find((identity) => identity.provider === "google");
    const googleEmail = normalizeEmail((googleIdentity?.identity_data?.email as string) || authUser.email || "");
    if (!googleEmail) {
      return NextResponse.json(
        { error: "กรุณาเชื่อมบัญชี Google จากปุ่มด้านล่างก่อน" },
        { status: 400 }
      );
    }

    const { data: profileData } = await admin
      .from("profiles")
      .select("student_id, auth_methods")
      .eq("id", authUser.uid)
      .maybeSingle();
    const profile = profileData as { student_id?: string | null; auth_methods?: unknown } | null;
    const studentId = profile?.student_id as string | undefined;

    if (!studentId) {
      const authMethods = Array.isArray(profile?.auth_methods)
        ? [...new Set([...(profile.auth_methods as string[]), "google"])]
        : ["google"];
      await admin
        .from("profiles")
        .update({
          email: googleEmail,
          photo_url: (googleIdentity?.identity_data?.avatar_url as string | undefined) || null,
          auth_methods: authMethods,
          updated_at: new Date().toISOString(),
        })
        .eq("id", authUser.uid);
      return NextResponse.json({ success: true, email: googleEmail });
    }

    const account = await getStudentAccount(studentId);
    if (!account) {
      return NextResponse.json({ error: "ไม่พบข้อมูลนักเรียน" }, { status: 404 });
    }
    if (
      account.linkedGoogleEmail &&
      account.linkedGoogleEmail !== googleEmail &&
      account.linkedUid &&
      account.linkedUid !== authUser.uid
    ) {
      return NextResponse.json(
        { error: "บัญชี Google นี้ถูกผูกกับเลขประจำตัวอื่นแล้ว" },
        { status: 409 }
      );
    }

    await admin
      .from("student_accounts")
      .update({
        linked_uid: authUser.uid,
        linked_google_email: googleEmail,
        updated_at: new Date().toISOString(),
      })
      .eq("student_id", studentId);

    const existingMethods = (profile?.auth_methods as string[] | undefined) || [];
    const authMethods = Array.from(new Set([...existingMethods, "google"]));
    await syncAppUserFromStudent(authUser.uid, account, {
      email: googleEmail,
      displayName:
        (user?.user_metadata?.display_name as string | undefined) ||
        `${account.firstName} ${account.lastName}`,
      photoURL: (googleIdentity?.identity_data?.avatar_url as string | undefined) || undefined,
      authMethods: authMethods as ("google" | "password" | "pin" | "passkey")[],
    });

    return NextResponse.json({ success: true, email: googleEmail });
  } catch (err) {
    console.error("Connect Google error:", err);
    return NextResponse.json({ error: "เชื่อมบัญชี Google ไม่สำเร็จ" }, { status: 500 });
  }
}
