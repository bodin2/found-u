import { NextRequest, NextResponse } from "next/server";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { verifyAuthRequest } from "@/lib/nfc-server";
import { adminDb } from "@/lib/firebase-admin";
import {
  getOrigin,
  getRpId,
  getStudentAccount,
  normalizeStudentId,
  savePasskeyLookup,
  STUDENT_ACCOUNTS_COLLECTION,
} from "@/lib/student-auth-server";
import { newChallengeKey, storeChallenge } from "@/lib/passkey-challenge-store";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  const authUser = await verifyAuthRequest(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userDoc = await adminDb.collection("users").doc(authUser.uid).get();
  const studentId = userDoc.data()?.studentId as string | undefined;
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
    const body = await request.json();
    const { challengeKey, response } = body;
    const { consumeChallenge } = await import("@/lib/passkey-challenge-store");
    const stored = consumeChallenge(challengeKey);
    if (!stored?.studentId) {
      return NextResponse.json({ error: "Challenge หมดอายุ" }, { status: 400 });
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: stored.challenge,
      expectedOrigin: getOrigin(request),
      expectedRPID: getRpId(request),
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: "ยืนยัน PassKey ไม่สำเร็จ" }, { status: 400 });
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    const studentId = normalizeStudentId(stored.studentId);

    await adminDb.collection(STUDENT_ACCOUNTS_COLLECTION).doc(studentId).set(
      {
        passkeyCredentials: FieldValue.arrayUnion({
          credentialId: credential.id,
          publicKey: Buffer.from(credential.publicKey).toString("base64url"),
          counter: credential.counter,
          deviceType: credentialDeviceType,
          backedUp: credentialBackedUp,
          createdAt: new Date().toISOString(),
        }),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await adminDb.collection("users").doc(authUser.uid).set(
      {
        authMethods: FieldValue.arrayUnion("passkey"),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

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

  const userDoc = await adminDb.collection("users").doc(authUser.uid).get();
  const studentId = userDoc.data()?.studentId as string | undefined;
  if (!studentId) return NextResponse.json({ hasPasskey: false, count: 0 });

  const account = await getStudentAccount(studentId);
  const count = account?.passkeyCredentials?.length ?? 0;
  return NextResponse.json({ hasPasskey: count > 0, count });
}

export async function DELETE(request: NextRequest) {
  const authUser = await verifyAuthRequest(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userDoc = await adminDb.collection("users").doc(authUser.uid).get();
  const studentId = userDoc.data()?.studentId as string | undefined;
  if (!studentId) {
    return NextResponse.json({ error: "ไม่พบข้อมูลนักเรียน" }, { status: 400 });
  }

  await adminDb.collection(STUDENT_ACCOUNTS_COLLECTION).doc(normalizeStudentId(studentId)).set(
    {
      passkeyCredentials: [],
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await adminDb.collection("users").doc(authUser.uid).set(
    {
      authMethods: FieldValue.arrayRemove("passkey"),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return NextResponse.json({ success: true });
}
