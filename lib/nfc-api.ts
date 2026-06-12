import { getSessionToken } from "@/lib/auth";
import type { ContactInfo, ItemCategory, NfcFoundReport, NfcTag, NfcTagStatus } from "@/lib/types";

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getSessionToken();
  if (!token) throw new Error("not_authenticated");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function registerNfcTagApi(input: {
  itemName: string;
  category: ItemCategory;
  description?: string;
  contacts: ContactInfo[];
  tagUid?: string;
  readOnlyLocked: boolean;
}): Promise<{ tagId: string; tagUrl: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/nfc/register", {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || "register_failed");
  }
  return data;
}

export interface NfcResolveResult {
  tag: {
    tagId: string;
    itemName: string;
    category: ItemCategory;
    description?: string;
    status: string;
    isLost: boolean;
  };
  isOwner: boolean;
}

export async function resolveNfcTagApi(tagId: string): Promise<NfcResolveResult> {
  const headers = await getAuthHeaders().catch(() => ({}));
  const res = await fetch(`/api/nfc/resolve?tag=${encodeURIComponent(tagId)}`, {
    headers,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || "resolve_failed");
  }
  return data;
}

export async function submitNfcFoundReportApi(input: {
  tagId: string;
  finderMessage: string;
  locationFound?: string;
  locationCoords?: { lat: number; lng: number; accuracy?: number; source?: string };
  finderContacts?: ContactInfo[];
}): Promise<{ reportId: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/nfc/found", {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || "submit_failed");
  }
  return data;
}

export async function updateNfcTagStatusApi(
  tagId: string,
  status: NfcTagStatus,
  lostItemId?: string
): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/nfc/tags/${encodeURIComponent(tagId)}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status, lostItemId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || "update_failed");
  }
}

function parseNfcTag(raw: NfcTag & { registeredAt: string; updatedAt: string }): NfcTag {
  return {
    ...raw,
    registeredAt: new Date(raw.registeredAt),
    updatedAt: new Date(raw.updatedAt),
  };
}

function parseNfcFoundReport(raw: NfcFoundReport & { createdAt: string }): NfcFoundReport {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
  };
}

export async function fetchMyNfcDashboardApi(): Promise<{
  tags: NfcTag[];
  reports: NfcFoundReport[];
}> {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/nfc/my-tags", { headers });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || "fetch_failed");
  }
  return {
    tags: (data.tags || []).map(parseNfcTag),
    reports: (data.reports || []).map(parseNfcFoundReport),
  };
}

export async function updateNfcReportStatusApi(
  reportId: string,
  status: "viewed" | "resolved"
): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/nfc/reports/${encodeURIComponent(reportId)}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || "update_failed");
  }
}
