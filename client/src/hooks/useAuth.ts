import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { insforge, hydrateInsforgeFromRefreshToken, isInsforgeConfigured } from "@/lib/insforge";
import {
  clearInsforgeTokenStorage,
  getInsforgeAccessToken,
  subscribeInsforgeAccessToken,
} from "@/lib/insforge-session";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  avatar: string;
  email: string;
  identity: string;
  phone: string;
  referralCode: string;
  totalEarnings: string;
  availableBalance: string;
  isActive: boolean;
  createdAt: string;
  role?: string;
  rank?: string;
  profilePicture?: string;
  permissions?: string[];
}

export function useAuth() {
  const [, setLocation] = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [accessEpoch, setAccessEpoch] = useState(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    return subscribeInsforgeAccessToken(() => setAccessEpoch((e) => e + 1));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isInsforgeConfigured()) {
        setIsAuthLoading(false);
        return;
      }
      await hydrateInsforgeFromRefreshToken();
      if (!cancelled) setIsAuthLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const accessToken = getInsforgeAccessToken();

  const { data: user, isLoading: isQueryLoading, error } = useQuery({
    queryKey: ["auth", accessToken ?? "none", accessEpoch],
    queryFn: async () => {
      const token = getInsforgeAccessToken();
      if (!token) return null;

      try {
        const response = await apiRequest("GET", "/api/user");
        const text = await response.text();
        let data: unknown;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          console.warn(
            "useAuth: /api/user returned non-JSON (check VITE_API_URL and that the API is reachable).",
          );
          return null;
        }
        return data as User | null;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("401") || msg.includes("404")) {
          return null;
        }
        throw e;
      }
    },
    enabled: !isAuthLoading && !!getInsforgeAccessToken(),
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      setIsTransitioning(true);
      try {
        await insforge.auth.signOut();
      } catch {
        /* non-fatal */
      }
      clearInsforgeTokenStorage();
      await apiRequest("POST", "/api/logout").catch(() => {});
    },
    onSuccess: () => {
      setTimeout(() => {
        queryClient.setQueryData(["auth"], null);
        queryClient.clear();
        setIsTransitioning(false);
        setLocation("/");
      }, 600);
    },
  });

  return {
    user,
    insforgeAccessToken: accessToken,
    isAuthenticated: !!user && !!getInsforgeAccessToken(),
    isLoading: isAuthLoading || isQueryLoading || isTransitioning,
    error,
    logout: logoutMutation.mutate,
  };
}

export function useRequireAuth() {
  const auth = useAuth();
  return {
    ...auth,
    shouldRedirectToLogin: !auth.isLoading && !auth.isAuthenticated,
  };
}
