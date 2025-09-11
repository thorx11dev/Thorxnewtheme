import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import TechnicalLabel from "@/components/ui/technical-label";
import Barcode from "@/components/ui/barcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { 
  LogOut, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar, 
  Clock, 
  ChevronRight,
  ChevronLeft,
  Eye,
  Target,
  Award,
  ArrowUpRight,
  BarChart3,
  PieChart,
  Zap,
  Copy,
  CheckCircle2,
  Wallet,
  Activity,
  Star,
  Gift,
  Play,
  Pause,
  Timer,
  PlayCircle,
  PauseCircle,
  StopCircle,
  Filter,
  Flame,
  HelpCircle,
  MessageCircle,
  Book,
  Phone,
  Mail,
  CreditCard,
  History,
  Download,
  Home,
  Briefcase,
  UserCheck,
  HandHeart,
  LifeBuoy
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

// Interfaces
interface Earning {
  id: string;
  type: string;
  amount: string;
  description: string;
  status: string;
  createdAt: string;
}

interface ReferralUser {
  id: string;
  referrerId: string;
  referredId: string;
  status: string;
  totalEarned: string;
  createdAt: string;
  referred: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    createdAt: string;
  };
}

interface AdItem {
  id: string;
  title: string;
  type: "video" | "banner" | "interactive";
  duration: number;
  reward: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  thumbnail?: string;
}

// Sample data
const availableAds: AdItem[] = [
  {
    id: "ad_001",
    title: "CRYPTO TRADING PLATFORM",
    type: "video",
    duration: 30,
    reward: "2.50",
    description: "Watch this crypto trading platform advertisement",
    difficulty: "easy",
    category: "Finance",
  },
  {
    id: "ad_002", 
    title: "MOBILE GAME DOWNLOAD",
    type: "video",
    duration: 15,
    reward: "1.25",
    description: "Download and try this exciting mobile game",
    difficulty: "easy",
    category: "Gaming",
  },
  {
    id: "ad_003",
    title: "E-COMMERCE DEAL",
    type: "interactive",
    duration: 45,
    reward: "3.75",
    description: "Interactive advertisement for latest e-commerce deals",
    difficulty: "medium",
    category: "Shopping",
  },
  {
    id: "ad_004",
    title: "FITNESS APP PROMOTION",
    type: "video",
    duration: 20,
    reward: "1.75",
    description: "Learn about this revolutionary fitness application",
    difficulty: "easy",
    category: "Health",
  },
];

const sections = [
  { id: "dashboard", name: "Dashboard", icon: Home },
  { id: "work", name: "Work", icon: Briefcase },
  { id: "referrals", name: "Referrals", icon: UserCheck },
  { id: "payout", name: "Payout", icon: CreditCard },
  { id: "help", name: "Help", icon: LifeBuoy },
];

