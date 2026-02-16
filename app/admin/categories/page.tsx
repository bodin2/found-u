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
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { logConfigChanged } from "@/lib/logger";
import { useAuth } from "@/contexts/auth-context";

// Types
interface Category {
  id: string;
  value: string;
  label: string;
  icon: string;
  order: number;
  createdAt?: any;
}

interface Location {
  id: string;
  value: string;
  label: string;
  order: number;
  createdAt?: any;
}

interface ContactType {
  id: string;
  value: string;
  label: string;
  icon: string;
  placeholder: string;
  order: number;
  createdAt?: any;
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
  const { user } = useAuth();
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

  // Load data
  useEffect(() => {
    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount >= 3) setLoading(false);
    };

    // Categories
    const unsubCategories = onSnapshot(
      query(collection(db, "categories"), orderBy("order", "asc")),
      (snapshot) => {
        if (snapshot.empty) {
          setCategories(DEFAULT_CATEGORIES.map((c, i) => ({ ...c, id: `default-${i}` })));
        } else {
          setCategories(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Category)));
        }
        checkLoaded();
      },
      () => checkLoaded()
    );

    // Global Locations (check both 'locations' and legacy 'dropOffLocations')
    const unsubLocations = onSnapshot(
      query(collection(db, "locations"), orderBy("order", "asc")),
      (snapshot) => {
        if (snapshot.empty) {
          // Fallback to legacy
          onSnapshot(
            query(collection(db, "dropOffLocations"), orderBy("order", "asc")),
            (legacySnapshot) => {
              if (legacySnapshot.empty) {
                setLocations(DEFAULT_LOCATIONS.map((l, i) => ({ ...l, id: `default-${i}` })));
              } else {
                setLocations(legacySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Location)));
              }
            }
          );
        } else {
          setLocations(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Location)));
        }
        checkLoaded();
      },
      () => checkLoaded()
    );

    // Contact Types
    const unsubContactTypes = onSnapshot(
      query(collection(db, "contactTypes"), orderBy("order", "asc")),
      (snapshot) => {
        if (snapshot.empty) {
          setContactTypes(DEFAULT_CONTACT_TYPES.map((c, i) => ({ ...c, id: `default-${i}` })));
        } else {
          setContactTypes(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ContactType)));
        }
        checkLoaded();
      },
      () => checkLoaded()
    );

    return () => {
      unsubCategories();
      unsubLocations();
      unsubContactTypes();
    };
  }, []);

  // Initialize defaults in Firestore
  const initializeDefaults = async () => {
    setSaving(true);
    try {
      // Categories
      const catSnapshot = await getDocs(collection(db, "categories"));
      if (catSnapshot.empty) {
        for (const cat of DEFAULT_CATEGORIES) {
          await addDoc(collection(db, "categories"), { ...cat, createdAt: serverTimestamp() });
        }
      }

      // Locations (use new 'locations' collection)
      const locSnapshot = await getDocs(collection(db, "locations"));
      if (locSnapshot.empty) {
        for (const loc of DEFAULT_LOCATIONS) {
          await addDoc(collection(db, "locations"), { ...loc, createdAt: serverTimestamp() });
        }
      }

      // Contact Types
      const contactSnapshot = await getDocs(collection(db, "contactTypes"));
      if (contactSnapshot.empty) {
        for (const ct of DEFAULT_CONTACT_TYPES) {
          await addDoc(collection(db, "contactTypes"), { ...ct, createdAt: serverTimestamp() });
        }
      }

      alert("บันทึกค่าเริ่มต้นสำเร็จ");
    } catch (error) {
      console.error("Error initializing defaults:", error);
      alert("เกิดข้อผิดพลาด");
    }
    setSaving(false);
  };

  // Add handlers for each type
  const handleAdd = async () => {
    if (!newForm.value.trim() || !newForm.label.trim()) {
      alert("กรุณากรอกข้อมูลให้ครบ");
      return;
    }

    setSaving(true);
    try {
      const collectionName = activeTab === "categories" ? "categories" : activeTab === "locations" ? "locations" : "contactTypes";
      const data: any = {
        value: newForm.value.toLowerCase().replace(/\s+/g, "_"),
        label: newForm.label,
        order: (activeTab === "categories" ? categories : activeTab === "locations" ? locations : contactTypes).length + 1,
        createdAt: serverTimestamp(),
      };

      if (activeTab === "categories" || activeTab === "contacts") {
        data.icon = newForm.icon;
      }
      if (activeTab === "contacts") {
        data.placeholder = newForm.placeholder || "";
      }

      await addDoc(collection(db, collectionName), data);
      await logConfigChanged("create", activeTab === "categories" ? "category" : activeTab === "locations" ? "location" : "contactType", newForm.label, user?.email || undefined);

      setNewForm({ value: "", label: "", icon: "📦", placeholder: "" });
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding:", error);
      alert("เกิดข้อผิดพลาด");
    }
    setSaving(false);
  };

  // Update handler
  const handleUpdate = async (id: string) => {
    if (id.startsWith("default-")) {
      alert("กรุณาบันทึกค่าเริ่มต้นก่อน");
      return;
    }

    setSaving(true);
    try {
      const collectionName = activeTab === "categories" ? "categories" : activeTab === "locations" ? "locations" : "contactTypes";
      const data: any = {
        value: editForm.value,
        label: editForm.label,
      };

      if (activeTab === "categories" || activeTab === "contacts") {
        data.icon = editForm.icon;
      }
      if (activeTab === "contacts") {
        data.placeholder = editForm.placeholder;
      }

      await updateDoc(doc(db, collectionName, id), data);
      await logConfigChanged("update", activeTab === "categories" ? "category" : activeTab === "locations" ? "location" : "contactType", editForm.label, user?.email || undefined);

      setEditingId(null);
    } catch (error) {
      console.error("Error updating:", error);
      alert("เกิดข้อผิดพลาด");
    }
    setSaving(false);
  };

  // Delete handler
  const handleDelete = async (id: string, name: string) => {
    if (id.startsWith("default-")) {
      alert("ไม่สามารถลบค่าเริ่มต้นได้ กรุณาบันทึกค่าเริ่มต้นก่อน");
      return;
    }

    if (!confirm(`ต้องการลบ "${name}" หรือไม่?`)) return;

    try {
      const collectionName = activeTab === "categories" ? "categories" : activeTab === "locations" ? "locations" : "contactTypes";
      await deleteDoc(doc(db, collectionName, id));
      await logConfigChanged("delete", activeTab === "categories" ? "category" : activeTab === "locations" ? "location" : "contactType", name, user?.email || undefined);
    } catch (error) {
      console.error("Error deleting:", error);
      alert("เกิดข้อผิดพลาด");
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
    </div>
  );
}
