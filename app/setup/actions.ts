"use server";

import { cookies, headers } from "next/headers";
import { revalidateTag } from "next/cache";
import { encryptSecret } from "@/lib/setup/credentials-crypto";
import { createSetupWizardAdmin } from "@/lib/setup/create-wizard-admin";
import {
  isAllowedBrandingLogoUrl,
  validateLogoFile,
} from "@/lib/setup/logo-validation";
import { checkSetupRateLimit } from "@/lib/setup/rate-limit";
import { assertSetupActionAuthorized } from "@/lib/setup/setup-auth";
import {
  markSetupCompletedAtomic,
  withSetupAdvisoryLock,
} from "@/lib/setup/setup-lock";
import {
  SCHOOL_BRANDING_BUCKET,
  SETUP_OK_COOKIE,
} from "@/lib/setup/constants";
import {
  SetupGuardError,
  assertBrandingSaved,
  assertSetupNotCompleted,
  assertSetupStepAtLeast,
  saveAiCredentialsData,
  saveSchoolBrandingData,
  updateSetupStatusData,
  uploadToSupabaseBucket,
  upsertAppSettingsOg,
} from "@/lib/setup/wizard-db";
import { wizardIndexToDbStep } from "@/lib/setup/schemas/setup-status";
import { wizardBrandingSchema } from "@/lib/setup/validations/wizard-branding";
import {
  WIZARD_FREE_OPENROUTER_MODELS,
  wizardAiConfigSchema,
} from "@/lib/setup/validations/wizard-ai";
import { wizardAdminSchema } from "@/lib/setup/validations/wizard-admin";
import { OG_METADATA_CACHE_TAG } from "@/lib/seo-metadata";
import { clearAiCredentialsCache } from "@/lib/ai/credentials-resolver";
import { hasMinimumSetupEnv } from "@/lib/setup/db-url";
import { ensureStorageBuckets } from "@/lib/setup/ensure-storage-buckets";

export type SetupActionResult =
  | { ok: true }
  | { ok: false; error: string; code?: string };

function toActionError(error: unknown): SetupActionResult {
  if (error instanceof SetupGuardError) {
    return { ok: false, error: error.message, code: error.code };
  }
  if (error instanceof Error) {
    return { ok: false, error: error.message };
  }
  return { ok: false, error: "เกิดข้อผิดพลาด กรุณาลองใหม่" };
}

async function guardSetupAction(): Promise<void> {
  await assertSetupActionAuthorized();
  await assertSetupNotCompleted();
}

async function testGeminiKey(apiKey: string): Promise<void> {
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
    method: "GET",
    headers: { "x-goog-api-key": apiKey },
  });
  if (!res.ok) {
    throw new Error("Gemini API key ไม่ถูกต้องหรือเชื่อมต่อไม่ได้");
  }
}

async function testOpenRouterKey(apiKey: string, model: string): Promise<void> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Found-U Setup",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Reply OK only." }],
      max_tokens: 8,
    }),
  });
  if (!res.ok) {
    throw new Error("OpenRouter API key ไม่ถูกต้องหรือเชื่อมต่อไม่ได้");
  }
}

