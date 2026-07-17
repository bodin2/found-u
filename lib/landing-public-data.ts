import { promises as fs } from "node:fs";
import path from "node:path";
import { imageSize } from "image-size";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_APP_SETTINGS, type AppSettings } from "@/lib/types";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);
const ALLOWED_FOLDERS = new Set(["img", "img/mobile_responsive"]);

export type PublicHeroImage = {
  fileName: string;
  label: string;
  url: string;
  width: number;
  height: number;
};

export type PublicLandingSettings = {
  comingSoonEnabled: boolean;
  comingSoonMessage: string;
};

export function normalizeComingSoonMessage(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function toDisplayName(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, "");
}

export async function getPublicHeroImages(
  folder: "img" | "img/mobile_responsive"
): Promise<PublicHeroImage[]> {
  const safeFolder = ALLOWED_FOLDERS.has(folder) ? folder : "img";

  try {
    const dirPath = path.join(process.cwd(), "public", ...safeFolder.split("/"));
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const collator = new Intl.Collator("th", { numeric: true, sensitivity: "base" });

    const imageFiles = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()))
      .sort((a, b) => collator.compare(a, b));

    return await Promise.all(
      imageFiles.map(async (fileName) => {
        const filePath = path.join(dirPath, fileName);
        const fileBuffer = await fs.readFile(filePath);
        const dim = imageSize(fileBuffer);
        return {
          fileName,
          label: toDisplayName(fileName),
          url: `/${safeFolder}/${encodeURIComponent(fileName)}`,
          width: dim.width ?? 1080,
          height: dim.height ?? 1920,
        };
      })
    );
  } catch {
    return [];
  }
}

export async function getPublicLandingSettings(): Promise<PublicLandingSettings> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("app_settings")
      .select("settings")
      .eq("id", "default")
      .maybeSingle();

    const settings = (data?.settings ?? {}) as AppSettings;
    const fallbackMessage =
      DEFAULT_APP_SETTINGS.comingSoonMessage ?? "พบกันเร็วๆนี้";

    return {
      comingSoonEnabled:
        settings.comingSoonEnabled ?? DEFAULT_APP_SETTINGS.comingSoonEnabled ?? false,
      comingSoonMessage: normalizeComingSoonMessage(
        settings.comingSoonMessage,
        fallbackMessage
      ),
    };
  } catch {
    return {
      comingSoonEnabled: DEFAULT_APP_SETTINGS.comingSoonEnabled ?? false,
      comingSoonMessage: normalizeComingSoonMessage(
        DEFAULT_APP_SETTINGS.comingSoonMessage,
        "พบกันเร็วๆนี้"
      ),
    };
  }
}
