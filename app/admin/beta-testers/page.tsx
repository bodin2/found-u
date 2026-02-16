"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Search,
  UserCheck,
  UserX,
  RefreshCw,
} from "lucide-react";
import { getAllUsers, approveBetaTester, rejectBetaTester } from "@/lib/firestore";
import type { AppUser, BetaStatus } from "@/lib/types";
import { cn, formatThaiDate } from "@/lib/utils";

const BETA_STATUS_CONFIG: Record<BetaStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  none: {
    label: "ไม่ได้ขอ",
    color: "text-gray-500",
    bgColor: "bg-gray-100 dark:bg-gray-700",
    icon: <Users className="w-4 h-4" />,
  },
  pending: {
    label: "รอการอนุมัติ",
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    icon: <Clock className="w-4 h-4" />,
  },
  approved: {
    label: "อนุมัติแล้ว",
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    icon: <CheckCircle className="w-4 h-4" />,
  },
  rejected: {
    label: "ปฏิเสธ",
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    icon: <XCircle className="w-4 h-4" />,
  },
};

export default function BetaTestersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<BetaStatus | "all">("all");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApprove = async (uid: string) => {
    setActionLoading(uid);
    try {
      await approveBetaTester(uid);
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, betaStatus: "approved" as BetaStatus } : u))
      );
    } catch (error) {
      console.error("Error approving user:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (uid: string) => {
    setActionLoading(uid);
    try {
      await rejectBetaTester(uid);
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, betaStatus: "rejected" as BetaStatus } : u))
      );
    } catch (error) {
      console.error("Error rejecting user:", error);
    } finally {
      setActionLoading(null);
    }
  };

  // Filter and search users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === "all" || user.betaStatus === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Stats
  const stats = {
    total: users.length,
    pending: users.filter((u) => u.betaStatus === "pending").length,
    approved: users.filter((u) => u.betaStatus === "approved" || u.role === "admin").length,
    rejected: users.filter((u) => u.betaStatus === "rejected").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-line-green" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Beta Testers</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            จัดการผู้ใช้งานในช่วง Beta Testing
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <Users className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              <p className="text-xs text-gray-500">ผู้ใช้ทั้งหมด</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
              <p className="text-xs text-gray-500">รอการอนุมัติ</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              <p className="text-xs text-gray-500">อนุมัติแล้ว</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              <p className="text-xs text-gray-500">ปฏิเสธ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อหรืออีเมล..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-line-green/50"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as BetaStatus | "all")}
          className="px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-line-green/50"
        >
          <option value="all">ทั้งหมด</option>
          <option value="pending">รอการอนุมัติ</option>
          <option value="approved">อนุมัติแล้ว</option>
          <option value="rejected">ปฏิเสธ</option>
          <option value="none">ไม่ได้ขอ</option>
        </select>
      </div>

      {/* Users List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredUsers.map((user) => (
              <div
                key={user.uid}
                className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden flex-shrink-0">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Users className="w-6 h-6" />
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {user.displayName}
                    </p>
                    {user.role === "admin" && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  {user.betaRequestedAt && (
                    <p className="text-xs text-gray-400 mt-1">
                      ขอสิทธิ์เมื่อ: {formatThaiDate(user.betaRequestedAt)}
                    </p>
                  )}
                </div>

                {/* Status Badge */}
                <div
                  className={cn(
                    "hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
                    BETA_STATUS_CONFIG[user.betaStatus || "none"].bgColor,
                    BETA_STATUS_CONFIG[user.betaStatus || "none"].color
                  )}
                >
                  {BETA_STATUS_CONFIG[user.betaStatus || "none"].icon}
                  {BETA_STATUS_CONFIG[user.betaStatus || "none"].label}
                </div>

                {/* Actions */}
                {user.role !== "admin" && (
                  <div className="flex items-center gap-2">
                    {actionLoading === user.uid ? (
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    ) : (
                      <>
                        {user.betaStatus !== "approved" && (
                          <button
                            onClick={() => handleApprove(user.uid)}
                            className="p-2 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                            title="อนุมัติ"
                          >
                            <UserCheck className="w-5 h-5" />
                          </button>
                        )}
                        {user.betaStatus !== "rejected" && user.betaStatus !== "none" && (
                          <button
                            onClick={() => handleReject(user.uid)}
                            className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                            title="ปฏิเสธ"
                          >
                            <UserX className="w-5 h-5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
