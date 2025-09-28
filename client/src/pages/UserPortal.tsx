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
import { Input } from "@/components/ui/input";
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
  ExternalLink,
  X
} from "lucide-react";
import { JazzCashIcon, EasyPaisaIcon, BankTransferIcon, MobileWalletIcon } from "@/components/ui/payment-icons";
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

// Animated Placeholder Component for Contact Form
function AnimatedPlaceholder({ examples }: { examples: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    const example = examples[currentIndex];
    let timeout: NodeJS.Timeout;

    if (isTyping) {
      if (currentText.length < example.length) {
        timeout = setTimeout(() => {
          setCurrentText(example.slice(0, currentText.length + 1));
        }, 100);
      } else {
        timeout = setTimeout(() => setIsTyping(false), 1000);
      }
    } else {
      if (currentText.length > 0) {
        timeout = setTimeout(() => {
          setCurrentText(currentText.slice(0, -1));
        }, 50);
      } else {
        setCurrentIndex((prev) => (prev + 1) % examples.length);
        setIsTyping(true);
      }
    }

    return () => clearTimeout(timeout);
  }, [currentText, currentIndex, examples, isTyping]);

  return (
    <span className="text-muted-foreground">
      {currentText}<span className="animate-pulse">|</span>
    </span>
  );
}

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

      {/* Desktop Navigation Controls - Landing Page Style (Hidden on Mobile for User Portal) */}
      <div className="arrow-keys-guide hidden md:flex">
        <div className="flex items-center gap-3">
          <button
            onClick={prevSection}
            className="arrow-key"
            disabled={currentSection === 0}
            data-testid="button-prev-section"
          >
            ←
          </button>
          <button
            onClick={nextSection}
            className="arrow-key"
            disabled={currentSection === sections.length - 1}
            data-testid="button-next-section"
          >
            →
          </button>
        </div>
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
      <div className="pt-16 md:pt-20 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8">
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
        <div className="wireframe-border p-4 md:p-8 mb-4 md:mb-8">
          <div className="text-center mb-6 md:mb-8">
            <div className="inline-flex items-center gap-2 bg-black text-white px-3 md:px-4 py-2 border-2 border-black mb-4">
              <Activity className="w-4 h-4 md:w-5 md:h-5" />
              <TechnicalLabel text="DASHBOARD PROTOCOL v4.12" className="text-white text-xs md:text-sm" />
            </div>
            <h1 className="text-xl md:text-4xl lg:text-5xl font-black text-foreground mb-3 md:mb-4 tracking-tighter leading-tight px-1 md:px-2">
              ASSALAM U ALAYKUM,<br />
              <span className="text-primary bg-primary/10 px-1 md:px-2 py-1 inline-block mt-2 text-lg md:text-4xl lg:text-5xl">{displayUser?.firstName || "GUEST"}</span>
            </h1>
            <div className="max-w-3xl mx-auto mb-2">
              <p className="text-xs md:text-lg text-muted-foreground leading-relaxed px-1 md:px-2">
                Track your earnings • Monitor your progress in real-time
              </p>
            </div>
            <Barcode className="w-24 md:w-32 lg:w-48 h-6 md:h-8 lg:h-10 mx-auto opacity-60" />
          </div>
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
        <div className="grid lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
          {/* Weekly Earnings Chart */}
          <Card className="group split-card bg-gradient-to-br from-card to-card/90 border-2 border-muted-foreground/20 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
            <CardHeader className="border-b border-muted-foreground/20 group-hover:border-primary/30 transition-colors p-3 md:p-6">
              <CardTitle className="flex items-center justify-between">
                <TechnicalLabel text="WEEKLY EARNINGS" className="text-foreground group-hover:text-primary/90 transition-colors text-xs md:text-sm" />
                <div className="p-1 md:p-2 bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-all duration-300">
                  <BarChart3 className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 md:p-4">
              <ResponsiveContainer width="100%" height={isMobile ? 200 : 280} minHeight={isMobile ? 180 : 250}>
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
                    fontSize={isMobile ? 8 : 10}
                    fontFamily="var(--font-sans)"
                    tickLine={false}
                    axisLine={false}
                    hide={isMobile}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={isMobile ? 8 : 10}
                    fontFamily="var(--font-sans)"
                    tickFormatter={(value) => isMobile ? `${value}` : `PKR ${value}`}
                    tickLine={false}
                    axisLine={false}
                    hide={isMobile}
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
                      fontSize: isMobile ? '10px' : '12px',
                      fontWeight: 'bold',
                      boxShadow: '0 4px 12px hsl(var(--primary)/0.25)'
                    }}
                    labelStyle={{ color: 'hsl(var(--primary))' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="earnings"
                    stroke="hsl(var(--primary))"
                    strokeWidth={isMobile ? 2 : 3}
                    fill="url(#earningsGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Earnings Breakdown */}
          <Card className="group split-card bg-gradient-to-br from-card to-card/90 border-2 border-muted-foreground/20 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
            <CardHeader className="border-b border-muted-foreground/20 group-hover:border-primary/30 transition-colors p-3 md:p-6">
              <CardTitle className="flex items-center justify-between">
                <TechnicalLabel text="EARNINGS BREAKDOWN" className="text-foreground group-hover:text-primary/90 transition-colors text-xs md:text-sm" />
                <div className="p-1 md:p-2 bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-all duration-300">
                  <PieChart className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 md:p-4">
              <ResponsiveContainer width="100%" height={isMobile ? 200 : 280} minHeight={isMobile ? 180 : 250}>
                <RechartsPieChart margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <Pie
                    data={earningTypesData}
                    cx="50%"
                    cy="50%"
                    outerRadius={isMobile ? 50 : 80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }: { name: string; percent: number }) =>
                      isMobile ? `${(percent * 100).toFixed(0)}%` : `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelStyle={{ fontSize: isMobile ? '10px' : '12px' }}
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
                      fontSize: isMobile ? '10px' : '12px',
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
        {/* Hero Section - Dashboard Style */}
        <div className="wireframe-border p-4 md:p-8 mb-4 md:mb-8">
          <div className="text-center mb-6 md:mb-8">
            <div className="inline-flex items-center gap-2 bg-black text-white px-3 md:px-4 py-2 border-2 border-black mb-4">
              <Briefcase className="w-4 h-4 md:w-5 md:h-5" />
              <TechnicalLabel text="WORK PROTOCOL v3.21" className="text-white text-xs md:text-sm" />
            </div>
            <h1 className="text-xl md:text-4xl lg:text-5xl font-black text-foreground mb-3 md:mb-4 tracking-tighter leading-tight px-1 md:px-2">
              START <span className="text-primary">EARNING</span><br />
              WATCH & EARN REWARDS
            </h1>
            <div className="max-w-3xl mx-auto mb-2">
              <p className="text-xs md:text-lg text-muted-foreground leading-relaxed px-1 md:px-2">
                Watch advertisements, complete tasks, and earn real money daily
              </p>
            </div>
            <Barcode className="w-24 md:w-32 lg:w-48 h-6 md:h-8 lg:h-10 mx-auto opacity-60" />
          </div>
        </div>

        {/* Key Metrics Cards - Exact Dashboard Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
          {/* Ads Watched */}
          <div className="group split-card bg-gradient-to-br from-card to-card/80 hover:from-primary/5 hover:to-primary/10 border-2 border-muted-foreground/20 hover:border-primary/30 p-6 text-left transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-primary/10" data-testid="card-work-ads-watched">
            <div className="flex items-start justify-between mb-3">
              <Eye className="w-8 h-8 text-primary group-hover:text-primary/80 transition-colors" />
              <TechnicalLabel text="ADS WATCHED" className="text-muted-foreground text-xs" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-foreground mb-2 group-hover:text-primary/90 transition-colors" data-testid="text-work-ads-watched">
              {todayAdViews?.count || 0}
            </p>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <TechnicalLabel text="+12% TODAY" className="text-green-500 text-xs" />
            </div>
          </div>

          {/* Remaining Ads */}
          <div className="group split-card bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border-2 border-primary/20 hover:border-primary/40 p-6 text-left transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-primary/20" data-testid="card-work-remaining-ads">
            <div className="flex items-start justify-between mb-3">
              <Target className="w-8 h-8 text-primary group-hover:text-primary/80 transition-colors" />
              <TechnicalLabel text="REMAINING ADS" className="text-muted-foreground text-xs" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-primary mb-2 group-hover:text-primary/90 transition-colors" data-testid="text-work-remaining-ads">
              {remainingAds}
            </p>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-primary" />
              <TechnicalLabel text="DAILY QUOTA LEFT" className="text-primary/70 text-xs" />
            </div>
          </div>

          {/* Today's Earnings */}
          <div className="group split-card bg-gradient-to-br from-muted to-muted/60 hover:from-muted/80 hover:to-muted/40 border-2 border-muted-foreground/20 hover:border-muted-foreground/40 p-6 text-left transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-muted-foreground/10" data-testid="card-work-today-earnings">
            <div className="flex items-start justify-between mb-3">
              <DollarSign className="w-8 h-8 text-foreground/80 group-hover:text-foreground transition-colors" />
              <TechnicalLabel text="TODAY'S EARNINGS" className="text-muted-foreground text-xs" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-foreground mb-2 group-hover:text-foreground/90 transition-colors" data-testid="text-work-today-earnings">
              {formatCurrency((completedAds.size * 2.5))}
            </p>
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
              <TechnicalLabel text="+₨2.50 SESSION" className="text-muted-foreground text-xs" />
            </div>
          </div>

          {/* Daily Goal */}
          <div className="group split-card bg-gradient-to-br from-card to-card/80 hover:from-card/90 hover:to-card/70 border-2 border-muted-foreground/20 hover:border-muted-foreground/40 p-6 text-left transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-muted-foreground/10" data-testid="card-work-daily-goal">
            <div className="flex items-start justify-between mb-3">
              <Award className="w-8 h-8 text-primary group-hover:text-primary/80 transition-colors" />
              <TechnicalLabel text="DAILY GOAL" className="text-muted-foreground text-xs" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-primary mb-3 group-hover:text-primary/90 transition-colors" data-testid="text-work-daily-goal">
              {Math.round((completedAds.size / dailyLimit) * 100)}%
            </p>
            <Progress value={Math.round((completedAds.size / dailyLimit) * 100)} className="progress-enhanced h-2 mb-3" />
            <TechnicalLabel text={`${completedAds.size} / ${dailyLimit} ADS`} className="text-muted-foreground text-xs" />
          </div>
        </div>

        {/* Industrial Work Interface - Full Width */}
        <div className="industrial-video-frame p-4">
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
      </div>
    );
  }

  // Enhanced Referrals Section - Dashboard Style
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
        case 1: return <Crown className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />;
        case 2: return <Trophy className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />;
        case 3: return <Medal className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />;
        default: return <Star className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />;
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
        {/* Hero Section - Dashboard Style */}
        <div className="wireframe-border p-4 md:p-8 mb-4 md:mb-8">
          <div className="text-center mb-6 md:mb-8">
            <div className="inline-flex items-center gap-2 bg-black text-white px-3 md:px-4 py-2 border-2 border-black mb-4">
              <UserCheck className="w-4 h-4 md:w-5 md:h-5" />
              <TechnicalLabel text="REFERRAL PROTOCOL v3.14" className="text-white text-xs md:text-sm" />
            </div>
            <h1 className="text-xl md:text-4xl lg:text-5xl font-black text-foreground mb-3 md:mb-4 tracking-tighter leading-tight px-1 md:px-2">
              BUILD YOUR <span className="text-primary">NETWORK</span><br />
              EARN MORE TOGETHER
            </h1>
            <div className="max-w-3xl mx-auto mb-2">
              <p className="text-xs md:text-lg text-muted-foreground leading-relaxed px-1 md:px-2">
                Invite friends, earn together, and build a passive income stream through referrals
              </p>
            </div>
            <Barcode className="w-24 md:w-32 lg:w-48 h-6 md:h-8 lg:h-10 mx-auto opacity-60" />
          </div>
        </div>
        {/* Key Metrics Cards - Dashboard Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
          {/* Total Referrals */}
          <div className="group split-card bg-gradient-to-br from-card to-card/80 hover:from-primary/5 hover:to-primary/10 border-2 border-muted-foreground/20 hover:border-primary/30 p-6 text-left transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-primary/10" data-testid="card-total-referrals">
            <div className="flex items-start justify-between mb-3">
              <Users className="w-8 h-8 text-primary group-hover:text-primary/80 transition-colors" />
              <TechnicalLabel text="TOTAL REFERRALS" className="text-muted-foreground text-xs" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-foreground mb-2 group-hover:text-primary/90 transition-colors" data-testid="text-referrals-count">{referralsData?.stats.count || 0}</p>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <TechnicalLabel text="+2 THIS WEEK" className="text-green-500 text-xs" />
            </div>
          </div>

          {/* Referral Earnings */}
          <div className="group split-card bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border-2 border-primary/20 hover:border-primary/40 p-6 text-left transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-primary/20" data-testid="card-referral-earnings">
            <div className="flex items-start justify-between mb-3">
              <DollarSign className="w-8 h-8 text-primary group-hover:text-primary/80 transition-colors" />
              <TechnicalLabel text="REFERRAL EARNINGS" className="text-muted-foreground text-xs" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-primary mb-2 group-hover:text-primary/90 transition-colors" data-testid="text-referral-earnings">{formatCurrency(referralsData?.stats.totalEarned || '0.00')}</p>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-primary" />
              <TechnicalLabel text="25% COMMISSION" className="text-primary/70 text-xs" />
            </div>
          </div>

          {/* Commission Rate */}
          <div className="group split-card bg-gradient-to-br from-muted to-muted/60 hover:from-muted/80 hover:to-muted/40 border-2 border-muted-foreground/20 hover:border-muted-foreground/40 p-6 text-left transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-muted-foreground/10" data-testid="card-commission-rate">
            <div className="flex items-start justify-between mb-3">
              <TrendingUp className="w-8 h-8 text-foreground/80 group-hover:text-foreground transition-colors" />
              <TechnicalLabel text="COMMISSION RATE" className="text-muted-foreground text-xs" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-foreground mb-2 group-hover:text-foreground/90 transition-colors" data-testid="text-commission-rate">25%</p>
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
              <TechnicalLabel text="LIFETIME RATE" className="text-muted-foreground text-xs" />
            </div>
          </div>

          {/* Network Potential */}
          <div className="group split-card bg-gradient-to-br from-card to-card/80 hover:from-card/90 hover:to-card/70 border-2 border-muted-foreground/20 hover:border-muted-foreground/40 p-6 text-left transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-muted-foreground/10" data-testid="card-network-potential">
            <div className="flex items-start justify-between mb-3">
              <RefreshCw className="w-8 h-8 text-primary group-hover:text-primary/80 transition-colors" />
              <TechnicalLabel text="NETWORK POTENTIAL" className="text-muted-foreground text-xs" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-primary mb-2 group-hover:text-primary/90 transition-colors" data-testid="text-network-potential">∞</p>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <TechnicalLabel text="UNLIMITED GROWTH" className="text-green-500 text-xs" />
            </div>
          </div>
        </div>
        {/* Middle Section - Invitation Area and Leadership Area */}
        <div className="grid lg:grid-cols-2 gap-4 md:gap-8 mb-6 md:mb-8">
          {/* Invitation Area */}
          <div className="wireframe-section p-4 md:p-6">
            <div className="border-b-2 border-black pb-3 md:pb-4 mb-4 md:mb-6">
              <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                <Share2 className="w-4 h-4 md:w-6 md:h-6 text-primary" />
                <TechnicalLabel text="INVITATION AREA" className="text-foreground text-sm md:text-lg font-black" />
              </div>
              <TechnicalLabel text="PROTOCOL: NETWORK_EXPANSION_v2.1" className="text-muted-foreground text-xs" />
            </div>

            {/* Referral Code Display */}
            <div className="bg-black text-white p-4 md:p-6 border-2 border-primary mb-4 md:mb-6">
              <TechnicalLabel text="YOUR REFERRAL CODE" className="text-primary mb-3 md:mb-4 text-center text-xs md:text-sm" />
              <div className="referral-code-display bg-primary text-black px-3 md:px-6 py-3 md:py-4 text-sm md:text-3xl font-black tracking-widest text-center border-2 border-white">
                {displayUser?.referralCode}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 md:space-y-3">
              <Button
                onClick={copyReferralCode}
                className="w-full bg-primary hover:bg-primary/90 text-black px-4 md:px-6 py-3 md:py-4 text-sm md:text-lg font-black border-2 border-black"
                data-testid="button-copy-referral"
              >
                <Copy className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3" />
                COPY REFERRAL CODE
              </Button>

              <div className="button-group-mobile grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                <Button
                  variant="outline"
                  className="referral-action-button border-2 border-black text-foreground hover:bg-black hover:text-white py-2 md:py-3 font-black text-xs md:text-sm"
                >
                  <Link2 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  GENERATE LINK
                </Button>
                <Button
                  variant="outline"
                  className="referral-action-button border-2 border-black text-foreground hover:bg-black hover:text-white py-2 md:py-3 font-black text-xs md:text-sm"
                >
                  <ExternalLink className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  SHARE
                </Button>
              </div>
            </div>

            <div className="mt-3 md:mt-4 p-2 md:p-3 bg-muted border border-muted-foreground/20">
              <TechnicalLabel text="COMMISSION: 25% of all referral earnings forever" className="text-muted-foreground text-center text-xs leading-tight" />
            </div>
          </div>

          {/* Leadership Area */}
          <div className="wireframe-section p-4 md:p-6">
            <div className="border-b-2 border-black pb-3 md:pb-4 mb-4 md:mb-6">
              <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                <Crown className="w-4 h-4 md:w-6 md:h-6 text-primary" />
                <TechnicalLabel text="LEADERSHIP AREA" className="text-foreground text-sm md:text-lg font-black" />
              </div>
              <TechnicalLabel text="TOP PERFORMERS RANKING" className="text-muted-foreground text-xs" />
            </div>

            {/* Leadership Stats */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
              <div className="text-center p-2 md:p-3 bg-muted border border-muted-foreground/20">
                <div className="metric-value-mobile text-base md:text-lg font-black text-foreground">#{referralsData?.stats.count ? Math.min(referralsData.stats.count + 15, 50) : 42}</div>
                <TechnicalLabel text="YOUR RANK" className="text-muted-foreground text-xs leading-tight" />
              </div>
              <div className="text-center p-2 md:p-3 bg-primary text-white border border-primary">
                <div className="metric-value-mobile text-base md:text-lg font-black text-white">TOP 10%</div>
                <TechnicalLabel text="PERCENTILE" className="text-white/80 text-xs leading-tight" />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2 md:space-y-3">
              <Button
                variant="outline"
                onClick={() => navigateToSection(0)}
                className="w-full border-2 border-black text-foreground hover:bg-black hover:text-white py-2 md:py-3 font-black text-xs md:text-sm"
              >
                <BarChart3 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                VIEW PROGRESS
              </Button>
              <Button
                variant="outline"
                onClick={() => navigateToSection(1)}
                className="w-full border-2 border-black text-foreground hover:bg-black hover:text-white py-2 md:py-3 font-black text-xs md:text-sm"
              >
                <Zap className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                EARN MORE!
              </Button>
              <Button
                variant="outline"
                onClick={() => navigateToSection(3)}
                className="w-full border-2 border-black text-foreground hover:bg-black hover:text-white py-2 md:py-3 font-black text-xs md:text-sm"
              >
                <Wallet className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                GET PAYOUT
              </Button>
              <Button
                variant="outline"
                onClick={() => navigateToSection(4)}
                className="w-full border-2 border-black text-foreground hover:bg-black hover:text-white py-2 md:py-3 font-black text-xs md:text-sm"
              >
                <HelpCircle className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                ANY HELP?
              </Button>
            </div>
          </div>
        </div>
        {/* Bottom Section - Leaderboard List (Blue highlighted in wireframe) */}
        <div className="wireframe-border bg-primary/5 p-4 md:p-6">
          <div className="border-b-2 border-primary pb-3 md:pb-4 mb-4 md:mb-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 md:gap-3">
                <Trophy className="w-4 h-4 md:w-6 md:h-6 text-primary" />
                <TechnicalLabel text="TOP REFERRERS LEADERBOARD" className="text-foreground text-sm md:text-lg font-black" />
              </div>
              <div className="bg-primary text-white px-2 md:px-3 py-1 border border-primary">
                <TechnicalLabel text="LIVE RANKINGS" className="text-white text-xs" />
              </div>
            </div>
          </div>

          {/* Mobile Optimized Leaderboard List */}
          <div className="mobile-leaderboard-list space-y-2 md:space-y-4">
            {leaderboardData.map((leader, index) => (
              <div key={leader.id} className="mobile-leaderboard-card bg-white border-2 border-black hover:bg-primary/5 transition-all duration-200 overflow-hidden">
                {/* Mobile Card Layout */}
                <div className="block md:hidden">
                  {/* Top Row - Rank, Icon, Name */}
                  <div className="flex items-center gap-3 p-3 border-b border-muted-foreground/20">
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-8 h-8 bg-black text-white font-black text-lg flex items-center justify-center border border-black">
                        {leader.rank}
                      </div>
                      {getRankIcon(leader.rank)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-lg font-black text-foreground truncate">
                        {leader.name}
                      </div>
                      <TechnicalLabel text={`${leader.referrals} REFERRALS`} className="text-muted-foreground text-xs" />
                    </div>
                  </div>

                  {/* Middle Row - Earnings and Status */}
                  <div className="flex items-center justify-between p-3 border-b border-muted-foreground/20">
                    <div className="text-center">
                      <div className="text-xl font-black text-primary mb-1">
                        {formatCurrency(leader.earnings)}
                      </div>
                      <TechnicalLabel text="TOTAL EARNED" className="text-muted-foreground text-xs" />
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-2 justify-center mb-1">
                        <div className={`w-3 h-3 rounded-full ${leader.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <TechnicalLabel text={leader.status} className={`text-xs font-black ${leader.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-600'}`} />
                      </div>
                      <TechnicalLabel text="STATUS" className="text-muted-foreground text-xs" />
                    </div>
                  </div>

                  {/* Bottom Row - Additional Info */}
                  <div className="flex items-center justify-between p-3 text-xs">
                    <TechnicalLabel text={`JOINED ${new Date(leader.joinDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`} className="text-muted-foreground" />
                    <TechnicalLabel text={`RANK #${leader.rank} OF 500+`} className="text-muted-foreground font-black" />
                  </div>
                </div>

                {/* Desktop Layout (Unchanged) */}
                <div className="hidden md:block p-4">
                  <div className="flex items-center justify-between">
                    {/* Left Side - Rank and Name */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-8 h-8 bg-black text-white font-black text-lg flex items-center justify-center border border-black">
                          {leader.rank}
                        </div>
                        {getRankIcon(leader.rank)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-lg font-black text-foreground mb-1">
                          {leader.name}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <TechnicalLabel text={`${leader.referrals} REFERRALS`} className="text-muted-foreground text-xs" />
                          <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                          <TechnicalLabel text={`JOINED ${new Date(leader.joinDate).toLocaleDateString()}`} className="text-muted-foreground text-xs" />
                        </div>
                      </div>
                    </div>

                    {/* Right Side - Rank Info */}
                    <div className="text-right">
                      <div className="text-lg font-black text-primary mb-1">
                        {formatCurrency(leader.earnings)}
                      </div>
                      <TechnicalLabel text="TOTAL EARNED" className="text-muted-foreground text-xs" />
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
              </div>
            ))}
          </div>

        </div>
        {/* Your Referrals Section */}
        {referralsData?.referrals && referralsData.referrals.length > 0 && (
          <div className="mt-6 md:mt-8 wireframe-section p-4 md:p-6">
            <div className="border-b-2 border-black pb-3 md:pb-4 mb-4 md:mb-6">
              <TechnicalLabel text="YOUR NETWORK" className="text-foreground text-sm md:text-lg font-black" />
            </div>

            <div className="grid gap-3 md:gap-4">
              {referralsData.referrals.map((referral, index) => (
                <div key={referral.id} className="referral-network-card wireframe-section p-3 md:p-4 hover:bg-white transition-colors" data-testid={`referral-${referral.id}`}>
                  <div className="flex items-center justify-between flex-col md:flex-row gap-3 md:gap-0">
                    <div className="flex items-center space-x-3 md:space-x-4 w-full md:w-auto">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary to-primary/60 text-white font-black text-sm md:text-lg flex items-center justify-center border-2 border-black flex-shrink-0">
                        {referral.referred.firstName[0]}{referral.referred.lastName[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm md:text-lg font-black text-foreground">
                          {referral.referred.firstName} {referral.referred.lastName}
                        </h3>
                        <TechnicalLabel text={referral.referred.email} className="text-muted-foreground text-xs break-all" />
                        <TechnicalLabel text={`Joined: ${formatDate(referral.referred.createdAt)}`} className="text-muted-foreground text-xs" />
                      </div>
                    </div>
                    <div className="text-center md:text-right w-full md:w-auto">
                      <div className="text-lg md:text-xl font-black text-primary">
                        +{formatCurrency(referral.totalEarned)}
                      </div>
                      <TechnicalLabel text={`TIER ${index + 1}`} className="text-muted-foreground text-xs" />
                      <div className={`status-indicator-mobile inline-block px-2 py-1 text-xs font-semibold border mt-1 ${
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

  // Progressive Payout Section - Dashboard Style
  function renderPayoutSection() {
    // Progressive flow state management
    const [currentStep, setCurrentStep] = useState(1); // 1: Amount, 2: Method, 3: Details
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [selectedMethod, setSelectedMethod] = useState("");
    const [paymentDetails, setPaymentDetails] = useState({
      name: "",
      number: "",
      id: "",
      iban: ""
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // Static transaction history data
    const staticHistoryItems = [
      {
        id: 'history_1',
        date: '2024-01-15T10:30:00.000Z',
        amount: '1250.00',
        method: 'JazzCash',
        status: 'COMPLETED',
        transactionId: 'TX1000001'
      },
      {
        id: 'history_2',
        date: '2024-01-14T14:15:00.000Z',
        amount: '890.50',
        method: 'EasyPaisa',
        status: 'PROCESSING',
        transactionId: 'TX1000002'
      },
      {
        id: 'history_3',
        date: '2024-01-13T09:45:00.000Z',
        amount: '2100.75',
        method: 'Bank Transfer',
        status: 'COMPLETED',
        transactionId: 'TX1000003'
      },
      {
        id: 'history_4',
        date: '2024-01-12T16:20:00.000Z',
        amount: '450.25',
        method: 'JazzCash',
        status: 'PENDING',
        transactionId: 'TX1000004'
      },
      {
        id: 'history_5',
        date: '2024-01-11T11:30:00.000Z',
        amount: '1850.00',
        method: 'EasyPaisa',
        status: 'COMPLETED',
        transactionId: 'TX1000005'
      }
    ];

    // Numeric keypad input handling
    const handleNumberInput = (num: string) => {
      if (withdrawAmount.length < 8) {
        setWithdrawAmount(prev => prev + num);
      }
    };

    const handleClear = () => {
      setWithdrawAmount("");
    };

    const handleBackspace = () => {
      setWithdrawAmount(prev => prev.slice(0, -1));
    };

    // Navigation handlers
    const handleNext = () => {
      if (currentStep === 1 && withdrawAmount && parseFloat(withdrawAmount) >= 100) {
        setCurrentStep(2);
      } else if (currentStep === 2 && selectedMethod) {
        setCurrentStep(3);
      } else if (currentStep === 3) {
        handleSubmit();
      }
    };

    const handleBack = () => {
      if (currentStep > 1) {
        setCurrentStep(currentStep - 1);
      }
    };

    const handleSubmit = async () => {
      setIsProcessing(true);
      // Simulate API call
      setTimeout(() => {
        setIsProcessing(false);
        toast({
          title: "Payout Request Submitted!",
          description: `Your withdrawal of ${formatCurrency(withdrawAmount)} has been submitted for processing.`,
        });
        // Reset form
        setCurrentStep(1);
        setWithdrawAmount("");
        setSelectedMethod("");
        setPaymentDetails({ name: "", number: "", id: "", iban: "" });
      }, 2000);
    };

    // Payment method data
    const paymentMethods = [
      {
        id: 'jazzcash',
        name: 'JAZZ CASH',
        icon: JazzCashIcon,
        description: 'Mobile Wallet Transfer',
        color: 'bg-gradient-to-r from-red-600 to-red-700',
        processing: '2-4 hours'
      },
      {
        id: 'easypaisa',
        name: 'EASY PAISA',
        icon: EasyPaisaIcon,
        description: 'Digital Wallet Service',
        color: 'bg-gradient-to-r from-green-600 to-green-700',
        processing: '2-4 hours'
      },
      {
        id: 'bank',
        name: 'BANK TRANSFER',
        icon: BankTransferIcon,
        description: 'Direct Bank Account',
        color: 'bg-gradient-to-r from-blue-600 to-blue-700',
        processing: '24-48 hours'
      }
    ];

    // Get current step button states
    const canProceed = () => {
      if (currentStep === 1) return withdrawAmount && parseFloat(withdrawAmount) >= 100;
      if (currentStep === 2) return selectedMethod;
      if (currentStep === 3) {
        if (selectedMethod === 'bank') return paymentDetails.iban.trim();
        return paymentDetails.name.trim() && paymentDetails.number.trim() && paymentDetails.id.trim();
      }
      return false;
    };

    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 relative z-10">
        {/* Hero Section - Dashboard Style */}
        <div className="wireframe-border p-4 md:p-8 mb-4 md:mb-8">
          <div className="text-center mb-6 md:mb-8">
            <div className="inline-flex items-center gap-2 bg-black text-white px-3 md:px-4 py-2 border-2 border-black mb-4">
              <Wallet className="w-4 h-4 md:w-5 md:h-5" />
              <TechnicalLabel text="PAYOUT PROTOCOL v4.2" className="text-white text-xs md:text-sm" />
            </div>
            <h1 className="text-xl md:text-4xl lg:text-5xl font-black text-foreground mb-3 md:mb-4 tracking-tighter leading-tight px-1 md:px-2">
              WITHDRAW <span className="text-primary">EARNINGS</span><br />
              SECURE PAYMENTS
            </h1>
            <div className="max-w-3xl mx-auto mb-2">
              <p className="text-xs md:text-lg text-muted-foreground leading-relaxed px-1 md:px-2">
                Fast, secure withdrawals with multiple payment options
              </p>
            </div>
            <Barcode className="w-24 md:w-32 lg:w-48 h-6 md:h-8 lg:h-10 mx-auto opacity-60" />
          </div>
        </div>

        {/* Main Content Area - Single Column Layout for Mobile, Two Column for Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          {/* Main Payout Interface - Full Width on Mobile, 2/3 width on Desktop */}
          <div className="lg:col-span-2">
            <div className="wireframe-border bg-gradient-to-br from-background to-muted/20 p-3 md:p-6 lg:p-8 relative">
              {/* Current Balance Display */}
              <div className="text-center mb-4 md:mb-6 lg:mb-8">
                <div className="mb-3 md:mb-4">
                  <TechnicalLabel text="AVAILABLE BALANCE" className="text-muted-foreground text-xs md:text-sm mb-2" />
                  <div className="text-xl md:text-3xl lg:text-4xl font-black text-primary">
                    {formatCurrency(displayUser?.availableBalance || '0.00')}
                  </div>
                </div>

                {/* Step Indicator - Mobile Optimized */}
                <div className="flex items-center justify-center gap-2 md:gap-4 mb-4 md:mb-6">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center">
                      <div className={`step-indicator w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-black flex items-center justify-center font-black text-xs md:text-sm ${
                        currentStep >= step ? 'bg-primary text-black active' : 'bg-background text-foreground'
                      }`}>
                        {step}
                      </div>
                      {step < 3 && (
                        <div className={`w-6 md:w-12 h-0.5 mx-1 md:mx-2 transition-all duration-300 ${
                          currentStep > step ? 'bg-primary' : 'bg-muted-foreground/30'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step Content Container - Mobile Optimized */}
              <div className="min-h-[300px] md:min-h-[400px] flex flex-col justify-center overflow-hidden">
                {/* Step 1: Amount Input with Numeric Keypad - Mobile Optimized */}
                {currentStep === 1 && (
                  <div className="w-full max-w-sm md:max-w-lg mx-auto px-2 md:px-0">
                    <div className="text-center mb-4 md:mb-8">
                      <TechnicalLabel text="WITHDRAWAL AMOUNT" className="text-foreground mb-3 md:mb-4 text-xs md:text-sm" />
                      <div className="text-2xl md:text-4xl lg:text-5xl font-black text-foreground mb-3 md:mb-4 min-h-[40px] md:min-h-[60px] flex items-center justify-center border-b-2 border-muted-foreground/30 pb-2 md:pb-4">
                        ₨ {withdrawAmount || "0.00"}
                      </div>
                    </div>

                    {/* Enhanced Numeric Keypad - Mobile Responsive */}
                    <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4 md:mb-6 max-w-xs md:max-w-sm mx-auto">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                          key={num}
                          onClick={() => handleNumberInput(num.toString())}
                          className="industrial-keypad-button h-12 md:h-14 lg:h-16 bg-background border-2 border-black text-lg md:text-xl lg:text-2xl font-black text-foreground hover:bg-muted transition-all duration-200 hover:transform hover:scale-105"
                        >
                          {num}
                        </button>
                      ))}
                      <button
                        onClick={() => handleNumberInput("0")}
                        className="industrial-keypad-button h-12 md:h-14 lg:h-16 bg-background border-2 border-black text-lg md:text-xl lg:text-2xl font-black text-foreground hover:bg-muted transition-all duration-200 hover:transform hover:scale-105 col-span-2"
                      >
                        0
                      </button>
                      <button
                        onClick={handleBackspace}
                        className="industrial-keypad-button h-12 md:h-14 lg:h-16 bg-destructive/10 border-2 border-destructive text-destructive hover:bg-destructive/20 transition-all duration-200 hover:transform hover:scale-105 flex items-center justify-center"
                      >
                        ⌫
                      </button>
                    </div>

                    {/* Clear Button - Mobile Optimized */}
                    <div className="text-center mb-4 md:mb-6">
                      <button
                        onClick={handleClear}
                        className="border-2 border-black bg-background hover:bg-black hover:text-white px-4 md:px-6 py-2 text-xs md:text-sm font-black transition-colors"
                      >
                        CLEAR ALL
                      </button>
                    </div>

                    {/* Minimum Amount Notice */}
                    <div className="text-center text-xs md:text-sm text-muted-foreground">
                      <TechnicalLabel text="MINIMUM WITHDRAWAL: ₨ 100" className="text-muted-foreground" />
                    </div>
                  </div>
                )}

                {/* Step 2: Payment Method Selection - Mobile Optimized */}
                {currentStep === 2 && (
                  <div className="w-full max-w-lg md:max-w-2xl mx-auto px-2 md:px-0">
                    <div className="text-center mb-4 md:mb-8">
                      <TechnicalLabel text="SELECT PAYMENT METHOD" className="text-foreground mb-3 md:mb-4 text-xs md:text-sm" />
                      <div className="text-lg md:text-xl lg:text-2xl font-black text-primary mb-2">
                        Withdrawing {formatCurrency(withdrawAmount)}
                      </div>
                    </div>

                    <div className="grid gap-3 md:gap-4 mb-4 md:mb-6">
                      {paymentMethods.map((method) => {
                        const IconComponent = method.icon;
                        const isSelected = selectedMethod === method.id;

                        return (
                          <button
                            key={method.id}
                            onClick={() => setSelectedMethod(method.id)}
                            className={`payment-method-selection-card group flex items-center p-3 md:p-4 lg:p-6 border-2 w-full ${
                              isSelected
                                ? 'border-primary bg-primary/10 selected'
                                : 'border-black bg-background'
                            }`}
                          >
                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center mr-3 md:mr-4 ${
                              isSelected ? 'bg-white/90 border-2 border-primary shadow-lg' : 'bg-white/50 border border-muted-foreground/20'
                            }`}>
                              <IconComponent className={`w-6 h-6 md:w-8 md:h-8 transition-all duration-300 ${
                                isSelected ? 'scale-110' : 'scale-100'
                              }`} />
                            </div>
                            <div className="flex-1 text-left">
                              <TechnicalLabel
                                text={method.name}
                                className={`font-black text-xs md:text-sm mb-1 ${
                                  isSelected ? 'text-primary' : 'text-foreground'
                                }`}
                              />
                              <div className="text-xs text-muted-foreground">{method.description}</div>
                              <div className="text-xs text-muted-foreground">Processing: {method.processing}</div>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Step 3: Payment Details Input - Mobile Optimized */}
                {currentStep === 3 && (
                  <div className="w-full max-w-sm md:max-w-lg mx-auto px-2 md:px-0">
                    <div className="text-center mb-4 md:mb-8">
                      <TechnicalLabel text="ENTER PAYMENT DETAILS" className="text-foreground mb-3 md:mb-4 text-xs md:text-sm" />
                      <div className="text-base md:text-lg lg:text-xl font-black text-primary mb-2">
                        {paymentMethods.find(m => m.id === selectedMethod)?.name}
                      </div>
                      <div className="text-sm md:text-base lg:text-lg text-foreground">
                        {formatCurrency(withdrawAmount)}
                      </div>
                    </div>

                    <div className="space-y-4 md:space-y-6">
                      {selectedMethod === 'bank' ? (
                        <div>
                          <TechnicalLabel text="BANK IBAN" className="text-foreground mb-2 md:mb-3 text-xs md:text-sm font-black" />
                          <Input
                            type="text"
                            value={paymentDetails.iban}
                            onChange={(e) => setPaymentDetails(prev => ({...prev, iban: e.target.value}))}
                            placeholder="PK36 SCBL 0000 0011 2345 6702"
                            className="industrial-input h-12 md:h-14 text-sm md:text-base border-2 border-black"
                          />
                        </div>
                      ) : (
                        <>
                          <div>
                            <TechnicalLabel text="FULL NAME" className="text-foreground mb-2 md:mb-3 text-xs md:text-sm font-black" />
                            <Input
                              type="text"
                              value={paymentDetails.name}
                              onChange={(e) => setPaymentDetails(prev => ({...prev, name: e.target.value}))}
                              placeholder="Enter Full Name"
                              className="industrial-input h-12 md:h-14 text-sm md:text-base border-2 border-black"
                            />
                          </div>

                          <div>
                            <TechnicalLabel text="MOBILE NUMBER" className="text-foreground mb-2 md:mb-3 text-xs md:text-sm font-black" />
                            <Input
                              type="text"
                              value={paymentDetails.number}
                              onChange={(e) => setPaymentDetails(prev => ({...prev, number: e.target.value}))}
                              placeholder="03XXXXXXXXX"
                              className="industrial-input h-12 md:h-14 text-sm md:text-base border-2 border-black"
                            />
                          </div>

                          <div>
                            <TechnicalLabel text="CNIC / ID NUMBER" className="text-foreground mb-2 md:mb-3 text-xs md:text-sm font-black" />
                            <Input
                              type="text"
                              value={paymentDetails.id}
                              onChange={(e) => setPaymentDetails(prev => ({...prev, id: e.target.value}))}
                              placeholder="XXXXX-XXXXXXX-X"
                              className="industrial-input h-12 md:h-14 text-sm md:text-base border-2 border-black"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Buttons - Mobile Optimized */}
              <div className="border-t-2 border-black pt-4 md:pt-6 mt-4 md:mt-8">
                <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 md:gap-0">
                  <div className="flex gap-2 md:gap-3 justify-center md:justify-start">
                    {currentStep > 1 && (
                      <Button
                        onClick={handleBack}
                        variant="outline"
                        className="border-2 border-black text-foreground hover:bg-black hover:text-white px-4 md:px-6 py-2 md:py-3 font-black text-sm md:text-base"
                      >
                        <ChevronLeft className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                        BACK
                      </Button>
                    )}
                  </div>

                  <Button
                    onClick={handleNext}
                    disabled={!canProceed() || isProcessing}
                    className="bg-primary hover:bg-primary/80 text-black px-6 md:px-8 py-2 md:py-3 font-black border-2 border-black text-sm md:text-base"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 animate-spin" />
                        <span className="text-xs md:text-base">PROCESSING...</span>
                      </>
                    ) : currentStep === 3 ? (
                      <>
                        <Zap className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                        <span className="text-xs md:text-base">SUBMIT REQUEST</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs md:text-base">CONTINUE</span>
                        <ChevronRight className="w-3 h-3 md:w-4 md:h-4 ml-1 md:ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Side Panel - Hidden on Mobile, Visible on Desktop */}
          <div className="hidden lg:block lg:col-span-1 space-y-6">
            {/* Quick Stats */}
            <div className="wireframe-border p-4 md:p-6">
              <TechnicalLabel text="PAYOUT STATISTICS" className="text-foreground font-black text-sm mb-4" />
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-lg md:text-xl font-black text-primary">
                    {formatCurrency(displayUser?.totalEarnings || '0.00')}
                  </div>
                  <TechnicalLabel text="TOTAL EARNED" className="text-muted-foreground text-xs" />
                </div>
                <div className="text-center">
                  <div className="text-lg md:text-xl font-black text-foreground">
                    {formatCurrency(displayUser?.availableBalance || '0.00')}
                  </div>
                  <TechnicalLabel text="AVAILABLE NOW" className="text-muted-foreground text-xs" />
                </div>
                <div className="text-center">
                  <div className="text-lg md:text-xl font-black text-muted-foreground">
                    ₨ 15.00
                  </div>
                  <TechnicalLabel text="PROCESSING FEE" className="text-muted-foreground text-xs" />
                </div>
              </div>
            </div>

            {/* Professional History Button */}
            <div className="wireframe-border p-4 md:p-6">
              <TechnicalLabel text="TRANSACTION HISTORY" className="text-foreground font-black text-sm mb-4" />
              <Button
                onClick={() => setShowHistory(!showHistory)}
                variant="outline"
                className="w-full border-2 border-black text-foreground hover:bg-black hover:text-white py-3 font-black"
              >
                <History className="w-4 h-4 mr-2" />
                {showHistory ? 'HIDE HISTORY' : 'VIEW HISTORY'}
              </Button>

              {showHistory && (
                <div className="mt-4 max-h-60 overflow-y-auto border-t-2 border-black pt-4">
                  <div className="space-y-3">
                    {staticHistoryItems.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="p-3 border border-muted-foreground/20 bg-muted/10 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <TechnicalLabel text={item.method} className="text-foreground font-black text-xs" />
                          <div className={`w-2 h-2 rounded-full ${
                            item.status === 'COMPLETED' ? 'bg-green-500' :
                            item.status === 'PROCESSING' ? 'bg-yellow-500' : 'bg-orange-500'
                          }`} />
                        </div>
                        <div className="text-sm font-black text-primary mb-1">{formatCurrency(item.amount)}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(item.date)}</div>
                      </div>
                    ))}
                  </div>
                  {staticHistoryItems.length > 3 && (
                    <div className="text-center mt-3">
                      <TechnicalLabel text={`+${staticHistoryItems.length - 3} MORE TRANSACTIONS`} className="text-muted-foreground text-xs" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Help & Support */}
            <div className="wireframe-border p-4 md:p-6">
              <TechnicalLabel text="NEED HELP?" className="text-foreground font-black text-sm mb-4" />
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground leading-relaxed">
                  • Minimum withdrawal: ₨ 100<br />
                  • Processing time: 2-48 hours<br />
                  • Processing fee: ₨ 15.00<br />
                  • 24/7 customer support
                </div>
                <Button
                  variant="outline"
                  className="w-full border-2 border-black text-foreground hover:bg-black hover:text-white py-2 font-black text-xs"
                  onClick={() => navigateToSection(4)} // Navigate to help section
                >
                  <HelpCircle className="w-3 h-3 mr-2" />
                  GET SUPPORT
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Transaction History - Show Below Main Interface */}
        <div className="lg:hidden mt-6">
          <div className="wireframe-border p-3 md:p-4">
            <TechnicalLabel text="TRANSACTION HISTORY" className="text-foreground font-black text-sm mb-4" />
            <Button
              onClick={() => setShowHistory(!showHistory)}
              variant="outline"
              className="w-full border-2 border-black text-foreground hover:bg-black hover:text-white py-2 md:py-3 font-black text-sm"
            >
              <History className="w-3 h-3 md:w-4 md:h-4 mr-2" />
              {showHistory ? 'HIDE HISTORY' : 'VIEW HISTORY'}
            </Button>

            {showHistory && (
              <div className="mt-4 max-h-64 overflow-y-auto border-t-2 border-black pt-4">
                <div className="space-y-3">
                  {staticHistoryItems.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border border-muted-foreground/20 bg-muted/10 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <TechnicalLabel text={item.method} className="text-foreground font-black text-xs" />
                        <div className={`w-2 h-2 rounded-full ${
                          item.status === 'COMPLETED' ? 'bg-green-500' :
                          item.status === 'PROCESSING' ? 'bg-yellow-500' : 'bg-orange-500'
                        }`} />
                      </div>
                      <div className="text-sm font-black text-primary mb-1">{formatCurrency(item.amount)}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(item.date)}</div>
                      <div className="text-xs text-muted-foreground">#{item.transactionId}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Help Section
  function renderHelpSection() {
    const [activeHelpTab, setActiveHelpTab] = useState("guide");
    const [chatMessages, setChatMessages] = useState([
      {
        id: 1,
        text: "Hello! Welcome to THORX Support. How can I assist you today?",
        sender: "support",
        timestamp: new Date(Date.now() - 5000).toISOString(),
        avatar: "TS"
      }
    ]);
    const [newMessage, setNewMessage] = useState("");
    const [contactForm, setContactForm] = useState({
      name: "",
      email: "",
      description: ""
    });
    const [isContactSubmitting, setIsContactSubmitting] = useState(false);

    // Chat functionality with Telegram/WhatsApp style
    const sendMessage = () => {
      if (!newMessage.trim()) return;

      const userMessage = {
        id: chatMessages.length + 1,
        text: newMessage,
        sender: "user",
        timestamp: new Date().toISOString(),
        avatar: displayUser?.firstName?.charAt(0).toUpperCase() || "U"
      };

      setChatMessages(prev => [...prev, userMessage]);
      setNewMessage("");

      // Simulate support response with typing indicator
      setTimeout(() => {
        const responses = [
          "Thanks for reaching out! Let me help you with that right away.",
          "I understand your question. Here's what you need to know...",
          "Great question! I'm here to provide you with the best solution.",
          "I'm on it! Let me walk you through this step by step.",
          "Perfect! I can definitely help you resolve this issue."
        ];

        const supportMessage = {
          id: chatMessages.length + 2,
          text: responses[Math.floor(Math.random() * responses.length)],
          sender: "support",
          timestamp: new Date().toISOString(),
          avatar: "TS"
        };

        setChatMessages(prev => [...prev, supportMessage]);
      }, 1500);
    };

    // Contact form submission
    const handleContactSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!contactForm.name || !contactForm.email || !contactForm.description) {
        toast({
          title: "Missing Information",
          description: "Please fill in all fields before sending.",
          variant: "destructive"
        });
        return;
      }

      setIsContactSubmitting(true);

      try {
        const response = await apiRequest("POST", "/api/contact", contactForm);

        if (response.ok) {
          toast({
            title: "Message Sent Successfully!",
            description: "Our team will get back to you within 24 hours.",
          });
          setContactForm({ name: "", email: "", description: "" });
        } else {
          throw new Error("Failed to send message");
        }
      } catch (error) {
        console.error("Contact form error:", error);
        toast({
          title: "Failed to Send Message",
          description: "Please try again or contact us directly.",
          variant: "destructive"
        });
      } finally {
        setIsContactSubmitting(false);
      }
    };

    const formatTime = (timestamp: string) => {
      return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    // Help section options for dropdown
    const helpSectionOptions = [
      { id: "guide", label: "AREA GUIDE", icon: Book },
      { id: "help", label: "AREA HELP", icon: MessageCircle },
      { id: "contact", label: "AREA CONTACT", icon: Phone }
    ];

    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 relative z-10">
        {/* Hero Section - Dashboard Style */}
        <div className="wireframe-border p-4 md:p-8 mb-4 md:mb-8">
          <div className="text-center mb-6 md:mb-8">
            <div className="inline-flex items-center gap-2 bg-black text-white px-3 md:px-4 py-2 border-2 border-black mb-4">
              <LifeBuoy className="w-4 h-4 md:w-5 md:h-5" />
              <TechnicalLabel text="HELP PROTOCOL v3.21" className="text-white text-xs md:text-sm" />
            </div>
            <h1 className="text-xl md:text-4xl lg:text-5xl font-black text-foreground mb-3 md:mb-4 tracking-tighter leading-tight px-1 md:px-2">
              GET <span className="text-primary">SUPPORT</span><br />
              INSTANT ASSISTANCE
            </h1>
            <div className="max-w-3xl mx-auto mb-2">
              <p className="text-xs md:text-lg text-muted-foreground leading-relaxed px-1 md:px-2">
                Professional support, instant solutions, comprehensive guidance
              </p>
            </div>
            <Barcode className="w-24 md:w-32 lg:w-48 h-6 md:h-8 lg:h-10 mx-auto opacity-60" />
          </div>
        </div>

        {/* Navigation and Content */}
        <div className="max-w-7xl mx-auto mb-6 md:mb-8">
          <div className="split-card bg-white border-3 border-black p-3 md:p-6 lg:p-8 help-section-content">
            {/* Desktop: Tabs, Mobile: Dropdown */}
            <div className="w-full">
              {/* Desktop Navigation */}
              <div className="hidden md:block">
                <Tabs value={activeHelpTab} onValueChange={setActiveHelpTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-4 md:mb-6 bg-muted border-2 border-black h-10 md:h-12">
                    <TabsTrigger
                      value="guide"
                      className="help-tab-button data-[state=active]:bg-black data-[state=active]:text-white font-black text-xs md:text-base h-full flex items-center justify-center px-1 md:px-2"
                    >
                      AREA GUIDE
                    </TabsTrigger>
                    <TabsTrigger
                      value="help"
                      className="help-tab-button data-[state=active]:bg-black data-[state=active]:text-white font-black text-xs md:text-base h-full flex items-center justify-center px-1 md:px-2"
                    >
                      AREA HELP
                    </TabsTrigger>
                    <TabsTrigger
                      value="contact"
                      className="help-tab-button data-[state=active]:bg-black data-[state=active]:text-white font-black text-xs md:text-base h-full flex items-center justify-center px-1 md:px-2"
                    >
                      AREA CONTACT
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Mobile Navigation Dropdown - Industrial Theme */}
              <div className="md:hidden mb-4 help-dropdown-container">
                <div className="help-dropdown-wrapper">
                  <select
                    value={activeHelpTab}
                    onChange={(e) => setActiveHelpTab(e.target.value)}
                    className="help-dropdown-industrial"
                  >
                    {helpSectionOptions.map((option) => (
                      <option key={option.id} value={option.id} className="font-black bg-white text-black">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tab Content */}
              <div className="mt-4 md:mt-6 help-main-content">
                {/* Area Guide - FAQ Section Style */}
                {activeHelpTab === "guide" && (
                  <div className="mt-0">
                    {/* Section Heading */}
                    <div className="text-center mb-6 md:mb-8">
                      <h3 className="text-lg md:text-2xl lg:text-3xl font-black text-foreground tracking-tight">
                        FREQUENTLY ASKED <span className="text-primary">QUESTIONS</span>
                      </h3>
                      <TechnicalLabel text="INSTANT ANSWERS TO YOUR THORX QUERIES" className="text-muted-foreground text-xs md:text-sm mt-2" />
                    </div>

                    {/* FAQ Items - Landing Page Style */}
                    <div className="space-y-4 md:space-y-6">
                      {[
                        {
                          id: "001",
                          protocol: "PLATFORM-INIT",
                          question: "How do I start earning on THORX?",
                          answer: "Simply register your account, verify your email, navigate to the Work section, and start watching advertisements. Each completed ad earns you instant rewards."
                        },
                        {
                          id: "002",
                          protocol: "PAYMENT-PROC",
                          question: "What is the minimum withdrawal amount?",
                          answer: "The minimum withdrawal is PKR 100.00. We charge a processing fee of PKR 15.00 for each transaction to cover payment gateway costs."
                        },
                        {
                          id: "003",
                          protocol: "SECURITY-VER",
                          question: "How long do withdrawals take to process?",
                          answer: "Standard withdrawals are processed within 24-48 hours. JazzCash and EasyPaisa transfers are usually completed within 2-4 hours during business days."
                        },
                        {
                          id: "004",
                          protocol: "NETWORK-GROWTH",
                          question: "How does the referral system work?",
                          answer: "Share your unique referral code with friends. You earn 25% commission on all their earnings forever. There's no limit to how much you can earn through referrals."
                        },
                        {
                          id: "005",
                          protocol: "SECURITY-VER",
                          question: "Is my personal information secure?",
                          answer: "Yes, we use 256-bit encryption and follow international security standards. Your data is protected with bank-level security protocols."
                        },
                        {
                          id: "006",
                          protocol: "PLATFORM-INIT",
                          question: "Can I use THORX on mobile devices?",
                          answer: "Absolutely! THORX is fully responsive and optimized for smartphones and tablets. You can earn anywhere, anytime."
                        }
                      ].map((faq) => (
                        <div
                          key={faq.id}
                          className="split-card bg-background relative group transition-all duration-500"
                        >
                          {/* Protocol Header */}
                          <div className="px-4 md:px-8 py-3 md:py-4 bg-primary text-primary-foreground border-b-[3px] border-black">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 md:gap-4">
                                <TechnicalLabel text={`FAQ-${faq.id}`} className="text-white text-xs md:text-sm" />
                                <TechnicalLabel text={faq.protocol} className="text-white opacity-80 text-xs" />
                              </div>
                              <div className="w-12 md:w-16 h-3 md:h-4 opacity-60">
                                <Barcode />
                              </div>
                            </div>
                          </div>

                          {/* Protocol Content */}
                          <div className="bg-background p-4 md:p-6">
                            <div className="mb-3 md:mb-4">
                              <h4 className="text-base md:text-xl lg:text-2xl font-bold text-foreground leading-tight">
                                {faq.question}
                              </h4>
                            </div>
                            <div className="text-foreground text-sm md:text-base leading-relaxed bg-muted p-3 md:p-6 border-l-4 border-primary">
                              {faq.answer}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t-2 border-black text-center">
                      <TechnicalLabel text="NEED MORE HELP? USE AREA HELP FOR LIVE CHAT OR AREA CONTACT FOR DIRECT SUPPORT" className="text-muted-foreground text-xs md:text-sm" />
                    </div>
                  </div>
                )}

                {/* Area Help - Telegram/WhatsApp Style Chat */}
                {activeHelpTab === "help" && (
                  <div className="mt-0 chat-section-wrapper">
                    <div className="bg-white border-2 border-black overflow-hidden">
                      {/* Chat Messages - WhatsApp Style */}
                      <div className="chat-container bg-[#f0f2f5] min-h-[300px] md:min-h-[500px] p-3 md:p-4 space-y-2 md:space-y-3 overflow-y-auto">
                        {chatMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex items-end gap-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            {message.sender === 'support' && (
                              <div className="w-6 h-6 md:w-8 md:h-8 bg-primary text-black rounded-full flex items-center justify-center text-xs md:text-sm font-black mb-1 flex-shrink-0">
                                {message.avatar}
                              </div>
                            )}

                            <div
                              className={`chat-message max-w-[80%] md:max-w-[70%] px-3 md:px-4 py-2 md:py-3 rounded-lg shadow-sm ${
                                message.sender === 'user'
                                  ? 'bg-primary text-black ml-auto'
                                  : 'bg-white text-black border border-gray-200'
                              }`}
                            >
                              <p className="text-xs md:text-sm font-medium mb-1 break-words">{message.text}</p>
                              <p className={`text-xs ${message.sender === 'user' ? 'text-black/60' : 'text-gray-500'} text-right`}>
                                {formatTime(message.timestamp)}
                              </p>
                            </div>

                            {message.sender === 'user' && (
                              <div className="w-6 h-6 md:w-8 md:h-8 bg-black text-white rounded-full flex items-center justify-center text-xs md:text-sm font-black mb-1 flex-shrink-0">
                                {message.avatar}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Chat Input - Modern Style with Enhanced Mobile Support */}
                      <div className="chat-input-wrapper bg-white border-t-2 border-black p-3 md:p-4">
                        <div className="chat-input-container flex items-center gap-2 md:gap-3">
                          <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type your message..."
                            className="chat-input flex-1 bg-gray-100 border-2 border-gray-300 text-black px-3 md:px-4 py-2 md:py-3 rounded-lg focus:outline-none focus:border-primary placeholder-gray-500 font-medium text-sm md:text-base min-h-[44px]"
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                          />
                          <Button
                            onClick={sendMessage}
                            className="chat-send-button bg-primary hover:bg-primary/90 text-black px-3 md:px-6 py-2 md:py-3 font-black border-2 border-black rounded-lg min-w-[60px] min-h-[44px] flex-shrink-0"
                            disabled={!newMessage.trim()}
                          >
                            <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
                          </Button>
                        </div>
                        <div className="chat-input-help-text mt-2 text-center">
                          <TechnicalLabel text="Press Enter to send • Our support team is standing by 24/7" className="text-gray-500 text-xs" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Area Contact - Registration Form Style */}
                {activeHelpTab === "contact" && (
                  <div className="mt-0">
                    <div className="text-center mb-6">
                      <TechnicalLabel text="DIRECT TEAM CONTACT" className="mb-2" />
                      <h3 className="text-2xl md:text-3xl font-black text-black">SEND US A MESSAGE</h3>
                    </div>

                    <div className="contact-form-container max-w-2xl mx-auto">
                      <form onSubmit={handleContactSubmit} className="space-y-6">
                        <div>
                          <TechnicalLabel text="FULL NAME" className="mb-3 font-black" />
                          <div className="relative">
                            <Input
                              type="text"
                              required
                              value={contactForm.name}
                              onChange={(e) => setContactForm(prev => ({...prev, name: e.target.value}))}
                              className="contact-form-input border-2 border-black text-base md:text-lg py-3 md:py-3 min-h-[44px] rounded"
                            />
                            {!contactForm.name && (
                              <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                                <AnimatedPlaceholder examples={['John Doe', 'Ahmed Khan', 'Sarah Wilson']} />
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <TechnicalLabel text="EMAIL ADDRESS" className="mb-3 font-black" />
                          <div className="relative">
                            <Input
                              type="email"
                              required
                              value={contactForm.email}
                              onChange={(e) => setContactForm(prev => ({...prev, email: e.target.value}))}
                              className="contact-form-input border-2 border-black text-base md:text-lg py-3 md:py-3 min-h-[44px] rounded"
                            />
                            {!contactForm.email && (
                              <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                                <AnimatedPlaceholder examples={['your.email@gmail.com', 'contact@thorx.com', 'support@example.com']} />
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <TechnicalLabel text="PROBLEM / DESCRIPTION" className="mb-3 font-black" />
                          <div className="relative">
                            <textarea
                              required
                              rows={isMobile ? 5 : 6}
                              value={contactForm.description}
                              onChange={(e) => setContactForm(prev => ({...prev, description: e.target.value}))}
                              className="contact-form-textarea flex w-full border-2 border-black bg-background px-3 py-3 text-base md:text-lg ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-vertical rounded min-h-[140px] line-height-relaxed"
                              placeholder=""
                            />
                            {!contactForm.description && (
                              <div className="absolute top-3 left-3 pointer-events-none text-muted-foreground">
                                <AnimatedPlaceholder examples={['Describe your issue in detail...', 'Tell us what happened...', 'How can we help you today?']} />
                              </div>
                            )}
                          </div>
                        </div>

                        <Button
                          type="submit"
                          disabled={isContactSubmitting}
                          className="contact-form-submit w-full bg-black text-white text-base md:text-xl font-black py-4 hover:bg-primary hover:text-black transition-colors border-2 border-black disabled:opacity-50 min-h-[50px] flex items-center justify-center rounded"
                        >
                          {isContactSubmitting ? (
                            <span className="flex items-center justify-center">
                              <RefreshCw className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3 animate-spin" />
                              <span className="text-sm md:text-base">SENDING MESSAGE...</span>
                            </span>
                          ) : (
                            <span className="text-sm md:text-base">SEND MESSAGE TO TEAM →</span>
                          )}
                        </Button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}