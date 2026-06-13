import { z } from "zod";

const trimString = z.string().trim();

export { trimString };

export const studentIdSchema = trimString
  .regex(/^\d{5}$/, "เลขประจำตัวนักเรียนต้องเป็นตัวเลข 5 หลัก");

export const schoolPasswordSchema = trimString
  .regex(/^[A-Za-z0-9]{7,8}$/, "รหัสผ่านโรงเรียนต้องเป็น a-z, A-Z, 0-9 และยาว 7-8 ตัว");

export const newPasswordSchema = trimString
  .min(8, "รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัว")
  .regex(/[A-Za-z]/, "รหัสผ่านใหม่ต้องมีตัวอักษรอย่างน้อย 1 ตัว")
  .regex(/\d/, "รหัสผ่านใหม่ต้องมีตัวเลขอย่างน้อย 1 ตัว");

export const pinSchema = trimString
  .regex(/^\d{6}$/, "PIN ต้องเป็นตัวเลข 6 หลัก");

export const contactTypeSchema = z.enum(["phone", "line", "instagram", "facebook", "email"], {
  error: "ประเภทช่องทางติดต่อไม่ถูกต้อง",
});

export const contactInfoSchema = z.object({
  type: contactTypeSchema,
  value: trimString.min(1, "กรุณากรอกข้อมูลติดต่อ"),
});

export const geoPointSchema = z.object(
  {
    lat: z.number().min(-90, "ละติจูดไม่ถูกต้อง").max(90, "ละติจูดไม่ถูกต้อง"),
    lng: z.number().min(-180, "ลองจิจูดไม่ถูกต้อง").max(180, "ลองจิจูดไม่ถูกต้อง"),
    accuracy: z.number().min(0, "ความแม่นยำต้องมากกว่าหรือเท่ากับ 0").optional(),
    source: z.enum(["gps", "map", "manual"], { error: "แหล่งที่มาพิกัดไม่ถูกต้อง" }).optional(),
  },
  { error: "ข้อมูลพิกัดไม่ถูกต้อง" }
);

export const optionalGeoPointSchema = geoPointSchema.optional();
