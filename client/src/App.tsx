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

// Animated Loading Status Component
function AnimatedLoadingStatus() {
  const statusWords = ["Initializing", "Connecting", "Authenticating", "Preparing"];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    const word = statusWords[currentIndex];
    let timeout: NodeJS.Timeout;

    if (isTyping) {
      if (currentText.length < word.length) {
        timeout = setTimeout(() => {
          setCurrentText(word.slice(0, currentText.length + 1));
        }, 80);
      } else {
        timeout = setTimeout(() => setIsTyping(false), 800);
      }
    } else {
      if (currentText.length > 0) {
        timeout = setTimeout(() => {
          setCurrentText(currentText.slice(0, -1));
        }, 40);
      } else {
        setCurrentIndex((prev) => (prev + 1) % statusWords.length);
        setIsTyping(true);
      }
    }

    return () => clearTimeout(timeout);
  }, [currentText, currentIndex, isTyping]);

  return (
    <span className="text-primary font-bold text-xs sm:text-sm md:text-base tracking-wide min-w-[120px] sm:min-w-[140px] md:min-w-[160px] text-right">
      {currentText}
      <span className="animate-pulse">|</span>
    </span>
  );
}

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          {/* Animated Loading Input Field */}
          <div className="relative w-[320px] sm:w-[400px] md:w-[480px] mx-auto">
            {/* Input Field Container */}
            <div className="relative border-2 border-white bg-transparent rounded-none overflow-hidden">
              {/* Animated Text Content */}
              <div className="px-4 py-3 sm:px-6 sm:py-4 md:px-8 md:py-5">
                <div className="flex items-center justify-between">
                  {/* LOADING Text */}
                  <span className="text-white font-black text-sm sm:text-base md:text-lg tracking-wider animate-pulse">
                    LOADING...
                  </span>
                  
                  {/* Animated Status Word */}
                  <AnimatedLoadingStatus />
                </div>
              </div>
              
              {/* Animated Border Glow */}
              <div className="absolute inset-0 border-2 border-primary opacity-0 animate-border-pulse pointer-events-none"></div>
            </div>
            
            {/* THORX Brand Below */}
            <div className="mt-6 text-white font-black text-xl sm:text-2xl md:text-3xl tracking-widest opacity-60">
              THORX
            </div>
          </div>
        </div>
      </div>
    );
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