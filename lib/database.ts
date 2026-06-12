import { createClient } from "@/lib/supabase/client";
import { coerceToDate, normalizeGeoPoint, normalizeGeoPolygon } from "@/lib/utils";
import { stripUndefined } from "@/lib/strip-undefined";
import {
  DEFAULT_APP_SETTINGS,
  type AIUsageRecord,
  type AppSettings,
  type AppUser,
  type BanStatus,
  type ContactInfo,
  type ContactType,
  type FoundItem,
  type ItemCategory,
  type ItemStatus,
  type LostItem,
  type NfcFoundReport,
  type NfcFoundReportStatus,
  type NfcTag,
  type NfcTagStatus,
  type UserRole,
} from "@/lib/types";
import type { Json } from "@/lib/database.types";
import { createFoundItemSchema, createLostItemSchema } from "@/lib/validations/items";

type SupabaseConstraint<T> = (query: T) => T;

type DbRow = Record<string, unknown>;

// Table names (kept in COLLECTIONS for compatibility with firestore.ts usage)
export const COLLECTIONS = {
  LOST_ITEMS: "lost_items",
  FOUND_ITEMS: "found_items",
  USERS: "profiles",
  SETTINGS: "app_settings",
  AI_USAGE: "ai_usage",
  ERROR_LOGS: "error_logs",
  NFC_TAGS: "nfc_tags",
  NFC_FOUND_REPORTS: "nfc_found_reports",
} as const;

const APP_SETTINGS_DOC_ID = "default";

