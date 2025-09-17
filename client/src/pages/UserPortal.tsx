
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
import EnhancedVideoPlayer from "@/components/ui/enhanced-video-player";
import IndustrialTabs, { WORK_TABS } from "@/components/ui/industrial-tabs";
import MetricsCards from "@/components/ui/metrics-cards";
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
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  Phone,
  Mail,
  CreditCard,
  History,
  Download,
  Home,
  Briefcase,
  UserCheck,
  HandHeart,
  LifeBuoy,
  Crown,
  Trophy,
  Medal,
  Zap as ZapIcon,
  TrendingDown,
  RefreshCw,
  Share2,
  Link2,
  ExternalLink
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
  const { user, logout, isLoading } = useAuth();
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

  // Enhanced work section states
  const [activeWorkTab, setActiveWorkTab] = useState<string>("ads");
  const [completedVideos, setCompletedVideos] = useState<Set<string>>(new Set());
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

  // Enhanced work section configuration complete

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

  // If no user data and not loading, show default guest user
  const displayUser = user || {
    id: "guest",
    firstName: "Guest",
    lastName: "User",
    email: "guest@thorx.com",
    identity: "GUEST_USER",
    phone: "+92 300 0000000",
    referralCode: "GUEST-CODE",
    totalEarnings: "0.00",
    availableBalance: "0.00",
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  // Utility functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `PKR ${numAmount.toFixed(2)}`;
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(displayUser?.referralCode || 'GUEST-CODE');
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
      case 'easy': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'hard': return 'bg-rose-100 text-rose-800 border-rose-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getDifficultyColorDark = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-emerald-900/30 text-emerald-300 border-emerald-600';
      case 'medium': return 'bg-amber-900/30 text-amber-300 border-amber-600';
      case 'hard': return 'bg-rose-900/30 text-rose-300 border-rose-600';
      default: return 'bg-slate-800 text-slate-300 border-slate-600';
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
    { name: 'Ad Views', value: 65, color: 'hsl(var(--primary))' },
    { name: 'Referrals', value: 25, color: 'hsl(var(--secondary))' },
    { name: 'Daily Tasks', value: 7, color: 'hsl(var(--chart-3))' },
    { name: 'Bonuses', value: 3, color: 'hsl(var(--chart-4))' }
  ];

  const dailyGoal = 50;
  const currentProgress = parseFloat(displayUser?.totalEarnings || '0.00');
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
                <TechnicalLabel text={displayUser?.firstName || "USER"} className="text-foreground" />
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
        <div className="text-center mb-8">
          <div className="mb-3">
            <TechnicalLabel text="EARNING DASHBOARD" className="text-muted-foreground" />
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-foreground mb-4 tracking-tighter leading-tight">
            WELCOME BACK,<br />
            <span className="text-primary">{displayUser?.firstName || "GUEST"}</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground mb-6 max-w-xl mx-auto leading-relaxed">
            Track your earnings, manage referrals, and monitor your progress in real-time
          </p>
          <Barcode className="w-20 md:w-24 h-4 md:h-5 mx-auto opacity-60" />
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
          {/* Total Earnings */}
          <div className="group split-card bg-gradient-to-br from-card to-card/80 hover:from-primary/5 hover:to-primary/10 border-2 border-muted-foreground/20 hover:border-primary/30 p-6 text-left transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-primary/10" data-testid="card-total-earnings">
            <div className="flex items-start justify-between mb-3">
              <Wallet className="w-8 h-8 text-primary group-hover:text-primary/80 transition-colors" />
              <TechnicalLabel text="TOTAL EARNINGS" className="text-muted-foreground text-xs" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-foreground mb-2 group-hover:text-primary/90 transition-colors" data-testid="text-total-earnings">{formatCurrency(displayUser?.totalEarnings || '0.00')}</p>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <TechnicalLabel text="+15.2% THIS WEEK" className="text-green-500 text-xs" />
            </div>
          </div>

          {/* Available Balance */}
          <div className="group split-card bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border-2 border-primary/20 hover:border-primary/40 p-6 text-left transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-primary/20" data-testid="card-available-balance">
            <div className="flex items-start justify-between mb-3">
              <DollarSign className="w-8 h-8 text-primary group-hover:text-primary/80 transition-colors" />
              <TechnicalLabel text="AVAILABLE BALANCE" className="text-muted-foreground text-xs" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-primary mb-2 group-hover:text-primary/90 transition-colors" data-testid="text-available-balance">{formatCurrency(displayUser?.availableBalance || '0.00')}</p>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-primary" />
              <TechnicalLabel text="READY FOR WITHDRAWAL" className="text-primary/70 text-xs" />
            </div>
          </div>

          {/* Active Referrals */}
          <div className="group split-card bg-gradient-to-br from-muted to-muted/60 hover:from-muted/80 hover:to-muted/40 border-2 border-muted-foreground/20 hover:border-muted-foreground/40 p-6 text-left transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-muted-foreground/10" data-testid="card-active-referrals">
            <div className="flex items-start justify-between mb-3">
              <Users className="w-8 h-8 text-foreground/80 group-hover:text-foreground transition-colors" />
              <TechnicalLabel text="ACTIVE REFERRALS" className="text-muted-foreground text-xs" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-foreground mb-2 group-hover:text-foreground/90 transition-colors" data-testid="text-referrals-count">{referralsData?.stats.count || 0}</p>
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
              <TechnicalLabel text={`+${formatCurrency(referralsData?.stats.totalEarned || '0.00')} EARNED`} className="text-muted-foreground text-xs" />
            </div>
          </div>

          {/* Daily Progress */}
          <div className="group split-card bg-gradient-to-br from-card to-card/80 hover:from-card/90 hover:to-card/70 border-2 border-muted-foreground/20 hover:border-muted-foreground/40 p-6 text-left transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-muted-foreground/10" data-testid="card-daily-goal">
            <div className="flex items-start justify-between mb-3">
              <Target className="w-8 h-8 text-primary group-hover:text-primary/80 transition-colors" />
              <TechnicalLabel text="DAILY GOAL" className="text-muted-foreground text-xs" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-primary mb-3 group-hover:text-primary/90 transition-colors" data-testid="text-daily-progress">{Math.round(progressPercentage)}%</p>
            <Progress value={progressPercentage} className="progress-enhanced h-2 mb-3" />
            <TechnicalLabel text={`${formatCurrency(currentProgress.toString())} / ${formatCurrency(dailyGoal.toString())}`} className="text-muted-foreground text-xs" />
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Weekly Earnings Chart */}
          <Card className="group split-card bg-gradient-to-br from-card to-card/90 border-2 border-muted-foreground/20 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
            <CardHeader className="border-b border-muted-foreground/20 group-hover:border-primary/30 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <TechnicalLabel text="WEEKLY EARNINGS" className="text-foreground group-hover:text-primary/90 transition-colors" />
                <div className="p-2 bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-all duration-300">
                  <BarChart3 className="w-4 h-4 text-primary" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 md:p-4">
              <ResponsiveContainer width="100%" height={280} minHeight={250}>
                <AreaChart data={earningsChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 2" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    fontFamily="var(--font-sans)"
                    tickLine={false}
                    axisLine={false}
                    hide={window.innerWidth < 768}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    fontFamily="var(--font-sans)"
                    tickFormatter={(value) => window.innerWidth < 768 ? `${value}` : `PKR ${value}`}
                    tickLine={false}
                    axisLine={false}
                    hide={window.innerWidth < 768}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    formatter={(value) => [`PKR ${value}`, 'Earnings']}
                    labelFormatter={(label) => `Day: ${label}`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '2px solid hsl(var(--primary))',
                      borderRadius: '4px',
                      color: 'hsl(var(--primary))',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      boxShadow: '0 4px 12px hsl(var(--primary)/0.25)'
                    }}
                    labelStyle={{ color: 'hsl(var(--primary))' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="earnings"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    fill="url(#earningsGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Earnings Breakdown */}
          <Card className="group split-card bg-gradient-to-br from-card to-card/90 border-2 border-muted-foreground/20 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
            <CardHeader className="border-b border-muted-foreground/20 group-hover:border-primary/30 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <TechnicalLabel text="EARNINGS BREAKDOWN" className="text-foreground group-hover:text-primary/90 transition-colors" />
                <div className="p-2 bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-all duration-300">
                  <PieChart className="w-4 h-4 text-primary" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 md:p-4">
              <ResponsiveContainer width="100%" height={280} minHeight={250}>
                <RechartsPieChart margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <Pie
                    data={earningTypesData}
                    cx="50%"
                    cy="50%"
                    outerRadius={window.innerWidth < 768 ? 70 : 80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }: { name: string; percent: number }) =>
                      window.innerWidth < 768 ? `${(percent * 100).toFixed(0)}%` : `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {earningTypesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value}%`, name]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '2px solid hsl(var(--primary))',
                      borderRadius: '4px',
                      color: 'hsl(var(--primary))',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      boxShadow: '0 4px 12px hsl(var(--primary)/0.25)'
                    }}
                    labelStyle={{ color: 'hsl(var(--primary))' }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Enhanced Work Section
  function renderWorkSection() {
    // Handle video completion
    const handleVideoComplete = (tabId: string, earnings: string) => {
      setCompletedVideos(prev => new Set(Array.from(prev).concat(tabId)));
      toast({
        title: "Ad Completed!",
        description: `You earned $${earnings}`,
      });
    };

    // Prepare metrics data
    const metricsData = [
      {
        id: "ads-watched",
        title: "ADS WATCHED",
        value: todayAdViews?.count || 0,
        subtitle: "Today's activity",
        icon: Eye,
        variant: "orange" as const,
        trend: { direction: "up" as const, percentage: "+12%" }
      },
      {
        id: "remaining-ads",
        title: "REMAINING ADS",
        value: remainingAds,
        subtitle: "Daily quota left",
        icon: Target,
        variant: "black" as const
      },
      {
        id: "today-earnings",
        title: "TODAY'S EARNINGS",
        value: formatCurrency((completedAds.size * 2.5)),
        subtitle: "Current session",
        icon: DollarSign,
        variant: "white" as const,
        trend: { direction: "up" as const, percentage: "+$2.50" }
      },
      {
        id: "daily-goal",
        title: "DAILY GOAL",
        value: `${Math.round((completedAds.size / dailyLimit) * 100)}%`,
        subtitle: "Progress to limit",
        icon: Award,
        variant: "orange" as const,
        trend: { direction: "up" as const, percentage: "+15%" }
      }
    ];

    // Get current video tab data for player
    const currentVideoTab = {
      id: activeWorkTab,
      title: WORK_TABS.find(tab => tab.id === activeWorkTab)?.title || "ADS",
      icon: activeWorkTab === "ads" ? "📺" :
            activeWorkTab === "surveys" ? "📊" :
            activeWorkTab === "referrals" ? "👥" : "✅",
      color: "primary",
      videoUrl: `#${activeWorkTab}-video`,
      reward: "2.50",
      description: WORK_TABS.find(tab => tab.id === activeWorkTab)?.description || "Watch and earn"
    };

    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 relative z-10">
        {/* Enhanced Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 border border-primary mb-4">
            <Briefcase className="w-4 h-4" />
            <TechnicalLabel text="WORK CENTER" className="text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-foreground mb-4 tracking-tighter leading-tight">
            START <span className="text-primary">EARNING</span><br />
            WATCH & EARN REWARDS
          </h1>
          <p className="text-base md:text-lg text-muted-foreground mb-6 max-w-2xl mx-auto leading-relaxed">
            Watch advertisements, complete tasks, and earn real money daily
          </p>
          <Barcode className="w-24 md:w-32 h-6 md:h-8 mx-auto opacity-60" />
        </div>

        {/* Enhanced Metrics Cards */}
        <MetricsCards metrics={metricsData} className="mb-10" />

        {/* Industrial Tab System */}
        {/* Industrial Work Interface - Wireframe Style */}
          <div className="industrial-video-frame p-4 mb-8">
            <Tabs value={activeWorkTab} onValueChange={setActiveWorkTab} className="w-full">
              
              {WORK_TABS.map(tab => (
                <TabsContent key={tab.id} value={tab.id} className="mt-0">
                  <div className="space-y-4">
                    {/* Enhanced Video Player for active tab */}
                    {tab.id === activeWorkTab && (
                      <EnhancedVideoPlayer
                        tab={currentVideoTab}
                        isActive={true}
                        onComplete={handleVideoComplete}
                        autoplay={false}
                        isMobile={isMobile}
                      />
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>

        {/* Available Ads */}
        {remainingAds > 0 ? (
          <div></div>
        ) : null}
      </div>
    );
  }

  // Enhanced Referrals Section - Wireframe-Inspired Industrial Design
  function renderReferralsSection() {
    // Mock data for leadership board
    const leaderboardData = [
      {
        id: "1",
        rank: 1,
        name: "Don Ivan",
        earnings: "2,450.00",
        referrals: 15,
        status: "ACTIVE",
        tier: "PLATINUM",
        joinDate: "2024-01-15",
        isCurrentUser: false
      },
      {
        id: "2", 
        rank: 2,
        name: "Saad Rauf",
        earnings: "1,890.50",
        referrals: 12,
        status: "ACTIVE", 
        tier: "GOLD",
        joinDate: "2024-02-03",
        isCurrentUser: false
      },
      {
        id: "3",
        rank: 3,
        name: "Zain Abbas",
        earnings: "1,425.75",
        referrals: 9,
        status: "ACTIVE",
        tier: "SILVER",
        joinDate: "2024-02-18",
        isCurrentUser: false
      }
    ];

    const getRankIcon = (rank: number) => {
      switch (rank) {
        case 1: return <Crown className="w-5 h-5 text-yellow-500" />;
        case 2: return <Trophy className="w-5 h-5 text-gray-400" />;
        case 3: return <Medal className="w-5 h-5 text-amber-600" />;
        default: return <Star className="w-5 h-5 text-muted-foreground" />;
      }
    };

    const getTierColor = (tier: string) => {
      switch (tier) {
        case 'PLATINUM': return 'bg-gradient-to-r from-blue-600 to-purple-600 text-white';
        case 'GOLD': return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white';
        case 'SILVER': return 'bg-gradient-to-r from-gray-400 to-gray-600 text-white';
        default: return 'bg-black text-white';
      }
    };

    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 relative z-10">
        {/* Hero Section */}
        <div className="wireframe-border p-8 mb-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 border-2 border-black mb-4">
              <UserCheck className="w-5 h-5" />
              <TechnicalLabel text="REFERRAL PROTOCOL v3.14" className="text-white" />
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-8xl font-black text-foreground mb-4 tracking-tighter leading-tight">
              BUILD YOUR <span className="text-primary">NETWORK</span><br />
              EARN MORE TOGETHER
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-6 max-w-2xl mx-auto leading-relaxed">
              Invite friends, earn together, and build a passive income stream through referrals
            </p>
            <Barcode className="w-32 md:w-48 h-8 md:h-10 mx-auto opacity-60" />
          </div>
        </div>
        {/* Top Metrics Section - 4 Cards as per wireframe */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {/* Total Referrals */}
          <div className="wireframe-section p-4 md:p-6 text-center">
            <Users className="w-8 h-8 mx-auto mb-3 text-primary" />
            <div className="text-2xl md:text-3xl font-black mb-2 text-foreground">{referralsData?.stats.count || 0}</div>
            <TechnicalLabel text="TOTAL REFERRALS" className="text-muted-foreground text-xs" />
          </div>

          {/* Referral Earnings */}
          <div className="p-4 md:p-6 text-center text-white bg-black border-2 border-black">
            <DollarSign className="w-8 h-8 mx-auto mb-3 text-white" />
            <div className="text-2xl md:text-3xl font-black mb-2 text-white">{formatCurrency(referralsData?.stats.totalEarned || '0.00')}</div>
            <TechnicalLabel text="REFERRAL EARNINGS" className="text-white/80 text-xs" />
          </div>

          {/* Commission Rate */}
          <div className="wireframe-section p-4 md:p-6 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-3 text-primary" />
            <div className="text-2xl md:text-3xl font-black mb-2 text-foreground">25%</div>
            <TechnicalLabel text="COMMISSION RATE" className="text-muted-foreground text-xs" />
          </div>

          {/* Service Info */}
          <div className="wireframe-section p-4 md:p-6 text-center bg-[#e8e5d9]">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 text-primary" />
            <div className="text-2xl md:text-3xl font-black mb-2 text-foreground">∞</div>
            <TechnicalLabel text="LIFETIME EARNINGS" className="text-muted-foreground text-xs" />
          </div>
        </div>
        {/* Middle Section - Invitation Area and Leadership Area */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Invitation Area */}
          <div className="wireframe-section p-6">
            <div className="border-b-2 border-black pb-4 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Share2 className="w-6 h-6 text-primary" />
                <TechnicalLabel text="INVITATION AREA" className="text-foreground text-lg font-black" />
              </div>
              <TechnicalLabel text="PROTOCOL: NETWORK_EXPANSION_v2.1" className="text-muted-foreground text-xs" />
            </div>

            {/* Referral Code Display */}
            <div className="bg-black text-white p-6 border-2 border-primary mb-6">
              <TechnicalLabel text="YOUR REFERRAL CODE" className="text-primary mb-4 text-center" />
              <div className="bg-primary text-black px-6 py-4 text-2xl md:text-3xl font-black tracking-widest text-center border-2 border-white">
                {displayUser?.referralCode}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={copyReferralCode}
                className="w-full bg-primary hover:bg-primary/90 text-black px-6 py-4 text-lg font-black border-2 border-black"
                data-testid="button-copy-referral"
              >
                <Copy className="w-5 h-5 mr-3" />
                COPY REFERRAL CODE
              </Button>
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="border-2 border-black text-foreground hover:bg-black hover:text-white py-3 font-black"
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  GENERATE LINK
                </Button>
                <Button
                  variant="outline"
                  className="border-2 border-black text-foreground hover:bg-black hover:text-white py-3 font-black"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  SHARE
                </Button>
              </div>
            </div>

            <div className="mt-4 p-3 bg-muted border border-muted-foreground/20">
              <TechnicalLabel text="COMMISSION: 25% of all referral earnings forever" className="text-muted-foreground text-center text-xs" />
            </div>
          </div>

          {/* Leadership Area */}
          <div className="wireframe-section p-6">
            <div className="border-b-2 border-black pb-4 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Crown className="w-6 h-6 text-primary" />
                <TechnicalLabel text="LEADERSHIP AREA" className="text-foreground text-lg font-black" />
              </div>
              <TechnicalLabel text="TOP PERFORMERS RANKING" className="text-muted-foreground text-xs" />
            </div>

            {/* Leadership Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-3 bg-muted border border-muted-foreground/20">
                <div className="text-lg font-black text-foreground">#{referralsData?.stats.count ? Math.min(referralsData.stats.count + 15, 50) : 42}</div>
                <TechnicalLabel text="YOUR RANK" className="text-muted-foreground text-xs" />
              </div>
              <div className="text-center p-3 bg-primary text-white border border-primary">
                <div className="text-lg font-black text-white">TOP 10%</div>
                <TechnicalLabel text="PERCENTILE" className="text-white/80 text-xs" />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full border-2 border-black text-foreground hover:bg-black hover:text-white py-3 font-black"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                VIEW FULL LEADERBOARD
              </Button>
              <Button
                variant="outline"
                className="w-full border-2 border-black text-foreground hover:bg-black hover:text-white py-3 font-black"
              >
                <Trophy className="w-4 h-4 mr-2" />
                MY ACHIEVEMENTS
              </Button>
            </div>
          </div>
        </div>
        {/* Bottom Section - Leaderboard List (Blue highlighted in wireframe) */}
        <div className="wireframe-border bg-primary/5 p-6">
          <div className="border-b-2 border-primary pb-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trophy className="w-6 h-6 text-primary" />
                <TechnicalLabel text="TOP REFERRERS LEADERBOARD" className="text-foreground text-lg font-black" />
              </div>
              <div className="bg-primary text-white px-3 py-1 border border-primary">
                <TechnicalLabel text="LIVE RANKINGS" className="text-white text-xs" />
              </div>
            </div>
          </div>

          {/* Leaderboard Items */}
          <div className="space-y-4">
            {leaderboardData.map((leader, index) => (
              <div key={leader.id} className="wireframe-section p-4 hover:bg-white transition-colors duration-200">
                <div className="flex items-center justify-between">
                  {/* Left Side - Rank and Name */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-black text-white font-black text-lg flex items-center justify-center border border-black">
                        {leader.rank}
                      </div>
                      {getRankIcon(leader.rank)}
                    </div>
                    
                    <div>
                      <div className="text-lg font-black text-foreground mb-1">
                        {leader.name}
                      </div>
                      <div className="flex items-center gap-2">
                        <TechnicalLabel text={`${leader.referrals} REFERRALS`} className="text-muted-foreground text-xs" />
                        <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                        <TechnicalLabel text={`JOINED ${new Date(leader.joinDate).toLocaleDateString()}`} className="text-muted-foreground text-xs" />
                      </div>
                    </div>
                  </div>

                  {/* Right Side - Rank Info and Revision */}
                  <div className="flex items-center gap-4">
                    {/* Rank Info */}
                    <div className="text-right">
                      <div className="text-lg font-black text-primary mb-1">
                        {formatCurrency(leader.earnings)}
                      </div>
                      <TechnicalLabel text="TOTAL EARNED" className="text-muted-foreground text-xs" />
                    </div>

                    {/* Revision (Tier Badge) */}
                    <div className="px-3 py-1 text-xs font-black border-2 border-black from-blue-600 to-purple-600 text-white bg-[#000000]">
                      {leader.tier}
                    </div>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${leader.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <TechnicalLabel text={`STATUS: ${leader.status}`} className="text-muted-foreground text-xs" />
                  </div>
                  <TechnicalLabel text={`RANK #${leader.rank} OF 500+ USERS`} className="text-muted-foreground text-xs" />
                </div>
              </div>
            ))}
          </div>

          {/* View More Button */}
          <div className="mt-6 text-center">
            <Button
              variant="outline"
              className="border-2 border-primary text-primary hover:bg-primary hover:text-white px-8 py-3 font-black"
            >
              VIEW COMPLETE LEADERBOARD
            </Button>
          </div>
        </div>
        {/* Your Referrals Section */}
        {referralsData?.referrals && referralsData.referrals.length > 0 && (
          <div className="mt-8 wireframe-section p-6">
            <div className="border-b-2 border-black pb-4 mb-6">
              <TechnicalLabel text="YOUR NETWORK" className="text-foreground text-lg font-black" />
            </div>
            
            <div className="grid gap-4">
              {referralsData.referrals.map((referral, index) => (
                <div key={referral.id} className="wireframe-section p-4 hover:bg-white transition-colors" data-testid={`referral-${referral.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/60 text-white font-black text-lg flex items-center justify-center border-2 border-black">
                        {referral.referred.firstName[0]}{referral.referred.lastName[0]}
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-foreground">
                          {referral.referred.firstName} {referral.referred.lastName}
                        </h3>
                        <TechnicalLabel text={referral.referred.email} className="text-muted-foreground text-xs" />
                        <TechnicalLabel text={`Joined: ${formatDate(referral.referred.createdAt)}`} className="text-muted-foreground text-xs" />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-primary">
                        +{formatCurrency(referral.totalEarned)}
                      </div>
                      <TechnicalLabel text={`TIER ${index + 1}`} className="text-muted-foreground text-xs" />
                      <div className={`inline-block px-2 py-1 text-xs font-semibold border mt-1 ${
                        referral.status === 'active'
                          ? 'bg-green-100 text-green-800 border-green-600'
                          : 'bg-gray-100 text-gray-800 border-gray-600'
                      }`}>
                        {referral.status.toUpperCase()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Enhanced Payout Section - Wireframe Industrial Design
  function renderPayoutSection() {
    // Mock withdrawal history data for demonstration
    const withdrawalHistory = [
      {
        id: "wd_001",
        amount: "1,250.00",
        method: "JazzCash",
        account: "03XX-XXXXXXX45",
        status: "COMPLETED",
        date: "2024-01-15T10:30:00Z",
        transactionId: "TXN_789456123"
      },
      {
        id: "wd_002", 
        amount: "850.50",
        method: "EasyPaisa",
        account: "03XX-XXXXXXX23",
        status: "PROCESSING",
        date: "2024-01-14T14:20:00Z",
        transactionId: "TXN_654321987"
      },
      {
        id: "wd_003",
        amount: "2,100.75",
        method: "Bank Transfer",
        account: "****-****-8901",
        status: "PENDING",
        date: "2024-01-13T09:15:00Z",
        transactionId: "TXN_147258369"
      }
    ];

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'COMPLETED': return 'bg-green-500 text-white';
        case 'PROCESSING': return 'bg-yellow-500 text-black';
        case 'PENDING': return 'bg-orange-500 text-white';
        case 'FAILED': return 'bg-red-500 text-white';
        default: return 'bg-gray-500 text-white';
      }
    };

    const getMethodIcon = (method: string) => {
      switch (method) {
        case 'JazzCash': return '📱';
        case 'EasyPaisa': return '💳';
        case 'Bank Transfer': return '🏦';
        default: return '💰';
      }
    };

    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 relative z-10">
        {/* Hero Section - Wireframe Style */}
        <div className="wireframe-border p-8 mb-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 border-2 border-black mb-4">
              <CreditCard className="w-5 h-5" />
              <TechnicalLabel text="PAYOUT PROTOCOL v2.8" className="text-white" />
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-8xl font-black text-foreground mb-4 tracking-tighter leading-tight">
              WITHDRAW YOUR <span className="text-primary">EARNINGS</span><br />
              INSTANT PROCESSING
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-6 max-w-2xl mx-auto leading-relaxed">
              Fast, secure, and reliable withdrawal system with real-time processing
            </p>
            <Barcode className="w-32 md:w-48 h-8 md:h-10 mx-auto opacity-60" />
          </div>
        </div>

        {/* Enhanced Balance Overview - 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Available Balance */}
          <div className="p-6 text-center bg-primary text-black border-2 border-black hover:bg-primary/90 transition-all duration-300">
            <Wallet className="w-12 h-12 mx-auto mb-4" />
            <div className="text-3xl md:text-4xl font-black mb-2">{formatCurrency(displayUser?.availableBalance || '0.00')}</div>
            <TechnicalLabel text="AVAILABLE BALANCE" className="text-black text-xs" />
            <div className="mt-2 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <TechnicalLabel text="READY FOR WITHDRAWAL" className="text-black/80 text-xs" />
            </div>
          </div>

          {/* Total Earned */}
          <div className="wireframe-section p-6 text-center hover:bg-white transition-colors duration-200">
            <DollarSign className="w-12 h-12 mx-auto mb-4 text-primary" />
            <div className="text-3xl md:text-4xl font-black mb-2 text-primary">{formatCurrency(displayUser?.totalEarnings || '0.00')}</div>
            <TechnicalLabel text="TOTAL EARNED" className="text-muted-foreground text-xs" />
            <div className="mt-2 flex items-center justify-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <TechnicalLabel text="+15.2% THIS MONTH" className="text-green-500 text-xs" />
            </div>
          </div>

          {/* Pending Withdrawals */}
          <div className="bg-black text-white p-6 text-center border-2 border-black hover:bg-primary hover:text-black transition-all duration-300">
            <Clock className="w-12 h-12 mx-auto mb-4 text-primary" />
            <div className="text-3xl md:text-4xl font-black mb-2 text-primary">
              {withdrawalHistory.filter(w => w.status === 'PROCESSING' || w.status === 'PENDING').length}
            </div>
            <TechnicalLabel text="PENDING WITHDRAWALS" className="text-white/80 text-xs" />
            <div className="mt-2">
              <TechnicalLabel text="IN PROCESSING QUEUE" className="text-primary text-xs" />
            </div>
          </div>
        </div>

        {/* Enhanced Withdrawal Interface */}
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {/* Withdrawal Form - Left 2 columns */}
          <div className="lg:col-span-2 wireframe-section p-6">
            <div className="border-b-2 border-black pb-4 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Download className="w-6 h-6 text-primary" />
                <TechnicalLabel text="WITHDRAWAL INTERFACE" className="text-foreground text-lg font-black" />
              </div>
              <TechnicalLabel text="PROTOCOL: INSTANT_PAYOUT_v2.8" className="text-muted-foreground text-xs" />
            </div>

            <div className="space-y-6">
              {/* Amount and Method Selection */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <TechnicalLabel text="WITHDRAWAL AMOUNT" className="text-foreground mb-3 font-black" />
                  <div className="bg-black border-2 border-primary p-4">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full bg-transparent text-primary text-2xl font-black outline-none placeholder-primary/50"
                    />
                    <TechnicalLabel text="PKR (Pakistani Rupee)" className="text-white/60 text-xs mt-1" />
                  </div>
                </div>

                <div>
                  <TechnicalLabel text="PAYMENT METHOD" className="text-foreground mb-3 font-black" />
                  <div className="bg-primary/10 border-2 border-primary p-4">
                    <select className="w-full bg-transparent text-foreground text-lg font-black outline-none">
                      <option value="" className="bg-black text-white">SELECT PAYMENT METHOD</option>
                      <option value="jazzcash" className="bg-black text-white">📱 JazzCash Mobile Wallet</option>
                      <option value="easypaisa" className="bg-black text-white">💳 EasyPaisa Digital Wallet</option>
                      <option value="bank" className="bg-black text-white">🏦 Bank Transfer (ACH)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Account Details */}
              <div>
                <TechnicalLabel text="ACCOUNT DETAILS" className="text-foreground mb-3 font-black" />
                <div className="bg-black border-2 border-primary p-4">
                  <input
                    type="text"
                    placeholder="Account number or phone number"
                    className="w-full bg-transparent text-primary text-lg font-black outline-none placeholder-primary/50"
                  />
                  <TechnicalLabel text="SECURE: All data encrypted with AES-256" className="text-white/60 text-xs mt-2" />
                </div>
              </div>

              {/* Fee Calculator */}
              <div className="bg-muted/20 border-2 border-muted-foreground/30 p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <TechnicalLabel text="WITHDRAWAL AMOUNT:" className="text-muted-foreground" />
                    <TechnicalLabel text="PKR 0.00" className="text-foreground font-black" />
                  </div>
                  <div className="flex justify-between">
                    <TechnicalLabel text="PROCESSING FEE:" className="text-muted-foreground" />
                    <TechnicalLabel text="PKR 15.00" className="text-foreground font-black" />
                  </div>
                  <div className="flex justify-between col-span-2 border-t border-muted-foreground/30 pt-2">
                    <TechnicalLabel text="NET AMOUNT:" className="text-primary font-black" />
                    <TechnicalLabel text="PKR 0.00" className="text-primary font-black text-lg" />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-black px-6 py-4 text-lg font-black border-2 border-black"
                  data-testid="button-withdraw"
                >
                  <Download className="w-5 h-5 mr-3" />
                  PROCESS WITHDRAWAL
                </Button>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="border-2 border-black text-foreground hover:bg-black hover:text-white py-3 font-black"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    SCHEDULE LATER
                  </Button>
                  <Button
                    variant="outline"
                    className="border-2 border-black text-foreground hover:bg-black hover:text-white py-3 font-black"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    QUICK WITHDRAW
                  </Button>
                </div>
              </div>

              {/* Terms Notice */}
              <div className="bg-primary/5 border border-primary/30 p-3">
                <TechnicalLabel text="TERMS: Minimum withdrawal PKR 100.00 • Processing time: 24-48 hours • Fees may apply" className="text-muted-foreground text-center text-xs" />
              </div>
            </div>
          </div>

          {/* Quick Stats - Right column */}
          <div className="wireframe-section p-6">
            <div className="border-b-2 border-black pb-4 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-6 h-6 text-primary" />
                <TechnicalLabel text="WITHDRAWAL STATS" className="text-foreground text-lg font-black" />
              </div>
              <TechnicalLabel text="REAL-TIME METRICS" className="text-muted-foreground text-xs" />
            </div>

            {/* Quick Stats */}
            <div className="space-y-4">
              <div className="bg-black text-white p-4 border-2 border-primary text-center">
                <div className="text-2xl font-black text-primary mb-1">24h</div>
                <TechnicalLabel text="AVG PROCESSING TIME" className="text-white/80 text-xs" />
              </div>
              
              <div className="text-center p-4 bg-primary text-black border-2 border-black">
                <div className="text-2xl font-black mb-1">99.8%</div>
                <TechnicalLabel text="SUCCESS RATE" className="text-black/80 text-xs" />
              </div>
              
              <div className="text-center p-4 bg-muted border border-muted-foreground/30">
                <div className="text-2xl font-black text-foreground mb-1">PKR 15</div>
                <TechnicalLabel text="PROCESSING FEE" className="text-muted-foreground text-xs" />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 space-y-3">
              <Button
                variant="outline"
                className="w-full border-2 border-black text-foreground hover:bg-black hover:text-white py-3 font-black"
              >
                <History className="w-4 h-4 mr-2" />
                VIEW ALL HISTORY
              </Button>
              <Button
                variant="outline"
                className="w-full border-2 border-black text-foreground hover:bg-black hover:text-white py-3 font-black"
              >
                <Download className="w-4 h-4 mr-2" />
                EXPORT RECORDS
              </Button>
            </div>
          </div>
        </div>

        {/* Enhanced Payment History */}
        <div className="wireframe-border bg-primary/5 p-6">
          <div className="border-b-2 border-primary pb-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <History className="w-6 h-6 text-primary" />
                <TechnicalLabel text="WITHDRAWAL TRANSACTION HISTORY" className="text-foreground text-lg font-black" />
              </div>
              <div className="bg-primary text-white px-3 py-1 border border-primary">
                <TechnicalLabel text="LIVE UPDATES" className="text-white text-xs" />
              </div>
            </div>
          </div>

          {/* Transaction History */}
          {withdrawalHistory.length > 0 ? (
            <div className="space-y-4">
              {withdrawalHistory.map((transaction) => (
                <div key={transaction.id} className="wireframe-section p-4 hover:bg-white transition-colors duration-200">
                  <div className="flex items-center justify-between mb-3">
                    {/* Left side - Method and Amount */}
                    <div className="flex items-center gap-4">
                      <div className="text-2xl">{getMethodIcon(transaction.method)}</div>
                      <div>
                        <div className="text-lg font-black text-foreground mb-1">
                          {formatCurrency(transaction.amount)}
                        </div>
                        <TechnicalLabel text={transaction.method} className="text-muted-foreground text-xs" />
                      </div>
                    </div>

                    {/* Right side - Status and Date */}
                    <div className="text-right">
                      <div className={`inline-block px-3 py-1 text-xs font-black border-2 border-black ${getStatusColor(transaction.status)} mb-2`}>
                        {transaction.status}
                      </div>
                      <div>
                        <TechnicalLabel text={formatDate(transaction.date)} className="text-muted-foreground text-xs" />
                      </div>
                    </div>
                  </div>

                  {/* Transaction Details */}
                  <div className="border-t border-muted-foreground/20 pt-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <TechnicalLabel text={`ACCOUNT: ${transaction.account}`} className="text-muted-foreground text-xs" />
                      <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                      <TechnicalLabel text={`TXN: ${transaction.transactionId}`} className="text-muted-foreground text-xs" />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border border-primary text-primary hover:bg-primary hover:text-black text-xs px-3 py-1"
                    >
                      VIEW DETAILS
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-12">
              <History className="w-16 h-16 mx-auto mb-4 text-primary opacity-60" />
              <TechnicalLabel text="NO WITHDRAWAL HISTORY" className="text-primary text-2xl font-black mb-2" />
              <TechnicalLabel text="Your withdrawal transactions will appear here once you make your first withdrawal" className="text-muted-foreground max-w-md mx-auto" />
            </div>
          )}

          {/* Load More Button */}
          {withdrawalHistory.length > 0 && (
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                className="border-2 border-primary text-primary hover:bg-primary hover:text-black px-8 py-3 font-black"
              >
                LOAD MORE TRANSACTIONS
              </Button>
            </div>
          )}
        </div>
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
