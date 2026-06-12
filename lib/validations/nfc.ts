import { z } from "zod";
import { contactInfoSchema, geoPointSchema } from "@/lib/validations/primitives";

export const nfcTagStatusSchema = z.enum(["active", "lost", "returned", "disabled"], {
  error: "สถานะ NFC ไม่ถูกต้อง",
});

export const registerNfcTagSchema = z.object({
  itemName: z.string().trim().min(1, "กรุณาระบุชื่อสิ่งของ"),
  category: z.string().trim().min(1, "กรุณาระบุหมวดหมู่"),
  description: z.string().trim().max(1000, "คำอธิบายยาวเกินไป").optional(),
  contacts: z.array(contactInfoSchema).min(1, "กรุณาระบุช่องทางติดต่ออย่างน้อย 1 ช่องทาง"),
  tagUid: z.string().trim().min(1, "tagUid ไม่ถูกต้อง").optional(),
  readOnlyLocked: z.boolean().default(true),
});

export const createNfcFoundReportSchema = z.object({
  tagId: z.string().trim().min(1, "tagId ไม่ถูกต้อง"),
  finderMessage: z.string().trim().min(1, "กรุณากรอกข้อความสำหรับเจ้าของ"),
  locationFound: z.string().trim().max(255, "ชื่อสถานที่ยาวเกินไป").optional(),
  locationCoords: geoPointSchema.optional(),
  finderContacts: z.array(contactInfoSchema).optional(),
});

export const updateNfcTagStatusSchema = z.object({
  status: nfcTagStatusSchema,
  lostItemId: z.string().trim().min(1, "lostItemId ไม่ถูกต้อง").optional(),
});

export const updateNfcReportStatusSchema = z.object({
  status: z.enum(["viewed", "resolved"], { error: "สถานะรายงานไม่ถูกต้อง" }),
});
