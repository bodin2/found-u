// Types สำหรับระบบ Found-U

// User Role
export type UserRole = 'user' | 'admin';

// App Settings (สำหรับ Admin ตั้งค่า)
export interface AppSettings {
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;

  // AI Rate Limit Settings (Per User)
  aiRateLimitEnabled?: boolean; // เปิด/ปิดระบบ rate limit
  aiRateLimitPerMinute?: number; // จำนวนครั้งต่อนาที per user
  aiRateLimitPerHour?: number; // จำนวนครั้งต่อชั่วโมง per user
  aiRateLimitMessage?: string; // ข้อความเมื่อถูก limit

  // System-wide AI Rate Limit (ทั้งระบบรวมกัน)
  systemAiRateLimitEnabled?: boolean; // เปิด/ปิด rate limit ระดับระบบ
  systemAiRateLimitPerMinute?: number; // จำนวนครั้งต่อนาทีของทั้งระบบ
  systemAiRateLimitPerHour?: number; // จำนวนครั้งต่อชั่วโมงของทั้งระบบ

  // AI Model Settings
  aiNerModel?: string; // โมเดลสำหรับ NER
  aiNerTemperature?: number;
  aiNerTopP?: number;
  aiNerMaxOutputTokens?: number;
  aiMatchingModel?: string; // โมเดลสำหรับ Matching
  aiMatchingTemperature?: number;
  aiMatchingTopP?: number;
  aiMatchingMaxOutputTokens?: number;

  // AI Vision Model Settings
  aiVisionModel?: string; // โมเดลสำหรับ Vision
  aiVisionTemperature?: number;
  aiVisionTopP?: number;
  aiVisionMaxOutputTokens?: number;

  // Agentic AI Settings
  agentProvider?: "gemini" | "openrouter" | "auto";
  agentFallbackProvider?: "gemini" | "openrouter";
  agentModel?: string;
  agentOpenRouterModel?: string;
  /** Lock OpenRouter to specific upstream providers (provider.order / only) */
  agentOpenRouterLockProvider?: boolean;
  /** OpenRouter provider slugs in priority order */
  agentOpenRouterProviderOrder?: string[];
  /** Allow OpenRouter to fail over to other providers for the same model */
  agentOpenRouterAllowFallbacks?: boolean;
  /** OpenRouter provider slugs to skip */
  agentOpenRouterProviderIgnore?: string[];
  /** OpenRouter reasoning effort; prefer none/minimal for agent chat */
  agentOpenRouterReasoningEffort?: "none" | "minimal" | "low" | "medium" | "high" | "xhigh";
  /** When not locking provider: route by price, throughput, or latency */
  agentOpenRouterProviderSort?: "price" | "throughput" | "latency";
  agentMaxSteps?: number;
  agentMaxOutputTokens?: number;
  agentTemperature?: number;
  agentContextMaxMessages?: number;
  agentContextMaxTokens?: number;
  agentContextStrategy?: "messages" | "tokens" | "hybrid";
  agentMemoryMaxFacts?: number;

  /** pg_trgm similarity threshold for fuzzy item search (0–1, default 0.15) */
  searchSimilarityThreshold?: number;

  // Map & Geofence Settings
  mapsEnabled?: boolean;
  mapTileUrl?: string;
  mapAttribution?: string;
  mapDefaultCenter?: GeoPoint;
  mapDefaultZoom?: number;
  mapSchoolBoundary?: GeoPoint[]; // Polygon points
  mapEnforceFoundInSchool?: boolean;

  // Notification settings
  notifyOnNewReport?: boolean;
  notifyOnStatusChange?: boolean;
  requireApproval?: boolean;

  /** กำหนดเวลานำของไปห้องบุคคลหลังแจ้งเจอ (เกินแล้วหมดอายุทันที) */
  foundHandoverDeadlineEnabled?: boolean;
  /** นาทีที่อนุญาตให้ส่งห้องบุคคล (ค่าเริ่มต้น 60 = 1 ชม.) */
  foundHandoverDeadlineMinutes?: number;

  // Storage settings
  autoDeleteDays?: number; // 0 = ไม่ลบอัตโนมัติ
  maxImageSize?: number; // MB สูงสุดก่อนอัปโหลด
  compressionQuality?: number; // 0.1–1 สำหรับบีบอัดรูป

