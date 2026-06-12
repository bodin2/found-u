import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppSettings, ContactInfo, ItemCategory, NfcTagStatus } from "@/lib/types";
import { DEFAULT_APP_SETTINGS } from "@/lib/types";
import { generateNfcTagId } from "@/lib/utils";

export interface AuthUser {
  uid: string;
  email?: string;
}

export async function verifyAuthRequest(request: NextRequest): Promise<AuthUser | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return null;
    return { uid: data.user.id, email: data.user.email };
  } catch {
    return null;
  }
}

export async function getAppSettingsAdmin(): Promise<AppSettings> {
  const admin = createAdminClient();
  const { data } = await admin.from("app_settings").select("settings").eq("id", "default").maybeSingle();
  const settings = (data?.settings as Record<string, unknown> | null | undefined) || {};
  return { ...DEFAULT_APP_SETTINGS, ...settings } as AppSettings;
}

export async function isAdminUser(uid: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("role").eq("id", uid).maybeSingle();
  return data?.role === "admin";
}

export function normalizeTagId(tagId: string): string {
  return tagId.trim().toUpperCase();
}

export function buildTagPublicUrl(tagId: string, settings?: AppSettings): string {
  const base = settings?.nfcPublicBaseUrl?.replace(/\/$/, "") || "";
  if (base) return `${base}/nfc/t/${normalizeTagId(tagId)}`;
  return `/nfc/t/${normalizeTagId(tagId)}`;
}

export async function checkNfcFoundRateLimit(userId: string): Promise<{ allowed: boolean; message?: string }> {
  const admin = createAdminClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const { data: usage } = await admin
    .from("ai_usage")
    .select("endpoint")
    .eq("user_id", userId)
    .gte("timestamp", oneHourAgo.toISOString());

  const nfcCount = (usage || []).filter((entry) => entry.endpoint === "nfc-found").length;
  const limit = 20;
  if (nfcCount >= limit) {
    return {
      allowed: false,
      message: "คุณส่งรายงานพบของบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่",
    };
  }

  await admin.from("ai_usage").insert({
    user_id: userId,
    endpoint: "nfc-found",
    timestamp: new Date().toISOString(),
  });

  return { allowed: true };
}

export interface RegisterNfcTagInput {
  itemName: string;
  category: ItemCategory;
  description?: string;
  contacts: ContactInfo[];
  tagUid?: string;
  readOnlyLocked: boolean;
}

