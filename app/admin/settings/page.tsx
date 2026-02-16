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
  User,
  Mail,
  Save,
  Beaker,
  Lock,
  MessageSquare,
  ToggleLeft,
  ToggleRight,
  Share2,
  Image as ImageIcon,
} from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { getAllUsers, getAppSettings, updateAppSettings, timestampToDate } from "@/lib/firestore";
import { db } from "@/lib/firebase";
import { collection, getDocs, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { uploadImage, compressImage } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { AppUser, AppSettings } from "@/lib/types";
import { DEFAULT_APP_SETTINGS } from "@/lib/types";

export default function AdminSettingsPage() {
  const { user, appSettings: contextAppSettings } = useAuth();
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [adminUsers, setAdminUsers] = useState<AppUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [uploadingOg, setUploadingOg] = useState(false);

  // Beta settings state
  const [betaSettings, setBetaSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);

  const handleOgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingOg(true);
    try {
      // Compress
      const compressed = await compressImage(file, { maxWidthOrHeight: 1200 });
      // Upload
      const url = await uploadImage(compressed, `settings/og-image-${Date.now()}.jpg`);

      setBetaSettings(prev => ({ ...prev, ogImage: url }));
    } catch (error) {
      console.error('Error uploading OG image:', error);
      alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
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
        const settings = await getAppSettings();
        setBetaSettings(settings);
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoadingSettings(false);
      }
    }
    loadSettings();
  }, []);

  // Settings state
  const [settings, setSettings] = useState({
    autoDeleteDays: 30,
    notifyOnNewReport: true,
    notifyOnStatusChange: true,
    requireApproval: false,
    maxImageSize: 5, // MB
    compressionQuality: 0.8,
  });

  const handleSaveBetaSettings = async () => {
    if (!user?.uid) return;

    setSaving(true);
    try {
      await updateAppSettings(betaSettings, user.uid);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving beta settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const [processingData, setProcessingData] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simulate save for other settings
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  // Export Data as CSV
  const handleExport = async () => {
    if (processingData) return;
    setProcessingData(true);
    try {
      // 1. Fetch all data
      const [lostSnapshot, foundSnapshot] = await Promise.all([
        getDocs(collection(db, "lostItems")),
        getDocs(collection(db, "foundItems"))
      ]);

      const lostItems = lostSnapshot.docs.map(doc => ({ id: doc.id, type: "lost" as const, ...doc.data() as Record<string, unknown> }));
      const foundItems = foundSnapshot.docs.map(doc => ({ id: doc.id, type: "found" as const, ...doc.data() as Record<string, unknown> }));

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
          const name = item.type === "lost" ? (itemData.itemName as string) : (itemData.description as string);
          const location = item.type === "lost" ? (itemData.locationLost as string) : (itemData.locationFound as string);
          const date = item.type === "lost" ? itemData.dateLost : itemData.dateFound;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const dateStr = date ? timestampToDate(date as any).toISOString() : "";
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const createdStr = itemData.createdAt ? timestampToDate(itemData.createdAt as any).toISOString() : "";

          // Flatten first contact if exists
          let contactName = "";
          let contactDetail = "";
          const contacts = itemData.contacts as Array<{ type: string; value: string }> | undefined;
          const finderContacts = itemData.finderContacts as Array<{ type: string; value: string }> | undefined;
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
            (itemData.trackingCode as string) || "",
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
      alert("เกิดข้อผิดพลาดในการส่งออกข้อมูล");
    } finally {
      setProcessingData(false);
    }
  };

  // Import Data from CSV
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || processingData) return;

    if (!confirm("การนำเข้าข้อมูลอาจทำให้สับสนไดหากข้อมูลซ้ำซ้อน ต้องการทำต่อหรือไม่?")) {
      event.target.value = ""; // Reset input
      return;
    }

    setProcessingData(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const rows = text.split("\n").slice(1); // Skip header

        const batch = writeBatch(db);
        let batchCount = 0;
        const BATCH_LIMIT = 400; // Commit every 400 ops (limit is 500)

        for (const row of rows) {
          if (!row.trim()) continue;

          // Simple CSV parse (this assumes no commas in fields for simplicity, 
          // but for robustness we rely on the export format we just made or standard CSV)
          // For a robust implementation, a regex or library is better. 
          // Here we assume standard format or basic split if simple.
          // BUT, our export logic added quotes. So basic split starts efficiently:
          // Let's us a smarter regex split for quotes
          const cols = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
          // Fallback to simple split if regex fails or complicates
          const simpleCols = row.split(",");

          if (simpleCols.length < 4) continue; // Invalid row

          const type = simpleCols[0];
          // We only support importing what we basically expect. 
          // Map index based on header: 
          // 0:type, 1:id, 2:trackingCode, 3:status, 4:category, 5:itemName, 6:desc...

          const newItemRef = doc(collection(db, type === "lost" ? "lostItems" : "foundItems"));

          // Basic fields
          const baseData = {
            status: simpleCols[3] || "searching",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            trackingCode: simpleCols[2] || `IMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            itemName: (simpleCols[5] || "").replace(/^"|"$/g, '').replace(/""/g, '"'),
            description: (simpleCols[6] || "").replace(/^"|"$/g, '').replace(/""/g, '"'),
            category: simpleCols[4] || "other",
          };

          if (type === "lost") {
            batch.set(newItemRef, {
              ...baseData,
              locationLost: (simpleCols[7] || "").replace(/^"|"$/g, ''),
              dateLost: serverTimestamp(), // Default to now if parsing failed
              // contacts: ... (Simplified import)
            });
          } else if (type === "found") {
            batch.set(newItemRef, {
              ...baseData,
              locationFound: (simpleCols[7] || "").replace(/^"|"$/g, ''),
              dateFound: serverTimestamp(),
              // finderContacts: ...
            });
          }

          batchCount++;
          if (batchCount >= BATCH_LIMIT) {
            await batch.commit();
            batchCount = 0;
          }
        }

        if (batchCount > 0) {
          await batch.commit();
        }

        alert("นำเข้าข้อมูลสำเร็จ!");
        // Refresh page or state?
        window.location.reload();

      } catch (error) {
        console.error("Import error:", error);
        alert("เกิดข้อผิดพลาดในการนำเข้า");
      } finally {
        setProcessingData(false);
        event.target.value = "";
      }
    };

    reader.readAsText(file);
  };

  // Delete All Data
  const handleDeleteAll = async () => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบข้อมูลรายการทั้งหมด (ของหายและของเจอ)?")) return;
    if (!confirm("ยืนยันครั้งสุดท้าย: การกระทำนี้ไม่สามารถกู้คืนได้")) return;

    if (processingData) return;
    setProcessingData(true);

    try {
      const batch = writeBatch(db);
      const lostSnapshot = await getDocs(collection(db, "lostItems"));
      const foundSnapshot = await getDocs(collection(db, "foundItems"));

      let count = 0;
      const BATCH_LIMIT = 400;

      // Function to process deletions in chunks
      const deleteChunks = async (docs: any[]) => {
        for (const doc of docs) {
          batch.delete(doc.ref);
          count++;
          if (count >= BATCH_LIMIT) {
            await batch.commit();
            count = 0;
          }
        }
      };

      await deleteChunks(lostSnapshot.docs);
      await deleteChunks(foundSnapshot.docs);

      if (count > 0) {
        await batch.commit();
      }

      alert("ลบข้อมูลสำเร็จ");
      window.location.reload();

    } catch (error) {
      console.error("Delete error:", error);
      alert("ลบข้อมูลล้มเหลว");
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
          จัดการการตั้งค่าระบบ BD2Fondue
        </p>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-4 rounded-xl flex items-center gap-3 animate-fade-in">
          <CheckCircle className="w-5 h-5" />
          <span>บันทึกการตั้งค่าเรียบร้อยแล้ว</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Beta Testing Settings - Full Width */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-line-green-light flex items-center justify-center">
                <Beaker className="w-5 h-5 text-line-green" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">การตั้งค่าระบบ (System Settings)</h2>
                <p className="text-sm text-gray-500">จัดการระบบ Restrict Mode, การขอสิทธิ์ และ SEO</p>
              </div>
            </div>
            <button
              onClick={handleSaveBetaSettings}
              disabled={saving || loadingSettings}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors",
                "bg-line-green text-white hover:bg-line-green-hover",
                (saving || loadingSettings) && "opacity-50 cursor-not-allowed"
              )}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              บันทึก
            </button>
          </div>

          {loadingSettings ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-line-green" />
            </div>
          ) : (
            <div className="p-5 space-y-6">
              {/* Restrict Mode Toggle */}
              <div className="flex items-start justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Restrict Mode (Testing)</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {betaSettings.restrictModeEnabled
                        ? "เปิดอยู่ - เฉพาะผู้ที่ได้รับอนุมัติเท่านั้นที่เข้าใช้ได้"
                        : "ปิดอยู่ - ทุกคนเข้าใช้งานได้"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setBetaSettings({ ...betaSettings, restrictModeEnabled: !betaSettings.restrictModeEnabled })}
                  className={cn(
                    "w-14 h-8 rounded-full transition-colors relative flex-shrink-0",
                    betaSettings.restrictModeEnabled ? "bg-line-green" : "bg-gray-300 dark:bg-gray-600"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform",
                      betaSettings.restrictModeEnabled ? "right-1" : "left-1"
                    )}
                  />
                </button>
              </div>

              {/* Beta Requests Toggle - Only show when Restrict Mode is enabled */}
              {betaSettings.restrictModeEnabled && (
                <>
                  <div className="flex items-start justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">เปิดรับสมัคร Beta Tester</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {betaSettings.betaRequestsEnabled
                            ? "เปิดอยู่ - ผู้ใช้สามารถขอสิทธิ์เข้าใช้ได้"
                            : "ปิดอยู่ - ไม่สามารถขอสิทธิ์ได้ในขณะนี้"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setBetaSettings({ ...betaSettings, betaRequestsEnabled: !betaSettings.betaRequestsEnabled })}
                      className={cn(
                        "w-14 h-8 rounded-full transition-colors relative flex-shrink-0",
                        betaSettings.betaRequestsEnabled ? "bg-line-green" : "bg-gray-300 dark:bg-gray-600"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform",
                          betaSettings.betaRequestsEnabled ? "right-1" : "left-1"
                        )}
                      />
                    </button>
                  </div>

                  {/* Closed Message - Only show when requests are disabled */}
                  {!betaSettings.betaRequestsEnabled && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                      <div className="flex items-center gap-3 mb-3">
                        <MessageSquare className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <h3 className="font-medium text-gray-900 dark:text-white">ข้อความเมื่อปิดรับสมัคร</h3>
                      </div>
                      <textarea
                        value={betaSettings.betaClosedMessage}
                        onChange={(e) => setBetaSettings({ ...betaSettings, betaClosedMessage: e.target.value })}
                        placeholder="กรอกข้อความที่จะแสดงเมื่อปิดรับสมัคร..."
                        rows={3}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-line-green text-gray-900 dark:text-white resize-none"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        ข้อความนี้จะแสดงให้ผู้ใช้เห็นเมื่อไม่สามารถขอสิทธิ์ได้
                      </p>
                    </div>
                  )}
                </>
              )}

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
                      value={betaSettings.ogTitle || ''}
                      onChange={(e) => setBetaSettings({ ...betaSettings, ogTitle: e.target.value })}
                      placeholder="Ex. BD2Fondue | ระบบแจ้งของหาย"
                      className="w-full px-4 py-2 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-line-green"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      รายละเอียด (Description)
                    </label>
                    <textarea
                      value={betaSettings.ogDescription || ''}
                      onChange={(e) => setBetaSettings({ ...betaSettings, ogDescription: e.target.value })}
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
                        {betaSettings.ogImage ? (
                          <Image
                            src={betaSettings.ogImage}
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

              {/* AI Rate Limit Settings */}
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
                      onClick={() => setBetaSettings({ ...betaSettings, aiRateLimitEnabled: !betaSettings.aiRateLimitEnabled })}
                      className={cn(
                        "w-14 h-8 rounded-full transition-colors relative flex-shrink-0",
                        betaSettings.aiRateLimitEnabled ? "bg-line-green" : "bg-gray-300 dark:bg-gray-600"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform",
                          betaSettings.aiRateLimitEnabled ? "right-1" : "left-1"
                        )}
                      />
                    </button>
                  </div>

                  {betaSettings.aiRateLimitEnabled && (
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
                            value={betaSettings.aiRateLimitPerMinute || 5}
                            onChange={(e) => setBetaSettings({ ...betaSettings, aiRateLimitPerMinute: parseInt(e.target.value) || 5 })}
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
                            value={betaSettings.aiRateLimitPerHour || 30}
                            onChange={(e) => setBetaSettings({ ...betaSettings, aiRateLimitPerHour: parseInt(e.target.value) || 30 })}
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
                          value={betaSettings.aiRateLimitMessage || ''}
                          onChange={(e) => setBetaSettings({ ...betaSettings, aiRateLimitMessage: e.target.value })}
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
                            onClick={() => setBetaSettings({ ...betaSettings, systemAiRateLimitEnabled: !betaSettings.systemAiRateLimitEnabled })}
                            className={cn(
                              "w-14 h-8 rounded-full transition-colors relative flex-shrink-0",
                              betaSettings.systemAiRateLimitEnabled ? "bg-line-green" : "bg-gray-300 dark:bg-gray-600"
                            )}
                          >
                            <span
                              className={cn(
                                "absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform",
                                betaSettings.systemAiRateLimitEnabled ? "right-1" : "left-1"
                              )}
                            />
                          </button>
                        </div>

                        {betaSettings.systemAiRateLimitEnabled && (
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
                                  value={betaSettings.systemAiRateLimitPerMinute || 20}
                                  onChange={(e) => setBetaSettings({ ...betaSettings, systemAiRateLimitPerMinute: parseInt(e.target.value) || 20 })}
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
                                  value={betaSettings.systemAiRateLimitPerHour || 100}
                                  onChange={(e) => setBetaSettings({ ...betaSettings, systemAiRateLimitPerHour: parseInt(e.target.value) || 100 })}
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

              {/* Status Indicator */}
              <div className={cn(
                "p-4 rounded-xl flex items-center gap-3",
                betaSettings.restrictModeEnabled
                  ? "bg-amber-50 dark:bg-amber-900/20"
                  : "bg-green-50 dark:bg-green-900/20"
              )}>
                {betaSettings.restrictModeEnabled ? (
                  <>
                    <Lock className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-700 dark:text-amber-400">
                        ระบบอยู่ในโหมด Restrict (Testing)
                      </p>
                      <p className="text-sm text-amber-600 dark:text-amber-500">
                        เฉพาะ Admin และผู้ที่ได้รับอนุมัติเท่านั้นที่เข้าถึงได้
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-400">
                        ระบบเปิดให้ใช้งานทั่วไป
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-500">
                        ทุกคนสามารถเข้าใช้งานได้โดยไม่ต้องขอสิทธิ์
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Admin Users */}
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

        {/* Notification Settings */}
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
                  setSettings({ ...settings, notifyOnNewReport: !settings.notifyOnNewReport })
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
                  setSettings({ ...settings, notifyOnStatusChange: !settings.notifyOnStatusChange })
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
                  setSettings({ ...settings, requireApproval: !settings.requireApproval })
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

        {/* Storage Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
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
                value={settings.autoDeleteDays}
                onChange={(e) =>
                  setSettings({ ...settings, autoDeleteDays: parseInt(e.target.value) || 0 })
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
                value={settings.maxImageSize}
                onChange={(e) =>
                  setSettings({ ...settings, maxImageSize: parseInt(e.target.value) || 1 })
                }
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06C755] text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">
                คุณภาพการบีบอัด ({Math.round(settings.compressionQuality * 100)}%)
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={settings.compressionQuality}
                onChange={(e) =>
                  setSettings({ ...settings, compressionQuality: parseFloat(e.target.value) })
                }
                className="w-full accent-[#06C755]"
              />
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
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
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-[#06C755] text-white rounded-xl font-medium hover:bg-[#05b34d] transition-colors"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          บันทึกการตั้งค่า
        </button>
      </div>

      {/* Firebase Rules Info */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-700 dark:text-yellow-400">
              อย่าลืมตั้งค่า Firebase Rules!
            </p>
            <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">
              ดูไฟล์ <code className="bg-yellow-100 dark:bg-yellow-900/50 px-1 rounded">docs/firestore-rules.txt</code> และ{" "}
              <code className="bg-yellow-100 dark:bg-yellow-900/50 px-1 rounded">docs/storage-rules.txt</code> แล้วก็อปไปวางใน Firebase Console
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