  // NFC Tag settings
  nfcEnabled?: boolean;
  nfcPublicBaseUrl?: string;
  nfcRequireLoginToReport?: boolean;

  /** ปิดการเข้าสู่ระบบจากหน้า Landing (แสดง "พบกันเร็วๆนี้") */
  comingSoonEnabled?: boolean;
  comingSoonMessage?: string;

  // Other settings
  updatedAt?: Date;
  updatedBy?: string;
}

/** Verified minimum for multi-step agent replies (512 truncates Thai summaries). */
export const AGENT_DEFAULT_MAX_OUTPUT_TOKENS = 2048;

// Default settings
export const DEFAULT_APP_SETTINGS: AppSettings = {
  ogTitle: "Found-U | ระบบแจ้งของหาย-ของเจอ",
  ogDescription: "ระบบแจ้งของหายและของเจอสำหรับโรงเรียน โดยนร.บด.๒ - แจ้งง่าย ติดตามสะดวก",
  aiRateLimitEnabled: true,
  aiRateLimitPerMinute: 5,
  aiRateLimitPerHour: 30,
  aiRateLimitMessage: "คุณใช้งาน AI บ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่",
  systemAiRateLimitEnabled: true,
  systemAiRateLimitPerMinute: 20,
  systemAiRateLimitPerHour: 100,
  aiNerModel: "gemini-1.5-flash",
  aiNerTemperature: 0.1,
  aiNerTopP: 0.8,
  aiNerMaxOutputTokens: 256,
  aiMatchingModel: "gemini-1.5-flash",
  aiMatchingTemperature: 0.1,
  aiMatchingTopP: 0.8,
  aiMatchingMaxOutputTokens: 200,
  aiVisionModel: "gemini-1.5-flash",
  aiVisionTemperature: 0.1,
  aiVisionTopP: 0.8,
  aiVisionMaxOutputTokens: 256,
  agentProvider: "auto",
  agentFallbackProvider: "openrouter",
  agentModel: "gemini-2.0-flash",
  agentOpenRouterModel: "google/gemini-2.0-flash-exp:free",
  agentOpenRouterLockProvider: false,
  agentOpenRouterProviderOrder: [],
  agentOpenRouterAllowFallbacks: false,
  agentOpenRouterProviderIgnore: [],
  agentOpenRouterReasoningEffort: "none",
  agentOpenRouterProviderSort: "latency",
  agentMaxSteps: 4,
  agentMaxOutputTokens: 2048,
  agentTemperature: 0.3,
  agentContextMaxMessages: 8,
  agentContextMaxTokens: 6000,
  agentContextStrategy: "hybrid",
  agentMemoryMaxFacts: 5,
  searchSimilarityThreshold: 0.15,
  mapsEnabled: true,
  mapTileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  mapAttribution: "© OpenStreetMap contributors",
  mapDefaultCenter: { lat: 13.7563, lng: 100.5018 },
  mapDefaultZoom: 17,
  mapSchoolBoundary: [],
  mapEnforceFoundInSchool: true,
  notifyOnNewReport: true,
  notifyOnStatusChange: true,
  requireApproval: false,
  foundHandoverDeadlineEnabled: true,
  foundHandoverDeadlineMinutes: 60,
  autoDeleteDays: 30,
  maxImageSize: 5,
  compressionQuality: 0.8,
  nfcEnabled: true,
  nfcRequireLoginToReport: true,
  comingSoonEnabled: false,
  comingSoonMessage: "พบกันเร็วๆนี้",
};

// AI Rate Limit Usage Record
export interface AIUsageRecord {
  id: string;
  userId: string;
  timestamp: Date;
  endpoint: string; // 'ner' | 'match' etc.
}

// User Ban Status
export type BanStatus = 'none' | 'banned' | 'timeout';

export type StudentAuthMethod = 'password' | 'pin' | 'passkey';

export type StudentAccountStatus = 'active' | 'disabled';

export interface PasskeyCredentialRecord {
  credentialId: string;
  publicKey: string;
  counter: number;
  transports?: string[];
  createdAt?: Date;
}

