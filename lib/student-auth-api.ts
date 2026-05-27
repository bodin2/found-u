import { signInWithCustomToken } from "firebase/auth";
import { auth } from "./auth";

export async function signInWithStudentToken(customToken: string) {
  const result = await signInWithCustomToken(auth, customToken);
  return { user: result.user, error: null as Error | null };
}

export async function postStudentLogin(studentId: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "เข้าสู่ระบบไม่สำเร็จ");
  return data as { customToken: string; mustChangePassword: boolean };
}

export async function postPinLogin(studentId: string, pin: string) {
  const res = await fetch("/api/auth/pin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId, pin }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "เข้าสู่ระบบไม่สำเร็จ");
  return data as { customToken: string; mustChangePassword: boolean };
}

export async function postResetPassword(
  studentId: string,
  schoolPassword: string,
  newPassword: string
) {
  const res = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId, schoolPassword, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "รีเซ็ตรหัสผ่านไม่สำเร็จ");
  return data as { success: boolean; customToken?: string };
}

export async function postChangePassword(
  token: string,
  currentPassword: string,
  newPassword: string
) {
  const res = await fetch("/api/auth/change-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
  return data;
}

export async function postConnectGoogle(token: string) {
  const res = await fetch("/api/auth/connect-google", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "เชื่อมบัญชี Google ไม่สำเร็จ");
  return data as { success: boolean; email: string };
}

export async function postDisconnectGoogle(token: string) {
  const res = await fetch("/api/auth/disconnect-google", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "ยกเลิกการเชื่อม Google ไม่สำเร็จ");
  return data as { success: boolean };
}

export async function postVerifyPassword(token: string, password: string) {
  const res = await fetch("/api/auth/verify-password", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "ยืนยันรหัสผ่านไม่สำเร็จ");
  return data as { success: boolean };
}

export async function getPasskeyStatus(token: string) {
  const res = await fetch("/api/auth/passkey/register", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "โหลดสถานะ Passkey ไม่สำเร็จ");
  return data as { hasPasskey: boolean; count: number };
}

export async function deletePasskey(token: string) {
  const res = await fetch("/api/auth/passkey/register", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "ลบ Passkey ไม่สำเร็จ");
  return data as { success: boolean };
}

export async function postLinkGoogle(token: string, studentId: string, password: string) {
  const res = await fetch("/api/auth/link-google", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ studentId, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "ลงทะเบียนไม่สำเร็จ");
  return data as { success: boolean; mustChangePassword: boolean; studentId: string };
}

export async function getAuthSessionStatus(token: string) {
  const res = await fetch("/api/auth/link-google", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "ตรวจสอบสถานะไม่สำเร็จ");
  return data as {
    isAdmin: boolean;
    isStudentVerified: boolean;
    whitelisted?: boolean;
    mustChangePassword?: boolean;
    studentId?: string | null;
  };
}

export async function postPasskeyLoginOptions(studentId?: string) {
  const res = await fetch("/api/auth/passkey/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(studentId ? { studentId } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "PassKey ไม่พร้อมใช้งาน");
  return data as { options: PublicKeyCredentialRequestOptionsJSON; challengeKey: string };
}

export async function postPasskeyLoginVerify(
  challengeKey: string,
  response: AuthenticationResponseJSON,
  studentId?: string
) {
  const res = await fetch("/api/auth/passkey/login", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeKey, response, ...(studentId ? { studentId } : {}) }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "PassKey login ไม่สำเร็จ");
  return data as { customToken: string; mustChangePassword: boolean };
}

export type PublicKeyCredentialRequestOptionsJSON = import("@simplewebauthn/browser").PublicKeyCredentialRequestOptionsJSON;
export type AuthenticationResponseJSON = import("@simplewebauthn/browser").AuthenticationResponseJSON;
