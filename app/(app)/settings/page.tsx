"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, m } from "framer-motion";
import {
  Loader2,
  Fingerprint,
  Shield,
  KeyRound,
  User,
  Save,
  Mail,
  Hash,
  Link2,
  Unlink2,
} from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import { useAuth } from "@/contexts/auth-context";
import { UserAvatar } from "@/components/user/user-avatar";
import {
  getProfilePhotoUrl,
  getUserPublicEmail,
  getUserShownName,
  hasGoogleAccountLinked,
} from "@/lib/user-display";
import { linkGoogleToCurrentUser, unlinkGoogleFromCurrentUser } from "@/lib/auth";
import {
  deletePasskey,
  getPasskeyStatus,
  postConnectGoogle,
  postDisconnectGoogle,
  postVerifyPassword,
} from "@/lib/student-auth-api";
import { StudentAppShell } from "@/components/layout/student-app-shell";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import { slideUp } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { getSessionToken } from "@/lib/auth";

type SettingsTab = "profile" | "security" | "connections";
type ConnectionAction =
  | "connectGoogle"
  | "disconnectGoogle"
  | "addPasskey"
  | "removePasskey";

export default function SettingsPage() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const { user, appUser, loading, isAdmin, refreshSession, refreshUserProfile } = useAuth();
  const [tab, setTab] = useState<SettingsTab>("profile");

  const [shownName, setShownName] = useState("");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [googleLinking, setGoogleLinking] = useState(false);
  const [googleMessage, setGoogleMessage] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [passkeyRegistered, setPasskeyRegistered] = useState(false);
  const [passkeyCount, setPasskeyCount] = useState(0);
  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);
  const [passwordForAction, setPasswordForAction] = useState("");
  const [passwordAction, setPasswordAction] = useState<ConnectionAction | null>(null);
  const [passwordChecking, setPasswordChecking] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (appUser) {
      setShownName(appUser.shownName?.trim() || appUser.nickname?.trim() || "");
    }
  }, [appUser]);

  useEffect(() => {
    const loadPasskeyStatus = async () => {
      if (!user) return;
      try {
        const status = await getPasskeyStatus();
        setPasskeyRegistered(status.hasPasskey);
        setPasskeyCount(status.count);
      } catch {
        setPasskeyRegistered(false);
        setPasskeyCount(0);
      }
    };
    void loadPasskeyStatus();
  }, [user, appUser?.authMethods]);

  const saveShownName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileSaving(true);
    setProfileError(null);
    setProfileMessage(null);
    try {
      const token = await getSessionToken();
      if (!token) throw new Error("ยังไม่ได้เข้าสู่ระบบ");
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shownName: shownName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
      setProfileMessage("บันทึกชื่อที่แสดงแล้ว");
      await refreshUserProfile();
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setProfileSaving(false);
    }
  };

  const setupPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin !== confirmPin) {
      setSecurityError("PIN ไม่ตรงกัน");
      return;
    }
    if (!user) return;
    setSecurityLoading(true);
    setSecurityError(null);
    setSecurityMessage(null);
    try {
      const token = await getSessionToken();
      if (!token) throw new Error("ยังไม่ได้เข้าสู่ระบบ");
      const res = await fetch("/api/auth/pin/setup", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ตั้ง PIN ไม่สำเร็จ");
      setSecurityMessage("ตั้ง PIN สำเร็จ");
      setPin("");
      setConfirmPin("");
    } catch (err) {
      setSecurityError(err instanceof Error ? err.message : "ตั้ง PIN ไม่สำเร็จ");
    } finally {
      setSecurityLoading(false);
    }
  };

  const registerPasskey = async () => {
    if (!user) return;
    setSecurityLoading(true);
    setSecurityError(null);
    setSecurityMessage(null);
    try {
      const token = await getSessionToken();
      if (!token) throw new Error("ยังไม่ได้เข้าสู่ระบบ");
      const res = await fetch("/api/auth/passkey/register", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ไม่สามารถเริ่ม PassKey ได้");

      const attestation = await startRegistration({ optionsJSON: data.options });
      const verifyRes = await fetch("/api/auth/passkey/register", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ challengeKey: data.challengeKey, response: attestation }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || "ลงทะเบียน PassKey ไม่สำเร็จ");
      setSecurityMessage("ลงทะเบียน PassKey สำเร็จ");
      setPasskeyRegistered(true);
      setPasskeyCount((prev) => Math.max(1, prev + 1));
      await refreshSession();
    } catch (err) {
      setSecurityError(err instanceof Error ? err.message : "PassKey ไม่สำเร็จ");
    } finally {
      setSecurityLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <Loader2 className="w-8 h-8 animate-spin text-line-green" />
      </div>
    );
  }

  const hasGooglePhoto = !!getProfilePhotoUrl(appUser, user);
  const hasGoogle = hasGoogleAccountLinked(appUser, user);
  const publicEmail = getUserPublicEmail(appUser, user);
  const realName = [appUser?.firstName, appUser?.lastName].filter(Boolean).join(" ");

  const handleConnectGoogle = async () => {
    if (!user) return;
    setGoogleLinking(true);
    setGoogleError(null);
    setGoogleMessage(null);
    try {
      const { error: linkError } = await linkGoogleToCurrentUser();
      if (linkError) throw linkError;
      const result = await postConnectGoogle();
      await refreshSession();
      setGoogleMessage(`เชื่อมบัญชี Google สำเร็จ (${result.email})`);
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : "เชื่อมบัญชี Google ไม่สำเร็จ");
    } finally {
      setGoogleLinking(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!user) return;
    setGoogleLinking(true);
    setGoogleError(null);
    setGoogleMessage(null);
    try {
      const { error } = await unlinkGoogleFromCurrentUser();
      if (error) throw error;
      await postDisconnectGoogle();
      await refreshSession();
      setGoogleMessage("ยกเลิกการเชื่อม Google สำเร็จ");
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : "ยกเลิกการเชื่อม Google ไม่สำเร็จ");
    } finally {
      setGoogleLinking(false);
    }
  };

  const handleRemovePasskey = async () => {
    if (!user) return;
    setSecurityLoading(true);
    setSecurityError(null);
    setSecurityMessage(null);
    try {
      await deletePasskey();
      await refreshSession();
      setPasskeyRegistered(false);
      setPasskeyCount(0);
      setSecurityMessage("ลบ PassKey สำเร็จ");
    } catch (err) {
      setSecurityError(err instanceof Error ? err.message : "ลบ PassKey ไม่สำเร็จ");
    } finally {
      setSecurityLoading(false);
    }
  };

  const openPasswordPrompt = (action: ConnectionAction) => {
    setPasswordAction(action);
    setPasswordForAction("");
    setPasswordPromptOpen(true);
  };

  const handleConfirmedConnectionAction = async () => {
    if (!user || !passwordAction) return;
    setPasswordChecking(true);
    try {
      await postVerifyPassword(passwordForAction);
      setPasswordPromptOpen(false);
      setPasswordForAction("");

      switch (passwordAction) {
        case "connectGoogle":
          await handleConnectGoogle();
          break;
        case "disconnectGoogle":
          await handleDisconnectGoogle();
          break;
        case "addPasskey":
          await registerPasskey();
          break;
        case "removePasskey":
          await handleRemovePasskey();
          break;
      }
    } catch (err) {
      setSecurityError(err instanceof Error ? err.message : "ยืนยันรหัสผ่านไม่สำเร็จ");
      setGoogleError(err instanceof Error ? err.message : "ยืนยันรหัสผ่านไม่สำเร็จ");
    } finally {
      setPasswordChecking(false);
      setPasswordAction(null);
    }
  };

  const profilePanel = (
    <section className="bg-bg-card rounded-2xl border border-border-light p-5 shadow-card space-y-5">
      <div className="flex items-center gap-4">
        <UserAvatar
          user={user}
          appUser={appUser}
          className="w-16 h-16 rounded-full object-cover"
          iconClassName="w-7 h-7"
        />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-text-primary truncate">
            {getUserShownName(appUser, user)}
          </p>
          {publicEmail ? (
            <p className="text-sm text-text-secondary truncate">{publicEmail}</p>
          ) : (
            <p className="text-xs text-text-tertiary mt-0.5">
              ยังไม่มีอีเมล — เชื่อมต่อบัญชี Google ได้ที่หน้า "การเชื่อมบัญชี"
            </p>
          )}
          {!hasGooglePhoto && (
            <p className="text-xs text-text-tertiary mt-1">
              รูปโปรไฟล์จะแสดงเมื่อเชื่อมบัญชี Google
            </p>
          )}
        </div>
      </div>

      {profileMessage && <p className="text-sm text-green-600">{profileMessage}</p>}
      {profileError && <p className="text-sm text-red-600">{profileError}</p>}

      <form onSubmit={saveShownName} className="stack-form">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            ชื่อที่แสดง
          </label>
          <input
            type="text"
            value={shownName}
            onChange={(e) => setShownName(e.target.value)}
            placeholder="ชื่อเล่นหรือชื่อที่ต้องการแสดง"
            maxLength={40}
            className="w-full px-4 py-3 rounded-xl border border-border-light bg-bg-primary text-text-primary"
          />
          <p className="text-xs text-text-tertiary mt-1">
            ใช้แทนคำว่า Found-U บนหน้าหลัก
          </p>
        </div>
        <button
          type="submit"
          disabled={profileSaving}
          className="w-full py-2.5 bg-line-green text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {profileSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          บันทึกชื่อที่แสดง
        </button>
      </form>

      <CollapsibleSection title="ข้อมูลบัญชี" defaultOpen={false}>
        <dl className="space-y-3 text-sm">
          {realName && (
            <div className="flex gap-2 text-text-secondary">
              <User className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <dt className="text-text-tertiary text-xs">ชื่อจริง</dt>
                <dd className="text-text-primary">{realName}</dd>
              </div>
            </div>
          )}
          {appUser?.studentId && (
            <div className="flex gap-2 text-text-secondary">
              <Hash className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <dt className="text-text-tertiary text-xs">รหัสนักเรียน</dt>
                <dd className="text-text-primary font-mono">{appUser.studentId}</dd>
              </div>
            </div>
          )}
          <div className="flex gap-2 text-text-secondary">
            <Mail className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <dt className="text-text-tertiary text-xs">อีเมล</dt>
              {publicEmail ? (
                <dd className="text-text-primary break-all">{publicEmail}</dd>
              ) : (
                <dd className="text-text-tertiary">ยังไม่ได้ตั้งค่า</dd>
              )}
            </div>
          </div>
        </dl>
      </CollapsibleSection>
    </section>
  );

  const securityPanel = (
    <section className="bg-bg-card rounded-2xl border border-border-light p-5 shadow-card space-y-4">
      {securityMessage && <p className="text-sm text-green-600">{securityMessage}</p>}
      {securityError && <p className="text-sm text-red-600">{securityError}</p>}

      <Link
        href="/login/change-password"
        className={cn(
          "flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-border-light",
          "hover:bg-bg-secondary transition-colors"
        )}
      >
        <KeyRound className="w-5 h-5 text-line-green shrink-0" />
        <div className="text-left min-w-0">
          <p className="font-medium text-text-primary">เปลี่ยนรหัสผ่าน</p>
          <p className="text-xs text-text-secondary">รหัสผ่านสำหรับเข้าสู่ระบบด้วยรหัสนักเรียน</p>
        </div>
      </Link>

      <div className="border-t border-border-light pt-4">
        <p className="text-sm font-medium text-text-primary mb-3">PIN 6 หลัก</p>
        <form onSubmit={setupPin} className="stack-form">
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="PIN ใหม่"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full px-4 py-3 rounded-xl border border-border-light bg-bg-primary"
          />
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="ยืนยัน PIN"
            value={confirmPin}
            onChange={(e) =>
              setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            className="w-full px-4 py-3 rounded-xl border border-border-light bg-bg-primary"
          />
          <button
            type="submit"
            disabled={securityLoading}
            className="w-full py-2.5 bg-line-green text-white rounded-xl font-medium disabled:opacity-50"
          >
            บันทึก PIN
          </button>
        </form>
      </div>

    </section>
  );

  const connectionsPanel = (
    <section className="bg-bg-card rounded-2xl border border-border-light p-5 shadow-card space-y-4">
      <div className="rounded-xl border border-border-light p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium text-text-primary">บัญชี Google</p>
            <p className="text-xs text-text-secondary">
              {hasGoogle ? "เชื่อมบัญชีแล้ว" : "ยังไม่ได้เชื่อมบัญชี"}
            </p>
          </div>
          <GoogleIcon />
        </div>
        <button
          type="button"
          onClick={() => openPasswordPrompt(hasGoogle ? "disconnectGoogle" : "connectGoogle")}
          disabled={googleLinking || passwordChecking}
          className="w-full py-2.5 border border-border-light rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-bg-secondary transition-colors"
        >
          {googleLinking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : hasGoogle ? (
            <Unlink2 className="w-4 h-4" />
          ) : (
            <Link2 className="w-4 h-4" />
          )}
          {hasGoogle ? "ยกเลิกการเชื่อม Google" : "เชื่อมบัญชี Google"}
        </button>
      </div>

      <div className="rounded-xl border border-border-light p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium text-text-primary">PassKey</p>
            <p className="text-xs text-text-secondary">
              {passkeyRegistered
                ? `ลงทะเบียนแล้ว ${passkeyCount} รายการ`
                : "ยังไม่ได้ลงทะเบียน"}
            </p>
          </div>
          <Fingerprint className="w-5 h-5 text-text-secondary" />
        </div>
        <button
          type="button"
          onClick={() => openPasswordPrompt(passkeyRegistered ? "removePasskey" : "addPasskey")}
          disabled={securityLoading || passwordChecking}
          className="w-full py-2.5 border border-border-light rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-bg-secondary transition-colors"
        >
          {securityLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : passkeyRegistered ? (
            <Unlink2 className="w-4 h-4" />
          ) : (
            <Link2 className="w-4 h-4" />
          )}
          {passkeyRegistered ? "ยกเลิก PassKey" : "ลงทะเบียน PassKey"}
        </button>
      </div>

      {googleMessage && <p className="text-xs text-green-600">{googleMessage}</p>}
      {googleError && <p className="text-xs text-red-600">{googleError}</p>}
      {securityMessage && <p className="text-xs text-green-600">{securityMessage}</p>}
      {securityError && <p className="text-xs text-red-600">{securityError}</p>}
    </section>
  );

  return (
    <StudentAppShell
      headerTitle="ตั้งค่า"
      headerBackHref="/home"
      showBottomNav
      maxWidth="md"
    >
      <div className="space-y-5">
        <PageHeader
          title="ตั้งค่า"
          subtitle="จัดการโปรไฟล์และความปลอดภัยของบัญชี"
          className="hidden md:flex"
        />

        <SegmentedTabs<SettingsTab>
          value={tab}
          onChange={setTab}
          items={[
            { id: "profile", label: "โปรไฟล์", icon: User },
            { id: "security", label: "ความปลอดภัย", icon: Shield },
            { id: "connections", label: "การเชื่อมบัญชี", icon: Link2 },
          ]}
        />

        <AnimatePresence mode="wait">
          <m.div
            key={tab}
            initial={reduced ? false : slideUp.initial}
            animate={slideUp.animate}
            exit={slideUp.exit}
            transition={slideUp.transition}
          >
            {tab === "profile"
              ? profilePanel
              : tab === "security"
                ? securityPanel
                : connectionsPanel}
          </m.div>
        </AnimatePresence>

        {passwordPromptOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-bg-card border border-border-light p-5 space-y-3">
              <p className="font-medium text-text-primary">ยืนยันรหัสผ่าน</p>
              <p className="text-xs text-text-secondary">
                เพื่อความปลอดภัย กรุณากรอกรหัสผ่านก่อนทำรายการนี้
              </p>
              <input
                type="password"
                value={passwordForAction}
                onChange={(e) => setPasswordForAction(e.target.value)}
                placeholder="รหัสผ่านปัจจุบัน"
                className="w-full px-4 py-2.5 rounded-xl border border-border-light bg-bg-primary text-text-primary"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordPromptOpen(false);
                    setPasswordForAction("");
                    setPasswordAction(null);
                  }}
                  disabled={passwordChecking}
                  className="flex-1 py-2.5 rounded-xl border border-border-light text-text-secondary disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmedConnectionAction}
                  disabled={passwordChecking || !passwordForAction.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-line-green text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {passwordChecking && <Loader2 className="w-4 h-4 animate-spin" />}
                  ยืนยัน
                </button>
              </div>
            </div>
          </div>
        )}

        {isAdmin && (
          <Link
            href="/admin/settings"
            className="block text-center text-sm text-text-secondary hover:text-line-green py-2"
          >
            ตั้งค่าระบบ (Admin) →
          </Link>
        )}
      </div>
    </StudentAppShell>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
