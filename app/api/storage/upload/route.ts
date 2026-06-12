import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { parseJsonBody } from "@/lib/parse-request";

export const runtime = "nodejs";

const presignUploadSchema = z.object({
  path: z.string().trim().min(1, "กรุณาระบุ path"),
  contentType: z.string().trim().min(1, "กรุณาระบุ contentType").optional(),
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

function buildPublicUrl(path: string) {
  const baseUrl = getRequiredEnv("R2_PUBLIC_BASE_URL");
  return `${baseUrl.replace(/\/+$/, "")}/${path}`;
}

export async function POST(request: NextRequest) {
  try {
    const contentTypeHeader = request.headers.get("content-type") || "";

    if (contentTypeHeader.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File;
      const path = normalizePath(formData.get("path") as string || "");

      if (!file || !path) {
        return NextResponse.json({ error: "File and path are required" }, { status: 400 });
      }

      const bucket = getRequiredEnv("R2_BUCKET_NAME");
      const client = getR2Client();
      const buffer = Buffer.from(await file.arrayBuffer());

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: path,
        ContentType: file.type || "application/octet-stream",
        Body: buffer,
      });

      await client.send(command);
      const publicUrl = buildPublicUrl(path);

      return NextResponse.json({ publicUrl, path });
    }

    const parsed = await parseJsonBody(request, presignUploadSchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const path = normalizePath(parsed.data.path);
    const contentType = parsed.data.contentType || "application/octet-stream";

    const bucket = getRequiredEnv("R2_BUCKET_NAME");
    const client = getR2Client();

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: path,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 });
    const publicUrl = buildPublicUrl(path);

    return NextResponse.json({ uploadUrl, publicUrl, path });
  } catch (error) {
    console.error("R2 upload error:", error);
    return NextResponse.json({ error: "Upload configuration error" }, { status: 500 });
  }
}