// Roster นักเรียน (server-only collection)
export interface StudentAccount {
  studentId: string;
  firstName: string;
  lastName: string;
  nickname: string;
  gradeLevel?: string;
  roomNumber?: string;
  isRegistered: boolean;
  schoolPasswordHash?: string;
  currentPasswordHash?: string;
  mustChangePassword: boolean;
  hasLoggedInOnce: boolean;
  linkedUid?: string;
  pinHash?: string;
  passkeyCredentials?: PasskeyCredentialRecord[];
  status: StudentAccountStatus;
  importBatchId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminWhitelistEntry {
  email: string;
  addedBy: string;
  addedAt: Date;
  note?: string;
}

export interface ParsedStudentRosterRow {
  studentId: string;
  firstName: string;
  lastName: string;
  nickname: string;
  gradeLevel?: string;
  roomNumber?: string;
  password?: string;
  format: "legacy" | "roster";
  lineNumber: number;
}

/** @deprecated Use ParsedStudentRosterRow */
export interface ParsedStudentCsvRow {
  studentId: string;
  password: string;
  firstName: string;
  lastName: string;
  nickname: string;
  lineNumber: number;
}

export interface StudentImportSummary {
  created: number;
  updated: number;
  skipped: number;
  errors: { line: number; message: string }[];
}

// User ในระบบ
export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  studentId?: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  /** ชื่อที่ผู้ใช้ตั้งเองเพื่อแสดงในแอป (override ชื่อเล่นใน greeting/UI) */
  shownName?: string;
  isStudentVerified?: boolean;
  authMethods?: StudentAuthMethod[];
  mustChangePassword?: boolean;
  hasSeenTutorial?: boolean; // เคยดู Tutorial แล้วหรือยัง
  // Ban/Timeout fields
  banStatus?: BanStatus; // สถานะการแบน
  banReason?: string; // เหตุผลการแบน
  bannedAt?: Date; // วันที่ถูกแบน
  bannedBy?: string; // Admin ที่แบน
  timeoutUntil?: Date; // Timeout จนถึงวันที่
  createdAt: Date;
  updatedAt: Date;
}

// Error Log สำหรับเก็บ Errors ในระบบ
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorSource = 'client' | 'server' | 'api' | 'database' | 'unknown';

export interface ErrorLog {
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
  resolved?: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
}

// ช่องทางการติดต่อ
export type ContactType = 'phone' | 'line' | 'instagram' | 'facebook' | 'email';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export type LocationSource = 'gps' | 'map' | 'manual';

export interface LocationCoords extends GeoPoint {
  accuracy?: number;
  source?: LocationSource;
}

export interface ContactInfo {
  type: ContactType;
  value: string;
}

export const CONTACT_TYPES: { value: ContactType; label: string; icon: string; placeholder: string }[] = [
  { value: 'phone', label: 'เบอร์โทรศัพท์', icon: '📞', placeholder: '0812345678' },
  { value: 'line', label: 'LINE ID', icon: '💬', placeholder: '@lineid' },
  { value: 'instagram', label: 'Instagram', icon: '📷', placeholder: '@username' },
  { value: 'facebook', label: 'Facebook', icon: '📘', placeholder: 'ชื่อ Facebook' },
  { value: 'email', label: 'Email', icon: '📧', placeholder: 'email@example.com' },
];

// ประเภทของที่หาย
export type ItemCategory =
  | "wallet"      // กระเป๋าสตางค์
  | "phone"       // โทรศัพท์
  | "keys"        // กุญแจ
  | "bag"         // กระเป๋า
  | "electronics" // อุปกรณ์อิเล็กทรอนิกส์
  | "documents"   // เอกสาร
  | "clothing"    // เสื้อผ้า
  | "accessories" // เครื่องประดับ
  | "other";      // อื่นๆ

// สถานะของรายการ
export type ItemStatus =
  | "searching"              // กำลังตามหา (ของหาย)
  | "pending_room_confirm"   // แจ้งเจอแล้ว รอนำส่ง/ยืนยันที่ห้องบุคคล
  | "found"                  // ถึงห้องบุคคลแล้ว พร้อมให้เจ้าของมารับ
  | "claimed"                // รับคืนแล้ว
  | "expired";               // หมดอายุ

