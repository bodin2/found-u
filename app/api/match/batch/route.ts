import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/parse-request";
import { requireMatchAdmin } from "@/lib/match-auth";
import {
  getAppSettingsAdmin,
  listConfirmedMatches,
  serializeMatchForJson,
  suggestAll,
} from "@/lib/match-service";

const bodySchema = z.object({
  useAI: z.boolean().optional().default(false),
  includeHistory: z.boolean().optional().default(true),
});

/**
 * Admin batch suggestions for Review Queue.
 */
export async function POST(request: NextRequest) {
  const auth = await requireMatchAdmin(request);
  if ("error" in auth) return auth.error;

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const { useAI, includeHistory } = parsed.data;
    const settings = useAI ? await getAppSettingsAdmin() : null;
    const { matches, pool } = await suggestAll({ useAI, settings });
    const history = includeHistory ? await listConfirmedMatches(40) : [];

    return NextResponse.json({
      matches: matches.map(serializeMatchForJson),
      total: matches.length,
      pool,
      useAI,
      history: history.map((h) => ({
        key: h.key,
        lostItem: h.lostItem,
        foundItem: h.foundItem,
        matchedAt: h.matchedAt,
      })),
    });
  } catch (error) {
    console.error("[match/batch]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireMatchAdmin(request);
  if ("error" in auth) return auth.error;

  try {
    const useAI = request.nextUrl.searchParams.get("useAI") === "true";
    const settings = useAI ? await getAppSettingsAdmin() : null;
    const { matches, pool } = await suggestAll({ useAI, settings });
    const history = await listConfirmedMatches(40);

    return NextResponse.json({
      matches: matches.map(serializeMatchForJson),
      total: matches.length,
      pool,
      useAI,
      history: history.map((h) => ({
        key: h.key,
        lostItem: h.lostItem,
        foundItem: h.foundItem,
        matchedAt: h.matchedAt,
      })),
    });
  } catch (error) {
    console.error("[match/batch GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
