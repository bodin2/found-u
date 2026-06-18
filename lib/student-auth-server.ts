import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mintSessionForStudentId, signInStudentSession } from "@/lib/supabase/auth-session";
import { checkStudentIdEligibleForSecondaryAuth } from "@/lib/auth-eligibility";
import type {
  AppUser,
  ParsedStudentCsvRow,
  ParsedStudentRosterRow,
  StudentAccount,
  StudentImportSummary,
} from "@/lib/types";
import type { Database } from "@/lib/database.types";
import { getAppOrigin, getAppRpId } from "@/lib/app-domains";

export const STUDENT_ACCOUNTS_COLLECTION = "accounts";
export const ADMIN_WHITELIST_COLLECTION = "admin_whitelist";
export const PASSKEY_LOOKUP_COLLECTION = "passkey_lookup";

/** เลขประจำตัวแอดมินระบบ (ล็อกอินด้วยรหัสผ่าน → role admin) */
export const BOOTSTRAP_ADMIN_STUDENT_IDS = new Set(["11111"]);

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

function formatImportError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const message = String((err as { message: unknown }).message);
    const code = "code" in err ? String((err as { code: unknown }).code) : "";
    return code ? `${message} (${code})` : message;
  }
  return "เกิดข้อผิดพลาด";
}

async function ensureRosterPlaceholderAuthUser(
  studentId: string,
  displayName: string
): Promise<string> {
  const placeholderPassword = randomBytes(24).toString("hex");
  return ensureAuthUserForStudent(studentId, displayName, placeholderPassword, {
    verifyPasswordLogin: false,
  });
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace > 0) {
    return {
      firstName: trimmed.slice(0, lastSpace).trim(),
      lastName: trimmed.slice(lastSpace + 1).trim(),
    };
  }
  return { firstName: trimmed, lastName: "" };
}

function isClassOrRoomField(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (/^[มปด]\./.test(v)) return true;
  if (/^\d{1,2}$/.test(v)) return true;
  if (/^[มปด]\.\d+\/\d+$/.test(v)) return true;
  return false;
}

function parseClassField(value: string): { gradeLevel?: string; roomNumber?: string } {
  const v = value.trim();
  if (!v) return {};

  const compound = v.match(/^([มปด]\.\d+)\/(\d+)$/);
  if (compound) {
    return { gradeLevel: compound[1], roomNumber: compound[2] };
  }
  if (/^[มปด]\./.test(v)) {
    return { gradeLevel: v };
  }
  if (/^\d{1,2}$/.test(v)) {
    return { roomNumber: v };
  }
  return { gradeLevel: v };
}

export function parseStudentRosterContent(content: string): {
  rows: ParsedStudentRosterRow[];
  errors: { line: number; message: string }[];
} {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows: ParsedStudentRosterRow[] = [];
  const errors: { line: number; message: string }[] = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (line.startsWith("#") || line.toLowerCase().startsWith("studentid")) return;

    const parts = line.split(":").map((p) => p.trim());
    if (parts.length < 2) {
      errors.push({ line: lineNumber, message: "รูปแบบไม่ถูกต้อง ต้องมีอย่างน้อย เลขประจำตัว:ชื่อ" });
      return;
    }

    const rawId = parts[0];
    const studentId = normalizeStudentId(rawId);
    if (!isValidStudentId(studentId)) {
      errors.push({ line: lineNumber, message: `เลขประจำตัวไม่ถูกต้อง: ${rawId}` });
      return;
    }

    // Legacy: id:password:first:last:nickname
    if (parts.length >= 5 && isValidSchoolPassword(parts[1])) {
      const [, password, firstName, lastName, nickname] = parts;
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
        format: "legacy",
        lineNumber,
      });
      return;
    }

    let firstName = "";
    let lastName = "";
    let gradeLevel: string | undefined;
    let roomNumber: string | undefined;

    if (parts.length === 4) {
      const classFields = parseClassField(parts[1]);
      gradeLevel = classFields.gradeLevel;
      roomNumber = classFields.roomNumber;
      firstName = parts[2];
      lastName = parts[3];
    } else if (parts.length === 3) {
      if (isClassOrRoomField(parts[1])) {
        const classFields = parseClassField(parts[1]);
        gradeLevel = classFields.gradeLevel;
        roomNumber = classFields.roomNumber;
        const names = splitFullName(parts[2]);
        firstName = names.firstName;
        lastName = names.lastName;
      } else {
        firstName = parts[1];
        lastName = parts[2];
      }
    } else if (parts.length === 2) {
      const names = splitFullName(parts[1]);
      firstName = names.firstName;
      lastName = names.lastName;
    } else {
      errors.push({
        line: lineNumber,
        message: "รูปแบบไม่ถูกต้อง รองรับ 2-4 คอลัมน์ (หรือ 5 คอลัมน์แบบ legacy พร้อมรหัสผ่าน)",
      });
      return;
    }

    if (!firstName?.trim()) {
      errors.push({ line: lineNumber, message: "ต้องมีชื่อ" });
      return;
    }

    rows.push({
      studentId,
      firstName: firstName.trim(),
      lastName: (lastName ?? "").trim(),
      nickname: firstName.trim(),
      gradeLevel,
      roomNumber,
      format: "roster",
      lineNumber,
    });
  });

  return { rows, errors };
}

