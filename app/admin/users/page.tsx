"use client";

// Force dynamic rendering for security
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import {
  Users,
  Search,
  Ban,
  Clock,
  CheckCircle,
  Shield,
  Loader2,
  RefreshCw,
  UserX,
  UserCheck,
  AlertTriangle,
  X,
} from "lucide-react";
import { 
  getAllUsers, 
  banUser, 
  unbanUser, 
  timeoutUser,
  isUserBanned,
  getTimeoutRemaining,
} from "@/lib/firestore";
import { logUserBanned, logUserUnbanned, logUserTimeout } from "@/lib/logger";
import { useAuth } from "@/contexts/auth-context";
import type { AppUser, BanStatus } from "@/lib/types";
import { cn, formatThaiDate } from "@/lib/utils";

const BAN_STATUS_CONFIG: Record<BanStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  none: {
    label: "ปกติ",
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    icon: <CheckCircle className="w-4 h-4" />,
  },
  timeout: {
    label: "Timeout",
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    icon: <Clock className="w-4 h-4" />,
  },
  banned: {
    label: "ถูกแบน",
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    icon: <Ban className="w-4 h-4" />,
  },
};

const TIMEOUT_OPTIONS = [
  { value: 5, label: "5 นาที" },
  { value: 15, label: "15 นาที" },
  { value: 30, label: "30 นาที" },
  { value: 60, label: "1 ชั่วโมง" },
  { value: 180, label: "3 ชั่วโมง" },
  { value: 360, label: "6 ชั่วโมง" },
  { value: 720, label: "12 ชั่วโมง" },
  { value: 1440, label: "1 วัน" },
  { value: 4320, label: "3 วัน" },
  { value: 10080, label: "7 วัน" },
];

