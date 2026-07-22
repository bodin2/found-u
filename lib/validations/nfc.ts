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

/** Allowlisted owner/admin tag updates — never accepts ownerId */
export const updateNfcTagSchema = z
  .object({
    status: nfcTagStatusSchema.optional(),
    lostItemId: z.string().trim().min(1, "lostItemId ไม่ถูกต้อง").optional(),
    itemName: z.string().trim().min(1, "กรุณาระบุชื่อสิ่งของ").max(200).optional(),
    description: z.string().trim().max(1000).optional(),
    category: z.string().trim().min(1).optional(),
    contacts: z.array(contactInfoSchema).min(1).optional(),
    ndefWritten: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.status !== undefined ||
      data.lostItemId !== undefined ||
      data.itemName !== undefined ||
      data.description !== undefined ||
      data.category !== undefined ||
      data.contacts !== undefined ||
      data.ndefWritten !== undefined,
    { message: "ไม่มีข้อมูลสำหรับอัปเดต" }
  );

/** @deprecated Use updateNfcTagSchema */
export const updateNfcTagStatusSchema = updateNfcTagSchema;

export const updateNfcReportStatusSchema = z.object({
  status: z.enum(["viewed", "resolved"], { error: "สถานะรายงานไม่ถูกต้อง" }),
});
