const STORAGE_KEY = "foundu_remembered_device";

export type RememberedDevice = {
  studentId: string;
  nickname?: string;
  firstName?: string;
};

export function getRememberedDevice(): RememberedDevice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RememberedDevice;
    if (!parsed?.studentId || !/^\d{5}$/.test(parsed.studentId)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setRememberedDevice(device: RememberedDevice): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      studentId: device.studentId,
      nickname: device.nickname,
      firstName: device.firstName,
    })
  );
}

export function clearRememberedDevice(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
