"use client";

// Force dynamic rendering for security
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import {
  Search,
  Package,
  Edit,
  Trash2,
  X,
  Loader2,
  Filter,
  Eye,
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
import { logStatusChanged, logActivity } from "@/lib/logger";
import { useAuth } from "@/contexts/auth-context";

type Tab = "lost" | "found";

export default function AdminItemsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("lost");
  const [lostItems, setLostItems] = useState<LostItem[]>([]);
  const [foundItems, setFoundItems] = useState<FoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ItemStatus | "all">("all");
  const [selectedItem, setSelectedItem] = useState<LostItem | FoundItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [updating, setUpdating] = useState(false);
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

  const { user } = useAuth(); // Add user auth context

  const handleStatusUpdate = async (item: LostItem | FoundItem, newStatus: ItemStatus) => {
    setUpdating(true);
    try {
      if ("itemName" in item) {
        await updateLostItem(item.id, { status: newStatus });
        await logStatusChanged("lost", item.id, item.itemName, newStatus, user?.email || undefined);
      } else {
        await updateFoundItem(item.id, { status: newStatus });
        await logStatusChanged("found", item.id, item.description, newStatus, user?.email || undefined);
      }
      setShowModal(false);
    } catch (error) {
      console.error("Error updating status:", error);
      alert("เกิดข้อผิดพลาดในการอัปเดตสถานะ");
    }
    setUpdating(false);
  };

  const handleDelete = async (item: LostItem | FoundItem) => {
    if (!confirm("ต้องการลบรายการนี้หรือไม่?")) return;

    try {
      if ("itemName" in item) {
        await deleteLostItem(item.id);
        await logActivity({
          action: `ลบรายการของหาย: ${item.itemName}`,
          actionType: "delete",
          targetType: "lostItem",
          targetId: item.id,
          targetName: item.itemName,
          userEmail: user?.email || undefined
        });
      } else {
        await deleteFoundItem(item.id);
        await logActivity({
          action: `ลบรายการของเจอ: ${item.description}`,
          actionType: "delete",
          targetType: "foundItem",
          targetId: item.id,
          targetName: item.description,
          userEmail: user?.email || undefined
        });
      }
      setShowModal(false);
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("เกิดข้อผิดพลาดในการลบ");
    }
  };

  // Filter items
  const filteredLostItems = lostItems.filter((item) => {
    const matchesSearch =
      item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.trackingCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredFoundItems = foundItems.filter((item) => {
    const matchesSearch =
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.trackingCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">จัดการรายการ</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          ดูและจัดการรายการของหายและของเจอทั้งหมด
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("lost")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all",
            activeTab === "lost"
              ? "bg-red-500 text-white"
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          )}
        >
          <Search className="w-4 h-4" />
          ของหาย
          <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs">
            {lostItems.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("found")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all",
            activeTab === "found"
              ? "bg-[#06C755] text-white"
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          )}
        >
          <Package className="w-4 h-4" />
          ของเจอ
          <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs">
            {foundItems.length}
          </span>
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาด้วยชื่อ, รหัสติดตาม หรือรหัสนักเรียน..."
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06C755] text-gray-900 dark:text-white"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ItemStatus | "all")}
            className="pl-12 pr-8 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06C755] text-gray-900 dark:text-white appearance-none min-w-[160px]"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="searching">กำลังตามหา</option>
            <option value="found">เจอแล้ว</option>
            <option value="claimed">รับคืนแล้ว</option>
          </select>
        </div>
      </div>

      {/* Items Table/Cards */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">
                  รหัสติดตาม
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {activeTab === "lost" ? "สิ่งของ" : "รายละเอียด"}
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">
                  สถานที่
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">
                  วันที่
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">
                  สถานะ
                </th>
                <th className="text-right py-4 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {(activeTab === "lost" ? filteredLostItems : filteredFoundItems).map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="py-4 px-6">
                    <span className="font-mono text-sm text-[#06C755]">{item.trackingCode}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-gray-900 dark:text-white">
                      {"itemName" in item ? item.itemName : item.description}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-gray-500 dark:text-gray-400">
                    {"locationLost" in item ? item.locationLost : item.locationFound}
                  </td>
                  <td className="py-4 px-6 text-gray-500 dark:text-gray-400">
                    {item.createdAt ? formatThaiDate(timestampToDate(item.createdAt as any)) : "-"}
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium",
                        STATUS_CONFIG[item.status].bgColor,
                        STATUS_CONFIG[item.status].color
                      )}
                    >
                      {STATUS_CONFIG[item.status].label}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setShowModal(true);
                        }}
                        className="p-2 text-gray-400 hover:text-[#06C755] hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="ดูรายละเอียด"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="ลบ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {(activeTab === "lost" ? filteredLostItems : filteredFoundItems).length === 0 && (
            <div className="py-12 text-center text-gray-500">ไม่พบรายการ</div>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
          {(activeTab === "lost" ? filteredLostItems : filteredFoundItems).map((item) => (
            <div
              key={item.id}
              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              onClick={() => {
                setSelectedItem(item);
                setShowModal(true);
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {"itemName" in item ? item.itemName : item.description}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    <span className="font-mono text-[#06C755]">{item.trackingCode}</span>
                    <span className="mx-2">•</span>
                    {"locationLost" in item ? item.locationLost : item.locationFound}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {item.createdAt ? formatThaiDate(timestampToDate(item.createdAt as any)) : "-"}
                  </p>
                </div>
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap",
                    STATUS_CONFIG[item.status].bgColor,
                    STATUS_CONFIG[item.status].color
                  )}
                >
                  {STATUS_CONFIG[item.status].label}
                </span>
              </div>
            </div>
          ))}

          {(activeTab === "lost" ? filteredLostItems : filteredFoundItems).length === 0 && (
            <div className="py-12 text-center text-gray-500">ไม่พบรายการ</div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                รายละเอียด
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {/* Image (for found items) */}
              {"photoUrl" in selectedItem && selectedItem.photoUrl && (
                <div className="relative w-full h-48 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
                  <Image
                    src={selectedItem.photoUrl}
                    alt="รูปของเจอ"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}

              <div>
                <label className="text-sm text-gray-500">รหัสติดตาม</label>
                <p className="font-mono text-lg text-[#06C755]">{selectedItem.trackingCode}</p>
              </div>

              {"itemName" in selectedItem && (
                <>
                  <div>
                    <label className="text-sm text-gray-500">สิ่งของ</label>
                    <p className="text-gray-900 dark:text-white">{selectedItem.itemName}</p>
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
                      {locations.find((l) => l.value === selectedItem.dropOffLocation)?.label || selectedItem.dropOffLocation}
                    </p>
                  </div>
                </>
              )}

              <div>
                <label className="text-sm text-gray-500 block mb-2">อัปเดตสถานะ</label>
                <div className="flex flex-wrap gap-2">
                  {(["searching", "found", "claimed"] as ItemStatus[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusUpdate(selectedItem, status)}
                      disabled={updating || selectedItem.status === status}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-medium transition-all",
                        selectedItem.status === status
                          ? `${STATUS_CONFIG[status].bgColor} ${STATUS_CONFIG[status].color} ring-2 ring-offset-2 ring-current`
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                      )}
                    >
                      {updating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        STATUS_CONFIG[status].label
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                ปิด
              </button>
              <button
                onClick={() => handleDelete(selectedItem)}
                className="py-3 px-6 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