export async function registerNfcTagAdmin(
  ownerId: string,
  input: RegisterNfcTagInput
): Promise<{ tagId: string; tagUrl: string }> {
  const admin = createAdminClient();
  if (input.tagUid) {
    const { data: existing } = await admin.from("nfc_tags").select("id").eq("tag_uid", input.tagUid).limit(1);
    if ((existing?.length || 0) > 0) {
      throw new Error("tag_uid_already_registered");
    }
  }

  const settings = await getAppSettingsAdmin();
  if (settings.nfcEnabled === false) {
    throw new Error("nfc_disabled");
  }

  let tagId = generateNfcTagId();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existingDoc } = await admin.from("nfc_tags").select("id").eq("id", tagId).maybeSingle();
    if (!existingDoc) break;
    tagId = generateNfcTagId();
  }

  const tagUrl = buildTagPublicUrl(tagId, settings);

  await admin.from("nfc_tags").insert({
    id: tagId,
    owner_id: ownerId,
    item_name: input.itemName.trim(),
    category: input.category,
    description: input.description?.trim() || "",
    contacts: input.contacts,
    status: "active" as NfcTagStatus,
    read_only_locked: input.readOnlyLocked,
    ...(input.tagUid ? { tag_uid: input.tagUid } : {}),
    registered_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return { tagId, tagUrl };
}

export interface NfcTagPublicInfo {
  tagId: string;
  itemName: string;
  category: ItemCategory;
  description?: string;
  status: NfcTagStatus;
  isLost: boolean;
  ownerId: string;
}

export async function resolveNfcTagPublic(tagId: string): Promise<NfcTagPublicInfo | null> {
  const normalized = normalizeTagId(tagId);
  const admin = createAdminClient();
  const { data } = await admin.from("nfc_tags").select("*").eq("id", normalized).maybeSingle();
  if (!data || data.status === "disabled") return null;

  return {
    tagId: data.id,
    itemName: data.item_name,
    category: data.category,
    description: data.description,
    status: data.status,
    isLost: data.status === "lost",
    ownerId: data.owner_id,
  };
}

export interface CreateNfcFoundReportInput {
  tagId: string;
  finderUserId: string;
  finderMessage: string;
  locationFound?: string;
  locationCoords?: { lat: number; lng: number; accuracy?: number; source?: string };
  finderContacts?: ContactInfo[];
}

export async function createNfcFoundReportAdmin(input: CreateNfcFoundReportInput): Promise<string> {
  const admin = createAdminClient();
  const normalized = normalizeTagId(input.tagId);
  const { data: tagData } = await admin.from("nfc_tags").select("*").eq("id", normalized).maybeSingle();
  if (!tagData) {
    throw new Error("tag_not_found");
  }

  if (tagData.status === "disabled") {
    throw new Error("tag_disabled");
  }
  if (tagData.owner_id === input.finderUserId) {
    throw new Error("cannot_report_own_tag");
  }

  const { data: report, error: reportError } = await admin
    .from("nfc_found_reports")
    .insert({
      tag_id: normalized,
      owner_id: tagData.owner_id,
      finder_user_id: input.finderUserId,
      finder_message: input.finderMessage.trim(),
      ...(input.locationFound ? { location_found: input.locationFound.trim() } : {}),
      ...(input.locationCoords ? { location_coords: input.locationCoords } : {}),
      ...(input.finderContacts?.length ? { finder_contacts: input.finderContacts } : {}),
      status: "pending",
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (reportError) throw reportError;

  await admin
    .from("nfc_tags")
    .update({
      last_found_report_id: report.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", normalized);

  return report.id;
}

export async function updateNfcTagStatusAdmin(
  tagId: string,
  ownerId: string,
  status: NfcTagStatus,
  lostItemId?: string
): Promise<void> {
  const admin = createAdminClient();
  const normalized = normalizeTagId(tagId);
  const { data: tagData } = await admin.from("nfc_tags").select("*").eq("id", normalized).maybeSingle();
  if (!tagData) throw new Error("tag_not_found");

  const isOwner = tagData.owner_id === ownerId;
  const isAdmin = await isAdminUser(ownerId);
  if (!isOwner && !isAdmin) throw new Error("forbidden");

  await admin
    .from("nfc_tags")
    .update(
      stripUndefinedAdmin({
        status,
        ...(lostItemId ? { lost_item_id: lostItemId } : {}),
        updated_at: new Date().toISOString(),
      })
    )
    .eq("id", normalized);
}

function stripUndefinedAdmin<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    if (result[key] === undefined) delete result[key];
  }
  return result;
}

function adminTimestampToIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  return new Date().toISOString();
}

export async function getOwnerNfcDashboardAdmin(ownerId: string) {
  const admin = createAdminClient();
  const [{ data: tagsData }, { data: reportsData }] = await Promise.all([
    admin.from("nfc_tags").select("*").eq("owner_id", ownerId).order("registered_at", { ascending: false }),
    admin.from("nfc_found_reports").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false }),
  ]);

  const tags = (tagsData || []).map((data) => {
    return {
      id: data.id,
      tagUid: data.tag_uid,
      ownerId: data.owner_id,
      itemName: data.item_name,
      category: data.category,
      description: data.description,
      contacts: data.contacts || [],
      status: data.status,
      readOnlyLocked: data.read_only_locked ?? false,
      lostItemId: data.lost_item_id,
      lastFoundReportId: data.last_found_report_id,
      registeredAt: adminTimestampToIso(data.registered_at),
      updatedAt: adminTimestampToIso(data.updated_at),
    };
  });

  const reports = (reportsData || []).map((data) => {
    return {
      id: data.id,
      tagId: data.tag_id,
      ownerId: data.owner_id,
      finderUserId: data.finder_user_id,
      finderMessage: data.finder_message,
      locationFound: data.location_found,
      locationCoords: data.location_coords,
      finderContacts: data.finder_contacts,
      status: data.status,
      createdAt: adminTimestampToIso(data.created_at),
    };
  });

  return { tags, reports };
}

export async function updateNfcFoundReportStatusAdmin(
  reportId: string,
  ownerId: string,
  status: "viewed" | "resolved"
): Promise<void> {
  const admin = createAdminClient();
  const { data: report } = await admin
    .from("nfc_found_reports")
    .select("owner_id")
    .eq("id", reportId)
    .maybeSingle();
  if (!report) throw new Error("report_not_found");
  if (report.owner_id !== ownerId && !(await isAdminUser(ownerId))) {
    throw new Error("forbidden");
  }

  await admin.from("nfc_found_reports").update({ status }).eq("id", reportId);
}
