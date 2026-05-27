import { NextRequest, NextResponse } from "next/server";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import {
  getOrigin,
  getRpId,
  getStudentAccount,
  getStudentIdByPasskeyCredential,
  isValidStudentId,
  issueStudentCustomToken,
  normalizeStudentId,
  savePasskeyLookup,
  studentIdFromPasskeyUserHandle,
  STUDENT_ACCOUNTS_COLLECTION,
} from "@/lib/student-auth-server";
import { newChallengeKey, storeChallenge, consumeChallenge } from "@/lib/passkey-challenge-store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawStudentId = body.studentId ? normalizeStudentId(body.studentId) : "";
    const discoverable = !rawStudentId;

    if (discoverable) {
      const options = await generateAuthenticationOptions({
        rpID: getRpId(request),
        userVerification: "preferred",
      });

      const key = newChallengeKey("auth");
      storeChallenge(key, { challenge: options.challenge, discoverable: true });

      return NextResponse.json({ options, challengeKey: key });
    }

    if (!isValidStudentId(rawStudentId)) {
      return NextResponse.json({ error: "เลขประจำตัวต้องเป็นตัวเลข 5 หลัก" }, { status: 400 });
    }

    const account = await getStudentAccount(rawStudentId);
    if (!account?.passkeyCredentials?.length) {
      return NextResponse.json({ error: "ยังไม่ได้ลงทะเบียน PassKey" }, { status: 400 });
    }

    const options = await generateAuthenticationOptions({
      rpID: getRpId(request),
      allowCredentials: account.passkeyCredentials.map((c) => ({
        id: c.credentialId,
        transports: c.transports as AuthenticatorTransport[] | undefined,
      })),
      userVerification: "preferred",
    });

    const key = newChallengeKey("auth");
    storeChallenge(key, { challenge: options.challenge, studentId: rawStudentId });

    return NextResponse.json({ options, challengeKey: key });
  } catch (err) {
    console.error("Passkey login options error:", err);
    return NextResponse.json({ error: "ไม่สามารถเริ่ม PassKey login" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { challengeKey, response } = body;

    const stored = consumeChallenge(challengeKey);
    if (!stored?.challenge) {
      return NextResponse.json({ error: "Challenge หมดอายุ" }, { status: 400 });
    }

    let studentId = normalizeStudentId(body.studentId || stored.studentId || "");
    if (!studentId && response?.userHandle) {
      studentId = studentIdFromPasskeyUserHandle(response.userHandle) || "";
    }
    if (!studentId && response?.id) {
      studentId = (await getStudentIdByPasskeyCredential(response.id)) || "";
    }

    if (!isValidStudentId(studentId)) {
      return NextResponse.json({ error: "ไม่พบบัญชีที่ผูกกับ PassKey นี้" }, { status: 401 });
    }

    if (stored.studentId && stored.studentId !== studentId) {
      return NextResponse.json({ error: "Challenge หมดอายุ" }, { status: 400 });
    }

    const account = await getStudentAccount(studentId);
    if (!account?.passkeyCredentials?.length || !account.linkedUid) {
      return NextResponse.json({ error: "ไม่พบ PassKey" }, { status: 400 });
    }

    const credential = account.passkeyCredentials.find((c) => c.credentialId === response.id);
    if (!credential) {
      return NextResponse.json({ error: "PassKey ไม่ถูกต้อง" }, { status: 401 });
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: stored.challenge,
      expectedOrigin: getOrigin(request),
      expectedRPID: getRpId(request),
      credential: {
        id: credential.credentialId,
        publicKey: Buffer.from(credential.publicKey, "base64url"),
        counter: credential.counter,
        transports: credential.transports as AuthenticatorTransport[] | undefined,
      },
    });

    if (!verification.verified) {
      return NextResponse.json({ error: "ยืนยัน PassKey ไม่สำเร็จ" }, { status: 401 });
    }

    const newCounter = verification.authenticationInfo.newCounter;
    const updatedCredentials = account.passkeyCredentials.map((c) =>
      c.credentialId === credential.credentialId ? { ...c, counter: newCounter } : c
    );

    await adminDb.collection(STUDENT_ACCOUNTS_COLLECTION).doc(studentId).set(
      {
        passkeyCredentials: updatedCredentials,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await savePasskeyLookup(credential.credentialId, studentId);

    const customToken = await issueStudentCustomToken(account.linkedUid);
    return NextResponse.json({
      customToken,
      mustChangePassword: account.mustChangePassword,
    });
  } catch (err) {
    console.error("Passkey login verify error:", err);
    return NextResponse.json({ error: "เข้าสู่ระบบด้วย PassKey ไม่สำเร็จ" }, { status: 500 });
  }
}
