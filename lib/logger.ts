import { createClient } from "@/lib/supabase/client";
import type { ErrorSeverity, ErrorSource } from "@/lib/types";
import type { Json } from "@/lib/database.types";

export type ActionType =
  | "create"
  | "update"
  | "delete"
  | "view"
  | "login"
  | "logout"
  | "match"
  | "ban"
  | "unban"
  | "timeout";

export type TargetType =
  | "lostItem"
  | "foundItem"
  | "category"
  | "location"
  | "contactType"
  | "user"
  | "system"
  | "match"
  | "error"
  | "nfcTag"
  | "nfcReport";

interface LogActivityParams {
  action: string;
  actionType: ActionType;
  targetType: TargetType;
  targetId?: string;
  targetName?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  details?: string;
}

interface LogErrorParams {
  message: string;
  stack?: string;
  severity?: ErrorSeverity;
  source?: ErrorSource;
  url?: string;
  userId?: string;
  userEmail?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

function asDatabaseSource(source?: ErrorSource): ErrorSource {
  return source || "unknown";
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.from("activity_logs").insert({
      action: params.action,
      action_type: params.actionType,
      target_type: params.targetType,
      target_id: params.targetId || null,
      target_name: params.targetName || null,
      user_id: params.userId || null,
      user_email: params.userEmail || null,
      user_name: params.userName || null,
      details: params.details || null,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

export async function logItemCreated(
  type: "lost" | "found",
  itemId: string,
  itemName: string,
  trackingCode: string,
  userEmail?: string,
  userName?: string
): Promise<void> {
  await logActivity({
    action: `${type === "lost" ? "แจ้งของหาย" : "แจ้งเจอของ"}: ${itemName} (${trackingCode})`,
    actionType: "create",
    targetType: type === "lost" ? "lostItem" : "foundItem",
    targetId: itemId,
    targetName: itemName,
    userEmail,
    userName,
    details: `Tracking: ${trackingCode}`,
  });
}

export async function logStatusChanged(
  type: "lost" | "found",
  itemId: string,
  itemName: string,
  newStatus: string,
  userEmail?: string
): Promise<void> {
  await logActivity({
    action: `เปลี่ยนสถานะ ${type === "lost" ? "ของหาย" : "ของเจอ"}: ${itemName} → ${newStatus}`,
    actionType: "update",
    targetType: type === "lost" ? "lostItem" : "foundItem",
    targetId: itemId,
    targetName: itemName,
    userEmail,
    details: `สถานะใหม่: ${newStatus}`,
  });
}

export async function logItemMatched(
  lostItemId: string,
  lostItemName: string,
  foundItemId: string,
  foundItemName: string,
  userEmail?: string
): Promise<void> {
  await logActivity({
    action: `จับคู่ของหาย-ของเจอ: ${lostItemName} ↔ ${foundItemName}`,
    actionType: "match",
    targetType: "match",
    targetId: `${lostItemId}_${foundItemId}`,
    targetName: `${lostItemName} - ${foundItemName}`,
    userEmail,
    details: `Lost: ${lostItemId}, Found: ${foundItemId}`,
  });
}

export async function logNfcTagRegistered(
  tagId: string,
  itemName: string,
  userEmail?: string,
  userName?: string
): Promise<void> {
  await logActivity({
    action: `ลงทะเบียน NFC Tag: ${itemName} (${tagId})`,
    actionType: "create",
    targetType: "nfcTag",
    targetId: tagId,
    targetName: itemName,
    userEmail,
    userName,
  });
}

export async function logNfcFoundReported(tagId: string, userEmail?: string, userName?: string): Promise<void> {
  await logActivity({
    action: `แจ้งพบของผ่าน NFC Tag: ${tagId}`,
    actionType: "create",
    targetType: "nfcReport",
    targetId: tagId,
    targetName: tagId,
    userEmail,
    userName,
  });
}

export async function logConfigChanged(
  operation: "create" | "update" | "delete",
  configType: "category" | "location" | "contactType",
  itemName: string,
  userEmail?: string
): Promise<void> {
  const typeLabels = {
    category: "หมวดหมู่",
    location: "สถานที่",
    contactType: "ช่องทางติดต่อ",
  };

  const actionLabels = {
    create: "เพิ่ม",
    update: "แก้ไข",
    delete: "ลบ",
  };

  await logActivity({
    action: `${actionLabels[operation]}${typeLabels[configType]}: ${itemName}`,
    actionType: operation,
    targetType: configType,
    targetName: itemName,
    userEmail,
  });
}

export async function logError(params: LogErrorParams): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("error_logs")
      .insert({
        message: params.message,
        stack: params.stack || null,
        severity: params.severity || "medium",
        source: asDatabaseSource(params.source),
        url: params.url || null,
        user_id: params.userId || null,
        user_email: params.userEmail || null,
        user_agent: params.userAgent || (typeof navigator !== "undefined" ? navigator.userAgent : null),
        metadata: ((params.metadata as unknown as Json) || null),
        resolved: false,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;
    return typeof data?.id === "string" ? data.id : null;
  } catch (error) {
    console.error("Failed to log error:", error);
    return null;
  }
}

export async function logClientError(
  error: Error,
  errorInfo?: { componentStack?: string },
  userId?: string,
  userEmail?: string
): Promise<string | null> {
  return logError({
    message: error.message,
    stack: error.stack || errorInfo?.componentStack,
    severity: "high",
    source: "client",
    url: typeof window !== "undefined" ? window.location.href : undefined,
    userId,
    userEmail,
    metadata: { componentStack: errorInfo?.componentStack },
  });
}

export async function logApiError(
  endpoint: string,
  error: Error | string,
  statusCode?: number,
  userId?: string
): Promise<string | null> {
  const message = typeof error === "string" ? error : error.message;
  const stack = typeof error === "string" ? undefined : error.stack;
  return logError({
    message: `API Error [${statusCode || "unknown"}]: ${message}`,
    stack,
    severity: statusCode && statusCode >= 500 ? "critical" : "high",
    source: "api",
    url: endpoint,
    userId,
    metadata: { statusCode, endpoint },
  });
}

export async function logDatabaseError(operation: string, error: Error, userId?: string): Promise<string | null> {
  return logError({
    message: `Database Error [${operation}]: ${error.message}`,
    stack: error.stack,
    severity: "high",
    source: "database" as ErrorSource,
    userId,
    metadata: { operation, code: (error as { code?: string }).code },
  });
}

export const logFirebaseError = logDatabaseError;

export async function resolveError(errorId: string, resolvedBy: string): Promise<void> {
  try {
    const supabase = createClient();
    await supabase
      .from("error_logs")
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy,
      })
      .eq("id", errorId);
  } catch (error) {
    console.error("Failed to resolve error:", error);
  }
}

export async function logUserBanned(
  targetUserId: string,
  targetUserEmail: string,
  reason: string,
  adminEmail?: string
): Promise<void> {
  await logActivity({
    action: `แบนผู้ใช้: ${targetUserEmail}`,
    actionType: "ban",
    targetType: "user",
    targetId: targetUserId,
    targetName: targetUserEmail,
    userEmail: adminEmail,
    details: `เหตุผล: ${reason}`,
  });
}

export async function logUserUnbanned(
  targetUserId: string,
  targetUserEmail: string,
  adminEmail?: string
): Promise<void> {
  await logActivity({
    action: `ปลดแบนผู้ใช้: ${targetUserEmail}`,
    actionType: "unban",
    targetType: "user",
    targetId: targetUserId,
    targetName: targetUserEmail,
    userEmail: adminEmail,
  });
}

export async function logUserTimeout(
  targetUserId: string,
  targetUserEmail: string,
  duration: string,
  reason: string,
  adminEmail?: string
): Promise<void> {
  await logActivity({
    action: `Timeout ผู้ใช้: ${targetUserEmail} (${duration})`,
    actionType: "timeout",
    targetType: "user",
    targetId: targetUserId,
    targetName: targetUserEmail,
    userEmail: adminEmail,
    details: `ระยะเวลา: ${duration}, เหตุผล: ${reason}`,
  });
}
