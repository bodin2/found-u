import { z } from "zod";

export const uploadRequestSchema = z.object({
  filename: z.string().trim().min(1, "กรุณาระบุชื่อไฟล์"),
  contentType: z.string().trim().min(1, "กรุณาระบุประเภทไฟล์"),
  size: z.number().int().min(1, "ขนาดไฟล์ไม่ถูกต้อง"),
  folder: z.string().trim().optional(),
});

export const deleteRequestSchema = z.object({
  path: z.string().trim().min(1, "กรุณาระบุ path ที่ต้องการลบ"),
});
