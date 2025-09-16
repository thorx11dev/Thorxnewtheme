import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Home from "@/pages/home";
import Auth from "@/pages/auth";
import UserPortal from "@/pages/UserPortal";
import TeamPortal from "@/pages/TeamPortal";
import { ProtectedRoute, PublicOnlyRoute, TeamProtectedRoute } from "@/components/auth/ProtectedRoute";
import NotFound from "@/pages/not-found";

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl font-black mb-2">THORX</div>
          <div className="text-sm">LOADING...</div>
        </div>
      </div>
    );
  }

  // Helper function to determine which portal to show based on user role
  const getPortalComponent = () => {
    if (!isAuthenticated) return <Home />;
    
    // Redirect to appropriate portal based on user role
    if (user?.role === 'team') {
      return <TeamPortal />;
    } else {
      return <UserPortal />;
    }
  };

  return (
    <Switch>
      {/* Root route - redirect based on auth status and role */}
      <Route path="/">
        {getPortalComponent()}
      </Route>

      {/* Auth route - only for non-authenticated users */}
      <Route path="/auth">
        <PublicOnlyRoute redirectTo="/">
          <Auth />
        </PublicOnlyRoute>
      </Route>

      {/* Protected routes - only for authenticated users */}
      <Route path="/portal">
        <ProtectedRoute>
          <UserPortal />
        </ProtectedRoute>
      </Route>

      {/* Team Portal route - for team members */}
      <Route path="/team-portal">
        <TeamProtectedRoute>
          <TeamPortal />
        </TeamProtectedRoute>
      </Route>

      {/* Legacy routes - redirect to root for authenticated users */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <UserPortal />
        </ProtectedRoute>
      </Route>

      <Route path="/work">
        <ProtectedRoute>
          <UserPortal />
        </ProtectedRoute>
      </Route>

      {/* 404 page */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;