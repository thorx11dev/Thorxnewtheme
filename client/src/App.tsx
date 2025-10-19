import { useState, useEffect } from "react";
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
import HilltopAdsAdmin from "@/pages/HilltopAdsAdmin";
import { ProtectedRoute, PublicOnlyRoute, TeamProtectedRoute } from "@/components/auth/ProtectedRoute";
import NotFound from "@/pages/not-found";
import ThorxLoadingScreen from "@/components/ui/thorx-loading-screen";

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      // Show loading screen for minimum duration for smooth experience
      const timer = setTimeout(() => {
        setShowLoadingScreen(false);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (isLoading || showLoadingScreen) {
    return <ThorxLoadingScreen message="INITIALIZING THORX SYSTEM" duration={1800} />;
  }

  // Helper function to determine which portal to show based on user role
  const getPortalComponent = () => {
    if (!isAuthenticated) return <Home />;
    
    // Redirect to appropriate portal based on user role
    if (user?.role === 'team' || user?.role === 'founder') {
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

      {/* User Portal routes */}
      <Route path="/user-portal">
        <UserPortal />
      </Route>
      
      <Route path="/portal">
        <UserPortal />
      </Route>

      {/* Team Portal routes */}
      <Route path="/team-portal">
        <TeamPortal />
      </Route>
      
      <Route path="/team">
        <TeamPortal />
      </Route>

      {/* Legacy routes */}
      <Route path="/dashboard">
        <UserPortal />
      </Route>

      <Route path="/work">
        <UserPortal />
      </Route>

      {/* HilltopAds Admin - Team/Founder only */}
      <Route path="/hilltopads">
        <TeamProtectedRoute>
          <HilltopAdsAdmin />
        </TeamProtectedRoute>
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