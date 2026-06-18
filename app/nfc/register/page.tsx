"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Lock, Plus, X } from "lucide-react";
import Header from "@/components/layout/header";
import BottomNav from "@/components/layout/bottom-nav";
import AppShell from "@/components/layout/app-shell";
import LoginPrompt from "@/components/auth/login-prompt";
import NfcScanner from "@/components/nfc/nfc-scanner";
import TagQrPrint from "@/components/nfc/tag-qr-print";
import { type ContactInfo, type ContactType, type ItemCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import { buildTagUrl, isWebNfcSupported, writeTagUrl, getNfcErrorMessage } from "@/lib/nfc";
import { registerNfcTagApi } from "@/lib/nfc-api";
import {
  subscribeToCategories,
  subscribeToContactTypes,
  type CategoryConfig,
  type ContactTypeConfig,
} from "@/lib/database";
import { useAuth } from "@/contexts/auth-context";
import { AUTH_ROUTES } from "@/lib/auth-routes";
import { useAppDialog } from "@/hooks/use-app-dialog";
import { logNfcTagRegistered } from "@/lib/logger";

export default function NfcRegisterPage() {
  const router = useRouter();
  const { user, loading: authLoading, appSettings } = useAuth();
  const { showAlert, showConfirm, dialog } = useAppDialog();

  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [contactTypes, setContactTypes] = useState<ContactTypeConfig[]>([]);
  const [formData, setFormData] = useState({
    itemName: "",
    category: "" as ItemCategory | "",
    description: "",
  });
  const [contacts, setContacts] = useState<ContactInfo[]>([{ type: "phone", value: "" }]);
  const [tagUid, setTagUid] = useState<string | undefined>();
  const [readOnlyLocked, setReadOnlyLocked] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"form" | "write" | "done">("form");
  const [registeredTag, setRegisteredTag] = useState<{ tagId: string; tagUrl: string } | null>(
    null
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcChecked, setNfcChecked] = useState(false);

  useEffect(() => {
    setNfcSupported(isWebNfcSupported());
    setNfcChecked(true);
  }, []);

  useEffect(() => {
    const unsubCategories = subscribeToCategories(setCategories);
    const unsubContactTypes = subscribeToContactTypes((types) => {
      setContactTypes(types);
      if (types.length > 0) {
        setContacts([{ type: types[0].value as ContactType, value: "" }]);
      }
    });
    return () => {
      unsubCategories();
      unsubContactTypes();
    };
  }, []);

  useEffect(() => {
    if (!authLoading && !user) router.push(AUTH_ROUTES.hub);
  }, [user, authLoading, router]);

  const handleContactChange = (index: number, field: "type" | "value", value: string) => {
    const next = [...contacts];
    next[index] = { ...next[index], [field]: value };
    setContacts(next);
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!formData.itemName.trim()) next.itemName = "กรุณากรอกชื่อสิ่งของ";
    if (!formData.category) next.category = "กรุณาเลือกประเภท";
    if (!contacts.some((c) => c.value.trim())) next.contacts = "กรุณากรอกช่องทางติดต่อ";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    if (readOnlyLocked && nfcSupported) {
      const ok = await showConfirm({
        title: "ล็อกแท็กเป็น Read-Only?",
        message:
          "การล็อก Read-Only จะเขียนแท็กได้ครั้งเดียวและย้อนกลับไม่ได้ ต้องการดำเนินการต่อหรือไม่?",
        confirmLabel: "ล็อกและลงทะเบียน",
        cancelLabel: "ยกเลิก",
      });
      if (!ok) return;
    }

    setIsSubmitting(true);
    try {
      const validContacts = contacts.filter((c) => c.value.trim());
      const result = await registerNfcTagApi({
        itemName: formData.itemName,
        category: formData.category as ItemCategory,
        description: formData.description,
        contacts: validContacts,
        tagUid,
        readOnlyLocked,
      });

      await logNfcTagRegistered(
        result.tagId,
        formData.itemName,
        user?.email ?? undefined,
        user?.displayName ?? undefined
      );

      setRegisteredTag(result);

      if (nfcSupported) {
        setStep("write");
        try {
          const url = result.tagUrl.startsWith("http")
            ? result.tagUrl
            : buildTagUrl(result.tagId, appSettings.nfcPublicBaseUrl || window.location.origin);
          await writeTagUrl(url, { makeReadOnly: readOnlyLocked });
          setStep("done");
        } catch (writeErr) {
          await showAlert({
            title: "บันทึกสำเร็จ แต่เขียนแท็กไม่สำเร็จ",
            message: `${getNfcErrorMessage(writeErr)} — คุณสามารถพิมพ์ QR Code แทนได้`,
          });
          setStep("done");
        }
      } else {
        setStep("done");
      }
    } catch (err) {
      await showAlert({
        title: "ลงทะเบียนไม่สำเร็จ",
        message: err instanceof Error ? err.message : "เกิดข้อผิดพลาด",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryWrite = async () => {
    if (!registeredTag) return;
    setIsSubmitting(true);
    try {
      const url = registeredTag.tagUrl.startsWith("http")
        ? registeredTag.tagUrl
        : buildTagUrl(registeredTag.tagId, appSettings.nfcPublicBaseUrl || window.location.origin);
      await writeTagUrl(url, { makeReadOnly: readOnlyLocked });
      setStep("done");
    } catch (err) {
      await showAlert({
        title: "เขียนแท็กไม่สำเร็จ",
        message: getNfcErrorMessage(err),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || !nfcChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#06C755]" />
      </div>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <Header title="ลงทะเบียน Tag" showBack />
        <LoginPrompt />
        <BottomNav />
      </AppShell>
    );
  }

  if (step === "done" && registeredTag) {
    const displayUrl = registeredTag.tagUrl.startsWith("http")
      ? registeredTag.tagUrl
      : buildTagUrl(registeredTag.tagId, appSettings.nfcPublicBaseUrl);

    return (
      <AppShell>
        <Header title="ลงทะเบียนสำเร็จ" showBack />
        <main className="px-4 py-6 pb-28 space-y-4">
          <div className="text-center">
            <CheckCircle2 className="w-16 h-16 text-[#06C755] mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">ลงทะเบียน Tag สำเร็จ</h2>
            <p className="text-gray-500 text-sm mb-6">
              ติดแท็กบนของของคุณ และพิมพ์ QR สำหรับ iOS
            </p>
          </div>
          <TagQrPrint
            tagId={registeredTag.tagId}
            tagUrl={displayUrl}
            itemName={formData.itemName}
          />
          <button
            type="button"
            onClick={() => router.push("/nfc/my-tags")}
            className="w-full py-4 rounded-2xl bg-[#06C755] text-white font-medium"
          >
            ไปที่แท็กของฉัน
          </button>
        </main>
        {dialog}
        <BottomNav />
      </AppShell>
    );
  }

  if (step === "write" && registeredTag) {
    return (
      <AppShell>
        <Header title="เขียนข้อมูลลงแท็ก" showBack />
        <main className="px-4 py-6 pb-28 space-y-4 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            แตะแท็ก NFC ที่โทรศัพท์เพื่อเขียน URL
          </p>
          <button
            type="button"
            onClick={handleRetryWrite}
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl bg-[#06C755] text-white font-medium disabled:opacity-50"
          >
            {isSubmitting ? "กำลังเขียน..." : "เขียนลงแท็ก NFC"}
          </button>
          <button
            type="button"
            onClick={() => setStep("done")}
            className="w-full py-3 text-gray-500"
          >
            ข้าม — ใช้ QR Code แทน
          </button>
        </main>
        {dialog}
        <BottomNav />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Header title="ลงทะเบียน Tag" showBack />
      <main className="px-4 py-6 pb-28 space-y-5">
        {!nfcSupported && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium">อุปกรณ์นี้ไม่รองรับ Web-NFC</p>
            <p className="mt-1">
              โหมด Qr Code ; ลงทะเบียนแล้วพิมพ์ QR ติดบนของได้เลย
            </p>
          </div>
        )}

        {nfcSupported && (
          <section className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
            <p className="text-sm font-medium mb-3">ขั้นตอนที่ 1: สแกนแท็ก (ไม่บังคับ)</p>
            <NfcScanner
              nfcSupported={nfcSupported}
              scanLabel="สแกนแท็กเพื่อบันทึก UID"
              onScan={(r) => {
                if (r.tagUid) setTagUid(r.tagUid);
              }}
            />
            {tagUid && (
              <p className="text-xs text-gray-500 mt-2 font-mono">UID: {tagUid}</p>
            )}
          </section>
        )}

        <section className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 space-y-4">
          <p className="text-sm font-medium">
            {nfcSupported ? "ขั้นตอนที่ 2: ข้อมูลสิ่งของ" : "ข้อมูลสิ่งของ"}
          </p>

          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">ชื่อสิ่งของ</label>
            <input
              name="itemName"
              value={formData.itemName}
              onChange={(e) => setFormData((p) => ({ ...p, itemName: e.target.value }))}
              className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent"
              placeholder="เช่น กระเป๋าสตางค์"
            />
            {errors.itemName && <p className="text-red-500 text-sm mt-1">{errors.itemName}</p>}
          </div>

          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">ประเภท</label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData((p) => ({ ...p, category: e.target.value as ItemCategory }))
              }
              className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent"
            >
              <option value="">เลือกประเภท</option>
              {categories.map((c) => (
                <option key={c.id} value={c.value}>
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
            {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
          </div>

          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">รายละเอียด (ไม่บังคับ)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">ช่องทางติดต่อ</label>
            {contacts.map((contact, index) => (
              <div key={index} className="flex gap-2 mt-2">
                <select
                  value={contact.type}
                  onChange={(e) => handleContactChange(index, "type", e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent"
                >
                  {contactTypes.map((t) => (
                    <option key={t.id} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <input
                  value={contact.value}
                  onChange={(e) => handleContactChange(index, "value", e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent"
                  placeholder="ข้อมูลติดต่อ"
                />
                {contacts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setContacts(contacts.filter((_, i) => i !== index))}
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                )}
              </div>
            ))}
            {contacts.length < 3 && (
              <button
                type="button"
                onClick={() => setContacts([...contacts, { type: "line", value: "" }])}
                className="mt-2 flex items-center gap-1 text-sm text-[#06C755]"
              >
                <Plus className="w-4 h-4" /> เพิ่มช่องทาง
              </button>
            )}
            {errors.contacts && <p className="text-red-500 text-sm mt-1">{errors.contacts}</p>}
          </div>
        </section>

        {nfcSupported && (
          <section className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={readOnlyLocked}
                onChange={(e) => setReadOnlyLocked(e.target.checked)}
                className="mt-1"
              />
              <div>
                <p className="font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4" /> ล็อกแท็กเป็น Read-Only
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  เขียนได้ครั้งเดียว ป้องกันคนอื่นแก้ไขข้อมูลบนแท็ก (แนะนำ)
                </p>
              </div>
            </label>
          </section>
        )}

        <button
          type="button"
          onClick={handleRegister}
          disabled={isSubmitting}
          className={cn(
            "w-full py-4 rounded-2xl font-medium text-white bg-[#06C755] hover:bg-[#05b34d]",
            isSubmitting && "opacity-50"
          )}
        >
          {isSubmitting ? "กำลังลงทะเบียน..." : nfcSupported ? "ลงทะเบียนและเขียนแท็ก" : "ลงทะเบียนและพิมพ์ QR"}
        </button>
      </main>
      {dialog}
      <BottomNav />
    </AppShell>
  );
}
