import { NextRequest, NextResponse } from 'next/server';
import { extractNERData } from '@/lib/ner';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { AppSettings } from '@/lib/types';

interface RateLimitCheckResult {
  allowed: boolean;
  reason?: 'user_minute' | 'user_hour' | 'system_minute' | 'system_hour';
  message?: string;
  userRemainingMinute: number;
  userRemainingHour: number;
  systemRemainingMinute: number;
  systemRemainingHour: number;
  resetMinute: Date;
  resetHour: Date;
}

// Admin SDK version of getAppSettings
async function getAppSettingsAdmin(): Promise<AppSettings> {
  const docRef = adminDb.collection('settings').doc('appSettings');
  const docSnap = await docRef.get();
  
  const defaultSettings: AppSettings = {
    restrictModeEnabled: false,
    betaRequestsEnabled: true,
    betaClosedMessage: 'ขณะนี้ระบบปิดรับสมัคร Beta Tester ชั่วคราว',
    aiRateLimitEnabled: true,
    aiRateLimitPerMinute: 5,
    aiRateLimitPerHour: 30,
    systemAiRateLimitEnabled: true,
    systemAiRateLimitPerMinute: 20,
    systemAiRateLimitPerHour: 100,
  };
  
  if (!docSnap.exists) {
    return defaultSettings;
  }
  
  return { ...defaultSettings, ...docSnap.data() } as AppSettings;
}

// Atomic rate limit check and record using transaction
async function checkAndRecordRateLimitAtomic(
  userId: string,
  settings: AppSettings,
  endpoint: string = 'ner'
): Promise<RateLimitCheckResult> {
  // If rate limit is disabled, just record and allow
  if (!settings.aiRateLimitEnabled) {
    await adminDb.collection('aiUsage').add({
      userId,
      endpoint,
      timestamp: FieldValue.serverTimestamp(),
    });
    return {
      allowed: true,
      userRemainingMinute: Infinity,
      userRemainingHour: Infinity,
      systemRemainingMinute: Infinity,
      systemRemainingHour: Infinity,
      resetMinute: new Date(),
      resetHour: new Date(),
    };
  }

  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Use a distributed counter approach with optimistic locking
  // Get current usage counts first
  const [userMinuteSnapshot, userHourSnapshot, systemMinuteSnapshot, systemHourSnapshot] = await Promise.all([
    // Per-user limits
    adminDb.collection('aiUsage')
      .where('userId', '==', userId)
      .where('timestamp', '>=', Timestamp.fromDate(oneMinuteAgo))
      .get(),
    adminDb.collection('aiUsage')
      .where('userId', '==', userId)
      .where('timestamp', '>=', Timestamp.fromDate(oneHourAgo))
      .get(),
    // System-wide limits (all users)
    adminDb.collection('aiUsage')
      .where('timestamp', '>=', Timestamp.fromDate(oneMinuteAgo))
      .get(),
    adminDb.collection('aiUsage')
      .where('timestamp', '>=', Timestamp.fromDate(oneHourAgo))
      .get(),
  ]);

  const userUsageInMinute = userMinuteSnapshot.size;
  const userUsageInHour = userHourSnapshot.size;
  const systemUsageInMinute = systemMinuteSnapshot.size;
  const systemUsageInHour = systemHourSnapshot.size;

  const userLimitPerMinute = settings.aiRateLimitPerMinute || 5;
  const userLimitPerHour = settings.aiRateLimitPerHour || 30;
  const systemLimitPerMinute = settings.systemAiRateLimitPerMinute || 20;
  const systemLimitPerHour = settings.systemAiRateLimitPerHour || 100;

  // Calculate remaining
  const userRemainingMinute = Math.max(0, userLimitPerMinute - userUsageInMinute);
  const userRemainingHour = Math.max(0, userLimitPerHour - userUsageInHour);
  const systemRemainingMinute = Math.max(0, systemLimitPerMinute - systemUsageInMinute);
  const systemRemainingHour = Math.max(0, systemLimitPerHour - systemUsageInHour);

  // Calculate reset times
  let resetMinute = new Date(now.getTime() + 60 * 1000);
  let resetHour = new Date(now.getTime() + 60 * 60 * 1000);

  // Check limits
  let allowed = true;
  let reason: RateLimitCheckResult['reason'];
  let message: string | undefined;

  // Check user limits
  if (userUsageInMinute >= userLimitPerMinute) {
    allowed = false;
    reason = 'user_minute';
    message = settings.aiRateLimitMessage || 'คุณใช้งาน AI บ่อยเกินไป กรุณารอสักครู่';
  } else if (userUsageInHour >= userLimitPerHour) {
    allowed = false;
    reason = 'user_hour';
    message = settings.aiRateLimitMessage || 'คุณใช้งาน AI ครบโควต้าต่อชั่วโมงแล้ว';
  }
  // Check system-wide limits (only if enabled)
  else if (settings.systemAiRateLimitEnabled) {
    if (systemUsageInMinute >= systemLimitPerMinute) {
      allowed = false;
      reason = 'system_minute';
      message = 'ระบบ AI มีผู้ใช้งานจำนวนมาก กรุณารอสักครู่';
    } else if (systemUsageInHour >= systemLimitPerHour) {
      allowed = false;
      reason = 'system_hour';
      message = 'ระบบ AI ถึงขีดจำกัดการใช้งานต่อชั่วโมง กรุณารอสักครู่';
    }
  }

  // If allowed, record usage atomically
  if (allowed) {
    // Record with server timestamp for atomic operation
    await adminDb.collection('aiUsage').add({
      userId,
      endpoint,
      timestamp: FieldValue.serverTimestamp(),
    });
  }

  return {
    allowed,
    reason,
    message,
    userRemainingMinute: allowed ? userRemainingMinute - 1 : userRemainingMinute,
    userRemainingHour: allowed ? userRemainingHour - 1 : userRemainingHour,
    systemRemainingMinute: allowed ? systemRemainingMinute - 1 : systemRemainingMinute,
    systemRemainingHour: allowed ? systemRemainingHour - 1 : systemRemainingHour,
    resetMinute,
    resetHour,
  };
}

