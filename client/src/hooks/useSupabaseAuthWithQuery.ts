import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
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

export function useSupabaseAuthWithQuery() {
  const { user: supabaseUser, session, loading: supabaseLoading, signIn, signUp, signOut: supabaseSignOut } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query for user profile data from our backend using Supabase token
  const { data: userProfile, isLoading: profileLoading, error } = useQuery({
    queryKey: ["auth", "profile", supabaseUser?.id],
    queryFn: async () => {
      if (!session?.access_token) {
        return null;
      }

      const response = await fetch("/api/auth/user", {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.status === 401) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    },
    enabled: !!supabaseUser && !!session?.access_token,
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    refetchOnReconnect: true,
  });

  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async (data: {
      firstName: string;
      lastName: string;
      identity: string;
      phone: string;
      email: string;
      password: string;
      referralCode?: string;
    }) => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      toast({
        title: "Registration successful",
        description: "Welcome to Thorx!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const { data: authData, error } = await signIn(data.email, data.password);
      
      if (error) {
        throw new Error(error.message);
      }

      return authData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout function
  const logout = async () => {
    try {
      await supabaseSignOut();
      queryClient.clear();
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      // Force clear anyway
      queryClient.clear();
      window.location.href = "/";
    }
  };

  const isLoading = supabaseLoading || profileLoading;
  const isAuthenticated = !!supabaseUser && !!userProfile;

  return {
    user: userProfile,
    supabaseUser,
    session,
    isAuthenticated,
    isLoading,
    error,
    register: registerMutation.mutate,
    isRegistering: registerMutation.isPending,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    logout,
  };
}

// Hook for protected routes
export function useRequireSupabaseAuth() {
  const auth = useSupabaseAuthWithQuery();

  return {
    ...auth,
    shouldRedirectToLogin: !auth.isLoading && !auth.isAuthenticated,
  };
}