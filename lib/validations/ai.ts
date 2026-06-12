import { z } from "zod";

export const nerRequestSchema = z.object({
  text: z.string().trim().min(1, "กรุณากรอกข้อความ").max(4000, "ข้อความยาวเกินไป"),
});

export const visionRequestSchema = z.object({
  imageUrl: z.string().trim().url("URL รูปภาพไม่ถูกต้อง").optional(),
  prompt: z.string().trim().min(1, "กรุณากรอกคำสั่ง").max(2000, "คำสั่งยาวเกินไป"),
});

export const matchRequestSchema = z.object({
  lostItemId: z.string().trim().min(1, "lostItemId ไม่ถูกต้อง").optional(),
  foundItemId: z.string().trim().min(1, "foundItemId ไม่ถูกต้อง").optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
});
