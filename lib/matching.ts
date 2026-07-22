// Enhanced Automatic matching algorithm for lost and found items
// Uses hierarchical filtering strategy: Category → Location → Time → Item → Description

import { DEFAULT_APP_SETTINGS } from './types';
import type { LostItem, FoundItem, ItemCategory } from './types';
import { calculateSimilarity } from './ner';
import { resolveAiCredentials, getGeminiApiKey } from '@/lib/ai/credentials-resolver';
import { timestampToDate } from '@/lib/database';

function toDate(date: Date | undefined | unknown): Date {
  return timestampToDate(date);
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function distanceToScore(distanceKm: number): number {
  if (distanceKm <= 0.1) return 1;
  if (distanceKm <= 0.5) return 0.85;
  if (distanceKm <= 1) return 0.7;
  if (distanceKm <= 2) return 0.5;
  if (distanceKm <= 5) return 0.3;
  return 0;
}

export interface MatchScore {
  lostItem: LostItem;
  foundItem: FoundItem;
  score: number;
  scorePercentage?: number;
  reasons: string[];
  confidence: 'high' | 'medium' | 'low';
}

/** Lost items eligible for matching */
export const MATCHABLE_LOST_STATUSES = ["searching"] as const;

/**
 * Found items eligible for matching.
 * Excludes `claimed` (already returned) and `expired`.
 */
export const MATCHABLE_FOUND_STATUSES = ["pending_room_confirm", "found"] as const;

/** Max day gap between lost/found dates for a candidate pair */
export const MATCH_TIME_WINDOW_DAYS = 30;

/** Parallel Gemini compare calls in AI re-rank */
export const AI_MATCH_CONCURRENCY = 3;

export type MatchableLostStatus = (typeof MATCHABLE_LOST_STATUSES)[number];
export type MatchableFoundStatus = (typeof MATCHABLE_FOUND_STATUSES)[number];

export function isMatchableLostItem(item: Pick<LostItem, "status" | "matchedFoundId">): boolean {
  return (
    (MATCHABLE_LOST_STATUSES as readonly string[]).includes(item.status) &&
    !item.matchedFoundId
  );
}

export function isMatchableFoundItem(item: Pick<FoundItem, "status" | "matchedLostId">): boolean {
  return (
    (MATCHABLE_FOUND_STATUSES as readonly string[]).includes(item.status) &&
    !item.matchedLostId
  );
}

// Weights for different matching criteria (adjusted for better accuracy)
export const MATCH_WEIGHTS = {
  categoryMatch: 0.20,      // Category is important indicator
  itemSimilarity: 0.35,     // Item name is most important
  locationSimilarity: 0.20, // Location helps narrow down
  descriptionSimilarity: 0.15,
  timeProximity: 0.10,
};

// Thresholds for matching (balanced for accuracy)
export const MATCH_THRESHOLD = 0.40;       // Minimum score to be considered a match
export const HIGH_CONFIDENCE_THRESHOLD = 0.70;
export const MEDIUM_CONFIDENCE_THRESHOLD = 0.55;
export const MIN_REASONS_FOR_MATCH = 1;    // Must have at least 1 reason to be a valid match

/** @deprecated Use MATCH_WEIGHTS */
const WEIGHTS = MATCH_WEIGHTS;

// Location keywords mapping for smart matching (expanded)
const LOCATION_KEYWORDS: Record<string, string[]> = {
  'โรงอาหาร': ['โรงอาหาร', 'canteen', 'ทานข้าว', 'อาหาร', 'โต๊ะอาหาร', 'ศูนย์อาหาร'],
  'สนามกีฬา': ['สนามกีฬา', 'โกล', 'สนามบอล', 'สนามฟุตบอล', 'กีฬา', 'court', 'สนาม', 'ฟุตซอล', 'บาส', 'วอลเล่ย์'],
  'ห้องน้ำ': ['ห้องน้ำ', 'toilet', 'ส้วม', 'bathroom', 'restroom'],
  'ห้องสมุด': ['ห้องสมุด', 'library', 'ศูนย์เรียนรู้'],
  'ตึก': ['ตึก', 'อาคาร', 'building', 'ชั้น', 'floor'],
  'ห้องเรียน': ['ห้องเรียน', 'ห้อง', 'classroom', 'class'],
  'สหกรณ์': ['สหกรณ์', 'ร้าน', 'shop', 'ร้านค้า', 'เซเว่น', '7-11'],
  'ธุรการ': ['ธุรการ', 'admin', 'office', 'สำนักงาน'],
  'ปกครอง': ['ปกครอง', 'discipline', 'กิจการ'],
  'หอพัก': ['หอพัก', 'หอ', 'dorm', 'dormitory', 'ที่พัก'],
  'ลานจอดรถ': ['ลานจอดรถ', 'จอดรถ', 'parking', 'ที่จอด'],
  'โถง': ['โถง', 'lobby', 'ทางเดิน', 'บันได', 'ลิฟต์'],
};

// Category mapping for item detection (expanded for better detection)
const CATEGORY_KEYWORDS: Record<ItemCategory, string[]> = {
  wallet: ['กระเป๋าสตางค์', 'wallet', 'เงิน', 'บัตร', 'กระเป๋าตัง', 'สตางค์', 'ตังค์'],
  phone: ['โทรศัพท์', 'มือถือ', 'phone', 'iphone', 'samsung', 'android', 'oppo', 'vivo', 'xiaomi', 'realme', 'huawei', 'โทรศัพ'],
  keys: ['กุญแจ', 'key', 'พวงกุญแจ', 'ลูกกุญแจ', 'รีโมท', 'remote', 'กุญแจรถ', 'กุญแจบ้าน'],
  bag: ['กระเป๋า', 'bag', 'เป้', 'backpack', 'กระเป๋าเป้', 'กระเป๋าสะพาย', 'ถุง', 'pouch'],
  electronics: ['ไอแพด', 'ipad', 'laptop', 'แท็บเล็ต', 'tablet', 'หูฟัง', 'airpods', 'earbuds', 'powerbank', 'แบตสำรอง', 'charger', 'สายชาร์จ', 'เมาส์', 'mouse', 'คีย์บอร์ด', 'keyboard', 'flash drive', 'usb', 'หม้อ', 'พัดลม', 'กล้อง', 'camera'],
  documents: ['เอกสาร', 'บัตร', 'card', 'สมุด', 'หนังสือ', 'ใบ', 'บัตรนักเรียน', 'บัตรประชาชน', 'id card', 'passport', 'ใบขับขี่'],
  clothing: ['เสื้อ', 'กางเกง', 'หมวก', 'รองเท้า', 'jacket', 'แจ็คเก็ต', 'เสื้อกันหนาว', 'ผ้าพันคอ', 'ถุงเท้า', 'เข็มขัด', 'ร่ม', 'umbrella'],
  accessories: ['แหวน', 'สร้อย', 'ต่างหู', 'นาฬิกา', 'แว่น', 'watch', 'glasses', 'สร้อยคอ', 'กำไล', 'เครื่องประดับ', 'jewelry', 'แว่นตา', 'smartwatch', 'apple watch'],
  other: [],
};

/**
 * Detect category from text
 */
export function detectCategoryFromText(text: string): ItemCategory | null {
  const lowerText = text.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
      return category as ItemCategory;
    }
  }
  return null;
}