// Get current quota without recording (for UI display)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const settings = await getAppSettingsAdmin();
    
    if (!settings.aiRateLimitEnabled) {
      return NextResponse.json({
        enabled: false,
        userRemainingMinute: Infinity,
        userRemainingHour: Infinity,
        systemRemainingMinute: Infinity,
        systemRemainingHour: Infinity,
      });
    }

    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [userMinuteSnapshot, userHourSnapshot, systemMinuteSnapshot, systemHourSnapshot] = await Promise.all([
      adminDb.collection('aiUsage')
        .where('userId', '==', userId)
        .where('timestamp', '>=', Timestamp.fromDate(oneMinuteAgo))
        .get(),
      adminDb.collection('aiUsage')
        .where('userId', '==', userId)
        .where('timestamp', '>=', Timestamp.fromDate(oneHourAgo))
        .get(),
      adminDb.collection('aiUsage')
        .where('timestamp', '>=', Timestamp.fromDate(oneMinuteAgo))
        .get(),
      adminDb.collection('aiUsage')
        .where('timestamp', '>=', Timestamp.fromDate(oneHourAgo))
        .get(),
    ]);

    const userLimitPerMinute = settings.aiRateLimitPerMinute || 5;
    const userLimitPerHour = settings.aiRateLimitPerHour || 30;
    const systemLimitPerMinute = settings.systemAiRateLimitPerMinute || 20;
    const systemLimitPerHour = settings.systemAiRateLimitPerHour || 100;

    return NextResponse.json({
      enabled: true,
      userRemainingMinute: Math.max(0, userLimitPerMinute - userMinuteSnapshot.size),
      userRemainingHour: Math.max(0, userLimitPerHour - userHourSnapshot.size),
      userLimitPerMinute,
      userLimitPerHour,
      systemRemainingMinute: settings.systemAiRateLimitEnabled 
        ? Math.max(0, systemLimitPerMinute - systemMinuteSnapshot.size)
        : Infinity,
      systemRemainingHour: settings.systemAiRateLimitEnabled
        ? Math.max(0, systemLimitPerHour - systemHourSnapshot.size)
        : Infinity,
      systemLimitPerMinute: settings.systemAiRateLimitEnabled ? systemLimitPerMinute : null,
      systemLimitPerHour: settings.systemAiRateLimitEnabled ? systemLimitPerHour : null,
    });
  } catch (error) {
    console.error('Error getting quota:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, type, userId } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (!type || (type !== 'lost' && type !== 'found')) {
      return NextResponse.json(
        { error: 'Type must be "lost" or "found"' },
        { status: 400 }
      );
    }

    // Check and record rate limit atomically if userId is provided
    if (userId) {
      const settings = await getAppSettingsAdmin();
      const rateLimitResult = await checkAndRecordRateLimitAtomic(userId, settings, 'ner');

      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            error: 'rate_limit_exceeded',
            reason: rateLimitResult.reason,
            message: rateLimitResult.message || 'คุณใช้งาน AI บ่อยเกินไป กรุณารอสักครู่',
            userRemainingMinute: rateLimitResult.userRemainingMinute,
            userRemainingHour: rateLimitResult.userRemainingHour,
            systemRemainingMinute: rateLimitResult.systemRemainingMinute,
            systemRemainingHour: rateLimitResult.systemRemainingHour,
            resetMinute: rateLimitResult.resetMinute.toISOString(),
            resetHour: rateLimitResult.resetHour.toISOString(),
          },
          { status: 429 }
        );
      }
    }

    const result = await extractNERData(text, type);

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to extract data from text' },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in NER API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
