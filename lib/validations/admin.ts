import { z } from "zod";
import { studentIdSchema } from "@/lib/validations/primitives";

export const adminWhitelistEmailSchema = z
  .string()
  .trim()
  .email("อีเมลไม่ถูกต้อง");

export const addAdminWhitelistSchema = z.object({
  email: adminWhitelistEmailSchema,
  note: z.string().trim().max(255, "หมายเหตุยาวเกินไป").optional(),
});

export const removeAdminWhitelistSchema = z.object({
  email: adminWhitelistEmailSchema,
});

export const importStudentsSchema = z.object({
  csv: z.string().min(1, "กรุณาแนบข้อมูล CSV"),
  dryRun: z.boolean().optional().default(false),
});

export const updateStudentStatusSchema = z.object({
  studentId: studentIdSchema,
  status: z.enum(["active", "disabled"], { error: "สถานะนักเรียนไม่ถูกต้อง" }),
});
