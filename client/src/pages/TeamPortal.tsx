import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { PayoutControl } from "@/components/admin/PayoutControl";
import { UserManager } from "@/components/admin/UserManager";
import { AdminInbox } from "@/components/admin/AdminInbox";
import { AuditLogViewer } from "@/components/admin/AuditLogViewer";
import { TeamKeysManager } from "@/components/admin/TeamKeysManager";
import { TaskManager } from "@/components/admin/TaskManager";
import { SystemSettingsManager } from "@/components/admin/SystemSettingsManager";
import { LeaderboardInsights } from "@/components/admin/LeaderboardInsights";
import { Shield, Lock } from "lucide-react";

export default function TeamPortal() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [crmSearchTerm, setCrmSearchTerm] = useState("");
  const [, setLocation] = useLocation();

  const handleViewUserInCRM = (email: string) => {
    setCrmSearchTerm(email);
    setActiveSection("users");
  };

  // Access Control: Only allow 'admin' or 'founder' roles
  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/auth");
    } else if (!authLoading && user && user.role !== 'admin' && user.role !== 'founder' && user.role !== 'team') {
       // Note: 'team' role is also allowed but might have less perms (handled in components)
       setLocation("/");
    }
  }, [user, authLoading, setLocation]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent animate-spin mx-auto"></div>
          <p className="text-primary font-black tracking-widest animate-pulse">SYNCHRONIZING SECURE PROTOCOLS...</p>
        </div>
      </div>
    );
  }

  // Double check role to prevent flash of content
  if (user && user.role === 'user') {
    return null;
  }

  const renderContent = () => {
    // Check permissions for 'team' role
    if (user?.role === 'team') {
      if (activeSection === 'dashboard') return <AdminDashboard />;
      
      const perms = user.permissions || [];
      if (!perms.includes(activeSection)) {
        return (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center bg-black/5 rounded-3xl border-4 border-dashed border-[#111]/10">
            <div className="w-20 h-20 bg-black border-4 border-primary rounded-full flex items-center justify-center mb-6 animate-pulse">
              <Lock className="text-primary w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black uppercase text-[#111] mb-4 tracking-tighter">Secure Matrix Blocked</h2>
            <p className="max-w-md text-sm font-bold text-zinc-500 uppercase tracking-widest leading-relaxed mb-8">
              Structural integrity check failed. Your current administrative node does not possess the cryptographic clearance required to synchronize with the <span className="text-[#111] font-black">{activeSection.toUpperCase()}</span> protocol.
            </p>
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 border-2 border-[#111] rounded-xl font-black text-[10px] tracking-widest uppercase bg-white">
                Error Code: E-MATRIX-UNAUTH
              </div>
              <div className="px-4 py-2 bg-[#111] text-primary rounded-xl font-black text-[10px] tracking-widest uppercase">
                Contact Founder Nodes
              </div>
            </div>
          </div>
        );
      }
    }

    switch (activeSection) {
      case "dashboard":
        return <AdminDashboard />;
      case "leaderboard":
        return <LeaderboardInsights onViewUserInCRM={handleViewUserInCRM} />;
      case "tasks":
        return <TaskManager />;
      case "payouts":
        return <PayoutControl />;
      case "users":
        return <UserManager initialSearch={crmSearchTerm} />;
      case "inbox":
        return <AdminInbox />;
      case "audit":
        return <AuditLogViewer />;
      case "team":
        return <TeamKeysManager />;
      case "settings":
        return <SystemSettingsManager />;
      default:
        return <AdminDashboard />;
    }
  };

  const getTitle = () => {
    switch (activeSection) {
      case "dashboard": return "Command Center";
      case "leaderboard": return "Leaderboard & Risk Insights";
      case "tasks": return "Task & Ad Management";
      case "payouts": return "Payout Operations";
      case "users": return "User Registry";
      case "inbox": return "Communications";
      case "audit": return "Security Audit";
      case "team": return "Team Access";
      case "settings": return "Global Settings";
      default: return "Command Center";
    }
  };

  return (
    <AdminLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      title={getTitle()}
    >
      {renderContent()}
    </AdminLayout>
  );
}