import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// Service Account configuration จาก environment variable
const serviceAccount: ServiceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

// Validate required environment variables
if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
  throw new Error('Missing required Firebase Admin environment variables: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, or FIREBASE_CLIENT_EMAIL');
}

// Initialize Firebase Admin (ป้องกัน initialize ซ้ำ)
const adminApp = getApps().length === 0 
  ? initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    })
  : getApps()[0];

// Initialize Admin services
export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
export const adminStorage = getStorage(adminApp);

export default adminApp;