export default function UserPortal() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Current section state
  const [currentSection, setCurrentSection] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Work section states
  const [selectedAd, setSelectedAd] = useState<AdItem | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [watchProgress, setWatchProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedAds, setCompletedAds] = useState<Set<string>>(new Set());

  // Fetch user data
  const { data: earningsData } = useQuery({
    queryKey: ["earnings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/earnings?limit=10");
      return await response.json() as { earnings: Earning[]; total: string };
    },
    enabled: !!user,
  });

  const { data: referralsData } = useQuery({
    queryKey: ["referrals"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/referrals");
      return await response.json() as { 
        referrals: ReferralUser[]; 
        stats: { count: number; totalEarned: string } 
      };
    },
    enabled: !!user,
  });

  const { data: todayAdViews } = useQuery({
    queryKey: ["ad-views", "today"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/ad-views/today");
      return await response.json() as { count: number };
    },
    enabled: !!user,
  });

  // Record ad view mutation
  const recordAdViewMutation = useMutation({
    mutationFn: async (data: {
      adId: string;
      adType: string;
      duration: number;
      completed: boolean;
      earnedAmount: string;
    }) => {
      const response = await apiRequest("POST", "/api/ad-view", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-views"] });
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });

  // Navigation handlers
  const navigateToSection = useCallback((index: number) => {
    if (index >= 0 && index < sections.length && index !== currentSection) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSection(index);
        setIsTransitioning(false);
      }, 150);
    }
  }, [currentSection]);

  const nextSection = useCallback(() => {
    navigateToSection((currentSection + 1) % sections.length);
  }, [currentSection, navigateToSection]);

  const prevSection = useCallback(() => {
    navigateToSection((currentSection - 1 + sections.length) % sections.length);
  }, [currentSection, navigateToSection]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          prevSection();
          break;
        case "ArrowRight":
          e.preventDefault();
          nextSection();
          break;
        case "Escape":
          e.preventDefault();
          setLocation("/");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSection, prevSection, setLocation]);

  // Touch/swipe support
  useEffect(() => {
    let startX = 0;
    let endX = 0;
    let startY = 0;
    let endY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      endX = e.touches[0].clientX;
      endY = e.touches[0].clientY;
    };

    const handleTouchEnd = () => {
      const deltaX = startX - endX;
      const deltaY = Math.abs(startY - endY);
      
      // Only trigger if horizontal swipe is longer than vertical
      if (Math.abs(deltaX) > deltaY && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          nextSection();
        } else {
          prevSection();
        }
      }
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [nextSection, prevSection]);

  // Ad watching timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isWatching && selectedAd && watchProgress < 100) {
      interval = setInterval(() => {
        setWatchProgress(prev => {
          const newProgress = prev + (100 / selectedAd.duration);
          if (newProgress >= 100) {
            setIsWatching(false);
            setIsCompleted(true);
            
            recordAdViewMutation.mutate({
              adId: selectedAd.id,
              adType: selectedAd.type,
              duration: selectedAd.duration,
              completed: true,
              earnedAmount: selectedAd.reward,
            });
            
            setCompletedAds(prev => new Set(Array.from(prev).concat(selectedAd.id)));
            
            toast({
              title: "Ad Completed! 🎉",
              description: `You earned ${formatCurrency(selectedAd.reward)}`,
              variant: "default",
            });
            
            return 100;
          }
          return newProgress;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWatching, selectedAd, watchProgress, recordAdViewMutation, toast]);

  if (!user) {
    return null; // ProtectedRoute will handle redirect
  }

  // Utility functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: string) => {
    return `PKR ${parseFloat(amount).toFixed(2)}`;
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(user.referralCode);
    toast({
      title: "Copied!",
      description: "Referral code copied to clipboard",
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAdTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return '🎥';
      case 'banner': return '📰';
      case 'interactive': return '🎮';
      default: return '📺';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-700 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const startWatching = (ad: AdItem) => {
    setSelectedAd(ad);
    setWatchProgress(0);
    setIsCompleted(false);
    setIsWatching(true);
  };

  // Enhanced mock data for charts
  const earningsChartData = [
    { date: 'Mon', earnings: 5.25, ads: 8, tasks: 2 },
    { date: 'Tue', earnings: 3.75, ads: 6, tasks: 1 },
    { date: 'Wed', earnings: 8.50, ads: 12, tasks: 3 },
    { date: 'Thu', earnings: 6.25, ads: 10, tasks: 2 },
    { date: 'Fri', earnings: 12.75, ads: 18, tasks: 4 },
    { date: 'Sat', earnings: 15.50, ads: 22, tasks: 5 },
    { date: 'Sun', earnings: 9.25, ads: 14, tasks: 3 }
  ];

  const earningTypesData = [
    { name: 'Ad Views', value: 65, color: '#ff6b35' },
    { name: 'Referrals', value: 25, color: '#000000' },
    { name: 'Daily Tasks', value: 7, color: '#f7931e' },
    { name: 'Bonuses', value: 3, color: '#004CFF' }
  ];

  const dailyGoal = 50;
  const currentProgress = parseFloat(user.totalEarnings);
  const progressPercentage = Math.min((currentProgress / dailyGoal) * 100, 100);
  const dailyLimit = 50;
  const remainingAds = dailyLimit - (todayAdViews?.count || 0);

  return (
    <div className="min-h-screen bg-background relative">
      {/* Industrial Grid Overlay */}
      <div className="industrial-grid fixed inset-0 z-0" />
      
      {/* Navigation Header */}
      <nav className="fixed top-0 w-full z-50 bg-background border-b-2 border-black" data-testid="portal-navigation">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <div className="flex items-center">
              <div className="bg-black text-white px-4 py-2 border-2 border-black">
                <TechnicalLabel text="THORX" className="text-white text-lg font-black" />
              </div>
            </div>

            {/* Desktop Tab Navigation */}
            <nav className="hidden md:flex items-center space-x-1" role="navigation" aria-label="Primary navigation">
              {sections.map((section, index) => {
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

            {/* Mobile Section Indicator (simple dots for reference) */}
            <div className="flex md:hidden items-center space-x-2" aria-hidden="true">
              {sections.map((section, index) => (
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
                <TechnicalLabel text={user?.firstName || "USER"} className="text-foreground" />
              </div>
              <Button
                onClick={logout}
                variant="outline"
                size="sm"
                className="border-2 border-black text-foreground hover:bg-black hover:text-white"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Desktop Navigation Controls */}
      <div className="hidden md:block fixed left-4 top-1/2 transform -translate-y-1/2 z-40">
        <Button
          onClick={prevSection}
          variant="outline"
          size="lg"
          className="bg-background border-2 border-black text-foreground hover:bg-black hover:text-white"
          data-testid="button-prev-section"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
      </div>

      <div className="hidden md:block fixed right-4 top-1/2 transform -translate-y-1/2 z-40">
        <Button
          onClick={nextSection}
          variant="outline"
          size="lg"
          className="bg-background border-2 border-black text-foreground hover:bg-black hover:text-white"
          data-testid="button-next-section"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t-2 border-black" role="navigation" aria-label="Mobile navigation">
        <div className="flex" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => navigateToSection(index)}
                className={`flex-1 flex flex-col items-center justify-center py-3 px-2 min-h-[60px] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  currentSection === index
                    ? 'bg-primary text-black'
                    : 'bg-background text-foreground'
                } border-r-2 border-black last:border-r-0`}
                data-testid={`mobile-tab-${section.id}`}
                aria-label={`Go to ${section.name}`}
                aria-current={currentSection === index ? 'page' : undefined}
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

      {/* Section Content */}
      <div className="pt-20 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8">
        {sections.map((section, index) => (
          <section
            key={section.id}
            className={`cinematic-section ${currentSection === index ? 'active' : ''} ${
              isTransitioning ? 'transitioning' : ''
            }`}
            data-testid={`section-${section.id}`}
          >
            {/* Section Content */}
            {index === 0 && renderDashboardSection()}
            {index === 1 && renderWorkSection()}
            {index === 2 && renderReferralsSection()}
            {index === 3 && renderPayoutSection()}
            {index === 4 && renderHelpSection()}
          </section>
        ))}
      </div>
    </div>
  );

  // Dashboard Section
  function renderDashboardSection() {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="mb-2">
            <TechnicalLabel text="EARNING DASHBOARD" className="text-foreground" />
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-black text-foreground mb-4 tracking-tighter">
            WELCOME BACK,<br />
            <span className="text-primary">{user?.firstName || "USER"}</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Track your earnings, manage referrals, and monitor your progress in real-time
          </p>
          <Barcode className="w-32 md:w-48 h-8 md:h-10 mx-auto" />
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {/* Total Earnings */}
          <div className="split-card bg-black text-white border-2 border-black p-6 text-center">
            <Wallet className="w-12 h-12 mx-auto mb-4 text-white" />
            <TechnicalLabel text="TOTAL EARNINGS" className="text-white mb-2" />
            <p className="text-3xl font-black text-white">{formatCurrency(user?.totalEarnings || '0.00')}</p>
            <TechnicalLabel text="+15.2% THIS WEEK" className="text-white" />
          </div>

          {/* Available Balance */}
          <div className="split-card bg-primary text-black border-2 border-black p-6 text-center">
            <DollarSign className="w-12 h-12 mx-auto mb-4 text-black" />
            <TechnicalLabel text="AVAILABLE BALANCE" className="text-black mb-2" />
            <p className="text-3xl font-black text-black">{formatCurrency(user?.availableBalance || '0.00')}</p>
            <TechnicalLabel text="READY FOR WITHDRAWAL" className="text-black" />
          </div>

          {/* Active Referrals */}
          <div className="split-card bg-muted border-2 border-black p-6 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-foreground" />
            <TechnicalLabel text="ACTIVE REFERRALS" className="text-foreground mb-2" />
            <p className="text-3xl font-black text-foreground">{referralsData?.stats.count || 0}</p>
            <TechnicalLabel text={`+${formatCurrency(referralsData?.stats.totalEarned || '0.00')} EARNED`} className="text-foreground" />
          </div>

          {/* Daily Progress */}
          <div className="split-card bg-card border-2 border-black p-6 text-center">
            <Target className="w-12 h-12 mx-auto mb-4 text-foreground" />
            <TechnicalLabel text="DAILY GOAL" className="text-foreground mb-2" />
            <p className="text-3xl font-black text-primary">{Math.round(progressPercentage)}%</p>
            <Progress value={progressPercentage} className="h-3 my-4" />
            <TechnicalLabel text={`${formatCurrency(currentProgress.toString())} / ${formatCurrency(dailyGoal.toString())}`} className="text-foreground" />
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Weekly Earnings Chart */}
          <Card className="split-card bg-card border-2 border-black">
            <CardHeader className="border-b-2 border-black">
              <CardTitle className="flex items-center justify-between">
                <TechnicalLabel text="WEEKLY EARNINGS" className="text-foreground" />
                <div className="p-2 bg-black border border-black">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={earningsChartData}>
                  <defs>
                    <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff6b35" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ff6b35" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                  <XAxis dataKey="date" stroke="#333" />
                  <YAxis stroke="#333" />
                  <Tooltip 
                    formatter={(value) => [`PKR ${value}`, 'Earnings']}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '2px solid #000',
                      borderRadius: '0',
                      color: '#000'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="earnings" 
                    stroke="#ff6b35" 
                    strokeWidth={3}
                    fill="url(#earningsGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Earnings Breakdown */}
          <Card className="split-card bg-card border-2 border-black">
            <CardHeader className="border-b-2 border-black">
              <CardTitle className="flex items-center justify-between">
                <TechnicalLabel text="EARNINGS BREAKDOWN" className="text-foreground" />
                <div className="p-2 bg-black border border-black">
                  <PieChart className="w-5 h-5 text-white" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={earningTypesData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {earningTypesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '2px solid #000',
                      borderRadius: '0',
                      color: '#000'
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Work Section
  function renderWorkSection() {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="mb-2">
            <TechnicalLabel text="WORK CENTER" className="text-foreground" />
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-black text-foreground mb-4 tracking-tighter">
            START <span className="text-primary">EARNING</span><br />
            WATCH & EARN REWARDS
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Watch advertisements, complete tasks, and earn real money daily
          </p>
          <Barcode className="w-32 md:w-48 h-8 md:h-10 mx-auto" />
        </div>

        {/* Progress Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          <div className="split-card bg-card border-2 border-black p-6 text-center">
            <Eye className="w-12 h-12 mx-auto mb-4 text-foreground" />
            <div className="text-2xl font-black text-foreground">{todayAdViews?.count || 0}</div>
            <TechnicalLabel text="ADS WATCHED" className="text-foreground" />
          </div>

          <div className="split-card bg-primary text-black border-2 border-black p-6 text-center">
            <Target className="w-12 h-12 mx-auto mb-4 text-black" />
            <div className="text-2xl font-black text-black">{remainingAds}</div>
            <TechnicalLabel text="REMAINING" className="text-black" />
          </div>

          <div className="split-card bg-muted border-2 border-black p-6 text-center">
            <DollarSign className="w-12 h-12 mx-auto mb-4 text-foreground" />
            <div className="text-2xl font-black text-foreground">{formatCurrency((completedAds.size * 2.5).toString())}</div>
            <TechnicalLabel text="TODAY'S EARNINGS" className="text-foreground" />
          </div>

          <div className="split-card bg-black text-white border-2 border-black p-6 text-center">
            <Award className="w-12 h-12 mx-auto mb-4 text-white" />
            <div className="text-2xl font-black text-white">{Math.round((completedAds.size / dailyLimit) * 100)}%</div>
            <TechnicalLabel text="DAILY GOAL" className="text-white" />
          </div>
        </div>

        {/* Ad Player Section */}
        {selectedAd && (
          <div className="mb-12">
            <Card className="split-card bg-card border-2 border-black" data-testid="ad-player">
              <CardHeader className="border-b-2 border-black">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl text-foreground">{getAdTypeIcon(selectedAd.type)}</div>
                    <div>
                      <h3 className="text-xl font-black text-primary">{selectedAd.title}</h3>
                      <TechnicalLabel text={`${selectedAd.category} • ${formatTime(selectedAd.duration)}`} className="text-muted-foreground" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-primary">{formatCurrency(selectedAd.reward)}</div>
                    <div className={`inline-block px-3 py-1 border-2 border-black text-xs font-semibold ${getDifficultyColor(selectedAd.difficulty)}`}>
                      {selectedAd.difficulty.toUpperCase()}
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {/* Ad Display Area */}
                <div className="bg-muted border-2 border-black p-12 mb-8 text-center min-h-[300px] flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
                  <div className="space-y-6 relative z-10">
                    <div className="text-8xl animate-bounce">{getAdTypeIcon(selectedAd.type)}</div>
                    <h3 className="text-4xl font-black text-primary">{selectedAd.title}</h3>
                    <TechnicalLabel text={selectedAd.description} className="text-muted-foreground text-lg max-w-lg" />
                    {isCompleted && (
                      <div className="flex items-center justify-center gap-3 text-primary animate-pulse">
                        <CheckCircle2 className="w-12 h-12" />
                        <span className="text-3xl font-black">COMPLETED!</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Section */}
                <div className="space-y-6 mb-8">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Timer className="w-5 h-5 text-primary" />
                      <TechnicalLabel text="PROGRESS" className="text-white text-lg" />
                    </div>
                    <span className="text-2xl font-black text-primary">{Math.round(watchProgress)}%</span>
                  </div>
                  <Progress value={watchProgress} className="h-4 bg-gray-700" />
                  <div className="flex justify-between">
                    <TechnicalLabel text={`ELAPSED: ${formatTime(Math.round((watchProgress / 100) * selectedAd.duration))}`} className="text-muted-foreground" />
                    <TechnicalLabel text={`DURATION: ${formatTime(selectedAd.duration)}`} className="text-muted-foreground" />
                  </div>
                </div>

                {/* Enhanced Controls */}
                <div className="flex items-center justify-center gap-6">
                  {!isCompleted ? (
                    <>
                      {!isWatching ? (
                        <Button
                          onClick={() => setIsWatching(true)}
                          size="lg"
                          className="bg-primary hover:bg-primary/90 text-black px-8 py-4 text-lg font-black border-2 border-primary"
                          data-testid="button-play-ad"
                        >
                          <PlayCircle className="w-6 h-6 mr-3" />
                          {watchProgress > 0 ? "RESUME" : "START WATCHING"}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setIsWatching(false)}
                          size="lg"
                          className="bg-yellow-600 hover:bg-yellow-700 text-white px-8 py-4 text-lg font-black border-2 border-yellow-600"
                          data-testid="button-pause-ad"
                        >
                          <PauseCircle className="w-6 h-6 mr-3" />
                          PAUSE
                        </Button>
                      )}
                      <Button
                        onClick={() => {
                          setIsWatching(false);
                          setSelectedAd(null);
                          setWatchProgress(0);
                          setIsCompleted(false);
                        }}
                        variant="outline"
                        size="lg"
                        className="border-2 border-white text-white hover:bg-white hover:text-black px-8 py-4 text-lg font-black"
                        data-testid="button-stop-ad"
                      >
                        <StopCircle className="w-6 h-6 mr-3" />
                        STOP
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => {
                        setIsWatching(false);
                        setSelectedAd(null);
                        setWatchProgress(0);
                        setIsCompleted(false);
                      }}
                      size="lg"
                      className="bg-primary hover:bg-primary/90 text-black px-12 py-4 text-lg font-black border-2 border-primary"
                      data-testid="button-close-ad"
                    >
                      <CheckCircle2 className="w-6 h-6 mr-3" />
                      CONTINUE EARNING
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Available Ads */}
        {remainingAds > 0 ? (
          <div className="space-y-8">
            <div className="text-center">
              <TechnicalLabel text="AVAILABLE ADS" className="text-primary text-2xl" />
            </div>
            
            {/* Ads Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableAds.map((ad) => {
                const isCompleted = completedAds.has(ad.id);
                const isCurrent = selectedAd?.id === ad.id;

                return (
                  <Card key={ad.id} className={`border-2 border-primary bg-black text-white hover:shadow-xl transition-all duration-300 overflow-hidden ${isCurrent ? 'ring-2 ring-primary' : ''}`} data-testid={`ad-card-${ad.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{getAdTypeIcon(ad.type)}</div>
                          <div>
                            <h3 className="font-black text-white line-clamp-1">{ad.title}</h3>
                            <TechnicalLabel text={ad.category} className="text-muted-foreground" />
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-black text-primary">{formatCurrency(ad.reward)}</div>
                          <div className={`inline-block px-2 py-1 text-xs font-semibold border ${getDifficultyColor(ad.difficulty)}`}>
                            {ad.difficulty}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        <TechnicalLabel text={ad.description} className="text-gray-300 text-sm" />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <TechnicalLabel text={formatTime(ad.duration)} className="text-muted-foreground" />
                          </div>
                        </div>
                        <Button
                          onClick={() => startWatching(ad)}
                          disabled={Boolean(isCompleted || (selectedAd && !isCompleted))}
                          className={`w-full transition-all duration-200 ${
                            isCompleted 
                              ? 'bg-green-600 text-white cursor-not-allowed'
                              : isCurrent
                              ? 'bg-primary text-black'
                              : 'bg-primary hover:bg-primary/90 text-black border-2 border-primary'
                          }`}
                          data-testid={`button-watch-${ad.id}`}
                        >
                          {isCompleted ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              COMPLETED
                            </>
                          ) : isCurrent ? (
                            <>
                              <PlayCircle className="w-4 h-4 mr-2" />
                              CURRENTLY WATCHING
                            </>
                          ) : (
                            <>
                              <PlayCircle className="w-4 h-4 mr-2" />
                              WATCH NOW
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <Card className="border-2 border-primary bg-black text-white text-center p-12">
            <div className="space-y-4">
              <Clock className="w-16 h-16 mx-auto text-primary" />
              <TechnicalLabel text="DAILY LIMIT REACHED" className="text-primary text-2xl" />
              <TechnicalLabel text="Come back tomorrow for more earning opportunities!" className="text-muted-foreground" />
            </div>
          </Card>
        )}
      </div>
    );
  }

  // Referrals Section
  function renderReferralsSection() {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="mb-2">
            <TechnicalLabel text="REFERRAL SYSTEM" className="text-foreground" />
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-black text-foreground mb-4 tracking-tighter">
            BUILD YOUR <span className="text-primary">NETWORK</span><br />
            EARN MORE TOGETHER
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Invite friends, earn together, and build a passive income stream through referrals
          </p>
          <Barcode className="w-32 md:w-48 h-8 md:h-10 mx-auto" />
        </div>

        {/* Referral Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="split-card bg-primary text-black border-2 border-black p-6 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-white" />
            <div className="text-3xl font-black mb-2 text-white">{referralsData?.stats.count || 0}</div>
            <TechnicalLabel text="TOTAL REFERRALS" className="text-white" />
          </div>

          <div className="split-card bg-black text-white border-2 border-black p-6 text-center">
            <DollarSign className="w-12 h-12 mx-auto mb-4 text-white" />
            <div className="text-3xl font-black mb-2 text-white">{formatCurrency(referralsData?.stats.totalEarned || '0.00')}</div>
            <TechnicalLabel text="REFERRAL EARNINGS" className="text-white" />
          </div>

          <div className="split-card bg-muted border-2 border-black p-6 text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-foreground" />
            <div className="text-3xl font-black mb-2 text-foreground">25%</div>
            <TechnicalLabel text="COMMISSION RATE" className="text-foreground" />
          </div>
        </div>

        {/* Referral Code Card */}
        <Card className="border-2 border-primary bg-black text-white mb-12 overflow-hidden">
          <CardHeader className="text-center">
            <TechnicalLabel text="YOUR REFERRAL CODE" className="text-primary text-xl" />
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="bg-primary text-black px-8 py-6 text-4xl font-black tracking-widest inline-block border-2 border-primary">
              {user?.referralCode}
            </div>
            <div className="space-y-4">
              <Button
                onClick={copyReferralCode}
                className="bg-primary hover:bg-primary/90 text-black px-8 py-3 text-lg font-black border-2 border-primary"
                data-testid="button-copy-referral"
              >
                <Copy className="w-5 h-5 mr-3" />
                COPY CODE
              </Button>
              <TechnicalLabel text="Share this code with friends to earn 25% of their earnings forever!" className="text-gray-300 max-w-lg mx-auto" />
            </div>
          </CardContent>
        </Card>

        {/* Referrals List */}
        <div className="space-y-8">
          <div className="text-center">
            <TechnicalLabel text="YOUR REFERRALS" className="text-primary text-2xl" />
          </div>
          
          {referralsData?.referrals && referralsData.referrals.length > 0 ? (
            <div className="grid gap-6">
              {referralsData.referrals.map((referral, index) => (
                <Card key={referral.id} className="border-2 border-primary bg-black text-white overflow-hidden" data-testid={`referral-${referral.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/60 text-black font-black text-2xl flex items-center justify-center border-2 border-primary">
                          {referral.referred.firstName[0]}{referral.referred.lastName[0]}
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-white">
                            {referral.referred.firstName} {referral.referred.lastName}
                          </h3>
                          <TechnicalLabel text={referral.referred.email} className="text-muted-foreground" />
                          <TechnicalLabel text={`Joined: ${formatDate(referral.referred.createdAt)}`} className="text-muted-foreground" />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-primary">
                          +{formatCurrency(referral.totalEarned)}
                        </div>
                        <TechnicalLabel text={`TIER ${index + 1}`} className="text-muted-foreground" />
                        <div className={`inline-block px-3 py-1 text-xs font-semibold border mt-2 ${
                          referral.status === 'active' 
                            ? 'bg-green-900 text-green-400 border-green-600' 
                            : 'bg-gray-900 text-gray-400 border-gray-600'
                        }`}>
                          {referral.status.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-2 border-primary bg-black text-white text-center p-12">
              <div className="space-y-4">
                <HandHeart className="w-16 h-16 mx-auto text-primary" />
                <TechnicalLabel text="NO REFERRALS YET" className="text-primary text-2xl" />
                <TechnicalLabel text="Start sharing your referral code to build your network!" className="text-muted-foreground" />
              </div>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Payout Section
  function renderPayoutSection() {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="mb-2">
            <TechnicalLabel text="PAYOUT CENTER" className="text-foreground" />
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-black text-foreground mb-4 tracking-tighter">
            WITHDRAW YOUR <span className="text-primary">EARNINGS</span><br />
            INSTANT PAYMENTS
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Fast, secure withdrawals to your preferred payment method
          </p>
          <Barcode className="w-32 md:w-48 h-8 md:h-10 mx-auto" />
        </div>

        {/* Balance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="border-2 border-primary bg-primary text-black overflow-hidden">
            <CardContent className="p-6 text-center">
              <Wallet className="w-12 h-12 mx-auto mb-4" />
              <div className="text-3xl font-black mb-2">{formatCurrency(user?.availableBalance || '0.00')}</div>
              <TechnicalLabel text="AVAILABLE BALANCE" className="text-black" />
            </CardContent>
          </Card>

          <Card className="border-2 border-primary bg-black text-white overflow-hidden">
            <CardContent className="p-6 text-center">
              <DollarSign className="w-12 h-12 mx-auto mb-4 text-primary" />
              <div className="text-3xl font-black mb-2 text-primary">{formatCurrency(user?.totalEarnings || '0.00')}</div>
              <TechnicalLabel text="TOTAL EARNED" className="text-muted-foreground" />
            </CardContent>
          </Card>

          <Card className="border-2 border-primary bg-black text-white overflow-hidden">
            <CardContent className="p-6 text-center">
              <Clock className="w-12 h-12 mx-auto mb-4 text-primary" />
              <div className="text-3xl font-black mb-2 text-primary">0</div>
              <TechnicalLabel text="PENDING WITHDRAWALS" className="text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        {/* Withdrawal Form */}
        <Card className="border-2 border-primary bg-black text-white mb-12 overflow-hidden">
          <CardHeader className="text-center">
            <TechnicalLabel text="WITHDRAW FUNDS" className="text-primary text-xl" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <TechnicalLabel text="WITHDRAWAL AMOUNT" className="text-white mb-2" />
                <input 
                  type="number" 
                  placeholder="0.00"
                  className="w-full bg-black border-2 border-primary text-white px-4 py-3 text-lg focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <TechnicalLabel text="PAYMENT METHOD" className="text-white mb-2" />
                <select className="w-full bg-black border-2 border-primary text-white px-4 py-3 text-lg focus:outline-none focus:border-primary">
                  <option value="">SELECT METHOD</option>
                  <option value="jazzcash">JazzCash</option>
                  <option value="easypaisa">EasyPaisa</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>
            </div>
            
            <div>
              <TechnicalLabel text="ACCOUNT DETAILS" className="text-white mb-2" />
              <input 
                type="text" 
                placeholder="Account number or phone number"
                className="w-full bg-black border-2 border-primary text-white px-4 py-3 text-lg focus:outline-none focus:border-primary"
              />
            </div>

            <div className="text-center">
              <Button
                className="bg-primary hover:bg-primary/90 text-black px-12 py-4 text-lg font-black border-2 border-primary"
                data-testid="button-withdraw"
              >
                <Download className="w-5 h-5 mr-3" />
                REQUEST WITHDRAWAL
              </Button>
              <div className="mt-4">
                <TechnicalLabel text="Minimum withdrawal: PKR 100.00" className="text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card className="border-2 border-primary bg-black text-white overflow-hidden">
          <CardHeader className="text-center">
            <TechnicalLabel text="PAYMENT HISTORY" className="text-primary text-xl" />
          </CardHeader>
          <CardContent className="text-center p-12">
            <History className="w-16 h-16 mx-auto mb-4 text-primary" />
            <TechnicalLabel text="NO WITHDRAWALS YET" className="text-primary text-2xl" />
            <TechnicalLabel text="Your withdrawal history will appear here" className="text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Help Section
  function renderHelpSection() {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 border border-primary mb-4">
            <LifeBuoy className="w-4 h-4" />
            <TechnicalLabel text="HELP CENTER" className="text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-black text-white mb-4 tracking-tighter">
            GET <span className="text-primary">SUPPORT</span><br />
            24/7 ASSISTANCE
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Find answers, get help, and connect with our support team
          </p>
          <Barcode className="w-48 h-10 mx-auto opacity-60" />
        </div>

        {/* Quick Help Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="border-2 border-primary bg-black text-white hover:bg-primary hover:text-black transition-all duration-300 cursor-pointer overflow-hidden">
            <CardContent className="p-6 text-center">
              <Book className="w-16 h-16 mx-auto mb-4 text-primary" />
              <TechnicalLabel text="USER GUIDE" className="text-primary text-lg mb-2" />
              <TechnicalLabel text="Learn how to maximize your earnings" className="text-muted-foreground" />
            </CardContent>
          </Card>

          <Card className="border-2 border-primary bg-black text-white hover:bg-primary hover:text-black transition-all duration-300 cursor-pointer overflow-hidden">
            <CardContent className="p-6 text-center">
              <HelpCircle className="w-16 h-16 mx-auto mb-4 text-primary" />
              <TechnicalLabel text="FAQ" className="text-primary text-lg mb-2" />
              <TechnicalLabel text="Frequently asked questions" className="text-muted-foreground" />
            </CardContent>
          </Card>

          <Card className="border-2 border-primary bg-black text-white hover:bg-primary hover:text-black transition-all duration-300 cursor-pointer overflow-hidden">
            <CardContent className="p-6 text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-primary" />
              <TechnicalLabel text="LIVE CHAT" className="text-primary text-lg mb-2" />
              <TechnicalLabel text="Chat with support team" className="text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        {/* Contact Information */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card className="border-2 border-primary bg-black text-white overflow-hidden">
            <CardHeader>
              <TechnicalLabel text="CONTACT INFORMATION" className="text-primary text-xl text-center" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Mail className="w-8 h-8 text-primary" />
                <div>
                  <TechnicalLabel text="EMAIL" className="text-primary" />
                  <TechnicalLabel text="support@thorx.com" className="text-white" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Phone className="w-8 h-8 text-primary" />
                <div>
                  <TechnicalLabel text="PHONE" className="text-primary" />
                  <TechnicalLabel text="+92 300 1234567" className="text-white" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Clock className="w-8 h-8 text-primary" />
                <div>
                  <TechnicalLabel text="SUPPORT HOURS" className="text-primary" />
                  <TechnicalLabel text="24/7 AVAILABLE" className="text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary bg-black text-white overflow-hidden">
            <CardHeader>
              <TechnicalLabel text="SEND MESSAGE" className="text-primary text-xl text-center" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <TechnicalLabel text="SUBJECT" className="text-white mb-2" />
                <input 
                  type="text" 
                  placeholder="Message subject"
                  className="w-full bg-black border-2 border-primary text-white px-4 py-3 focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <TechnicalLabel text="MESSAGE" className="text-white mb-2" />
                <textarea 
                  rows={4}
                  placeholder="Your message"
                  className="w-full bg-black border-2 border-primary text-white px-4 py-3 focus:outline-none focus:border-primary"
                ></textarea>
              </div>
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-black py-3 text-lg font-black border-2 border-primary"
                data-testid="button-send-message"
              >
                <MessageCircle className="w-5 h-5 mr-3" />
                SEND MESSAGE
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <Card className="border-2 border-primary bg-black text-white overflow-hidden">
          <CardHeader className="text-center">
            <TechnicalLabel text="FREQUENTLY ASKED QUESTIONS" className="text-primary text-xl" />
          </CardHeader>
          <CardContent className="space-y-6">
            {[
              {
                question: "HOW DO I EARN MONEY?",
                answer: "Watch ads, complete tasks, and refer friends to earn real money daily."
              },
              {
                question: "WHAT IS THE MINIMUM WITHDRAWAL?",
                answer: "The minimum withdrawal amount is PKR 100.00."
              },
              {
                question: "HOW LONG DO WITHDRAWALS TAKE?",
                answer: "Withdrawals are processed within 24 hours on business days."
              },
              {
                question: "HOW MUCH CAN I EARN FROM REFERRALS?",
                answer: "You earn 25% commission from all your referrals' earnings forever."
              }
            ].map((faq, index) => (
              <div key={index} className="border-b border-primary pb-4 last:border-b-0 last:pb-0">
                <TechnicalLabel text={faq.question} className="text-primary text-lg mb-2" />
                <TechnicalLabel text={faq.answer} className="text-muted-foreground" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }
}