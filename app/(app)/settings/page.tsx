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
  Unlink2,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { UserAvatar } from "@/components/user/user-avatar";
import {
  getProfilePhotoUrl,
  getUserPublicEmail,
  getUserShownName,
  hasPinAuthMethod,
} from "@/lib/user-display";
import {
  deletePasskey,
  getPasskeyStatus,
  registerPasskey,
  postVerifyPassword,
  postVerifyPin,
} from "@/lib/student-auth-api";
import { StudentAppShell } from "@/components/layout/student-app-shell";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import { slideUp } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { getSessionToken } from "@/lib/auth";
import { AUTH_ROUTES } from "@/lib/auth-routes";
import { getUser } from "@/lib/database";
import {
  ConnectionResultModal,
  type ConnectionResultData,
  type ConnectionResultType,
} from "@/components/settings/connection-result-modal";

type SettingsTab = "profile" | "security";
type ConnectionAction =
  | "addPasskey"
  | "removePasskey";

export default function SettingsPage() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const { user, appUser, loading, isAdmin, refreshSession, refreshUserProfile, hasPin } = useAuth();
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
  const [passkeyRegistered, setPasskeyRegistered] = useState(false);
  const [passkeyCount, setPasskeyCount] = useState(0);
  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);
  const [verifyInput, setVerifyInput] = useState("");
  const [verifyMode, setVerifyMode] = useState<"pin" | "password">("pin");
  const [passwordAction, setPasswordAction] = useState<ConnectionAction | null>(null);
  const [passwordChecking, setPasswordChecking] = useState(false);
  const [connectionModalOpen, setConnectionModalOpen] = useState(false);
  const [connectionModalLoading, setConnectionModalLoading] = useState(false);
  const [connectionModalType, setConnectionModalType] = useState<ConnectionResultType | null>(null);
  const [connectionResult, setConnectionResult] = useState<ConnectionResultData | null>(null);

  const hasPinMethod = hasPinAuthMethod(appUser, hasPin);

  const closeConnectionModal = () => {
    setConnectionModalOpen(false);
    setConnectionModalLoading(false);
    setConnectionModalType(null);
    setConnectionResult(null);
  };

  const loadLinkedProfile = async (uid: string) => {
    const latest = await getUser(uid);
    return {
      studentId: latest?.studentId ?? appUser?.studentId ?? undefined,
      displayName: getUserShownName(latest ?? appUser, user),
      authMethods:
        Array.isArray(latest?.authMethods) && latest.authMethods.length > 0
          ? [...latest.authMethods]
          : undefined,
    };
  };

  useEffect(() => {
    if (!loading && !user) {
      router.replace(AUTH_ROUTES.hub);
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

  const handleRegisterPasskey = async () => {
    if (!user) return;
    setSecurityLoading(true);
    setSecurityError(null);
    setSecurityMessage(null);
    setConnectionModalOpen(true);
    setConnectionModalLoading(true);
    setConnectionModalType("passkey");
    setConnectionResult(null);
    setTab("security");

    try {
      await registerPasskey();
      const status = await getPasskeyStatus();
      setPasskeyRegistered(status.hasPasskey);
      setPasskeyCount(status.count);
      await refreshSession();
      await refreshUserProfile();
      const profile = await loadLinkedProfile(user.id);
      setConnectionResult({
        type: "passkey",
        success: true,
        passkeyCount: status.count,
        passkeyDeviceLabel: status.latestDeviceLabel,
        ...profile,
        authMethods: profile.authMethods
          ? Array.from(new Set([...profile.authMethods, "passkey"]))
          : ["password", "passkey"],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "ลงทะเบียน Passkey ไม่สำเร็จ";
      setSecurityError(message);
      setConnectionResult({
        type: "passkey",
        success: false,
        errorMessage: message,
        studentId: appUser?.studentId ?? undefined,
        displayName: getUserShownName(appUser, user),
      });
    } finally {
      setSecurityLoading(false);
      setConnectionModalLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <Loader2 className="w-8 h-8 animate-spin text-line-green" />
      </div>
    );
  }

  const hasProfilePhoto = !!getProfilePhotoUrl(appUser, user);
  const publicEmail = getUserPublicEmail(appUser, user);
  const realName = [appUser?.firstName, appUser?.lastName].filter(Boolean).join(" ");

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
    setVerifyInput("");
    setVerifyMode(hasPinMethod ? "pin" : "password");
    setPasswordPromptOpen(true);
  };

  const handleConfirmedConnectionAction = async () => {
    if (!user || !passwordAction) return;
    setPasswordChecking(true);
    try {
      if (verifyMode === "pin") {
        await postVerifyPin(verifyInput);
      } else {
        await postVerifyPassword(verifyInput);
      }
      setPasswordPromptOpen(false);
      setVerifyInput("");

      switch (passwordAction) {
        case "addPasskey":
          await handleRegisterPasskey();
          break;
        case "removePasskey":
          await handleRemovePasskey();
          break;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "ยืนยันตัวตนไม่สำเร็จ";
      setSecurityError(message);
    } finally {
      setPasswordChecking(false);
      setPasswordAction(null);
    }
  };

  const canSubmitVerification =
    verifyMode === "pin" ? /^\d{6}$/.test(verifyInput) : verifyInput.trim().length > 0;

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
              ยังไม่มีอีเมลในบัญชี
            </p>
          )}
          {!hasProfilePhoto && (
            <p className="text-xs text-text-tertiary mt-1">
              คุณสามารถเพิ่มรูปโปรไฟล์ได้จากบัญชีผู้ใช้
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
            ใช้แทนชื่อจริงบนหน้าหลัก
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
        href={AUTH_ROUTES.changePassword}
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

      <div className="border-t border-border-light pt-4">
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
              <Fingerprint className="w-4 h-4" />
            )}
            {passkeyRegistered ? "ยกเลิก PassKey" : "ลงทะเบียน PassKey"}
          </button>
        </div>
      </div>

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
            {tab === "profile" ? profilePanel : securityPanel}
          </m.div>
        </AnimatePresence>

        <ConnectionResultModal
          open={connectionModalOpen}
          onClose={closeConnectionModal}
          loading={connectionModalLoading}
          loadingTitle={
            connectionModalType === "passkey"
                ? "กำลังลงทะเบียน Passkey..."
                : "กำลังดำเนินการ..."
          }
          loadingDescription={
            connectionModalType === "passkey"
                ? "ระบบกำลังลงทะเบียนอุปกรณ์และบันทึกสถานะความปลอดภัย"
                : undefined
          }
          result={connectionResult}
        />

        {passwordPromptOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-bg-card border border-border-light p-5 space-y-3">
              <p className="font-medium text-text-primary">ยืนยันตัวตน</p>
              <p className="text-xs text-text-secondary">
                {verifyMode === "pin"
                  ? "กรอก PIN 6 หลักเพื่อดำเนินการต่อ"
                  : "กรอกรหัสผ่านปัจจุบันเพื่อดำเนินการต่อ"}
              </p>
              <input
                type="password"
                inputMode={verifyMode === "pin" ? "numeric" : "text"}
                maxLength={verifyMode === "pin" ? 6 : undefined}
                value={verifyInput}
                onChange={(e) =>
                  setVerifyInput(
                    verifyMode === "pin"
                      ? e.target.value.replace(/\D/g, "").slice(0, 6)
                      : e.target.value
                  )
                }
                placeholder={verifyMode === "pin" ? "PIN 6 หลัก" : "รหัสผ่านปัจจุบัน"}
                className="w-full px-4 py-2.5 rounded-xl border border-border-light bg-bg-primary text-text-primary font-mono tracking-widest text-center"
                autoComplete={verifyMode === "pin" ? "one-time-code" : "current-password"}
              />
              {hasPinMethod ? (
                <button
                  type="button"
                  onClick={() => {
                    setVerifyMode(verifyMode === "pin" ? "password" : "pin");
                    setVerifyInput("");
                  }}
                  disabled={passwordChecking}
                  className="text-xs text-line-green hover:underline disabled:opacity-50"
                >
                  {verifyMode === "pin" ? "ใช้รหัสผ่านแทน" : "ใช้ PIN แทน"}
                </button>
              ) : (
                <p className="text-xs text-text-tertiary">
                  ยังไม่ได้ตั้ง PIN — ใช้รหัสผ่านเพื่อยืนยัน
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordPromptOpen(false);
                    setVerifyInput("");
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
                  disabled={passwordChecking || !canSubmitVerification}
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

