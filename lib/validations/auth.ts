import { z } from "zod";
import {
  newPasswordSchema,
  pinSchema,
  schoolPasswordSchema,
  studentIdSchema,
} from "@/lib/validations/primitives";

const passkeyResponseSchema = z.object({
  id: z.string().min(1, "Passkey response ไม่ถูกต้อง"),
  rawId: z.string().optional(),
  type: z.string().optional(),
  response: z.record(z.string(), z.unknown()).optional(),
});

export const loginWithPasswordSchema = z.object({
  studentId: studentIdSchema,
  password: schoolPasswordSchema,
});

export const loginWithPinSchema = z.object({
  studentId: studentIdSchema,
  pin: pinSchema,
});

export const pinSetupSchema = z.object({
  studentId: studentIdSchema,
  password: schoolPasswordSchema,
  pin: pinSchema,
});

export const passkeyLoginOptionsSchema = z.object({
  studentId: studentIdSchema.optional(),
});

export const passkeyLoginVerifySchema = z.object({
  challengeKey: z.string().min(1, "challengeKey ไม่ถูกต้อง"),
  response: passkeyResponseSchema,
  studentId: studentIdSchema.optional(),
});

export const passkeyRegisterVerifySchema = z.object({
  challengeKey: z.string().min(1, "challengeKey ไม่ถูกต้อง"),
  response: passkeyResponseSchema,
  studentId: studentIdSchema.optional(),
});

export const resetPasswordSchema = z.object({
  studentId: studentIdSchema,
  schoolPassword: schoolPasswordSchema,
  newPassword: newPasswordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: schoolPasswordSchema,
  newPassword: newPasswordSchema,
});

export const verifyPasswordSchema = z.object({
  password: schoolPasswordSchema,
});

export const linkGoogleSchema = z.object({
  studentId: studentIdSchema,
  password: schoolPasswordSchema,
});
