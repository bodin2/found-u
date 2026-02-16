# 🎒 BD2Fondue - ระบบแจ้งของหาย-ของเจอ V.Beta1.1

> แอปพลิเคชันเว็บสำหรับแจ้งและติดตามของหายในโรงเรียน ออกแบบด้วย UX/UI สะอาด เรียบง่าย Mobile-first

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-38B2AC)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-12-orange)](https://firebase.google.com/)

## 📋 สารบัญ

- [เกี่ยวกับโปรเจค](#เกี่ยวกับโปรเจค)
- [ฟีเจอร์หลัก](#ฟีเจอร์หลัก)
- [เทคโนโลยีที่ใช้](#เทคโนโลยีที่ใช้)
- [ความต้องการเบื้องต้น](#ความต้องการเบื้องต้น)
- [การติดตั้งและใช้งาน](#การติดตั้งและใช้งาน)
- [ตั้งค่า Environment Variables](#ตั้งค่า-environment-variables)
- [ตั้งค่า Firebase](#ตั้งค่า-firebase)
- [โครงสร้างโปรเจค](#โครงสร้างโปรเจค)
- [การพัฒนา](#การพัฒนา)
- [การ Deploy](#การ-deploy)
- [ระบบ Beta Testing](#ระบบ-beta-testing)
- [ตั้งค่า Admin](#ตั้งค่า-admin)
- [License](#license)

## 🎯 เกี่ยวกับโปรเจค

**BD2Fondue** เป็นระบบแจ้งของหายและของเจอที่ออกแบบมาสำหรับโรงเรียน โดยเฉพาะนักเรียนโรงเรียนบดินทรเดชา ๒ (ฝ่ายมัธยม) ระบบนี้ช่วยให้:

- 🔍 **ผู้ทำของหาย** สามารถแจ้งรายละเอียดของที่หายและติดตามสถานะได้
- 📸 **ผู้พบเจอของ** สามารถถ่ายรูปและแจ้งสถานที่นำส่งของได้
- 🎯 **ติดตามง่าย** ด้วยระบบ Tracking Code แบบ Real-time
- 📱 **ใช้งานง่าย** UX/UI แบบ LINE App ที่คุ้นเคย

### ✨ จุดเด่น

- 🎨 **ดีไซน์แบบ LINE** - Clean, Simple, Mobile-first
- ⚡ **Real-time Updates** - ข้อมูลอัปเดตแบบ Real-time ผ่าน Firestore
- 🌓 **Dark Mode** - รองรับ Light/Dark Theme
- 🔒 **Beta Testing System** - ระบบควบคุมการเข้าถึงแบบ Closed Beta
- 📊 **Admin Dashboard** - หน้าจัดการสำหรับผู้ดูแลระบบ
- 💾 **Zero Cost Images** - ใช้ Firebase Storage ไม่มีค่าใช้จ่าย Vercel Image Optimization

## 🎨 ฟีเจอร์หลัก

### สำหรับผู้ใช้ทั่วไป

1. **แจ้งของหาย**
   - เลือกประเภทของ (กระเป๋าสตางค์, โทรศัพท์, กุญแจ, ฯลฯ)
   - ระบุรายละเอียด สถานที่และวันที่ทำหาย
   - เพิ่มช่องทางติดต่อได้หลายช่องทาง (โทร, LINE, Instagram, Facebook, Email)
   - รับ Tracking Code สำหรับติดตาม

2. **แจ้งเจอของ**
   - ถ่ายรูปของที่เจอ (รองรับการบีบอัดรูปภาพอัตโนมัติ)
   - ระบุสถานที่เจอและสถานที่นำส่ง
   - เพิ่มช่องทางติดต่อผู้พบเจอ (ถ้าต้องการ)
   - รับ Tracking Code สำหรับติดตาม

3. **ติดตามสถานะ**
   - ค้นหาด้วย Tracking Code
   - ดูรายละเอียดและสถานะของ
   - อัปเดต Real-time

4. **ดูรายการทั้งหมด**
   - รายการของหายล่าสุด
   - รายการของที่เจอล่าสุด
   - กรองตามสถานะและประเภท

### สำหรับ Admin

1. **Dashboard**
   - สถิติภาพรวมระบบ
   - จำนวนของหาย/ของเจอ
   - ข้อมูลผู้ใช้

2. **จัดการรายการ**
   - อัปเดตสถานะของ
   - จับคู่ของหายกับของเจอ
   - ลบรายการที่ไม่เหมาะสม

3. **Settings**
   - จัดการ OG Tags (Open Graph)
   - ตั้งค่าระบบต่างๆ

## 🛠 เทคโนโลยีที่ใช้

### Frontend
- **Next.js 16** - App Router
- **React 19** - UI Library
- **TypeScript 5.9** - Type Safety
- **Tailwind CSS 4** - Styling
- **Lucide React** - Icons
- **next-themes** - Dark Mode
- **browser-image-compression** - Image Compression

### Backend & Database
- **Firebase 12**
  - Firestore - NoSQL Database
  - Storage - File Storage
  - Authentication - Google Sign-in
- **Firebase Admin SDK** - Server-side Operations

### อื่นๆ
- **clsx** & **tailwind-merge** - Conditional Styling
- **Bun** - Fast JavaScript Runtime

## 📦 ความต้องการเบื้องต้น

ก่อนเริ่มติดตั้ง ตรวจสอบให้แน่ใจว่าคุณมีสิ่งเหล่านี้:

- **Node.js** 18+ หรือ **Bun** 1.3+
- **Firebase Project** (สร้างได้ฟรีที่ [Firebase Console](https://console.firebase.google.com/))
- **Git** สำหรับ Clone Repository

## 🚀 การติดตั้งและใช้งาน

### 1. Clone Repository

```bash
git clone https://github.com/mdccvii/scfondue.git
cd scfondue
```

### 2. ติดตั้ง Dependencies

ใช้ npm:
```bash
npm install
```

หรือใช้ Bun (แนะนำ - เร็วกว่า):
```bash
bun install
```

### 3. ตั้งค่า Environment Variables

คัดลอกไฟล์ `.env.example` เป็น `.env.local`:

```bash
cp .env.example .env.local
```

แก้ไขไฟล์ `.env.local` และใส่ค่าต่างๆ จาก Firebase Console:

```env
# Firebase Client (Public)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Firebase Admin SDK (Server-side - PRIVATE)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your_project.appspot.com

# Rate Limiting (Optional)
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000

# Gemini API KEY (Optional - สำหรับฟีเจอร์เพิ่มเติมในอนาคต)
GEMMA_API_KEY=your_gemini_api_key
```

### 4. รัน Development Server

```bash
npm run dev
```

หรือ

```bash
bun dev
```

เปิดเบราว์เซอร์ที่ [http://localhost:3000](http://localhost:3000)

## 🔥 ตั้งค่า Firebase

### 1. สร้าง Firebase Project

1. ไปที่ [Firebase Console](https://console.firebase.google.com/)
2. สร้างโปรเจคใหม่
3. เปิดใช้งาน Google Analytics (ถ้าต้องการ)

### 2. เปิดใช้งาน Authentication

1. ไปที่ **Authentication** → **Sign-in method**
2. เปิดใช้งาน **Google**
3. ไปที่ **Settings** → **Authorized domains**
4. เพิ่ม domain ของคุณ (เช่น `localhost`, `your-app.vercel.app`)

### 3. สร้าง Firestore Database

1. ไปที่ **Firestore Database** → **Create database**
2. เลือก **Start in production mode**
3. เลือก Location (แนะนำ: asia-southeast1)
4. คัดลอก Firestore Rules จากโปรเจคนี้และใส่ใน Firebase Console

**Firestore Rules** (ตัวอย่าง):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    function isBetaApproved() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.betaStatus == 'approved';
    }
    
    // Settings - อ่านได้ทุกคน, เขียนได้เฉพาะ admin
    match /settings/{document=**} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // Users - เฉพาะ admin และตัวเอง
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      allow delete: if isAdmin();
    }
    
    // Lost Items - beta approved users สามารถสร้าง/อ่านได้
    match /lostItems/{itemId} {
      allow read: if true;
      allow create: if isBetaApproved();
      allow update: if isAdmin() || (isAuthenticated() && resource.data.userId == request.auth.uid);
      allow delete: if isAdmin();
    }
    
    // Found Items - beta approved users สามารถสร้าง/อ่านได้
    match /foundItems/{itemId} {
      allow read: if true;
      allow create: if isBetaApproved();
      allow update: if isAdmin() || (isAuthenticated() && resource.data.userId == request.auth.uid);
      allow delete: if isAdmin();
    }
  }
}
```

### 4. ตั้งค่า Storage

1. ไปที่ **Storage** → **Get started**
2. เลือก Location เดียวกับ Firestore
3. ใช้ Storage Rules จาก `storage.rules` ในโปรเจค

**Storage Rules**:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /found-items/{itemId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 5. สร้าง Service Account (สำหรับ Admin SDK)

1. ไปที่ **Project Settings** → **Service accounts**
2. คลิก **Generate new private key**
3. เก็บไฟล์ JSON ไว้ปลอดภัย
4. คัดลอกค่า `project_id`, `client_email`, และ `private_key` ใส่ใน `.env.local`

## 📁 โครงสร้างโปรเจค

```
scfondue/
├── app/                      # Next.js App Router
│   ├── admin/               # Admin Dashboard
│   │   ├── beta-testers/   # จัดการ Beta Testers
│   │   ├── settings/       # ตั้งค่าระบบ
│   │   └── page.tsx        # หน้า Admin หลัก
│   ├── api/                # API Routes
│   ├── found/              # หน้าแจ้งเจอของ
│   ├── list/               # หน้าแสดงรายการทั้งหมด
│   ├── login/              # หน้า Login
│   ├── lost/               # หน้าแจ้งของหาย
│   ├── pending/            # หน้ารอ Approve (Beta)
│   ├── tracking/           # หน้าติดตามสถานะ
│   ├── layout.tsx          # Root Layout
│   ├── page.tsx            # หน้าแรก
│   └── globals.css         # Global Styles
├── components/             # React Components
│   ├── auth/              # Authentication Components
│   ├── layout/            # Layout Components (BottomNav, Header)
│   ├── theme-provider.tsx # Theme Provider
│   └── ui/                # UI Components
├── contexts/              # React Contexts
│   ├── auth-context.tsx  # Authentication Context
│   └── DataContext.tsx   # Data Provider (Real-time)
├── lib/                   # Utilities & Helpers
│   ├── firebase.ts       # Firebase Client Config
│   ├── firebase-admin.ts # Firebase Admin Config
│   ├── firestore.ts      # Firestore Operations
│   ├── storage.ts        # Storage Operations
│   ├── types.ts          # TypeScript Types
│   └── utils.ts          # Utility Functions
├── public/               # Static Assets
├── .env.example         # ตัวอย่าง Environment Variables
├── .gitignore           # Git Ignore
├── next.config.ts       # Next.js Config
├── package.json         # Dependencies
├── tailwind.config.js   # Tailwind Config
├── tsconfig.json        # TypeScript Config
└── README.md           # คุณกำลังอ่านอยู่นี่แหละ!
```

## 👨‍💻 การพัฒนา

### คำสั่งที่สำคัญ

```bash
# รัน Dev Server
npm run dev
# หรือ
bun dev

# Build สำหรับ Production
npm run build
# หรือ
bun run build

# Start Production Server
npm run start
# หรือ
bun start

# Lint Code
npm run lint
# หรือ
bun lint
```

### Code Style & Guidelines

1. **TypeScript** - ใช้ TypeScript ทุกไฟล์
2. **Components** - ใช้ Functional Components + Hooks
3. **Styling** - ใช้ Tailwind CSS, หลีกเลี่ยง inline styles
4. **Comments** - เขียนคอมเมนต์เป็นภาษาไทยสำหรับโค้ดที่ซับซ้อน
5. **UI Text** - ข้อความที่แสดงใช้ภาษาไทย
6. **Naming** - ตัวแปร/ฟังก์ชันใช้ภาษาอังกฤษ

### ดีไซน์ LINE Style

โปรเจคนี้ใช้ดีไซน์คล้าย LINE App:

- **สี**: ใช้ตัวแปร CSS ที่กำหนดไว้ใน `globals.css`
  - Primary: `text-line-green`, `bg-line-green`
  - Background: `bg-bg-primary`, `bg-bg-secondary`, `bg-bg-card`
  - Text: `text-text-primary`, `text-text-secondary`
  - Status: `text-status-error`, `text-status-success`
- **Typography**: ใช้ฟอนต์ **Kanit** สำหรับข้อความไทย
- **Border**: `rounded-xl` หรือ `rounded-full`
- **Shadow**: `shadow-card`
- **Input**: Clean style ไม่มี border

## 🚢 การ Deploy

### Deploy บน Vercel (แนะนำ)

1. **Push โค้ดขึ้น GitHub**

2. **Import ไปยัง Vercel**
   - ไปที่ [vercel.com](https://vercel.com)
   - คลิก **Import Project**
   - เลือก Repository `mdccvii/scfondue`

3. **ตั้งค่า Environment Variables**
   - ไปที่ **Settings** → **Environment Variables**
   - เพิ่มตัวแปรทั้งหมดจาก `.env.local`
   - ⚠️ **สำคัญ**: อย่าลืมใส่ `FIREBASE_PRIVATE_KEY` โดยครอบด้วย `" "`

4. **Deploy**
   - Vercel จะ Deploy อัตโนมัติ
   - ตรวจสอบ Build Logs หากเจอ Error

5. **ตั้งค่า Firebase Authorized Domains**
   - คัดลอก URL ที่ได้จาก Vercel (เช่น `your-app.vercel.app`)
   - ไปที่ Firebase Console → Authentication → Settings → Authorized domains
   - เพิ่ม domain ของคุณ

### Checklist ก่อน Deploy

ดูรายละเอียดใน [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

- [ ] Environment Variables ครบทุกตัว
- [ ] Firestore Rules อัปเดตแล้ว
- [ ] Storage Rules อัปเดตแล้ว
- [ ] Google Authentication เปิดใช้งานแล้ว
- [ ] Authorized Domains เพิ่มแล้ว
- [ ] Build สำเร็จ (ไม่มี Error)
- [ ] ทดสอบ Login/Logout
- [ ] ทดสอบ Upload รูปภาพ
- [ ] ทดสอบ Real-time Updates

## 🔐 ระบบ Beta Testing

โปรเจคนี้มีระบบ **Closed Beta** ในตัว:

### การทำงาน

1. **Restrict Mode** (เปิด/ปิดได้จาก Admin Settings)
   - เมื่อเปิด: เฉพาะ Beta Approved Users เข้าใช้ได้
   - เมื่อปิด: ทุกคนเข้าใช้ได้ทันที

2. **Beta Requests** (เปิด/ปิดได้จาก Admin Settings)
   - เมื่อเปิด: ผู้ใช้สามารถขอสิทธิ์ได้
   - เมื่อปิด: แสดงข้อความ "ปิดรับสมัคร"

3. **สถานะ Beta Tester**
   - `none` - ยังไม่ขอสิทธิ์
   - `pending` - รอการอนุมัติ (แสดงหน้า `/pending`)
   - `approved` - อนุมัติแล้ว (ใช้งานได้เต็มที่)
   - `rejected` - ถูกปฏิเสธ

### สำหรับ Admin

1. ไปที่ `/admin/beta-testers`
2. ดูรายชื่อผู้ขอสิทธิ์
3. คลิก **อนุมัติ** หรือ **ปฏิเสธ**

### สำหรับ User

1. Login ด้วย Google
2. ถ้ายังไม่ได้รับอนุมัติ → ขอสิทธิ์ที่หน้า Pending
3. รอ Admin อนุมัติ
4. เมื่ออนุมัติแล้ว → ใช้งานได้เต็มที่

## 👨‍💼 ตั้งค่า Admin

### ทำให้ตัวเองเป็น Admin

หลังจาก Deploy แล้ว:

1. **Login ครั้งแรก**
   - ไปที่เว็บแอป
   - Login ด้วย Google Account ของคุณ

2. **เปลี่ยน Role ใน Firestore**
   - ไปที่ Firebase Console → Firestore Database
   - เข้า Collection `users`
   - หา Document ที่มี `uid` ตรงกับของคุณ
   - แก้ไข Field `role` จาก `'user'` เป็น `'admin'`
   - แก้ไข Field `betaStatus` เป็น `'approved'` (ถ้ายังไม่ได้)

3. **Refresh หน้าเว็บ**
   - Logout แล้ว Login ใหม่
   - คุณจะเห็นเมนู Admin Dashboard

### Admin Permissions

Admin สามารถ:
- ✅ เข้าถึง Admin Dashboard (`/admin`)
- ✅ อนุมัติ/ปฏิเสธ Beta Testers
- ✅ เปิด/ปิด Restrict Mode
- ✅ เปิด/ปิดการรับสมัคร Beta
- ✅ แก้ไขรายการของหาย/ของเจอทั้งหมด
- ✅ ลบรายการที่ไม่เหมาะสม
- ✅ ดูสถิติและข้อมูลทั้งหมด

## 🤝 การมีส่วนร่วม

หากคุณต้องการมีส่วนร่วมในโปรเจค:

1. Fork Repository นี้
2. สร้าง Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit การเปลี่ยนแปลง (`git commit -m 'Add some AmazingFeature'`)
4. Push ไปยัง Branch (`git push origin feature/AmazingFeature`)
5. เปิด Pull Request

## 📝 License

โปรเจคนี้เปิดให้ใช้งานภายใต้ MIT License

## 🙏 Credits

- **Developer**: [mdccvii](https://github.com/mdccvii)
- **School**: โรงเรียนบดินทรเดชา (สิงห์ สิงหเสนี) ๒
- **Inspiration**: LINE App UX/UI

## 📧 ติดต่อ

หากมีคำถามหรือข้อเสนอแนะ:
- GitHub Issues: [github.com/mdccvii/scfondue/issues](https://github.com/mdccvii/scfondue/issues)
- Email: ติดต่อผ่าน GitHub Profile

---

Made with ❤️ by [Athivaratz](https://itsim.tech) & [ratchanon_roj](https://www.instagram.com/ratchanon_roj)
