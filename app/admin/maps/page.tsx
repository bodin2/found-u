"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { MapPin, Save, Loader2, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { getAppSettings, updateAppSettings } from "@/lib/database";
import { normalizeGeoPolygon } from "@/lib/utils";
import type { AppSettings } from "@/lib/types";
import { DEFAULT_APP_SETTINGS } from "@/lib/types";
import MapSettingsPanel from "@/components/admin/map-settings-panel";
import { useAppDialog } from "@/hooks/use-app-dialog";

export default function AdminMapsPage() {
  const { user } = useAuth();
  const { showAlert, dialog } = useAppDialog();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const loaded = await getAppSettings();
        setSettings({
          ...loaded,
          mapSchoolBoundary: normalizeGeoPolygon(loaded.mapSchoolBoundary),
        });
      } catch (error) {
        console.error("Error loading map settings:", error);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const handleSave = async () => {
    if (!user?.uid) return;

    setSaving(true);
    try {
      await updateAppSettings(
        {
          mapsEnabled: settings.mapsEnabled,
          mapTileUrl: settings.mapTileUrl,
          mapAttribution: settings.mapAttribution,
          mapDefaultCenter: settings.mapDefaultCenter,
          mapDefaultZoom: settings.mapDefaultZoom,
          mapEnforceFoundInSchool: settings.mapEnforceFoundInSchool,
          mapSchoolBoundary: normalizeGeoPolygon(settings.mapSchoolBoundary),
        },
        user.uid
      );
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving map settings:", error);
      void showAlert({
        title: "บันทึกไม่สำเร็จ",
        message: "กรุณาตรวจสอบสิทธิ์ Admin และการเชื่อมต่อ Firebase",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {dialog}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">แผนที่และ GPS</h1>
            <p className="text-sm text-gray-500">
              ตั้งค่าแผนที่ ขอบเขตโรงเรียน และการบังคับใช้ GPS สำหรับแจ้งเจอของ
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || loading}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#06C755] text-white rounded-xl font-medium hover:bg-[#05b34d] disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : showSuccess ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {saving ? "กำลังบันทึก..." : showSuccess ? "บันทึกแล้ว" : "บันทึกการตั้งค่า"}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#06C755]" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 lg:p-6 overflow-hidden">
          <MapSettingsPanel settings={settings} onChange={setSettings} />
        </div>
      )}
    </div>
  );
}
