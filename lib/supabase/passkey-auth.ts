import {
  startAuthentication,
  startRegistration,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/browser";
import { getSessionToken } from "@/lib/auth";
import { setClientSession } from "@/lib/supabase/auth-session";

const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function authHeaders(accessToken?: string | null): HeadersInit {
  return {
    apikey: anonKey(),
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

type PasskeyOptionsResponse = {
  challenge_id: string;
  options: PublicKeyCredentialRequestOptionsJSON | PublicKeyCredentialCreationOptionsJSON;
  expires_at?: number;
};

type PasskeyTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  token_type?: string;
  user?: unknown;
};

type PasskeyListItem = {
  id: string;
  friendly_name?: string;
  created_at: string;
  last_used_at?: string;
};

async function parseAuthError(res: Response, fallback: string): Promise<never> {
  const body = (await res.json().catch(() => ({}))) as { msg?: string; message?: string; error?: string };
  throw new Error(body.msg || body.message || body.error || fallback);
}

export async function signInWithSupabasePasskey(): Promise<{
  mustChangePassword: boolean;
  mustSetupPin: boolean;
  studentId?: string;
  nickname?: string;
}> {
  const optionsRes = await fetch(`${supabaseUrl()}/auth/v1/passkeys/authentication/options`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!optionsRes.ok) await parseAuthError(optionsRes, "ไม่สามารถเริ่ม Passkey login ได้");

  const optionsPayload = (await optionsRes.json()) as PasskeyOptionsResponse;
  const assertion = await startAuthentication({
    optionsJSON: optionsPayload.options as PublicKeyCredentialRequestOptionsJSON,
  });

  const verifyRes = await fetch(`${supabaseUrl()}/auth/v1/passkeys/authentication/verify`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      challenge_id: optionsPayload.challenge_id,
      credential: assertion,
    }),
  });
  if (!verifyRes.ok) await parseAuthError(verifyRes, "ยืนยัน Passkey ไม่สำเร็จ");

  const tokens = (await verifyRes.json()) as PasskeyTokenResponse;
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("เซิร์ฟเวอร์ไม่ได้ส่งข้อมูล session");
  }

  await setClientSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });

  const eligibilityRes = await fetch("/api/auth/eligibility", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!eligibilityRes.ok) {
    const body = (await eligibilityRes.json().catch(() => ({}))) as { error?: string };
    const { createClient } = await import("@/lib/supabase/client");
    await createClient().auth.signOut();
    throw new Error(body.error || "กรุณาเข้าสู่ระบบด้วยรหัสผ่านก่อนใช้ Passkey");
  }

  const statusRes = await fetch("/api/auth/link-google", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const status = (await statusRes.json()) as {
    mustChangePassword?: boolean;
    mustSetupPin?: boolean;
    studentId?: string | null;
  };

  if (status.studentId) {
    const { setRememberedDevice } = await import("@/lib/auth-device-memory");
    setRememberedDevice({ studentId: status.studentId });
  }

  return {
    mustChangePassword: Boolean(status.mustChangePassword),
    mustSetupPin: Boolean(status.mustSetupPin),
    studentId: status.studentId || undefined,
  };
}

export async function registerSupabasePasskey(): Promise<void> {
  const accessToken = await getSessionToken();
  if (!accessToken) throw new Error("กรุณาเข้าสู่ระบบก่อน");

  const optionsRes = await fetch(`${supabaseUrl()}/auth/v1/passkeys/registration/options`, {
    method: "POST",
    headers: authHeaders(accessToken),
  });
  if (!optionsRes.ok) await parseAuthError(optionsRes, "ไม่สามารถเริ่มลงทะเบียน Passkey ได้");

  const optionsPayload = (await optionsRes.json()) as PasskeyOptionsResponse;
  const attestation = await startRegistration({
    optionsJSON: optionsPayload.options as PublicKeyCredentialCreationOptionsJSON,
  });

  const verifyRes = await fetch(`${supabaseUrl()}/auth/v1/passkeys/registration/verify`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      challenge_id: optionsPayload.challenge_id,
      credential: attestation,
    }),
  });
  if (!verifyRes.ok) await parseAuthError(verifyRes, "ลงทะเบียน Passkey ไม่สำเร็จ");

  await syncPasskeyAuthMethod(accessToken);
}

export async function listSupabasePasskeys(): Promise<PasskeyListItem[]> {
  const accessToken = await getSessionToken();
  if (!accessToken) throw new Error("กรุณาเข้าสู่ระบบก่อน");

  const res = await fetch(`${supabaseUrl()}/auth/v1/passkeys`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) await parseAuthError(res, "โหลดสถานะ Passkey ไม่สำเร็จ");

  const body = (await res.json()) as { passkeys?: PasskeyListItem[] } | PasskeyListItem[];
  if (Array.isArray(body)) return body;
  return body.passkeys ?? [];
}

export async function deleteAllSupabasePasskeys(): Promise<void> {
  const passkeys = await listSupabasePasskeys();
  const accessToken = await getSessionToken();
  if (!accessToken) throw new Error("กรุณาเข้าสู่ระบบก่อน");

  for (const passkey of passkeys) {
    const res = await fetch(`${supabaseUrl()}/auth/v1/passkeys/${passkey.id}`, {
      method: "DELETE",
      headers: authHeaders(accessToken),
    });
    if (!res.ok) await parseAuthError(res, "ลบ Passkey ไม่สำเร็จ");
  }

  await removePasskeyAuthMethod(accessToken);
}

async function syncPasskeyAuthMethod(accessToken: string) {
  await fetch("/api/auth/passkey/sync-profile", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function removePasskeyAuthMethod(accessToken: string) {
  await fetch("/api/auth/passkey/sync-profile", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export type { AuthenticationResponseJSON, RegistrationResponseJSON };
