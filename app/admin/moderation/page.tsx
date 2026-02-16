"use client";

// Force dynamic rendering for security
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import {
  Shield,
  Search,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  AlertTriangle,
  Loader2,
  Filter,
  ThumbsUp,
  ThumbsDown,
  Flag,
  MessageSquare,
} from "lucide-react";
import Image from "next/image";
import {
  subscribeToLostItems,
  subscribeToFoundItems,
  updateLostItem,
  updateFoundItem,
  deleteLostItem,
  deleteFoundItem,
  timestampToDate,
  getCategories,
  getLocations,
} from "@/lib/firestore";
import { STATUS_CONFIG, type LostItem, type FoundItem, type ItemStatus } from "@/lib/types";
import type { CategoryConfig, LocationConfig } from "@/lib/firestore";
import { cn, formatThaiDate } from "@/lib/utils";

export default function AdminModerationPage() {
  const [lostItems, setLostItems] = useState<LostItem[]>([]);
  const [foundItems, setFoundItems] = useState<FoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<LostItem | FoundItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "flagged">("all");
  const [processing, setProcessing] = useState(false);
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [locations, setLocations] = useState<LocationConfig[]>([]);

  useEffect(() => {
    // Load categories and locations from Firestore
    const loadConfig = async () => {
      const [cats, locs] = await Promise.all([
        getCategories(),
        getLocations()
      ]);
      setCategories(cats);
      setLocations(locs);
    };
    loadConfig();

    const unsubLost = subscribeToLostItems((items) => {
      setLostItems(items);
      setLoading(false);
    });

    const unsubFound = subscribeToFoundItems((items) => {
      setFoundItems(items);
    });

    return () => {
      unsubLost();
      unsubFound();
    };
  }, []);

  // Combine and sort items by date (newest first)
  const allItems = [...lostItems, ...foundItems].sort((a, b) => {
    const dateA = a.createdAt ? timestampToDate(a.createdAt as any).getTime() : 0;
    const dateB = b.createdAt ? timestampToDate(b.createdAt as any).getTime() : 0;
    return dateB - dateA;
  });

  // Filter items
  const filteredItems = allItems.filter((item) => {
    if (filter === "pending") {
      return item.status === "searching" || item.status === "found";
    }
    if (filter === "flagged") {
      // Items that might need attention (e.g., old items still searching)
      if (item.createdAt) {
        const createdDate = timestampToDate(item.createdAt as any);
        const daysSinceCreated = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceCreated > 7 && item.status === "searching";
      }
      return false;
    }
    return true;
  });

  // Stats
  const stats = {
    total: allItems.length,
    pending: allItems.filter((i) => i.status === "searching" || i.status === "found").length,
    flagged: allItems.filter((item) => {
      if (item.createdAt) {
        const createdDate = timestampToDate(item.createdAt as any);
        const daysSinceCreated = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceCreated > 7 && item.status === "searching";
      }
      return false;
    }).length,
    resolved: allItems.filter((i) => i.status === "claimed").length,
  };

  // Approve item (mark as found)
  const handleApprove = async (item: LostItem | FoundItem) => {
    setProcessing(true);
    try {
      if ("itemName" in item) {
        await updateLostItem(item.id, { status: "found" });
      } else {
        await updateFoundItem(item.id, { status: "found" });
      }
    } catch (error) {
      console.error("Error approving item:", error);
      alert("เกิดข้อผิดพลาด");
    }
    setProcessing(false);
  };

  // Mark as claimed
  const handleMarkClaimed = async (item: LostItem | FoundItem) => {
    setProcessing(true);
    try {
      if ("itemName" in item) {
        await updateLostItem(item.id, { status: "claimed" });
      } else {
        await updateFoundItem(item.id, { status: "claimed" });
      }
      setShowDetailModal(false);
    } catch (error) {
      console.error("Error marking as claimed:", error);
      alert("เกิดข้อผิดพลาด");
    }
    setProcessing(false);
  };

  // Delete item
  const handleDelete = async (item: LostItem | FoundItem) => {
    if (!confirm("ต้องการลบรายการนี้หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้")) return;

    setProcessing(true);
    try {
      if ("itemName" in item) {
        await deleteLostItem(item.id);
      } else {
        await deleteFoundItem(item.id);
      }
      setShowDetailModal(false);
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("เกิดข้อผิดพลาด");
    }
    setProcessing(false);
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Moderation</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          ตรวจสอบและอนุมัติรายการแจ้ง
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "p-4 rounded-2xl text-left transition-all",
            filter === "all"
              ? "bg-[#06C755] text-white shadow-lg"
              : "bg-white dark:bg-gray-800 hover:shadow-md"
          )}
        >
          <Package className={cn("w-6 h-6 mb-2", filter === "all" ? "text-white" : "text-gray-400")} />
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className={cn("text-sm", filter === "all" ? "text-white/80" : "text-gray-500")}>
            ทั้งหมด
          </p>
        </button>

        <button
          onClick={() => setFilter("pending")}
          className={cn(
            "p-4 rounded-2xl text-left transition-all",
            filter === "pending"
              ? "bg-yellow-500 text-white shadow-lg"
              : "bg-white dark:bg-gray-800 hover:shadow-md"
          )}
        >
          <Clock className={cn("w-6 h-6 mb-2", filter === "pending" ? "text-white" : "text-yellow-500")} />
          <p className="text-2xl font-bold">{stats.pending}</p>
          <p className={cn("text-sm", filter === "pending" ? "text-white/80" : "text-gray-500")}>
            รอดำเนินการ
          </p>
        </button>

        <button
          onClick={() => setFilter("flagged")}
          className={cn(
            "p-4 rounded-2xl text-left transition-all",
            filter === "flagged"
              ? "bg-red-500 text-white shadow-lg"
              : "bg-white dark:bg-gray-800 hover:shadow-md"
          )}
        >
          <AlertTriangle className={cn("w-6 h-6 mb-2", filter === "flagged" ? "text-white" : "text-red-500")} />
          <p className="text-2xl font-bold">{stats.flagged}</p>
          <p className={cn("text-sm", filter === "flagged" ? "text-white/80" : "text-gray-500")}>
            ต้องตรวจสอบ
          </p>
        </button>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800">
          <CheckCircle className="w-6 h-6 mb-2 text-blue-500" />
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.resolved}</p>
          <p className="text-sm text-gray-500">รับคืนแล้ว</p>
        </div>
      </div>

      {/* Items List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            รายการ{" "}
            {filter === "all" ? "ทั้งหมด" : filter === "pending" ? "รอดำเนินการ" : "ต้องตรวจสอบ"}
            <span className="text-gray-400 font-normal ml-2">({filteredItems.length})</span>
          </h2>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">ไม่มีรายการ</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredItems.map((item) => {
              const isLost = "itemName" in item;
              const isOld = (() => {
                if (item.createdAt) {
                  const createdDate = timestampToDate(item.createdAt as any);
                  const daysSinceCreated = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
                  return daysSinceCreated > 7 && item.status === "searching";
                }
                return false;
              })();

              return (
                <div
                  key={item.id}
                  className={cn(
                    "p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer",
                    isOld && "bg-red-50 dark:bg-red-900/10"
                  )}
                  onClick={() => {
                    setSelectedItem(item);
                    setShowDetailModal(true);
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Thumbnail or Icon */}
                    {"photoUrl" in item && item.photoUrl ? (
                      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-700">
                        <Image
                          src={item.photoUrl}
                          alt=""
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0",
                          isLost
                            ? "bg-red-100 dark:bg-red-900/30"
                            : "bg-green-100 dark:bg-green-900/30"
                        )}
                      >
                        {isLost ? (
                          <Search className="w-7 h-7 text-red-500" />
                        ) : (
                          <Package className="w-7 h-7 text-green-500" />
                        )}
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {isLost ? (item as LostItem).itemName : (item as FoundItem).description}
                          </p>
                          <p className="text-sm text-gray-500 mt-0.5">
                            <span className="font-mono text-[#06C755]">{item.trackingCode}</span>
                            <span className="mx-2">•</span>
                            {isLost ? "ของหาย" : "ของเจอ"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isOld && (
                            <span className="px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 text-xs font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              เก่า
                            </span>
                          )}
                          <span
                            className={cn(
                              "px-2.5 py-1 rounded-full text-xs font-medium",
                              STATUS_CONFIG[item.status].bgColor,
                              STATUS_CONFIG[item.status].color
                            )}
                          >
                            {STATUS_CONFIG[item.status].label}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-400 mt-2">
                        {item.createdAt
                          ? formatThaiDate(timestampToDate(item.createdAt as any))
                          : "-"}
                      </p>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.status === "searching" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(item);
                          }}
                          disabled={processing}
                          className="p-2 text-[#06C755] hover:bg-[#e8f8ef] dark:hover:bg-[#06C755]/20 rounded-lg transition-colors"
                          title="อนุมัติ"
                        >
                          <ThumbsUp className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem(item);
                          setShowDetailModal(true);
                        }}
                        className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="ดูรายละเอียด"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  ตรวจสอบรายการ
                </h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Image */}
              {"photoUrl" in selectedItem && selectedItem.photoUrl && (
                <div className="relative w-full h-48 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
                  <Image
                    src={selectedItem.photoUrl}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}

              {/* Tracking Code */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <span className="text-sm text-gray-500">รหัสติดตาม</span>
                <span className="font-mono text-lg text-[#06C755]">{selectedItem.trackingCode}</span>
              </div>

              {/* Details */}
              {"itemName" in selectedItem && (
                <>
                  <div>
                    <label className="text-sm text-gray-500">สิ่งของ</label>
                    <p className="text-gray-900 dark:text-white font-medium">{selectedItem.itemName}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">หมวดหมู่</label>
                    <p className="text-gray-900 dark:text-white">
                      {categories.find((c) => c.value === selectedItem.category)?.icon}{" "}
                      {categories.find((c) => c.value === selectedItem.category)?.label}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">สถานที่หาย</label>
                    <p className="text-gray-900 dark:text-white">{selectedItem.locationLost}</p>
                  </div>
                  {selectedItem.contacts && selectedItem.contacts.length > 0 && (
                    <div>
                      <label className="text-sm text-gray-500">ช่องทางติดต่อ</label>
                      <div className="space-y-1">
                        {selectedItem.contacts.map((contact, idx) => (
                          <p key={idx} className="text-gray-900 dark:text-white">
                            {contact.type}: {contact.value}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {"description" in selectedItem && !("itemName" in selectedItem) && (
                <>
                  <div>
                    <label className="text-sm text-gray-500">รายละเอียด</label>
                    <p className="text-gray-900 dark:text-white">{selectedItem.description}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">สถานที่เจอ</label>
                    <p className="text-gray-900 dark:text-white">{selectedItem.locationFound}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">จุดส่งมอบ</label>
                    <p className="text-gray-900 dark:text-white">
                      {locations.find((l) => l.value === selectedItem.dropOffLocation)?.label}
                    </p>
                  </div>
                </>
              )}

              {/* Current Status */}
              <div>
                <label className="text-sm text-gray-500">สถานะปัจจุบัน</label>
                <span
                  className={cn(
                    "inline-block mt-1 px-3 py-1.5 rounded-full text-sm font-medium",
                    STATUS_CONFIG[selectedItem.status].bgColor,
                    STATUS_CONFIG[selectedItem.status].color
                  )}
                >
                  {STATUS_CONFIG[selectedItem.status].label}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-100 dark:border-gray-700 space-y-3">
              {selectedItem.status !== "claimed" && (
                <button
                  onClick={() => handleMarkClaimed(selectedItem)}
                  disabled={processing}
                  className="w-full py-3 bg-[#06C755] text-white rounded-xl font-medium hover:bg-[#05b34d] transition-colors flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      ยืนยันรับคืนแล้ว
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => handleDelete(selectedItem)}
                disabled={processing}
                className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                ลบรายการนี้
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
