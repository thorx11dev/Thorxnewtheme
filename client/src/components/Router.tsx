
import { Route, Switch } from "wouter";
import { ProtectedRoute, PublicOnlyRoute } from "./auth/ProtectedRoute";
import Home from "@/pages/home";
import Auth from "@/pages/auth";
import UserPortal from "@/pages/UserPortal";
import TeamPortal from "@/pages/TeamPortal";
import NotFound from "@/pages/not-found";

export default function Router() {
  return (
    <Switch>
      {/* Public routes - only accessible when NOT authenticated */}
      <Route path="/auth">
        <PublicOnlyRoute>
          <Auth />
        </PublicOnlyRoute>
      </Route>
      
      {/* Home page - accessible to all */}
      <Route path="/" component={Home} />
      
      {/* Protected routes - only accessible when authenticated */}
      <Route path="/portal">
        <ProtectedRoute>
          <UserPortal />
        </ProtectedRoute>
      </Route>

      {/* Team Portal - only accessible to team members */}
      <Route path="/team">
        <ProtectedRoute>
          <TeamPortal />
        </ProtectedRoute>
      </Route>
      
      {/* 404 page */}
      <Route component={NotFound} />
    </Switch>
  );
}
