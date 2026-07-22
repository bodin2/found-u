"use client";

import { useState, useEffect, useId, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Search,
  Package,
  Trash2,
  Loader2,
  Filter,
  Eye,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  MapPinned,
  Sparkles,
  X,
} from "lucide-react";
import Image from "next/image";
import {
  subscribeToLostItems,
  subscribeToFoundItems,
  updateLostItem,
  updateFoundItem,
  confirmFoundItemRoomHandover,
  deleteLostItem,
  deleteFoundItem,
  timestampToDate,
  getCategories,
  getLocations,
  getLostItems,
  getFoundItems,
} from "@/lib/database";
import {
  STATUS_CONFIG,
  getDropOffLocationLabel,
  getItemDisplayName,
  getItemStatusConfig,
  isFoundItem,
  isFoundPendingRoomConfirm,
  isLostItem,
  DEFAULT_APP_SETTINGS,
  type LostItem,
  type FoundItem,
  type ItemStatus,
  type ContactInfo,
} from "@/lib/types";
import type { CategoryConfig, LocationConfig } from "@/lib/database";
import { cn, formatThaiDate } from "@/lib/utils";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { StatusAlert } from "@/components/ui/status-alert";
import { feedbackVariantStyles } from "@/lib/feedback/variant-styles";
import { logStatusChanged, logActivity } from "@/lib/logger";
import {
  formatHandoverDeadlineThai,
  isHandoverPastDeadline,
  resolveHandoverDeadlineAt,
} from "@/lib/found-handover";
import { triggerFoundHandoverExpirySweep } from "@/lib/found-handover-client";
import { useAuth } from "@/contexts/auth-context";
import { useAppDialog } from "@/hooks/use-app-dialog";
import { useMapView } from "@/hooks/use-map-view";
import { useMediaQuery } from "@/hooks/use-media-query";

const MapCanvas = dynamic(() => import("@/components/ui/map-canvas"), {
  ssr: false,
  loading: () => (
    <div
      className="h-52 sm:h-64 rounded-xl bg-bg-secondary motion-safe:animate-pulse"
      aria-hidden
    />
  ),
});

type Tab = "lost" | "found";

const SEARCH_MAX_LENGTH = 120;

/** Map pins (Leaflet needs concrete colors; match design tokens). */
const MARKER_LOST = "#EF4444";
const MARKER_FOUND = "#06C755";

const LOST_FILTER_STATUSES: ItemStatus[] = ["searching", "found", "claimed", "expired"];
const FOUND_FILTER_STATUSES: ItemStatus[] = [
  "pending_room_confirm",
  "found",
  "claimed",
  "expired",
];

const surfaceClass =
  "bg-bg-card rounded-2xl overflow-hidden border border-border-light";

const fieldClass =
  "min-h-11 text-base bg-bg-tertiary border border-transparent rounded-xl focus:outline-none focus:bg-bg-primary focus:ring-2 focus:ring-line-green/35 focus:border-line-green/40 text-text-primary placeholder:text-text-secondary motion-safe:transition-colors motion-safe:duration-200";

const iconActionClass =
  "inline-flex items-center justify-center min-h-11 min-w-11 text-text-secondary rounded-lg motion-safe:transition-colors motion-safe:duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/35 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary";

const tabBaseClass =
  "flex flex-1 sm:flex-none items-center justify-center gap-2 min-h-11 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap motion-safe:transition-colors motion-safe:duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/35 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary";

const ctaClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-line-green-cta px-5 text-sm font-medium text-white hover:bg-line-green-cta-hover active:bg-line-green-cta-hover motion-safe:transition-colors motion-safe:duration-200";

function normalizeQuery(raw: string): string {
  return raw.trim().toLowerCase();
}

function matchesHaystack(values: Array<string | null | undefined>, query: string): boolean {
  if (!query) return true;
  return values.some((value) => (value ?? "").toLowerCase().includes(query));
}

function contactValues(contacts: ContactInfo[] | undefined): string[] {
  return (contacts ?? []).map((c) => c.value);
}

function itemMatchesSearch(item: LostItem | FoundItem, rawQuery: string): boolean {
  const query = normalizeQuery(rawQuery);
  if (!query) return true;

  if (isLostItem(item)) {
    return matchesHaystack(
      [
        item.itemName,
        item.trackingCode,
        item.description,
        item.locationLost,
        item.locationPlaceName,
        item.studentId,
        ...contactValues(item.contacts),
      ],
      query
    );
  }

  return matchesHaystack(
    [
      item.itemName,
      item.description,
      item.trackingCode,
      item.locationFound,
      item.locationPlaceName,
      item.brand,
      item.color,
      ...contactValues(item.finderContacts),
    ],
    query
  );
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-sm text-text-secondary">{label}</p>
      <div className="text-text-primary break-words">{children}</div>
    </div>
  );
}

const TIP_STORAGE_KEY = "found-u.admin.items.tip-dismissed";

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded-lg bg-bg-tertiary motion-safe:animate-pulse", className)}
      aria-hidden
    />
  );
}