// สถานที่รับคืน / ส่งมอบ
export type DropOffLocation =
  | "personnel_office" // ห้องบุคคล (ห้องปกครอง) — จุดส่งมอบหลัก
  | "admin_office"     // ห้องธุรการ (ข้อมูลเก่า)
  | "canteen"          // โรงอาหาร
  | "library"          // ห้องสมุด
  | "security"         // ห้องรปภ.
  | "other";           // อื่นๆ

/** จุดส่งมอบเริ่มต้นสำหรับรายการของเจอใหม่ */
export const DEFAULT_FOUND_DROP_OFF_LOCATION: DropOffLocation = "personnel_office";

// NFC Tag status
export type NfcTagStatus = "active" | "lost" | "returned" | "disabled";

export interface NfcTag {
  id: string;
  tagUid?: string;
  ownerId: string;
  itemName: string;
  category: ItemCategory;
  description?: string;
  contacts: ContactInfo[];
  status: NfcTagStatus;
  readOnlyLocked: boolean;
  lostItemId?: string;
  lastFoundReportId?: string;
  registeredAt: Date;
  updatedAt: Date;
}

export type NfcFoundReportStatus = "pending" | "viewed" | "resolved";

export interface NfcFoundReport {
  id: string;
  tagId: string;
  ownerId: string;
  finderUserId: string;
  finderMessage: string;
  locationFound?: string;
  locationCoords?: LocationCoords;
  finderContacts?: ContactInfo[];
  status: NfcFoundReportStatus;
  createdAt: Date;
}

export const NFC_TAG_STATUS_CONFIG: Record<
  NfcTagStatus,
  { label: string; color: string; bgColor: string }
> = {
  active: {
    label: "ใช้งานปกติ",
    color: "text-[#06C755] dark:text-[#4ade80]",
    bgColor: "bg-[#e8f8ef] dark:bg-[#06C755]/20",
  },
  lost: {
    label: "แจ้งของหายแล้ว",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-900/30",
  },
  returned: {
    label: "ได้รับคืนแล้ว",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/30",
  },
  disabled: {
    label: "ปิดใช้งาน",
    color: "text-red-500 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-900/30",
  },
};

// รายการของหาย
export interface LostItem {
  id: string;
  trackingCode: string;
  itemName: string;
  category: ItemCategory;
  description?: string;
  locationLost: string;
  locationPlaceName?: string;
  locationCoords?: LocationCoords;
  dateLost: Date;
  contacts: ContactInfo[]; // ช่องทางการติดต่อ
  userId?: string; // Supabase Auth UID
  status: ItemStatus;
  createdAt: Date;
  updatedAt: Date;
  matchedFoundId?: string; // ID ของ FoundItem ที่ match
}

// รายการของเจอ
export interface FoundItem {
  id: string;
  trackingCode: string;
  photoUrl?: string;
  itemName?: string;
  category?: ItemCategory;
  color?: string | null;
  brand?: string | null;
  description: string;
  locationFound: string;
  locationPlaceName?: string;
  locationCoords?: LocationCoords;
  dateFound: Date;
  dropOffLocation: DropOffLocation;
  finderContacts?: ContactInfo[]; // ช่องทางการติดต่อผู้เจอ
  userId?: string; // Supabase Auth UID
  status: ItemStatus;
  /** ยืนยันโดยแอดมินว่าของถึงห้องบุคคลแล้ว */
  roomHandoverConfirmed?: boolean;
  roomHandoverConfirmedAt?: Date;
  roomHandoverConfirmedBy?: string;
  roomHandoverConfirmedByName?: string;
  /** เวลาที่ต้องนำของถึงห้องบุคคล (ถ้าเปิดใช้กำหนดเวลา) */
  handoverDeadlineAt?: Date;
  /** เวลาที่ระบบตั้งสถานะหมดอายุ */
  expiredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  matchedLostId?: string; // ID ของ LostItem ที่ match
}

/** Discriminate lost vs found — do not use `itemName` (found items may have it from AI). */
export function isLostItem(item: LostItem | FoundItem): item is LostItem {
  return "locationLost" in item;
}

