import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/parse-request";
import {
  getAppSettingsAdmin,
  serializeMatchForJson,
  suggestForItem,
} from "@/lib/match-service";
import { optionalMatchAuth } from "@/lib/match-auth";

const matchBodySchema = z.object({
  type: z.enum(["lost", "found"]),
  itemId: z.string().min(1, "itemId is required"),
  useAI: z.boolean().optional().default(false),
});

/**
 * Suggest matches for a single item (students + admin).
 * Prefetches matchable candidates by status + date window — no full-table dump.
 */
export async function POST(request: NextRequest) {
  try {
    const { expireOverdueFoundItemsAdmin } = await import(
      "@/lib/found-handover-expiry-server"
    );
    await expireOverdueFoundItemsAdmin();

    const parsed = await parseJsonBody(request, matchBodySchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { type, itemId, useAI } = parsed.data;
    const authUser = await optionalMatchAuth(request);

    // Soft auth: prefer authenticated callers; still allow public suggest for post-submit UX
    // but never expose PII beyond item fields already public via RLS select.
    void authUser;

    const settings = useAI ? await getAppSettingsAdmin() : null;
    const matches = await suggestForItem({ type, itemId, useAI, settings });

    return NextResponse.json({
      matches: matches.map(serializeMatchForJson),
      total: matches.length,
      useAI,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    if (message === "LOST_NOT_FOUND" || message === "FOUND_NOT_FOUND") {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    console.error("Error in Match API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
