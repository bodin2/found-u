import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import type {
  AppUser,
  ParsedStudentCsvRow,
  StudentAccount,
  StudentImportSummary,
} from "@/lib/types";

export const STUDENT_ACCOUNTS_COLLECTION = "studentAccounts";
export const ADMIN_WHITELIST_COLLECTION = "adminWhitelist";
export const PASSKEY_LOOKUP_COLLECTION = "passkeyLookup";

const SCRYPT_KEYLEN = 64;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getSchoolAuthDomain(): string {
  return process.env.SCHOOL_AUTH_DOMAIN || "foundu.school";
}

export function normalizeStudentId(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return "";
  return digits.padStart(5, "0").slice(-5);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function studentIdToAuthEmail(studentId: string): string {
  return `${normalizeStudentId(studentId)}@students.${getSchoolAuthDomain()}`;
}

export function isValidStudentId(studentId: string): boolean {
  return /^\d{5}$/.test(normalizeStudentId(studentId));
}

export function isValidSchoolPassword(password: string): boolean {
  return /^[a-zA-Z0-9]{7,8}$/.test(password);
}

export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

export function isValidNewPassword(password: string): boolean {
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password);
}

export function hashSecret(secret: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(secret, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifySecret(secret: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, "hex");
  const testBuffer = scryptSync(secret, salt, SCRYPT_KEYLEN);
  if (hashBuffer.length !== testBuffer.length) return false;
  return timingSafeEqual(hashBuffer, testBuffer);
}

export function checkRateLimit(key: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }
  entry.count += 1;
  return { allowed: true };
}

export function parseStudentCsvContent(content: string): {
  rows: ParsedStudentCsvRow[];
  errors: { line: number; message: string }[];
} {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows: ParsedStudentCsvRow[] = [];
  const errors: { line: number; message: string }[] = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (line.startsWith("#") || line.toLowerCase().startsWith("studentid")) return;

    const parts = line.split(":");
    if (parts.length < 5) {
      errors.push({ line: lineNumber, message: "รูปแบบไม่ถูกต้อง ต้องเป็น เลขประจำตัว:รหัสผ่าน:ชื่อ:นามสกุล:ชื่อเล่น" });
      return;
    }

    const [rawId, password, firstName, lastName, nickname] = parts;
    const studentId = normalizeStudentId(rawId);

    if (!isValidStudentId(studentId)) {
      errors.push({ line: lineNumber, message: `เลขประจำตัวไม่ถูกต้อง: ${rawId}` });
      return;
    }
    if (!isValidSchoolPassword(password)) {
      errors.push({ line: lineNumber, message: `รหัสผ่านต้องเป็น a-z A-Z 0-9 ความยาว 7-8 ตัว (แถว ${studentId})` });
      return;
    }
    if (!firstName?.trim() || !lastName?.trim()) {
      errors.push({ line: lineNumber, message: "ต้องมีชื่อและนามสกุล" });
      return;
    }

    rows.push({
      studentId,
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      nickname: (nickname ?? "").trim() || firstName.trim(),
      lineNumber,
    });
  });

  return { rows, errors };
}

export async function getStudentIdByPasskeyCredential(credentialId: string): Promise<string | null> {
  const doc = await adminDb.collection(PASSKEY_LOOKUP_COLLECTION).doc(credentialId).get();
  if (doc.exists) {
    const studentId = doc.data()?.studentId as string | undefined;
    if (studentId && isValidStudentId(studentId)) return normalizeStudentId(studentId);
  }

  const snapshot = await adminDb.collection(STUDENT_ACCOUNTS_COLLECTION).get();
  for (const accountDoc of snapshot.docs) {
    const credentials = accountDoc.data().passkeyCredentials as StudentAccount["passkeyCredentials"];
    if (credentials?.some((c) => c.credentialId === credentialId)) {
      const studentId = normalizeStudentId(accountDoc.id);
      await savePasskeyLookup(credentialId, studentId);
      return studentId;
    }
  }
  return null;
}

