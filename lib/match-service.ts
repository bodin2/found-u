import { createAdminClient } from "@/lib/supabase/admin";
import { mapFoundItemRow, mapLostItemRow } from "@/lib/agent/row-mappers";
import {
  MATCHABLE_FOUND_STATUSES,
  MATCHABLE_LOST_STATUSES,
  MATCH_TIME_WINDOW_DAYS,
  findMatchesForFoundItem,
  findMatchesForFoundItemAI,
  findMatchesForLostItem,
  findMatchesForLostItemAI,
  getMatchConfidence,
  type MatchScore,
} from "@/lib/matching";
import type { AppSettings, FoundItem, LostItem } from "@/lib/types";
import { DEFAULT_APP_SETTINGS } from "@/lib/types";

export type MatchAiConfig = {
  model?: string;
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
};

export type FormattedMatch = MatchScore & {
  key: string;
  confidence: "high" | "medium" | "low";
  scorePercentage: number;
};

function formatMatch(match: MatchScore): FormattedMatch {
  return {
    ...match,
    key: `${match.lostItem.id}_${match.foundItem.id}`,
    confidence: getMatchConfidence(match.score),
    scorePercentage: Math.round(match.score * 100),
  };
}

function aiConfigFromSettings(settings?: AppSettings | null): MatchAiConfig {
  const s = settings ?? DEFAULT_APP_SETTINGS;
  return {
    model: s.aiMatchingModel,
    temperature: s.aiMatchingTemperature,
    topP: s.aiMatchingTopP,
    maxOutputTokens: s.aiMatchingMaxOutputTokens,
  };
}

function dateWindowBounds(anchor: Date): { from: string; to: string } {
  const ms = MATCH_TIME_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return {
    from: new Date(anchor.getTime() - ms).toISOString(),
    to: new Date(anchor.getTime() + ms).toISOString(),
  };
}

export async function getAppSettingsAdmin(): Promise<AppSettings> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("app_settings")
    .select("settings")
    .eq("id", "default")
    .maybeSingle();
  const settings = (data?.settings as Record<string, unknown> | null) || {};
  return { ...DEFAULT_APP_SETTINGS, ...settings } as AppSettings;
}

export async function loadMatchableLostItems(options?: {
  aroundDate?: Date;
}): Promise<LostItem[]> {
  const admin = createAdminClient();
  let query = admin
    .from("lost_items")
    .select("*")
    .in("status", [...MATCHABLE_LOST_STATUSES])
    .is("matched_found_id", null)
    .order("created_at", { ascending: false });

  if (options?.aroundDate) {
    const { from, to } = dateWindowBounds(options.aroundDate);
    query = query.gte("date_lost", from).lte("date_lost", to);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapLostItemRow(row as Record<string, unknown>));
}

export async function loadMatchableFoundItems(options?: {
  aroundDate?: Date;
}): Promise<FoundItem[]> {
  const admin = createAdminClient();
  let query = admin
    .from("found_items")
    .select("*")
    .in("status", [...MATCHABLE_FOUND_STATUSES])
    .is("matched_lost_id", null)
    .order("created_at", { ascending: false });

  if (options?.aroundDate) {
    const { from, to } = dateWindowBounds(options.aroundDate);
    query = query.gte("date_found", from).lte("date_found", to);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapFoundItemRow(row as Record<string, unknown>));
}

export async function getLostItemByIdAdmin(id: string): Promise<LostItem | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("lost_items").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapLostItemRow(data as Record<string, unknown>);
}

export async function getFoundItemByIdAdmin(id: string): Promise<FoundItem | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("found_items").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapFoundItemRow(data as Record<string, unknown>);
}

async function loadDismissalKeys(): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("match_dismissals").select("lost_id, found_id");
  if (error) {
    // Table may not exist yet in local envs — treat as empty
    console.warn("[match-service] match_dismissals load failed:", error.message);
    return new Set();
  }
  return new Set(
    (data ?? []).map((row) => {
      const r = row as { lost_id: string; found_id: string };
      return `${r.lost_id}_${r.found_id}`;
    })
  );
}

function filterDismissed(matches: MatchScore[], dismissed: Set<string>): MatchScore[] {
  if (dismissed.size === 0) return matches;
  return matches.filter((m) => !dismissed.has(`${m.lostItem.id}_${m.foundItem.id}`));
}

