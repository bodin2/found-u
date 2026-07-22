"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Radio, Plus, Tags, Search } from "lucide-react";
import Header from "@/components/layout/header";
import BottomNav from "@/components/layout/bottom-nav";
import AppShell from "@/components/layout/app-shell";
import { useAuth } from "@/contexts/auth-context";
import LoginPrompt from "@/components/auth/login-prompt";
import { fetchMyNfcDashboardApi } from "@/lib/nfc-api";

const actions = [
  {
    href: "/nfc/register",
    icon: Plus,
    title: "ลงทะเบียน Tag",
    subtitle: "ผูก NFC กับของของคุณ",
    color: "bg-line-green-light",
    iconColor: "text-line-green",
  },
  {
    href: "/nfc/my-tags",
    icon: Tags,
    title: "แท็กของฉัน",
    subtitle: "จัดการและดูข้อความจากผู้พบ",
    color: "bg-status-info-light",
    iconColor: "text-status-info",
  },
  {
    href: "/nfc/found",
    icon: Search,
    title: "แจ้งพบของ (NFC)",
    subtitle: "สแกนแท็กที่ติดอยู่กับของ",
    color: "bg-status-warning-light",
    iconColor: "text-amber-600",
  },
];

export default function NfcHubPage() {
  const { user, loading: authLoading, appSettings } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user?.uid || appSettings.nfcEnabled === false) return;
    let cancelled = false;
    void fetchMyNfcDashboardApi()
      .then((data) => {
        if (!cancelled) {
          setPendingCount(data.reports.filter((r) => r.status === "pending").length);
        }
      })
      .catch(() => {
        if (!cancelled) setPendingCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid, appSettings.nfcEnabled]);

  if (authLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] dark:bg-[#0a0a0a]">
        <div className="w-8 h-8 border-2 border-[#06C755] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <Header title="NFC Tag" showBack />
        <LoginPrompt returnTo="/nfc" />
        <BottomNav />
      </AppShell>
    );
  }

  if (appSettings.nfcEnabled === false) {
    return (
      <AppShell>
        <Header title="NFC Tag" showBack />
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
      <Header title="NFC Tag" showBack />
      <main className="px-4 py-6 pb-28 space-y-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-2">
            <Radio className="w-8 h-8 text-[#06C755]" />
            <div>
              <h1 className="font-bold text-lg">ระบบ NFC Tag</h1>
              <p className="text-sm text-gray-500">NFC Tag system</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ติดแท็ก NFC บนของสำคัญ เมื่อมีคนพบจะแจ้งถึงคุณผ่านแอปได้ทันที
          </p>
          {pendingCount > 0 && (
            <p className="mt-3 text-sm font-medium text-amber-700 dark:text-amber-300">
              มีข้อความจากผู้พบรออ่าน {pendingCount} รายการ
            </p>
          )}
        </div>

        {actions.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow"
          >
            <div className={`p-3 rounded-xl ${item.color} relative`}>
              <item.icon className={`w-6 h-6 ${item.iconColor}`} />
              {item.href === "/nfc/my-tags" && pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{item.title}</p>
              <p className="text-sm text-gray-500">{item.subtitle}</p>
            </div>
          </Link>
        ))}
      </main>
      <BottomNav />
    </AppShell>
  );
}
