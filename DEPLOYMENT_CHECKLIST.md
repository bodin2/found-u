# Pre-Deployment Checklist for scfondue

## 1. Environment Variables (Vercel)
Make sure to add these environment variables in Vercel Project Settings > Environment Variables:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

## 2. Firebase Configuration
- **Firestore Rules**: Ensure the rules from `docs/firestore-rules.txt` are published in Firebase Console.
- **Storage Rules**: Ensure the rules from `docs/storage-rules.txt` are published.
- **Authentication**:
  - Enable **Google** provider.
  - Add your Vercel domain (e.g., `your-project.vercel.app`) to **Authorized Domains** in Firebase Console > Authentication > Settings.

## 3. Build & Deployment
- The project uses **Static Exports** for shell pages (`○`) with **Client-side Data Fetching**. This is correct for this architecture.
- **Images**: We use `unoptimized` prop on `<Image />` components to avoid Vercel Image Optimization costs.
- **Login**: We configured `Cross-Origin-Opener-Policy` in `next.config.ts` to support Google Popup Login.

## 4. Admin Setup
- After deployment, the first user to login will be a normal user.
- Go to Firebase Console > Firestore > `users` collection.
- Find your user document and change `role` from `'user'` to `'admin'`.
- Refresh the app to access the Admin Dashboard.

## 5. Testing
- Test **Login/Logout** on the deployed URL.
- Test **Image Upload** (Found Item) - check if image appears.
- Test **Real-time Updates** (open 2 tabs, add item in one, check list in another).
