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
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get current user query
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["auth", "user"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/user");
        return await response.json() as User;
      } catch (error: any) {
        // If user is not authenticated, return null instead of throwing
        if (error.message?.includes("401")) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/logout"),
    onSuccess: () => {
      queryClient.clear(); // Clear all cached data
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: any) => {
      console.error("Logout error:", error);
      // Even if logout fails on server, clear local state
      queryClient.clear();
    },
  });

  const logout = () => {
    logoutMutation.mutate();
  };

  const refetchUser = () => {
    queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    isLoggedOut: !user && !isLoading && !error,
    logout,
    refetchUser,
    isLoggingOut: logoutMutation.isPending,
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