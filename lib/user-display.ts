import type { User } from "@/lib/auth";
import type { AppUser } from "@/lib/types";

type UserIdentity = {
  provider?: string;
  identity_data?: Record<string, unknown>;
};

/** ชื่อที่แสดงใน UI: ชื่อที่ตั้งเอง → ชื่อเล่น → ชื่อจริง → ชื่อจาก Supabase */
export function getUserShownName(
  appUser: AppUser | null | undefined,
  supabaseUser?: User | null
): string {
  const shown = appUser?.shownName?.trim();
  if (shown) return shown;

  const nickname = appUser?.nickname?.trim();
  if (nickname) return nickname;

  const realName = [appUser?.firstName, appUser?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (realName) return realName;

  const displayName =
    (supabaseUser?.user_metadata?.display_name as string | undefined)?.trim() ||
    (supabaseUser?.user_metadata?.full_name as string | undefined)?.trim() ||
    appUser?.displayName?.trim();
  if (displayName) return displayName;

  return "Found-U";
}

/** อักษรย่อสำหรับ avatar placeholder */
export function getUserInitials(
  appUser: AppUser | null | undefined,
  supabaseUser?: User | null
): string {
  const name = getUserShownName(appUser, supabaseUser);
  if (name === "Found-U") return "F";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/** อีเมลภายในระบบจากโรงเรียน (ไม่แสดงต่อผู้ใช้) */
export function isSchoolSyntheticEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return true;
  return /@students\./i.test(email.trim());
}

/** เชื่อมบัญชี Google แล้ว — ใช้ profiles.auth_methods เป็นหลักเมื่อมีฟิลด์นี้ */
export function hasGoogleAccountLinked(
  appUser: AppUser | null | undefined,
  supabaseUser?: User | null
): boolean {
  if (Array.isArray(appUser?.authMethods)) {
    return appUser.authMethods.includes("google");
  }
  return !!supabaseUser?.identities?.some((identity: UserIdentity) => identity.provider === "google");
}

/** อีเมลที่แสดงต่อผู้ใช้ — มีเมื่อเชื่อม Google เท่านั้น */
export function getUserPublicEmail(
  appUser: AppUser | null | undefined,
  supabaseUser?: User | null
): string | null {
  if (!hasGoogleAccountLinked(appUser, supabaseUser)) return null;

  const googleIdentity = supabaseUser?.identities?.find(
    (identity: UserIdentity) => identity.provider === "google"
  );
  const candidates = [
    googleIdentity?.identity_data?.email as string | undefined,
    appUser?.email,
    supabaseUser?.email,
  ];

  for (const email of candidates) {
    if (email && !isSchoolSyntheticEmail(email)) {
      return email.trim();
    }
  }

  return null;
}

/** รูปโปรไฟล์มีได้เมื่อเชื่อม Google และมี photoURL จริง */
export function getProfilePhotoUrl(
  appUser: AppUser | null | undefined,
  supabaseUser?: User | null
): string | null {
  if (!hasGoogleAccountLinked(appUser, supabaseUser)) return null;

  const url =
    appUser?.photoURL ||
    (supabaseUser?.user_metadata?.avatar_url as string | undefined) ||
    (supabaseUser?.identities?.find((identity: UserIdentity) => identity.provider === "google")
      ?.identity_data?.avatar_url as string | undefined);
  if (!url || url.trim() === "") return null;

  return url;
}
