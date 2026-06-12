import { NextRequest, NextResponse } from "next/server";
import { verifyAuthRequest, updateNfcTagStatusAdmin } from "@/lib/nfc-server";
import { parseJsonBody } from "@/lib/parse-request";
import { updateNfcTagStatusSchema } from "@/lib/validations/nfc";

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
    const parsed = await parseJsonBody(request, updateNfcTagStatusSchema);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { status, lostItemId } = parsed.data;

    await updateNfcTagStatusAdmin(id, user.uid, status, lostItemId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    if (message === "tag_not_found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message === "forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("NFC tag update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