export function parseStudentCsvContent(content: string): {
  rows: ParsedStudentCsvRow[];
  errors: { line: number; message: string }[];
} {
  const { rows, errors } = parseStudentRosterContent(content);
  const legacyRows: ParsedStudentCsvRow[] = rows
    .filter((row): row is ParsedStudentRosterRow & { password: string } =>
      row.format === "legacy" && !!row.password
    )
    .map((row) => ({
      studentId: row.studentId,
      password: row.password,
      firstName: row.firstName,
      lastName: row.lastName,
      nickname: row.nickname,
      lineNumber: row.lineNumber,
    }));

  return { rows: legacyRows, errors };
}

export async function getStudentIdByPasskeyCredential(credentialId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: lookup } = await admin
    .from(PASSKEY_LOOKUP_COLLECTION)
    .select("student_id")
    .eq("credential_id", credentialId)
    .maybeSingle();

  if (lookup?.student_id && isValidStudentId(lookup.student_id)) {
    return normalizeStudentId(lookup.student_id);
  }

  const { data: accounts } = await admin
    .from(STUDENT_ACCOUNTS_COLLECTION)
    .select("student_id, passkey_credentials");

  for (const account of accounts || []) {
    const credentials = account.passkey_credentials as StudentAccount["passkeyCredentials"];
    if (credentials?.some((c) => c.credentialId === credentialId) && account.student_id) {
      const studentId = normalizeStudentId(account.student_id);
      await savePasskeyLookup(credentialId, studentId);
      return studentId;
    }
  }
  return null;
}

export async function savePasskeyLookup(credentialId: string, studentId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from(PASSKEY_LOOKUP_COLLECTION).upsert(
    {
      credential_id: credentialId,
      student_id: normalizeStudentId(studentId),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "credential_id" }
  );
  if (error) throw error;
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
  const admin = createAdminClient();
  const normalizedId = normalizeStudentId(studentId);
  const { data, error } = await admin
    .from(STUDENT_ACCOUNTS_COLLECTION)
    .select("*")
    .eq("student_id", normalizedId)
    .maybeSingle();
  if (error) {
    console.error("getStudentAccount query failed:", error);
    throw error;
  }
  if (!data) return null;
  const row = data as Record<string, any>;

  const createdAt = row.created_at ?? row.createdAt ?? new Date().toISOString();
  const updatedAt = row.updated_at ?? row.updatedAt ?? new Date().toISOString();

  return {
    studentId: row.student_id ?? row.studentId,
    firstName: row.first_name ?? row.firstName,
    lastName: row.last_name ?? row.lastName,
    nickname: row.nickname,
    gradeLevel: row.grade_level ?? row.gradeLevel ?? undefined,
    roomNumber: row.room_number ?? row.roomNumber ?? undefined,
    isRegistered: (row.is_registered ?? row.isRegistered) === true,
    schoolPasswordHash: row.school_password_hash ?? row.schoolPasswordHash ?? undefined,
    currentPasswordHash: row.current_password_hash ?? row.currentPasswordHash ?? undefined,
    mustChangePassword: (row.must_change_password ?? row.mustChangePassword) ?? false,
    hasLoggedInOnce: (row.has_logged_in_once ?? row.hasLoggedInOnce) ?? false,
    linkedUid: row.linked_uid ?? row.linkedUid ?? undefined,
    pinHash: row.pin_hash ?? row.pinHash ?? undefined,
    passkeyCredentials: (row.passkey_credentials ?? row.passkeyCredentials) ?? undefined,
    status: (row.status ?? "active") as StudentAccount["status"],
    importBatchId: row.import_batch_id ?? row.importBatchId ?? undefined,
    createdAt: new Date(createdAt),
    updatedAt: new Date(updatedAt),
  };
}

export async function isAdminWhitelisted(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  const admin = createAdminClient();
  const { data } = await admin
    .from(ADMIN_WHITELIST_COLLECTION)
    .select("email")
    .eq("email", normalized)
    .maybeSingle();
  return !!data;
}

type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];

/** Resolve accounts row when auth uid may differ from accounts.id (legacy duplicate auth users). */
export async function resolveAccountForAuthUser(
  uid: string,
  metadata?: { student_id?: string | null }
): Promise<AccountRow | null> {
  const admin = createAdminClient();

  const { data: byId } = await admin.from("accounts").select("*").eq("id", uid).maybeSingle();
  if (byId) return byId as AccountRow;

  const { data: byLinked } = await admin
    .from("accounts")
    .select("*")
    .eq("linked_uid", uid)
    .maybeSingle();
  if (byLinked) return byLinked as AccountRow;

  const rawStudentId = metadata?.student_id;
  if (rawStudentId && isValidStudentId(normalizeStudentId(rawStudentId))) {
    const studentId = normalizeStudentId(rawStudentId);
    const { data: byStudent } = await admin
      .from("accounts")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle();
    if (byStudent) return byStudent as AccountRow;
  }

  return null;
}

