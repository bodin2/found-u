"use client";

// Force dynamic rendering for security
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Search,
  Filter,
  Calendar,
  CheckCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Bug,
  Server,
  Globe,
  Database,
  HelpCircle,
} from "lucide-react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { resolveError } from "@/lib/logger";
import { useAuth } from "@/contexts/auth-context";
import type { ErrorSeverity, ErrorSource } from "@/lib/types";
import { cn, formatThaiDate, formatTime } from "@/lib/utils";

// Types
interface ErrorLogItem {
  id: string;
  message: string;
  stack?: string;
  severity: ErrorSeverity;
  source: ErrorSource;
  url?: string;
  userId?: string;
  userEmail?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  resolved: boolean;
  resolvedAt?: any;
  resolvedBy?: string;
  createdAt: any;
}

// Severity config
const SEVERITY_CONFIG: Record<ErrorSeverity, { label: string; color: string; bgColor: string }> = {
  low: {
    label: "ต่ำ",
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-700",
  },
  medium: {
    label: "ปานกลาง",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  high: {
    label: "สูง",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
  critical: {
    label: "วิกฤติ",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
};

// Source config
const SOURCE_CONFIG: Record<ErrorSource, { label: string; icon: React.ReactNode }> = {
  client: { label: "Client", icon: <Globe className="w-4 h-4" /> },
  server: { label: "Server", icon: <Server className="w-4 h-4" /> },
  api: { label: "API", icon: <Bug className="w-4 h-4" /> },
  firebase: { label: "Firebase", icon: <Database className="w-4 h-4" /> },
  unknown: { label: "ไม่ทราบ", icon: <HelpCircle className="w-4 h-4" /> },
};

export default function AdminErrorLogsPage() {
  const { appUser } = useAuth();
  const [errors, setErrors] = useState<ErrorLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<ErrorSeverity | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<ErrorSource | "all">("all");
  const [showResolved, setShowResolved] = useState(false);
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "all">("week");
  const [expandedError, setExpandedError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  // Load errors
  useEffect(() => {
    let constraints: any[] = [orderBy("createdAt", "desc"), limit(500)];

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

      constraints = [
        where("createdAt", ">=", Timestamp.fromDate(startDate)),
        orderBy("createdAt", "desc"),
        limit(500),
      ];
    }

    const q = query(collection(db, "errorLogs"), ...constraints);

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const errorsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ErrorLogItem[];
        setErrors(errorsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching error logs:", error);
        setErrors([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [dateRange]);

  // Handle resolve
  const handleResolve = async (errorId: string) => {
    if (!appUser) return;
    
    setResolving(errorId);
    try {
      await resolveError(errorId, appUser.email);
      // Will be updated via snapshot
    } catch (error) {
      console.error("Error resolving:", error);
    } finally {
      setResolving(null);
    }
  };

  // Filter errors
  const filteredErrors = errors.filter((error) => {
    const matchesSearch =
      error.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (error.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (error.url?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    const matchesSeverity = severityFilter === "all" || error.severity === severityFilter;
    const matchesSource = sourceFilter === "all" || error.source === sourceFilter;
    const matchesResolved = showResolved || !error.resolved;
    return matchesSearch && matchesSeverity && matchesSource && matchesResolved;
  });

  // Stats
  const stats = {
    total: errors.filter((e) => !e.resolved).length,
    critical: errors.filter((e) => e.severity === "critical" && !e.resolved).length,
    high: errors.filter((e) => e.severity === "high" && !e.resolved).length,
    resolved: errors.filter((e) => e.resolved).length,
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Error Logs</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            ติดตามและจัดการ Errors ในระบบ
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              <p className="text-xs text-gray-500">Errors ทั้งหมด</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.critical}</p>
              <p className="text-xs text-gray-500">วิกฤติ</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.high}</p>
              <p className="text-xs text-gray-500">สูง</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.resolved}</p>
              <p className="text-xs text-gray-500">แก้ไขแล้ว</p>
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
            placeholder="ค้นหา error, email, url..."
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
            <option value="today">วันนี้</option>
            <option value="week">7 วันล่าสุด</option>
            <option value="month">30 วันล่าสุด</option>
            <option value="all">ทั้งหมด</option>
          </select>
        </div>

        {/* Severity Filter */}
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as any)}
          className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06C755] text-gray-900 dark:text-white"
        >
          <option value="all">ทุกระดับ</option>
          <option value="critical">วิกฤติ</option>
          <option value="high">สูง</option>
          <option value="medium">ปานกลาง</option>
          <option value="low">ต่ำ</option>
        </select>

        {/* Source Filter */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as any)}
          className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06C755] text-gray-900 dark:text-white"
        >
          <option value="all">ทุกแหล่ง</option>
          <option value="client">Client</option>
          <option value="server">Server</option>
          <option value="api">API</option>
          <option value="firebase">Firebase</option>
        </select>

        {/* Show Resolved Toggle */}
        <button
          onClick={() => setShowResolved(!showResolved)}
          className={cn(
            "px-4 py-3 rounded-xl font-medium text-sm whitespace-nowrap transition-colors",
            showResolved
              ? "bg-[#06C755] text-white"
              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
          )}
        >
          {showResolved ? "ซ่อน Resolved" : "แสดง Resolved"}
        </button>
      </div>

      {/* Errors List */}
      <div className="space-y-4">
        {filteredErrors.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center shadow-sm">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery || severityFilter !== "all" || sourceFilter !== "all"
                ? "ไม่พบ Error ที่ค้นหา"
                : "ไม่มี Error ในช่วงเวลานี้ 🎉"}
            </p>
          </div>
        ) : (
          filteredErrors.map((error) => {
            const severityConfig = SEVERITY_CONFIG[error.severity];
            const sourceConfig = SOURCE_CONFIG[error.source];
            const isExpanded = expandedError === error.id;
            const createdAt = error.createdAt?.toDate?.() || new Date();

            return (
              <div
                key={error.id}
                className={cn(
                  "bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden",
                  error.resolved && "opacity-60"
                )}
              >
                {/* Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  onClick={() => setExpandedError(isExpanded ? null : error.id)}
                >
                  <div className="flex items-start gap-4">
                    {/* Severity Indicator */}
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                        severityConfig.bgColor
                      )}
                    >
                      <AlertTriangle className={cn("w-5 h-5", severityConfig.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            severityConfig.bgColor,
                            severityConfig.color
                          )}
                        >
                          {severityConfig.label}
                        </span>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          {sourceConfig.icon}
                          {sourceConfig.label}
                        </span>
                        {error.resolved && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 dark:bg-green-900/30 text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            แก้ไขแล้ว
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {error.message}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span>{formatThaiDate(createdAt)} {formatTime(createdAt)}</span>
                        {error.userEmail && <span>{error.userEmail}</span>}
                        {error.url && (
                          <span className="truncate max-w-[200px]">{error.url}</span>
                        )}
                      </div>
                    </div>

                    {/* Expand/Collapse */}
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-700 p-4 space-y-4">
                    {/* Stack Trace */}
                    {error.stack && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Stack Trace:
                        </p>
                        <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 text-xs overflow-x-auto">
                          {error.stack}
                        </pre>
                      </div>
                    )}

                    {/* URL */}
                    {error.url && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          URL:
                        </p>
                        <p className="text-sm text-gray-500 break-all">{error.url}</p>
                      </div>
                    )}

                    {/* User Agent */}
                    {error.userAgent && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          User Agent:
                        </p>
                        <p className="text-sm text-gray-500 break-all">{error.userAgent}</p>
                      </div>
                    )}

                    {/* Metadata */}
                    {error.metadata && Object.keys(error.metadata).length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Metadata:
                        </p>
                        <pre className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 text-xs overflow-x-auto text-gray-700 dark:text-gray-300">
                          {JSON.stringify(error.metadata, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Resolved Info */}
                    {error.resolved && error.resolvedBy && (
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
                        <p className="text-sm text-green-600">
                          แก้ไขโดย: {error.resolvedBy}
                          {error.resolvedAt && (
                            <span className="ml-2">
                              เมื่อ {formatThaiDate(error.resolvedAt.toDate())}
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    {!error.resolved && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleResolve(error.id)}
                          disabled={resolving === error.id}
                          className="px-4 py-2 rounded-xl bg-green-600 text-white font-medium text-sm hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {resolving === error.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          ทำเครื่องหมายว่าแก้ไขแล้ว
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
