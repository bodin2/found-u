"use client";

// Force dynamic rendering for security
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import {
  Settings,
  Bell,
  Shield,
  Database,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Save,
  Share2,
  MapPin,
  Image as ImageIcon,
  EyeOff,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { getAllUsers, getAppSettings, updateAppSettings, timestampToDate } from "@/lib/database";
import { createClient } from "@/lib/supabase/client";
import { uploadImage, compressImage } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { AppUser, AppSettings } from "@/lib/types";
import { DEFAULT_APP_SETTINGS } from "@/lib/types";
import { useAppDialog } from "@/hooks/use-app-dialog";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";

const SETTINGS_TABS = [
  { id: "seo", label: "SEO" },
  { id: "notifications", label: "การแจ้งเตือน" },
  { id: "storage", label: "Storage" },
  { id: "ai", label: "AI" },
  { id: "data", label: "เครื่องมือข้อมูล" },
] as const;

type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"];

export default function AdminSettingsPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const { showAlert, showConfirm, dialog } = useAppDialog();
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [adminUsers, setAdminUsers] = useState<AppUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [uploadingOg, setUploadingOg] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTabId>("seo");

  // App settings state
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);

  const handleOgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingOg(true);
    try {
      // Compress
      const compressed = await compressImage(file, {
        maxWidthOrHeight: 1200,
        initialQuality: settings.compressionQuality ?? DEFAULT_APP_SETTINGS.compressionQuality,
      });
      // Upload
      const url = await uploadImage(compressed, `settings/og-image-${Date.now()}.jpg`);

      setSettings(prev => ({ ...prev, ogImage: url }));
    } catch (error) {
      console.error('Error uploading OG image:', error);
      void showAlert({
        title: "อัปโหลดไม่สำเร็จ",
        message: "เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ",
        variant: "error",
      });
    } finally {
      setUploadingOg(false);
    }
  };

  // Fetch admin users from Firestore
  useEffect(() => {
    async function fetchAdmins() {
      try {
        const users = await getAllUsers();
        setAdminUsers(users.filter(u => u.role === 'admin'));
      } catch (error) {
        console.error('Error fetching admin users:', error);
      } finally {
        setLoadingAdmins(false);
      }
    }
    fetchAdmins();
  }, []);

  // Load app settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const loadedSettings = await getAppSettings();
        setSettings(loadedSettings);
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoadingSettings(false);
      }
    }
    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    if (!user?.uid) return;

    setSaving(true);
    try {
      await updateAppSettings(settings, user.uid);
      await fetch("/api/revalidate-og", { method: "POST" }).catch(() => undefined);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      void showAlert({
        title: "บันทึกไม่สำเร็จ",
        message: "กรุณาตรวจสอบสิทธิ์ Admin และการเชื่อมต่อ Supabase",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const [processingData, setProcessingData] = useState(false);

  // Export Data as CSV
  const handleExport = async () => {
    if (processingData) return;
    setProcessingData(true);
    try {
      // 1. Fetch all data
      const [{ data: lostRows, error: lostError }, { data: foundRows, error: foundError }] = await Promise.all([
        supabase.from("lost_items").select("*"),
        supabase.from("found_items").select("*"),
      ]);

      if (lostError) throw lostError;
      if (foundError) throw foundError;

      const lostItems = (lostRows ?? []).map((row) => ({
        id: String(row.id),
        type: "lost" as const,
        ...row as Record<string, unknown>,
      }));
      const foundItems = (foundRows ?? []).map((row) => ({
        id: String(row.id),
        type: "found" as const,
        ...row as Record<string, unknown>,
      }));

      const allItems = [...lostItems, ...foundItems];

      // 2. Convert to CSV
      const headers = [
        "type", "id", "trackingCode", "status", "category",
        "itemName", "description", // Combined name field logic
        "location", // Combined location
        "date", // Combined date
        "contactName", "contactDetail", // Simplified contact
        "createdAt"
      ];

      const csvContent = [
        headers.join(","),
        ...allItems.map(item => {
          // Normalize fields - use type assertion for accessing properties
          const itemData = item as Record<string, unknown>;
          const name = item.type === "lost" ? (itemData.item_name as string) : (itemData.description as string);
          const location = item.type === "lost" ? (itemData.location_lost as string) : (itemData.location_found as string);
          const date = item.type === "lost" ? itemData.date_lost : itemData.date_found;
          const dateStr = date ? timestampToDate(date).toISOString() : "";
          const createdStr = itemData.created_at ? timestampToDate(itemData.created_at).toISOString() : "";

          // Flatten first contact if exists
          let contactName = "";
          let contactDetail = "";
          const contacts = itemData.contacts as Array<{ type: string; value: string }> | undefined;
          const finderContacts = itemData.finder_contacts as Array<{ type: string; value: string }> | undefined;
          if (item.type === "lost" && contacts?.[0]) {
            contactName = contacts[0].type;
            contactDetail = contacts[0].value;
          } else if (item.type === "found" && finderContacts?.[0]) {
            contactName = finderContacts[0].type;
            contactDetail = finderContacts[0].value;
          }

          return [
            item.type,
            item.id,
            (itemData.tracking_code as string) || "",
            (itemData.status as string),
            (itemData.category as string) || "",
            `"${(name || "").replace(/"/g, '""')}"`, // Escape quotes
            `"${((itemData.description as string) || "").replace(/"/g, '""')}"`,
            `"${(location || "").replace(/"/g, '""')}"`,
            dateStr,
            contactName,
            contactDetail,
            createdStr
          ].join(",");
        })
      ].join("\n");

      // 3. Download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `scfondue_data_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error("Export error:", error);
      void showAlert({
        title: "ส่งออกไม่สำเร็จ",
        message: "เกิดข้อผิดพลาดในการส่งออกข้อมูล",
        variant: "error",
      });
    } finally {
      setProcessingData(false);
    }
  };

  // Import Data from CSV
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || processingData) return;

    const proceedImport = await showConfirm({
      title: "ยืนยันการนำเข้าข้อมูล",
      message: "การนำเข้าข้อมูลอาจทำให้สับสนได้หากข้อมูลซ้ำซ้อน ต้องการทำต่อหรือไม่?",
      variant: "warning",
    });
    if (!proceedImport) {
      event.target.value = "";
      return;
    }

    setProcessingData(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const rows = text.split("\n").slice(1); // Skip header

        const lostInserts: Record<string, unknown>[] = [];
        const foundInserts: Record<string, unknown>[] = [];
        const BATCH_LIMIT = 500;
        const nowIso = new Date().toISOString();

        for (const row of rows) {
          if (!row.trim()) continue;

          // Simple CSV parse (this assumes no commas in fields for simplicity, 
          // but for robustness we rely on the export format we just made or standard CSV)
          // For a robust implementation, a regex or library is better. 
          // Here we assume standard format or basic split if simple.
          // BUT, our export logic added quotes. So basic split starts efficiently:
          // Let's us a smarter regex split for quotes
          const simpleCols = row.split(",");

          if (simpleCols.length < 4) continue; // Invalid row

          const type = simpleCols[0];
          // We only support importing what we basically expect. 
          // Map index based on header: 
          // 0:type, 1:id, 2:trackingCode, 3:status, 4:category, 5:itemName, 6:desc...

          const baseData = {
            status: simpleCols[3] || "searching",
            created_at: nowIso,
            updated_at: nowIso,
            tracking_code: simpleCols[2] || `IMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            item_name: (simpleCols[5] || "").replace(/^"|"$/g, '').replace(/""/g, '"'),
            description: (simpleCols[6] || "").replace(/^"|"$/g, '').replace(/""/g, '"'),
            category: simpleCols[4] || "other",
          };

          if (type === "lost") {
            lostInserts.push({
              ...baseData,
              location_lost: (simpleCols[7] || "").replace(/^"|"$/g, ''),
              date_lost: nowIso,
            });
          } else if (type === "found") {
            foundInserts.push({
              ...baseData,
              location_found: (simpleCols[7] || "").replace(/^"|"$/g, ''),
              date_found: nowIso,
            });
          }
        }

        for (let i = 0; i < lostInserts.length; i += BATCH_LIMIT) {
          const chunk = lostInserts.slice(i, i + BATCH_LIMIT);
          if (chunk.length > 0) {
            const { error } = await supabase.from("lost_items").insert(chunk);
            if (error) throw error;
          }
        }

        for (let i = 0; i < foundInserts.length; i += BATCH_LIMIT) {
          const chunk = foundInserts.slice(i, i + BATCH_LIMIT);
          if (chunk.length > 0) {
            const { error } = await supabase.from("found_items").insert(chunk);
            if (error) throw error;
          }
        }

        await showAlert({
          title: "นำเข้าสำเร็จ",
          message: "นำเข้าข้อมูลสำเร็จ",
          variant: "success",
        });
        // Refresh page or state?
        window.location.reload();

      } catch (error) {
        console.error("Import error:", error);
        void showAlert({
          title: "นำเข้าไม่สำเร็จ",
          message: "เกิดข้อผิดพลาดในการนำเข้า",
          variant: "error",
        });
      } finally {
        setProcessingData(false);
        event.target.value = "";
      }
    };

    reader.readAsText(file);
  };

  // Delete All Data
  const handleDeleteAll = async () => {
    const confirmDelete = await showConfirm({
      title: "ลบข้อมูลทั้งหมด",
      message: "คุณแน่ใจหรือไม่ที่จะลบข้อมูลรายการทั้งหมด (ของหายและของเจอ)?",
      variant: "warning",
    });
    if (!confirmDelete) return;

    const confirmFinal = await showConfirm({
      title: "ยืนยันครั้งสุดท้าย",
      message: "การกระทำนี้ไม่สามารถกู้คืนได้",
      variant: "error",
      confirmLabel: "ลบทั้งหมด",
    });
    if (!confirmFinal) return;

    if (processingData) return;
    setProcessingData(true);

    try {
      const [{ data: lostRows, error: lostFetchError }, { data: foundRows, error: foundFetchError }] = await Promise.all([
        supabase.from("lost_items").select("id"),
        supabase.from("found_items").select("id"),
      ]);

      if (lostFetchError) throw lostFetchError;
      if (foundFetchError) throw foundFetchError;

      const BATCH_LIMIT = 500;
      const lostIds = (lostRows ?? []).map((row) => String(row.id));
      const foundIds = (foundRows ?? []).map((row) => String(row.id));

      for (let i = 0; i < lostIds.length; i += BATCH_LIMIT) {
        const chunk = lostIds.slice(i, i + BATCH_LIMIT);
        if (chunk.length > 0) {
          const { error } = await supabase.from("lost_items").delete().in("id", chunk);
          if (error) throw error;
        }
      }

      for (let i = 0; i < foundIds.length; i += BATCH_LIMIT) {
        const chunk = foundIds.slice(i, i + BATCH_LIMIT);
        if (chunk.length > 0) {
          const { error } = await supabase.from("found_items").delete().in("id", chunk);
          if (error) throw error;
        }
      }

      await showAlert({
        title: "ลบสำเร็จ",
        message: "ลบข้อมูลสำเร็จ",
        variant: "success",
      });
      window.location.reload();

    } catch (error) {
      console.error("Delete error:", error);
      void showAlert({
        title: "ลบไม่สำเร็จ",
        message: "ลบข้อมูลล้มเหลว",
        variant: "error",
      });
    } finally {
      setProcessingData(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ตั้งค่า</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          จัดการการตั้งค่าระบบ Found-U
        </p>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-4 rounded-xl flex items-center gap-3 animate-fade-in">
          <CheckCircle className="w-5 h-5" />
          <span>บันทึกการตั้งค่าเรียบร้อยแล้ว</span>
        </div>
      )}

      <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur border-b border-gray-200/80 dark:border-gray-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SegmentedTabs<SettingsTabId>
            items={[...SETTINGS_TABS]}
            value={settingsTab}
            onChange={setSettingsTab}
            className="flex-1 min-w-0"
            size="sm"
          />
          <button
            onClick={handleSaveSettings}
            disabled={saving || loadingSettings}
            className={cn(
              "flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors shrink-0",
              "bg-line-green text-white hover:bg-line-green-hover",
              (saving || loadingSettings) && "opacity-50 cursor-not-allowed"
            )}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            บันทึกการตั้งค่า
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(settingsTab === "seo" || settingsTab === "ai") && (
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-line-green-light flex items-center justify-center">
                <Settings className="w-5 h-5 text-line-green" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">การตั้งค่าระบบ (System Settings)</h2>
                <p className="text-sm text-gray-500">
                  แผนที่/GPS, การแจ้งเตือน, การจัดเก็บ และ SEO
                </p>
              </div>
            </div>
          </div>

          {loadingSettings ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-line-green" />
            </div>
          ) : (
            <div className="p-5 space-y-6">
              {settingsTab === "seo" && (
              <>
              {/* OG Settings */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                  <Share2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">SEO & Link Preview (Open Graph)</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      ตั้งค่ารูปภาพและข้อความที่จะแสดงเมื่อมีการแชร์ลิงก์ของเว็บไซต์
                    </p>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      หัวข้อ (Title)
                    </label>
                    <input
                      type="text"
                      value={settings.ogTitle || ''}
                      onChange={(e) => setSettings({ ...settings, ogTitle: e.target.value })}
                      placeholder="Ex. Found-U | ระบบแจ้งของหาย"
                      className="w-full px-4 py-2 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-line-green"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      รายละเอียด (Description)
                    </label>
                    <textarea
                      value={settings.ogDescription || ''}
                      onChange={(e) => setSettings({ ...settings, ogDescription: e.target.value })}
                      placeholder="Ex. ระบบแจ้งของหายและของเจอสำหรับโรงเรียน..."
                      rows={2}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-line-green resize-none"
                    />
                  </div>

                  {/* Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      รูปภาพ (Preview Image)
                    </label>
                    <div className="flex gap-4 items-start">
                      <div className="relative w-32 h-20 bg-gray-100 dark:bg-gray-600 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-500">
                        {settings.ogImage ? (
                          <Image
                            src={settings.ogImage}
                            alt="OG Preview"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full text-gray-400">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <label className={cn(
                          "inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors text-sm font-medium",
                          uploadingOg
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500"
                        )}>
                          {uploadingOg ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                          <span>{uploadingOg ? 'กำลังอัปโหลด...' : 'เปลี่ยนรูปภาพ'}</span>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleOgImageUpload}
                            disabled={uploadingOg}
                          />
                        </label>
                        <p className="text-xs text-gray-500 mt-2">
                          แนะนำขนาด 1200x630px (JPG/PNG)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coming Soon — landing CTA */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <EyeOff className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        Coming Soon (หน้า Landing)
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        เมื่อเปิด ปุ่มเข้าสู่ระบบบนหน้าแรกจะถูกปิด และแสดงข้อความแทน
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          comingSoonEnabled: !settings.comingSoonEnabled,
                        })
                      }
                      className={cn(
                        "w-14 h-8 rounded-full transition-colors relative flex-shrink-0",
                        settings.comingSoonEnabled
                          ? "bg-line-green"
                          : "bg-gray-300 dark:bg-gray-600"
                      )}
                      aria-pressed={Boolean(settings.comingSoonEnabled)}
                      aria-label="สลับ Coming Soon"
                    >
                      <span
                        className={cn(
                          "absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform",
                          settings.comingSoonEnabled ? "right-1" : "left-1"
                        )}
                      />
                    </button>
                  </div>

                  {settings.comingSoonEnabled ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        ข้อความที่แสดง
                      </label>
                      <input
                        type="text"
                        value={settings.comingSoonMessage || ""}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            comingSoonMessage: e.target.value,
                          })
                        }
                        placeholder="พบกันเร็วๆนี้"
                        className="w-full px-4 py-2 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-line-green"
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Map & GPS — managed on dedicated page */}
              <Link
                href="/admin/maps"
                className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600/80 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-[#06C755] transition-colors">
                      แผนที่และ GPS
                    </h3>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full shrink-0",
                        settings.mapsEnabled
                          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                          : "bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300"
                      )}
                    >
                      {settings.mapsEnabled ? "เปิดใช้งาน" : "ปิด"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    ตั้งค่าแผนที่ ขอบเขตโรงเรียน และการบังคับ GPS — จัดการที่หน้าแยก
                  </p>
                </div>
              </Link>
              </>
              )}

              {settingsTab === "ai" && (
              <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">AI Rate Limit</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        จำกัดการใช้งาน AI ต่อผู้ใช้เพื่อป้องกันการใช้งานมากเกินไป
                      </p>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, aiRateLimitEnabled: !settings.aiRateLimitEnabled })}
                      className={cn(
                        "w-14 h-8 rounded-full transition-colors relative flex-shrink-0",
                        settings.aiRateLimitEnabled ? "bg-line-green" : "bg-gray-300 dark:bg-gray-600"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform",
                          settings.aiRateLimitEnabled ? "right-1" : "left-1"
                        )}
                      />
                    </button>
                  </div>

                  {settings.aiRateLimitEnabled && (
                    <>
                      {/* Limit per Minute */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          จำกัดต่อนาที (Per Minute)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={settings.aiRateLimitPerMinute || 5}
                            onChange={(e) => setSettings({ ...settings, aiRateLimitPerMinute: parseInt(e.target.value) || 5 })}
                            className="w-24 px-4 py-2 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-line-green"
                          />
                          <span className="text-sm text-gray-500">ครั้ง / นาที / ผู้ใช้</span>
                        </div>
                      </div>

                      {/* Limit per Hour */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          จำกัดต่อชั่วโมง (Per Hour)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={1000}
                            value={settings.aiRateLimitPerHour || 30}
                            onChange={(e) => setSettings({ ...settings, aiRateLimitPerHour: parseInt(e.target.value) || 30 })}
                            className="w-24 px-4 py-2 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-line-green"
                          />
                          <span className="text-sm text-gray-500">ครั้ง / ชั่วโมง / ผู้ใช้</span>
                        </div>
                      </div>

                      {/* Rate Limit Message */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          ข้อความเมื่อถูก Limit
                        </label>
                        <input
                          type="text"
                          value={settings.aiRateLimitMessage || ''}
                          onChange={(e) => setSettings({ ...settings, aiRateLimitMessage: e.target.value })}
                          placeholder="คุณใช้งาน AI บ่อยเกินไป กรุณารอสักครู่"
                          className="w-full px-4 py-2 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-line-green"
                        />
                      </div>

                      {/* System-wide Rate Limit Section */}
                      <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mt-4">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">Rate Limit ระดับระบบ (System-wide)</h4>
                            <p className="text-sm text-gray-500 mt-1">
                              จำกัดการใช้งาน AI รวมทั้งระบบ (ทุก user รวมกัน)
                            </p>
                          </div>
                          <button
                            onClick={() => setSettings({ ...settings, systemAiRateLimitEnabled: !settings.systemAiRateLimitEnabled })}
                            className={cn(
                              "w-14 h-8 rounded-full transition-colors relative flex-shrink-0",
                              settings.systemAiRateLimitEnabled ? "bg-line-green" : "bg-gray-300 dark:bg-gray-600"
                            )}
                          >
                            <span
                              className={cn(
                                "absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform",
                                settings.systemAiRateLimitEnabled ? "right-1" : "left-1"
                              )}
                            />
                          </button>
                        </div>

                        {settings.systemAiRateLimitEnabled && (
                          <div className="space-y-3 pl-4 border-l-2 border-purple-200 dark:border-purple-800">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                จำกัดต่อนาที (ทั้งระบบ)
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={1}
                                  max={1000}
                                  value={settings.systemAiRateLimitPerMinute || 20}
                                  onChange={(e) => setSettings({ ...settings, systemAiRateLimitPerMinute: parseInt(e.target.value) || 20 })}
                                  className="w-24 px-4 py-2 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-line-green"
                                />
                                <span className="text-sm text-gray-500">ครั้ง / นาที (ทุก user รวมกัน)</span>
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                จำกัดต่อชั่วโมง (ทั้งระบบ)
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={1}
                                  max={10000}
                                  value={settings.systemAiRateLimitPerHour || 100}
                                  onChange={(e) => setSettings({ ...settings, systemAiRateLimitPerHour: parseInt(e.target.value) || 100 })}
                                  className="w-24 px-4 py-2 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-line-green"
                                />
                                <span className="text-sm text-gray-500">ครั้ง / ชั่วโมง (ทุก user รวมกัน)</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
              )}

            </div>
          )}
        </div>
        )}

        {settingsTab === "seo" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">ผู้ดูแลระบบ</h2>
              <p className="text-sm text-gray-500">รายชื่ออีเมลที่มีสิทธิ์ Admin</p>
            </div>
          </div>
          <div className="p-5 space-y-3">
            {loadingAdmins ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-[#06C755]" />
              </div>
            ) : adminUsers.length > 0 ? (
              adminUsers.map((admin) => (
                <div
                  key={admin.uid}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl"
                >
                  {admin.photoURL ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- external avatar URL */
                    <img
                      src={admin.photoURL}
                      alt={admin.displayName}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#06C755] flex items-center justify-center text-white text-sm">
                      {admin.displayName?.[0]?.toUpperCase() || admin.email[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {admin.displayName || 'ไม่ระบุชื่อ'}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{admin.email}</p>
                  </div>
                  {user?.email === admin.email && (
                    <span className="px-2 py-0.5 rounded-full bg-[#e8f8ef] dark:bg-[#06C755]/20 text-[#06C755] text-xs font-medium">
                      คุณ
                    </span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">ไม่พบผู้ดูแลระบบ</p>
            )}
            <p className="text-xs text-gray-500 mt-3">
              💡 จัดการผู้ดูแลได้ที่ Firebase Console → Firestore → users → เปลี่ยน role เป็น &quot;admin&quot;
            </p>
          </div>
        </div>
        )}

        {settingsTab === "notifications" && (
        <>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">การแจ้งเตือน</h2>
              <p className="text-sm text-gray-500">ตั้งค่าการแจ้งเตือนระบบ</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">แจ้งเมื่อมีรายการใหม่</span>
              <button
                onClick={() =>
                  setSettings({
                    ...settings,
                    notifyOnNewReport: !settings.notifyOnNewReport,
                  })
                }
                className={cn(
                  "w-12 h-7 rounded-full transition-colors relative",
                  settings.notifyOnNewReport ? "bg-[#06C755]" : "bg-gray-300 dark:bg-gray-600"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform",
                    settings.notifyOnNewReport ? "right-1" : "left-1"
                  )}
                />
              </button>
            </label>

            <label className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">แจ้งเมื่อสถานะเปลี่ยน</span>
              <button
                onClick={() =>
                  setSettings({
                    ...settings,
                    notifyOnStatusChange: !settings.notifyOnStatusChange,
                  })
                }
                className={cn(
                  "w-12 h-7 rounded-full transition-colors relative",
                  settings.notifyOnStatusChange ? "bg-[#06C755]" : "bg-gray-300 dark:bg-gray-600"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform",
                    settings.notifyOnStatusChange ? "right-1" : "left-1"
                  )}
                />
              </button>
            </label>

            <label className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">ต้องอนุมัติก่อนแสดง</span>
              <button
                onClick={() =>
                  setSettings({
                    ...settings,
                    requireApproval: !settings.requireApproval,
                  })
                }
                className={cn(
                  "w-12 h-7 rounded-full transition-colors relative",
                  settings.requireApproval ? "bg-[#06C755]" : "bg-gray-300 dark:bg-gray-600"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform",
                    settings.requireApproval ? "right-1" : "left-1"
                  )}
                />
              </button>
            </label>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">กำหนดเวลาส่งห้องบุคคล (ของเจอ)</h2>
            <p className="text-sm text-gray-500">
              หลังแจ้งเจอของ ผู้พบต้องนำของไปห้องบุคคลภายในเวลาที่กำหนด มิฉะนั้นคำขอจะหมดอายุ
            </p>
          </div>
          <div className="p-5 space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">เปิดใช้กำหนดเวลาส่งห้องบุคคล</span>
              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    foundHandoverDeadlineEnabled: !settings.foundHandoverDeadlineEnabled,
                  })
                }
                className={cn(
                  "w-12 h-7 rounded-full transition-colors relative",
                  settings.foundHandoverDeadlineEnabled !== false
                    ? "bg-[#06C755]"
                    : "bg-gray-300 dark:bg-gray-600"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform",
                    settings.foundHandoverDeadlineEnabled !== false ? "right-1" : "left-1"
                  )}
                />
              </button>
            </label>

            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                ระยะเวลา (นาที) หลังแจ้งเจอที่ต้องนำของถึงห้องบุคคล
              </label>
              <input
                type="number"
                min={1}
                max={1440}
                disabled={settings.foundHandoverDeadlineEnabled === false}
                value={settings.foundHandoverDeadlineMinutes ?? 60}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    foundHandoverDeadlineMinutes: Math.min(
                      1440,
                      Math.max(1, parseInt(e.target.value, 10) || 60)
                    ),
                  })
                }
                className={cn(
                  "w-full max-w-xs px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white",
                  settings.foundHandoverDeadlineEnabled === false && "opacity-50"
                )}
              />
              <p className="text-xs text-gray-500 mt-2">
                ค่าเริ่มต้น 60 นาที (1 ชั่วโมง) — สูงสุด 1,440 นาที (24 ชั่วโมง)
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">NFC Tag</h2>
            <p className="text-sm text-gray-500">เปิด/ปิดระบบลงทะเบียนและแจ้งพบผ่าน NFC</p>
          </div>
          <div className="p-5 space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">เปิดใช้งาน NFC Tag</span>
              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    nfcEnabled: !(settings.nfcEnabled ?? true),
                  })
                }
                className={cn(
                  "w-12 h-7 rounded-full transition-colors relative",
                  (settings.nfcEnabled ?? true) ? "bg-[#06C755]" : "bg-gray-300 dark:bg-gray-600"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform",
                    (settings.nfcEnabled ?? true) ? "right-1" : "left-1"
                  )}
                />
              </button>
            </label>
            <div>
              <label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">
                Public Base URL (สำหรับ QR/NFC)
              </label>
              <input
                type="url"
                value={settings.nfcPublicBaseUrl || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    nfcPublicBaseUrl: e.target.value.trim() || undefined,
                  })
                }
                placeholder="https://your-domain.com"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06C755] text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">ว่างไว้เพื่อใช้ origin ของเว็บปัจจุบัน</p>
            </div>
          </div>
        </div>
        </>
        )}

        {settingsTab === "storage" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden lg:col-span-2">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Database className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">การจัดเก็บ</h2>
              <p className="text-sm text-gray-500">ตั้งค่าการจัดเก็บข้อมูลและรูปภาพ</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">
                ลบรายการเก่าอัตโนมัติหลังจาก (วัน)
              </label>
              <input
                type="number"
                value={settings.autoDeleteDays ?? 0}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    autoDeleteDays: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06C755] text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">ตั้ง 0 เพื่อไม่ลบอัตโนมัติ</p>
            </div>

            <div>
              <label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">
                ขนาดรูปภาพสูงสุด (MB)
              </label>
              <input
                type="number"
                value={settings.maxImageSize ?? 5}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxImageSize: Math.max(1, parseInt(e.target.value, 10) || 1),
                  })
                }
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06C755] text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">
                คุณภาพการบีบอัด ({Math.round((settings.compressionQuality ?? 0.8) * 100)}%)
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={settings.compressionQuality ?? 0.8}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    compressionQuality: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-[#06C755]"
              />
            </div>
          </div>
        </div>
        )}

        {settingsTab === "data" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden lg:col-span-2">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">จัดการข้อมูล</h2>
              <p className="text-sm text-gray-500">ส่งออก นำเข้า และลบข้อมูล</p>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <button
              onClick={handleExport}
              disabled={processingData}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left disabled:opacity-50"
            >
              <Download className="w-5 h-5 text-blue-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">ส่งออกข้อมูล (CSV)</p>
                <p className="text-sm text-gray-500">ดาวน์โหลดข้อมูลทั้งหมดเป็น CSV</p>
              </div>
            </button>

            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleImport}
                disabled={processingData}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <button
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left disabled:opacity-50"
                disabled={processingData}
              >
                <Upload className="w-5 h-5 text-green-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">นำเข้าข้อมูล (CSV)</p>
                  <p className="text-sm text-gray-500">
                    {processingData ? "กำลังประมวลผล..." : "อัปโหลดไฟล์ CSV เพื่อนำเข้าข้อมูล"}
                  </p>
                </div>
              </button>
            </div>

            <button
              onClick={handleDeleteAll}
              disabled={processingData}
              className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-left disabled:opacity-50"
            >
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <p className="font-medium text-red-500">ลบข้อมูลทั้งหมด</p>
                <p className="text-sm text-red-400">ระวัง! การกระทำนี้ไม่สามารถย้อนกลับได้</p>
              </div>
            </button>
          </div>
        </div>
        )}
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 p-4 text-sm text-blue-800 dark:text-blue-300">
        การตั้งค่าทั้งหมดบันทึกลง Supabase ที่{" "}
        <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">settings/appSettings</code>
        — กดปุ่ม <strong>บันทึกการตั้งค่า</strong> ด้านบน
      </div>

      {/* Supabase Policy Info */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-700 dark:text-yellow-400">
              อย่าลืมตรวจสอบ Supabase RLS Policies!
            </p>
            <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">
              ยืนยันว่า role ที่เป็น admin มีสิทธิ์อ่าน/เขียนตารางที่เกี่ยวข้องใน Supabase
            </p>
          </div>
        </div>
      </div>
      {dialog}
    </div>
  );
}