async function findAuthUserByEmail(email: string) {
  const admin = createAdminClient();
  let page = 1;
  const perPage = 200;

  while (page < 50) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const user = data.users.find((entry) => normalizeEmail(entry.email || "") === email);
    if (user) return user;

    if (!data.nextPage) break;
    page = data.nextPage;
  }

  return null;
}

export async function ensureAuthUserForStudent(
  studentId: string,
  displayName: string,
  password?: string,
  options?: { verifyPasswordLogin?: boolean }
): Promise<string> {
  const admin = createAdminClient();
  const id = normalizeStudentId(studentId);
  const email = studentIdToAuthEmail(id);
  let userRecord: Awaited<ReturnType<typeof admin.auth.admin.getUserById>>["data"]["user"] | null =
    null;

  const account = await getStudentAccount(id);
  if (account?.linkedUid) {
    const { data: linkedUser } = await admin.auth.admin.getUserById(account.linkedUid);
    if (linkedUser?.user) {
      userRecord = linkedUser.user;
    }
  }

  if (!userRecord) {
    userRecord = await findAuthUserByEmail(email);
  }

  if (!userRecord) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: password || randomBytes(16).toString("hex"),
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
        student_id: id,
      },
    });
    if (error || !data.user) throw error ?? new Error("create user failed");
    userRecord = data.user;
  }

  const updatePayload: Parameters<typeof admin.auth.admin.updateUserById>[1] = {
    user_metadata: {
      ...(userRecord.user_metadata || {}),
      display_name: displayName,
      student_id: id,
    },
  };
  if (password) updatePayload.password = password;

  const { data: updated, error } = await admin.auth.admin.updateUserById(userRecord.id, updatePayload);
  if (error) throw error;
  userRecord = updated.user ?? userRecord;

  if (password && options?.verifyPasswordLogin !== false) {
    try {
      await signInStudentSession(id, password, userRecord.id);
    } catch (err) {
      console.warn("ensureAuthUserForStudent: password login verify skipped:", err);
    }
  }

  return userRecord.id;
}

// Backward-compatible alias while routes are being migrated.
export const ensureFirebaseUserForStudent = ensureAuthUserForStudent;

export async function issueStudentCustomToken(uid: string): Promise<string> {
  void uid;
  throw new Error("Custom token flow removed. Use session tokens instead.");
}

/** ซิงก์ auth_methods จากแหล่งข้อมูลจริง */
export async function reconcileStudentAuthState(
  uid: string,
  account: StudentAccount
): Promise<StudentAccount> {
  const admin = createAdminClient();

  const { data: profileData } = await admin
    .from("accounts")
    .select("auth_methods")
    .eq("student_id", account.studentId)
    .maybeSingle();
  const existing = Array.isArray(profileData?.auth_methods)
    ? (profileData.auth_methods as string[])
    : [];

  const methods = new Set(existing);
  methods.add("password");
  if (account.pinHash) methods.add("pin");
  if (account.passkeyCredentials?.length) methods.add("passkey");

  await admin
    .from("accounts")
    .update({
      auth_methods: Array.from(methods),
      linked_uid: uid,
      updated_at: new Date().toISOString(),
    })
    .eq("student_id", account.studentId);

  return account;
}

export async function syncAppUserFromStudent(
  uid: string,
  account: StudentAccount,
  extras?: Partial<AppUser>
): Promise<void> {
  const admin = createAdminClient();
  const displayName = `${account.firstName} ${account.lastName}`.trim();
  const { data: existing } = await admin
    .from("accounts")
    .select("id")
    .or(`id.eq.${uid},student_id.eq.${account.studentId}`)
    .maybeSingle();
  const accountId = existing?.id ?? uid;

  const now = new Date().toISOString();
  const normalized: Database["public"]["Tables"]["accounts"]["Update"] = {
    email: extras?.email ? normalizeEmail(extras.email) : studentIdToAuthEmail(account.studentId),
    display_name: extras?.displayName || displayName,
    student_id: account.studentId,
    first_name: account.firstName,
    last_name: account.lastName,
    nickname: account.nickname,
    photo_url: (extras as { photoURL?: string })?.photoURL || null,
    shown_name: extras?.shownName ?? null,
    ban_status: extras?.banStatus ?? "none",
    is_student_verified: true,
    must_change_password: account.mustChangePassword,
    linked_uid: uid,
    updated_at: now,
  };

  if (extras?.authMethods) {
    normalized.auth_methods = extras.authMethods;
  }

  if (existing) {
    const { error } = await admin.from("accounts").update(normalized).eq("id", accountId);
    if (error) throw error;
  } else {
    const { error } = await admin.from("accounts").insert({
      ...(normalized as Database["public"]["Tables"]["accounts"]["Insert"]),
      id: uid,
      role: extras?.role ?? "user",
      has_seen_tutorial: extras?.hasSeenTutorial ?? false,
      created_at: now,
      updated_at: now,
    });
    if (error) throw error;
  }
}

