"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Radio, Search, Loader2, Ban } from "lucide-react";
import { getAllNfcTags, updateNfcTag } from "@/lib/database";
import { NFC_TAG_STATUS_CONFIG, CATEGORIES, type NfcTag } from "@/lib/types";
import { cn, formatThaiDate } from "@/lib/utils";
import { useAppDialog } from "@/hooks/use-app-dialog";

export default function AdminNfcPage() {
  const { showConfirm, dialog } = useAppDialog();
  const [tags, setTags] = useState<NfcTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getAllNfcTags(500)
      .then(setTags)
      .finally(() => setLoading(false));
  }, []);

  const filtered = tags.filter(
    (t) =>
      t.id.includes(search.toUpperCase()) ||
      t.itemName.toLowerCase().includes(search.toLowerCase()) ||
      t.tagUid?.includes(search) ||
      t.ownerId.includes(search)
  );

  const handleDisable = async (tag: NfcTag) => {
    const ok = await showConfirm({
      title: "ปิดใช้งานแท็ก",
      message: `ปิดใช้งาน Tag ${tag.id}?`,
      variant: "warning",
      confirmLabel: "ปิดใช้งาน",
    });
    if (!ok) return;
    await updateNfcTag(tag.id, { status: "disabled" });
    setTags((prev) =>
      prev.map((t) => (t.id === tag.id ? { ...t, status: "disabled" } : t))
    );
  };

  const stats = {
    total: tags.length,
    lost: tags.filter((t) => t.status === "lost").length,
    active: tags.filter((t) => t.status === "active").length,
  };

  const renderTagRow = (tag: NfcTag) => {
    const status = NFC_TAG_STATUS_CONFIG[tag.status];
    const cat = CATEGORIES.find((c) => c.value === tag.category);
    return (
      <tr key={tag.id} className="border-t border-gray-100 dark:border-gray-700">
        <td className="p-3 font-mono text-xs">{tag.id}</td>
        <td className="p-3">
          {cat?.icon} {tag.itemName}
        </td>
        <td className="p-3">
          <span
            className={cn("text-xs px-2 py-1 rounded-full", status.bgColor, status.color)}
          >
            {status.label}
          </span>
        </td>
        <td className="p-3 font-mono text-xs max-w-[140px] truncate" title={tag.ownerId}>
          {tag.ownerId}
        </td>
        <td className="p-3 text-gray-500 whitespace-nowrap">{formatThaiDate(tag.registeredAt)}</td>
        <td className="p-3">
          {tag.status !== "disabled" && (
            <button
              type="button"
              onClick={() => void handleDisable(tag)}
              className="text-red-500 hover:text-red-600 flex items-center gap-1"
            >
              <Ban className="w-4 h-4" /> ปิด
            </button>
          )}
        </td>
      </tr>
    );
  };

  const renderTagCard = (tag: NfcTag) => {
    const status = NFC_TAG_STATUS_CONFIG[tag.status];
    const cat = CATEGORIES.find((c) => c.value === tag.category);
    return (
      <div
        key={tag.id}
        className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 space-y-2"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-xs text-gray-500">{tag.id}</p>
            <p className="font-medium text-gray-900 dark:text-white truncate">
              {cat?.icon} {tag.itemName}
            </p>
          </div>
          <span
            className={cn(
              "text-xs px-2 py-1 rounded-full shrink-0",
              status.bgColor,
              status.color
            )}
          >
            {status.label}
          </span>
        </div>
        <p className="text-xs text-gray-500 truncate" title={tag.ownerId}>
          Owner: {tag.ownerId}
        </p>
        <p className="text-xs text-gray-400">{formatThaiDate(tag.registeredAt)}</p>
        {tag.status !== "disabled" && (
          <button
            type="button"
            onClick={() => void handleDisable(tag)}
            className="text-sm text-red-500 flex items-center gap-1"
          >
            <Ban className="w-4 h-4" /> ปิดใช้งาน
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {dialog}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Radio className="w-7 h-7 text-[#06C755]" /> NFC Tags
        </h1>
        <p className="text-gray-500 mt-1">จัดการแท็ก NFC ทั้งหมดในระบบ</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "ทั้งหมด", value: stats.total, color: "text-gray-900 dark:text-white" },
          { label: "ใช้งานปกติ", value: stats.active, color: "text-[#06C755]" },
          { label: "แจ้งของหาย", value: stats.lost, color: "text-amber-600" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
          >
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={cn("text-2xl font-bold mt-1", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหา Tag ID, ชื่อ, UID, Owner..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#06C755]" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-500 py-8">ไม่พบแท็ก</p>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {filtered.map(renderTagCard)}
          </div>
          <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Tag ID</th>
                    <th className="text-left p-3 font-medium">สิ่งของ</th>
                    <th className="text-left p-3 font-medium">สถานะ</th>
                    <th className="text-left p-3 font-medium">Owner</th>
                    <th className="text-left p-3 font-medium">ลงทะเบียน</th>
                    <th className="text-left p-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>{filtered.map(renderTagRow)}</tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
