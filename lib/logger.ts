import { addDoc, collection, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ErrorSeverity, ErrorSource } from "@/lib/types";

// Activity log types
export type ActionType = "create" | "update" | "delete" | "view" | "login" | "logout" | "match" | "ban" | "unban" | "timeout";
export type TargetType = "lostItem" | "foundItem" | "category" | "location" | "contactType" | "user" | "system" | "match" | "error";

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

/**
 * Log an activity to Firestore
 * @example
 * await logActivity({
 *   action: "แจ้งของหาย: กระเป๋าสตางค์",
 *   actionType: "create",
 *   targetType: "lostItem",
 *   targetId: "abc123",
 *   targetName: "กระเป๋าสตางค์",
 *   userEmail: "user@school.ac.th",
 * });
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
    try {
        await addDoc(collection(db, "activityLogs"), {
            ...params,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        // Silent fail - don't break the main operation if logging fails
        console.error("Failed to log activity:", error);
    }
}

/**
 * Log item creation (lost/found)
 */
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

/**
 * Log item status change
 */
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

/**
 * Log item match
 */
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

/**
 * Log CRUD operations on categories/locations/contact types
 */
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

// ========================================
// Error Logging
// ========================================

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

/**
 * Log an error to Firestore
 * @example
 * await logError({
 *   message: "Failed to fetch items",
 *   severity: "high",
 *   source: "api",
 *   url: "/api/items",
 * });
 */
export async function logError(params: LogErrorParams): Promise<string | null> {
    try {
        const docRef = await addDoc(collection(db, "errorLogs"), {
            message: params.message,
            stack: params.stack || null,
            severity: params.severity || "medium",
            source: params.source || "unknown",
            url: params.url || null,
            userId: params.userId || null,
            userEmail: params.userEmail || null,
            userAgent: params.userAgent || (typeof navigator !== "undefined" ? navigator.userAgent : null),
            metadata: params.metadata || null,
            resolved: false,
            createdAt: serverTimestamp(),
        });
        return docRef.id;
    } catch (error) {
        // Silent fail - don't break the main operation if logging fails
        console.error("Failed to log error:", error);
        return null;
    }
}

/**
 * Log a client-side error (for use in error boundaries)
 */
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
        metadata: {
            componentStack: errorInfo?.componentStack,
        },
    });
}

/**
 * Log an API error
 */
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
        metadata: {
            statusCode,
            endpoint,
        },
    });
}

/**
 * Log a Firebase error
 */
export async function logFirebaseError(
    operation: string,
    error: Error,
    userId?: string
): Promise<string | null> {
    return logError({
        message: `Firebase Error [${operation}]: ${error.message}`,
        stack: error.stack,
        severity: "high",
        source: "firebase",
        userId,
        metadata: {
            operation,
            code: (error as any).code,
        },
    });
}

/**
 * Mark an error as resolved
 */
export async function resolveError(errorId: string, resolvedBy: string): Promise<void> {
    try {
        const errorRef = doc(db, "errorLogs", errorId);
        await updateDoc(errorRef, {
            resolved: true,
            resolvedAt: serverTimestamp(),
            resolvedBy,
        });
    } catch (error) {
        console.error("Failed to resolve error:", error);
    }
}

// ========================================
// User Ban/Timeout Logging
// ========================================

/**
 * Log when a user is banned
 */
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

/**
 * Log when a user is unbanned
 */
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

/**
 * Log when a user is given a timeout
 */
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
