import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import TechnicalLabel from "@/components/ui/technical-label";
import Barcode from "@/components/ui/barcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import {
  LogOut,
  Users,
  DollarSign,
  Activity,
  Mail,
  Send,
  Database,
  Key,
  UserCheck,
  Shield,
  Eye,
  EyeOff,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  Filter,
  Search,
  Settings
} from "lucide-react";

// Team Portal Sections
const teamSections = [
  { id: "dashboard", name: "Dashboard", icon: Activity },
  { id: "inbox", name: "Inbox", icon: Mail },
  { id: "data", name: "Data", icon: Database },
  { id: "team-keys", name: "Team Keys", icon: Key },
];

export default function TeamPortal() {
  const { user, logout, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Current section state
  const [currentSection, setCurrentSection] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl font-black mb-2">THORX TEAM</div>
          <div className="text-sm">LOADING...</div>
        </div>
      </div>
    );
  }

  // Navigation function
  const navigateToSection = (sectionIndex: number) => {
    if (sectionIndex === currentSection || isTransitioning) return;
    
    setIsTransitioning(true);
    setCurrentSection(sectionIndex);
    
    // Clear transition state after animation
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  };

  // Team metrics query
  const { data: teamMetrics, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ['/api/team/metrics'],
    enabled: !!user && user.role === 'team',
  });

  // Logout handler
  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      toast({
        title: "Logout Failed",
        description: "There was an error logging you out.",
        variant: "destructive"
      });
    }
  };

  // Render current section
  const renderCurrentSection = () => {
    switch (currentSection) {
      case 0:
        return renderDashboardSection();
      case 1:
        return renderInboxSection();
      case 2:
        return renderDataSection();
      case 3:
        return renderTeamKeysSection();
      default:
        return renderDashboardSection();
    }
  };

  // Dashboard Section
  function renderDashboardSection() {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 border border-primary mb-4">
            <Activity className="w-4 h-4" />
            <TechnicalLabel text="TEAM DASHBOARD" className="text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-black text-white mb-4 tracking-tighter">
            TEAM <span className="text-primary">CONTROL</span><br />
            SYSTEM METRICS
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Monitor team performance and user metrics in real-time
          </p>
          <Barcode className="w-48 h-10 mx-auto opacity-60" />
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="border-2 border-primary bg-black text-white overflow-hidden">
            <CardContent className="p-6 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-primary" />
              {metricsLoading ? (
                <div className="text-3xl font-black mb-2 text-primary animate-pulse">---</div>
              ) : metricsError ? (
                <div className="text-3xl font-black mb-2 text-red-500">ERR</div>
              ) : (
                <div className="text-3xl font-black mb-2 text-primary" data-testid="metric-total-users">
                  {teamMetrics?.totalUsers?.toLocaleString() || '0'}
                </div>
              )}
              <TechnicalLabel text="TOTAL USERS" className="text-muted-foreground" />
            </CardContent>
          </Card>

          <Card className="border-2 border-primary bg-black text-white overflow-hidden">
            <CardContent className="p-6 text-center">
              <UserCheck className="w-12 h-12 mx-auto mb-4 text-primary" />
              {metricsLoading ? (
                <div className="text-3xl font-black mb-2 text-primary animate-pulse">---</div>
              ) : metricsError ? (
                <div className="text-3xl font-black mb-2 text-red-500">ERR</div>
              ) : (
                <div className="text-3xl font-black mb-2 text-primary" data-testid="metric-active-users">
                  {teamMetrics?.activeUsers?.toLocaleString() || '0'}
                </div>
              )}
              <TechnicalLabel text="ACTIVE USERS" className="text-muted-foreground" />
            </CardContent>
          </Card>

          <Card className="border-2 border-primary bg-black text-white overflow-hidden">
            <CardContent className="p-6 text-center">
              <DollarSign className="w-12 h-12 mx-auto mb-4 text-primary" />
              {metricsLoading ? (
                <div className="text-3xl font-black mb-2 text-primary animate-pulse">---</div>
              ) : metricsError ? (
                <div className="text-3xl font-black mb-2 text-red-500">ERR</div>
              ) : (
                <div className="text-3xl font-black mb-2 text-primary" data-testid="metric-total-earnings">
                  ₨{parseFloat(teamMetrics?.totalEarnings || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
              <TechnicalLabel text="TOTAL EARNINGS" className="text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="border-2 border-primary bg-black text-white overflow-hidden">
          <CardHeader className="text-center">
            <TechnicalLabel text="RECENT ACTIVITY" className="text-primary text-xl" />
          </CardHeader>
          <CardContent className="text-center p-12">
            <Activity className="w-16 h-16 mx-auto mb-4 text-primary" />
            <TechnicalLabel text="SYSTEM MONITORING ACTIVE" className="text-primary text-2xl" />
            <TechnicalLabel text="Real-time metrics being tracked" className="text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Inbox Section
  function renderInboxSection() {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 border border-primary mb-4">
            <Mail className="w-4 h-4" />
            <TechnicalLabel text="EMAIL MANAGEMENT" className="text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-black text-white mb-4 tracking-tighter">
            TEAM <span className="text-primary">INBOX</span><br />
            EMAIL CONTROL
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Send emails and manage team communications
          </p>
          <Barcode className="w-48 h-10 mx-auto opacity-60" />
        </div>

        {/* Email Composition */}
        <Card className="border-2 border-primary bg-black text-white mb-8 overflow-hidden">
          <CardHeader className="text-center">
            <TechnicalLabel text="SEND EMAIL" className="text-primary text-xl" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <TechnicalLabel text="RECIPIENT" className="text-white mb-2" />
                <input
                  type="email"
                  placeholder="user@email.com"
                  className="w-full bg-black border-2 border-primary text-white px-4 py-3 text-lg focus:outline-none focus:border-primary"
                  data-testid="input-email-recipient"
                />
              </div>
              <div>
                <TechnicalLabel text="SUBJECT" className="text-white mb-2" />
                <input
                  type="text"
                  placeholder="Email subject"
                  className="w-full bg-black border-2 border-primary text-white px-4 py-3 text-lg focus:outline-none focus:border-primary"
                  data-testid="input-email-subject"
                />
              </div>
            </div>

            <div>
              <TechnicalLabel text="MESSAGE" className="text-white mb-2" />
              <textarea
                rows={6}
                placeholder="Enter your message..."
                className="w-full bg-black border-2 border-primary text-white px-4 py-3 text-lg focus:outline-none focus:border-primary"
                data-testid="textarea-email-message"
              ></textarea>
            </div>

            <div className="text-center">
              <Button
                className="bg-primary hover:bg-primary/90 text-black px-12 py-4 text-lg font-black border-2 border-primary"
                data-testid="button-send-email"
              >
                <Send className="w-5 h-5 mr-3" />
                SEND EMAIL
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Received Messages */}
        <Card className="border-2 border-primary bg-black text-white overflow-hidden">
          <CardHeader className="text-center">
            <TechnicalLabel text="RECEIVED MESSAGES" className="text-primary text-xl" />
          </CardHeader>
          <CardContent className="text-center p-12">
            <Mail className="w-16 h-16 mx-auto mb-4 text-primary" />
            <TechnicalLabel text="NO MESSAGES" className="text-primary text-2xl" />
            <TechnicalLabel text="Received messages will appear here" className="text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Data Section
  function renderDataSection() {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 border border-primary mb-4">
            <Database className="w-4 h-4" />
            <TechnicalLabel text="USER DATA ACCESS" className="text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-black text-white mb-4 tracking-tighter">
            USER <span className="text-primary">DATA</span><br />
            CREDENTIALS VIEW
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Access and manage user credentials and account information
          </p>
          <Barcode className="w-48 h-10 mx-auto opacity-60" />
        </div>

        {/* Search and Filters */}
        <Card className="border-2 border-primary bg-black text-white mb-8 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    className="w-full bg-black border-2 border-primary text-white pl-12 pr-4 py-3 text-lg focus:outline-none focus:border-primary"
                    data-testid="input-search-users"
                  />
                </div>
              </div>
              <Button
                className="bg-primary hover:bg-primary/90 text-black px-6 py-3 text-lg font-black border-2 border-primary"
                data-testid="button-export-data"
              >
                <Download className="w-5 h-5 mr-2" />
                EXPORT
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* User Credentials List */}
        <Card className="border-2 border-primary bg-black text-white overflow-hidden">
          <CardHeader className="text-center">
            <TechnicalLabel text="USER CREDENTIALS" className="text-primary text-xl" />
          </CardHeader>
          <CardContent className="text-center p-12">
            <Shield className="w-16 h-16 mx-auto mb-4 text-primary" />
            <TechnicalLabel text="SECURE DATA AREA" className="text-primary text-2xl" />
            <TechnicalLabel text="User credentials will be displayed here" className="text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Team Keys Section
  function renderTeamKeysSection() {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 border border-primary mb-4">
            <Key className="w-4 h-4" />
            <TechnicalLabel text="ACCESS MANAGEMENT" className="text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-black text-white mb-4 tracking-tighter">
            TEAM <span className="text-primary">KEYS</span><br />
            MEMBER ACCESS
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Manage team member access keys and permissions
          </p>
          <Barcode className="w-48 h-10 mx-auto opacity-60" />
        </div>

        {/* Add New Member */}
        <Card className="border-2 border-primary bg-black text-white mb-8 overflow-hidden">
          <CardHeader className="text-center">
            <TechnicalLabel text="ADD TEAM MEMBER" className="text-primary text-xl" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <TechnicalLabel text="MEMBER NAME" className="text-white mb-2" />
                <input
                  type="text"
                  placeholder="Team member name"
                  className="w-full bg-black border-2 border-primary text-white px-4 py-3 text-lg focus:outline-none focus:border-primary"
                  data-testid="input-member-name"
                />
              </div>
              <div>
                <TechnicalLabel text="ACCESS LEVEL" className="text-white mb-2" />
                <select className="w-full bg-black border-2 border-primary text-white px-4 py-3 text-lg focus:outline-none focus:border-primary">
                  <option value="">SELECT LEVEL</option>
                  <option value="admin">ADMIN</option>
                  <option value="moderator">MODERATOR</option>
                  <option value="viewer">VIEWER</option>
                </select>
              </div>
            </div>

            <div>
              <TechnicalLabel text="INITIAL PASSWORD" className="text-white mb-2" />
              <input
                type="password"
                placeholder="Set initial password"
                className="w-full bg-black border-2 border-primary text-white px-4 py-3 text-lg focus:outline-none focus:border-primary"
                data-testid="input-member-password"
              />
            </div>

            <div className="text-center">
              <Button
                className="bg-primary hover:bg-primary/90 text-black px-12 py-4 text-lg font-black border-2 border-primary"
                data-testid="button-add-member"
              >
                <Plus className="w-5 h-5 mr-3" />
                ADD MEMBER
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Team Members List */}
        <Card className="border-2 border-primary bg-black text-white overflow-hidden">
          <CardHeader className="text-center">
            <TechnicalLabel text="TEAM MEMBERS" className="text-primary text-xl" />
          </CardHeader>
          <CardContent className="text-center p-12">
            <Key className="w-16 h-16 mx-auto mb-4 text-primary" />
            <TechnicalLabel text="NO TEAM MEMBERS" className="text-primary text-2xl" />
            <TechnicalLabel text="Team member access keys will appear here" className="text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="team-portal">
      {/* Industrial Grid Overlay */}
      <div className="industrial-grid" />

      {/* Navigation Header */}
      <nav className="fixed top-0 w-full z-50 bg-background border-b-2 border-black" data-testid="team-portal-navigation">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <div className="flex items-center">
              <div className="bg-black text-white px-4 py-2 border-2 border-black">
                <TechnicalLabel text="THORX TEAM" className="text-white text-lg font-black" />
              </div>
            </div>

            {/* Desktop Tab Navigation */}
            <nav className="hidden md:flex items-center space-x-1" role="navigation" aria-label="Primary navigation">
              {teamSections.map((section, index) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => navigateToSection(index)}
                    className={`flex items-center space-x-2 px-4 py-2 border-2 border-black transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      currentSection === index
                        ? 'bg-primary text-black font-black'
                        : 'bg-background text-foreground hover:bg-primary hover:text-black'
                    }`}
                    data-testid={`nav-tab-${section.id}`}
                    aria-label={`Go to ${section.name}`}
                    aria-current={currentSection === index ? 'page' : undefined}
                  >
                    <Icon className="w-4 h-4" />
                    <TechnicalLabel text={section.name.toUpperCase()} className="text-sm" />
                  </button>
                );
              })}
            </nav>

            {/* Mobile Section Indicator */}
            <div className="flex md:hidden items-center space-x-2" aria-hidden="true">
              {teamSections.map((section, index) => (
                <div
                  key={section.id}
                  className={`w-2 h-2 border border-black transition-all duration-300 ${
                    currentSection === index
                      ? 'bg-primary'
                      : 'bg-transparent'
                  }`}
                  data-testid={`nav-indicator-${section.id}`}
                />
              ))}
            </div>

            {/* User Controls */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center text-foreground">
                <TechnicalLabel text={user?.firstName || "TEAM"} className="text-lg font-black" />
                <TechnicalLabel text="MEMBER" className="text-xs ml-2" />
              </div>

              <Button
                onClick={handleLogout}
                className="bg-black hover:bg-primary text-white hover:text-black px-4 py-2 border-2 border-black transition-colors"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline ml-2">
                  <TechnicalLabel text="LOGOUT" className="text-sm" />
                </span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t-2 border-black md:hidden z-40" data-testid="team-mobile-navigation">
        <div className="flex justify-around">
          {teamSections.map((section, index) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => navigateToSection(index)}
                className={`flex flex-col items-center justify-center py-3 px-4 transition-all duration-300 ${
                  currentSection === index
                    ? 'text-primary bg-primary/10'
                    : 'text-foreground hover:text-primary'
                }`}
                data-testid={`mobile-nav-${section.id}`}
              >
                <Icon className="w-5 h-5 mb-1" />
                <TechnicalLabel
                  text={section.name.toUpperCase()}
                  className="text-sm leading-none text-center"
                />
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className={`min-h-screen pt-16 md:pt-20 ${isMobile ? 'pb-20' : ''} ${isTransitioning ? 'opacity-75' : 'opacity-100'} transition-opacity duration-300`}>
        {renderCurrentSection()}
      </main>
    </div>
  );
}