// Enhanced Automatic matching algorithm for lost and found items
// Uses hierarchical filtering strategy: Category → Location → Time → Item → Description

import type { LostItem, FoundItem, ItemCategory } from './types';
import { calculateSimilarity } from './ner';

// Helper to convert Firestore Timestamp or Date to Date
function toDate(date: any): Date {
  if (!date) return new Date();
  if (date.toDate && typeof date.toDate === 'function') {
    return date.toDate();
  }
  if (date instanceof Date) return date;
  return new Date(date);
}

export interface MatchScore {
  lostItem: LostItem;
  foundItem: FoundItem;
  score: number;
  reasons: string[];
  confidence: 'high' | 'medium' | 'low';
}

// Weights for different matching criteria (adjusted for better accuracy)
const WEIGHTS = {
  categoryMatch: 0.20,      // Category is important indicator
  itemSimilarity: 0.35,     // Item name is most important
  locationSimilarity: 0.20, // Location helps narrow down
  descriptionSimilarity: 0.15,
  timeProximity: 0.10,
};

// Thresholds for matching (balanced for accuracy)
const MATCH_THRESHOLD = 0.40;       // Minimum score to be considered a match
const HIGH_CONFIDENCE_THRESHOLD = 0.70;
const MEDIUM_CONFIDENCE_THRESHOLD = 0.55;
const MIN_REASONS_FOR_MATCH = 1;    // Must have at least 1 reason to be a valid match

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
  const foundCategory = detectCategoryFromText(foundItem.description);
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
  const locationScore = calculateLocationSimilarity(lostItem.locationLost, foundItem.locationFound);
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

  // 6. Bonus for keyword matches (boost score for specific item types)
  const itemText = `${lostItem.itemName} ${lostItem.description || ''}`.toLowerCase();
  const foundText = foundItem.description.toLowerCase();
  
  // Check for brand/model matches
  const brandPatterns = ['iphone', 'samsung', 'oppo', 'vivo', 'casio', 'seiko', 'nike', 'adidas', 'converse', 'apple', 'xiaomi'];
  for (const brand of brandPatterns) {
    if (itemText.includes(brand) && foundText.includes(brand)) {
      totalScore += 0.1; // Bonus for matching brands
      reasons.push(`ยี่ห้อตรงกัน (${brand})`);
      break;
    }
  }

  // Check for color matches
  const colorPatterns = ['ดำ', 'ขาว', 'แดง', 'น้ำเงิน', 'เขียว', 'เหลือง', 'ชมพู', 'ม่วง', 'ส้ม', 'น้ำตาล', 'เทา', 'ทอง', 'เงิน'];
  for (const color of colorPatterns) {
    if (itemText.includes(color) && foundText.includes(color)) {
      totalScore += 0.05; // Bonus for matching colors
      if (!reasons.some(r => r.includes('สี'))) {
        reasons.push(`สีตรงกัน (${color})`);
      }
      break;
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
  // Skip if item is not searching
  if (lostItem.status !== 'searching' || lostItem.matchedFoundId) {
    return [];
  }

  // Step 1: Filter by status (only found/claimed items)
  let candidates = foundItems.filter(f =>
    (f.status === 'found' || f.status === 'claimed') && !f.matchedLostId
  );

  // Step 2: (Optional) Filter by category if known
  const lostCategory = lostItem.category;
  if (lostCategory && lostCategory !== 'other') {
    const categoryMatches = candidates.filter(f => {
      const foundCategory = detectCategoryFromText(f.description);
      return !foundCategory || foundCategory === lostCategory;
    });
    // Only use category filter if we still have candidates
    if (categoryMatches.length > 0) {
      candidates = categoryMatches;
    }
  }

  // Step 3: Filter by time (within 30 days)
  const lostDate = toDate(lostItem.dateLost).getTime();
  candidates = candidates.filter(f => {
    const foundDate = toDate(f.dateFound).getTime();
    const daysDiff = Math.abs(foundDate - lostDate) / (1000 * 60 * 60 * 24);
    return daysDiff <= 30;
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
  // Skip if item is not found/claimed
  if ((foundItem.status !== 'found' && foundItem.status !== 'claimed') || foundItem.matchedLostId) {
    return [];
  }

  // Step 1: Filter by status (only searching items)
  let candidates = lostItems.filter(l =>
    l.status === 'searching' && !l.matchedFoundId
  );

  // Step 2: (Optional) Filter by category if detectable
  const foundCategory = detectCategoryFromText(foundItem.description);
  if (foundCategory && foundCategory !== 'other') {
    const categoryMatches = candidates.filter(l => {
      return !l.category || l.category === 'other' || l.category === foundCategory;
    });
    if (categoryMatches.length > 0) {
      candidates = categoryMatches;
    }
  }

  // Step 3: Filter by time (within 30 days)
  const foundDate = toDate(foundItem.dateFound).getTime();
  candidates = candidates.filter(l => {
    const lostDate = toDate(l.dateLost).getTime();
    const daysDiff = Math.abs(foundDate - lostDate) / (1000 * 60 * 60 * 24);
    return daysDiff <= 30;
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

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemma-3-4b-it:generateContent";
const GEMINI_API_KEY = process.env.GEMMA_API_KEY;

const AI_MATCH_PROMPT = `คุณเป็น AI สำหรับจับคู่ของหายกับของที่เจอ

เปรียบเทียบรายการ "ของหาย" กับ "ของเจอ" แล้วให้คะแนนความตรงกัน

ของหาย:
- ชื่อ: {lostItem}
- รายละเอียด: {lostDesc}
- สถานที่หาย: {lostLocation}

ของเจอ:
- รายละเอียด: {foundDesc}
- สถานที่เจอ: {foundLocation}

ตอบเป็น JSON เท่านั้น:
{
  "score": 0.0-1.0 (ความน่าจะเป็นที่ตรงกัน),
  "reasons": ["เหตุผล1", "เหตุผล2"],
  "isMatch": true/false
}

JSON:`;

interface AIMatchResult {
  score: number;
  reasons: string[];
  isMatch: boolean;
}

/**
 * Use AI to compare a lost item with a found item
 */
async function aiCompareItems(lostItem: LostItem, foundItem: FoundItem): Promise<AIMatchResult | null> {
  if (!GEMINI_API_KEY) {
    console.error("GEMMA_API_KEY not found for AI matching");
    return null;
  }

  const prompt = AI_MATCH_PROMPT
    .replace('{lostItem}', lostItem.itemName)
    .replace('{lostDesc}', lostItem.description || 'ไม่มี')
    .replace('{lostLocation}', lostItem.locationLost)
    .replace('{foundDesc}', foundItem.description)
    .replace('{foundLocation}', foundItem.locationFound);

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 200,
          topP: 0.8,
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
 * Find matches using AI for a lost item (limited to top candidates to save API calls)
 */
export async function findMatchesForLostItemAI(
  lostItem: LostItem,
  foundItems: FoundItem[],
  maxCandidates: number = 5
): Promise<MatchScore[]> {
  // First, use traditional matching to get top candidates
  const traditionalMatches = findMatchesForLostItem(lostItem, foundItems);
  const topCandidates = traditionalMatches.slice(0, maxCandidates);

  // Then, use AI to re-evaluate top candidates
  const aiMatches: MatchScore[] = [];
  
  for (const candidate of topCandidates) {
    const aiResult = await aiCompareItems(lostItem, candidate.foundItem);
    if (aiResult && aiResult.isMatch) {
      aiMatches.push({
        lostItem,
        foundItem: candidate.foundItem,
        score: aiResult.score,
        reasons: aiResult.reasons.length > 0 ? aiResult.reasons : candidate.reasons,
        confidence: aiResult.score >= 0.7 ? 'high' : aiResult.score >= 0.5 ? 'medium' : 'low',
      });
    }
  }

  return aiMatches.sort((a, b) => b.score - a.score);
}

/**
 * Find matches using AI for a found item (limited to top candidates to save API calls)
 */
export async function findMatchesForFoundItemAI(
  foundItem: FoundItem,
  lostItems: LostItem[],
  maxCandidates: number = 5
): Promise<MatchScore[]> {
  // First, use traditional matching to get top candidates
  const traditionalMatches = findMatchesForFoundItem(foundItem, lostItems);
  const topCandidates = traditionalMatches.slice(0, maxCandidates);

  // Then, use AI to re-evaluate top candidates
  const aiMatches: MatchScore[] = [];
  
  for (const candidate of topCandidates) {
    const aiResult = await aiCompareItems(candidate.lostItem, foundItem);
    if (aiResult && aiResult.isMatch) {
      aiMatches.push({
        lostItem: candidate.lostItem,
        foundItem,
        score: aiResult.score,
        reasons: aiResult.reasons.length > 0 ? aiResult.reasons : candidate.reasons,
        confidence: aiResult.score >= 0.7 ? 'high' : aiResult.score >= 0.5 ? 'medium' : 'low',
      });
    }
  }

  return aiMatches.sort((a, b) => b.score - a.score);
}
