"use client";

// Force dynamic rendering for security
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Sliders, Activity, ArrowRight, Loader2 } from "lucide-react";
import { getAppSettings } from "@/lib/database";
import { DEFAULT_APP_SETTINGS, type AppSettings } from "@/lib/types";

export default function AdminAIPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getAppSettings()
      .then((data) => {
        if (mounted) setSettings(data);
      })
      .catch((error) => {
        console.error("Error loading AI settings:", error);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Bot className="w-6 h-6 text-[#06C755]" />
          AI Center
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          จัดการโมเดล AI และทดสอบการเชื่อมต่อระบบ
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/admin/ai/models"
          className="bg-bg-primary dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:border-[#06C755]/40 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#06C755]/10 flex items-center justify-center">
                <Sliders className="w-5 h-5 text-[#06C755]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  ตั้งค่าโมเดล
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  เลือกโมเดลและปรับค่า generation
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        </Link>

        <Link
          href="/admin/ai/tests"
          className="bg-bg-primary dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:border-[#06C755]/40 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  ทดสอบ AI
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ตรวจสอบความเร็วและผลลัพธ์
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        </Link>
      </div>

      <div className="bg-bg-primary dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-[#06C755]" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            โมเดลที่ใช้งานอยู่
          </h2>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl bg-bg-secondary dark:bg-gray-700/40 p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">NER Model</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
              {loading ? (
                <span className="inline-flex items-center gap-2 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังโหลด
                </span>
              ) : (
                settings.aiNerModel || "-"
              )}
            </div>
          </div>
          <div className="rounded-xl bg-bg-secondary dark:bg-gray-700/40 p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">Matching Model</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
              {loading ? (
                <span className="inline-flex items-center gap-2 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังโหลด
                </span>
              ) : (
                settings.aiMatchingModel || "-"
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