export async function promoteAdminUser(
  uid: string,
  email: string,
  displayName: string,
  photoURL?: string
): Promise<void> {
  const admin = createAdminClient();
  const { data: existing } = await admin.from("accounts").select("id").eq("id", uid).maybeSingle();
  const now = new Date().toISOString();
  const payload: Database["public"]["Tables"]["accounts"]["Update"] = {
    email: normalizeEmail(email),
    display_name: displayName || email,
    photo_url: photoURL || null,
    role: "admin",
    is_student_verified: true,
    updated_at: now,
  };
  if (!existing) {
    const insertPayload: Database["public"]["Tables"]["accounts"]["Insert"] = {
      ...(payload as Database["public"]["Tables"]["accounts"]["Insert"]),
      id: uid,
      ban_status: "none",
      has_seen_tutorial: false,
      created_at: now,
    };
    const { error } = await admin.from("accounts").insert(insertPayload);
    if (error) throw error;
    return;
  }
  const { error } = await admin.from("accounts").update(payload).eq("id", uid);
  if (error) throw error;
}

export async function verifyStudentPassword(
  studentId: string,
  password: string
): Promise<
  | { ok: true; account: StudentAccount }
  | { ok: false; error: string; needsRegistration?: boolean }
> {
  const account = await getStudentAccount(studentId);
  if (!account) return { ok: false, error: "ไม่พบเลขประจำตัวในระบบ" };
  if (account.status === "disabled") return { ok: false, error: "บัญชีนี้ถูกปิดใช้งาน" };
  if (!account.currentPasswordHash) {
    return {
      ok: false,
      error: "ยังไม่ได้สมัครสมาชิก กรุณากดเริ่มใช้งานเพื่อสมัคร",
      needsRegistration: true,
    };
  }
  if (!verifySecret(password, account.currentPasswordHash)) {
    return { ok: false, error: "รหัสผ่านไม่ถูกต้อง" };
  }
  return { ok: true, account };
}

export async function verifyStudentPin(
  studentId: string,
  pin: string
): Promise<{ ok: true; account: StudentAccount } | { ok: false; error: string }> {
  const account = await getStudentAccount(studentId);
  if (!account) return { ok: false, error: "ไม่พบเลขประจำตัวในระบบ" };
  if (account.status === "disabled") return { ok: false, error: "บัญชีนี้ถูกปิดใช้งาน" };
  if (!account.pinHash) return { ok: false, error: "ยังไม่ได้ตั้ง PIN" };
  if (!verifySecret(pin, account.pinHash)) return { ok: false, error: "PIN ไม่ถูกต้อง" };
  return { ok: true, account };
}

export async function verifySchoolPassword(
  studentId: string,
  schoolPassword: string
): Promise<{ ok: true; account: StudentAccount } | { ok: false; error: string }> {
  const account = await getStudentAccount(studentId);
  if (!account) return { ok: false, error: "ไม่พบเลขประจำตัวในระบบ" };
  if (!account.schoolPasswordHash) {
    return { ok: false, error: "บัญชีนี้ไม่มีรหัสผ่านจากโรงเรียน กรุณาใช้ PIN แทน" };
  }
  if (!verifySecret(schoolPassword, account.schoolPasswordHash)) {
    return { ok: false, error: "รหัสผ่านโรงเรียนไม่ถูกต้อง" };
  }
  return { ok: true, account };
}

export function accountNeedsPinSetup(account: StudentAccount): boolean {
  return account.hasLoggedInOnce && !account.pinHash;
}

