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
      try {
        const response = await apiRequest("GET", "/api/user");
        if (!response.ok) {
          return null;
        }
        return await response.json();
      } catch (error: any) {
        // Always return null for failed auth instead of throwing
        return null;
      }
    },
    retry: false,
    staleTime: 60 * 1000, // 1 minute
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Reduce unnecessary refetches
    refetchInterval: false,
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
    user: user || null,
    isAuthenticated: !!user && user !== null,
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