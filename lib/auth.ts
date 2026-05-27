import { 
  getAuth, 
  signInWithPopup,
  linkWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithCustomToken,
  unlink,
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence,
  type User
} from 'firebase/auth';
import app from './firebase';

// Initialize Auth
export const auth = getAuth(app);

// Set persistence to local (survive browser refresh)
setPersistence(auth, browserLocalPersistence).catch(console.error);

// Google Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Singleton lock to prevent multiple sign-in requests
let isSigningIn = false;

// Sign in with Google using Popup (better for Desktop/PWA)
export async function signInWithGoogle() {
  // Prevent multiple simultaneous requests
  if (isSigningIn) {
    console.log('Sign-in already in progress, ignoring duplicate request');
    return { user: null, error: null };
  }

  isSigningIn = true;
  
  try {
    const result = await signInWithPopup(auth, googleProvider);
    isSigningIn = false;
    return { user: result.user, error: null };
  } catch (error: unknown) {
    console.error('Error signing in with Google:', error);
    isSigningIn = false;
    return { user: null, error: error as Error };
  }
}

// เชื่อม Google กับบัญชีที่ล็อกอินอยู่ (รหัสนักเรียน / PIN / PassKey)
export async function linkGoogleToCurrentUser() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return { user: null, error: new Error("กรุณาเข้าสู่ระบบก่อน") };
  }

  try {
    const result = await linkWithPopup(currentUser, googleProvider);
    return { user: result.user, error: null };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "auth/popup-closed-by-user") {
      return { user: null, error: null };
    }
    if (err.code === "auth/credential-already-in-use") {
      return {
        user: null,
        error: new Error("บัญชี Google นี้ถูกใช้กับผู้ใช้อื่นแล้ว"),
      };
    }
    console.error("Error linking Google:", error);
    return {
      user: null,
      error: new Error(err.message || "เชื่อมบัญชี Google ไม่สำเร็จ"),
    };
  }
}

export async function unlinkGoogleFromCurrentUser() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return { user: null, error: new Error("กรุณาเข้าสู่ระบบก่อน") };
  }

  try {
    const user = await unlink(currentUser, "google.com");
    return { user, error: null };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    console.error("Error unlinking Google:", error);
    return {
      user: null,
      error: new Error(err.message || "ยกเลิกการเชื่อม Google ไม่สำเร็จ"),
    };
  }
}

// Sign in with custom token (school login)
export async function signInWithStudentCustomToken(customToken: string) {
  try {
    const result = await signInWithCustomToken(auth, customToken);
    return { user: result.user, error: null };
  } catch (error) {
    console.error('Error signing in with custom token:', error);
    return { user: null, error: error as Error };
  }
}

// Sign out
export async function signOut() {
  try {
    await firebaseSignOut(auth);
    return { error: null };
  } catch (error) {
    console.error('Error signing out:', error);
    return { error: error as Error };
  }
}

// Get current user
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

// Subscribe to auth state changes
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
