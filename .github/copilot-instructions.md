# Copilot Instructions for scfondue - Lost & Found

## Project Context
School Lost & Found Web App designed with **LINE App** UX/UI (Clean, Simple, Mobile-first).
**Language**: Thai (UI) / English (Code, Comments).
**Stack**: Next.js 16 (App Router), React 19, Tailwind CSS 4, Firebase 9+ (Firestore, Storage, Auth).
**Status**: Beta Testing - Uses closed beta system with admin approval.

## Architecture & Core Patterns

### 1. Data & State Management
- **Firebase First**: Use `lib/firestore.ts` for all DB operations.
- **Context Wrappers**: 
  - `AuthProvider` (`contexts/auth-context.tsx`) manages user session, claims, and beta status.
  - `DataProvider` (`contexts/DataContext.tsx`) handles real-time subscriptions for items.
- **Models** (`lib/types.ts`):
  - `LostItem` uses `contacts: ContactInfo[]` (not single phone field).
  - `FoundItem` uses `finderContacts?: ContactInfo[]` and `photoUrl`.
  - `AppUser` has `role: 'user' | 'admin'`, `betaStatus: BetaStatus`, and `hasSeenTutorial`.

### 2. Design System (LINE Style)
- **Theme**: Light/Dark mode via `next-themes` (`ThemeProvider`).
- **Color Tokens**: Use CSS variables defined in `app/globals.css`:
  - Primary: `text-line-green`, `bg-line-green`, `bg-line-green-light`
  - Background: `bg-bg-primary`, `bg-bg-secondary`, `bg-bg-tertiary`, `bg-bg-card`
  - Text: `text-text-primary`, `text-text-secondary`, `text-text-tertiary`
  - Status: `text-status-error`, `bg-status-error-light`, etc.
  - Border: `border-border-light`, `border-border-medium`
- **Typography**: **Kanit** font for all Thai text.
- **Components**: Use `rounded-xl`/`rounded-full`, clean inputs (no borders), `shadow-card`.

### 3. Beta Testing System
- **AppSettings** (`lib/types.ts`): Controls system-wide beta settings.
  - `restrictModeEnabled`: Toggle restrict mode on/off.
  - `betaRequestsEnabled`: Toggle whether users can request access.
  - `betaClosedMessage`: Custom message when requests are closed.
- **Pending Page** (`app/pending/page.tsx`): Dedicated page for non-approved users (not modal).
- **Admin Settings** (`app/admin/settings/page.tsx`): Control restrict mode and beta requests.
- **Admin Beta Testers** (`app/admin/beta-testers/page.tsx`): Approve/reject users.
- **Auth hook**: `useAuth()` exposes `{ isBetaApproved, betaStatus, hasSeenTutorial, appSettings }`.

### 4. Image Handling (Zero Vercel Cost)
- **Upload**: Compress client-side using `browser-image-compression` before upload.
- **Display**: Use `next/image` with `unoptimized` prop.
  ```tsx
  <Image src={url} alt=".." fill className="object-cover" unoptimized />
  ```

## Critical Developer Workflows

### File Structure
- `app/` - Pages & Layouts. `app/admin/` is protected (admin only).
- `lib/` - Business logic: `firebase.ts` (init), `firestore.ts` (CRUD), `utils.ts` (helpers).
- `components/ui/` - Reusable UI: `beta-access-modal.tsx`, `tutorial-system.tsx`, etc.
- `components/layout/` - `header.tsx`, `bottom-nav.tsx` (Mobile nav).

### Common Tasks
- **Auth**: `useAuth()` hook exposes `{ user, appUser, isAdmin, isBetaApproved, betaStatus }`.
- **Styling**: Use `cn()` from `@/lib/utils` for conditional classes.
  ```tsx
  className={cn("bg-bg-card", isError && "border-status-error")}
  ```
- **Dates**: Store as Firestore `Timestamp`, convert in `lib/firestore.ts`, format with `formatThaiDate()`.

## Specific Conventions
1. **Routing**: `useRouter` from `next/navigation`.
2. **Server/Client**: Default to Server Components. Add `"use client"` only for interactive parts.
3. **Admin**: Admin role is manually set in Firestore `users/{uid}` -> `role: 'admin'`.
4. **Environment**: `process.env.NEXT_PUBLIC_*` for client-side config.

## Tech Stack Specifics
- **Tailwind 4**: CSS-first config using `@import "tailwindcss";`.
- **React 19**: Use modern patterns; standard hooks preferred for consistency.