export async function loginStudentWithPassword(
  studentId: string,
  password: string
): Promise<
  | {
      ok: true;
      access_token: string;
      refresh_token: string;
      mustChangePassword: boolean;
      mustSetupPin: boolean;
      uid: string;
      studentId: string;
      nickname: string;
    }
  | { ok: false; error: string; retryAfterMs?: number; needsRegistration?: boolean }
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
  if (!verified.ok) {
    return {
      ok: false,
      error: verified.error,
      needsRegistration: verified.needsRegistration,
    };
  }

  const { account } = verified;
  const displayName = `${account.firstName} ${account.lastName}`;

  let uid = account.linkedUid;
  if (!uid) {
    uid = await ensureAuthUserForStudent(id, displayName, password);
  } else {
    const admin = createAdminClient();
    const { data: authUser } = await admin.auth.admin.getUserById(uid);
    if (!authUser?.user) {
      uid = await ensureAuthUserForStudent(id, displayName, password);
    } else {
      await ensureAuthUserForStudent(id, displayName, password);
    }    
  }

  const admin = createAdminClient();
  const { error: accountUpdateError } = await admin
    .from(STUDENT_ACCOUNTS_COLLECTION)
    .update({
      linked_uid: uid,
      has_logged_in_once: true,
      is_registered: true,
      updated_at: new Date().toISOString(),
    })
    .eq("student_id", id);
  if (accountUpdateError) throw accountUpdateError;

  await syncAppUserFromStudent(uid, { ...account, linkedUid: uid, hasLoggedInOnce: true });
  await reconcileStudentAuthState(uid, { ...account, linkedUid: uid, hasLoggedInOnce: true });

  if (BOOTSTRAP_ADMIN_STUDENT_IDS.has(id)) {
    await promoteAdminUser(uid, studentIdToAuthEmail(id), displayName);
    await admin
      .from("accounts")
      .update({
        student_id: id,
        is_student_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", uid);
  }

  const session = await signInStudentSession(id, password, uid);
  const refreshed = await getStudentAccount(id);
  const finalAccount = refreshed ?? { ...account, linkedUid: uid, hasLoggedInOnce: true };
  return {
    ok: true,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    mustChangePassword: finalAccount.mustChangePassword,
    mustSetupPin: !finalAccount.pinHash,
    uid,
    studentId: id,
    nickname: finalAccount.nickname,
  };
}

export async function loginStudentWithPin(
  studentId: string,
  pin: string
): Promise<
  | {
      ok: true;
      access_token: string;
      refresh_token: string;
      mustChangePassword: boolean;
      mustSetupPin: boolean;
      uid: string;
      studentId: string;
      nickname: string;
    }
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

  const eligibility = await checkStudentIdEligibleForSecondaryAuth(id);
  if (!eligibility.eligible) {
    return { ok: false, error: eligibility.message };
  }

  const session = await mintSessionForStudentId(id);

  const admin = createAdminClient();
  const uid = account.linkedUid!;
  const { data: profileData } = await admin
    .from("accounts")
    .select("auth_methods")
    .eq("id", uid)
    .maybeSingle();
  const existingMethods = Array.isArray(profileData?.auth_methods)
    ? (profileData.auth_methods as string[])
    : [];
  if (!existingMethods.includes("pin")) {
    await admin
      .from("accounts")
      .update({
        auth_methods: [...new Set([...existingMethods, "pin"])],
        updated_at: new Date().toISOString(),
      })
      .eq("id", uid);
  }

  return {
    ok: true,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    mustChangePassword: account.mustChangePassword,
    mustSetupPin: false,
    uid: account.linkedUid!,
    studentId: id,
    nickname: account.nickname,
  };
}

