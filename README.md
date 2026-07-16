<p align="center">
  <img src="public/logo.png" width="88" alt="Found-U" />
</p>

<h1 align="center">Found-U</h1>
<p align="center">ระบบแจ้งของหาย–ของเจอสำหรับโรงเรียน พร้อมผู้ช่วย AI และแท็ก NFC</p>

<p align="center">
  <a href="https://foundu.forum">foundu.forum</a> ·
  <a href="https://foundu.bodin2.ac.th">foundu.bodin2.ac.th</a> ·
  เวอร์ชัน <code>0.3</code>
</p>

---

ของหายในโรงเรียนมักจบลงที่ห้องแนะแนวหรือกระดานประกาศ ตามหาก็ยาก แจ้งก็ลืม สุดท้ายของก็ไม่ได้กลับไปหาเจ้าของ Found-U ทำให้คนที่ทำของหายกับคนที่เจอของนัดเจอกันได้ในที่เดียว มีรหัสติดตามสถานะ มีระบบจับคู่อัตโนมัติ และมีผู้ช่วย AI ที่คุยแล้วแจ้งของหาย/เจอให้เสร็จในตัว

<table>
<tr>
<td><img src="public/img/mobile_responsive/1.png" width="200" alt="หน้าแรก" /></td>
<td><img src="public/img/mobile_responsive/2.png" width="200" alt="แจ้งของหาย - ปักหมุดสถานที่" /></td>
<td><img src="public/img/mobile_responsive/3.png" width="200" alt="แจ้งของหาย - ช่องทางติดต่อ" /></td>
<td><img src="public/img/mobile_responsive/4.png" width="200" alt="ระบบ NFC Tag" /></td>
</tr>
</table>

## ระบบทำอะไรได้

- **แจ้งของหาย / ของเจอ** พร้อมรูป ตำแหน่ง (ปักหมุดในแผนที่ + ตรวจ GPS ว่าอยู่ในเขตโรงเรียน) และช่องทางติดต่อ
- **รหัสติดตาม (Tracking Code)** ให้เช็กสถานะได้โดยไม่ต้องล็อกอินซ้ำ พร้อมซ่อนข้อมูลติดต่อของคนอื่นเพื่อความเป็นส่วนตัว
- **จับคู่อัตโนมัติ** ระหว่างรายการของหายกับของเจอ
- **ผู้ช่วย AI** ที่หน้า `/assistant` — คุยเพื่อค้นหา แจ้งรายการ จับคู่ วิเคราะห์รูป หรือเช็กสถานะได้ในแชทเดียว รองรับ Gemini และ OpenRouter พร้อม fallback อัตโนมัติ
- **AI วิเคราะห์รูป** เดาชื่อ หมวดหมู่ สี ยี่ห้อจากภาพถ่าย และ **AI แยกข้อมูลจากข้อความ** ตอนแจ้งของหาย
- **ค้นหาแบบ fuzzy** (`pg_trgm`) ทนพิมพ์ผิด/สะกดใกล้เคียงได้ ทั้งหน้ารายการและใน Agent
- **แท็ก NFC** ติดของสำคัญ สแกนแล้วแจ้งเจ้าของได้ทันที ไม่ต้องพิมพ์ URL เอง (รองรับ NTAG213/215/216 เขียน Read-only บน Android และพิมพ์ QR สำรองสำหรับ iOS)
- **แผงแอดมิน** ครบ — จัดการรายการ ผู้ใช้ นักเรียน การจับคู่ moderation ตั้งค่า AI และดู debug log ของ Agent

<details>
<summary>ประวัติเวอร์ชันย่อ</summary>

**v0.3 — AI Agent & การค้นหาอัจฉริยะ**
ผู้ช่วย AI แบบ tool-calling, Gemini + OpenRouter fallback, fuzzy search ด้วย `pg_trgm`, ประวัติแชทเก็บใน IndexedDB (Dexie), แผงแอดมิน AI Center และ Agent Debug Log

**v0.2b — ย้ายไป Supabase**
เปลี่ยนจาก Firebase มา Supabase (Postgres + Auth + Realtime + RLS), ล็อกอินหลักด้วยเลขประจำตัว/รหัสแอดมิน + รหัสผ่าน, เพิ่ม Passkey และ PIN เป็นช่องทางรอง, ตัด Google OAuth, validate ด้วย Zod ทุก API หลัก

**v0.1.3beta — NFC Tag**
ลงทะเบียนแท็ก NFC, เขียน URL + ล็อก Read-only, พิมพ์ QR สำรองสำหรับ iOS, แจ้งพบของผ่านสแกน/QR

