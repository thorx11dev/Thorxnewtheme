import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useState } from "react";

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
}

export function useAuth() {
  const [, setLocation] = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["auth"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/user");
        return await response.json();
      } catch (error: any) {
        // Handle 401 and 404 without throwing - user is not logged in
        if (error.message?.includes('401') || error.message?.includes('404')) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    refetchOnReconnect: true,
  });

  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      setIsTransitioning(true);
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      // Consistent 1.8 second transition for logout
      setTimeout(() => {
        queryClient.setQueryData(["auth"], null);
        queryClient.clear();
        setIsTransitioning(false);
        setLocation("/");
      }, 1800);
    },
  });

  return {
    user,
    isAuthenticated: !!user,
    isLoading: isLoading || isTransitioning,
    error,
    logout: logoutMutation.mutate,
  };
}

// Hook for protected routes
export function useRequireAuth() {
  const auth = useAuth();

  return {
    ...auth,
    // Helper to check if we should show loading or redirect
    shouldRedirectToLogin: !auth.isLoading && !auth.isAuthenticated,
  };
}