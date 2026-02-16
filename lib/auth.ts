import { 
  getAuth, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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
  } catch (error: any) {
    console.error('Error signing in with Google:', error);
    isSigningIn = false;
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
