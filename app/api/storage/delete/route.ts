import { NextRequest, NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { z } from "zod";
import { parseJsonBody } from "@/lib/parse-request";

export const runtime = "nodejs";

const deleteUploadSchema = z.object({
  path: z.string().trim().min(1).optional(),
  url: z.string().trim().url().optional(),
});

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} environment variable`);
  }
  return value;
}

function normalizePath(path: string): string {
  const trimmed = path.replace(/^\/+/, "");
  if (!trimmed || trimmed.includes("..")) {
    throw new Error("Invalid path");
  }
  return trimmed;
}

function getR2Client() {
  const accountId = getRequiredEnv("R2_ACCOUNT_ID");
  const accessKeyId = getRequiredEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = getRequiredEnv("R2_SECRET_ACCESS_KEY");

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

function extractPathFromUrl(url: string): string | null {
  const baseUrl = process.env.R2_PUBLIC_BASE_URL;
  if (!baseUrl) return null;
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  if (!url.startsWith(normalizedBase)) return null;
  return url.slice(normalizedBase.length + 1);
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, deleteUploadSchema);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const rawPath =
      parsed.data.path || (parsed.data.url ? extractPathFromUrl(parsed.data.url) : "");
    const path = normalizePath(rawPath || "");

    const bucket = getRequiredEnv("R2_BUCKET_NAME");
    const client = getR2Client();

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: path,
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("R2 delete error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
