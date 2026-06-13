import { getSessionToken, signInWithStudentSession } from "@/lib/auth";

type SessionPayload = {
  access_token: string;
  refresh_token: string;
  mustChangePassword: boolean;
  mustSetupPin?: boolean;
  studentId?: string;
  nickname?: string;
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

  if (data.studentId) {
    const { setRememberedDevice } = await import("@/lib/auth-device-memory");
    setRememberedDevice({
      studentId: data.studentId as string,
      nickname: data.nickname as string | undefined,
    });
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    mustChangePassword: Boolean(data.mustChangePassword),
    mustSetupPin: Boolean(data.mustSetupPin),
    studentId: data.studentId as string | undefined,
    nickname: data.nickname as string | undefined,
    uid: data.uid as string | undefined,
  };
}

export function resolvePostLoginPath(payload: {
  mustChangePassword?: boolean;
  mustSetupPin?: boolean;
}): string {
  if (payload.mustChangePassword) return "/login/change-password";
  if (payload.mustSetupPin) return "/login/setup-pin";
  return "/home";
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
    mustSetupPin?: boolean;
    hasPin?: boolean;
    studentId?: string | null;
  };
}

export async function getDeviceProfile(studentId: string) {
  const res = await fetch(`/api/auth/device-profile?studentId=${encodeURIComponent(studentId)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "โหลดข้อมูลไม่สำเร็จ");
  return data as {
    exists: boolean;
    studentId?: string;
    nickname?: string;
    firstName?: string;
    hasLoggedInOnce?: boolean;
    hasPin?: boolean;
    quickUnlockAvailable?: boolean;
  };
}

export async function postSetupPin(pin: string) {
  const token = await getSessionToken();
  if (!token) throw new Error("ยังไม่ได้เข้าสู่ระบบ");
  const res = await fetch("/api/auth/pin/setup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ pin }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "ตั้ง PIN ไม่สำเร็จ");
  return data as { success: boolean };
}

export async function getPasskeyStatus() {
  const { listSupabasePasskeys } = await import("@/lib/supabase/passkey-auth");
  const passkeys = await listSupabasePasskeys();
  return { hasPasskey: passkeys.length > 0, count: passkeys.length };
}

export async function deletePasskey() {
  const { deleteAllSupabasePasskeys } = await import("@/lib/supabase/passkey-auth");
  await deleteAllSupabasePasskeys();
  return { success: true };
}

export async function postPasskeyLogin() {
  const { signInWithSupabasePasskey } = await import("@/lib/supabase/passkey-auth");
  return signInWithSupabasePasskey();
}

export async function registerPasskey() {
  const { registerSupabasePasskey } = await import("@/lib/supabase/passkey-auth");
  await registerSupabasePasskey();
}
