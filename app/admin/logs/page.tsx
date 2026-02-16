"use client";

// Force dynamic rendering for security
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Filter,
  Calendar,
  User,
  Package,
  Loader2,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2,
  Edit,
  Eye,
} from "lucide-react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
  Timestamp,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn, formatThaiDate } from "@/lib/utils";

// Types
interface ActivityLog {
  id: string;
  action: string;
  actionType: "create" | "update" | "delete" | "view" | "login" | "logout";
  targetType: "lostItem" | "foundItem" | "category" | "location" | "user" | "system";
  targetId?: string;
  targetName?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: any;
}

// Action icons
const ACTION_ICONS: Record<string, any> = {
  create: { icon: Package, color: "text-green-500", bg: "bg-green-100 dark:bg-green-900/30" },
  update: { icon: Edit, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30" },
  delete: { icon: Trash2, color: "text-red-500", bg: "bg-red-100 dark:bg-red-900/30" },
  view: { icon: Eye, color: "text-gray-500", bg: "bg-gray-100 dark:bg-gray-700" },
  login: { icon: User, color: "text-[#06C755]", bg: "bg-[#e8f8ef] dark:bg-[#06C755]/20" },
  logout: { icon: User, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/30" },
};

// Action labels
const ACTION_LABELS: Record<string, string> = {
  create: "สร้าง",
  update: "แก้ไข",
  delete: "ลบ",
  view: "ดู",
  login: "เข้าสู่ระบบ",
  logout: "ออกจากระบบ",
};

// Target labels
const TARGET_LABELS: Record<string, string> = {
  lostItem: "ของหาย",
  foundItem: "ของเจอ",
  category: "หมวดหมู่",
  location: "สถานที่",
  user: "ผู้ใช้",
  system: "ระบบ",
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [targetFilter, setTargetFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "all">("all");

  // Load logs
  useEffect(() => {
    let q = query(
      collection(db, "activityLogs"),
      orderBy("createdAt", "desc"),
      limit(200)
    );

    // Apply date filter
    if (dateRange !== "all") {
      const now = new Date();
      let startDate: Date;

      switch (dateRange) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }

      q = query(
        collection(db, "activityLogs"),
        where("createdAt", ">=", Timestamp.fromDate(startDate)),
        orderBy("createdAt", "desc"),
        limit(200)
      );
    }

    const unsub = onSnapshot(q, (snapshot) => {
      const logsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ActivityLog[];
      setLogs(logsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching logs:", error);
      // If collection doesn't exist, just show empty
      setLogs([]);
      setLoading(false);
    });

    return () => unsub();
  }, [dateRange]);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.action?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (log.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (log.targetName?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    const matchesAction = actionFilter === "all" || log.actionType === actionFilter;
    const matchesTarget = targetFilter === "all" || log.targetType === targetFilter;
    return matchesSearch && matchesAction && matchesTarget;
  });

  // Helper function to add sample logs
  const addSampleLogs = async () => {
    const sampleLogs = [
      {
        action: "แจ้งของหาย: กระเป๋าสตางค์",
        actionType: "create",
        targetType: "lostItem",
        targetId: "sample-1",
        targetName: "กระเป๋าสตางค์",
        userEmail: "student@school.ac.th",
        userName: "นักเรียนตัวอย่าง",
      },
      {
        action: "แจ้งเจอของ: โทรศัพท์ iPhone",
        actionType: "create",
        targetType: "foundItem",
        targetId: "sample-2",
        targetName: "โทรศัพท์ iPhone",
        userEmail: "finder@school.ac.th",
        userName: "ผู้พบของ",
      },
      {
        action: "อัปเดตสถานะเป็น 'รับคืนแล้ว'",
        actionType: "update",
        targetType: "lostItem",
        targetId: "sample-1",
        targetName: "กระเป๋าสตางค์",
        userEmail: "admin@school.ac.th",
        userName: "แอดมิน",
      },
    ];

    for (const log of sampleLogs) {
      await addDoc(collection(db, "activityLogs"), {
        ...log,
        createdAt: serverTimestamp(),
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#06C755]" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Logs</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            ประวัติการใช้งานและกิจกรรมในระบบ
          </p>
        </div>
        {logs.length === 0 && (
          <button
            onClick={addSampleLogs}
            className="px-4 py-2 bg-[#06C755] text-white rounded-xl font-medium hover:bg-[#05b34d] transition-colors"
          >
            เพิ่ม Log ตัวอย่าง
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหา..."
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06C755] text-gray-900 dark:text-white"
          />
        </div>

        {/* Date Range */}
        <div className="relative">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="pl-12 pr-8 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06C755] text-gray-900 dark:text-white appearance-none min-w-[140px]"
          >
            <option value="all">ทั้งหมด</option>
            <option value="today">วันนี้</option>
            <option value="week">7 วันล่าสุด</option>
            <option value="month">30 วันล่าสุด</option>
          </select>
        </div>

        {/* Action Filter */}
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06C755] text-gray-900 dark:text-white appearance-none min-w-[130px]"
        >
          <option value="all">ทุกการกระทำ</option>
          <option value="create">สร้าง</option>
          <option value="update">แก้ไข</option>
          <option value="delete">ลบ</option>
          <option value="login">เข้าสู่ระบบ</option>
        </select>

        {/* Target Filter */}
        <select
          value={targetFilter}
          onChange={(e) => setTargetFilter(e.target.value)}
          className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06C755] text-gray-900 dark:text-white appearance-none min-w-[130px]"
        >
          <option value="all">ทุกประเภท</option>
          <option value="lostItem">ของหาย</option>
          <option value="foundItem">ของเจอ</option>
          <option value="category">หมวดหมู่</option>
          <option value="user">ผู้ใช้</option>
        </select>
      </div>

      {/* Logs List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {logs.length === 0 ? "ยังไม่มีบันทึกกิจกรรม" : "ไม่พบรายการที่ค้นหา"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredLogs.map((log) => {
              const actionConfig = ACTION_ICONS[log.actionType] || ACTION_ICONS.view;
              const Icon = actionConfig.icon;

              return (
                <div
                  key={log.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                        actionConfig.bg
                      )}
                    >
                      <Icon className={cn("w-5 h-5", actionConfig.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {log.action}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
                        {log.userEmail && (
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {log.userName || log.userEmail}
                          </span>
                        )}
                        {log.targetType && (
                          <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs">
                            {TARGET_LABELS[log.targetType] || log.targetType}
                          </span>
                        )}
                        {log.details && (
                          <span className="text-gray-400">{log.details}</span>
                        )}
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="text-right flex-shrink-0">
                      <span
                        className={cn(
                          "inline-block px-2.5 py-1 rounded-full text-xs font-medium",
                          actionConfig.bg,
                          actionConfig.color
                        )}
                      >
                        {ACTION_LABELS[log.actionType] || log.actionType}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">
                        {log.createdAt
                          ? formatThaiDate(log.createdAt.toDate())
                          : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          แสดง {filteredLogs.length} รายการ จากทั้งหมด {logs.length} รายการ
        </p>
      </div>
    </div>
  );
}
