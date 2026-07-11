import type { ZodError } from "zod";

export type FeedbackSeverity = "error" | "warning";
export type StatusAlertVariant = "error" | "warning" | "info" | "success";

export type ValidationIssue = {
  fieldId: string;
  fieldLabel: string;
  message: string;
  severity: FeedbackSeverity;
};

export const FIELD_LABELS_TH: Record<string, string> = {
  itemName: "ชื่อสิ่งของ",
  category: "ประเภท",
  description: "รายละเอียด",
  locationLost: "สถานที่ทำหาย",
  locationFound: "สถานที่เจอ",
  locationCoords: "พิกัดบนแผนที่",
  contacts: "ช่องทางติดต่อ",
  finderContacts: "ช่องทางติดต่อ",
  trackingCode: "รหัสติดตาม",
  image: "รูปภาพ",
  color: "สี",
  brand: "ยี่ห้อ",
  studentId: "เลขประจำตัว",
  password: "รหัสผ่าน",
  confirmPassword: "ยืนยันรหัสผ่าน",
  pin: "PIN",
  confirmPin: "ยืนยัน PIN",
  currentPassword: "รหัสผ่านปัจจุบัน",
  newPassword: "รหัสผ่านใหม่",
  schoolPassword: "รหัสผ่านจากโรงเรียน",
  firstName: "ชื่อ",
  lastName: "นามสกุล",
  email: "อีเมล",
  schoolName: "ชื่อโรงเรียน",
  adminPassword: "รหัสผ่านผู้ดูแล",
  confirmAdminPassword: "ยืนยันรหัสผ่านผู้ดูแล",
  provider: "ผู้ให้บริการ AI",
  geminiApiKey: "Gemini API key",
  openrouterApiKey: "OpenRouter API key",
  openrouterModel: "โมเดล OpenRouter",
  apiKey: "API Key",
  model: "โมเดล",
};

export function fieldId(name: string): string {
  return `field-${name}`;
}

export function fieldErrorId(name: string): string {
  return `${fieldId(name)}-error`;
}

export function getFieldLabel(name: string, overrides?: Record<string, string>): string {
  return overrides?.[name] ?? FIELD_LABELS_TH[name] ?? name;
}

export function recordToIssues(
  record: Record<string, string>,
  severity: FeedbackSeverity = "error",
  labelOverrides?: Record<string, string>
): ValidationIssue[] {
  return Object.entries(record)
    .filter(([, message]) => Boolean(message?.trim()))
    .map(([name, message]) => ({
      fieldId: fieldId(name),
      fieldLabel: getFieldLabel(name, labelOverrides),
      message,
      severity,
    }));
}

export function zodErrorToIssues(error: ZodError, labelOverrides?: Record<string, string>): ValidationIssue[] {
  return error.issues.map((issue) => {
    const name = String(issue.path[0] ?? "form");
    return {
      fieldId: fieldId(name),
      fieldLabel: getFieldLabel(name, labelOverrides),
      message: issue.message,
      severity: "error" as const,
    };
  });
}

export function getIssueMessage(issues: ValidationIssue[], fieldName: string): string | undefined {
  return issues.find((issue) => issue.fieldId === fieldId(fieldName))?.message;
}

/** Strip Zod/API field prefixes like `password: ` for user-facing alerts. */
export function humanizeFeedbackMessage(message: string): string {
  const stripped = message.replace(/^[a-zA-Z0-9_.]+:\s*/, "").trim();
  return stripped || message;
}

export const VALIDATION_SUMMARY_TITLES: Record<FeedbackSeverity, string> = {
  error: "กรุณาแก้ไขข้อมูลต่อไปนี้:",
  warning: "ข้อมูลเสริมที่ยังไม่ได้กรอก (ไม่บังคับ):",
};
