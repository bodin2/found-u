"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Radio,
  Search,
} from "lucide-react";
import Header from "@/components/layout/header";
import BottomNav from "@/components/layout/bottom-nav";
import AppShell from "@/components/layout/app-shell";
import LoginPrompt from "@/components/auth/login-prompt";
import TagQrPrint from "@/components/nfc/tag-qr-print";
import {
  NFC_TAG_STATUS_CONFIG,
  CATEGORIES,
  type NfcTag,
  type NfcFoundReport,
} from "@/lib/types";
import { cn, formatThaiDate, generateTrackingCode } from "@/lib/utils";
import { buildTagUrl, isWebNfcSupported } from "@/lib/nfc";
import {
  addLostItem,
} from "@/lib/database";
import {
  updateNfcTagStatusApi,
  fetchMyNfcDashboardApi,
  updateNfcReportStatusApi,
} from "@/lib/nfc-api";
import { useAuth } from "@/contexts/auth-context";
import { useAppDialog } from "@/hooks/use-app-dialog";
import { logItemCreated } from "@/lib/logger";

export default function NfcMyTagsPage() {
  const router = useRouter();
  const { user, loading: authLoading, appSettings } = useAuth();
  const { showConfirm, showAlert, dialog } = useAppDialog();

  const [tags, setTags] = useState<NfcTag[]>([]);
  const [reports, setReports] = useState<NfcFoundReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [expandedTag, setExpandedTag] = useState<string | null>(null);

  const loadDashboard = async () => {
    if (!user?.uid) return;
    try {
      setLoadError("");
      const data = await fetchMyNfcDashboardApi();
      setTags(data.tags);
      setReports(data.reports);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.uid) {
      setTags([]);
      setReports([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    loadDashboard();

    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, [user?.uid]);

  const reportsByTag = useMemo(() => {
    const map = new Map<string, NfcFoundReport[]>();
    for (const r of reports) {
      const list = map.get(r.tagId) || [];
      list.push(r);
      map.set(r.tagId, list);
    }
    return map;
  }, [reports]);

  const pendingCount = reports.filter((r) => r.status === "pending").length;

  const handleMarkLost = async (tag: NfcTag) => {
    const createLost = await showConfirm({
      title: "แจ้งของหาย",
      message: "ต้องการสร้างรายการ Lost Item ในระบบด้วยหรือไม่? (แนะนำ — ช่วยจับคู่อัตโนมัติ)",
      confirmLabel: "สร้าง Lost Item ด้วย",
      cancelLabel: "เฉพาะ NFC Tag",
    });

    try {
      let lostItemId: string | undefined;
      if (createLost) {
        const trackingCode = generateTrackingCode();
        lostItemId = await addLostItem({
          itemName: tag.itemName,
          category: tag.category,
          description: tag.description || tag.itemName,
          locationLost: "ไม่ระบุ (จาก NFC Tag)",
          contacts: tag.contacts,
          trackingCode,
          status: "searching",
          dateLost: new Date(),
          userId: user!.uid,
        });
        await logItemCreated(
          "lost",
          lostItemId,
          tag.itemName,
          trackingCode,
          user?.email ?? undefined,
          user?.displayName ?? undefined
        );
        await fetch("/api/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "lost", itemId: lostItemId }),
        });
      }

      await updateNfcTagStatusApi(tag.id, "lost", lostItemId);
      await loadDashboard();
      await showAlert({
        title: "แจ้งของหายแล้ว",
        message: createLost
          ? "สถานะ Tag อัปเดตแล้ว และสร้างรายการ Lost แล้ว"
          : "สถานะ Tag เป็น 'แจ้งของหายแล้ว'",
      });
    } catch (err) {
      await showAlert({
        title: "ไม่สำเร็จ",
        message: err instanceof Error ? err.message : "เกิดข้อผิดพลาด",
      });
    }
  };

  const handleMarkReturned = async (tag: NfcTag) => {
    const ok = await showConfirm({
      title: "ได้รับของคืนแล้ว?",
      message: "ยืนยันว่าคุณได้รับของคืนแล้ว",
      confirmLabel: "ยืนยัน",
    });
    if (!ok) return;

    try {
      await updateNfcTagStatusApi(tag.id, "returned");
      const tagReports = reportsByTag.get(tag.id) || [];
      await Promise.all(
        tagReports
          .filter((r) => r.status !== "resolved")
          .map((r) => updateNfcReportStatusApi(r.id, "resolved"))
      );
      await loadDashboard();
    } catch (err) {
      await showAlert({
        title: "ไม่สำเร็จ",
        message: err instanceof Error ? err.message : "เกิดข้อผิดพลาด",
      });
    }
  };

  const handleMarkReportViewed = async (report: NfcFoundReport) => {
    if (report.status !== "pending") return;
    await updateNfcReportStatusApi(report.id, "viewed");
    setReports((prev) =>
      prev.map((r) => (r.id === report.id ? { ...r, status: "viewed" } : r))
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#06C755]" />
      </div>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <Header title="แท็กของฉัน" showBack />
        <LoginPrompt />
        <BottomNav />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Header title="แท็กของฉัน" showBack />
      <main className="px-4 py-6 pb-28 space-y-4">
        {loadError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-sm text-red-700 dark:text-red-300">
            {loadError}
          </div>
        )}
        {pendingCount > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-amber-600" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              มีข้อความจากผู้พบ {pendingCount} รายการ
            </p>
          </div>
        )}

        {tags.length === 0 ? (
          <div className="text-center py-12">
            <Radio className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">ยังไม่มี NFC Tag</p>
            <button
              type="button"
              onClick={() => router.push("/nfc/register")}
              className="px-6 py-3 rounded-full bg-[#06C755] text-white font-medium"
            >
              ลงทะเบียน Tag แรก
            </button>
          </div>
        ) : (
          tags.map((tag) => {
            const cat = CATEGORIES.find((c) => c.value === tag.category);
            const statusCfg = NFC_TAG_STATUS_CONFIG[tag.status];
            const tagReports = reportsByTag.get(tag.id) || [];
            const isExpanded = expandedTag === tag.id;
            const tagUrl = buildTagUrl(tag.id, appSettings.nfcPublicBaseUrl);

            return (
              <article
                key={tag.id}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedTag(isExpanded ? null : tag.id)}
                  className="w-full p-4 text-left flex items-start justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {cat?.icon} {tag.itemName}
                    </p>
                    <p className="text-xs text-gray-400 font-mono mt-1">{tag.id}</p>
                  </div>
                  <span
                    className={cn(
                      "text-xs px-2 py-1 rounded-full shrink-0",
                      statusCfg.bgColor,
                      statusCfg.color
                    )}
                  >
                    {statusCfg.label}
                  </span>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-gray-100 dark:border-gray-800 pt-4">
                    {tag.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{tag.description}</p>
                    )}

                    <TagQrPrint tagId={tag.id} tagUrl={tagUrl} itemName={tag.itemName} />

                    <div className="flex flex-wrap gap-2">
                      {tag.status !== "lost" && tag.status !== "disabled" && (
                        <button
                          type="button"
                          onClick={() => handleMarkLost(tag)}
                          className="flex items-center gap-1 px-4 py-2 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-medium"
                        >
                          <Search className="w-4 h-4" /> แจ้งของหาย
                        </button>
                      )}
                      {tag.status === "lost" && (
                        <button
                          type="button"
                          onClick={() => handleMarkReturned(tag)}
                          className="flex items-center gap-1 px-4 py-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium"
                        >
                          <CheckCircle2 className="w-4 h-4" /> ได้รับคืนแล้ว
                        </button>
                      )}
                    </div>

                    {tagReports.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" /> ข้อความจากผู้พบ
                        </p>
                        {tagReports.map((report) => (
                          <div
                            key={report.id}
                            role="button"
                            tabIndex={0}
                            className={cn(
                              "p-3 rounded-xl text-sm border cursor-pointer",
                              report.status === "pending"
                                ? "border-[#06C755] bg-[#e8f8ef] dark:bg-[#06C755]/10"
                                : "border-gray-200 dark:border-gray-700"
                            )}
                            onClick={() => handleMarkReportViewed(report)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleMarkReportViewed(report);
                            }}
                          >
                            <p className="text-gray-800 dark:text-gray-200">{report.finderMessage}</p>
                            {report.locationFound && (
                              <p className="text-xs text-gray-500 mt-1">📍 {report.locationFound}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-2">
                              {formatThaiDate(report.createdAt)}
                              {report.status === "pending" && " · ใหม่"}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {tag.lostItemId && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> ลิงก์ Lost Item: {tag.lostItemId}
                      </p>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </main>
      {dialog}
      <BottomNav />
    </AppShell>
  );
}
