// Types สำหรับระบบ BD2Fondue

// User Role
export type UserRole = 'user' | 'admin';

// Beta Tester Status
export type BetaStatus = 'none' | 'pending' | 'approved' | 'rejected';

// App Settings (สำหรับ Admin ตั้งค่า)
export interface AppSettings {
  // Beta/Restrict Mode
  restrictModeEnabled: boolean; // เปิด/ปิด ระบบ Restrict (Testing)
  betaRequestsEnabled: boolean; // เปิด/ปิด ให้ขอสิทธิ์ได้
  betaClosedMessage: string; // ข้อความเมื่อปิดรับสมัคร
  
  // OG Tags
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

  // Other settings
  updatedAt?: Date;
  updatedBy?: string;
}

// Default settings
export const DEFAULT_APP_SETTINGS: AppSettings = {
  restrictModeEnabled: true,
  betaRequestsEnabled: true,
  betaClosedMessage: "ขออภัย รอบนี้ปิดรับสมัครแล้ว กรุณารอรอบถัดไป",
  ogTitle: "BD2Fondue | ระบบแจ้งของหาย-ของเจอ",
  ogDescription: "ระบบแจ้งของหายและของเจอสำหรับโรงเรียน โดยนร.บด.๒ - แจ้งง่าย ติดตามสะดวก",
  aiRateLimitEnabled: true,
  aiRateLimitPerMinute: 5,
  aiRateLimitPerHour: 30,
  aiRateLimitMessage: "คุณใช้งาน AI บ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่",
  systemAiRateLimitEnabled: true,
  systemAiRateLimitPerMinute: 20,
  systemAiRateLimitPerHour: 100,
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

// User ในระบบ
export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  betaStatus: BetaStatus; // สถานะ Beta Tester
  betaRequestedAt?: Date; // วันที่ขอสิทธิ์
  betaApprovedAt?: Date; // วันที่ได้รับอนุมัติ
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
export type ErrorSource = 'client' | 'server' | 'api' | 'firebase' | 'unknown';

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
  | "searching"   // กำลังตามหา
  | "found"       // เจอแล้ว
  | "claimed"     // รับคืนแล้ว
  | "expired";    // หมดอายุ

// สถานที่รับคืน
export type DropOffLocation =
  | "admin_office"  // ห้องธุรการ
  | "canteen"       // โรงอาหาร
  | "library"       // ห้องสมุด
  | "security"      // ห้องรปภ.
  | "other";        // อื่นๆ

// รายการของหาย
export interface LostItem {
  id: string;
  trackingCode: string;
  itemName: string;
  category: ItemCategory;
  description?: string;
  locationLost: string;
  dateLost: Date;
  contacts: ContactInfo[]; // ช่องทางการติดต่อ
  userId?: string; // Firebase Auth UID
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
  description: string;
  locationFound: string;
  dateFound: Date;
  dropOffLocation: DropOffLocation;
  finderContacts?: ContactInfo[]; // ช่องทางการติดต่อผู้เจอ
  userId?: string; // Firebase Auth UID
  status: ItemStatus;
  createdAt: Date;
  updatedAt: Date;
  matchedLostId?: string; // ID ของ LostItem ที่ match
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
  { value: "admin_office", label: "ห้องธุรการ" },
  { value: "canteen", label: "โรงอาหาร" },
  { value: "library", label: "ห้องสมุด" },
  { value: "security", label: "ห้องรปภ." },
  { value: "other", label: "อื่นๆ" },
];

// สถานะสำหรับแสดงผล
export const STATUS_CONFIG: Record<ItemStatus, { label: string; color: string; bgColor: string }> = {
  searching: {
    label: "กำลังตามหา",
    color: "text-gray-600 dark:text-gray-300",
    bgColor: "bg-gray-100 dark:bg-gray-800"
  },
  found: {
    label: "เจอแล้ว",
    color: "text-[#06C755] dark:text-[#4ade80]",
    bgColor: "bg-[#e8f8ef] dark:bg-[#06C755]/20"
  },
  claimed: {
    label: "รับคืนแล้ว",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/30"
  },
  expired: {
    label: "หมดอายุ",
    color: "text-red-500 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-900/30"
  },
};
