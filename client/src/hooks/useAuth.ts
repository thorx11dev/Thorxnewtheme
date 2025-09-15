import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  identity: string;
  phone: string;
  referralCode: string;
  totalEarnings: string;
  availableBalance: string;
  isActive: boolean;
  createdAt: string;
}

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["auth"],
    queryFn: async () => {
      const response = await fetch("/api/user", {
        credentials: "include",
      });
      
      // Handle 401 without throwing an error - user is simply not logged in
      if (response.status === 401) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
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

  const logout = async () => {
    try {
      await apiRequest("POST", "/api/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear all queries and redirect
      queryClient.clear();
      window.location.href = "/";
    }
  };

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    logout,
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