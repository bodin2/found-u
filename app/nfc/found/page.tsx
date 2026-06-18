"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, MapPin, Package } from "lucide-react";
import Header from "@/components/layout/header";
import BottomNav from "@/components/layout/bottom-nav";
import AppShell from "@/components/layout/app-shell";
import LoginPrompt from "@/components/auth/login-prompt";
import NfcScanner from "@/components/nfc/nfc-scanner";
import { CATEGORIES, type ContactInfo, type ContactType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { extractTagIdFromUrl } from "@/lib/nfc";
import { resolveNfcTagApi, submitNfcFoundReportApi, type NfcResolveResult } from "@/lib/nfc-api";
import { subscribeToContactTypes, type ContactTypeConfig } from "@/lib/database";
import { useAuth } from "@/contexts/auth-context";
import { AUTH_ROUTES } from "@/lib/auth-routes";
import { useAppDialog } from "@/hooks/use-app-dialog";
import { logNfcFoundReported } from "@/lib/logger";

function NfcFoundContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { showAlert, dialog } = useAppDialog();

  const [contactTypes, setContactTypes] = useState<ContactTypeConfig[]>([]);
  const [tagId, setTagId] = useState("");
  const [resolved, setResolved] = useState<NfcResolveResult | null>(null);
  const [loadingTag, setLoadingTag] = useState(false);
  const [message, setMessage] = useState("");
  const [locationFound, setLocationFound] = useState("");
  const [finderContacts, setFinderContacts] = useState<ContactInfo[]>([
    { type: "line", value: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return subscribeToContactTypes((types) => {
      setContactTypes(types);
      if (types.length > 0) {
        setFinderContacts([{ type: types[0].value as ContactType, value: "" }]);
      }
    });
  }, []);

  useEffect(() => {
    const fromUrl = searchParams.get("tag");
    if (fromUrl) {
      setTagId(fromUrl.toUpperCase());
      void loadTag(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && !user) router.push(AUTH_ROUTES.hub);
  }, [user, authLoading, router]);

  const loadTag = async (id: string) => {
    setLoadingTag(true);
    setError("");
    setResolved(null);
    try {
      const result = await resolveNfcTagApi(id);
      setResolved(result);
      setTagId(result.tag.tagId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ไม่พบแท็ก");
      setResolved(null);
    } finally {
      setLoadingTag(false);
    }
  };

  const handleScan = (result: { tagId?: string; url?: string }) => {
    const id = result.tagId || (result.url ? extractTagIdFromUrl(result.url) : null);
    if (id) void loadTag(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagId || !message.trim()) return;

    setIsSubmitting(true);
    try {
      await submitNfcFoundReportApi({
        tagId,
        finderMessage: message.trim(),
        locationFound: locationFound.trim() || undefined,
        finderContacts: finderContacts.filter((c) => c.value.trim()),
      });
      await logNfcFoundReported(tagId, user?.email ?? undefined, user?.displayName ?? undefined);
      setSuccess(true);
    } catch (err) {
      await showAlert({
        title: "ส่งไม่สำเร็จ",
        message: err instanceof Error ? err.message : "เกิดข้อผิดพลาด",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#06C755]" />
      </div>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <Header title="แจ้งพบของ (NFC)" showBack />
        <LoginPrompt />
        <BottomNav />
      </AppShell>
    );
  }

  if (success) {
    return (
      <AppShell>
        <Header title="ส่งข้อความแล้ว" showBack />
        <main className="px-4 py-12 text-center pb-28">
          <CheckCircle2 className="w-16 h-16 text-[#06C755] mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">ขอบคุณที่ช่วยเหลือ!</h2>
          <p className="text-gray-500 text-sm mb-8">ข้อความของคุณจะถูกส่งถึงเจ้าของผ่านแอป</p>
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="px-8 py-3 rounded-full bg-[#06C755] text-white font-medium"
          >
            กลับหน้าหลัก
          </button>
        </main>
        {dialog}
        <BottomNav />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Header title="แจ้งพบของ (NFC)" showBack />
      <main className="px-4 py-6 pb-28 space-y-5">
        <section className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
          <NfcScanner
            scanLabel="สแกน NFC Tag"
            onScan={handleScan}
            onManualSubmit={(id) => loadTag(id)}
          />
        </section>

        {loadingTag && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-[#06C755]" />
          </div>
        )}

        {error && <p className="text-center text-red-500 text-sm">{error}</p>}

        {resolved && (
          <section className="space-y-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-2">
                <Package className="w-8 h-8 text-[#06C755]" />
                <div>
                  <p className="font-bold text-lg">{resolved.tag.itemName}</p>
                  <p className="text-sm text-gray-500">
                    {CATEGORIES.find((c) => c.value === resolved.tag.category)?.label}
                  </p>
                </div>
              </div>
              {resolved.tag.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{resolved.tag.description}</p>
              )}
              {!resolved.tag.isLost && (
                <p className="text-xs text-amber-600 mt-2">
                  เจ้าของยังไม่ได้แจ้งของหาย — คุณยังฝากข้อความได้
                </p>
              )}
            </div>

            {resolved.isOwner ? (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 text-center text-sm text-blue-700 dark:text-blue-300">
                นี่เป็นแท็กของคุณ — ไม่สามารถแจ้งพบของได้
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 space-y-4"
              >
                <div>
                  <label className="text-sm font-medium">ข้อความถึงเจ้าของ *</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    required
                    placeholder="เช่น ฝากไว้ที่ห้องธุรการ / พบที่โรงอาหาร"
                    className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> สถานที่พบ (ไม่บังคับ)
                  </label>
                  <input
                    value={locationFound}
                    onChange={(e) => setLocationFound(e.target.value)}
                    className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent"
                    placeholder="เช่น ห้องสมุด ชั้น 2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">ช่องทางติดต่อของคุณ (ไม่บังคับ)</label>
                  <div className="flex gap-2 mt-1">
                    <select
                      value={finderContacts[0]?.type}
                      onChange={(e) =>
                        setFinderContacts([
                          {
                            type: e.target.value as ContactType,
                            value: finderContacts[0]?.value || "",
                          },
                        ])
                      }
                      className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent"
                    >
                      {contactTypes.map((t) => (
                        <option key={t.id} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <input
                      value={finderContacts[0]?.value || ""}
                      onChange={(e) =>
                        setFinderContacts([
                          {
                            type: finderContacts[0]?.type || "line",
                            value: e.target.value,
                          },
                        ])
                      }
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !message.trim()}
                  className={cn(
                    "w-full py-4 rounded-2xl bg-[#06C755] text-white font-medium",
                    isSubmitting && "opacity-50"
                  )}
                >
                  {isSubmitting ? "กำลังส่ง..." : "ส่งข้อความถึงเจ้าของ"}
                </button>
              </form>
            )}
          </section>
        )}
      </main>
      {dialog}
      <BottomNav />
    </AppShell>
  );
}

export default function NfcFoundPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#06C755]" />
        </div>
      }
    >
      <NfcFoundContent />
    </Suspense>
  );
}
