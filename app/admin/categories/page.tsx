"use client";

// Force dynamic rendering for security
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Loader2,
  Tags,
  MapPin,
  Phone,
  GripVertical,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { logConfigChanged } from "@/lib/logger";
import { useAuth } from "@/contexts/auth-context";
import { useAppDialog } from "@/hooks/use-app-dialog";

// Types
interface Category {
  id: string;
  value: string;
  label: string;
  icon: string;
  order: number;
  createdAt?: string;
}

interface Location {
  id: string;
  value: string;
  label: string;
  order: number;
  createdAt?: string;
}

interface ContactType {
  id: string;
  value: string;
  label: string;
  icon: string;
  placeholder: string;
  order: number;
  createdAt?: string;
}

// Default data (fallback)
const DEFAULT_CATEGORIES = [
  { value: "wallet", label: "กระเป๋าสตางค์", icon: "💰", order: 1 },
  { value: "phone", label: "โทรศัพท์", icon: "📱", order: 2 },
  { value: "keys", label: "กุญแจ", icon: "🔑", order: 3 },
  { value: "bag", label: "กระเป๋า", icon: "👜", order: 4 },
  { value: "electronics", label: "อิเล็กทรอนิกส์", icon: "💻", order: 5 },
  { value: "documents", label: "เอกสาร", icon: "📄", order: 6 },
  { value: "clothing", label: "เสื้อผ้า", icon: "👕", order: 7 },
  { value: "accessories", label: "เครื่องประดับ", icon: "💍", order: 8 },
  { value: "other", label: "อื่นๆ", icon: "📦", order: 9 },
];

const DEFAULT_LOCATIONS = [
  { value: "admin_office", label: "ห้องธุรการ", order: 1 },
  { value: "canteen", label: "โรงอาหาร", order: 2 },
  { value: "library", label: "ห้องสมุด", order: 3 },
  { value: "security", label: "ห้องรปภ.", order: 4 },
  { value: "building_1", label: "ตึก 1", order: 5 },
  { value: "building_2", label: "ตึก 2", order: 6 },
  { value: "field", label: "สนามกีฬา", order: 7 },
  { value: "parking", label: "ลานจอดรถ", order: 8 },
  { value: "other", label: "อื่นๆ", order: 9 },
];

const DEFAULT_CONTACT_TYPES = [
  { value: "phone", label: "เบอร์โทรศัพท์", icon: "📞", placeholder: "0812345678", order: 1 },
  { value: "line", label: "LINE ID", icon: "💬", placeholder: "@lineid", order: 2 },
  { value: "instagram", label: "Instagram", icon: "📷", placeholder: "@username", order: 3 },
  { value: "facebook", label: "Facebook", icon: "📘", placeholder: "ชื่อ Facebook", order: 4 },
  { value: "email", label: "Email", icon: "📧", placeholder: "email@example.com", order: 5 },
];

// Emoji picker options
const EMOJI_OPTIONS = ["💰", "📱", "🔑", "👜", "💻", "📄", "👕", "💍", "📦", "🎒", "⌚", "💳", "🎧", "📷", "🔋", "📚", "🎮", "⚽", "🎸", "💊"];
const CONTACT_EMOJI_OPTIONS = ["📞", "💬", "📷", "📘", "📧", "💌", "📲", "🔔", "✉️", "📨"];