function toIso(value: unknown): string {
  return timestampToDate(value).toISOString();
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNullableString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNullableBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function mapAppUserRow(row: DbRow): AppUser {
  return {
    uid: asString(row.id),
    email: asString(row.email),
    displayName: asString(row.display_name),
    photoURL: asNullableString(row.photo_url),
    role: (asString(row.role) || "user") as UserRole,
    studentId: asNullableString(row.student_id),
    firstName: asNullableString(row.first_name),
    lastName: asNullableString(row.last_name),
    nickname: asNullableString(row.nickname),
    shownName: asNullableString(row.shown_name),
    isStudentVerified:
      asNullableBoolean(row.is_student_verified) ??
      ((asString(row.role) === "admin" || !!asNullableString(row.student_id)) ? true : undefined),
    authMethods: Array.isArray(row.auth_methods)
      ? (row.auth_methods as AppUser["authMethods"])
      : undefined,
    mustChangePassword: asNullableBoolean(row.must_change_password),
    hasSeenTutorial: asNullableBoolean(row.has_seen_tutorial) ?? false,
    banStatus: ((asString(row.ban_status) || "none") as BanStatus),
    banReason: asNullableString(row.ban_reason),
    bannedAt: row.banned_at ? timestampToDate(row.banned_at) : undefined,
    bannedBy: asNullableString(row.banned_by),
    timeoutUntil: row.timeout_until ? timestampToDate(row.timeout_until) : undefined,
    createdAt: timestampToDate(row.created_at),
    updatedAt: timestampToDate(row.updated_at),
  };
}

function mapLostItemRow(row: DbRow): LostItem {
  return {
    id: asString(row.id),
    trackingCode: asString(row.tracking_code),
    itemName: asString(row.item_name),
    category: asString(row.category) as ItemCategory,
    description: asNullableString(row.description),
    locationLost: asString(row.location_lost),
    locationPlaceName: asNullableString(row.location_place_name),
    locationCoords: row.location_coords as LostItem["locationCoords"],
    dateLost: timestampToDate(row.date_lost),
    contacts: (Array.isArray(row.contacts) ? row.contacts : []) as ContactInfo[],
    userId: asNullableString(row.user_id),
    status: asString(row.status) as ItemStatus,
    createdAt: timestampToDate(row.created_at),
    updatedAt: timestampToDate(row.updated_at),
    matchedFoundId: asNullableString(row.matched_found_id),
  };
}

function mapFoundItemRow(row: DbRow): FoundItem {
  return {
    id: asString(row.id),
    trackingCode: asString(row.tracking_code),
    photoUrl: asNullableString(row.photo_url),
    itemName: asNullableString(row.item_name),
    category: asNullableString(row.category) as ItemCategory | undefined,
    color: typeof row.color === "string" || row.color === null ? row.color : undefined,
    brand: typeof row.brand === "string" || row.brand === null ? row.brand : undefined,
    description: asString(row.description),
    locationFound: asString(row.location_found),
    locationPlaceName: asNullableString(row.location_place_name),
    locationCoords: row.location_coords as FoundItem["locationCoords"],
    dateFound: timestampToDate(row.date_found),
    dropOffLocation: asString(row.drop_off_location) as FoundItem["dropOffLocation"],
    finderContacts: (Array.isArray(row.finder_contacts)
      ? row.finder_contacts
      : undefined) as FoundItem["finderContacts"],
    userId: asNullableString(row.user_id),
    status: asString(row.status) as ItemStatus,
    roomHandoverConfirmed: row.room_handover_confirmed === true,
    roomHandoverConfirmedAt: row.room_handover_confirmed_at
      ? timestampToDate(row.room_handover_confirmed_at)
      : undefined,
    roomHandoverConfirmedBy: asNullableString(row.room_handover_confirmed_by),
    roomHandoverConfirmedByName: asNullableString(row.room_handover_confirmed_by_name),
    handoverDeadlineAt: row.handover_deadline_at ? timestampToDate(row.handover_deadline_at) : undefined,
    expiredAt: row.expired_at ? timestampToDate(row.expired_at) : undefined,
    createdAt: timestampToDate(row.created_at),
    updatedAt: timestampToDate(row.updated_at),
    matchedLostId: asNullableString(row.matched_lost_id),
  };
}

function mapNfcTagRow(row: DbRow): NfcTag {
  return {
    id: asString(row.id),
    tagUid: asNullableString(row.tag_uid),
    ownerId: asString(row.owner_id),
    itemName: asString(row.item_name),
    category: asString(row.category) as ItemCategory,
    description: asNullableString(row.description),
    contacts: (Array.isArray(row.contacts) ? row.contacts : []) as ContactInfo[],
    status: asString(row.status) as NfcTagStatus,
    readOnlyLocked: row.read_only_locked === true,
    lostItemId: asNullableString(row.lost_item_id),
    lastFoundReportId: asNullableString(row.last_found_report_id),
    registeredAt: timestampToDate(row.registered_at),
    updatedAt: timestampToDate(row.updated_at),
  };
}

function mapNfcFoundReportRow(row: DbRow): NfcFoundReport {
  return {
    id: asString(row.id),
    tagId: asString(row.tag_id),
    ownerId: asString(row.owner_id),
    finderUserId: asString(row.finder_user_id),
    finderMessage: asString(row.finder_message),
    locationFound: asNullableString(row.location_found),
    locationCoords: row.location_coords as NfcFoundReport["locationCoords"],
    finderContacts: (Array.isArray(row.finder_contacts)
      ? row.finder_contacts
      : undefined) as NfcFoundReport["finderContacts"],
    status: asString(row.status) as NfcFoundReportStatus,
    createdAt: timestampToDate(row.created_at),
  };
}

function mapAppSettingsFromRow(row: DbRow | null): AppSettings {
  if (!row) return DEFAULT_APP_SETTINGS;

  const settingsBlob = row.settings && typeof row.settings === "object" ? (row.settings as DbRow) : {};
  const mapCenter =
    normalizeGeoPoint(settingsBlob.mapDefaultCenter) ||
    normalizeGeoPoint(settingsBlob.map_default_center) ||
    DEFAULT_APP_SETTINGS.mapDefaultCenter;

  const updatedAt = settingsBlob.updatedAt ?? settingsBlob.updated_at ?? row.updated_at;
  const updatedBy = settingsBlob.updatedBy ?? settingsBlob.updated_by ?? row.updated_by;

  return {
    ogTitle: (settingsBlob.ogTitle as string) || DEFAULT_APP_SETTINGS.ogTitle,
    ogDescription: (settingsBlob.ogDescription as string) || DEFAULT_APP_SETTINGS.ogDescription,
    ogImage: (settingsBlob.ogImage as string) || DEFAULT_APP_SETTINGS.ogImage,
    aiRateLimitEnabled:
      (settingsBlob.aiRateLimitEnabled as boolean | undefined) ?? DEFAULT_APP_SETTINGS.aiRateLimitEnabled,
    aiRateLimitPerMinute:
      (settingsBlob.aiRateLimitPerMinute as number | undefined) ?? DEFAULT_APP_SETTINGS.aiRateLimitPerMinute,
    aiRateLimitPerHour:
      (settingsBlob.aiRateLimitPerHour as number | undefined) ?? DEFAULT_APP_SETTINGS.aiRateLimitPerHour,
    aiRateLimitMessage:
      (settingsBlob.aiRateLimitMessage as string | undefined) ?? DEFAULT_APP_SETTINGS.aiRateLimitMessage,
    systemAiRateLimitEnabled:
      (settingsBlob.systemAiRateLimitEnabled as boolean | undefined) ??
      DEFAULT_APP_SETTINGS.systemAiRateLimitEnabled,
    systemAiRateLimitPerMinute:
      (settingsBlob.systemAiRateLimitPerMinute as number | undefined) ??
      DEFAULT_APP_SETTINGS.systemAiRateLimitPerMinute,
    systemAiRateLimitPerHour:
      (settingsBlob.systemAiRateLimitPerHour as number | undefined) ??
      DEFAULT_APP_SETTINGS.systemAiRateLimitPerHour,
    aiNerModel: (settingsBlob.aiNerModel as string) || DEFAULT_APP_SETTINGS.aiNerModel,
    aiNerTemperature:
      (settingsBlob.aiNerTemperature as number | undefined) ?? DEFAULT_APP_SETTINGS.aiNerTemperature,
    aiNerTopP: (settingsBlob.aiNerTopP as number | undefined) ?? DEFAULT_APP_SETTINGS.aiNerTopP,
    aiNerMaxOutputTokens:
      (settingsBlob.aiNerMaxOutputTokens as number | undefined) ?? DEFAULT_APP_SETTINGS.aiNerMaxOutputTokens,
    aiMatchingModel: (settingsBlob.aiMatchingModel as string) || DEFAULT_APP_SETTINGS.aiMatchingModel,
    aiMatchingTemperature:
      (settingsBlob.aiMatchingTemperature as number | undefined) ?? DEFAULT_APP_SETTINGS.aiMatchingTemperature,
    aiMatchingTopP:
      (settingsBlob.aiMatchingTopP as number | undefined) ?? DEFAULT_APP_SETTINGS.aiMatchingTopP,
    aiMatchingMaxOutputTokens:
      (settingsBlob.aiMatchingMaxOutputTokens as number | undefined) ??
      DEFAULT_APP_SETTINGS.aiMatchingMaxOutputTokens,
    aiVisionModel: (settingsBlob.aiVisionModel as string) || DEFAULT_APP_SETTINGS.aiVisionModel,
    aiVisionTemperature:
      (settingsBlob.aiVisionTemperature as number | undefined) ?? DEFAULT_APP_SETTINGS.aiVisionTemperature,
    aiVisionTopP: (settingsBlob.aiVisionTopP as number | undefined) ?? DEFAULT_APP_SETTINGS.aiVisionTopP,
    aiVisionMaxOutputTokens:
      (settingsBlob.aiVisionMaxOutputTokens as number | undefined) ?? DEFAULT_APP_SETTINGS.aiVisionMaxOutputTokens,
    mapsEnabled: (settingsBlob.mapsEnabled as boolean | undefined) ?? DEFAULT_APP_SETTINGS.mapsEnabled,
    mapTileUrl: (settingsBlob.mapTileUrl as string) || DEFAULT_APP_SETTINGS.mapTileUrl,
    mapAttribution: (settingsBlob.mapAttribution as string) || DEFAULT_APP_SETTINGS.mapAttribution,
    mapDefaultCenter: mapCenter,
    mapDefaultZoom: (settingsBlob.mapDefaultZoom as number | undefined) ?? DEFAULT_APP_SETTINGS.mapDefaultZoom,
    mapSchoolBoundary: normalizeGeoPolygon(settingsBlob.mapSchoolBoundary ?? settingsBlob.map_school_boundary),
    mapEnforceFoundInSchool:
      (settingsBlob.mapEnforceFoundInSchool as boolean | undefined) ??
      DEFAULT_APP_SETTINGS.mapEnforceFoundInSchool,
    notifyOnNewReport:
      (settingsBlob.notifyOnNewReport as boolean | undefined) ?? DEFAULT_APP_SETTINGS.notifyOnNewReport,
    notifyOnStatusChange:
      (settingsBlob.notifyOnStatusChange as boolean | undefined) ?? DEFAULT_APP_SETTINGS.notifyOnStatusChange,
    requireApproval: (settingsBlob.requireApproval as boolean | undefined) ?? DEFAULT_APP_SETTINGS.requireApproval,
    foundHandoverDeadlineEnabled:
      (settingsBlob.foundHandoverDeadlineEnabled as boolean | undefined) ??
      DEFAULT_APP_SETTINGS.foundHandoverDeadlineEnabled,
    foundHandoverDeadlineMinutes:
      (settingsBlob.foundHandoverDeadlineMinutes as number | undefined) ??
      DEFAULT_APP_SETTINGS.foundHandoverDeadlineMinutes,
    autoDeleteDays: (settingsBlob.autoDeleteDays as number | undefined) ?? DEFAULT_APP_SETTINGS.autoDeleteDays,
    maxImageSize: (settingsBlob.maxImageSize as number | undefined) ?? DEFAULT_APP_SETTINGS.maxImageSize,
    compressionQuality:
      (settingsBlob.compressionQuality as number | undefined) ?? DEFAULT_APP_SETTINGS.compressionQuality,
    nfcEnabled: (settingsBlob.nfcEnabled as boolean | undefined) ?? DEFAULT_APP_SETTINGS.nfcEnabled,
    nfcPublicBaseUrl: (settingsBlob.nfcPublicBaseUrl as string) || DEFAULT_APP_SETTINGS.nfcPublicBaseUrl,
    nfcRequireLoginToReport:
      (settingsBlob.nfcRequireLoginToReport as boolean | undefined) ??
      DEFAULT_APP_SETTINGS.nfcRequireLoginToReport,
    updatedAt: updatedAt ? timestampToDate(updatedAt) : undefined,
    updatedBy: typeof updatedBy === "string" ? updatedBy : undefined,
  };
}

function applyConstraints<T>(query: T, constraints: SupabaseConstraint<T>[]): T {
  return constraints.reduce((acc, modifier) => modifier(acc), query);
}

function createRealtimeSubscription(options: {
  table: string;
  onFetch: () => Promise<void>;
  filter?: string;
  onError?: (error: Error) => void;
}): () => void {
  const supabase = createClient();
  const channelName = `${options.table}-${Math.random().toString(36).slice(2)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: options.table,
        ...(options.filter ? { filter: options.filter } : {}),
      },
      () => {
        void options.onFetch().catch((error) => {
          options.onError?.(error as Error);
        });
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void options.onFetch().catch((error) => {
          options.onError?.(error as Error);
        });
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}

// ========================================
// Users
// ========================================

export async function createOrUpdateUser(userData: {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}) {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from(COLLECTIONS.USERS)
    .select("*")
    .eq("id", userData.uid)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from(COLLECTIONS.USERS)
      .update(
        stripUndefined({
          email: userData.email,
          display_name: userData.displayName,
          photo_url: userData.photoURL,
          updated_at: new Date().toISOString(),
        })
      )
      .eq("id", userData.uid);
    if (error) throw error;
  } else {
    const now = new Date().toISOString();
    const { error } = await supabase.from(COLLECTIONS.USERS).insert(
      stripUndefined({
        id: userData.uid,
        email: userData.email,
        display_name: userData.displayName,
        photo_url: userData.photoURL,
        role: "user",
        ban_status: "none",
        has_seen_tutorial: false,
        created_at: now,
        updated_at: now,
      })
    );
    if (error) throw error;
  }

  const user = await getUser(userData.uid);
  if (!user) {
    throw new Error("Failed to create or fetch user");
  }
  return user;
}

export async function getUser(uid: string): Promise<AppUser | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(COLLECTIONS.USERS)
    .select("*")
    .eq("id", uid)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapAppUserRow(data as DbRow);
}

export async function updateUserRole(uid: string, role: UserRole) {
  const supabase = createClient();
  const { error } = await supabase
    .from(COLLECTIONS.USERS)
    .update({
      role,
      updated_at: new Date().toISOString(),
    })
    .eq("id", uid);
  if (error) throw error;
}

export async function getAllUsers(): Promise<AppUser[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(COLLECTIONS.USERS)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapAppUserRow(row as DbRow));
}

export function subscribeToUser(
  uid: string,
  callback: (user: AppUser | null) => void,
  onError?: (error: Error) => void
) {
  return createRealtimeSubscription({
    table: COLLECTIONS.USERS,
    filter: `id=eq.${uid}`,
    onFetch: async () => {
      const user = await getUser(uid);
      callback(user);
    },
    onError,
  });
}

// ========================================
// Tutorial
// ========================================

export async function updateUserTutorialSeen(uid: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from(COLLECTIONS.USERS)
    .update({
      has_seen_tutorial: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", uid);
  if (error) throw error;
}

// ========================================
// User Ban/Timeout Management
// ========================================

export async function banUser(uid: string, reason: string, bannedBy: string): Promise<void> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from(COLLECTIONS.USERS)
    .update({
      ban_status: "banned" as BanStatus,
      ban_reason: reason,
      banned_at: now,
      banned_by: bannedBy,
      timeout_until: null,
      updated_at: now,
    })
    .eq("id", uid);
  if (error) throw error;
}

export async function unbanUser(uid: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from(COLLECTIONS.USERS)
    .update({
      ban_status: "none" as BanStatus,
      ban_reason: null,
      banned_at: null,
      banned_by: null,
      timeout_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", uid);
  if (error) throw error;
}

export async function timeoutUser(
  uid: string,
  durationMinutes: number,
  reason: string,
  bannedBy: string
): Promise<void> {
  const supabase = createClient();
  const timeoutUntil = new Date();
  timeoutUntil.setMinutes(timeoutUntil.getMinutes() + durationMinutes);

  const now = new Date().toISOString();
  const { error } = await supabase
    .from(COLLECTIONS.USERS)
    .update({
      ban_status: "timeout" as BanStatus,
      ban_reason: reason,
      banned_at: now,
      banned_by: bannedBy,
      timeout_until: timeoutUntil.toISOString(),
      updated_at: now,
    })
    .eq("id", uid);
  if (error) throw error;
}

export function isUserBanned(user: AppUser): boolean {
  if (!user.banStatus || user.banStatus === "none") return false;
  if (user.banStatus === "banned") return true;
  if (user.banStatus === "timeout" && user.timeoutUntil) {
    return new Date() < new Date(user.timeoutUntil);
  }
  return false;
}

export function getTimeoutRemaining(user: AppUser): number {
  if (user.banStatus !== "timeout" || !user.timeoutUntil) return 0;
  const remaining = new Date(user.timeoutUntil).getTime() - Date.now();
  return Math.max(0, Math.ceil(remaining / (1000 * 60)));
}

// ========================================
// App Settings
// ========================================

export async function getAppSettings(): Promise<AppSettings> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(COLLECTIONS.SETTINGS)
    .select("*")
    .eq("id", APP_SETTINGS_DOC_ID)
    .maybeSingle();

  if (error) {
    console.error("Error fetching app settings:", error);
    return DEFAULT_APP_SETTINGS;
  }

  return mapAppSettingsFromRow((data as DbRow | null) ?? null);
}

export async function updateAppSettings(settings: Partial<AppSettings>, updatedBy: string): Promise<void> {
  const supabase = createClient();
  const current = await getAppSettings();
  const { updatedAt: _omitUpdatedAt, updatedBy: _omitUpdatedBy, ...payload } = settings;

  const mergedSettings: AppSettings = stripUndefined({
    ...current,
    ...payload,
    mapSchoolBoundary:
      payload.mapSchoolBoundary !== undefined
        ? normalizeGeoPolygon(payload.mapSchoolBoundary)
        : current.mapSchoolBoundary,
    updatedAt: new Date(),
    updatedBy,
  });

  const now = new Date().toISOString();
  const { error } = await supabase.from(COLLECTIONS.SETTINGS).upsert(
    {
      id: APP_SETTINGS_DOC_ID,
      settings: mergedSettings as unknown as Json,
      updated_at: now,
      updated_by: updatedBy,
    },
    { onConflict: "id" }
  );

  if (error) throw error;
}

export function subscribeToAppSettings(callback: (settings: AppSettings) => void) {
  return createRealtimeSubscription({
    table: COLLECTIONS.SETTINGS,
    filter: `id=eq.${APP_SETTINGS_DOC_ID}`,
    onFetch: async () => {
      callback(await getAppSettings());
    },
    onError: () => {
      callback(DEFAULT_APP_SETTINGS);
    },
  });
}

// ========================================
// Lost Items
// ========================================

export async function addLostItem(data: Omit<LostItem, "id" | "createdAt" | "updatedAt">) {
  const validated = createLostItemSchema.parse(data);
  const supabase = createClient();
  const now = new Date().toISOString();
  const { data: inserted, error } = await supabase
    .from(COLLECTIONS.LOST_ITEMS)
    .insert(
      stripUndefined({
        tracking_code: validated.trackingCode,
        item_name: validated.itemName,
        category: validated.category,
        description: validated.description,
        location_lost: validated.locationLost,
        location_place_name: validated.locationPlaceName,
        location_coords: validated.locationCoords,
        date_lost: toIso(validated.dateLost),
        contacts: validated.contacts,
        user_id: validated.userId,
        student_id: (validated as { studentId?: string }).studentId,
        status: validated.status,
        matched_found_id: validated.matchedFoundId,
        created_at: now,
        updated_at: now,
      })
    )
    .select("id")
    .single();
  if (error) throw error;
  return asString((inserted as DbRow).id);
}

export async function getLostItem(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(COLLECTIONS.LOST_ITEMS)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapLostItemRow(data as DbRow);
}

export async function getLostItemByTrackingCode(trackingCode: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(COLLECTIONS.LOST_ITEMS)
    .select("*")
    .eq("tracking_code", trackingCode.toUpperCase())
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapLostItemRow(data as DbRow);
}

export async function getLostItems(
  constraints: Array<SupabaseConstraint<ReturnType<typeof createClient>["from"] extends never ? never : any>> = []
) {
  const supabase = createClient();
  let query = supabase.from(COLLECTIONS.LOST_ITEMS).select("*").order("created_at", { ascending: false });
  query = applyConstraints(query, constraints as SupabaseConstraint<typeof query>[]);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapLostItemRow(row as DbRow));
}

export async function getLostItemsByStudentId(studentId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(COLLECTIONS.LOST_ITEMS)
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapLostItemRow(row as DbRow));
}

export async function getLostItemsByUserId(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(COLLECTIONS.LOST_ITEMS)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapLostItemRow(row as DbRow));
}

export function subscribeToLostItemsByUserId(userId: string, callback: (items: LostItem[]) => void) {
  return createRealtimeSubscription({
    table: COLLECTIONS.LOST_ITEMS,
    filter: `user_id=eq.${userId}`,
    onFetch: async () => {
      callback(await getLostItemsByUserId(userId));
    },
  });
}

export function subscribeToFoundItemsByUserId(userId: string, callback: (items: FoundItem[]) => void) {
  return createRealtimeSubscription({
    table: COLLECTIONS.FOUND_ITEMS,
    filter: `user_id=eq.${userId}`,
    onFetch: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from(COLLECTIONS.FOUND_ITEMS)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      callback((data ?? []).map((row) => mapFoundItemRow(row as DbRow)));
    },
  });
}

export async function getLatestLostItems(count = 5) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(COLLECTIONS.LOST_ITEMS)
    .select("*")
    .eq("status", "searching")
    .order("created_at", { ascending: false })
    .limit(count);
  if (error) throw error;
  return (data ?? []).map((row) => mapLostItemRow(row as DbRow));
}

export async function updateLostItem(id: string, data: Partial<LostItem>) {
  const supabase = createClient();
  const { error } = await supabase
    .from(COLLECTIONS.LOST_ITEMS)
    .update(
      stripUndefined({
        tracking_code: data.trackingCode,
        item_name: data.itemName,
        category: data.category,
        description: data.description,
        location_lost: data.locationLost,
        location_place_name: data.locationPlaceName,
        location_coords: data.locationCoords,
        date_lost: data.dateLost ? toIso(data.dateLost) : undefined,
        contacts: data.contacts,
        user_id: data.userId,
        status: data.status,
        matched_found_id: data.matchedFoundId,
        updated_at: new Date().toISOString(),
      })
    )
    .eq("id", id);
  if (error) throw error;
}

export async function deleteLostItem(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from(COLLECTIONS.LOST_ITEMS).delete().eq("id", id);
  if (error) throw error;
}

// ========================================
// Found Items
// ========================================

export async function addFoundItem(data: Omit<FoundItem, "id" | "createdAt" | "updatedAt">) {
  const validated = createFoundItemSchema.parse(data);
  const supabase = createClient();
  const now = new Date().toISOString();
  const { data: inserted, error } = await supabase
    .from(COLLECTIONS.FOUND_ITEMS)
    .insert(
      stripUndefined({
        tracking_code: validated.trackingCode,
        photo_url: validated.photoUrl,
        item_name: validated.itemName,
        category: validated.category,
        color: validated.color,
        brand: validated.brand,
        description: validated.description,
        location_found: validated.locationFound,
        location_place_name: validated.locationPlaceName,
        location_coords: validated.locationCoords,
        date_found: toIso(validated.dateFound),
        drop_off_location: validated.dropOffLocation,
        finder_contacts: validated.finderContacts,
        user_id: validated.userId,
        status: validated.status,
        room_handover_confirmed: validated.roomHandoverConfirmed,
        room_handover_confirmed_at: validated.roomHandoverConfirmedAt
          ? toIso(validated.roomHandoverConfirmedAt)
          : undefined,
        room_handover_confirmed_by: validated.roomHandoverConfirmedBy,
        room_handover_confirmed_by_name: validated.roomHandoverConfirmedByName,
        handover_deadline_at: validated.handoverDeadlineAt ? toIso(validated.handoverDeadlineAt) : undefined,
        expired_at: validated.expiredAt ? toIso(validated.expiredAt) : undefined,
        matched_lost_id: validated.matchedLostId,
        created_at: now,
        updated_at: now,
      })
    )
    .select("id")
    .single();
  if (error) throw error;
  return asString((inserted as DbRow).id);
}

export async function getFoundItem(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(COLLECTIONS.FOUND_ITEMS)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapFoundItemRow(data as DbRow);
}

export async function getFoundItems(
  constraints: Array<SupabaseConstraint<ReturnType<typeof createClient>["from"] extends never ? never : any>> = []
) {
  const supabase = createClient();
  let query = supabase.from(COLLECTIONS.FOUND_ITEMS).select("*").order("created_at", { ascending: false });
  query = applyConstraints(query, constraints as SupabaseConstraint<typeof query>[]);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapFoundItemRow(row as DbRow));
}

export async function getLatestFoundItems(count = 5) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(COLLECTIONS.FOUND_ITEMS)
    .select("*")
    .in("status", ["found", "claimed"])
    .order("created_at", { ascending: false })
    .limit(count);
  if (error) throw error;
  return (data ?? []).map((row) => mapFoundItemRow(row as DbRow));
}

export async function updateFoundItem(id: string, data: Partial<FoundItem>) {
  const supabase = createClient();
  const { error } = await supabase
    .from(COLLECTIONS.FOUND_ITEMS)
    .update(
      stripUndefined({
        tracking_code: data.trackingCode,
        photo_url: data.photoUrl,
        item_name: data.itemName,
        category: data.category,
        color: data.color,
        brand: data.brand,
        description: data.description,
        location_found: data.locationFound,
        location_place_name: data.locationPlaceName,
        location_coords: data.locationCoords,
        date_found: data.dateFound ? toIso(data.dateFound) : undefined,
        drop_off_location: data.dropOffLocation,
        finder_contacts: data.finderContacts,
        user_id: data.userId,
        status: data.status,
        room_handover_confirmed: data.roomHandoverConfirmed,
        room_handover_confirmed_at: data.roomHandoverConfirmedAt
          ? toIso(data.roomHandoverConfirmedAt)
          : undefined,
        room_handover_confirmed_by: data.roomHandoverConfirmedBy,
        room_handover_confirmed_by_name: data.roomHandoverConfirmedByName,
        handover_deadline_at: data.handoverDeadlineAt ? toIso(data.handoverDeadlineAt) : undefined,
        expired_at: data.expiredAt ? toIso(data.expiredAt) : undefined,
        matched_lost_id: data.matchedLostId,
        updated_at: new Date().toISOString(),
      })
    )
    .eq("id", id);
  if (error) throw error;
}

export async function confirmFoundItemRoomHandover(
  id: string,
  confirmedBy: { uid: string; displayName?: string; email?: string }
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from(COLLECTIONS.FOUND_ITEMS)
    .update({
      status: "found",
      room_handover_confirmed: true,
      room_handover_confirmed_at: new Date().toISOString(),
      room_handover_confirmed_by: confirmedBy.uid,
      room_handover_confirmed_by_name:
        confirmedBy.displayName?.trim() || confirmedBy.email?.trim() || confirmedBy.uid,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteFoundItem(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from(COLLECTIONS.FOUND_ITEMS).delete().eq("id", id);
  if (error) throw error;
}

// ========================================
// Statistics
// ========================================

export async function getStats() {
  const supabase = createClient();
  const [{ data: lostRows, error: lostError }, { data: foundRows, error: foundError }] = await Promise.all([
    supabase.from(COLLECTIONS.LOST_ITEMS).select("status"),
    supabase.from(COLLECTIONS.FOUND_ITEMS).select("status"),
  ]);

  if (lostError) throw lostError;
  if (foundError) throw foundError;

  let searching = 0;
  let found = 0;
  let claimed = 0;
  let pendingRoomConfirm = 0;

  for (const row of lostRows ?? []) {
    const status = asString((row as DbRow).status) as ItemStatus;
    if (status === "searching") searching++;
    else if (status === "found") found++;
    else if (status === "claimed") claimed++;
  }

  for (const row of foundRows ?? []) {
    const status = asString((row as DbRow).status) as ItemStatus;
    if (status === "pending_room_confirm") pendingRoomConfirm++;
    else if (status === "found") found++;
    else if (status === "claimed") claimed++;
  }

  return { searching, found, claimed, pendingRoomConfirm };
}

// ========================================
// Real-time listeners
// ========================================

export function subscribeToLostItems(callback: (items: LostItem[]) => void) {
  return createRealtimeSubscription({
    table: COLLECTIONS.LOST_ITEMS,
    onFetch: async () => {
      callback(await getLostItems());
    },
  });
}

export function subscribeToFoundItems(callback: (items: FoundItem[]) => void) {
  if (typeof window !== "undefined") {
    void import("@/lib/found-handover-client").then(({ triggerFoundHandoverExpirySweep }) =>
      triggerFoundHandoverExpirySweep()
    );
  }

  return createRealtimeSubscription({
    table: COLLECTIONS.FOUND_ITEMS,
    onFetch: async () => {
      callback(await getFoundItems());
    },
  });
}

export function timestampToDate(timestamp: Date | undefined | unknown): Date {
  return coerceToDate(timestamp);
}

// ========================================
// Config Data (Categories, Locations, ContactTypes)
// ========================================

export interface CategoryConfig {
  id: string;
  value: string;
  label: string;
  icon: string;
  order: number;
}

export interface LocationConfig {
  id: string;
  value: string;
  label: string;
  order: number;
}

export interface ContactTypeConfig {
  id: string;
  value: ContactType | string;
  label: string;
  icon: string;
  placeholder: string;
  order: number;
}

const DEFAULT_CATEGORIES: CategoryConfig[] = [
  { id: "wallet", value: "wallet", label: "กระเป๋าสตางค์", icon: "💰", order: 1 },
  { id: "phone", value: "phone", label: "โทรศัพท์", icon: "📱", order: 2 },
  { id: "keys", value: "keys", label: "กุญแจ", icon: "🔑", order: 3 },
  { id: "bag", value: "bag", label: "กระเป๋า", icon: "👜", order: 4 },
  { id: "electronics", value: "electronics", label: "อิเล็กทรอนิกส์", icon: "💻", order: 5 },
  { id: "documents", value: "documents", label: "เอกสาร", icon: "📄", order: 6 },
  { id: "clothing", value: "clothing", label: "เสื้อผ้า", icon: "👕", order: 7 },
  { id: "accessories", value: "accessories", label: "เครื่องประดับ", icon: "💍", order: 8 },
  { id: "other", value: "other", label: "อื่นๆ", icon: "📦", order: 9 },
];

const DEFAULT_LOCATIONS: LocationConfig[] = [
  { id: "personnel_office", value: "personnel_office", label: "ห้องบุคคล (ห้องปกครอง)", order: 1 },
  { id: "admin_office", value: "admin_office", label: "ห้องธุรการ", order: 2 },
  { id: "canteen", value: "canteen", label: "โรงอาหาร", order: 3 },
  { id: "library", value: "library", label: "ห้องสมุด", order: 4 },
  { id: "security", value: "security", label: "ห้องรปภ.", order: 5 },
  { id: "other", value: "other", label: "อื่นๆ", order: 6 },
];

const DEFAULT_CONTACT_TYPES: ContactTypeConfig[] = [
  { id: "phone", value: "phone", label: "เบอร์โทรศัพท์", icon: "📞", placeholder: "0812345678", order: 1 },
  { id: "line", value: "line", label: "LINE ID", icon: "💬", placeholder: "@lineid", order: 2 },
  { id: "instagram", value: "instagram", label: "Instagram", icon: "📷", placeholder: "@username", order: 3 },
  { id: "facebook", value: "facebook", label: "Facebook", icon: "📘", placeholder: "ชื่อ Facebook", order: 4 },
  { id: "email", value: "email", label: "Email", icon: "📧", placeholder: "email@example.com", order: 5 },
];

export async function getCategories(): Promise<CategoryConfig[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from("categories").select("*").order("sort_order", { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) return DEFAULT_CATEGORIES;
    return data.map((row) => ({
      id: asString((row as DbRow).id),
      value: asString((row as DbRow).value),
      label: asString((row as DbRow).label),
      icon: asString((row as DbRow).icon),
      order: asNumber((row as DbRow).sort_order),
    }));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return DEFAULT_CATEGORIES;
  }
}

export async function getLocations(): Promise<LocationConfig[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from("locations").select("*").order("sort_order", { ascending: true });
    if (error) throw error;
    if (data && data.length > 0) {
      return data.map((row) => ({
        id: asString((row as DbRow).id),
        value: asString((row as DbRow).value),
        label: asString((row as DbRow).label),
        order: asNumber((row as DbRow).sort_order),
      }));
    }

    const { data: legacyData, error: legacyError } = await supabase
      .from("drop_off_locations")
      .select("*")
      .order("sort_order", { ascending: true });
    if (legacyError) throw legacyError;
    if (!legacyData || legacyData.length === 0) return DEFAULT_LOCATIONS;

    return legacyData.map((row) => ({
      id: asString((row as DbRow).id),
      value: asString((row as DbRow).value),
      label: asString((row as DbRow).label),
      order: asNumber((row as DbRow).sort_order),
    }));
  } catch (error) {
    console.error("Error fetching locations:", error);
    return DEFAULT_LOCATIONS;
  }
}

export async function getContactTypes(): Promise<ContactTypeConfig[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("contact_types")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) return DEFAULT_CONTACT_TYPES;

    return data.map((row) => ({
      id: asString((row as DbRow).id),
      value: asString((row as DbRow).value),
      label: asString((row as DbRow).label),
      icon: asString((row as DbRow).icon),
      placeholder: asString((row as DbRow).placeholder),
      order: asNumber((row as DbRow).sort_order),
    }));
  } catch (error) {
    console.error("Error fetching contact types:", error);
    return DEFAULT_CONTACT_TYPES;
  }
}

export function subscribeToCategories(callback: (categories: CategoryConfig[]) => void) {
  return createRealtimeSubscription({
    table: "categories",
    onFetch: async () => {
      callback(await getCategories());
    },
    onError: () => callback(DEFAULT_CATEGORIES),
  });
}

export function subscribeToLocations(callback: (locations: LocationConfig[]) => void) {
  return createRealtimeSubscription({
    table: "locations",
    onFetch: async () => {
      callback(await getLocations());
    },
    onError: () => callback(DEFAULT_LOCATIONS),
  });
}

export function subscribeToContactTypes(callback: (contactTypes: ContactTypeConfig[]) => void) {
  return createRealtimeSubscription({
    table: "contact_types",
    onFetch: async () => {
      callback(await getContactTypes());
    },
    onError: () => callback(DEFAULT_CONTACT_TYPES),
  });
}

// ========================================
// AI Rate Limiting
// ========================================

export interface AIRateLimitResult {
  allowed: boolean;
  remainingMinute: number;
  remainingHour: number;
  resetMinute: Date;
  resetHour: Date;
  message?: string;
}

export function subscribeToAIUsage(callback: (records: AIUsageRecord[]) => void) {
  const fetchUsage = async () => {
    const supabase = createClient();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from(COLLECTIONS.AI_USAGE)
      .select("*")
      .gte("timestamp", thirtyDaysAgo.toISOString())
      .order("timestamp", { ascending: false })
      .limit(1000);
    if (error) throw error;

    const records = (data ?? []).map((row) => {
      const mapped = row as DbRow;
      return {
        id: asString(mapped.id),
        userId: asString(mapped.user_id),
        endpoint: asString(mapped.endpoint),
        timestamp: timestampToDate(mapped.timestamp),
      } as AIUsageRecord;
    });
    callback(records);
  };

  return createRealtimeSubscription({
    table: COLLECTIONS.AI_USAGE,
    onFetch: fetchUsage,
    onError: (error) => {
      console.error("Error subscribing to AI usage:", error);
      callback([]);
    },
  });
}

export async function getAIUsageStats(): Promise<{
  total: number;
  today: number;
  thisWeek: number;
  byEndpoint: Record<string, number>;
  byUser: Record<string, number>;
}> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const supabase = createClient();
  const { data, error } = await supabase
    .from(COLLECTIONS.AI_USAGE)
    .select("*")
    .gte("timestamp", weekAgo.toISOString())
    .order("timestamp", { ascending: false });
  if (error) throw error;

  const records = (data ?? []).map((row) => ({
    id: asString((row as DbRow).id),
    userId: asString((row as DbRow).user_id),
    endpoint: asString((row as DbRow).endpoint),
    timestamp: timestampToDate((row as DbRow).timestamp),
  }));

  const byEndpoint: Record<string, number> = {};
  const byUser: Record<string, number> = {};
  let todayCount = 0;

  records.forEach((record) => {
    byEndpoint[record.endpoint] = (byEndpoint[record.endpoint] || 0) + 1;
    byUser[record.userId] = (byUser[record.userId] || 0) + 1;
    if (record.timestamp >= todayStart) todayCount++;
  });

  return {
    total: records.length,
    today: todayCount,
    thisWeek: records.length,
    byEndpoint,
    byUser,
  };
}

export async function recordAIUsage(userId: string, endpoint = "ner"): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from(COLLECTIONS.AI_USAGE).insert({
    user_id: userId,
    endpoint,
    timestamp: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function checkAIRateLimit(userId: string, settings: AppSettings): Promise<AIRateLimitResult> {
  if (!settings.aiRateLimitEnabled) {
    return {
      allowed: true,
      remainingMinute: Number.POSITIVE_INFINITY,
      remainingHour: Number.POSITIVE_INFINITY,
      resetMinute: new Date(),
      resetHour: new Date(),
    };
  }

  const supabase = createClient();
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [minuteCountResult, hourCountResult, minuteOldestResult, hourOldestResult] = await Promise.all([
    supabase
      .from(COLLECTIONS.AI_USAGE)
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("timestamp", oneMinuteAgo.toISOString()),
    supabase
      .from(COLLECTIONS.AI_USAGE)
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("timestamp", oneHourAgo.toISOString()),
    supabase
      .from(COLLECTIONS.AI_USAGE)
      .select("timestamp")
      .eq("user_id", userId)
      .gte("timestamp", oneMinuteAgo.toISOString())
      .order("timestamp", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from(COLLECTIONS.AI_USAGE)
      .select("timestamp")
      .eq("user_id", userId)
      .gte("timestamp", oneHourAgo.toISOString())
      .order("timestamp", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  if (minuteCountResult.error) throw minuteCountResult.error;
  if (hourCountResult.error) throw hourCountResult.error;
  if (minuteOldestResult.error) throw minuteOldestResult.error;
  if (hourOldestResult.error) throw hourOldestResult.error;

  const usageInMinute = minuteCountResult.count ?? 0;
  const usageInHour = hourCountResult.count ?? 0;

  const limitPerMinute = settings.aiRateLimitPerMinute || 5;
  const limitPerHour = settings.aiRateLimitPerHour || 30;

  const remainingMinute = Math.max(0, limitPerMinute - usageInMinute);
  const remainingHour = Math.max(0, limitPerHour - usageInHour);

  let resetMinute = new Date(now.getTime() + 60 * 1000);
  let resetHour = new Date(now.getTime() + 60 * 60 * 1000);

  if (minuteOldestResult.data?.timestamp) {
    const oldest = timestampToDate((minuteOldestResult.data as DbRow).timestamp);
    resetMinute = new Date(oldest.getTime() + 60 * 1000);
  }

  if (hourOldestResult.data?.timestamp) {
    const oldest = timestampToDate((hourOldestResult.data as DbRow).timestamp);
    resetHour = new Date(oldest.getTime() + 60 * 60 * 1000);
  }

  const allowed = usageInMinute < limitPerMinute && usageInHour < limitPerHour;

  return {
    allowed,
    remainingMinute,
    remainingHour,
    resetMinute,
    resetHour,
    message: allowed ? undefined : settings.aiRateLimitMessage,
  };
}

export async function cleanupOldAIUsage(): Promise<number> {
  const supabase = createClient();
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from(COLLECTIONS.AI_USAGE)
    .select("id")
    .lt("timestamp", twoHoursAgo)
    .limit(500);
  if (error) throw error;

  const ids = (data ?? []).map((row) => asString((row as DbRow).id)).filter(Boolean);
  if (ids.length === 0) return 0;

  const { error: deleteError } = await supabase.from(COLLECTIONS.AI_USAGE).delete().in("id", ids);
  if (deleteError) throw deleteError;
  return ids.length;
}

// ========================================
// NFC Tags
// ========================================

export async function getNfcTagById(tagId: string): Promise<NfcTag | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(COLLECTIONS.NFC_TAGS)
    .select("*")
    .eq("id", tagId.toUpperCase())
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapNfcTagRow(data as DbRow);
}

export async function getNfcTagsByOwnerId(ownerId: string): Promise<NfcTag[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(COLLECTIONS.NFC_TAGS)
    .select("*")
    .eq("owner_id", ownerId)
    .order("registered_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapNfcTagRow(row as DbRow));
}

export function subscribeToNfcTagsByOwnerId(ownerId: string, callback: (tags: NfcTag[]) => void): () => void {
  return createRealtimeSubscription({
    table: COLLECTIONS.NFC_TAGS,
    filter: `owner_id=eq.${ownerId}`,
    onFetch: async () => {
      callback(await getNfcTagsByOwnerId(ownerId));
    },
  });
}

export async function updateNfcTag(tagId: string, data: Partial<Omit<NfcTag, "id" | "registeredAt">>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from(COLLECTIONS.NFC_TAGS)
    .update(
      stripUndefined({
        tag_uid: data.tagUid,
        owner_id: data.ownerId,
        item_name: data.itemName,
        category: data.category,
        description: data.description,
        contacts: data.contacts,
        status: data.status,
        read_only_locked: data.readOnlyLocked,
        lost_item_id: data.lostItemId,
        last_found_report_id: data.lastFoundReportId,
        updated_at: new Date().toISOString(),
      })
    )
    .eq("id", tagId.toUpperCase());
  if (error) throw error;
}

export async function createNfcFoundReport(data: Omit<NfcFoundReport, "id" | "createdAt">): Promise<string> {
  const supabase = createClient();
  const { data: inserted, error } = await supabase
    .from(COLLECTIONS.NFC_FOUND_REPORTS)
    .insert(
      stripUndefined({
        tag_id: data.tagId,
        owner_id: data.ownerId,
        finder_user_id: data.finderUserId,
        finder_message: data.finderMessage,
        location_found: data.locationFound,
        location_coords: data.locationCoords,
        finder_contacts: data.finderContacts,
        status: data.status,
        created_at: new Date().toISOString(),
      })
    )
    .select("id")
    .single();
  if (error) throw error;
  return asString((inserted as DbRow).id);
}

export async function getNfcFoundReportsByTagId(tagId: string): Promise<NfcFoundReport[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(COLLECTIONS.NFC_FOUND_REPORTS)
    .select("*")
    .eq("tag_id", tagId.toUpperCase())
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapNfcFoundReportRow(row as DbRow));
}

export function subscribeToNfcFoundReportsByOwnerId(
  ownerId: string,
  callback: (reports: NfcFoundReport[]) => void
): () => void {
  return createRealtimeSubscription({
    table: COLLECTIONS.NFC_FOUND_REPORTS,
    filter: `owner_id=eq.${ownerId}`,
    onFetch: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from(COLLECTIONS.NFC_FOUND_REPORTS)
        .select("*")
        .eq("owner_id", ownerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      callback((data ?? []).map((row) => mapNfcFoundReportRow(row as DbRow)));
    },
  });
}

export async function updateNfcFoundReport(
  reportId: string,
  data: Partial<Pick<NfcFoundReport, "status">>
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from(COLLECTIONS.NFC_FOUND_REPORTS)
    .update(
      stripUndefined({
        status: data.status,
      })
    )
    .eq("id", reportId);
  if (error) throw error;
}

export async function getAllNfcTags(limitCount = 200): Promise<NfcTag[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(COLLECTIONS.NFC_TAGS)
    .select("*")
    .order("registered_at", { ascending: false })
    .limit(limitCount);
  if (error) throw error;
  return (data ?? []).map((row) => mapNfcTagRow(row as DbRow));
}
