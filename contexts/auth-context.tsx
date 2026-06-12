"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  auth,
  type User,
  getSessionToken,
  onAuthChange,
  reloadCurrentUser,
  signInWithGoogle,
  signInWithStudentSession,
  signOut,
} from "@/lib/auth";
import { getTimeoutRemaining, isUserBanned } from "@/lib/database";
import { getAuthSessionStatus, postStudentLogin } from "@/lib/student-auth-api";
import type { AppSettings, AppUser, BanStatus } from "@/lib/types";
import { DEFAULT_APP_SETTINGS } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  appSettings: AppSettings;
  appSettingsReady: boolean;
  loading: boolean;
  isAuthActionLoading: boolean;
  isAdmin: boolean;
  isStudentVerified: boolean;
  hasSeenTutorial: boolean;
  mustChangePassword: boolean;
  isBanned: boolean;
  banStatus: BanStatus;
  banReason: string | undefined;
  timeoutRemaining: number;
  signIn: () => Promise<void>;
  signInWithStudentId: (studentId: string, password: string) => Promise<{ mustChangePassword: boolean }>;
  signInWithCustomToken: (_customToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [appSettingsReady, setAppSettingsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAuthActionLoading, setIsAuthActionLoading] = useState(false);

  const refreshUserProfile = async () => {
    const uid = auth.currentUser?.id ?? user?.id;
    if (!uid) return;
    const { getUser } = await import("@/lib/database");
    const latest = await getUser(uid);
    if (latest) setAppUser(latest);
  };

  const refreshSession = async () => {
    const current = auth.currentUser ?? user;
    if (!current) return;
    await reloadCurrentUser();
    await refreshUserProfile();
  };

  useEffect(() => {
    const unsubscribe = onAuthChange(async (sessionUser) => {
      setUser(sessionUser);
      if (!sessionUser) {
        setAppUser(null);
        setLoading(false);
        return;
      }

      try {
        await getAuthSessionStatus();
      } catch (error) {
        console.error("Session sync error:", error);
      }
      setLoading(false);
    });

    void reloadCurrentUser().then((existing) => {
      setUser(existing);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setAppUser(null);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void import("@/lib/database").then(({ subscribeToUser }) => {
      if (cancelled) return;
      unsubscribe = subscribeToUser(
        user.id,
        (userData) => setAppUser(userData),
        (error) => console.error("User listener error:", error)
      );
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void import("@/lib/database").then(({ subscribeToAppSettings }) => {
      if (cancelled) return;
      unsubscribe = subscribeToAppSettings((settings) => {
        setAppSettings(settings);
        setAppSettingsReady(true);
      });
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const signIn = async () => {
    setIsAuthActionLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
      await refreshSession();
    } finally {
      setIsAuthActionLoading(false);
    }
  };

  const signInWithStudentId = async (studentId: string, password: string) => {
    setIsAuthActionLoading(true);
    try {
      const { mustChangePassword } = await postStudentLogin(studentId, password);
      return { mustChangePassword };
    } finally {
      setIsAuthActionLoading(false);
    }
  };

  const signInWithCustomTokenHandler = async (_customToken: string) => {
    void _customToken;
    throw new Error("Custom token auth was removed. Use Supabase session tokens.");
  };

  const logout = async () => {
    setIsAuthActionLoading(true);
    try {
      const { error } = await signOut();
      if (error) throw error;
    } finally {
      setIsAuthActionLoading(false);
    }
  };

  const isAdmin = appUser?.role === "admin";
  const isStudentVerified = isAdmin || appUser?.isStudentVerified === true || !!appUser?.studentId;
  const isBanned = appUser ? isUserBanned(appUser) : false;
  const timeoutRemaining = appUser ? getTimeoutRemaining(appUser) : 0;
  const mustChangePassword = appUser?.mustChangePassword === true;

  return (
    <AuthContext.Provider
      value={{
        user,
        appUser,
        appSettings,
        appSettingsReady,
        loading,
        isAuthActionLoading,
        isAdmin,
        isStudentVerified,
        hasSeenTutorial: appUser?.hasSeenTutorial || false,
        mustChangePassword,
        isBanned,
        banStatus: appUser?.banStatus || "none",
        banReason: appUser?.banReason,
        timeoutRemaining,
        signIn,
        signInWithStudentId,
        signInWithCustomToken: signInWithCustomTokenHandler,
        logout,
        refreshSession,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