function AdminItemsSkeleton() {
  return (
    <div
      className="px-3 py-4 sm:px-4 sm:py-5 lg:p-6 space-y-4 sm:space-y-5 lg:space-y-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">กำลังโหลดรายการ...</span>
      <div className="space-y-2">
        <SkeletonBar className="h-8 w-48 sm:w-56" />
        <SkeletonBar className="h-4 w-72 max-w-full" />
      </div>
      <div className="flex gap-2">
        <SkeletonBar className="h-11 flex-1 sm:flex-none sm:w-36 rounded-xl" />
        <SkeletonBar className="h-11 flex-1 sm:flex-none sm:w-36 rounded-xl" />
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <SkeletonBar className="h-11 flex-1 rounded-xl" />
        <SkeletonBar className="h-11 w-full sm:w-44 rounded-xl" />
      </div>
      <div className={cn(surfaceClass, "p-0")}>
        <div className="hidden md:block divide-y divide-border-light">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 lg:px-6 py-4">
              <SkeletonBar className="h-4 w-20" />
              <div className="flex-1 space-y-2 min-w-0">
                <SkeletonBar className="h-4 w-40 max-w-full" />
                <SkeletonBar className="h-3 w-28 lg:hidden" />
              </div>
              <SkeletonBar className="hidden lg:block h-4 w-24" />
              <SkeletonBar className="h-6 w-20 rounded-full" />
              <SkeletonBar className="h-9 w-20 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
        <div className="md:hidden divide-y divide-border-light">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-4">
              <div className="flex-1 space-y-2 min-w-0">
                <SkeletonBar className="h-4 w-36 max-w-full" />
                <SkeletonBar className="h-3 w-48 max-w-full" />
                <SkeletonBar className="h-3 w-24" />
              </div>
              <SkeletonBar className="h-6 w-16 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ItemsEmptyState({
  activeTab,
  hasActiveFilters,
  otherTabCount,
  onClear,
  onSwitchTab,
}: {
  activeTab: Tab;
  hasActiveFilters: boolean;
  otherTabCount: number;
  onClear: () => void;
  onSwitchTab: () => void;
}) {
  const Icon = activeTab === "lost" ? Search : Package;
  const otherLabel = activeTab === "lost" ? "ของเจอ" : "ของหาย";

  if (hasActiveFilters) {
    return (
      <div className="py-12 px-4 text-center max-w-md mx-auto" role="status">
        <div
          className={cn(
            "mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full",
            activeTab === "lost"
              ? "bg-status-error-light text-red-800 dark:text-red-200"
              : "bg-line-green-light text-line-green-link"
          )}
        >
          <Filter className="h-6 w-6" aria-hidden />
        </div>
        <h3 className="text-base font-semibold text-text-primary text-balance">
          ไม่พบรายการที่ตรงกับเงื่อนไข
        </h3>
        <p className="mt-2 text-sm text-text-secondary text-pretty">
          ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองเพื่อดูรายการทั้งหมดอีกครั้ง
        </p>
        <button type="button" onClick={onClear} className={cn(ctaClass, "mt-4")}>
          ล้างตัวกรอง
        </button>
      </div>
    );
  }

  return (
    <div className="py-12 px-4 text-center max-w-lg mx-auto" role="status">
      <div
        className={cn(
          "mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full",
          activeTab === "lost"
            ? "bg-status-error-light text-red-800 dark:text-red-200"
            : "bg-line-green-light text-line-green-link"
        )}
      >
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-text-primary text-balance">
        {activeTab === "lost" ? "ยังไม่มีรายการของหาย" : "ยังไม่มีรายการของเจอ"}
      </h3>
      <p className="mt-2 text-sm text-text-secondary text-pretty">
        {activeTab === "lost"
          ? "เมื่อนักเรียนแจ้งของหาย รายการจะแสดงที่นี่ — ค้นหาด้วยรหัสติดตาม อัปเดตสถานะ หรือลบรายการที่ไม่ถูกต้อง"
          : "เมื่อมีคนแจ้งของเจอ รายการจะแสดงที่นี่ — เปิดรายการแล้วยืนยันเมื่อของถึงห้องบุคคล เพื่อให้นักเรียนมารับได้"}
      </p>
      <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-3">
        <Link href="/admin/matching" className={ctaClass}>
          <Sparkles className="w-4 h-4" aria-hidden />
          ไปที่ Matching
        </Link>
        {otherTabCount > 0 && (
          <button
            type="button"
            onClick={onSwitchTab}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-bg-tertiary px-5 text-sm font-medium text-text-primary hover:bg-border-light active:bg-border-light motion-safe:transition-colors motion-safe:duration-200"
          >
            ดู{otherLabel} ({otherTabCount})
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminItemsPage() {
  const searchInputId = useId();
  const statusFilterId = useId();
  const resultsStatusId = useId();

  const [activeTab, setActiveTab] = useState<Tab>("lost");
  const [lostItems, setLostItems] = useState<LostItem[]>([]);
  const [foundItems, setFoundItems] = useState<FoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ItemStatus | "all">("all");
  const [selectedItem, setSelectedItem] = useState<LostItem | FoundItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [locations, setLocations] = useState<LocationConfig[]>([]);
  const [tipDismissed, setTipDismissed] = useState(true);
  const { user, appSettings, appSettingsReady } = useAuth();
  const { showAlert, showConfirm, dialog } = useAppDialog();
  const isMdUp = useMediaQuery("(min-width: 768px)");
  const prefersHover = useMediaQuery("(hover: hover) and (pointer: fine)");

  useEffect(() => {
    try {
      setTipDismissed(window.localStorage.getItem(TIP_STORAGE_KEY) === "1");
    } catch {
      setTipDismissed(false);
    }
  }, []);

  /** Keep modal row in sync with live list updates; close if deleted elsewhere */
  useEffect(() => {
    setSelectedItem((prev) => {
      if (!prev) return prev;
      const list = isLostItem(prev) ? lostItems : foundItems;
      return list.find((item) => item.id === prev.id) ?? null;
    });
  }, [lostItems, foundItems]);

  useEffect(() => {
    if (showModal && !selectedItem) {
      setShowModal(false);
    }
  }, [showModal, selectedItem]);

  useEffect(() => {
    let cancelled = false;

    const finishLoading = () => {
      if (!cancelled) setLoading(false);
    };

    const bootstrap = async () => {
      setLoading(true);
      try {
        const [cats, locs] = await Promise.all([getCategories(), getLocations()]);
        if (cancelled) return;
        setCategories(cats);
        setLocations(locs);
      } catch (error) {
        console.error("Error loading item config:", error);
      }

      try {
        const [lost, found] = await Promise.all([getLostItems(), getFoundItems()]);
        if (cancelled) return;
        setLostItems(lost);
        setFoundItems(found);
        setLoadError(null);
      } catch (error) {
        console.error("Error loading items:", error);
        if (!cancelled) {
          setLoadError("โหลดรายการไม่สำเร็จ กรุณาลองอีกครั้ง");
        }
      } finally {
        finishLoading();
      }
    };

    void bootstrap();

    const unsubLost = subscribeToLostItems((items) => {
      if (cancelled) return;
      setLostItems(items);
      setLoadError(null);
      finishLoading();
    });

    const unsubFound = subscribeToFoundItems((items) => {
      if (cancelled) return;
      setFoundItems(items);
    });

    return () => {
      cancelled = true;
      unsubLost();
      unsubFound();
    };
  }, [reloadToken]);

  useEffect(() => {
    if (appSettingsReady) {
      void triggerFoundHandoverExpirySweep();
    }
  }, [appSettingsReady]);

  const fallbackCenter =
    appSettings.mapDefaultCenter || DEFAULT_APP_SETTINGS.mapDefaultCenter!;
  const fallbackZoom = appSettings.mapDefaultZoom ?? DEFAULT_APP_SETTINGS.mapDefaultZoom ?? 17;
  const schoolBoundary = appSettings.mapSchoolBoundary || [];

  const { center: mapCenter, zoom: mapZoom, fitPoints: mapFitPoints } = useMapView({
    enabled: Boolean(appSettings.mapsEnabled),
    fallbackCenter,
    fallbackZoom,
    polygon: schoolBoundary,
    preferPolygonFit: true,
    locateUser: false,
  });

  const openItem = (item: LostItem | FoundItem) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    const allowed = tab === "lost" ? LOST_FILTER_STATUSES : FOUND_FILTER_STATUSES;
    setStatusFilter((prev) => (prev === "all" || allowed.includes(prev) ? prev : "all"));
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };

  const filterStatuses = activeTab === "lost" ? LOST_FILTER_STATUSES : FOUND_FILTER_STATUSES;

  const dismissTip = () => {
    setTipDismissed(true);
    try {
      window.localStorage.setItem(TIP_STORAGE_KEY, "1");
    } catch {
      /* ignore quota / private mode */
    }
  };

  const hasActiveFilters = Boolean(normalizeQuery(searchQuery)) || statusFilter !== "all";
  const busy = updating || deleting;

  const handleStatusUpdate = async (item: LostItem | FoundItem, newStatus: ItemStatus) => {
    if (busy) return;
    setUpdating(true);
    try {
      if (isLostItem(item)) {
        await updateLostItem(item.id, { status: newStatus });
        await logStatusChanged("lost", item.id, item.itemName, newStatus, user?.email || undefined);
      } else {
        const patch: Partial<FoundItem> = { status: newStatus };
        if (newStatus === "found") {
          patch.roomHandoverConfirmed = true;
          patch.roomHandoverConfirmedBy = user?.uid;
          patch.roomHandoverConfirmedByName =
            user?.displayName || user?.email || user?.uid;
          patch.roomHandoverConfirmedAt = new Date();
        } else if (newStatus === "pending_room_confirm") {
          patch.roomHandoverConfirmed = false;
        }
        await updateFoundItem(item.id, patch);
        await logStatusChanged(
          "found",
          item.id,
          getItemDisplayName(item),
          newStatus,
          user?.email || undefined
        );
      }
      /* Keep modal open — list sync refreshes the selected row */
    } catch (error) {
      console.error("Error updating status:", error);
      void showAlert({
        title: "อัปเดตไม่สำเร็จ",
        message: "เกิดข้อผิดพลาดในการอัปเดตสถานะ กรุณาลองอีกครั้ง",
        variant: "error",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmRoomHandover = async (item: FoundItem) => {
    if (!user?.uid || busy) return;
    if (item.status === "expired") {
      void showAlert({
        title: "ไม่สามารถยืนยันได้",
        message: "รายการนี้หมดอายุแล้ว",
        variant: "warning",
      });
      return;
    }
    if (isHandoverPastDeadline(item, appSettings)) {
      void showAlert({
        title: "หมดเวลาส่งห้องบุคคลแล้ว",
        message: "รายการนี้เลยกำหนดเวลานำของถึงห้องบุคคลแล้ว กรุณารีเฟรชหรือรอระบบอัปเดตสถานะ",
        variant: "warning",
      });
      void triggerFoundHandoverExpirySweep();
      return;
    }
    setUpdating(true);
    try {
      await confirmFoundItemRoomHandover(item.id, {
        uid: user.uid,
        displayName: user.displayName || undefined,
        email: user.email || undefined,
      });
      await logActivity({
        action: `ยืนยันรับของที่ห้องบุคคล: ${getItemDisplayName(item)} (${item.trackingCode})`,
        actionType: "update",
        targetType: "foundItem",
        targetId: item.id,
        targetName: getItemDisplayName(item),
        userEmail: user.email || undefined,
        userName: user.displayName || undefined,
      });
      setSelectedItem({
        ...item,
        status: "found",
        roomHandoverConfirmed: true,
        roomHandoverConfirmedBy: user.uid,
        roomHandoverConfirmedByName: user.displayName || user.email || user.uid,
      });
    } catch (error) {
      console.error("Error confirming room handover:", error);
      void showAlert({
        title: "ยืนยันไม่สำเร็จ",
        message: "ไม่สามารถยืนยันการรับของที่ห้องบุคคลได้ กรุณาลองอีกครั้ง",
        variant: "error",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (item: LostItem | FoundItem) => {
    if (busy) return;
    const confirmed = await showConfirm({
      title: "ลบรายการ",
      message: `ต้องการลบ “${getItemDisplayName(item)}” (${item.trackingCode}) หรือไม่? การลบไม่สามารถย้อนกลับได้`,
      variant: "warning",
      confirmLabel: "ลบ",
    });
    if (!confirmed) return;

    setDeleting(true);
    try {
      if (isLostItem(item)) {
        await deleteLostItem(item.id);
        await logActivity({
          action: `ลบรายการของหาย: ${item.itemName}`,
          actionType: "delete",
          targetType: "lostItem",
          targetId: item.id,
          targetName: item.itemName,
          userEmail: user?.email || undefined,
        });
      } else {
        await deleteFoundItem(item.id);
        await logActivity({
          action: `ลบรายการของเจอ: ${item.description}`,
          actionType: "delete",
          targetType: "foundItem",
          targetId: item.id,
          targetName: item.description,
          userEmail: user?.email || undefined,
        });
      }
      setShowModal(false);
      setSelectedItem(null);
    } catch (error) {
      console.error("Error deleting item:", error);
      void showAlert({
        title: "ลบไม่สำเร็จ",
        message: "เกิดข้อผิดพลาดในการลบ กรุณาลองอีกครั้ง",
        variant: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  const filteredLostItems = lostItems.filter((item) => {
    const matchesSearch = itemMatchesSearch(item, searchQuery);
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredFoundItems = foundItems.filter((item) => {
    const matchesSearch = itemMatchesSearch(item, searchQuery);
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const visibleItems = activeTab === "lost" ? filteredLostItems : filteredFoundItems;
  const sourceCount = activeTab === "lost" ? lostItems.length : foundItems.length;

  const mapMarkers = visibleItems
    .filter((item) => item.locationCoords)
    .map((item) => ({
      id: item.id,
      position: item.locationCoords!,
      label: getItemDisplayName(item),
      color: activeTab === "lost" ? MARKER_LOST : MARKER_FOUND,
    }));

  const emptyMessage = hasActiveFilters
    ? "ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา"
    : sourceCount === 0
      ? activeTab === "lost"
        ? "ยังไม่มีรายการของหาย"
        : "ยังไม่มีรายการของเจอ"
      : "ไม่พบรายการ";

  const pendingRoomCount = foundItems.filter((item) =>
    isFoundPendingRoomConfirm(item.status)
  ).length;
  const otherTabCount = activeTab === "lost" ? foundItems.length : lostItems.length;
  const showWorkflowTip =
    !tipDismissed && !loading && !loadError && lostItems.length + foundItems.length > 0;

  if (loading) {
    return <AdminItemsSkeleton />;
  }

  return (
    <div className="px-3 py-4 sm:px-4 sm:py-5 lg:p-6 space-y-4 sm:space-y-5 lg:space-y-6 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-text-primary text-balance">
          จัดการรายการ
        </h1>
        <p className="text-text-secondary mt-1 text-sm sm:text-base">
          ดูและจัดการรายการของหายและของเจอทั้งหมด
        </p>
      </div>

      {loadError && (
        <StatusAlert
          variant="error"
          title="โหลดไม่สำเร็จ"
          message={loadError}
          action={{
            label: "ลองอีกครั้ง",
            onClick: () => setReloadToken((n) => n + 1),
          }}
        />
      )}

      {showWorkflowTip && (
        <div className="relative rounded-xl border border-line-green/30 bg-line-green-light px-4 py-3 pr-14">
          <p className="text-sm font-medium text-line-green-dark dark:text-line-green">
            เริ่มจากค้นหา แล้วเปิดรายการ
          </p>
          <p className="mt-1 text-sm text-line-green-dark/85 dark:text-line-green/85 text-pretty">
            อัปเดตสถานะได้จากหน้ารายละเอียด — ของเจอที่รอส่งห้องบุคคล กดยืนยันเมื่อของถึงแล้ว
          </p>
          <button
            type="button"
            onClick={dismissTip}
            className="absolute top-2 right-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-line-green-dark/80 hover:bg-line-green/15 active:bg-line-green/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/35"
            aria-label="ปิดคำแนะนำ"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>
      )}

      {activeTab === "found" &&
        pendingRoomCount > 0 &&
        statusFilter !== "pending_room_confirm" && (
          <StatusAlert
            variant="info"
            title={`มี ${pendingRoomCount} รายการรอส่งห้องบุคคล`}
            message="กรองเฉพาะรายการที่รอยืนยัน เพื่อเคลียร์คิวส่งมอบได้เร็วขึ้น"
            action={{
              label: "แสดงรายการที่รอ",
              onClick: () => setStatusFilter("pending_room_confirm"),
            }}
          />
        )}

      <div
        className="flex gap-2 overflow-x-auto pb-0.5 -mx-0.5 px-0.5"
        role="group"
        aria-label="ประเภทข้อมูล"
      >
        <button
          type="button"
          onClick={() => switchTab("lost")}
          aria-pressed={activeTab === "lost"}
          className={cn(
            tabBaseClass,
            activeTab === "lost"
              ? "bg-status-error-light text-red-800 dark:text-red-200 ring-1 ring-status-error/30"
              : "bg-bg-card text-text-secondary ring-1 ring-border-light active:bg-bg-secondary",
            prefersHover && activeTab !== "lost" && "hover:bg-bg-secondary"
          )}
        >
          <Search className="w-4 h-4 shrink-0" aria-hidden />
          ของหาย
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-xs tabular-nums font-medium",
              activeTab === "lost"
                ? "bg-status-error/15 text-red-800 dark:text-red-200"
                : "bg-bg-tertiary text-text-secondary"
            )}
          >
            {lostItems.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => switchTab("found")}
          aria-pressed={activeTab === "found"}
          className={cn(
            tabBaseClass,
            activeTab === "found"
              ? "bg-line-green-light text-line-green-link ring-1 ring-line-green/35"
              : "bg-bg-card text-text-secondary ring-1 ring-border-light active:bg-bg-secondary",
            prefersHover && activeTab !== "found" && "hover:bg-bg-secondary"
          )}
        >
          <Package className="w-4 h-4 shrink-0" aria-hidden />
          ของเจอ
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-xs tabular-nums font-medium",
              activeTab === "found"
                ? "bg-line-green/20 text-line-green-link"
                : "bg-bg-tertiary text-text-secondary"
            )}
          >
            {foundItems.length}
          </span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <label htmlFor={searchInputId} className="sr-only">
            ค้นหารายการด้วยชื่อ รหัสติดตาม หรือรหัสนักเรียน
          </label>
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary pointer-events-none"
            aria-hidden
          />
          <input
            id={searchInputId}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value.slice(0, SEARCH_MAX_LENGTH))}
            maxLength={SEARCH_MAX_LENGTH}
            placeholder={
              isMdUp
                ? "ค้นหาด้วยชื่อ, รหัสติดตาม หรือรหัสนักเรียน..."
                : "ค้นหาชื่อหรือรหัส..."
            }
            autoComplete="off"
            enterKeyHint="search"
            aria-controls={resultsStatusId}
            className={cn(
              "w-full pl-12 py-3",
              searchQuery ? "pr-12" : "pr-4",
              fieldClass,
              "[appearance:textfield] [&::-webkit-search-cancel-button]:hidden"
            )}
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/35"
              aria-label="ล้างคำค้นหา"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          ) : null}
        </div>
        <div className="relative w-full sm:w-auto sm:shrink-0">
          <label htmlFor={statusFilterId} className="sr-only">
            กรองตามสถานะ
          </label>
          <Filter
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary pointer-events-none"
            aria-hidden
          />
          <select
            id={statusFilterId}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ItemStatus | "all")}
            className={cn(
              "w-full sm:min-w-[11.5rem] pl-12 pr-10 py-3 appearance-none",
              fieldClass
            )}
          >
            <option value="all">ทุกสถานะ</option>
            {filterStatuses.map((status) => (
              <option key={status} value={status}>
                {activeTab === "lost" && status === "found"
                  ? "พบของแล้ว"
                  : STATUS_CONFIG[status].label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
            aria-hidden
          />
        </div>
      </div>

      <p id={resultsStatusId} className="sr-only" aria-live="polite" aria-atomic="true">
        {visibleItems.length === 0
          ? emptyMessage
          : `พบ ${visibleItems.length} รายการจากทั้งหมด ${sourceCount} รายการ`}
      </p>

      {appSettings.mapsEnabled &&
        (isMdUp ? (
          <div className={surfaceClass}>
            <div
              className={cn(
                "px-4 py-3 border-b border-border-light flex items-center justify-between gap-3",
                activeTab === "lost" ? "bg-status-error-light/60" : "bg-line-green-light/70"
              )}
            >
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-text-primary">แผนที่รายการ</h2>
                <p
                  className={cn(
                    "text-xs",
                    activeTab === "lost"
                      ? "text-red-800/75 dark:text-red-200/75"
                      : "text-line-green-dark/80 dark:text-line-green/80"
                  )}
                >
                  แสดงพิกัดที่ผู้ใช้ปักไว้
                </p>
              </div>
              <span
                className={cn(
                  "text-xs tabular-nums shrink-0 px-2.5 py-1 rounded-full font-medium",
                  activeTab === "lost"
                    ? "bg-status-error/10 text-red-800 dark:text-red-200"
                    : "bg-line-green/15 text-line-green-link"
                )}
              >
                {mapMarkers.length} จุด
              </span>
            </div>
            <div className="p-4 bg-bg-card">
              {mapMarkers.length > 0 ? (
                <MapCanvas
                  center={mapCenter}
                  zoom={mapZoom}
                  fitPoints={mapFitPoints}
                  fitBoundsOnce
                  tileUrl={appSettings.mapTileUrl || "https://tile.openstreetmap.org/{z}/{x}/{y}.png"}
                  attribution={appSettings.mapAttribution || ""}
                  mode="view"
                  polygon={schoolBoundary}
                  markers={mapMarkers}
                  className="h-64 lg:h-80 rounded-xl overflow-hidden"
                />
              ) : (
                <div className="h-40 lg:h-48 rounded-xl border border-dashed border-border-light bg-bg-secondary flex items-center justify-center text-sm text-text-secondary">
                  ไม่มีพิกัดให้แสดง
                </div>
              )}
            </div>
          </div>
        ) : (
          <details className={cn(surfaceClass, "group")}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-text-primary [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2 min-w-0">
                <MapPinned
                  className={cn(
                    "w-4 h-4 shrink-0",
                    activeTab === "lost" ? "text-status-error" : "text-line-green"
                  )}
                  aria-hidden
                />
                <span className="truncate">แผนที่รายการ</span>
              </span>
              <span className="inline-flex items-center gap-2 shrink-0">
                <span className="text-xs text-text-secondary tabular-nums">
                  {mapMarkers.length} จุด
                </span>
                <ChevronDown
                  className="w-4 h-4 text-text-secondary motion-safe:transition-transform motion-safe:duration-200 group-open:rotate-180"
                  aria-hidden
                />
              </span>
            </summary>
            <div className="border-t border-border-light p-3 bg-bg-card">
              {mapMarkers.length > 0 ? (
                <MapCanvas
                  center={mapCenter}
                  zoom={mapZoom}
                  fitPoints={mapFitPoints}
                  fitBoundsOnce
                  tileUrl={appSettings.mapTileUrl || "https://tile.openstreetmap.org/{z}/{x}/{y}.png"}
                  attribution={appSettings.mapAttribution || ""}
                  mode="view"
                  polygon={schoolBoundary}
                  markers={mapMarkers}
                  className="h-52 max-h-[40dvh] rounded-xl overflow-hidden"
                />
              ) : (
                <div className="h-32 rounded-xl border border-dashed border-border-light bg-bg-secondary flex items-center justify-center text-sm text-text-secondary">
                  ไม่มีพิกัดให้แสดง
                </div>
              )}
            </div>
          </details>
        ))}

      <div className={surfaceClass}>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[36rem] lg:min-w-0" aria-describedby={resultsStatusId}>
            <thead className="bg-bg-secondary sticky top-0 z-[1]">
              <tr>
                <th scope="col" className="text-left py-3 lg:py-4 px-4 lg:px-6 text-sm font-medium text-text-secondary">
                  รหัสติดตาม
                </th>
                <th scope="col" className="text-left py-3 lg:py-4 px-4 lg:px-6 text-sm font-medium text-text-secondary">
                  {activeTab === "lost" ? "สิ่งของ" : "รายละเอียด"}
                </th>
                <th scope="col" className="hidden lg:table-cell text-left py-4 px-6 text-sm font-medium text-text-secondary">
                  สถานที่
                </th>
                <th scope="col" className="hidden xl:table-cell text-left py-4 px-6 text-sm font-medium text-text-secondary">
                  วันที่
                </th>
                <th scope="col" className="text-left py-3 lg:py-4 px-4 lg:px-6 text-sm font-medium text-text-secondary">
                  สถานะ
                </th>
                <th scope="col" className="text-right py-3 lg:py-4 px-4 lg:px-6 text-sm font-medium text-text-secondary sticky right-0 bg-bg-secondary">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {visibleItems.map((item) => {
                const displayName = getItemDisplayName(item);
                const location =
                  "locationLost" in item ? item.locationLost : item.locationFound;
                const statusConfig = getItemStatusConfig(item);
                return (
                  <tr
                    key={item.id}
                    className={cn("group/row", prefersHover && "hover:bg-bg-secondary/80")}
                  >
                    <td className="py-3 lg:py-4 px-4 lg:px-6">
                      <span className="font-mono text-sm text-line-green-link">
                        {item.trackingCode}
                      </span>
                    </td>
                    <td className="py-3 lg:py-4 px-4 lg:px-6 max-w-[12rem] lg:max-w-[14rem]">
                      <span className="text-text-primary block truncate" title={displayName}>
                        {displayName}
                      </span>
                      <span className="lg:hidden block text-xs text-text-secondary truncate mt-0.5">
                        {location || "—"}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell py-4 px-6 text-text-secondary max-w-[10rem]">
                      <span className="block truncate" title={location}>
                        {location || "—"}
                      </span>
                    </td>
                    <td className="hidden xl:table-cell py-4 px-6 text-text-secondary whitespace-nowrap">
                      {item.createdAt ? formatThaiDate(timestampToDate(item.createdAt)) : "—"}
                    </td>
                    <td className="py-3 lg:py-4 px-4 lg:px-6">
                      <span
                        className={cn(
                          "inline-flex px-3 py-1 rounded-full text-xs font-medium",
                          statusConfig.bgColor,
                          statusConfig.color
                        )}
                      >
                        {statusConfig.label}
                      </span>
                    </td>
                    <td
                      className={cn(
                        "py-3 lg:py-4 px-4 lg:px-6 sticky right-0 bg-bg-card",
                        prefersHover && "group-hover/row:bg-bg-secondary/80"
                      )}
                    >
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          onClick={() => openItem(item)}
                          className={cn(
                            iconActionClass,
                            "active:bg-line-green-light active:text-line-green-dark",
                            prefersHover && "hover:text-line-green-dark hover:bg-line-green-light"
                          )}
                          aria-label={`ดูรายละเอียด ${displayName}`}
                          title="ดูรายละเอียด"
                        >
                          <Eye className="w-4 h-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(item)}
                          disabled={busy}
                          className={cn(
                            iconActionClass,
                            "disabled:opacity-50 active:bg-status-error-light active:text-status-error",
                            prefersHover && "hover:text-status-error hover:bg-status-error-light"
                          )}
                          aria-label={`ลบ ${displayName}`}
                          title="ลบ"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {visibleItems.length === 0 && (
            <ItemsEmptyState
              activeTab={activeTab}
              hasActiveFilters={hasActiveFilters}
              otherTabCount={otherTabCount}
              onClear={clearFilters}
              onSwitchTab={() => switchTab(activeTab === "lost" ? "found" : "lost")}
            />
          )}
        </div>

        <div className="md:hidden divide-y divide-border-light">
          {visibleItems.map((item) => {
            const displayName = getItemDisplayName(item);
            const location =
              "locationLost" in item ? item.locationLost : item.locationFound;
            const statusConfig = getItemStatusConfig(item);
            return (
              <div key={item.id} className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => openItem(item)}
                  className={cn(
                    "flex-1 min-w-0 text-left px-4 py-3.5 active:bg-bg-secondary/80 motion-safe:transition-colors motion-safe:duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-line-green/35"
                  )}
                  aria-label={`ดูรายละเอียด ${displayName} รหัส ${item.trackingCode}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary truncate">{displayName}</p>
                      <p className="text-sm text-text-secondary mt-1 truncate">
                        <span className="font-mono text-line-green-link">{item.trackingCode}</span>
                        <span className="mx-2" aria-hidden>
                          •
                        </span>
                        <span>{location || "—"}</span>
                      </p>
                      <p className="text-xs text-text-secondary mt-1">
                        {item.createdAt ? formatThaiDate(timestampToDate(item.createdAt)) : "—"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap",
                          statusConfig.bgColor,
                          statusConfig.color
                        )}
                      >
                        {statusConfig.label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-text-tertiary" aria-hidden />
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(item)}
                  disabled={busy}
                  className={cn(
                    "shrink-0 self-stretch px-3 min-w-11 border-l border-border-light text-text-secondary",
                    "active:bg-status-error-light active:text-status-error disabled:opacity-50",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-line-green/35"
                  )}
                  aria-label={`ลบ ${displayName}`}
                >
                  <Trash2 className="w-4 h-4 mx-auto" aria-hidden />
                </button>
              </div>
            );
          })}

          {visibleItems.length === 0 && (
            <ItemsEmptyState
              activeTab={activeTab}
              hasActiveFilters={hasActiveFilters}
              otherTabCount={otherTabCount}
              onClear={clearFilters}
              onSwitchTab={() => switchTab(activeTab === "lost" ? "found" : "lost")}
            />
          )}
        </div>
      </div>

      <ResponsiveModal
        open={showModal && !!selectedItem}
        onClose={() => {
          if (busy) return;
          setShowModal(false);
        }}
        title="รายละเอียด"
        size="lg"
        footer={
          selectedItem ? (
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 w-full">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={busy}
                className="flex-1 min-h-11 py-3 rounded-full bg-bg-tertiary text-text-primary font-medium active:bg-border-light hover:bg-border-light motion-safe:transition-colors motion-safe:duration-200 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/35 focus-visible:ring-offset-2"
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(selectedItem)}
                disabled={busy}
                className="sm:shrink-0 min-h-11 py-3 px-6 rounded-full bg-status-error-light text-red-800 dark:text-red-200 font-medium hover:bg-status-error hover:text-white active:bg-status-error active:text-white motion-safe:transition-colors motion-safe:duration-200 flex items-center justify-center gap-2 disabled:opacity-50 ring-1 ring-status-error/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-error/40 focus-visible:ring-offset-2"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="w-4 h-4" aria-hidden />
                )}
                ลบ
              </button>
            </div>
          ) : null
        }
      >
        {selectedItem && (
          <div className="space-y-4">
            {"photoUrl" in selectedItem && selectedItem.photoUrl && (
              <div className="relative w-full h-40 sm:h-48 md:h-56 rounded-xl overflow-hidden bg-bg-tertiary">
                <Image
                  src={selectedItem.photoUrl}
                  alt={`รูปของเจอ ${getItemDisplayName(selectedItem)}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}

            <DetailField label="รหัสติดตาม">
              <p className="font-mono text-lg text-line-green-link">{selectedItem.trackingCode}</p>
            </DetailField>

            {isLostItem(selectedItem) && (
              <>
                <DetailField label="สิ่งของ">
                  <p>{selectedItem.itemName}</p>
                </DetailField>
                {selectedItem.studentId && (
                  <DetailField label="รหัสนักเรียน">
                    <p className="font-mono">{selectedItem.studentId}</p>
                  </DetailField>
                )}
                <DetailField label="หมวดหมู่">
                  <p>
                    {categories.find((c) => c.value === selectedItem.category)?.icon}{" "}
                    {categories.find((c) => c.value === selectedItem.category)?.label ||
                      selectedItem.category}
                  </p>
                </DetailField>
                <DetailField label="สถานที่หาย">
                  <p>{selectedItem.locationLost}</p>
                </DetailField>
                {selectedItem.contacts && selectedItem.contacts.length > 0 && (
                  <DetailField label="ช่องทางติดต่อ">
                    <ul className="space-y-1">
                      {selectedItem.contacts.map((contact, idx) => (
                        <li key={`${contact.type}-${idx}`}>
                          {contact.type}: {contact.value}
                        </li>
                      ))}
                    </ul>
                  </DetailField>
                )}
              </>
            )}

            {isFoundItem(selectedItem) && (
              <>
                <DetailField label="รายละเอียด">
                  <p>{selectedItem.description}</p>
                </DetailField>
                <DetailField label="สถานที่เจอ">
                  <p>{selectedItem.locationFound}</p>
                </DetailField>
                <DetailField label="จุดส่งมอบ">
                  <p>{getDropOffLocationLabel(selectedItem.dropOffLocation, locations)}</p>
                </DetailField>
                {resolveHandoverDeadlineAt(selectedItem, appSettings) && (
                  <div className={cn(feedbackVariantStyles.warning.panelClass, "text-sm")}>
                    <p className={cn("font-medium", feedbackVariantStyles.warning.titleClass)}>
                      กำหนดส่งห้องบุคคลภายใน
                    </p>
                    <p className={cn("mt-1", feedbackVariantStyles.warning.messageClass)}>
                      {formatHandoverDeadlineThai(
                        resolveHandoverDeadlineAt(selectedItem, appSettings)!
                      )}
                    </p>
                    {isHandoverPastDeadline(selectedItem, appSettings) && (
                      <p className="text-red-800 dark:text-red-300 text-xs mt-2 font-medium">
                        เลยกำหนดเวลาแล้ว — ควรถูกตั้งเป็นหมดอายุ
                      </p>
                    )}
                  </div>
                )}
                {selectedItem.roomHandoverConfirmed && (
                  <div className="rounded-xl bg-line-green-light border border-line-green/35 p-3 text-sm">
                    <p className="font-medium text-line-green-dark dark:text-line-green">
                      ยืนยันถึงห้องบุคคลแล้ว
                    </p>
                    {selectedItem.roomHandoverConfirmedByName && (
                      <p className="text-line-green-dark/80 dark:text-line-green/80 mt-1">
                        โดย {selectedItem.roomHandoverConfirmedByName}
                        {selectedItem.roomHandoverConfirmedAt
                          ? ` • ${formatThaiDate(timestampToDate(selectedItem.roomHandoverConfirmedAt))}`
                          : ""}
                      </p>
                    )}
                  </div>
                )}
                {isFoundPendingRoomConfirm(selectedItem.status) &&
                  !isHandoverPastDeadline(selectedItem, appSettings) && (
                    <button
                      type="button"
                      onClick={() => void handleConfirmRoomHandover(selectedItem)}
                      disabled={busy}
                      className="w-full min-h-11 py-3 rounded-full bg-line-green-cta text-white font-semibold hover:bg-line-green-cta-hover active:bg-line-green-cta-hover disabled:opacity-50 flex items-center justify-center gap-2 motion-safe:transition-colors motion-safe:duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/35 focus-visible:ring-offset-2"
                    >
                      {updating ? (
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" aria-hidden />
                      )}
                      ยืนยันถึงห้องบุคคลแล้ว
                    </button>
                  )}
              </>
            )}

            <div>
              <p className="text-sm text-text-secondary mb-2" id="status-update-label">
                อัปเดตสถานะ
              </p>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-labelledby="status-update-label"
                aria-busy={updating}
              >
                {(isLostItem(selectedItem)
                  ? (["searching", "found", "claimed"] as ItemStatus[])
                  : (["pending_room_confirm", "found", "claimed"] as ItemStatus[])
                ).map((status) => {
                  const isCurrent = selectedItem.status === status;
                  const label =
                    isLostItem(selectedItem) && status === "found"
                      ? "พบของแล้ว"
                      : STATUS_CONFIG[status].label;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => void handleStatusUpdate(selectedItem, status)}
                      disabled={busy || isCurrent}
                      aria-pressed={isCurrent}
                      className={cn(
                        "min-h-11 px-4 py-2 rounded-full text-sm font-medium motion-safe:transition-colors motion-safe:duration-200 disabled:opacity-60",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/35 focus-visible:ring-offset-2",
                        isCurrent
                          ? `${STATUS_CONFIG[status].bgColor} ${STATUS_CONFIG[status].color} ring-2 ring-offset-2 ring-current`
                          : "bg-bg-tertiary text-text-secondary active:bg-border-light hover:bg-border-light"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {updating && (
                <p className="mt-2 text-sm text-text-secondary inline-flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                  กำลังอัปเดตสถานะ...
                </p>
              )}
            </div>
          </div>
        )}
      </ResponsiveModal>
      {dialog}
    </div>
  );
}
