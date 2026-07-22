import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/parse-request";
import { requireMatchAdmin } from "@/lib/match-auth";
import {
  confirmMatch,
  getFoundItemByIdAdmin,
  getLostItemByIdAdmin,
} from "@/lib/match-service";
import { logItemMatched } from "@/lib/logger";

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
  const result = await confirmMatch(lostId, foundId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  const [lost, found] = await Promise.all([
    getLostItemByIdAdmin(lostId),
    getFoundItemByIdAdmin(foundId),
  ]);

  await logItemMatched(
    lostId,
    lost?.itemName || lostId,
    foundId,
    found?.itemName || found?.description?.substring(0, 50) || foundId,
    auth.authUser.email
  );

  return NextResponse.json({
    ok: true,
    lostId,
    foundId,
    lostStatus: "found",
    foundStatus: "found",
  });
}
