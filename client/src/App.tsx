import { useState, useEffect, lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { ProtectedRoute, PublicOnlyRoute, TeamProtectedRoute } from "@/components/auth/ProtectedRoute";
import ThorxLoadingScreen from "@/components/ui/thorx-loading-screen";

const Home = lazy(() => import("@/pages/home"));
const Auth = lazy(() => import("@/pages/auth"));
const UserPortal = lazy(() => import("@/pages/UserPortal"));
const TeamPortal = lazy(() => import("@/pages/TeamPortal"));
const HilltopAdsAdmin = lazy(() => import("@/pages/HilltopAdsAdmin"));
const TermsAndConditions = lazy(() => import("@/pages/TermsAndConditions"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const AdLanding = lazy(() => import("@/pages/AdLanding"));
const NotFound = lazy(() => import("@/pages/not-found"));

function PageLoader() {
  return <ThorxLoadingScreen message="LOADING MODULE" duration={800} />;
}

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        setShowLoadingScreen(false);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (isLoading || showLoadingScreen) {
    return <ThorxLoadingScreen message="INITIALIZING THORX SYSTEM" duration={1800} />;
  }

  const getPortalComponent = () => {
    if (!isAuthenticated) return <Home />;

    if (user?.role === 'team' || user?.role === 'founder') {
      return <TeamPortal />;
    } else {
      return <UserPortal />;
    }
  };

  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/">
          {getPortalComponent()}
        </Route>

        <Route path="/auth">
          <PublicOnlyRoute redirectTo="/">
            <Auth />
          </PublicOnlyRoute>
        </Route>

        <Route path="/user-portal">
          <UserPortal />
        </Route>

        <Route path="/portal">
          <UserPortal />
        </Route>

        <Route path="/team-portal">
          <TeamPortal />
        </Route>

        <Route path="/team">
          <TeamPortal />
        </Route>

        <Route path="/dashboard">
          <UserPortal />
        </Route>

        <Route path="/work">
          <UserPortal />
        </Route>

        <Route path="/hilltopads">
          <TeamProtectedRoute>
            <HilltopAdsAdmin />
          </TeamProtectedRoute>
        </Route>

        <Route path="/terms">
          <TermsAndConditions />
        </Route>

        <Route path="/privacy">
          <PrivacyPolicy />
        </Route>

        <Route path="/ad-landing">
          <AdLanding />
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

import ComicClickEffect from "@/components/ui/ComicClickEffect";

function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }, [location]);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ScrollToTop />
        <ComicClickEffect />
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
