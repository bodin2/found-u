import { NextRequest, NextResponse } from "next/server";
import { verifyAuthRequest, isAdminUser } from "@/lib/nfc-server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ADMIN_WHITELIST_COLLECTION,
  STUDENT_ACCOUNTS_COLLECTION,
  normalizeEmail,
} from "@/lib/student-auth-server";
import { parseJsonBody } from "@/lib/parse-request";
import { addAdminWhitelistSchema } from "@/lib/validations/admin";

export async function GET(request: NextRequest) {
  const authUser = await verifyAuthRequest(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdminUser(authUser.uid))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const [studentsSnap, whitelistSnap, linkedSnap, disabledSnap, registeredSnap] = await Promise.all([
    admin.from(STUDENT_ACCOUNTS_COLLECTION).select("*", { count: "exact", head: true }),
    admin.from(ADMIN_WHITELIST_COLLECTION).select("*"),
    admin
      .from(STUDENT_ACCOUNTS_COLLECTION)
      .select("*", { count: "exact", head: true })
      .eq("has_logged_in_once", true),
    admin
      .from(STUDENT_ACCOUNTS_COLLECTION)
      .select("*", { count: "exact", head: true })
      .eq("status", "disabled"),
    admin
      .from(STUDENT_ACCOUNTS_COLLECTION)
      .select("*", { count: "exact", head: true })
      .eq("is_registered", true),
  ]);

  const totalStudents = studentsSnap.count ?? 0;
  const registeredCount = registeredSnap.count ?? 0;

  return NextResponse.json({
    totalStudents,
    loggedInCount: linkedSnap.count ?? 0,
    registeredCount,
    pendingRegistrationCount: Math.max(0, totalStudents - registeredCount),
    disabledCount: disabledSnap.count ?? 0,
    whitelist: whitelistSnap.data ?? [],
  });
}

export async function POST(request: NextRequest) {
  const authUser = await verifyAuthRequest(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdminUser(authUser.uid))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = await parseJsonBody(request, addAdminWhitelistSchema);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const email = normalizeEmail(parsed.data.email || "");
  const note = parsed.data.note;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "อีเมลไม่ถูกต้อง" }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin.from(ADMIN_WHITELIST_COLLECTION).upsert(
    {
      email,
      note: note || null,
      added_by: authUser.uid,
      added_at: new Date().toISOString(),
    },
    { onConflict: "email" }
  );

  return NextResponse.json({ success: true, email });
}

export async function DELETE(request: NextRequest) {
  const authUser = await verifyAuthRequest(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdminUser(authUser.uid))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const email = normalizeEmail(request.nextUrl.searchParams.get("email") || "");
  if (!email) return NextResponse.json({ error: "ต้องระบุ email" }, { status: 400 });

  const admin = createAdminClient();
  await admin.from(ADMIN_WHITELIST_COLLECTION).delete().eq("email", email);
  return NextResponse.json({ success: true });
}
