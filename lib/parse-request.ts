import { z, type ZodIssue, type ZodType } from "zod";

export function formatZodError(error: z.ZodError): string {
  const issueText = error.issues
    .map((issue: ZodIssue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "body";
      return `${path}: ${issue.message}`;
    })
    .join("; ");

  return issueText || "ข้อมูลไม่ถูกต้อง";
}

export async function parseJsonBody<TSchema extends ZodType>(
  request: Request,
  schema: TSchema
): Promise<{ success: true; data: z.infer<TSchema> } | { success: false; error: string }> {
  try {
    const raw = await request.json();
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: formatZodError(parsed.error) };
    }
    return { success: true, data: parsed.data };
  } catch {
    return { success: false, error: "รูปแบบ JSON ไม่ถูกต้อง" };
  }
}
