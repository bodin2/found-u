import type { FoundItem, LostItem } from "@/lib/types";

export type AdminMatchPair = {
  key: string;
  score: number;
  scorePercentage: number;
  confidence: "high" | "medium" | "low";
  reasons: string[];
  lostItem: LostItem;
  foundItem: FoundItem;
};

export type ConfirmedHistoryPair = {
  key: string;
  lostItem: LostItem;
  foundItem: FoundItem;
  matchedAt: string | Date;
};

export type MatchBatchResponse = {
  matches: AdminMatchPair[];
  total: number;
  pool: { lost: number; found: number; highConfidence: number };
  useAI: boolean;
  history: ConfirmedHistoryPair[];
};

async function authHeaders(getToken: () => Promise<string>): Promise<HeadersInit> {
  const token = await getToken();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function fetchMatchBatch(
  getToken: () => Promise<string>,
  options?: { useAI?: boolean }
): Promise<MatchBatchResponse> {
  const res = await fetch("/api/match/batch", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({
      useAI: Boolean(options?.useAI),
      includeHistory: true,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "โหลดคิวจับคู่ไม่สำเร็จ");
  }
  return res.json();
}

export async function fetchItemMatches(
  getToken: () => Promise<string>,
  type: "lost" | "found",
  itemId: string,
  useAI = false
): Promise<AdminMatchPair[]> {
  const res = await fetch("/api/match", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ type, itemId, useAI }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "ค้นหาคู่ไม่สำเร็จ");
  }
  const data = await res.json();
  return data.matches || [];
}

export async function confirmMatchApi(
  getToken: () => Promise<string>,
  lostId: string,
  foundId: string
): Promise<void> {
  const res = await fetch("/api/match/confirm", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ lostId, foundId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "ยืนยันจับคู่ไม่สำเร็จ");
  }
}

export async function rejectMatchApi(
  getToken: () => Promise<string>,
  lostId: string,
  foundId: string
): Promise<void> {
  const res = await fetch("/api/match/reject", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ lostId, foundId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "ปฏิเสธคู่ไม่สำเร็จ");
  }
}

export async function unmatchPairApi(
  getToken: () => Promise<string>,
  lostId: string,
  foundId: string
): Promise<void> {
  const res = await fetch("/api/match/unmatch", {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ lostId, foundId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "ถอนจับคู่ไม่สำเร็จ");
  }
}
