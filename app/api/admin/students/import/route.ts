import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuthRequest, isAdminUser } from "@/lib/nfc-server";
import { importStudentRows, parseStudentRosterContent } from "@/lib/student-auth-server";
import { parseJsonBody } from "@/lib/parse-request";

const importStudentsBodySchema = z.object({
  csvContent: z.string().min(1, "ต้องส่ง csvContent"),
  dryRun: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  const authUser = await verifyAuthRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isAdminUser(authUser.uid))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const parsed = await parseJsonBody(request, importStudentsBodySchema);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { csvContent, dryRun } = parsed.data;

    const { rows, errors: parseErrors } = parseStudentRosterContent(csvContent);
    if (rows.length === 0 && parseErrors.length > 0) {
      return NextResponse.json({ error: "ไม่พบข้อมูลที่นำเข้าได้", parseErrors }, { status: 400 });
    }

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        previewCount: rows.length,
        rows: rows.map((r) => ({
          studentId: r.studentId,
          firstName: r.firstName,
          lastName: r.lastName,
          nickname: r.nickname,
          gradeLevel: r.gradeLevel,
          roomNumber: r.roomNumber,
          format: r.format,
          lineNumber: r.lineNumber,
        })),
        parseErrors,
      });
    }

    const importBatchId = `batch_${Date.now()}`;
    const summary = await importStudentRows(rows, importBatchId, authUser.uid);
    summary.errors.push(...parseErrors);

    return NextResponse.json({ importBatchId, summary, previewCount: rows.length });
  } catch (err) {
    console.error("Student import error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 500 }
    );
  }
}
