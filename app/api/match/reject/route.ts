import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/parse-request";
import { requireMatchAdmin } from "@/lib/match-auth";
import { rejectPair } from "@/lib/match-service";

const bodySchema = z.object({
  lostId: z.string().min(1),
  foundId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const auth = await requireMatchAdmin(request);
  if ("error" in auth) return auth.error;

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { lostId, foundId } = parsed.data;
  const result = await rejectPair(lostId, foundId, auth.authUser.uid);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, lostId, foundId });
}
