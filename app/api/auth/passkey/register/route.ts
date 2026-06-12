import { NextRequest, NextResponse } from "next/server";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAuthRequest } from "@/lib/nfc-server";
import { parseJsonBody } from "@/lib/parse-request";
import {
  getOrigin,
  getRpId,
  getStudentAccount,
  normalizeStudentId,
  savePasskeyLookup,
  STUDENT_ACCOUNTS_COLLECTION,
} from "@/lib/student-auth-server";
import { newChallengeKey, storeChallenge } from "@/lib/passkey-challenge-store";

const passkeyRegisterVerifyBodySchema = z.object({
  challengeKey: z.string().min(1, "challengeKey ไม่ถูกต้อง"),
  response: z.record(z.string(), z.unknown()),
});

async function getStudentIdFromProfile(uid: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("student_id").eq("id", uid).maybeSingle();
  return (data?.student_id as string | null | undefined) ?? null;
}

export async function POST(request: NextRequest) {
  const authUser = await verifyAuthRequest(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const studentId = await getStudentIdFromProfile(authUser.uid);
  if (!studentId) return NextResponse.json({ error: "ไม่พบข้อมูลนักเรียน" }, { status: 400 });

  const account = await getStudentAccount(studentId);
  if (!account) return NextResponse.json({ error: "ไม่พบบัญชีนักเรียน" }, { status: 404 });

  const rpID = getRpId(request);
  const options = await generateRegistrationOptions({
    rpName: "Found-U",
    rpID,
    userName: studentId,
    userDisplayName: `${account.firstName} ${account.lastName}`,
    userID: new TextEncoder().encode(studentId),
    excludeCredentials: (account.passkeyCredentials || []).map((c) => ({
      id: c.credentialId,
      transports: c.transports as AuthenticatorTransport[] | undefined,
    })),
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "preferred",
    },
  });

  const key = newChallengeKey("reg");
  storeChallenge(key, { challenge: options.challenge, studentId, uid: authUser.uid });

  return NextResponse.json({ options, challengeKey: key });
}

export async function PUT(request: NextRequest) {
  const authUser = await verifyAuthRequest(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const parsed = await parseJsonBody(request, passkeyRegisterVerifyBodySchema);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const { challengeKey, response } = parsed.data;
    const { consumeChallenge } = await import("@/lib/passkey-challenge-store");
    const stored = consumeChallenge(challengeKey);
    if (!stored?.studentId) {
      return NextResponse.json({ error: "Challenge หมดอายุ" }, { status: 400 });
    }

    const verification = await verifyRegistrationResponse({
      response: response as any,
      expectedChallenge: stored.challenge,
      expectedOrigin: getOrigin(request),
      expectedRPID: getRpId(request),
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: "ยืนยัน PassKey ไม่สำเร็จ" }, { status: 400 });
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    const studentId = normalizeStudentId(stored.studentId);
    const admin = createAdminClient();
    const account = await getStudentAccount(studentId);
    if (!account) {
      return NextResponse.json({ error: "ไม่พบบัญชีนักเรียน" }, { status: 404 });
    }

    const existingCredentials = account.passkeyCredentials ?? [];
    const responseRecord = response as Record<string, unknown>;
    const responsePayload =
      responseRecord.response && typeof responseRecord.response === "object"
        ? (responseRecord.response as Record<string, unknown>)
        : {};

    const nextCredentials = [
      ...existingCredentials.filter((item) => item.credentialId !== credential.id),
      {
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString("base64url"),
        counter: credential.counter,
        transports: responsePayload.transports as string[] | undefined,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        createdAt: new Date(),
      },
    ];

    await admin
      .from(STUDENT_ACCOUNTS_COLLECTION)
      .update({
        passkey_credentials: nextCredentials,
        updated_at: new Date().toISOString(),
      })
      .eq("student_id", studentId);

    const { data: profileData } = await admin
      .from("profiles")
      .select("auth_methods")
      .eq("id", authUser.uid)
      .maybeSingle();
    const existingMethods = Array.isArray(profileData?.auth_methods)
      ? (profileData.auth_methods as string[])
      : [];
    await admin
      .from("profiles")
      .update({
        auth_methods: Array.from(new Set([...existingMethods, "passkey"])),
        updated_at: new Date().toISOString(),
      })
      .eq("id", authUser.uid);

    await savePasskeyLookup(credential.id, studentId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Passkey register verify error:", err);
    return NextResponse.json({ error: "ลงทะเบียน PassKey ไม่สำเร็จ" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const authUser = await verifyAuthRequest(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const studentId = await getStudentIdFromProfile(authUser.uid);
  if (!studentId) return NextResponse.json({ hasPasskey: false, count: 0 });

  const account = await getStudentAccount(studentId);
  const count = account?.passkeyCredentials?.length ?? 0;
  return NextResponse.json({ hasPasskey: count > 0, count });
}

export async function DELETE(request: NextRequest) {
  const authUser = await verifyAuthRequest(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const studentId = await getStudentIdFromProfile(authUser.uid);
  if (!studentId) {
    return NextResponse.json({ error: "ไม่พบข้อมูลนักเรียน" }, { status: 400 });
  }
  const admin = createAdminClient();
  const account = await getStudentAccount(studentId);
  const credentialIds = (account?.passkeyCredentials ?? []).map((item) => item.credentialId);

  await admin
    .from(STUDENT_ACCOUNTS_COLLECTION)
    .update({
      passkey_credentials: [],
      updated_at: new Date().toISOString(),
    })
    .eq("student_id", normalizeStudentId(studentId));

  if (credentialIds.length > 0) {
    await admin.from("passkey_lookup").delete().in("credential_id", credentialIds);
  }

  const { data: profileData } = await admin
    .from("profiles")
    .select("auth_methods")
    .eq("id", authUser.uid)
    .maybeSingle();
  const nextMethods = Array.isArray(profileData?.auth_methods)
    ? (profileData.auth_methods as string[]).filter((method) => method !== "passkey")
    : [];
  await admin
    .from("profiles")
    .update({
      auth_methods: nextMethods,
      updated_at: new Date().toISOString(),
    })
    .eq("id", authUser.uid);

  return NextResponse.json({ success: true });
}
