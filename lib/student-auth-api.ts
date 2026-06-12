import { getSessionToken, signInWithStudentSession } from "@/lib/auth";

type SessionPayload = {
  access_token: string;
  refresh_token: string;
  mustChangePassword: boolean;
  uid?: string;
};

async function handleSessionResponse(res: Response, fallbackMessage: string): Promise<SessionPayload> {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || fallbackMessage);

  const accessToken = data.access_token as string | undefined;
  const refreshToken = data.refresh_token as string | undefined;
  if (!accessToken || !refreshToken) {
    throw new Error("เซิร์ฟเวอร์ไม่ได้ส่งข้อมูล session");
  }

  const { error } = await signInWithStudentSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw error;

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    mustChangePassword: Boolean(data.mustChangePassword),
    uid: data.uid as string | undefined,
  };
}

export async function postStudentLogin(studentId: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId, password }),
  });
  return handleSessionResponse(res, "เข้าสู่ระบบไม่สำเร็จ");
}

export async function postPinLogin(studentId: string, pin: string) {
  const res = await fetch("/api/auth/pin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId, pin }),
  });
  return handleSessionResponse(res, "เข้าสู่ระบบไม่สำเร็จ");
}

export async function postResetPassword(studentId: string, schoolPassword: string, newPassword: string) {
  const res = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId, schoolPassword, newPassword }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "รีเซ็ตรหัสผ่านไม่สำเร็จ");

  if (data.access_token && data.refresh_token) {
    const { error } = await signInWithStudentSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    if (error) throw error;
  }

  return data as {
    success: boolean;
    access_token?: string;
    refresh_token?: string;
    mustChangePassword?: boolean;
  };
}

export async function postChangePassword(currentPassword: string, newPassword: string) {
  const token = await getSessionToken();
  if (!token) throw new Error("ยังไม่ได้เข้าสู่ระบบ");

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

export async function postConnectGoogle() {
  const token = await getSessionToken();
  if (!token) throw new Error("ยังไม่ได้เข้าสู่ระบบ");
  const res = await fetch("/api/auth/connect-google", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "เชื่อมบัญชี Google ไม่สำเร็จ");
  return data as { success: boolean; email: string };
}

export async function postDisconnectGoogle() {
  const token = await getSessionToken();
  if (!token) throw new Error("ยังไม่ได้เข้าสู่ระบบ");
  const res = await fetch("/api/auth/disconnect-google", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "ยกเลิกการเชื่อม Google ไม่สำเร็จ");
  return data as { success: boolean };
}

export async function postVerifyPassword(password: string) {
  const token = await getSessionToken();
  if (!token) throw new Error("ยังไม่ได้เข้าสู่ระบบ");
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

export async function postLinkGoogle(studentId: string, password: string) {
  const token = await getSessionToken();
  if (!token) throw new Error("ยังไม่ได้เข้าสู่ระบบ");
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

export async function getAuthSessionStatus() {
  const token = await getSessionToken();
  if (!token) throw new Error("ยังไม่ได้เข้าสู่ระบบ");
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

export async function getPasskeyStatus() {
  const token = await getSessionToken();
  if (!token) throw new Error("ยังไม่ได้เข้าสู่ระบบ");
  const res = await fetch("/api/auth/passkey/register", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "โหลดสถานะ Passkey ไม่สำเร็จ");
  return data as { hasPasskey: boolean; count: number };
}

export async function deletePasskey() {
  const token = await getSessionToken();
  if (!token) throw new Error("ยังไม่ได้เข้าสู่ระบบ");
  const res = await fetch("/api/auth/passkey/register", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "ลบ Passkey ไม่สำเร็จ");
  return data as { success: boolean };
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
  return handleSessionResponse(res, "PassKey login ไม่สำเร็จ");
}

export type PublicKeyCredentialRequestOptionsJSON = import("@simplewebauthn/browser").PublicKeyCredentialRequestOptionsJSON;
export type AuthenticationResponseJSON = import("@simplewebauthn/browser").AuthenticationResponseJSON;