export function isFoundItem(item: LostItem | FoundItem): item is FoundItem {
  return "locationFound" in item;
}

export function getItemDisplayName(item: LostItem | FoundItem): string {
  if (isLostItem(item)) return item.itemName;
  return item.itemName?.trim() || item.description;
}

// ข้อมูล Category สำหรับแสดงผล
export const CATEGORIES: { value: ItemCategory; label: string; icon: string }[] = [
  { value: "wallet", label: "กระเป๋าสตางค์", icon: "💰" },
  { value: "phone", label: "โทรศัพท์", icon: "📱" },
  { value: "keys", label: "กุญแจ", icon: "🔑" },
  { value: "bag", label: "กระเป๋า", icon: "👜" },
  { value: "electronics", label: "อิเล็กทรอนิกส์", icon: "💻" },
  { value: "documents", label: "เอกสาร", icon: "📄" },
  { value: "clothing", label: "เสื้อผ้า", icon: "👕" },
  { value: "accessories", label: "เครื่องประดับ", icon: "💍" },
  { value: "other", label: "อื่นๆ", icon: "📦" },
];

// ข้อมูล Drop-off Location
export const DROP_OFF_LOCATIONS: { value: DropOffLocation; label: string }[] = [
  { value: "personnel_office", label: "ห้องบุคคล (ห้องปกครอง)" },
  { value: "admin_office", label: "ห้องธุรการ" },
  { value: "canteen", label: "โรงอาหาร" },
  { value: "library", label: "ห้องสมุด" },
  { value: "security", label: "ห้องรปภ." },
  { value: "other", label: "อื่นๆ" },
];

export function getDropOffLocationLabel(
  value: DropOffLocation | string,
  customLocations?: { value: string; label: string }[]
): string {
  const fromStatic = DROP_OFF_LOCATIONS.find((d) => d.value === value)?.label;
  if (fromStatic) return fromStatic;
  const fromConfig = customLocations?.find((l) => l.value === value)?.label;
  if (fromConfig) return fromConfig;
  return String(value);
}

/** ของเจอพร้อมให้เจ้าของมารับ (หลังแอดมินยืนยันที่ห้องบุคคล) */
export function isFoundReadyForOwnerPickup(status: ItemStatus): boolean {
  return status === "found";
}

/** รายการของเจอที่ยังรอนำส่ง/ยืนยันที่ห้องบุคคล */
export function isFoundPendingRoomConfirm(status: ItemStatus): boolean {
  return status === "pending_room_confirm";
}

// สถานะสำหรับแสดงผล
export const STATUS_CONFIG: Record<ItemStatus, { label: string; color: string; bgColor: string }> = {
  searching: {
    label: "กำลังตามหา",
    color: "text-text-secondary",
    bgColor: "bg-bg-tertiary",
  },
  pending_room_confirm: {
    label: "รอส่งห้องบุคคล",
    color: "text-status-warning",
    bgColor: "bg-status-warning-light",
  },
  found: {
    label: "ถึงห้องบุคคลแล้ว",
    color: "text-line-green",
    bgColor: "bg-line-green-light dark:bg-line-green/20",
  },
  claimed: {
    label: "รับคืนแล้ว",
    color: "text-status-info",
    bgColor: "bg-status-info-light",
  },
  expired: {
    label: "หมดอายุ",
    color: "text-status-error",
    bgColor: "bg-status-error-light",
  },
};

/** ข้อความสถานะตามประเภทรายการ (ของหาย vs ของเจอ ใช้คำว่า found คนละความหมาย) */
export function getStatusDisplayConfig(
  status: ItemStatus,
  itemKind?: "lost" | "found"
): { label: string; color: string; bgColor: string } {
  const base = STATUS_CONFIG[status];
  if (itemKind === "lost" && status === "found") {
    return {
      label: "พบของแล้ว",
      color: base.color,
      bgColor: base.bgColor,
    };
  }
  return base;
}

export function getItemStatusConfig(item: LostItem | FoundItem): {
  label: string;
  color: string;
  bgColor: string;
} {
  return getStatusDisplayConfig(
    item.status,
    isLostItem(item) ? "lost" : "found"
  );
}
