import React from "react";
import { AdminNavigation } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { MobileNavBar } from "@/components/ui/mobile-nav-bar";
import { 
  Users, 
  LayoutDashboard, 
  CreditCard, 
  Mail, 
  FileText, 
  Key, 
  Home,
  LogOut,
  Shield,
  Target,
  Settings
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import ThorxLoadingScreen from "@/components/ui/thorx-loading-screen";

interface AdminLayoutProps {
  children: React.ReactNode;
  activeSection: string;
  onSectionChange: (section: string) => void;
  title: string;
}

export function AdminLayout({ children, activeSection, onSectionChange, title }: AdminLayoutProps) {
  const { user, logout, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await logout();
    setLocation("/auth");
  };

  if (isLoading) {
    return <ThorxLoadingScreen />;
  }

  const adminNavItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Stats" },
    { id: "leaderboard", icon: Shield, label: "Leaderboard" },
    { id: "tasks", icon: Target, label: "Tasks" },
    { id: "payouts", icon: CreditCard, label: "Payouts" },
    { id: "users", icon: Users, label: "Users" },
    { id: "inbox", icon: Mail, label: "Inbox" },
    { id: "audit", icon: FileText, label: "Audit" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="admin-portal flex flex-col min-h-screen bg-background font-sans text-foreground selection:bg-primary selection:text-white relative">
      
      {/* Industrial Grid Overlay */}
      <div className="industrial-grid fixed inset-0 z-0 opacity-10 pointer-events-none"></div>

      {/* Main App Canvas */}
      <div className="flex-1 flex flex-col w-full relative z-10 overflow-x-hidden">

        {/* Desktop Top Navigation */}
        <div className="hidden lg:block mb-8 md:mb-12">
          <AdminNavigation
            activeSection={activeSection}
            onSectionChange={onSectionChange}
            onLogout={handleLogout}
          />
        </div>

        <AdminHeader 
          userName={`${user?.firstName} ${user?.lastName}`}
          role={user?.role || 'admin'}
        />

        <main className="flex-1 overflow-y-auto relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="w-full relative max-w-[1600px] mx-auto px-4 md:px-12 py-8 md:pt-4 md:pb-12"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile Navigation - matching User Portal */}
        <div className="lg:hidden">
          <MobileNavBar
            sections={adminNavItems.map(item => ({
              id: item.id,
              icon: item.icon,
              name: item.label
            }))}
            currentSection={adminNavItems.findIndex(i => i.id === activeSection)}
            onSectionChange={(index) => onSectionChange(adminNavItems[index].id)}
          />
        </div>
      </div>
    </div>
  );
}