export async function importStudentRows(
  rows: ParsedStudentRosterRow[],
  importBatchId: string,
  adminUid: string
): Promise<StudentImportSummary> {
  const admin = createAdminClient();
  const summary: StudentImportSummary = { created: 0, updated: 0, skipped: 0, errors: [] };

  for (const row of rows) {
    try {
      const { data: existing } = await admin
        .from(STUDENT_ACCOUNTS_COLLECTION)
        .select("*")
        .eq("student_id", row.studentId)
        .maybeSingle();
      const displayName = `${row.firstName} ${row.lastName}`.trim();

      if (row.format === "legacy" && row.password) {
        if (!existing) {
          const schoolHash = hashSecret(row.password);
          const uid = await ensureAuthUserForStudent(row.studentId, displayName, row.password);
          const { error } = await admin.from(STUDENT_ACCOUNTS_COLLECTION).insert({
            id: uid,
            student_id: row.studentId,
            linked_uid: uid,
            email: studentIdToAuthEmail(row.studentId),
            display_name: displayName,
            first_name: row.firstName,
            last_name: row.lastName,
            nickname: row.nickname,
            grade_level: row.gradeLevel ?? null,
            room_number: row.roomNumber ?? null,
            school_password_hash: schoolHash,
            current_password_hash: schoolHash,
            must_change_password: false,
            has_logged_in_once: false,
            is_registered: false,
            status: "active",
            import_batch_id: importBatchId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          if (error) throw error;
          summary.created += 1;
          continue;
        }

        const isRegistered = existing.is_registered === true || existing.has_logged_in_once === true;

        if (isRegistered) {
          const { error } = await admin
            .from(STUDENT_ACCOUNTS_COLLECTION)
            .update({
              first_name: row.firstName,
              last_name: row.lastName,
              nickname: row.nickname,
              grade_level: row.gradeLevel ?? existing.grade_level,
              room_number: row.roomNumber ?? existing.room_number,
              import_batch_id: importBatchId,
              updated_at: new Date().toISOString(),
            })
            .eq("student_id", row.studentId);
          if (error) throw error;
          summary.updated += 1;
        } else {
          const schoolHash = hashSecret(row.password);
          const { error } = await admin
            .from(STUDENT_ACCOUNTS_COLLECTION)
            .update({
              first_name: row.firstName,
              last_name: row.lastName,
              nickname: row.nickname,
              grade_level: row.gradeLevel ?? existing.grade_level,
              room_number: row.roomNumber ?? existing.room_number,
              school_password_hash: schoolHash,
              current_password_hash: schoolHash,
              must_change_password: false,
              import_batch_id: importBatchId,
              updated_at: new Date().toISOString(),
            })
            .eq("student_id", row.studentId);
          if (error) throw error;
          await ensureAuthUserForStudent(row.studentId, displayName, row.password);
          summary.updated += 1;
        }
        continue;
      }

      // Roster format (no password) — student self-registers later
      if (!existing) {
        const uid = await ensureRosterPlaceholderAuthUser(row.studentId, displayName);
        const { error } = await admin.from(STUDENT_ACCOUNTS_COLLECTION).insert({
          id: uid,
          student_id: row.studentId,
          linked_uid: uid,
          email: studentIdToAuthEmail(row.studentId),
          display_name: displayName,
          first_name: row.firstName,
          last_name: row.lastName,
          nickname: row.nickname,
          grade_level: row.gradeLevel ?? null,
          room_number: row.roomNumber ?? null,
          must_change_password: false,
          has_logged_in_once: false,
          is_registered: false,
          status: "active",
          import_batch_id: importBatchId,
          role: "user",
          ban_status: "none",
          is_student_verified: false,
          has_seen_tutorial: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
        summary.created += 1;
        continue;
      }

      const isRegistered = existing.is_registered === true;

      if (isRegistered) {
        const { error } = await admin
          .from(STUDENT_ACCOUNTS_COLLECTION)
          .update({
            first_name: row.firstName,
            last_name: row.lastName,
            nickname: row.nickname,
            grade_level: row.gradeLevel ?? existing.grade_level,
            room_number: row.roomNumber ?? existing.room_number,
            import_batch_id: importBatchId,
            updated_at: new Date().toISOString(),
          })
          .eq("student_id", row.studentId);
        if (error) throw error;
        summary.updated += 1;
      } else {
        const { error } = await admin
          .from(STUDENT_ACCOUNTS_COLLECTION)
          .update({
            first_name: row.firstName,
            last_name: row.lastName,
            nickname: row.nickname,
            grade_level: row.gradeLevel ?? existing.grade_level,
            room_number: row.roomNumber ?? existing.room_number,
            import_batch_id: importBatchId,
            updated_at: new Date().toISOString(),
          })
          .eq("student_id", row.studentId);
        if (error) throw error;
        summary.updated += 1;
      }
    } catch (err) {
      summary.errors.push({
        line: row.lineNumber,
        message: formatImportError(err),
      });
    }
  }

  void adminUid;
  return summary;
}

export async function createStudentAccountManual(input: {
  studentId: string;
  password?: string;
  firstName: string;
  role: "user" | "admin";
  adminUid: string;
}): Promise<{ studentId: string; uid: string }> {
  const id = normalizeStudentId(input.studentId);
  const firstName = input.firstName.trim();

  if (!isValidStudentId(id)) {
    throw new Error("เลขประจำตัวต้องเป็นตัวเลข 5 หลัก");
  }
  if (input.password && !isValidSchoolPassword(input.password)) {
    throw new Error("รหัสผ่านต้องเป็น a-z A-Z 0-9 ความยาว 7-8 ตัว");
  }
  if (!firstName) {
    throw new Error("กรุณากรอกชื่อ");
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from(STUDENT_ACCOUNTS_COLLECTION)
    .select("student_id")
    .eq("student_id", id)
    .maybeSingle();

  if (existing) {
    throw new Error(`เลขประจำตัว ${id} มีในระบบแล้ว`);
  }

  const lastName = "-";
  const nickname = firstName;
  const displayName = firstName;
  const importBatchId = `manual_${Date.now()}`;
  const now = new Date().toISOString();

  if (!input.password) {
    const uid = await ensureRosterPlaceholderAuthUser(id, displayName);
    const { error: insertError } = await admin.from(STUDENT_ACCOUNTS_COLLECTION).insert({
      id: uid,
      student_id: id,
      linked_uid: uid,
      email: studentIdToAuthEmail(id),
      display_name: displayName,
      first_name: firstName,
      last_name: lastName,
      nickname,
      must_change_password: false,
      has_logged_in_once: false,
      is_registered: false,
      status: "active",
      import_batch_id: importBatchId,
      role: input.role,
      ban_status: "none",
      is_student_verified: false,
      has_seen_tutorial: false,
      created_at: now,
      updated_at: now,
    });
    if (insertError) throw insertError;
    void input.adminUid;
    return { studentId: id, uid };
  }

  const schoolHash = hashSecret(input.password);
  const uid = await ensureAuthUserForStudent(id, displayName, input.password);

  const { error: insertError } = await admin.from(STUDENT_ACCOUNTS_COLLECTION).insert({
    id: uid,
    student_id: id,
    linked_uid: uid,
    email: studentIdToAuthEmail(id),
    display_name: displayName,
    first_name: firstName,
    last_name: lastName,
    nickname,
    school_password_hash: schoolHash,
    current_password_hash: schoolHash,
    must_change_password: false,
    has_logged_in_once: false,
    is_registered: false,
    status: "active",
    import_batch_id: importBatchId,
    created_at: now,
    updated_at: now,
  });
  if (insertError) throw insertError;

  const account = await getStudentAccount(id);
  if (!account) throw new Error("สร้างบัญชีไม่สำเร็จ");

  await syncAppUserFromStudent(uid, { ...account, linkedUid: uid }, { role: input.role });

  if (input.role === "admin") {
    await promoteAdminUser(uid, studentIdToAuthEmail(id), displayName);
  }

  void input.adminUid;
  return { studentId: id, uid };
}

export type RegistrationLookupResult =
  | {
      status: "canRegister";
      studentId: string;
      firstName: string;
      lastName: string;
      gradeLevel?: string;
      roomNumber?: string;
      registrationToken: string;
    }
  | { status: "alreadyRegistered" }
  | { status: "notFound" }
  | { status: "disabled" };

export async function lookupRegistrationForStudent(studentId: string): Promise<RegistrationLookupResult> {
  const id = normalizeStudentId(studentId);
  const account = await getStudentAccount(id);
  if (!account) return { status: "notFound" };
  if (account.status === "disabled") return { status: "disabled" };
  if (account.isRegistered || account.currentPasswordHash) {
    return { status: "alreadyRegistered" };
  }

  const { createRegistrationToken } = await import("@/lib/registration-token");
  return {
    status: "canRegister",
    studentId: id,
    firstName: account.firstName,
    lastName: account.lastName,
    gradeLevel: account.gradeLevel,
    roomNumber: account.roomNumber,
    registrationToken: createRegistrationToken(id),
  };
}

export async function registerStudentAccount(input: {
  studentId: string;
  registrationToken: string;
  password: string;
  pin: string;
}): Promise<
  | {
      ok: true;
      access_token: string;
      refresh_token: string;
      studentId: string;
      nickname: string;
      uid: string;
    }
  | { ok: false; error: string }
> {
  const id = normalizeStudentId(input.studentId);
  const rate = checkRateLimit(`register:${id}`);
  if (!rate.allowed) {
    return { ok: false, error: "ลองบ่อยเกินไป กรุณารอสักครู่" };
  }

  const { verifyRegistrationToken } = await import("@/lib/registration-token");
  if (!verifyRegistrationToken(input.registrationToken, id)) {
    return { ok: false, error: "การยืนยันตัวตนหมดอายุ กรุณาเริ่มใหม่" };
  }

  if (!isValidNewPassword(input.password)) {
    return { ok: false, error: "รหัสผ่านต้องยาวอย่างน้อย 8 ตัว และมีตัวอักษรกับตัวเลข" };
  }
  if (!isValidPin(input.pin)) {
    return { ok: false, error: "PIN ต้องเป็นตัวเลข 6 หลัก" };
  }

  const account = await getStudentAccount(id);
  if (!account) return { ok: false, error: "ไม่พบเลขประจำตัวในระบบ" };
  if (account.status === "disabled") return { ok: false, error: "บัญชีนี้ถูกปิดใช้งาน" };
  if (account.isRegistered) return { ok: false, error: "บัญชีนี้สมัครสมาชิกแล้ว กรุณาเข้าสู่ระบบ" };

  const displayName = `${account.firstName} ${account.lastName}`.trim();
  const passwordHash = hashSecret(input.password);
  const pinHash = hashSecret(input.pin);
  const uid = await ensureAuthUserForStudent(id, displayName, input.password);

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error: updateError } = await admin
    .from(STUDENT_ACCOUNTS_COLLECTION)
    .update({
      id: uid,
      linked_uid: uid,
      email: studentIdToAuthEmail(id),
      display_name: displayName,
      school_password_hash: passwordHash,
      current_password_hash: passwordHash,
      pin_hash: pinHash,
      must_change_password: false,
      has_logged_in_once: true,
      is_registered: true,
      is_student_verified: true,
      auth_methods: ["password", "pin"],
      updated_at: now,
    })
    .eq("student_id", id);
  if (updateError) throw updateError;

  const registeredAccount: StudentAccount = {
    ...account,
    linkedUid: uid,
    hasLoggedInOnce: true,
    isRegistered: true,
    currentPasswordHash: passwordHash,
    schoolPasswordHash: passwordHash,
    pinHash,
  };
  await syncAppUserFromStudent(uid, registeredAccount);
  await reconcileStudentAuthState(uid, registeredAccount);

  const session = await signInStudentSession(id, input.password, uid);
  return {
    ok: true,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    studentId: id,
    nickname: account.nickname,
    uid,
  };
}

export async function resetPasswordWithPin(
  studentId: string,
  pin: string,
  newPassword: string
): Promise<
  | {
      ok: true;
      access_token: string;
      refresh_token: string;
    }
  | { ok: false; error: string }
> {
  const id = normalizeStudentId(studentId);
  const rate = checkRateLimit(`reset-pin:${id}`);
  if (!rate.allowed) {
    return { ok: false, error: "ลองบ่อยเกินไป กรุณารอสักครู่" };
  }

  if (!isValidNewPassword(newPassword)) {
    return { ok: false, error: "รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัว และมีตัวอักษรกับตัวเลข" };
  }

  const verified = await verifyStudentPin(id, pin);
  if (!verified.ok) return { ok: false, error: verified.error };

  const { account } = verified;
  const displayName = `${account.firstName} ${account.lastName}`.trim();
  const uid = await ensureAuthUserForStudent(id, displayName, newPassword);
  const passwordHash = hashSecret(newPassword);

  const admin = createAdminClient();
  const { error } = await admin
    .from(STUDENT_ACCOUNTS_COLLECTION)
    .update({
      linked_uid: uid,
      current_password_hash: passwordHash,
      must_change_password: false,
      updated_at: new Date().toISOString(),
    })
    .eq("student_id", id);
  if (error) throw error;

  const login = await loginStudentWithPassword(id, newPassword);
  if (!login.ok) return { ok: false, error: login.error };

  return {
    ok: true,
    access_token: login.access_token,
    refresh_token: login.refresh_token,
  };
}

export async function resetStudentAccountByAdmin(studentId: string): Promise<void> {
  const id = normalizeStudentId(studentId);
  const account = await getStudentAccount(id);
  if (!account) throw new Error("ไม่พบเลขประจำตัวในระบบ");

  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (account.linkedUid) {
    try {
      await admin.auth.admin.deleteUser(account.linkedUid);
    } catch (err) {
      console.warn("resetStudentAccountByAdmin: delete auth user failed:", err);
    }
  }

  const { error } = await admin
    .from(STUDENT_ACCOUNTS_COLLECTION)
    .update({
      linked_uid: null,
      school_password_hash: null,
      current_password_hash: null,
      pin_hash: null,
      passkey_credentials: null,
      auth_methods: null,
      has_logged_in_once: false,
      is_registered: false,
      is_student_verified: false,
      must_change_password: false,
      updated_at: now,
    })
    .eq("student_id", id);
  if (error) throw error;

  await admin.from(PASSKEY_LOOKUP_COLLECTION).delete().eq("student_id", id);
}

export function getRpId(request?: NextRequest): string {
  return getAppRpId(request);
}

export function getOrigin(request?: NextRequest): string {
  return getAppOrigin(request);
}

export type BootstrapAdminInput = {
  studentId: string;
  password: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
};

export async function createBootstrapAdminAccount(input: BootstrapAdminInput): Promise<{
  studentId: string;
  uid: string;
}> {
  const id = normalizeStudentId(input.studentId);
  if (!BOOTSTRAP_ADMIN_STUDENT_IDS.has(id)) {
    throw new Error(`เลขประจำตัว ${id} ไม่ได้อยู่ในรายการแอดมินระบบ`);
  }
  if (!isValidStudentId(id)) {
    throw new Error("เลขประจำตัวไม่ถูกต้อง");
  }
  if (!input.password || input.password.length < 7) {
    throw new Error("รหัสผ่านสั้นเกินไป");
  }

  const firstName = input.firstName?.trim() || "Admin";
  const lastName = input.lastName?.trim() || "Found-U";
  const nickname = input.nickname?.trim() || "Admin";
  const displayName = `${firstName} ${lastName}`.trim();
  const passwordHash = hashSecret(input.password);
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const uid = await ensureAuthUserForStudent(id, displayName, input.password, {
    verifyPasswordLogin: false,
  });

  const { error: upsertError } = await admin.from(STUDENT_ACCOUNTS_COLLECTION).upsert(
    {
      id: uid,
      student_id: id,
      linked_uid: uid,
      email: studentIdToAuthEmail(id),
      display_name: displayName,
      first_name: firstName,
      last_name: lastName,
      nickname,
      school_password_hash: passwordHash,
      current_password_hash: passwordHash,
      must_change_password: false,
      has_logged_in_once: false,
      status: "active",
      updated_at: now,
      created_at: now,
    },
    { onConflict: "student_id" }
  );
  if (upsertError) throw upsertError;

  const account = await getStudentAccount(id);
  if (!account) throw new Error("สร้างบัญชีแอดมินไม่สำเร็จ");

  await syncAppUserFromStudent(uid, { ...account, linkedUid: uid });
  await promoteAdminUser(uid, studentIdToAuthEmail(id), displayName);
  await admin
    .from("accounts")
    .update({
      student_id: id,
      first_name: firstName,
      last_name: lastName,
      nickname,
      is_student_verified: true,
      updated_at: now,
    })
    .eq("id", uid);

  return { studentId: id, uid };
}
