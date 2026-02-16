"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type User } from 'firebase/auth';
import { onAuthChange, signInWithGoogle, signOut } from '@/lib/auth';
import { createOrUpdateUser, subscribeToUser, subscribeToAppSettings, isUserBanned, getTimeoutRemaining } from '@/lib/firestore';
import type { AppUser, BetaStatus, BanStatus, AppSettings } from '@/lib/types';
import { DEFAULT_APP_SETTINGS } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  appSettings: AppSettings;
  loading: boolean;
  isAuthActionLoading: boolean;
  isAdmin: boolean;
  isBetaApproved: boolean;
  betaStatus: BetaStatus;
  hasSeenTutorial: boolean;
  // Ban/Timeout
  isBanned: boolean;
  banStatus: BanStatus;
  banReason: string | undefined;
  timeoutRemaining: number; // minutes remaining
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [isAuthActionLoading, setIsAuthActionLoading] = useState(false);

  useEffect(() => {
    console.log('Auth Provider mounted, subscribing to auth changes...');
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser ? `User ${firebaseUser.email}` : 'No user');
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // สร้างหรืออัปเดต user ใน Firestore
        try {
          console.log('Creating/Updating user in Firestore...');
          await createOrUpdateUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || undefined,
          });
          console.log('User synced with Firestore');
        } catch (error) {
          console.error('Error creating/updating user:', error);
        }
      } else {
        setAppUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to user document changes
  useEffect(() => {
    if (!user?.uid) {
      setAppUser(null);
      return;
    }

    const unsubscribe = subscribeToUser(user.uid, (userData) => {
      setAppUser(userData);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Subscribe to app settings changes
  useEffect(() => {
    const unsubscribe = subscribeToAppSettings((settings) => {
      setAppSettings(settings);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    setIsAuthActionLoading(true);
    try {
      const { error } = await signInWithGoogle();
      // Handle specific error cases
      if (error) {
        // Don't throw for user-cancelled operations
        const authError = error as any;
        if (authError.message === 'Sign-in already in progress' ||
            authError.code === 'auth/popup-closed-by-user') {
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error('Sign-in error:', error);
      throw error;
    } finally {
      setIsAuthActionLoading(false);
    }
  };

  const logout = async () => {
    setIsAuthActionLoading(true);
    try {
      const { error } = await signOut();
      if (error) {
        throw error;
      }
    } finally {
      setIsAuthActionLoading(false);
    }
  };

  // คำนวณ isBetaApproved โดยพิจารณา restrictModeEnabled
  const isBetaApproved = 
    appUser?.role === 'admin' || // Admin เข้าได้เสมอ
    !appSettings.restrictModeEnabled || // ถ้าปิด restrict mode ทุกคนเข้าได้
    appUser?.betaStatus === 'approved'; // ถ้าเปิด restrict mode ต้อง approved

  // คำนวณ ban status
  const isBanned = appUser ? isUserBanned(appUser) : false;
  const timeoutRemaining = appUser ? getTimeoutRemaining(appUser) : 0;

  return (
    <AuthContext.Provider
      value={{
        user,
        appUser,
        appSettings,
        loading,
        isAuthActionLoading,
        isAdmin: appUser?.role === 'admin',
        isBetaApproved,
        betaStatus: appUser?.betaStatus || 'none',
        hasSeenTutorial: appUser?.hasSeenTutorial || false,
        // Ban/Timeout
        isBanned,
        banStatus: appUser?.banStatus || 'none',
        banReason: appUser?.banReason,
        timeoutRemaining,
        signIn,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