export async function savePasskeyLookup(credentialId: string, studentId: string): Promise<void> {
  await adminDb.collection(PASSKEY_LOOKUP_COLLECTION).doc(credentialId).set({
    studentId: normalizeStudentId(studentId),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export function studentIdFromPasskeyUserHandle(userHandle?: string): string | null {
  if (!userHandle) return null;
  try {
    const decoded = Buffer.from(userHandle, "base64url").toString("utf8");
    if (isValidStudentId(decoded)) return normalizeStudentId(decoded);
  } catch {
    // ignore invalid userHandle
  }
  return null;
}

export async function getStudentAccount(studentId: string): Promise<StudentAccount | null> {
  const doc = await adminDb.collection(STUDENT_ACCOUNTS_COLLECTION).doc(normalizeStudentId(studentId)).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    studentId: data.studentId,
    firstName: data.firstName,
    lastName: data.lastName,
    nickname: data.nickname,
    schoolPasswordHash: data.schoolPasswordHash,
    currentPasswordHash: data.currentPasswordHash,
    mustChangePassword: data.mustChangePassword ?? true,
    hasLoggedInOnce: data.hasLoggedInOnce ?? false,
    linkedUid: data.linkedUid,
    linkedGoogleEmail: data.linkedGoogleEmail,
    pinHash: data.pinHash,
    passkeyCredentials: data.passkeyCredentials,
    status: data.status ?? "active",
    importBatchId: data.importBatchId,
    createdAt: (data.createdAt as Timestamp)?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate?.() ?? new Date(),
  };
}

export async function isAdminWhitelisted(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  const doc = await adminDb.collection(ADMIN_WHITELIST_COLLECTION).doc(normalized).get();
  return doc.exists;
}

export async function ensureFirebaseUserForStudent(
  studentId: string,
  displayName: string,
  password?: string
): Promise<string> {
  const id = normalizeStudentId(studentId);
  const email = studentIdToAuthEmail(id);
  let userRecord;

  try {
    userRecord = await adminAuth.getUserByEmail(email);
  } catch {
    userRecord = await adminAuth.createUser({
      email,
      password: password || randomBytes(16).toString("hex"),
      displayName,
      emailVerified: true,
    });
  }

  if (password) {
    await adminAuth.updateUser(userRecord.uid, { password, displayName });
  } else if (displayName) {
    await adminAuth.updateUser(userRecord.uid, { displayName });
  }

  return userRecord.uid;
}

export async function issueStudentCustomToken(uid: string): Promise<string> {
  return adminAuth.createCustomToken(uid);
}

export async function syncAppUserFromStudent(
  uid: string,
  account: StudentAccount,
  extras?: Partial<AppUser>
): Promise<void> {
  const displayName = `${account.firstName} ${account.lastName}`.trim();
  const userRef = adminDb.collection("users").doc(uid);
  const existing = await userRef.get();

  const base = {
    uid,
    email: studentIdToAuthEmail(account.studentId),
    displayName,
    studentId: account.studentId,
    firstName: account.firstName,
    lastName: account.lastName,
    nickname: account.nickname,
    isStudentVerified: true,
    mustChangePassword: account.mustChangePassword,
    updatedAt: FieldValue.serverTimestamp(),
    ...extras,
  };

  if (existing.exists) {
    await userRef.set(base, { merge: true });
  } else {
    await userRef.set({
      ...base,
      role: "user",
      banStatus: "none",
      hasSeenTutorial: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
}

export async function promoteAdminUser(
  uid: string,
  email: string,
  displayName: string,
  photoURL?: string
): Promise<void> {
  const userRef = adminDb.collection("users").doc(uid);
  const existing = await userRef.get();
  const payload: Record<string, unknown> = {
    uid,
    email: normalizeEmail(email),
    displayName: displayName || email,
    photoURL: photoURL || null,
    role: "admin",
    isStudentVerified: true,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (!existing.exists) {
    payload.banStatus = "none";
    payload.hasSeenTutorial = false;
    payload.createdAt = FieldValue.serverTimestamp();
  }
  await userRef.set(payload, { merge: true });
}

export async function verifyStudentPassword(
  studentId: string,
  password: string
): Promise<{ ok: true; account: StudentAccount } | { ok: false; error: string }> {
  const account = await getStudentAccount(studentId);
  if (!account) return { ok: false, error: "ไม่พบเลขประจำตัวในระบบ" };
  if (account.status === "disabled") return { ok: false, error: "บัญชีนี้ถูกปิดใช้งาน" };
  if (!verifySecret(password, account.currentPasswordHash)) {
    return { ok: false, error: "รหัสผ่านไม่ถูกต้อง" };
  }
  return { ok: true, account };
}

export async function verifySchoolPassword(
  studentId: string,
  schoolPassword: string
): Promise<{ ok: true; account: StudentAccount } | { ok: false; error: string }> {
  const account = await getStudentAccount(studentId);
  if (!account) return { ok: false, error: "ไม่พบเลขประจำตัวในระบบ" };
  if (!verifySecret(schoolPassword, account.schoolPasswordHash)) {
    return { ok: false, error: "รหัสผ่านโรงเรียนไม่ถูกต้อง" };
  }
  return { ok: true, account };
}

export async function loginStudentWithPassword(
  studentId: string,
  password: string
): Promise<
  | { ok: true; customToken: string; mustChangePassword: boolean; uid: string }
  | { ok: false; error: string; retryAfterMs?: number }
> {
  const id = normalizeStudentId(studentId);
  const rate = checkRateLimit(`login:${id}`);
  if (!rate.allowed) {
    return {
      ok: false,
      error: "ลองเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่",
      retryAfterMs: rate.retryAfterMs,
    };
  }

  const verified = await verifyStudentPassword(id, password);
  if (!verified.ok) return { ok: false, error: verified.error };

  const { account } = verified;
  const displayName = `${account.firstName} ${account.lastName}`;

  let uid = account.linkedUid;
  if (!uid) {
    uid = await ensureFirebaseUserForStudent(id, displayName, password);
  } else {
    try {
      await adminAuth.getUser(uid);
    } catch {
      uid = await ensureFirebaseUserForStudent(id, displayName, password);
    }
  }

  await adminDb.collection(STUDENT_ACCOUNTS_COLLECTION).doc(id).set(
    {
      linkedUid: uid,
      hasLoggedInOnce: true,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await syncAppUserFromStudent(uid, { ...account, linkedUid: uid, hasLoggedInOnce: true });

  const customToken = await issueStudentCustomToken(uid);
  return {
    ok: true,
    customToken,
    mustChangePassword: account.mustChangePassword,
    uid,
  };
}

export async function loginStudentWithPin(
  studentId: string,
  pin: string
): Promise<
  | { ok: true; customToken: string; mustChangePassword: boolean; uid: string }
  | { ok: false; error: string; retryAfterMs?: number }
> {
  const id = normalizeStudentId(studentId);
  const rate = checkRateLimit(`pin-login:${id}`);
  if (!rate.allowed) {
    return { ok: false, error: "ลองบ่อยเกินไป กรุณารอสักครู่", retryAfterMs: rate.retryAfterMs };
  }

  const account = await getStudentAccount(id);
  if (!account) return { ok: false, error: "ไม่พบเลขประจำตัวในระบบ" };
  if (account.status === "disabled") return { ok: false, error: "บัญชีนี้ถูกปิดใช้งาน" };
  if (!account.pinHash) return { ok: false, error: "ยังไม่ได้ตั้ง PIN" };
  if (!verifySecret(pin, account.pinHash)) return { ok: false, error: "PIN ไม่ถูกต้อง" };
  if (!account.linkedUid) {
    return { ok: false, error: "กรุณาเข้าสู่ระบบด้วยรหัสผ่านก่อนตั้ง PIN" };
  }

  const customToken = await issueStudentCustomToken(account.linkedUid);
  return {
    ok: true,
    customToken,
    mustChangePassword: account.mustChangePassword,
    uid: account.linkedUid,
  };
}

export async function importStudentRows(
  rows: ParsedStudentCsvRow[],
  importBatchId: string,
  adminUid: string
): Promise<StudentImportSummary> {
  const summary: StudentImportSummary = { created: 0, updated: 0, skipped: 0, errors: [] };

  for (const row of rows) {
    try {
      const ref = adminDb.collection(STUDENT_ACCOUNTS_COLLECTION).doc(row.studentId);
      const existing = await ref.get();
      const displayName = `${row.firstName} ${row.lastName}`;

      if (!existing.exists) {
        const schoolHash = hashSecret(row.password);
        await ref.set({
          studentId: row.studentId,
          firstName: row.firstName,
          lastName: row.lastName,
          nickname: row.nickname,
          schoolPasswordHash: schoolHash,
          currentPasswordHash: schoolHash,
          mustChangePassword: true,
          hasLoggedInOnce: false,
          status: "active",
          importBatchId,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        await ensureFirebaseUserForStudent(row.studentId, displayName, row.password);
        summary.created += 1;
        continue;
      }

      const data = existing.data()!;
      const hasLoggedInOnce = data.hasLoggedInOnce === true;

      if (hasLoggedInOnce) {
        await ref.set(
          {
            firstName: row.firstName,
            lastName: row.lastName,
            nickname: row.nickname,
            importBatchId,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        summary.updated += 1;
      } else {
        const schoolHash = hashSecret(row.password);
        await ref.set(
          {
            firstName: row.firstName,
            lastName: row.lastName,
            nickname: row.nickname,
            schoolPasswordHash: schoolHash,
            currentPasswordHash: schoolHash,
            mustChangePassword: true,
            importBatchId,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        await ensureFirebaseUserForStudent(row.studentId, displayName, row.password);
        summary.updated += 1;
      }
    } catch (err) {
      summary.errors.push({
        line: row.lineNumber,
        message: err instanceof Error ? err.message : "เกิดข้อผิดพลาด",
      });
    }
  }

  void adminUid;
  return summary;
}

function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "");
}

export function getRpId(request?: NextRequest): string {
  const forwardedHost = request?.headers.get("x-forwarded-host");
  const host = request?.headers.get("host");
  const requestHost = forwardedHost || host;
  if (requestHost) {
    return normalizeHost(requestHost);
  }

  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
  if (envUrl) {
    try {
      const hostFromUrl = envUrl.startsWith("http") ? new URL(envUrl).hostname : envUrl;
      return normalizeHost(hostFromUrl);
    } catch {
      return "localhost";
    }
  }
  return "localhost";
}

export function getOrigin(request?: NextRequest): string {
  const forwardedHost = request?.headers.get("x-forwarded-host");
  const host = request?.headers.get("host");
  const requestHost = forwardedHost || host;
  if (requestHost) {
    const proto = request?.headers.get("x-forwarded-proto") || "https";
    return `${proto}://${normalizeHost(requestHost)}`;
  }

  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (url) return url.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
