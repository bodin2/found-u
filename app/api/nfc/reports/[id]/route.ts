import { NextRequest, NextResponse } from "next/server";
import { verifyAuthRequest, updateNfcFoundReportStatusAdmin } from "@/lib/nfc-server";
import { parseJsonBody } from "@/lib/parse-request";
import { updateNfcReportStatusSchema } from "@/lib/validations/nfc";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuthRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const parsed = await parseJsonBody(request, updateNfcReportStatusSchema);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { status } = parsed.data;

    await updateNfcFoundReportStatusAdmin(id, user.uid, status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    if (message === "report_not_found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message === "forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("NFC report update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