/**
 * Smart location matching using keyword groups
 */
export function calculateLocationSimilarity(loc1: string, loc2: string): number {
  const l1 = loc1.toLowerCase();
  const l2 = loc2.toLowerCase();

  // Direct match
  if (l1 === l2) return 1;

  // Check if both locations contain same keyword group
  for (const [, keywords] of Object.entries(LOCATION_KEYWORDS)) {
    const l1HasKeyword = keywords.some(k => l1.includes(k.toLowerCase()));
    const l2HasKeyword = keywords.some(k => l2.includes(k.toLowerCase()));
    if (l1HasKeyword && l2HasKeyword) {
      return 0.9; // Same general area
    }
  }

  // Fallback to word-based similarity
  return calculateSimilarity(loc1, loc2);
}

/**
 * Calculate match score between a lost item and a found item
 * Uses hierarchical filtering approach
 */
export function calculateMatchScore(lostItem: LostItem, foundItem: FoundItem): MatchScore {
  const reasons: string[] = [];
  let totalScore = 0;

  // 1. Category match (if both have category info)
  let categoryScore = 0;
  const foundCategory = foundItem.category || detectCategoryFromText(foundItem.description);
  if (lostItem.category && foundCategory) {
    if (lostItem.category === foundCategory) {
      categoryScore = 1;
      reasons.push('หมวดหมู่ตรงกัน');
    } else {
      categoryScore = 0.3; // Different category = lower score
    }
  } else {
    categoryScore = 0.5; // Unknown category = neutral
  }
  totalScore += categoryScore * WEIGHTS.categoryMatch;

  // 2. Item name similarity
  const itemScore = calculateSimilarity(lostItem.itemName, foundItem.description);
  totalScore += itemScore * WEIGHTS.itemSimilarity;
  if (itemScore > 0.6) {
    reasons.push(`ชื่อของคล้ายกัน (${Math.round(itemScore * 100)}%)`);
  }

  // 3. Location similarity (using smart matching)
  let locationScore = calculateLocationSimilarity(lostItem.locationLost, foundItem.locationFound);
  const lostCoords = lostItem.locationCoords;
  const foundCoords = foundItem.locationCoords;
  if (lostCoords && foundCoords) {
    const distanceKm = calculateDistanceKm(
      lostCoords.lat,
      lostCoords.lng,
      foundCoords.lat,
      foundCoords.lng
    );
    const distanceScore = distanceToScore(distanceKm);
    locationScore = Math.max(locationScore, distanceScore);
    if (distanceScore >= 0.5) {
      reasons.push(`พิกัดใกล้กัน (${distanceKm.toFixed(2)} km)`);
    }
  }
  totalScore += locationScore * WEIGHTS.locationSimilarity;
  if (locationScore > 0.5) {
    reasons.push(`สถานที่ใกล้เคียง (${Math.round(locationScore * 100)}%)`);
  }

  // 4. Description similarity
  let descriptionScore = 0;
  if (lostItem.description && foundItem.description) {
    descriptionScore = calculateSimilarity(lostItem.description, foundItem.description);
  }
  totalScore += descriptionScore * WEIGHTS.descriptionSimilarity;
  if (descriptionScore > 0.4) {
    reasons.push(`รายละเอียดคล้ายกัน (${Math.round(descriptionScore * 100)}%)`);
  }

  // 5. Time proximity
  let timeScore = 0;
  const timeDiff = Math.abs(
    toDate(lostItem.dateLost).getTime() - toDate(foundItem.dateFound).getTime()
  );
  const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

  if (daysDiff <= 1) {
    timeScore = 1;
    reasons.push('เวลาใกล้เคียง (ภายใน 1 วัน)');
  } else if (daysDiff <= 3) {
    timeScore = 0.8;
    reasons.push('เวลาใกล้เคียง (ภายใน 3 วัน)');
  } else if (daysDiff <= 7) {
    timeScore = 0.5;
    reasons.push('เวลาใกล้เคียง (ภายใน 7 วัน)');
  } else if (daysDiff <= 14) {
    timeScore = 0.2;
  }
  totalScore += timeScore * WEIGHTS.timeProximity;

  // 6. Brand / color — prefer structured found fields, then keyword fallback
  const itemText = `${lostItem.itemName} ${lostItem.description || ""}`.toLowerCase();
  const foundText =
    `${foundItem.itemName || ""} ${foundItem.description} ${foundItem.brand || ""} ${foundItem.color || ""}`.toLowerCase();

  const brandPatterns = [
    "iphone",
    "samsung",
    "oppo",
    "vivo",
    "casio",
    "seiko",
    "nike",
    "adidas",
    "converse",
    "apple",
    "xiaomi",
  ];
  let brandMatched = false;
  const structuredBrand = foundItem.brand?.trim();
  if (structuredBrand) {
    const brandLower = structuredBrand.toLowerCase();
    if (itemText.includes(brandLower)) {
      totalScore += 0.1;
      reasons.push(`ยี่ห้อตรงกัน (${structuredBrand})`);
      brandMatched = true;
    }
  }
  if (!brandMatched) {
    for (const brand of brandPatterns) {
      if (itemText.includes(brand) && foundText.includes(brand)) {
        totalScore += 0.1;
        reasons.push(`ยี่ห้อตรงกัน (${brand})`);
        break;
      }
    }
  }

  const colorPatterns = [
    "ดำ",
    "ขาว",
    "แดง",
    "น้ำเงิน",
    "เขียว",
    "เหลือง",
    "ชมพู",
    "ม่วง",
    "ส้ม",
    "น้ำตาล",
    "เทา",
    "ทอง",
    "เงิน",
  ];
  let colorMatched = false;
  const structuredColor = foundItem.color?.trim();
  if (structuredColor) {
    const colorLower = structuredColor.toLowerCase();
    if (itemText.includes(colorLower)) {
      totalScore += 0.05;
      reasons.push(`สีตรงกัน (${structuredColor})`);
      colorMatched = true;
    }
  }
  if (!colorMatched) {
    for (const color of colorPatterns) {
      if (itemText.includes(color) && foundText.includes(color)) {
        totalScore += 0.05;
        if (!reasons.some((r) => r.includes("สี"))) {
          reasons.push(`สีตรงกัน (${color})`);
        }
        break;
      }
    }
  }

  // Calculate confidence level
  const finalScore = Math.min(totalScore, 1);
  let confidence: 'high' | 'medium' | 'low';
  if (finalScore >= HIGH_CONFIDENCE_THRESHOLD) {
    confidence = 'high';
  } else if (finalScore >= MEDIUM_CONFIDENCE_THRESHOLD) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    lostItem,
    foundItem,
    score: finalScore,
    reasons,
    confidence,
  };
}

