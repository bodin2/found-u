import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { extractVisionData, mapVisionToFoundForm } from "@/lib/vision";
import {
  checkAndRecordRateLimitAtomic,
  getAppSettingsAdmin,
  getRateLimitQuota,
} from "@/lib/ai-rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseJsonBody } from "@/lib/parse-request";

async function isAdminUser(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
  return data?.role === "admin";
}

const visionBodySchema = z.object({
  imageDataUrl: z.string().trim().optional(),
  imageBase64: z.string().trim().optional(),
  mimeType: z.string().trim().optional(),
  userId: z.string().trim().optional(),
  testMode: z.boolean().optional().default(false),
});

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const settings = await getAppSettingsAdmin();
    const quota = await getRateLimitQuota(userId, settings);
    return NextResponse.json(quota);
  } catch (error) {
    console.error("Error getting quota:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, visionBodySchema);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { imageDataUrl, imageBase64, mimeType, userId, testMode } = parsed.data;

    let parsedMime = mimeType;
    let parsedBase64 = imageBase64;

    if (imageDataUrl) {
      const parsed = parseDataUrl(imageDataUrl);
      if (!parsed) {
        return NextResponse.json({ error: "Invalid image data URL" }, { status: 400 });
      }
      parsedMime = parsed.mimeType;
      parsedBase64 = parsed.base64;
    }

    if (!parsedBase64 || !parsedMime) {
      return NextResponse.json(
        { error: "imageDataUrl or imageBase64 + mimeType required" },
        { status: 400 }
      );
    }

    const settings = await getAppSettingsAdmin();
    const adminTestMode = Boolean(testMode && userId && (await isAdminUser(userId)));

    if (userId && !adminTestMode) {
      const rateLimitResult = await checkAndRecordRateLimitAtomic(userId, settings, "vision");
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            error: "rate_limit_exceeded",
            reason: rateLimitResult.reason,
            message: rateLimitResult.message || "AI rate limit exceeded. Please try again shortly.",
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

    const visionConfig = {
      model: settings.aiVisionModel,
      temperature: settings.aiVisionTemperature,
      topP: settings.aiVisionTopP,
      maxOutputTokens: settings.aiVisionMaxOutputTokens,
    };

    const visionResult = await extractVisionData(
      parsedBase64,
      parsedMime,
      visionConfig,
      { includeDebug: adminTestMode }
    );

    if (!visionResult) {
      return NextResponse.json({ error: "Vision analysis failed" }, { status: 500 });
    }

    const data = "data" in visionResult ? visionResult.data : visionResult;

    if (adminTestMode) {
      const quota = userId ? await getRateLimitQuota(userId, settings) : null;
      return NextResponse.json({
        data,
        formMapping: mapVisionToFoundForm(data),
        debug: "debug" in visionResult ? visionResult.debug : undefined,
        meta: {
          testMode: true,
          skippedRateLimit: true,
          model: visionConfig.model,
          temperature: visionConfig.temperature,
          topP: visionConfig.topP,
          maxOutputTokens: visionConfig.maxOutputTokens,
          imageMimeType: parsedMime,
          imageBase64Length: parsedBase64.length,
        },
        quota,
      });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error in vision API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
