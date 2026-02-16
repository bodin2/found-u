// NER Service using Gemini Flash for extracting structured data from text
// Optimized for speed: ~2-3 seconds response

export interface NERExtractedData {
  item: string;
  description: string | null;
  location: string | null;
  time: string | null;
  contact: string | null;
  contactType: string | null; // ประเภทช่องทางติดต่อ: phone, line, instagram, facebook, email
  category: string | null; // ประเภทของ: wallet, phone, keys, bag, electronics, documents, clothing, accessories, other
  remark: string | null;
  target: "lost" | "found";
}

// Use Gemini Flash for faster response
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemma-3-4b-it:generateContent";
const GEMINI_API_KEY = process.env.GEMMA_API_KEY;

// Detailed prompt for school/organization lost & found system
const NER_PROMPT = `คุณคือ AI สำหรับระบบ Lost & Found หน้าที่คือสกัดข้อมูลเป็น JSON ตามกฎอย่างเคร่งครัด

--- Rules & Schema ---
1. item (String): ชื่อสิ่งของ (กระชับ)
2. description (String/null): รายละเอียด, สี, ยี่ห้อ, จุดเด่น (ถ้าไม่มีใส่ null)
3. location (String/null): สถานที่ที่ "ทำหาย" หรือ "เจอล่าสุด" (จุดเกิดเหตุ)
4. time (String/null): เวลาที่เกิดเหตุ
5. contact (String/null): **เฉพาะช่องทางติดต่อสื่อสารส่วนบุคคลเท่านั้น** - ต้องเป็น: เบอร์โทร, Line ID, IG, Facebook, Email
   - ห้ามใส่: สถานที่ (เช่น "ห้องปกครอง", "โต๊ะครู"), หรือคำลอยๆ (เช่น "ทักแชท") -> ให้ไปใส่ใน remark หรือ null
6. contactType (String/null): ประเภทช่องทางติดต่อ - **ต้องเป็นค่าใดค่าหนึ่ง**: "phone", "line", "instagram", "facebook", "email"
   - เบอร์โทร/ตัวเลข 10 หลัก = "phone"
   - Line, ไลน์, @xxx = "line"
   - IG, Instagram, Insta = "instagram"
   - FB, Facebook, เฟสบุ๊ค = "facebook"
   - email, อีเมล, @xxx.com = "email"
   - ถ้าไม่ชัดเจนหรือไม่มี = null
7. category (String/null): ประเภทของที่หาย - **ต้องเป็นค่าใดค่าหนึ่ง**: "wallet", "phone", "keys", "bag", "electronics", "documents", "clothing", "accessories", "other"
   - กระเป๋าสตางค์, ตังค์, wallet = "wallet"
   - โทรศัพท์, มือถือ, iPhone, Samsung, phone = "phone"
   - กุญแจ, key, พวงกุญแจ = "keys"
   - กระเป๋า, เป้, bag = "bag"
   - iPad, แท็บเล็ต, laptop, นาฬิกาสมาร์ท, หูฟัง, AirPods = "electronics"
   - บัตรนักเรียน, บัตรประชาชน, เอกสาร = "documents"
   - เสื้อ, กางเกง, หมวก, ชุดพละ = "clothing"
   - แหวน, สร้อย, ต่างหู, นาฬิกา(ธรรมดา) = "accessories"
   - อื่นๆ ที่ไม่เข้าหมวดใด = "other"
8. remark (String/null): ข้อมูลเพิ่มเติมอื่นๆ หรือ **"สถานที่นัดรับ/ฝากของ"**
   - ตัวอย่าง: "เอามาฝากไว้ห้องปกครองรี1/11", "มีรางวัลให้คนเจอ", "ด่วนมาก"
9. target (String): "lost" หรือ "found"

--- Examples ---
Input: "ตามหาพวงกุญแจซันซู หายตอนวันสอบธรรมะ น่าจะแถวสนามกีฬากับสหกรณ์ ใครเจอเอามาฝากห้องปกครองรี1/11(3604)หน่อย"
Output: {"item":"พวงกุญแจ","description":"ลายซันซู","location":"สนามกีฬากับสหกรณ์","time":"วันสอบธรรมะ","contact":null,"contactType":null,"category":"keys","remark":"ฝากไว้ที่ห้องปกครองรี1/11 (3604)","target":"lost"}

Input: "เจอบัตรนักเรียนตกอยู่หน้าโรงอาหาร ติดต่อรับคืนที่ Line: somchai99 หรือโทร 081-234-5678"
Output: {"item":"บัตรนักเรียน","description":null,"location":"หน้าโรงอาหาร","time":null,"contact":"somchai99, 081-234-5678","contactType":"line","category":"documents","remark":null,"target":"found"}

Input: "ลืมกระเป๋าตังสีดำ มีเงิน 500 ใครเจอทักแชทมาหน่อย หรือเอาไปไว้ป้อมยามก็ได้"
Output: {"item":"กระเป๋าสตางค์","description":"สีดำ, มีเงิน 500 บาท","location":null,"time":null,"contact":null,"contactType":null,"category":"wallet","remark":"ให้ทักแชท หรือนำไปฝากที่ป้อมยาม","target":"lost"}

Input: "หูฟังสีดำ หายที่ใต้ตึก3 ติดต่อ IG: athivaratz, 0661234567 ฝากไว้ที่ห้องธุรการ"
Output: {"item":"หูฟัง","description":"สีดำ","location":"ใต้ตึก3","time":null,"contact":"athivaratz, 0661234567","contactType":"instagram","category":"electronics","remark":"ฝากไว้ที่ห้องธุรการ","target":"lost"}

---
Input Text: "{text}"
JSON Output:`;

