import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility function สำหรับ merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// สร้าง Tracking Code แบบสุ่ม
// type: 'lost' | 'found' - determines prefix (LOST- or FOUND-)
export function generateTrackingCode(type: 'lost' | 'found' = 'lost'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const prefix = type === 'found' ? 'FOUND-' : 'LOST-';
  let code = prefix;
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Format วันที่เป็นภาษาไทย
export function formatThaiDate(date: Date): string {
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Format เวลา
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
