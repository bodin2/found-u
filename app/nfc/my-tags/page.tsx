"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Pencil,
  Radio,
  Search,
  Wifi,
} from "lucide-react";
import Header from "@/components/layout/header";
import BottomNav from "@/components/layout/bottom-nav";
import AppShell from "@/components/layout/app-shell";
import LoginPrompt from "@/components/auth/login-prompt";
import TagQrPrint from "@/components/nfc/tag-qr-print";
import {
  NFC_TAG_STATUS_CONFIG,
  CATEGORIES,
  CONTACT_TYPES,
  type ContactInfo,
  type ContactType,
  type ItemCategory,
  type NfcTag,
  type NfcFoundReport,
} from "@/lib/types";
import { cn, formatThaiDate, generateTrackingCode } from "@/lib/utils";
import { buildTagUrl, isWebNfcSupported, writeTagUrl, getNfcErrorMessage } from "@/lib/nfc";
import { getContactHref, getContactTypeLabel } from "@/lib/contact-href";
import {
  addLostItem,
  subscribeToNfcTagsByOwnerId,
  subscribeToNfcFoundReportsByOwnerId,
} from "@/lib/database";
import {
  updateNfcTagStatusApi,
  updateNfcTagApi,
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
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    itemName: "",
    category: "" as ItemCategory | "",
    description: "",
    contacts: [] as ContactInfo[],
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [writingTagId, setWritingTagId] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
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
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setTags([]);
      setReports([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    void loadDashboard();

    const unsubTags = subscribeToNfcTagsByOwnerId(user.uid, (next) => {
      setTags(next);
      setLoading(false);
    });
    const unsubReports = subscribeToNfcFoundReportsByOwnerId(user.uid, (next) => {
      setReports(next);
    });

    return () => {
      unsubTags();
      unsubReports();
    };
  }, [user?.uid, loadDashboard]);

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

  const startEdit = (tag: NfcTag) => {
    setEditingTagId(tag.id);
    setEditForm({
      itemName: tag.itemName,
      category: tag.category,
      description: tag.description || "",
      contacts: tag.contacts.length
        ? tag.contacts.map((c) => ({ ...c }))
        : [{ type: "phone", value: "" }],
    });
  };

  const handleSaveEdit = async (tagId: string) => {
    if (!editForm.itemName.trim() || !editForm.category) {
      await showAlert({ title: "ข้อมูลไม่ครบ", message: "กรุณากรอกชื่อและประเภท" });
      return;
    }
    const contacts = editForm.contacts.filter((c) => c.value.trim());
    if (contacts.length === 0) {
      await showAlert({ title: "ข้อมูลไม่ครบ", message: "กรุณาระบุช่องทางติดต่ออย่างน้อย 1 ช่องทาง" });
      return;
    }
    setSavingEdit(true);
    try {
      await updateNfcTagApi(tagId, {
        itemName: editForm.itemName.trim(),
        category: editForm.category as ItemCategory,
        description: editForm.description.trim(),
        contacts,
      });
      setEditingTagId(null);
      await loadDashboard();
    } catch (err) {
      await showAlert({
        title: "บันทึกไม่สำเร็จ",
        message: err instanceof Error ? err.message : "เกิดข้อผิดพลาด",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleMarkLost = async (tag: NfcTag) => {
    const createLost = await showConfirm({
      title: "แจ้งของหาย",
      message: "ต้องการสร้างรายการ Lost Item ในระบบด้วยหรือไม่? (แนะนำ — ช่วยจับคู่อัตโนมัติ)",
      confirmLabel: "สร้าง Lost Item ด้วย",
      cancelLabel: "เฉพาะ NFC Tag",
    });

    try {
      let lostItemId: string | undefined;
      let matchHint = "";
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
        try {
          const matchResponse = await fetch("/api/match", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "lost", itemId: lostItemId }),
          });
          if (matchResponse.ok) {
            const matchData = await matchResponse.json();
            const count = Array.isArray(matchData.matches) ? matchData.matches.length : 0;
            if (count > 0) {
              matchHint = ` พบของเจอที่อาจตรงกัน ${count} รายการ — ดูได้จากติดตามสถานะหรือให้เจ้าหน้าที่จับคู่`;
            }
          }
        } catch {
          // Suggest is best-effort after create
        }
      }

      await updateNfcTagStatusApi(tag.id, "lost", lostItemId);
      await loadDashboard();
      await showAlert({
        title: "แจ้งของหายแล้ว",
        message: createLost
          ? `สถานะ Tag อัปเดตแล้ว และสร้างรายการ Lost แล้ว${matchHint}`
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

  const handleDisable = async (tag: NfcTag) => {
    const ok = await showConfirm({
      title: "ปิดใช้งานแท็ก?",
      message: "ผู้พบจะไม่สามารถ resolve แท็กนี้ได้อีก จนกว่าแอดมินจะเปิดใหม่",
      variant: "warning",
      confirmLabel: "ปิดใช้งาน",
    });
    if (!ok) return;
    try {
      await updateNfcTagStatusApi(tag.id, "disabled");
      await loadDashboard();
    } catch (err) {
      await showAlert({
        title: "ไม่สำเร็จ",
        message: err instanceof Error ? err.message : "เกิดข้อผิดพลาด",
      });
    }
  };

  const handleRetryWrite = async (tag: NfcTag) => {
    if (!isWebNfcSupported()) {
      await showAlert({
        title: "ไม่รองรับ Web NFC",
        message: "ใช้อุปกรณ์ Android + Chrome หรือพิมพ์ QR แทน",
      });
      return;
    }
    setWritingTagId(tag.id);
    try {
      const url = buildTagUrl(tag.id, appSettings.nfcPublicBaseUrl || window.location.origin);
      await writeTagUrl(url, { makeReadOnly: tag.readOnlyLocked });
      await updateNfcTagApi(tag.id, { ndefWritten: true });
      await loadDashboard();
      await showAlert({ title: "เขียนแท็กสำเร็จ", message: "URL ถูกเขียนลงแท็กแล้ว" });
    } catch (err) {
      await showAlert({
        title: "เขียนแท็กไม่สำเร็จ",
        message: getNfcErrorMessage(err),
      });
    } finally {
      setWritingTagId(null);
    }
  };

  const handleMarkReportViewed = async (report: NfcFoundReport) => {
    if (report.status !== "pending") return;
    try {
      await updateNfcReportStatusApi(report.id, "viewed");
      setReports((prev) =>
        prev.map((r) => (r.id === report.id ? { ...r, status: "viewed" } : r))
      );
    } catch {
      // ignore — realtime will refresh
    }
  };

  if ((authLoading && !user) || loading) {
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
        <LoginPrompt returnTo="/nfc/my-tags" />
        <BottomNav />
      </AppShell>
    );
  }

  if (appSettings.nfcEnabled === false) {
    return (
      <AppShell>
        <Header title="แท็กของฉัน" showBack />
        <main className="px-4 py-8 text-center">
          <Radio className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">ระบบ NFC ถูกปิดใช้งานชั่วคราว</p>
        </main>
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
            const isEditing = editingTagId === tag.id;

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
                    {!tag.ndefWrittenAt && (
                      <p className="text-xs text-amber-600 mt-1">ยังไม่ได้เขียน NDEF ลงแท็ก</p>
                    )}
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
                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          value={editForm.itemName}
                          onChange={(e) => setEditForm((p) => ({ ...p, itemName: e.target.value }))}
                          className="w-full input-line"
                          placeholder="ชื่อสิ่งของ"
                        />
                        <select
                          value={editForm.category}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              category: e.target.value as ItemCategory,
                            }))
                          }
                          className="w-full input-line"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.icon} {c.label}
                            </option>
                          ))}
                        </select>
                        <textarea
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm((p) => ({ ...p, description: e.target.value }))
                          }
                          rows={2}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent"
                          placeholder="รายละเอียด"
                        />
                        {editForm.contacts.map((contact, index) => (
                          <div key={index} className="flex gap-2">
                            <select
                              value={contact.type}
                              onChange={(e) => {
                                const next = [...editForm.contacts];
                                next[index] = {
                                  ...next[index],
                                  type: e.target.value as ContactType,
                                };
                                setEditForm((p) => ({ ...p, contacts: next }));
                              }}
                              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent"
                            >
                              {CONTACT_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                            <input
                              value={contact.value}
                              onChange={(e) => {
                                const next = [...editForm.contacts];
                                next[index] = { ...next[index], value: e.target.value };
                                setEditForm((p) => ({ ...p, contacts: next }));
                              }}
                              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent"
                            />
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={savingEdit}
                            onClick={() => void handleSaveEdit(tag.id)}
                            className="flex-1 py-2 rounded-xl bg-[#06C755] text-white text-sm font-medium disabled:opacity-50"
                          >
                            {savingEdit ? "กำลังบันทึก..." : "บันทึก"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTagId(null)}
                            className="px-4 py-2 rounded-xl text-sm text-gray-500"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {tag.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {tag.description}
                          </p>
                        )}

                        <TagQrPrint tagId={tag.id} tagUrl={tagUrl} itemName={tag.itemName} />

                        <div className="flex flex-wrap gap-2">
                          {tag.status !== "disabled" && (
                            <button
                              type="button"
                              onClick={() => startEdit(tag)}
                              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium"
                            >
                              <Pencil className="w-4 h-4" /> แก้ไข
                            </button>
                          )}
                          {!tag.ndefWrittenAt && tag.status !== "disabled" && (
                            <button
                              type="button"
                              disabled={writingTagId === tag.id}
                              onClick={() => void handleRetryWrite(tag)}
                              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-line-green-light text-line-green text-sm font-medium disabled:opacity-50"
                            >
                              <Wifi className="w-4 h-4" />
                              {writingTagId === tag.id ? "กำลังเขียน..." : "เขียนลงแท็ก NFC"}
                            </button>
                          )}
                          {tag.status !== "lost" && tag.status !== "disabled" && (
                            <button
                              type="button"
                              onClick={() => void handleMarkLost(tag)}
                              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-medium"
                            >
                              <Search className="w-4 h-4" /> แจ้งของหาย
                            </button>
                          )}
                          {tag.status === "lost" && (
                            <button
                              type="button"
                              onClick={() => void handleMarkReturned(tag)}
                              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium"
                            >
                              <CheckCircle2 className="w-4 h-4" /> ได้รับคืนแล้ว
                            </button>
                          )}
                          {tag.status !== "disabled" && (
                            <button
                              type="button"
                              onClick={() => void handleDisable(tag)}
                              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 text-sm font-medium"
                            >
                              <Ban className="w-4 h-4" /> ปิดใช้งาน
                            </button>
                          )}
                        </div>
                      </>
                    )}

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
                            onClick={() => void handleMarkReportViewed(report)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void handleMarkReportViewed(report);
                            }}
                          >
                            <p className="text-gray-800 dark:text-gray-200">{report.finderMessage}</p>
                            {report.locationFound && (
                              <p className="text-xs text-gray-500 mt-1">
                                สถานที่: {report.locationFound}
                              </p>
                            )}
                            {report.finderContacts && report.finderContacts.length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {report.finderContacts.map((c, i) => {
                                  const href = getContactHref(c);
                                  return (
                                    <li key={i} className="text-xs text-gray-600 dark:text-gray-300">
                                      <span className="text-gray-400">
                                        {getContactTypeLabel(c.type)}:{" "}
                                      </span>
                                      {href ? (
                                        <a
                                          href={href}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[#06C755] underline"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {c.value}
                                        </a>
                                      ) : (
                                        c.value
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
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
                        <AlertCircle className="w-3 h-3" />
                        <Link href="/tracking" className="text-[#06C755] underline">
                          ดูรายการ Lost ที่ผูกไว้ (ติดตามสถานะ)
                        </Link>
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