export async function setSetupStepAction(
  stepIndex: number
): Promise<SetupActionResult> {
  try {
    await guardSetupAction();
    if (stepIndex < 0 || stepIndex > 2) {
      return { ok: false, error: "ขั้นตอนไม่ถูกต้อง" };
    }
    await updateSetupStatusData({ current_step: wizardIndexToDbStep(stepIndex) });
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function saveBrandingAction(
  formData: FormData
): Promise<SetupActionResult> {
  try {
    await guardSetupAction();

    const schoolName = String(formData.get("schoolName") ?? "");
    const parsed = wizardBrandingSchema.safeParse({ schoolName });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
    }

    let logoUrl: string | undefined;
    const logoFile = formData.get("logo");
    if (logoFile instanceof File && logoFile.size > 0) {
      await ensureStorageBuckets();
      const { mime, ext } = await validateLogoFile(logoFile);
      const path = `logo-${Date.now()}.${ext}`;
      logoUrl = await uploadToSupabaseBucket(
        SCHOOL_BRANDING_BUCKET,
        path,
        logoFile,
        mime
      );
    }

    const existingLogo = formData.get("existingLogoUrl");
    if (
      !logoUrl &&
      typeof existingLogo === "string" &&
      isAllowedBrandingLogoUrl(existingLogo)
    ) {
      logoUrl = existingLogo;
    }

    await saveSchoolBrandingData({
      school_name: parsed.data.schoolName,
      ...(logoUrl ? { logo_url: logoUrl } : {}),
    });

    const ogDescription = `ระบบแจ้งของหายและของเจอสำหรับ${parsed.data.schoolName}`;
    await upsertAppSettingsOg({
      ogTitle: `${parsed.data.schoolName} | Found-U`,
      ogDescription,
      ...(logoUrl ? { ogImage: logoUrl } : {}),
    });

    await updateSetupStatusData({ current_step: wizardIndexToDbStep(1) });
    revalidateTag(OG_METADATA_CACHE_TAG, { expire: 0 });

    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function saveAiConfigAction(input: {
  provider: "auto" | "gemini" | "openrouter" | "none";
  geminiApiKey?: string;
  openrouterApiKey?: string;
  openrouterModel?: string;
}): Promise<SetupActionResult> {
  try {
    await guardSetupAction();
    await assertSetupStepAtLeast(1);
    await assertBrandingSaved();

    const parsed = wizardAiConfigSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
    }

    const model =
      parsed.data.openrouterModel?.trim() ||
      WIZARD_FREE_OPENROUTER_MODELS[0];

    if (parsed.data.provider === "gemini" || parsed.data.provider === "auto") {
      const key = parsed.data.geminiApiKey?.trim();
      if (!key) return { ok: false, error: "กรุณากรอก Gemini API key" };
      await testGeminiKey(key);
    }
    if (parsed.data.provider === "openrouter" || parsed.data.provider === "auto") {
      const key = parsed.data.openrouterApiKey?.trim();
      if (!key) return { ok: false, error: "กรุณากรอก OpenRouter API key" };
      await testOpenRouterKey(key, model);
    }

    await saveAiCredentialsData({
      provider: parsed.data.provider,
      ...(parsed.data.geminiApiKey?.trim()
        ? { gemini_api_key_encrypted: encryptSecret(parsed.data.geminiApiKey.trim()) }
        : {}),
      ...(parsed.data.openrouterApiKey?.trim()
        ? {
            openrouter_api_key_encrypted: encryptSecret(
              parsed.data.openrouterApiKey.trim()
            ),
          }
        : {}),
      openrouter_model: model,
    });

    await updateSetupStatusData({ current_step: wizardIndexToDbStep(2) });
    clearAiCredentialsCache();
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function skipAiConfigAction(): Promise<SetupActionResult> {
  try {
    await guardSetupAction();
    await assertSetupStepAtLeast(1);
    await assertBrandingSaved();
    await saveAiCredentialsData({ provider: "none" });
    await updateSetupStatusData({ current_step: wizardIndexToDbStep(2) });
    clearAiCredentialsCache();
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function testAiCredentialsAction(input: {
  provider: "auto" | "gemini" | "openrouter";
  geminiApiKey?: string;
  openrouterApiKey?: string;
  openrouterModel?: string;
}): Promise<SetupActionResult> {
  try {
    await guardSetupAction();

    const headerStore = await headers();
    const ip =
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headerStore.get("x-real-ip") ||
      "unknown";
    if (!checkSetupRateLimit(`test-ai:${ip}`)) {
      return { ok: false, error: "ลองบ่อยเกินไป กรุณารอสักครู่" };
    }

    const model =
      input.openrouterModel?.trim() || WIZARD_FREE_OPENROUTER_MODELS[0];

    if (input.provider === "gemini" || input.provider === "auto") {
      const key = input.geminiApiKey?.trim();
      if (!key) return { ok: false, error: "กรุณากรอก Gemini API key" };
      await testGeminiKey(key);
    }

    if (input.provider === "openrouter" || input.provider === "auto") {
      const key = input.openrouterApiKey?.trim();
      if (!key) return { ok: false, error: "กรุณากรอก OpenRouter API key" };
      await testOpenRouterKey(key, model);
    }

    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function completeSetupAction(input: {
  studentId: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
}): Promise<SetupActionResult> {
  try {
    await guardSetupAction();
    await assertSetupStepAtLeast(2);
    await assertBrandingSaved();

    if (!hasMinimumSetupEnv()) {
      return {
        ok: false,
        error:
          "ยังตั้งค่า Supabase ไม่ครบ (URL, anon key, service role) — ตั้งค่าใน Vercel แล้ว redeploy",
        code: "missing_env",
      };
    }

    const parsed = wizardAdminSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
    }

    let uid = "";
    await withSetupAdvisoryLock(async () => {
      await assertSetupNotCompleted();
      const { uid: createdUid } = await createSetupWizardAdmin({
        studentId: parsed.data.studentId,
        password: parsed.data.password,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        nickname: parsed.data.nickname,
      });
      uid = createdUid;

      const marked = await markSetupCompletedAtomic(uid);
      if (!marked) {
        throw new SetupGuardError("ตั้งค่าระบบเสร็จแล้ว", "completed");
      }
    });

    revalidateTag(OG_METADATA_CACHE_TAG, { expire: 0 });

    const cookieStore = await cookies();
    cookieStore.delete(SETUP_OK_COOKIE);

    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}