export default function AdminCategoriesPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const { showAlert, showConfirm, dialog } = useAppDialog();
  const [activeTab, setActiveTab] = useState<"categories" | "locations" | "contacts">("categories");
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [contactTypes, setContactTypes] = useState<ContactType[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ value: "", label: "", icon: "📦", placeholder: "" });

  // Add new states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newForm, setNewForm] = useState({ value: "", label: "", icon: "📦", placeholder: "" });
  const [saving, setSaving] = useState(false);

  // Emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiTarget, setEmojiTarget] = useState<"new" | "edit">("new");

  const loadConfigData = async () => {
    const [categoriesResult, locationsResult, contactTypesResult] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order", { ascending: true }),
      supabase.from("locations").select("*").order("sort_order", { ascending: true }),
      supabase.from("contact_types").select("*").order("sort_order", { ascending: true }),
    ]);

    if (!categoriesResult.error) {
      if (!categoriesResult.data || categoriesResult.data.length === 0) {
        setCategories(DEFAULT_CATEGORIES.map((c, i) => ({ ...c, id: `default-${i}` })));
      } else {
        setCategories(
          categoriesResult.data.map((row) => ({
            id: String(row.id),
            value: String(row.value ?? ""),
            label: String(row.label ?? ""),
            icon: String(row.icon ?? "📦"),
            order: Number(row.sort_order ?? 0),
            createdAt: typeof row.created_at === "string" ? row.created_at : undefined,
          }))
        );
      }
    }

    if (!locationsResult.error) {
      if (!locationsResult.data || locationsResult.data.length === 0) {
        setLocations(DEFAULT_LOCATIONS.map((l, i) => ({ ...l, id: `default-${i}` })));
      } else {
        setLocations(
          locationsResult.data.map((row) => ({
            id: String(row.id),
            value: String(row.value ?? ""),
            label: String(row.label ?? ""),
            order: Number(row.sort_order ?? 0),
            createdAt: typeof row.created_at === "string" ? row.created_at : undefined,
          }))
        );
      }
    }

    if (!contactTypesResult.error) {
      if (!contactTypesResult.data || contactTypesResult.data.length === 0) {
        setContactTypes(DEFAULT_CONTACT_TYPES.map((c, i) => ({ ...c, id: `default-${i}` })));
      } else {
        setContactTypes(
          contactTypesResult.data.map((row) => ({
            id: String(row.id),
            value: String(row.value ?? ""),
            label: String(row.label ?? ""),
            icon: String(row.icon ?? "📞"),
            placeholder: String(row.placeholder ?? ""),
            order: Number(row.sort_order ?? 0),
            createdAt: typeof row.created_at === "string" ? row.created_at : undefined,
          }))
        );
      }
    }
  };

  // Load data
  useEffect(() => {
    let isMounted = true;
    void loadConfigData()
      .catch((error) => console.error("Error loading config data:", error))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    const channel = supabase
      .channel("admin-config-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => void loadConfigData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "locations" },
        () => void loadConfigData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contact_types" },
        () => void loadConfigData()
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  // Initialize defaults in Firestore
  const initializeDefaults = async () => {
    setSaving(true);
    try {
      const [catCount, locCount, contactCount] = await Promise.all([
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase.from("locations").select("id", { count: "exact", head: true }),
        supabase.from("contact_types").select("id", { count: "exact", head: true }),
      ]);

      if (!catCount.error && (catCount.count ?? 0) === 0) {
        await supabase.from("categories").insert(
          DEFAULT_CATEGORIES.map((cat) => ({
            value: cat.value,
            label: cat.label,
            icon: cat.icon,
            sort_order: cat.order,
            created_at: new Date().toISOString(),
          }))
        );
      }

      if (!locCount.error && (locCount.count ?? 0) === 0) {
        await supabase.from("locations").insert(
          DEFAULT_LOCATIONS.map((loc) => ({
            value: loc.value,
            label: loc.label,
            sort_order: loc.order,
            created_at: new Date().toISOString(),
          }))
        );
      }

      if (!contactCount.error && (contactCount.count ?? 0) === 0) {
        await supabase.from("contact_types").insert(
          DEFAULT_CONTACT_TYPES.map((ct) => ({
            value: ct.value,
            label: ct.label,
            icon: ct.icon,
            placeholder: ct.placeholder,
            sort_order: ct.order,
            created_at: new Date().toISOString(),
          }))
        );
      }

      void showAlert({
        title: "บันทึกสำเร็จ",
        message: "บันทึกค่าเริ่มต้นสำเร็จ",
        variant: "success",
      });
    } catch (error) {
      console.error("Error initializing defaults:", error);
      void showAlert({
        title: "บันทึกไม่สำเร็จ",
        message: "เกิดข้อผิดพลาด",
        variant: "error",
      });
    }
    setSaving(false);
  };

  // Add handlers for each type
  const handleAdd = async () => {
    if (!newForm.value.trim() || !newForm.label.trim()) {
      void showAlert({
        title: "ข้อมูลไม่ครบ",
        message: "กรุณากรอกข้อมูลให้ครบ",
        variant: "warning",
      });
      return;
    }

    setSaving(true);
    try {
      const tableName = activeTab === "categories" ? "categories" : activeTab === "locations" ? "locations" : "contact_types";
      const data: Record<string, unknown> = {
        value: newForm.value.toLowerCase().replace(/\s+/g, "_"),
        label: newForm.label,
        sort_order: (activeTab === "categories" ? categories : activeTab === "locations" ? locations : contactTypes).length + 1,
        created_at: new Date().toISOString(),
      };

      if (activeTab === "categories" || activeTab === "contacts") {
        data.icon = newForm.icon;
      }
      if (activeTab === "contacts") {
        data.placeholder = newForm.placeholder || "";
      }

      const { error } = await supabase.from(tableName).insert(data);
      if (error) throw error;
      await logConfigChanged("create", activeTab === "categories" ? "category" : activeTab === "locations" ? "location" : "contactType", newForm.label, user?.email || undefined);

      setNewForm({ value: "", label: "", icon: "📦", placeholder: "" });
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding:", error);
      void showAlert({
        title: "เพิ่มไม่สำเร็จ",
        message: "เกิดข้อผิดพลาด",
        variant: "error",
      });
    }
    setSaving(false);
  };

  // Update handler
  const handleUpdate = async (id: string) => {
    if (id.startsWith("default-")) {
      void showAlert({
        title: "ยังไม่พร้อมแก้ไข",
        message: "กรุณาบันทึกค่าเริ่มต้นก่อน",
        variant: "warning",
      });
      return;
    }

    setSaving(true);
    try {
      const tableName = activeTab === "categories" ? "categories" : activeTab === "locations" ? "locations" : "contact_types";
      const data: Record<string, unknown> = {
        value: editForm.value,
        label: editForm.label,
      };

      if (activeTab === "categories" || activeTab === "contacts") {
        data.icon = editForm.icon;
      }
      if (activeTab === "contacts") {
        data.placeholder = editForm.placeholder;
      }

      const { error } = await supabase.from(tableName).update(data).eq("id", id);
      if (error) throw error;
      await logConfigChanged("update", activeTab === "categories" ? "category" : activeTab === "locations" ? "location" : "contactType", editForm.label, user?.email || undefined);

      setEditingId(null);
    } catch (error) {
      console.error("Error updating:", error);
      void showAlert({
        title: "อัปเดตไม่สำเร็จ",
        message: "เกิดข้อผิดพลาด",
        variant: "error",
      });
    }
    setSaving(false);
  };

  // Delete handler
  const handleDelete = async (id: string, name: string) => {
    if (id.startsWith("default-")) {
      void showAlert({
        title: "ลบไม่ได้",
        message: "ไม่สามารถลบค่าเริ่มต้นได้ กรุณาบันทึกค่าเริ่มต้นก่อน",
        variant: "warning",
      });
      return;
    }

    const confirmed = await showConfirm({
      title: "ลบรายการ",
      message: `ต้องการลบ "${name}" หรือไม่?`,
      variant: "warning",
      confirmLabel: "ลบ",
    });
    if (!confirmed) return;

    try {
      const tableName = activeTab === "categories" ? "categories" : activeTab === "locations" ? "locations" : "contact_types";
      const { error } = await supabase.from(tableName).delete().eq("id", id);
      if (error) throw error;
      await logConfigChanged("delete", activeTab === "categories" ? "category" : activeTab === "locations" ? "location" : "contactType", name, user?.email || undefined);
    } catch (error) {
      console.error("Error deleting:", error);
      void showAlert({
        title: "ลบไม่สำเร็จ",
        message: "เกิดข้อผิดพลาด",
        variant: "error",
      });
    }
  };

  // Get current items based on active tab
  const getCurrentItems = () => {
    if (activeTab === "categories") return categories;
    if (activeTab === "locations") return locations;
    return contactTypes;
  };

  // Get tab label
  const getTabLabel = () => {
    if (activeTab === "categories") return "หมวดหมู่";
    if (activeTab === "locations") return "สถานที่";
    return "ช่องทางติดต่อ";
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">จัดการข้อมูล</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            เพิ่ม/ลบ หมวดหมู่, สถานที่, และช่องทางติดต่อ
          </p>
        </div>
        <button
          onClick={initializeDefaults}
          disabled={saving}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "บันทึกค่าเริ่มต้น"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => { setActiveTab("categories"); setShowAddForm(false); setEditingId(null); }}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all",
            activeTab === "categories"
              ? "bg-[#06C755] text-white"
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          )}
        >
          <Tags className="w-4 h-4" />
          หมวดหมู่
          <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs">{categories.length}</span>
        </button>
        <button
          onClick={() => { setActiveTab("locations"); setShowAddForm(false); setEditingId(null); }}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all",
            activeTab === "locations"
              ? "bg-[#06C755] text-white"
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          )}
        >
          <MapPin className="w-4 h-4" />
          สถานที่
          <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs">{locations.length}</span>
        </button>
        <button
          onClick={() => { setActiveTab("contacts"); setShowAddForm(false); setEditingId(null); }}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all",
            activeTab === "contacts"
              ? "bg-[#06C755] text-white"
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          )}
        >
          <Phone className="w-4 h-4" />
          ช่องทางติดต่อ
          <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs">{contactTypes.length}</span>
        </button>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Add Button */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <button
            onClick={() => {
              setShowAddForm(true);
              setNewForm({ value: "", label: "", icon: activeTab === "contacts" ? "📞" : "📦", placeholder: "" });
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#06C755] text-white rounded-xl font-medium hover:bg-[#05b34d] transition-colors"
          >
            <Plus className="w-5 h-5" />
            เพิ่ม{getTabLabel()}
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <div className="flex flex-wrap items-center gap-3">
              {/* Icon picker for categories and contacts */}
              {(activeTab === "categories" || activeTab === "contacts") && (
                <div className="relative">
                  <button
                    onClick={() => { setShowEmojiPicker(!showEmojiPicker); setEmojiTarget("new"); }}
                    className="w-12 h-12 rounded-xl bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 flex items-center justify-center text-2xl hover:border-[#06C755] transition-colors"
                  >
                    {newForm.icon}
                  </button>
                  {showEmojiPicker && emojiTarget === "new" && (
                    <div className="absolute top-14 left-0 z-10 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 grid grid-cols-5 gap-2 w-64">
                      {(activeTab === "contacts" ? CONTACT_EMOJI_OPTIONS : EMOJI_OPTIONS).map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => { setNewForm({ ...newForm, icon: emoji }); setShowEmojiPicker(false); }}
                          className="w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-xl transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <input
                type="text"
                value={newForm.label}
                onChange={(e) => setNewForm({ ...newForm, label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                placeholder={`ชื่อ${getTabLabel()}`}
                className="flex-1 min-w-[150px] px-4 py-3 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06C755] text-gray-900 dark:text-white"
              />
              {activeTab === "contacts" && (
                <input
                  type="text"
                  value={newForm.placeholder}
                  onChange={(e) => setNewForm({ ...newForm, placeholder: e.target.value })}
                  placeholder="Placeholder"
                  className="flex-1 min-w-[150px] px-4 py-3 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#06C755] text-gray-900 dark:text-white"
                />
              )}
              <button onClick={handleAdd} disabled={saving} className="px-4 py-3 bg-[#06C755] text-white rounded-xl font-medium hover:bg-[#05b34d] transition-colors">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              </button>
              <button onClick={() => setShowAddForm(false)} className="px-4 py-3 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {getCurrentItems().map((item: any) => (
            <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <GripVertical className="w-5 h-5 text-gray-300 cursor-grab" />

              {editingId === item.id ? (
                <>
                  {(activeTab === "categories" || activeTab === "contacts") && (
                    <div className="relative">
                      <button
                        onClick={() => { setShowEmojiPicker(!showEmojiPicker); setEmojiTarget("edit"); }}
                        className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-600 flex items-center justify-center text-xl"
                      >
                        {editForm.icon}
                      </button>
                      {showEmojiPicker && emojiTarget === "edit" && (
                        <div className="absolute top-12 left-0 z-10 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 grid grid-cols-5 gap-2 w-64">
                          {(activeTab === "contacts" ? CONTACT_EMOJI_OPTIONS : EMOJI_OPTIONS).map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => { setEditForm({ ...editForm, icon: emoji }); setShowEmojiPicker(false); }}
                              className="w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-xl transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {activeTab === "locations" && <MapPin className="w-5 h-5 text-[#06C755]" />}
                  <input
                    type="text"
                    value={editForm.label}
                    onChange={(e) => setEditForm({ ...editForm, label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                    className="flex-1 px-3 py-2 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755] text-gray-900 dark:text-white"
                  />
                  {activeTab === "contacts" && (
                    <input
                      type="text"
                      value={editForm.placeholder}
                      onChange={(e) => setEditForm({ ...editForm, placeholder: e.target.value })}
                      placeholder="Placeholder"
                      className="flex-1 px-3 py-2 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C755] text-gray-900 dark:text-white"
                    />
                  )}
                  <button onClick={() => handleUpdate(item.id)} disabled={saving} className="p-2 text-[#06C755] hover:bg-[#e8f8ef] dark:hover:bg-[#06C755]/20 rounded-lg">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <>
                  {activeTab === "categories" && <span className="text-2xl">{item.icon}</span>}
                  {activeTab === "locations" && <MapPin className="w-5 h-5 text-[#06C755]" />}
                  {activeTab === "contacts" && <span className="text-2xl">{item.icon}</span>}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                    <p className="text-sm text-gray-500">
                      {item.value}
                      {activeTab === "contacts" && item.placeholder && ` • ${item.placeholder}`}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingId(item.id);
                      setEditForm({ value: item.value, label: item.label, icon: item.icon || "📦", placeholder: item.placeholder || "" });
                    }}
                    className="p-2 text-gray-400 hover:text-[#06C755] hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(item.id, item.label)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
        <p className="text-sm text-blue-700 dark:text-blue-400">
          💡 <strong>หมายเหตุ:</strong> สถานที่จะใช้ร่วมกันทั้งในฟอร์ม "สถานที่หาย" และ "สถานที่ส่งคืน"
        </p>
      </div>
      {dialog}
    </div>
  );
}