export default function AdminUsersPage() {
  const { appUser: adminUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<BanStatus | "all">("all");

  // Modal states
  const [showBanModal, setShowBanModal] = useState(false);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [banReason, setBanReason] = useState("");
  const [timeoutDuration, setTimeoutDuration] = useState(60);

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

  // Open Ban Modal
  const openBanModal = (user: AppUser) => {
    setSelectedUser(user);
    setBanReason("");
    setShowBanModal(true);
  };

  // Open Timeout Modal
  const openTimeoutModal = (user: AppUser) => {
    setSelectedUser(user);
    setBanReason("");
    setTimeoutDuration(60);
    setShowTimeoutModal(true);
  };

  // Handle Ban
  const handleBan = async () => {
    if (!selectedUser || !banReason.trim()) return;
    
    setActionLoading(selectedUser.uid);
    try {
      await banUser(selectedUser.uid, banReason, adminUser?.uid || "");
      await logUserBanned(
        selectedUser.uid,
        selectedUser.email,
        banReason,
        adminUser?.email
      );
      
      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === selectedUser.uid
            ? { ...u, banStatus: "banned" as BanStatus, banReason }
            : u
        )
      );
      
      setShowBanModal(false);
      setSelectedUser(null);
      setBanReason("");
    } catch (error) {
      console.error("Error banning user:", error);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Timeout
  const handleTimeout = async () => {
    if (!selectedUser || !banReason.trim()) return;
    
    setActionLoading(selectedUser.uid);
    try {
      await timeoutUser(
        selectedUser.uid,
        timeoutDuration,
        banReason,
        adminUser?.uid || ""
      );
      
      const durationLabel = TIMEOUT_OPTIONS.find(o => o.value === timeoutDuration)?.label || `${timeoutDuration} นาที`;
      await logUserTimeout(
        selectedUser.uid,
        selectedUser.email,
        durationLabel,
        banReason,
        adminUser?.email
      );
      
      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === selectedUser.uid
            ? { ...u, banStatus: "timeout" as BanStatus, banReason }
            : u
        )
      );
      
      setShowTimeoutModal(false);
      setSelectedUser(null);
      setBanReason("");
    } catch (error) {
      console.error("Error timing out user:", error);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Unban
  const handleUnban = async (user: AppUser) => {
    setActionLoading(user.uid);
    try {
      await unbanUser(user.uid);
      await logUserUnbanned(user.uid, user.email, adminUser?.email);
      
      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === user.uid
            ? { ...u, banStatus: "none" as BanStatus, banReason: undefined }
            : u
        )
      );
    } catch (error) {
      console.error("Error unbanning user:", error);
    } finally {
      setActionLoading(null);
    }
  };

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const userBanStatus = user.banStatus || "none";
    const matchesFilter = filterStatus === "all" || userBanStatus === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  // Stats
  const stats = {
    total: users.length,
    normal: users.filter((u) => !u.banStatus || u.banStatus === "none").length,
    timeout: users.filter((u) => u.banStatus === "timeout").length,
    banned: users.filter((u) => u.banStatus === "banned").length,
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">จัดการผู้ใช้</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Ban และ Timeout ผู้ใช้งาน
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
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.normal}</p>
              <p className="text-xs text-gray-500">ปกติ</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.timeout}</p>
              <p className="text-xs text-gray-500">Timeout</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Ban className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.banned}</p>
              <p className="text-xs text-gray-500">ถูกแบน</p>
            </div>
          </div>
        </div>
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
            placeholder="ค้นหาชื่อหรืออีเมล..."
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06C755] text-gray-900 dark:text-white"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
          {(["all", "none", "timeout", "banned"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors",
                filterStatus === status
                  ? "bg-[#06C755] text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              )}
            >
              {status === "all"
                ? "ทั้งหมด"
                : BAN_STATUS_CONFIG[status].label}
            </button>
          ))}
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery || filterStatus !== "all"
                ? "ไม่พบผู้ใช้ที่ค้นหา"
                : "ยังไม่มีผู้ใช้ในระบบ"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredUsers.map((user) => {
              const banStatus = user.banStatus || "none";
              const config = BAN_STATUS_CONFIG[banStatus];
              const isBannedOrTimeout = isUserBanned(user);
              const remainingMinutes = getTimeoutRemaining(user);
              const isCurrentlyLoading = actionLoading === user.uid;
              const isAdmin = user.role === "admin";

              return (
                <div
                  key={user.uid}
                  className="p-4 flex flex-col lg:flex-row lg:items-center gap-4"
                >
                  {/* User Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <img
                      src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=06C755&color=fff`}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {user.displayName}
                        </p>
                        {isAdmin && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>

                  {/* Ban Status */}
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
                        config.bgColor,
                        config.color
                      )}
                    >
                      {config.icon}
                      {config.label}
                    </span>

                    {/* Timeout Remaining */}
                    {banStatus === "timeout" && remainingMinutes > 0 && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        ({remainingMinutes < 60
                          ? `${remainingMinutes} นาที`
                          : `${Math.floor(remainingMinutes / 60)} ชม.`} เหลือ)
                      </span>
                    )}
                  </div>

                  {/* Ban Reason */}
                  {user.banReason && isBannedOrTimeout && (
                    <div className="lg:max-w-[200px]">
                      <p className="text-xs text-gray-500 truncate" title={user.banReason}>
                        เหตุผล: {user.banReason}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {isCurrentlyLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    ) : isAdmin ? (
                      <span className="text-xs text-gray-400">ไม่สามารถแบน Admin ได้</span>
                    ) : isBannedOrTimeout ? (
                      <button
                        onClick={() => handleUnban(user)}
                        className="px-4 py-2 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 font-medium text-sm hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors flex items-center gap-2"
                      >
                        <UserCheck className="w-4 h-4" />
                        ปลดแบน
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => openTimeoutModal(user)}
                          className="px-4 py-2 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 font-medium text-sm hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors flex items-center gap-2"
                        >
                          <Clock className="w-4 h-4" />
                          Timeout
                        </button>
                        <button
                          onClick={() => openBanModal(user)}
                          className="px-4 py-2 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 font-medium text-sm hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-2"
                        >
                          <Ban className="w-4 h-4" />
                          แบน
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ban Modal */}
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowBanModal(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <button
              onClick={() => setShowBanModal(false)}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Ban className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  แบนผู้ใช้
                </h2>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 mb-6">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">
                  การแบนถาวรจะทำให้ผู้ใช้ไม่สามารถเข้าใช้งานระบบได้จนกว่าจะปลดแบน
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                เหตุผลในการแบน *
              </label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="ระบุเหตุผลในการแบนผู้ใช้..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBanModal(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleBan}
                disabled={!banReason.trim() || actionLoading === selectedUser.uid}
                className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {actionLoading === selectedUser.uid ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Ban className="w-5 h-5" />
                    แบนผู้ใช้
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeout Modal */}
      {showTimeoutModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowTimeoutModal(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <button
              onClick={() => setShowTimeoutModal(false)}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Timeout ผู้ใช้
                </h2>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ระยะเวลา Timeout
              </label>
              <select
                value={timeoutDuration}
                onChange={(e) => setTimeoutDuration(Number(e.target.value))}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white"
              >
                {TIMEOUT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                เหตุผลในการ Timeout *
              </label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="ระบุเหตุผลในการ Timeout..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowTimeoutModal(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleTimeout}
                disabled={!banReason.trim() || actionLoading === selectedUser.uid}
                className="flex-1 px-4 py-3 rounded-xl bg-amber-600 text-white font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {actionLoading === selectedUser.uid ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Clock className="w-5 h-5" />
                    Timeout
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
