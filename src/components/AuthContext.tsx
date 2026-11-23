"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";

export interface AuthUser {
  userId: string;
  sessionId: string;
  name: string;
  username: string | null;
  bio: string | null;
  email: string;
  emailVerified: boolean;
  image: string | null;
  discordId: string | null;
  discordUsername: string | null;
  hasPassword: boolean;
  linkedProviders: string[];
  role: "owner" | "admin" | "user";
  isOwner: boolean;
  isAdmin: boolean;
  createdAt: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  refreshUser: () => Promise<AuthUser | null>;
  clearUser: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const inflightRef = useRef<Promise<AuthUser | null> | null>(null);

  const fetchMeOnce = useCallback(async (): Promise<{
    ok: boolean;
    authenticated: boolean;
    user: AuthUser | null;
  }> => {
    const res = await fetch("/api/me", {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });
    if (!res.ok) {
      return { ok: false, authenticated: false, user: null };
    }
    const data = (await res.json()) as {
      authenticated?: boolean;
      user?: AuthUser | null;
    };
    return {
      ok: true,
      authenticated: Boolean(data.authenticated && data.user),
      user: data.authenticated && data.user ? data.user : null,
    };
  }, []);

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    if (inflightRef.current) {
      return inflightRef.current;
    }

    const promise = (async () => {
      try {
        let result = await fetchMeOnce();
        // Retry once on transient 5xx / cold-start hiccup
        if (!result.ok) {
          await new Promise((r) => setTimeout(r, 450));
          result = await fetchMeOnce();
        }
        // Only overwrite user state when the server explicitly returned 200 OK
        if (result.ok) {
          setUser(result.user);
          return result.user;
        }
        return null;
      } catch {
        // Never wipe a valid logged-in session on a transient network error
        return null;
      } finally {
        setLoading(false);
        inflightRef.current = null;
      }
    })();

    inflightRef.current = promise;
    return promise;
  }, [fetchMeOnce]);

  const clearUser = useCallback(() => {
    setUser(null);
    setLoading(false);
  }, []);

  // Re-sync session on initial load & route transitions
  useEffect(() => {
    refreshUser();
  }, [pathname, refreshUser]);

  // Re-sync when user returns to tab (e.g. after Discord OAuth or another tab sign-in)
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") {
        refreshUser();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, clearUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