</details>

## การยืนยันตัวตน

| วิธี | นักเรียน | แอดมิน | หมายเหตุ |
|------|:-:|:-:|----------|
| เลขประจำตัว + รหัสผ่าน | ✓ | — | ช่องทางหลัก ใช้ล็อกอินครั้งแรกเสมอ |
| เลขแอดมิน 5 หลัก + รหัสผ่าน | — | ✓ | ช่องทางหลักของแอดมิน |
| Passkey (WebAuthn) | ✓ | ✓ | ลงทะเบียนได้หลังล็อกอินรหัสผ่านสำเร็จ |
| PIN | ✓ | ✓ | ตั้งได้หลังล็อกอินรหัสผ่านสำเร็จ |

## เทคโนโลยีที่ใช้

| ส่วน | ใช้อะไร |
|------|---------|
| Framework / UI | [Next.js](https://nextjs.org/) 16 (App Router) + [React](https://react.dev/) 19 + [TypeScript](https://www.typescriptlang.org/) 5.9 |
| สไตล์ | [Tailwind CSS](https://tailwindcss.com/) 4 |
| Backend / DB | [Supabase](https://supabase.com/) — Postgres, Auth, Realtime, RLS, `pg_trgm` |
| Validation | [Zod](https://zod.dev/) 4 บนทุก API route |
| AI Pipeline | Google Gemini (vision, NER, matching) |
| AI Agent | [Vercel AI SDK](https://sdk.vercel.ai/) 7 (`@ai-sdk/google`, `@ai-sdk/openai`) + [OpenRouter](https://openrouter.ai/) เป็น fallback |
| แชทฝั่งไคลเอนต์ | [Dexie](https://dexie.org/) 4 (IndexedDB) |
| แผนที่ | [Leaflet](https://leafletjs.com/) + OpenStreetMap |
| ที่เก็บไฟล์ | Cloudflare R2 (หรือ Supabase Storage สำหรับโรงเรียนที่ deploy ใหม่) |
| Runtime | [Bun](https://bun.sh/) 1.3 |

## โครงสร้างโปรเจกต์

```text
app/
  (app)/     หน้าหลังล็อกอิน — home, assistant, lost, found, list, tracking, settings
  admin/     แผงผู้ดูแล — items, users, students, matching, AI, NFC, moderation
  api/       REST API — auth, vision, ner, match, agent, storage, nfc
  auth/      ล็อกอิน เปลี่ยนรหัส ตั้ง PIN
  nfc/       ลงทะเบียนแท็ก / แท็กของฉัน / แจ้งพบผ่าน NFC
  setup/     wizard ตั้งค่าระบบครั้งแรก (deploy ใหม่)
components/  UI, layout, map, camera, agent, dialogs
contexts/    auth, data (Realtime subscriptions)
lib/
  agent/     tools, prompt, provider routing, privacy ของ AI Agent
  chat/      เก็บ session/message ฝั่งไคลเอนต์ (Dexie), context window, memory
  search/    fuzzy search (pg_trgm), relevance ranking
  supabase/  client, server, admin, passkey auth, auth session
  validations/  Zod schemas
supabase/migrations/  schema + RLS ทั้งหมด (รันอัตโนมัติหลัง deploy)
```

## เริ่มพัฒนาในเครื่อง

ต้องมี [Bun](https://bun.sh/) และโปรเจกต์ Supabase (สร้างฟรีได้ที่ [supabase.com](https://supabase.com/dashboard))

```bash
git clone https://github.com/bodin2/found-u.git
cd found-u
bun install

cp .env.example .env.local
# แก้ .env.local ให้มีค่าจาก Supabase project ของตัวเอง
# (Project Settings → API และ Database)

bun run db:push   # sync schema/migrations เข้า Supabase
bun dev           # http://localhost:3000
```

เปิด `/setup` ครั้งแรกเพื่อสร้างบัญชีแอดมินผ่าน wizard หรือใช้ `bun run create:admin` จากเทอร์มินัลก็ได้ คำสั่งอื่นที่มีให้:

| คำสั่ง | ใช้ทำอะไร |
|--------|-----------|
| `bun run lint` / `bun run typecheck` | เช็กโค้ดก่อนคอมมิต |
| `bun test` | รัน unit tests |
| `bun run gen:students` / `import:students` | สร้าง/นำเข้ารายชื่อนักเรียนจาก CSV |
| `bun run test:login` | ทดสอบ flow ล็อกอินนักเรียน |

### ทดสอบ Setup Wizard แบบ Sandbox (ไม่กระทบ `.env.local`)

ใช้ **Supabase project แยก** สำหรับลอง wizard ซ้ำๆ โดยไม่ต้อง redeploy และไม่ต้องเปลี่ยน env หลักที่เชื่อม deploy อยู่แล้ว

```bash
# 1) สร้างโปรเจกต์ Supabase ฟรีอีกตัว (เช่น found-u-setup-sandbox)
cp .env.setup.example .env.setup.local
# แก้ .env.setup.local ใส่ URL / keys / POSTGRES ของ sandbox

# 2) รีเซ็ตสถานะ wizard (ทำซ้ำได้ทุกครั้งหลังทดสอบ)
bun run setup:reset

# 3) รัน dev ด้วย sandbox env (override .env.local ชั่วคราว)
bun run dev:setup
# เปิด http://localhost:3000/setup
```

| คำสั่ง | ใช้ทำอะไร |
|--------|-----------|
| `bun run dev:setup` | `next dev` โดยโหลด `.env.setup.local` |
| `bun run setup:reset` | รีเซ็ต `setup_status`, branding, AI config, แอดมินที่สร้างจาก wizard |

DB ว่างครั้งแรก: เปิด `/setup` แล้ว hydrator จะรัน migration อัตโนมัติ (เหมือน production) — ไม่ต้อง `db:push` ถ้าใช้ sandbox ใหม่เปล่าๆ

## Deploy ให้โรงเรียนใหม่

แนวทางที่แนะนำ: **Clone + Deploy ก่อน** ให้ใช้งานได้จริง แล้วค่อย **Fork** ทีหลังถ้าต้องการ sync อัปเดตจากโค้ดหลัก

### 1. Clone + Deploy (1 คลิก)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fbodin2%2Ffound-u&project-name=found-u&repository-name=found-u&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22supabase%22%2C%22productSlug%22%3A%22supabase%22%7D%5D)

1. กด **Deploy with Vercel** แล้วล็อกอินด้วย GitHub / Vercel
2. เลือก **Supabase** → Region **Singapore** → Plan **Free** → **Deploy**
3. เปิด `https://<ชื่อโปรเจกต์>.vercel.app/setup` แล้วทำตาม wizard 3 ขั้นเพื่อสร้างบัญชีแอดมิน

Vercel จะ clone โค้ดและสร้าง repo `found-u` ในบัญชี GitHub ของคุณเอง ตอนนี้ยังไม่มี upstream จึงยังกด Sync fork ไม่ได้ — ไปทำขั้นที่ 2 เมื่อพร้อม

### 2. Fork + เปลี่ยน Git (ทำตอนพร้อม sync อัปเดต)

1. [Fork Found-U](https://github.com/bodin2/found-u/fork) → ได้ `ชื่อคุณ/found-u` ที่ผูก upstream กับ `bodin2/found-u`
2. ใน Vercel: **Settings → Git** → Disconnect repo เดิม → Connect เลือก `ชื่อคุณ/found-u`
3. Redeploy (env และ Supabase ยังอยู่ครบ ไม่ต้องตั้งใหม่)

จากนั้นอัปเดตได้ทุกครั้งด้วย GitHub → **Sync fork → Update branch** แล้ว Vercel จะ deploy ให้อัตโนมัติ migration ของฐานข้อมูลรันเองหลัง deploy ข้อมูลโรงเรียนเดิมไม่หาย

> Vercel รองรับติดตั้ง Supabase พร้อมกันได้เฉพาะตอน deploy จาก `/new/clone` เท่านั้น จะ fork ก่อนแล้วติด Supabase ทีเดียวไม่ได้ — ต้องเริ่มจากขั้นที่ 1 เสมอ

### เลือก region ให้ได้ Free Plan

ตอนติดตั้ง Supabase ผ่าน Vercel ให้เลือก **Region: Southeast Asia (Singapore)** — latency ดีสำหรับไทยและรองรับ Free Plan บางภูมิภาค เช่น Tokyo หรือ Seoul จะขึ้น "Upgrade your plan..." และกด Free ไม่ได้

ถ้ายังเลือก Free ไม่ได้: ลองเปลี่ยนเป็น Singapore, เช็กว่า organization ยังมีโควตา free project เหลือ (จำกัด 2 โปรเจกต์/org) หรือสร้าง project ฟรีเองที่ [supabase.com/dashboard](https://supabase.com/dashboard) แล้วกลับมาเลือก "Connect existing Supabase account" ในเมนู `...` ข้างปุ่ม Install

## ตัวแปรสภาพแวดล้อม

ดูรายการเต็มพร้อมคำอธิบายได้ใน [`.env.example`](.env.example)

- **ต้องมี** (Vercel + Supabase integration ใส่ให้อัตโนมัติ): `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `POSTGRES_URL_NON_POOLING`
- **ใส่หลังรู้โดเมน** (ไม่บังคับตอน deploy ครั้งแรก): `NEXT_PUBLIC_APP_URL`, `SCHOOL_AUTH_DOMAIN` — ถ้ายังไม่รู้ URL ให้เว้นไว้ แอปจะใช้ `VERCEL_URL` แทนชั่วคราว
- **AI (ไม่บังคับ)**: `GEMMA_API_KEY`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` — ตั้งผ่าน Setup Wizard หรือใส่เป็น env ก็ได้
- **Storage (ไม่บังคับ)**: `R2_*` — ถ้าไม่ใส่ ระบบจะใช้ Supabase Storage แทนโดยอัตโนมัติ
- **ค้นหา**: `SEARCH_USE_TRGM`, `SEARCH_SIMILARITY_THRESHOLD`, `AGENT_SEARCH_SIMILARITY_THRESHOLD`

เจอ `500 MIDDLEWARE_INVOCATION_FAILED` หรือ `/setup?reason=missing_env` แปลว่ายังไม่มี env จาก Supabase integration หรือมีค่า `-` เป็น placeholder หลงเหลืออยู่ — แก้แล้ว redeploy ใหม่

## ทีมงาน

- [Athivaratz](https://www.instagram.com/athivaratz)
- [Almond](https://www.instagram.com/ohzzl_)
- [Prim](https://www.instagram.com/aeridesrosea.v)

**ที่ปรึกษาโครงการ:** [ratchanon_roj](https://www.instagram.com/ratchanon_roj) และอาจารย์อภิชาติ พูลสวัสดิ์

---

โครงการ Found-U : ระบบแจ้งของหาย-ของเจอสำหรับโรงเรียนด้วยปัญญาประดิษฐ์ และเทคโนโลยี NFC ได้รับทุนอุดหนุนการทำกิจกรรมส่งเสริมและสนับสนุนการวิจัยและนวัตกรรมจากสำนักงานการวิจัยแห่งชาติ และสำนักงานพัฒนาวิทยาศาสตร์และเทคโนโลยีแห่งชาติ
This research and innovation activity is funded by National Research Council of Thailand (NRCT) and National Science and Technology Development Agency (NSTDA) [สำนักงานการวิจัยแห่งชาติ (วช.)](https://nrct.go.th) และ [สำนักงานพัฒนาวิทยาศาสตร์และเทคโนโลยีแห่งชาติ (สวทช.)](https://www.nstda.or.th)

---

## อื่น ๆ

- ความปลอดภัยและการรายงานช่องโหว่: [SECURITY.md](SECURITY.md)
- สิทธิ์การใช้งาน (GNU Lesser General Public License v3 หรือรุ่นถัดไป) และข้อตกลงการใช้ซอฟต์แวร์ตามเงื่อนไข NSC 2026: [LICENSE](LICENSE)

---

<details>
<summary><strong>English summary</strong></summary>

Found-U is a school lost-and-found web app. Reporters and finders coordinate through tracking codes and automatic matching instead of lost-and-found boxes and bulletin boards. It also ships an AI assistant (chat, powered by Gemini/OpenRouter through the Vercel AI SDK) that can search, file reports, run matching, and read photos in one conversation, plus NFC tags that let anyone who finds a tagged item message the owner instantly.

Built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, and Supabase (Postgres, Auth, Realtime, RLS). Deploy your own instance with the **Deploy with Vercel** button above — it provisions Supabase, runs migrations automatically, and walks you through a setup wizard at `/setup`. See the Thai sections above for the full deploy guide, environment variables, and local dev instructions (mostly self-explanatory from the commands and tables).

This research and innovation activity is funded by National Research Council of Thailand (NRCT) and National Science and Technology Development Agency (NSTDA).

License: GNU Lesser General Public License v3.0 or later (LGPL-3.0-or-later), together with the NSC 2026 software-use disclaimer — see [LICENSE](LICENSE). Security reports: see [SECURITY.md](SECURITY.md).

</details>

<p align="center">Made with ❤️ by <a href="https://www.instagram.com/athivaratz">Athivaratz</a> & Team</p>
