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
import type { UserBadgeItem } from "@/lib/badges";

export interface LinkedAccountSummary {
  id: string;
  providerId: string;
  accountId: string;
  username: string | null;
  createdAt: string | null;
}

export interface AuthUser {
  userId: string;
  sessionId: string;
  name: string;
  username: string | null;
  bio: string | null;
  isPublicProfile: boolean;
  showPublicSocials: boolean;
  email: string;
  emailVerified: boolean;
  image: string | null;
  discordId: string | null;
  discordUsername: string | null;
  githubId: string | null;
  githubUsername: string | null;
  hasPassword: boolean;
  twoFactorEnabled: boolean;
  securityScore: number;
  linkedProviders: string[];
  linkedAccounts: LinkedAccountSummary[];
  connectedAppsCount: number;
  role: string;
  roles: string[];
  roleDetails: Array<{
    slug: string;
    name: string;
    color: string;
    priority: number;
    isSystem: boolean;
  }>;
  permissions: string[];
  badges: UserBadgeItem[];
  allBadges: UserBadgeItem[];
  isEnvAdmin: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  createdAt: string | null;
}

export interface ConfiguredProviders {
  discord: boolean;
  github: boolean;
  emailOtp: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  providers: ConfiguredProviders;
  loading: boolean;
  refreshUser: () => Promise<AuthUser | null>;
  clearUser: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [providers, setProviders] = useState<ConfiguredProviders>({
    discord: true,
    github: true,
    emailOtp: false,
  });
  const [loading, setLoading] = useState(true);
  const inflightRef = useRef<Promise<AuthUser | null> | null>(null);

  const fetchMeOnce = useCallback(async (): Promise<{
    ok: boolean;
    authenticated: boolean;
    user: AuthUser | null;
    providers?: ConfiguredProviders;
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
      providers?: ConfiguredProviders;
    };
    return {
      ok: true,
      authenticated: Boolean(data.authenticated && data.user),
      user: data.authenticated && data.user ? data.user : null,
      providers: data.providers,
    };
  }, []);

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    if (inflightRef.current) {
      return inflightRef.current;
    }

    const promise = (async () => {
      try {
        let result = await fetchMeOnce();
        if (!result.ok) {
          await new Promise((r) => setTimeout(r, 450));
          result = await fetchMeOnce();
        }
        if (result.providers) {
          setProviders(result.providers);
        }
        if (result.ok) {
          setUser(result.user);
          return result.user;
        }
        return null;
      } catch {
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

  useEffect(() => {
    refreshUser();
  }, [pathname, refreshUser]);

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
    <AuthContext.Provider
      value={{ user, providers, loading, refreshUser, clearUser }}
    >
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
