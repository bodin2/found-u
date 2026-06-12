import { NextRequest, NextResponse } from 'next/server';
import { z } from "zod";
import { getLostItems, getFoundItems, getAppSettings } from '@/lib/database';
import { 
  findMatchesForLostItem, 
  findMatchesForFoundItem, 
  findMatchesForLostItemAI,
  findMatchesForFoundItemAI,
  getMatchConfidence 
} from '@/lib/matching';
import { parseJsonBody } from "@/lib/parse-request";

const matchBodySchema = z.object({
  type: z.enum(["lost", "found"]),
  itemId: z.string().min(1, "itemId is required"),
  useAI: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const { expireOverdueFoundItemsAdmin } = await import("@/lib/found-handover-expiry-server");
    await expireOverdueFoundItemsAdmin();

    const parsed = await parseJsonBody(request, matchBodySchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { type, itemId, useAI } = parsed.data;

    // Fetch all items
    const [allLostItems, allFoundItems] = await Promise.all([
      getLostItems(),
      getFoundItems(),
    ]);

    let matches;

    const aiSettings = useAI ? await getAppSettings() : null;
    const aiConfig = aiSettings
      ? {
          model: aiSettings.aiMatchingModel,
          temperature: aiSettings.aiMatchingTemperature,
          topP: aiSettings.aiMatchingTopP,
          maxOutputTokens: aiSettings.aiMatchingMaxOutputTokens,
        }
      : undefined;

    if (type === 'lost') {
      const lostItem = allLostItems.find(item => item.id === itemId);
      if (!lostItem) {
        return NextResponse.json(
          { error: 'Lost item not found' },
          { status: 404 }
        );
      }
      // Use AI matching if requested
      matches = useAI 
        ? await findMatchesForLostItemAI(lostItem, allFoundItems, 5, aiConfig)
        : findMatchesForLostItem(lostItem, allFoundItems);
    } else {
      const foundItem = allFoundItems.find(item => item.id === itemId);
      if (!foundItem) {
        return NextResponse.json(
          { error: 'Found item not found' },
          { status: 404 }
        );
      }
      // Use AI matching if requested
      matches = useAI
        ? await findMatchesForFoundItemAI(foundItem, allLostItems, 5, aiConfig)
        : findMatchesForFoundItem(foundItem, allLostItems);
    }

    // Format matches for response
    const formattedMatches = matches.map(match => ({
      ...match,
      confidence: getMatchConfidence(match.score),
      scorePercentage: Math.round(match.score * 100),
    }));

    return NextResponse.json({
      matches: formattedMatches,
      total: formattedMatches.length,
      useAI,
    });
  } catch (error) {
    console.error('Error in Match API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