export async function extractNERData(text: string, type: "lost" | "found"): Promise<NERExtractedData | null> {
  if (!GEMINI_API_KEY) {
    console.error("GEMMA_API_KEY not found");
    return null;
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: NER_PROMPT.replace("{text}", text) }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 256, // Reduced from 1024
          topP: 0.8,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemma API error:", errorText);
      return null;
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error("Invalid response format from Gemma API");
      return null;
    }

    const generatedText = data.candidates[0].content.parts[0].text;

    // Extract JSON from the response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in response");
      return null;
    }

    const parsedData = JSON.parse(jsonMatch[0]);

    // Validate and ensure target is correct
    return {
      item: parsedData.item || "",
      description: parsedData.description || null,
      location: parsedData.location || null,
      time: parsedData.time || null,
      contact: parsedData.contact || null,
      contactType: parsedData.contactType || null,
      category: parsedData.category || null,
      remark: parsedData.remark || null,
      target: parsedData.target || type,
    };
  } catch (error) {
    console.error("Error calling Gemma API:", error);
    return null;
  }
}

// Helper function to normalize text for better matching
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Generate n-grams from text (better for Thai text matching)
function generateNGrams(text: string, n: number = 2): Set<string> {
  const normalized = normalizeText(text);
  const ngrams = new Set<string>();
  
  // Character-level n-grams (good for Thai)
  for (let i = 0; i <= normalized.length - n; i++) {
    ngrams.add(normalized.substring(i, i + n));
  }
  
  return ngrams;
}

// Calculate Jaccard similarity between two sets
function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// Check if text contains any of the keywords
export function containsKeyword(text: string, keywords: string[]): boolean {
  const normalized = normalizeText(text);
  return keywords.some(kw => normalized.includes(normalizeText(kw)));
}

// Calculate similarity score between two strings (0-1)
// Uses multiple methods for better accuracy
export function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);

  // Exact match
  if (s1 === s2) return 1;

  // Check if one contains the other (partial match)
  if (s1.includes(s2) || s2.includes(s1)) {
    const shorter = s1.length < s2.length ? s1 : s2;
    const longer = s1.length < s2.length ? s2 : s1;
    return 0.7 + (0.3 * shorter.length / longer.length);
  }

  // N-gram based similarity (good for Thai)
  const ngrams1 = generateNGrams(s1, 2);
  const ngrams2 = generateNGrams(s2, 2);
  const ngramScore = jaccardSimilarity(ngrams1, ngrams2);

  // Word-based similarity
  const words1 = s1.split(' ').filter(w => w.length > 0);
  const words2 = s2.split(' ').filter(w => w.length > 0);
  const commonWords = words1.filter(word => 
    words2.some(w2 => w2.includes(word) || word.includes(w2))
  );
  const wordScore = words1.length + words2.length > 0 
    ? (commonWords.length * 2) / (words1.length + words2.length)
    : 0;

  // Combine scores with weights
  return Math.max(ngramScore * 0.6 + wordScore * 0.4, ngramScore, wordScore);
}
