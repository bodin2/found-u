import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_MS = 15 * 60 * 1000;

function normalizeStudentId(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return "";
  return digits.padStart(5, "0").slice(-5);
}

function getRegistrationSecret(): string {
  return (
    process.env.REGISTRATION_TOKEN_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "foundu-registration-dev-secret"
  );
}

export function createRegistrationToken(studentId: string): string {
  const id = normalizeStudentId(studentId);
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = `${id}:${exp}`;
  const sig = createHmac("sha256", getRegistrationSecret()).update(payload).digest("base64url");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyRegistrationToken(token: string, studentId: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastColon = decoded.lastIndexOf(":");
    if (lastColon <= 0) return false;

    const sig = decoded.slice(lastColon + 1);
    const payload = decoded.slice(0, lastColon);
    const expSep = payload.lastIndexOf(":");
    if (expSep <= 0) return false;

    const id = payload.slice(0, expSep);
    const expStr = payload.slice(expSep + 1);

    if (normalizeStudentId(id) !== normalizeStudentId(studentId)) return false;
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || Date.now() > exp) return false;

    const expected = createHmac("sha256", getRegistrationSecret()).update(payload).digest("base64url");
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expected);
    if (sigBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(sigBuf, expectedBuf);
  } catch {
    return false;
  }
}