/**
 * Check if match is valid (has enough reasons)
 */
function isValidMatch(matchScore: MatchScore): boolean {
  return matchScore.reasons.length >= MIN_REASONS_FOR_MATCH;
}

/**
 * Find all potential matches for a lost item using hierarchical filtering
 */
export function findMatchesForLostItem(
  lostItem: LostItem,
  foundItems: FoundItem[]
): MatchScore[] {
  if (!isMatchableLostItem(lostItem)) {
    return [];
  }

  // Step 1: Filter by matchable found statuses (not claimed/expired)
  let candidates = foundItems.filter((f) => isMatchableFoundItem(f));

  // Step 2: (Optional) Filter by category if known
  const lostCategory = lostItem.category;
  if (lostCategory && lostCategory !== 'other') {
    const categoryMatches = candidates.filter(f => {
      const foundCategory = f.category || detectCategoryFromText(f.description);
      return !foundCategory || foundCategory === lostCategory;
    });
    // Only use category filter if we still have candidates
    if (categoryMatches.length > 0) {
      candidates = categoryMatches;
    }
  }

  // Step 3: Filter by time window
  const lostDate = toDate(lostItem.dateLost).getTime();
  candidates = candidates.filter(f => {
    const foundDate = toDate(f.dateFound).getTime();
    const daysDiff = Math.abs(foundDate - lostDate) / (1000 * 60 * 60 * 24);
    return daysDiff <= MATCH_TIME_WINDOW_DAYS;
  });

  // Step 4: Calculate scores for remaining candidates
  const matches: MatchScore[] = [];
  for (const foundItem of candidates) {
    const matchScore = calculateMatchScore(lostItem, foundItem);
    // Only include if score is above threshold AND has valid reasons
    if (matchScore.score >= MATCH_THRESHOLD && isValidMatch(matchScore)) {
      matches.push(matchScore);
    }
  }

  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Find all potential matches for a found item using hierarchical filtering
 */
export function findMatchesForFoundItem(
  foundItem: FoundItem,
  lostItems: LostItem[]
): MatchScore[] {
  if (!isMatchableFoundItem(foundItem)) {
    return [];
  }

  // Step 1: Filter by matchable lost statuses
  let candidates = lostItems.filter((l) => isMatchableLostItem(l));

  // Step 2: (Optional) Filter by category if detectable
  const foundCategory = foundItem.category || detectCategoryFromText(foundItem.description);
  if (foundCategory && foundCategory !== 'other') {
    const categoryMatches = candidates.filter(l => {
      return !l.category || l.category === 'other' || l.category === foundCategory;
    });
    if (categoryMatches.length > 0) {
      candidates = categoryMatches;
    }
  }

  // Step 3: Filter by time window
  const foundDate = toDate(foundItem.dateFound).getTime();
  candidates = candidates.filter(l => {
    const lostDate = toDate(l.dateLost).getTime();
    const daysDiff = Math.abs(foundDate - lostDate) / (1000 * 60 * 60 * 24);
    return daysDiff <= MATCH_TIME_WINDOW_DAYS;
  });

  // Step 4: Calculate scores for remaining candidates
  const matches: MatchScore[] = [];
  for (const lostItem of candidates) {
    const matchScore = calculateMatchScore(lostItem, foundItem);
    // Only include if score is above threshold AND has valid reasons
    if (matchScore.score >= MATCH_THRESHOLD && isValidMatch(matchScore)) {
      matches.push(matchScore);
    }
  }

  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Get match confidence level
 */
export function getMatchConfidence(score: number): 'high' | 'medium' | 'low' {
  if (score >= HIGH_CONFIDENCE_THRESHOLD) return 'high';
  if (score >= MEDIUM_CONFIDENCE_THRESHOLD) return 'medium';
  return 'low';
}

/**
 * Format match score as percentage
 */
export function formatMatchScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/**
 * Get top N matches for batch processing
 */
export function getTopMatches(matches: MatchScore[], limit: number = 5): MatchScore[] {
  return matches.slice(0, limit);
}

// ============ AI-BASED MATCHING ============

const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

interface AIGenerationConfig {
  model?: string;
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
}

const DEFAULT_MATCH_MODEL = DEFAULT_APP_SETTINGS.aiMatchingModel || "gemini-1.5-flash";

function normalizeModelName(model: string): string {
  return model.replace(/^models\//, "");
}

function buildGenerateContentUrl(model: string): string {
  return `${GEMINI_API_BASE_URL}/${normalizeModelName(model)}:generateContent`;
}

function resolveMatchConfig(config?: AIGenerationConfig) {
  return {
    model: config?.model || DEFAULT_MATCH_MODEL,
    temperature: config?.temperature ?? DEFAULT_APP_SETTINGS.aiMatchingTemperature ?? 0.1,
    topP: config?.topP ?? DEFAULT_APP_SETTINGS.aiMatchingTopP ?? 0.8,
    maxOutputTokens: config?.maxOutputTokens ?? DEFAULT_APP_SETTINGS.aiMatchingMaxOutputTokens ?? 200,
  };
}

const AI_MATCH_PROMPT = `คุณเป็น AI สำหรับจับคู่ของหายกับของที่เจอ

เปรียบเทียบรายการ "ของหาย" กับ "ของเจอ" แล้วให้คะแนนความตรงกัน (0.0-1.0)
- score >= 0.7 และ isMatch: true เมื่อมั่นใจว่าน่าจะเป็นคู่กัน
- ห้ามเดาข้อมูลที่ไม่มีในรายการ

ของหาย:
- ชื่อ: {lostItem}
- รายละเอียด: {lostDesc}
- สถานที่หาย: {lostLocation}

ของเจอ:
- รายละเอียด: {foundDesc}
- สถานที่เจอ: {foundLocation}

ตอบเป็น JSON เท่านั้น:
{
  "score": 0.0-1.0,
  "reasons": ["เหตุผล1", "เหตุผล2"],
  "isMatch": true/false
}

ตัวอย่าง: หูฟังซัมซุงหายหน้าห้องสมุด vs เจอหูฟังสีดำหน้าห้องสมุด → score 0.85, isMatch: true`;

interface AIMatchResult {
  score: number;
  reasons: string[];
  isMatch: boolean;
}

/**
 * Use AI to compare a lost item with a found item
 */
async function aiCompareItems(
  lostItem: LostItem,
  foundItem: FoundItem,
  config?: AIGenerationConfig
): Promise<AIMatchResult | null> {
  const credentials = await resolveAiCredentials();
  const geminiApiKey = getGeminiApiKey(credentials);
  if (!geminiApiKey) {
    console.error("Gemini API key not found for AI matching");
    return null;
  }

  const prompt = AI_MATCH_PROMPT
    .replace('{lostItem}', lostItem.itemName)
    .replace('{lostDesc}', lostItem.description || 'ไม่มี')
    .replace('{lostLocation}', lostItem.locationLost)
    .replace('{foundDesc}', foundItem.description)
    .replace('{foundLocation}', foundItem.locationFound);

  try {
    const resolvedConfig = resolveMatchConfig(config);
    const response = await fetch(`${buildGenerateContentUrl(resolvedConfig.model)}?key=${geminiApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: resolvedConfig.temperature,
          maxOutputTokens: resolvedConfig.maxOutputTokens,
          topP: resolvedConfig.topP,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) return null;

    const generatedText = data.candidates[0].content.parts[0].text;
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      score: Math.min(1, Math.max(0, parsed.score || 0)),
      reasons: parsed.reasons || [],
      isMatch: parsed.isMatch === true,
    };
  } catch (error) {
    console.error("Error in AI matching:", error);
    return null;
  }
}

/**
 * Run async work over items with a fixed concurrency limit.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const limit = Math.max(1, concurrency);
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await mapper(items[current]);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Find matches using AI for a lost item (limited to top candidates to save API calls)
 */
export async function findMatchesForLostItemAI(
  lostItem: LostItem,
  foundItems: FoundItem[],
  maxCandidates: number = 5,
  config?: AIGenerationConfig
): Promise<MatchScore[]> {
  const traditionalMatches = findMatchesForLostItem(lostItem, foundItems);
  const topCandidates = traditionalMatches.slice(0, maxCandidates);

  const evaluated = await mapWithConcurrency(
    topCandidates,
    AI_MATCH_CONCURRENCY,
    async (candidate) => {
      const aiResult = await aiCompareItems(lostItem, candidate.foundItem, config);
      if (!aiResult || !aiResult.isMatch) return null;
      return {
        lostItem,
        foundItem: candidate.foundItem,
        score: aiResult.score,
        reasons: aiResult.reasons.length > 0 ? aiResult.reasons : candidate.reasons,
        confidence: (aiResult.score >= 0.7
          ? "high"
          : aiResult.score >= 0.5
            ? "medium"
            : "low") as MatchScore["confidence"],
      } satisfies MatchScore;
    }
  );

  return evaluated
    .filter((m): m is MatchScore => m !== null)
    .sort((a, b) => b.score - a.score);
}

/**
 * Find matches using AI for a found item (limited to top candidates to save API calls)
 */
export async function findMatchesForFoundItemAI(
  foundItem: FoundItem,
  lostItems: LostItem[],
  maxCandidates: number = 5,
  config?: AIGenerationConfig
): Promise<MatchScore[]> {
  const traditionalMatches = findMatchesForFoundItem(foundItem, lostItems);
  const topCandidates = traditionalMatches.slice(0, maxCandidates);

  const evaluated = await mapWithConcurrency(
    topCandidates,
    AI_MATCH_CONCURRENCY,
    async (candidate) => {
      const aiResult = await aiCompareItems(candidate.lostItem, foundItem, config);
      if (!aiResult || !aiResult.isMatch) return null;
      return {
        lostItem: candidate.lostItem,
        foundItem,
        score: aiResult.score,
        reasons: aiResult.reasons.length > 0 ? aiResult.reasons : candidate.reasons,
        confidence: (aiResult.score >= 0.7
          ? "high"
          : aiResult.score >= 0.5
            ? "medium"
            : "low") as MatchScore["confidence"],
      } satisfies MatchScore;
    }
  );

  return evaluated
    .filter((m): m is MatchScore => m !== null)
    .sort((a, b) => b.score - a.score);
}
