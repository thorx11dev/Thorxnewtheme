import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { subscribeToUserBalance } from "@/lib/firestore";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

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
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const queryClient = useQueryClient();

  // Monitor Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setIsAuthLoading(false);
      // Invalidate query to refetch user profile when auth state changes
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    });
    return () => unsubscribe();
  }, [queryClient]);

  const { data: user, isLoading: isQueryLoading, error } = useQuery({
    queryKey: ["auth", firebaseUser?.uid],
    queryFn: async () => {
      console.log("useAuth: Fetching user profile. Firebase user:", firebaseUser?.uid);
      // If no Firebase user, we're not logged in
      if (!firebaseUser) return null;

      try {
        const response = await apiRequest("GET", "/api/user");
        const data = await response.json();
        console.log("useAuth: Profile fetch success:", data?.email);
        return data;
      } catch (error: any) {
        console.log("useAuth: Profile fetch failed:", error.message);
        if (error.message?.includes('401') || error.message?.includes('404')) {
          return null;
        }
        throw error;
      }
    },
    enabled: !isAuthLoading, // Only run query after Firebase initializes
    retry: false,
    staleTime: 0,
  });

  // Real-time Firestore Sync
  useEffect(() => {
    if (!firebaseUser) return;

    const unsubscribe = subscribeToUserBalance(firebaseUser.uid, (firestoreData) => {
      console.log("useAuth: Received real-time update from Firestore");
      // Merge Firestore data with current user data
      if (firestoreData) {
        queryClient.setQueryData(["auth", firebaseUser.uid], (oldData: any) => {
          if (!oldData) return null;
          return {
            ...oldData,
            ...firestoreData
          };
        });
      }
    });

    return () => unsubscribe();
  }, [firebaseUser, queryClient]);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      setIsTransitioning(true);
      await signOut(auth); // Sign out from Firebase
      await apiRequest("POST", "/api/logout"); // Also clear server session
    },
    onSuccess: () => {
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
    firebaseUser,
    isAuthenticated: !!user && !!firebaseUser,
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
