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
  role?: string;
}

export function useAuth() {
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
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchInterval: false,
    refetchOnReconnect: true,
    networkMode: 'online',
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