export async function suggestForItem(options: {
  type: "lost" | "found";
  itemId: string;
  useAI?: boolean;
  settings?: AppSettings | null;
}): Promise<FormattedMatch[]> {
  const useAI = Boolean(options.useAI);
  const aiConfig = useAI ? aiConfigFromSettings(options.settings) : undefined;
  const dismissed = await loadDismissalKeys();

  if (options.type === "lost") {
    const lostItem = await getLostItemByIdAdmin(options.itemId);
    if (!lostItem) throw new Error("LOST_NOT_FOUND");
    const foundItems = await loadMatchableFoundItems({ aroundDate: lostItem.dateLost });
    const matches = useAI
      ? await findMatchesForLostItemAI(lostItem, foundItems, 5, aiConfig)
      : findMatchesForLostItem(lostItem, foundItems);
    return filterDismissed(matches, dismissed).map(formatMatch);
  }

  const foundItem = await getFoundItemByIdAdmin(options.itemId);
  if (!foundItem) throw new Error("FOUND_NOT_FOUND");
  const lostItems = await loadMatchableLostItems({ aroundDate: foundItem.dateFound });
  const matches = useAI
    ? await findMatchesForFoundItemAI(foundItem, lostItems, 5, aiConfig)
    : findMatchesForFoundItem(foundItem, lostItems);
  return filterDismissed(matches, dismissed).map(formatMatch);
}

export async function suggestAll(options?: {
  useAI?: boolean;
  settings?: AppSettings | null;
}): Promise<{
  matches: FormattedMatch[];
  pool: { lost: number; found: number; highConfidence: number };
}> {
  const useAI = Boolean(options?.useAI);
  const aiConfig = useAI ? aiConfigFromSettings(options?.settings) : undefined;
  const [lostItems, foundItems, dismissed] = await Promise.all([
    loadMatchableLostItems(),
    loadMatchableFoundItems(),
    loadDismissalKeys(),
  ]);

  const seen = new Set<string>();
  const results: MatchScore[] = [];

  for (const lostItem of lostItems) {
    const itemMatches = useAI
      ? await findMatchesForLostItemAI(lostItem, foundItems, 5, aiConfig)
      : findMatchesForLostItem(lostItem, foundItems);

    for (const match of itemMatches) {
      const key = `${match.lostItem.id}_${match.foundItem.id}`;
      if (seen.has(key) || dismissed.has(key)) continue;
      seen.add(key);
      results.push(match);
    }
  }

  results.sort((a, b) => b.score - a.score);
  const matches = results.map(formatMatch);
  return {
    matches,
    pool: {
      lost: lostItems.length,
      found: foundItems.length,
      highConfidence: matches.filter((m) => m.confidence === "high").length,
    },
  };
}

export type ConfirmMatchResult =
  | { ok: true; lostId: string; foundId: string }
  | { ok: false; error: string };

export async function confirmMatch(
  lostId: string,
  foundId: string
): Promise<ConfirmMatchResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("confirm_item_match", {
    p_lost_id: lostId,
    p_found_id: foundId,
  });

  if (error) {
    console.error("[confirmMatch]", error);
    return { ok: false, error: error.message };
  }

  const result = data as { ok?: boolean; error?: string; lost_id?: string; found_id?: string } | null;
  if (!result?.ok) {
    return { ok: false, error: result?.error || "confirm_failed" };
  }
  return { ok: true, lostId, foundId };
}

export async function unmatchPair(
  lostId: string,
  foundId: string
): Promise<ConfirmMatchResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("unmatch_item_match", {
    p_lost_id: lostId,
    p_found_id: foundId,
  });

  if (error) {
    console.error("[unmatchPair]", error);
    return { ok: false, error: error.message };
  }

  const result = data as { ok?: boolean; error?: string } | null;
  if (!result?.ok) {
    return { ok: false, error: result?.error || "unmatch_failed" };
  }
  return { ok: true, lostId, foundId };
}

export async function rejectPair(
  lostId: string,
  foundId: string,
  dismissedBy?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const { error } = await admin.from("match_dismissals").upsert(
    {
      lost_id: lostId,
      found_id: foundId,
      dismissed_by: dismissedBy || null,
      created_at: new Date().toISOString(),
    },
    { onConflict: "lost_id,found_id" }
  );

  if (error) {
    console.error("[rejectPair]", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export type ConfirmedMatchPair = {
  key: string;
  lostItem: LostItem;
  foundItem: FoundItem;
  matchedAt: Date;
};

export async function listConfirmedMatches(limit = 50): Promise<ConfirmedMatchPair[]> {
  const admin = createAdminClient();
  const { data: lostRows, error } = await admin
    .from("lost_items")
    .select("*")
    .not("matched_found_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  const pairs: ConfirmedMatchPair[] = [];
  for (const row of lostRows ?? []) {
    const lost = mapLostItemRow(row as Record<string, unknown>);
    if (!lost.matchedFoundId) continue;
    const found = await getFoundItemByIdAdmin(lost.matchedFoundId);
    if (!found) continue;
    pairs.push({
      key: `${lost.id}_${found.id}`,
      lostItem: lost,
      foundItem: found,
      matchedAt: lost.updatedAt,
    });
  }
  return pairs;
}

export function serializeMatchForJson(match: FormattedMatch) {
  return {
    key: match.key,
    score: match.score,
    scorePercentage: match.scorePercentage,
    confidence: match.confidence,
    reasons: match.reasons,
    lostItem: match.lostItem,
    foundItem: match.foundItem,
  };
}
