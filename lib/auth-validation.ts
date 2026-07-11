/** Client-safe auth field validation — mirrors rules in student-auth-server.ts */

export function normalizeStudentId(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return "";
  return digits.padStart(5, "0").slice(-5);
}

export function isValidStudentId(studentId: string): boolean {
  return /^\d{5}$/.test(normalizeStudentId(studentId));
}

export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

export function isValidNewPassword(password: string): boolean {
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password);
}

export const AUTH_VALIDATION_MESSAGES = {
  studentId: "กรุณากรอกเลขประจำตัว 5 หลัก",
  pin: "กรุณากรอก PIN 6 หลัก (ตัวเลขเท่านั้น)",
  passwordWeak: "รหัสผ่านต้องมีอย่างน้อย 8 ตัว พร้อมตัวอักษรและตัวเลข",
  passwordMismatch: "รหัสผ่านทั้งสองช่องไม่ตรงกัน",
  pinMismatch: "PIN ทั้งสองช่องไม่ตรงกัน",
  currentPasswordRequired: "กรุณากรอกรหัสผ่านปัจจุบัน",
  newPasswordRequired: "กรุณากรอกรหัสผ่านใหม่",
  schoolPasswordRequired: "กรุณากรอกรหัสผ่านจากโรงเรียน",
} as const;

export function validatePasswordPair(
  password: string,
  confirmPassword: string
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!isValidNewPassword(password)) {
    errors.password = AUTH_VALIDATION_MESSAGES.passwordWeak;
  }
  if (password !== confirmPassword) {
    errors.confirmPassword = AUTH_VALIDATION_MESSAGES.passwordMismatch;
  }
  return errors;
}

export function validatePinPair(pin: string, confirmPin: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!isValidPin(pin)) {
    errors.pin = AUTH_VALIDATION_MESSAGES.pin;
  }
  if (pin !== confirmPin) {
    errors.confirmPin = AUTH_VALIDATION_MESSAGES.pinMismatch;
  }
  return errors;
}

export function validateChangePasswordFields(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!currentPassword.trim()) {
    errors.currentPassword = AUTH_VALIDATION_MESSAGES.currentPasswordRequired;
  }
  if (!newPassword.trim()) {
    errors.newPassword = AUTH_VALIDATION_MESSAGES.newPasswordRequired;
  } else if (!isValidNewPassword(newPassword)) {
    errors.newPassword = AUTH_VALIDATION_MESSAGES.passwordWeak;
  }
  if (newPassword !== confirmPassword) {
    errors.confirmPassword = AUTH_VALIDATION_MESSAGES.passwordMismatch;
  }
  return errors;
}
