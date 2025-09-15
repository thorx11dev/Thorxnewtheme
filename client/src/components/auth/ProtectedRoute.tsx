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
  const { toast } = useToast();
  const hasShownWarning = useRef(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !hasShownWarning.current) {
      // Show informational message and redirect to auth for optional login
      const timeoutId = setTimeout(() => {
        if (!isAuthenticated && !isLoading) {
          hasShownWarning.current = true;
          toast({
            title: "Welcome to THORX",
            description: "You can login for a personalized experience or continue as guest.",
          });
          setLocation("/auth");
        }
      }, 200);

      return () => clearTimeout(timeoutId);
    }
  }, [isAuthenticated, isLoading, setLocation, toast]);

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

  // Always render children - no authentication required
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