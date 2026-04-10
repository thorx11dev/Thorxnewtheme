import React from "react";
import { cn } from "@/lib/utils";
import { 
  Users, 
  CreditCard, 
  Mail, 
  Key, 
  LayoutDashboard,
  FileText,
  Menu,
  LogOut,
  Target,
  Shield,
  Settings
} from "lucide-react";
import TechnicalLabel from "@/components/ui/technical-label";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DesktopNavTabs, TabItem } from "@/components/ui/desktop-nav-tabs";
import { useAuth } from "@/hooks/useAuth";

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
  className?: string;
}

const adminSections = [
  { id: "dashboard", name: "DASHBOARD", icon: LayoutDashboard },
  { id: "leaderboard", name: "LEADERBOARD", icon: Shield },
  { id: "tasks", name: "DAILY TASKS", icon: Target },
  { id: "payouts", name: "PAYOUT QUEUE", icon: CreditCard },
  { id: "users", name: "USER CRM", icon: Users },
  { id: "inbox", name: "INBOX", icon: Mail },
  { id: "audit", name: "AUDIT LOGS", icon: FileText },
  { id: "team", name: "TEAM KEYS", icon: Key },
  { id: "settings", name: "SETTINGS", icon: Settings },
];

export function AdminNavigation({ activeSection, onSectionChange, onLogout, className }: AdminSidebarProps) {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  
  // Filter sections based on permissions
  const filteredSections = adminSections.filter(section => {
    if (!user) return false;
    if (user.role === 'founder' || user.role === 'admin') return true;
    if (user.role === 'team') {
      if (section.id === 'dashboard') return true; // Always show dashboard
      return (user.permissions || []).includes(section.id);
    }
    return false;
  });

  const tabs: TabItem[] = filteredSections.map((section) => ({
    title: section.name,
    icon: section.icon,
    id: section.id,
  }));

  const activeTabIndex = filteredSections.findIndex((s) => s.id === activeSection);

  return (
    <div className={cn("w-full max-w-[1600px] mx-auto px-4 md:px-12 pt-8 pb-4 flex items-center justify-between relative z-20", className)}>
      <div className="flex items-center gap-2">
      </div>

      {/* Main Navigation Pill (Desktop) */}
      <div className="hidden lg:flex items-center">
        <DesktopNavTabs
          tabs={tabs}
          activeTab={activeTabIndex}
          onChange={(index) => {
            if (index !== null && index >= 0 && index < filteredSections.length) {
              onSectionChange(filteredSections[index].id);
            }
          }}
        />
      </div>

      {/* Action Area & Mobile Toggle */}
      <div className="flex items-center gap-3">
        <Button
          onClick={onLogout}
          variant="outline"
          className="border-2 border-black bg-white hover:bg-black hover:text-white transition-colors font-black text-[11px] tracking-widest uppercase h-10 px-6 hidden sm:flex focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          Logout
        </Button>

        {/* Mobile Navigation */}
        <div className="lg:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 border-[1.5px] border-[#111] hover:bg-black/5 rounded-full transition-all text-[#111]">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] border-l-4 border-[#111] bg-white p-0">
              <SheetHeader className="p-6 border-b-[1.5px] border-[#111]/10 text-left">
                <TechnicalLabel text="Navigation" className="mb-2" />
                <SheetTitle className="text-xl font-black uppercase text-[#111]">Secure Terminal</SheetTitle>
              </SheetHeader>
              
              <div className="flex flex-col h-full py-4">
                <div className="flex-1 px-4 space-y-2">
                  {filteredSections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => {
                        onSectionChange(section.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-4 px-6 py-4 font-black text-xs uppercase tracking-widest transition-colors text-left rounded-xl",
                        activeSection === section.id 
                          ? "bg-black text-primary" 
                          : "text-[#111]/60 hover:bg-black/5 hover:text-[#111]"
                      )}
                    >
                      <section.icon size={18} className={activeSection === section.id ? "text-primary" : "text-[#111]/40"} />
                      {section.name}
                    </button>
                  ))}
                </div>
                
                <div className="p-6 border-t-[1.5px] border-[#111]/10">
                  <Button
                    onClick={onLogout}
                    variant="outline"
                    className="w-full border-2 border-black bg-white hover:bg-black hover:text-white transition-colors font-black text-[11px] tracking-widest uppercase h-12 flex items-center justify-center gap-3 rounded-xl shadow-md"
                  >
                    <LogOut size={16} />
                    Terminate Session
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
