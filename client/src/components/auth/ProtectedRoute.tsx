import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/auth");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      )
    );
  }

  // Don't render children if not authenticated (will redirect in useEffect)
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

// For routes that should only be accessible when NOT authenticated (like login/register)
interface PublicOnlyRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function PublicOnlyRoute({ children, redirectTo = "/" }: PublicOnlyRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation(redirectTo);
    }
  }, [isAuthenticated, isLoading, setLocation, redirectTo]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If authenticated, don't render children (will redirect in useEffect)
  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

// For routes that should only be accessible to team members
interface TeamProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function TeamProtectedRoute({ children, fallback }: TeamProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // Not authenticated, redirect to auth
        setLocation("/auth");
        return;
      }
      
      if (user?.role !== 'team' && user?.role !== 'founder') {
        // Authenticated but not team or founder role, redirect to appropriate portal
        toast({
          title: "Access Denied",
          description: "You don't have permission to access the team portal.",
          variant: "destructive"
        });
        setLocation("/");
        return;
      }
    }
  }, [isAuthenticated, isLoading, user?.role, setLocation, toast]);

  // Show loading while checking authentication and role
  if (isLoading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      )
    );
  }

  // Don't render children if not authenticated or not team/founder member (will redirect in useEffect)
  if (!isAuthenticated || (user?.role !== 'team' && user?.role !== 'founder')) {
    return null;
  }

  return <>{children}</>;
}