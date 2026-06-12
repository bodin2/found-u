import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signInStudentSession } from "@/lib/supabase/auth-session";
import type {
  AppUser,
  ParsedStudentCsvRow,
  StudentAccount,
  StudentImportSummary,
} from "@/lib/types";
import type { Database } from "@/lib/database.types";

export const STUDENT_ACCOUNTS_COLLECTION = "student_accounts";
export const ADMIN_WHITELIST_COLLECTION = "admin_whitelist";
export const PASSKEY_LOOKUP_COLLECTION = "passkey_lookup";

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
    if (credentials?.some((c) => c.credentialId === credentialId)) {
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
  const { data } = await admin
    .from(STUDENT_ACCOUNTS_COLLECTION)
    .select("*")
    .eq("student_id", normalizedId)
    .maybeSingle();
  if (!data) return null;
  const row = data as Record<string, any>;

  const createdAt = row.created_at ?? row.createdAt ?? new Date().toISOString();
  const updatedAt = row.updated_at ?? row.updatedAt ?? new Date().toISOString();

  return {
    studentId: row.student_id ?? row.studentId,
    firstName: row.first_name ?? row.firstName,
    lastName: row.last_name ?? row.lastName,
    nickname: row.nickname,
    schoolPasswordHash: row.school_password_hash ?? row.schoolPasswordHash,
    currentPasswordHash: row.current_password_hash ?? row.currentPasswordHash,
    mustChangePassword: (row.must_change_password ?? row.mustChangePassword) ?? true,
    hasLoggedInOnce: (row.has_logged_in_once ?? row.hasLoggedInOnce) ?? false,
    linkedUid: row.linked_uid ?? row.linkedUid ?? undefined,
    linkedGoogleEmail: row.linked_google_email ?? row.linkedGoogleEmail ?? undefined,
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
  password?: string
): Promise<string> {
  const admin = createAdminClient();
  const id = normalizeStudentId(studentId);
  const email = studentIdToAuthEmail(id);
  let userRecord = await findAuthUserByEmail(email);

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

  if (password) {
    // Ensure password provider login works right after sync
    await signInStudentSession(id, password);
  }

  return userRecord.id;
}

// Backward-compatible alias while routes are being migrated.
export const ensureFirebaseUserForStudent = ensureAuthUserForStudent;

export async function issueStudentCustomToken(uid: string): Promise<string> {
  void uid;
  throw new Error("Custom token flow removed. Use session tokens instead.");
}

export async function syncAppUserFromStudent(
  uid: string,
  account: StudentAccount,
  extras?: Partial<AppUser>
): Promise<void> {
  const admin = createAdminClient();
  const displayName = `${account.firstName} ${account.lastName}`.trim();
  const { data: existing } = await admin.from("profiles").select("id").eq("id", uid).maybeSingle();

  const now = new Date().toISOString();
  const normalized: Database["public"]["Tables"]["profiles"]["Update"] = {
    email: extras?.email ? normalizeEmail(extras.email) : studentIdToAuthEmail(account.studentId),
    display_name: extras?.displayName || displayName,
    student_id: account.studentId,
    first_name: account.firstName,
    last_name: account.lastName,
    nickname: account.nickname,
    photo_url: (extras as { photoURL?: string })?.photoURL || null,
    auth_methods: extras?.authMethods ?? null,
    shown_name: extras?.shownName ?? null,
    ban_status: extras?.banStatus ?? "none",
    is_student_verified: true,
    must_change_password: account.mustChangePassword,
    updated_at: now,
  };

  if (existing) {
    const { error } = await admin.from("profiles").update(normalized).eq("id", uid);
    if (error) throw error;
  } else {
    const { error } = await admin.from("profiles").insert({
      ...(normalized as Database["public"]["Tables"]["profiles"]["Insert"]),
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
  const { data: existing } = await admin.from("profiles").select("id").eq("id", uid).maybeSingle();
  const now = new Date().toISOString();
  const payload: Database["public"]["Tables"]["profiles"]["Update"] = {
    email: normalizeEmail(email),
    display_name: displayName || email,
    photo_url: photoURL || null,
    role: "admin",
    is_student_verified: true,
    updated_at: now,
  };
  if (!existing) {
    const insertPayload: Database["public"]["Tables"]["profiles"]["Insert"] = {
      ...(payload as Database["public"]["Tables"]["profiles"]["Insert"]),
      id: uid,
      ban_status: "none",
      has_seen_tutorial: false,
      created_at: now,
    };
    const { error } = await admin.from("profiles").insert(insertPayload);
    if (error) throw error;
    return;
  }
  const { error } = await admin.from("profiles").update(payload).eq("id", uid);
  if (error) throw error;
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
  | { ok: true; access_token: string; refresh_token: string; mustChangePassword: boolean; uid: string }
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
      updated_at: new Date().toISOString(),
    })
    .eq("student_id", id);
  if (accountUpdateError) throw accountUpdateError;

  await syncAppUserFromStudent(uid, { ...account, linkedUid: uid, hasLoggedInOnce: true });

  const session = await signInStudentSession(id, password);
  return {
    ok: true,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    mustChangePassword: account.mustChangePassword,
    uid,
  };
}

export async function loginStudentWithPin(
  studentId: string,
  pin: string
): Promise<
  | { ok: true; access_token: string; refresh_token: string; mustChangePassword: boolean; uid: string }
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

  return { ok: false, error: "การเข้าสู่ระบบด้วย PIN อยู่ระหว่างปรับปรุงสำหรับ Supabase" };
}

export async function importStudentRows(
  rows: ParsedStudentCsvRow[],
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
      const displayName = `${row.firstName} ${row.lastName}`;

      if (!existing) {
        const schoolHash = hashSecret(row.password);
        const { error } = await admin.from(STUDENT_ACCOUNTS_COLLECTION).insert({
          student_id: row.studentId,
          first_name: row.firstName,
          last_name: row.lastName,
          nickname: row.nickname,
          school_password_hash: schoolHash,
          current_password_hash: schoolHash,
          must_change_password: true,
          has_logged_in_once: false,
          status: "active",
          import_batch_id: importBatchId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
        await ensureAuthUserForStudent(row.studentId, displayName, row.password);
        summary.created += 1;
        continue;
      }

      const hasLoggedInOnce = existing.has_logged_in_once === true;

      if (hasLoggedInOnce) {
        const { error } = await admin
          .from(STUDENT_ACCOUNTS_COLLECTION)
          .update({
            first_name: row.firstName,
            last_name: row.lastName,
            nickname: row.nickname,
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
            school_password_hash: schoolHash,
            current_password_hash: schoolHash,
            must_change_password: true,
            import_batch_id: importBatchId,
            updated_at: new Date().toISOString(),
          })
          .eq("student_id", row.studentId);
        if (error) throw error;
        await ensureAuthUserForStudent(row.studentId, displayName, row.password);
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
