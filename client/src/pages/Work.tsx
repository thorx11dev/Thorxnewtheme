import { useState, useEffect } from "react";
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
  Play, 
  Pause, 
  Square, 
  Eye, 
  Clock, 
  DollarSign, 
  TrendingUp,
  BarChart3,
  ArrowLeft,
  CheckCircle,
  Target,
  Zap,
  Award,
  ChevronRight,
  ChevronLeft,
  Timer,
  PlayCircle,
  PauseCircle,
  StopCircle,
  FastForward,
  RotateCcw,
  TrendingDown,
  Calendar,
  Settings
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend
} from 'recharts';

interface AdItem {
  id: string;
  title: string;
  type: "video" | "banner" | "interactive";
  duration: number; // in seconds
  reward: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  thumbnail?: string;
}

// Enhanced ad data with more variety
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
  {
    id: "ad_005",
    title: "INVESTMENT OPPORTUNITY",
    type: "banner",
    duration: 10,
    reward: "0.75",
    description: "Quick banner ad for investment platform",
    difficulty: "easy",
    category: "Finance",
  },
  {
    id: "ad_006",
    title: "TRAVEL BOOKING SITE",
    type: "interactive",
    duration: 60,
    reward: "5.00",
    description: "Premium interactive travel booking experience",
    difficulty: "hard",
    category: "Travel",
  },
];

export default function Work() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Enhanced state management
  const [selectedAd, setSelectedAd] = useState<AdItem | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [watchProgress, setWatchProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedAds, setCompletedAds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("ads");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");

  // Get today's ad views count
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

  // Enhanced ad watching timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isWatching && selectedAd && watchProgress < 100) {
      interval = setInterval(() => {
        setWatchProgress(prev => {
          const newProgress = prev + (100 / selectedAd.duration);
          if (newProgress >= 100) {
            setIsWatching(false);
            setIsCompleted(true);
            
            // Record completed ad view
            recordAdViewMutation.mutate({
              adId: selectedAd.id,
              adType: selectedAd.type,
              duration: selectedAd.duration,
              completed: true,
              earnedAmount: selectedAd.reward,
            });
            
            // Add to completed ads
            setCompletedAds(prev => new Set([...prev, selectedAd.id]));
            
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: string) => {
    return `PKR ${parseFloat(amount).toFixed(2)}`;
  };

  const getAdTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return '🎥';
      case 'banner':
        return '📰';
      case 'interactive':
        return '🎮';
      default:
        return '📺';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'hard':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const startWatching = (ad: AdItem) => {
    setSelectedAd(ad);
    setWatchProgress(0);
    setIsCompleted(false);
    setIsWatching(true);
  };

  const pauseWatching = () => setIsWatching(false);
  const resumeWatching = () => {
    if (selectedAd && watchProgress < 100) {
      setIsWatching(true);
    }
  };

  const stopWatching = () => {
    setIsWatching(false);
    setSelectedAd(null);
    setWatchProgress(0);
    setIsCompleted(false);
  };

  const dailyLimit = 50;
  const remainingAds = dailyLimit - (todayAdViews?.count || 0);

  // Filter ads based on selections
  const filteredAds = availableAds.filter(ad => {
    const categoryMatch = selectedCategory === "all" || ad.category.toLowerCase() === selectedCategory.toLowerCase();
    const difficultyMatch = selectedDifficulty === "all" || ad.difficulty === selectedDifficulty;
    return categoryMatch && difficultyMatch;
  });

  // Mock data for charts
  const dailyProgressData = [
    { hour: '9AM', ads: 2, earnings: 3.5 },
    { hour: '10AM', ads: 3, earnings: 5.25 },
    { hour: '11AM', ads: 4, earnings: 7.0 },
    { hour: '12PM', ads: 2, earnings: 3.75 },
    { hour: '1PM', ads: 5, earnings: 8.25 },
    { hour: '2PM', ads: 3, earnings: 5.5 },
    { hour: '3PM', ads: 4, earnings: 6.75 }
  ];

  const categoryData = [
    { name: 'Finance', ads: 8, earnings: 15.25, color: '#000000' },
    { name: 'Gaming', ads: 12, earnings: 18.75, color: '#ff6b35' },
    { name: 'Shopping', ads: 6, earnings: 12.50, color: '#f7931e' },
    { name: 'Health', ads: 4, earnings: 8.25, color: '#004CFF' },
    { name: 'Travel', ads: 2, earnings: 6.00, color: '#8B5CF6' }
  ];

  const performanceData = [
    { name: 'Completion Rate', value: 85, fill: '#22C55E' },
    { name: 'Remaining', value: 15, fill: '#E5E7EB' }
  ];

  return (
    <div className="work-page min-h-screen">
      {/* Industrial Grid Overlay */}
      <div className="industrial-grid" />

      {/* Enhanced Navigation Header */}
      <nav className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur border-b-3 border-black" data-testid="work-navigation">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Left Section with Breadcrumb Navigation */}
            <div className="flex items-center space-x-2 md:space-x-4">
              <button
                onClick={() => setLocation("/dashboard")}
                className="bg-black text-white px-2 py-1 md:px-4 md:py-2 border-2 border-black hover:bg-primary transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
                data-testid="button-back-dashboard"
              >
                <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" />
                <TechnicalLabel text="DASHBOARD" className="text-white text-xs md:text-sm" />
              </button>
              <ChevronRight className="w-4 h-4 text-black" />
              <div className="bg-primary text-white px-2 py-1 md:px-4 md:py-2 border-2 border-black">
                <TechnicalLabel text="WORK CENTER" className="text-white text-xs md:text-sm" />
              </div>
            </div>
            
            {/* Center Section */}
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              <h1 className="text-xl md:text-2xl font-black tracking-tighter">WORK CENTER</h1>
            </div>
            
            {/* Right Section with Stats */}
            <div className="flex items-center">
              <div className="bg-white border-2 border-black px-2 py-1 md:px-4 md:py-2">
                <div className="text-xs md:text-sm">
                  <TechnicalLabel text="TODAY'S PROGRESS" />
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <TechnicalLabel text={`${todayAdViews?.count || 0}/${dailyLimit}`} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-20 md:pt-24 pb-8">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* Enhanced Header Section */}
          <div className="text-center mb-8 md:mb-12">
            <div className="mb-2">
              <TechnicalLabel text="ADVERTISEMENT VIEWING SYSTEM" />
            </div>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-black mb-4">
              EARN BY WATCHING
            </h2>
            <Barcode className="w-32 md:w-48 h-8 md:h-10 mx-auto mb-6" />
            
            {/* Performance Summary */}
            <div className="bg-gradient-to-r from-black to-primary text-white p-4 border-2 border-black mb-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-black">{completedAds.size}</div>
                  <div className="text-sm">COMPLETED TODAY</div>
                </div>
                <div>
                  <div className="text-2xl font-black">{formatCurrency((completedAds.size * 2.5).toString())}</div>
                  <div className="text-sm">EARNED TODAY</div>
                </div>
                <div>
                  <div className="text-2xl font-black">{Math.round((completedAds.size / dailyLimit) * 100)}%</div>
                  <div className="text-sm">DAILY GOAL</div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 md:mb-12">
            <Card className="split-card bg-black text-white border-3 border-black relative overflow-hidden group hover:shadow-lg transition-all">
              <CardContent className="p-4">
                <div className="absolute top-2 right-2">
                  <Eye className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </div>
                <div className="space-y-1">
                  <TechnicalLabel text="TODAY'S VIEWS" className="text-white/80 text-xs" />
                  <div className="text-2xl font-black">
                    {todayAdViews?.count || 0}
                  </div>
                  <Progress value={(todayAdViews?.count || 0) / dailyLimit * 100} className="h-1" />
                </div>
              </CardContent>
            </Card>

            <Card className="split-card bg-primary text-white border-3 border-black relative overflow-hidden group hover:shadow-lg transition-all">
              <CardContent className="p-4">
                <div className="absolute top-2 right-2">
                  <Clock className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </div>
                <div className="space-y-1">
                  <TechnicalLabel text="REMAINING" className="text-white/80 text-xs" />
                  <div className="text-2xl font-black">
                    {remainingAds}
                  </div>
                  <div className="text-xs">ads left today</div>
                </div>
              </CardContent>
            </Card>

            <Card className="split-card bg-white text-black border-3 border-black relative overflow-hidden group hover:shadow-lg transition-all">
              <CardContent className="p-4">
                <div className="absolute top-2 right-2">
                  <Target className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                </div>
                <div className="space-y-1">
                  <TechnicalLabel text="COMPLETION RATE" className="text-xs" />
                  <div className="text-2xl font-black text-green-600">
                    85%
                  </div>
                  <div className="text-xs text-green-600">excellent</div>
                </div>
              </CardContent>
            </Card>

            <Card className="split-card bg-secondary text-black border-3 border-black relative overflow-hidden group hover:shadow-lg transition-all">
              <CardContent className="p-4">
                <div className="absolute top-2 right-2">
                  <Award className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                </div>
                <div className="space-y-1">
                  <TechnicalLabel text="TODAY'S EARNINGS" className="text-xs" />
                  <div className="text-2xl font-black text-primary">
                    {formatCurrency((completedAds.size * 2.5).toString())}
                  </div>
                  <div className="text-xs">keep earning!</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Ad Player Section */}
          {selectedAd && (
            <div className="mb-8 md:mb-12">
              <Card className="border-3 border-black bg-gradient-to-br from-black to-gray-800 text-white" data-testid="ad-player">
                <CardHeader className="bg-black text-white border-b border-gray-600">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="text-2xl">{getAdTypeIcon(selectedAd.type)}</span>
                      {selectedAd.title}
                      <span className={`text-xs px-2 py-1 rounded ${getDifficultyColor(selectedAd.difficulty)}`}>
                        {selectedAd.difficulty.toUpperCase()}
                      </span>
                    </span>
                    <span className="text-primary font-black text-xl">PKR {selectedAd.reward}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Enhanced Ad Display with Animation */}
                  <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 text-white p-8 rounded-lg mb-6 text-center min-h-[250px] flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 animate-pulse" />
                    <div className="space-y-4 relative z-10">
                      <div className="text-6xl animate-bounce">{getAdTypeIcon(selectedAd.type)}</div>
                      <h3 className="text-3xl font-bold">{selectedAd.title}</h3>
                      <p className="text-gray-300 max-w-md">{selectedAd.description}</p>
                      <div className="flex items-center justify-center gap-4 text-sm">
                        <span className="bg-white/20 px-3 py-1 rounded">{selectedAd.category}</span>
                        <span className="bg-primary/30 px-3 py-1 rounded">{selectedAd.type.toUpperCase()}</span>
                      </div>
                      {isCompleted && (
                        <div className="flex items-center justify-center gap-2 text-green-400 animate-pulse">
                          <CheckCircle className="w-8 h-8" />
                          <span className="text-xl font-bold">COMPLETED!</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Enhanced Progress Section */}
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-2">
                        <Timer className="w-4 h-4" />
                        Progress
                      </span>
                      <span className="font-bold">{Math.round(watchProgress)}%</span>
                    </div>
                    <Progress value={watchProgress} className="h-4 bg-gray-700" />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Time: {formatTime(Math.round((watchProgress / 100) * selectedAd.duration))}</span>
                      <span>Duration: {formatTime(selectedAd.duration)}</span>
                    </div>
                  </div>

                  {/* Enhanced Controls */}
                  <div className="flex items-center justify-center gap-4">
                    {!isCompleted ? (
                      <>
                        {!isWatching ? (
                          <Button
                            onClick={resumeWatching}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-lg"
                            data-testid="button-play-ad"
                          >
                            <PlayCircle className="w-5 h-5 mr-2" />
                            {watchProgress > 0 ? "RESUME" : "START"}
                          </Button>
                        ) : (
                          <Button
                            onClick={pauseWatching}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 text-lg"
                            data-testid="button-pause-ad"
                          >
                            <PauseCircle className="w-5 h-5 mr-2" />
                            PAUSE
                          </Button>
                        )}
                        <Button
                          onClick={stopWatching}
                          variant="outline"
                          className="border-2 border-white text-white hover:bg-white hover:text-black px-6 py-3 text-lg"
                          data-testid="button-stop-ad"
                        >
                          <StopCircle className="w-5 h-5 mr-2" />
                          STOP
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={stopWatching}
                        className="bg-primary hover:bg-primary/90 text-white px-8 py-3 text-lg"
                        data-testid="button-close-ad"
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        CONTINUE EARNING
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Enhanced Tabbed Interface */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-white border-2 border-black">
              <TabsTrigger value="ads" className="data-[state=active]:bg-black data-[state=active]:text-white font-bold">
                <PlayCircle className="w-4 h-4 mr-2" />
                AVAILABLE ADS
              </TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-black data-[state=active]:text-white font-bold">
                <BarChart3 className="w-4 h-4 mr-2" />
                ANALYTICS
              </TabsTrigger>
              <TabsTrigger value="achievements" className="data-[state=active]:bg-black data-[state=active]:text-white font-bold">
                <Award className="w-4 h-4 mr-2" />
                ACHIEVEMENTS
              </TabsTrigger>
            </TabsList>

            {/* Available Ads Tab */}
            <TabsContent value="ads" className="space-y-6">
              {remainingAds > 0 ? (
                <>
                  {/* Filters */}
                  <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <TechnicalLabel text="FILTER BY:" />
                      <select 
                        value={selectedCategory} 
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="border-2 border-black px-3 py-1 bg-white"
                      >
                        <option value="all">All Categories</option>
                        <option value="finance">Finance</option>
                        <option value="gaming">Gaming</option>
                        <option value="shopping">Shopping</option>
                        <option value="health">Health</option>
                        <option value="travel">Travel</option>
                      </select>
                      <select 
                        value={selectedDifficulty} 
                        onChange={(e) => setSelectedDifficulty(e.target.value)}
                        className="border-2 border-black px-3 py-1 bg-white"
                      >
                        <option value="all">All Difficulties</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                    <TechnicalLabel text={`${filteredAds.length} ADS AVAILABLE`} />
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAds.map((ad) => {
                      const isCompleted = completedAds.has(ad.id);
                      const isCurrent = selectedAd?.id === ad.id;
                      
                      return (
                        <Card 
                          key={ad.id} 
                          className={`border-2 transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                            isCurrent 
                              ? "border-primary bg-primary/10 scale-105" 
                              : isCompleted 
                                ? "border-green-500 bg-green-50" 
                                : "border-black hover:border-primary"
                          }`}
                          data-testid={`ad-card-${ad.id}`}
                        >
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center justify-between text-base">
                              <span className="flex items-center gap-2">
                                <span className="text-xl">{getAdTypeIcon(ad.type)}</span>
                                <div>
                                  <div className="font-bold">{ad.title}</div>
                                  <div className="text-xs text-muted-foreground">{ad.category}</div>
                                </div>
                              </span>
                              {isCompleted && <CheckCircle className="w-5 h-5 text-green-600" />}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                              {ad.description}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <span className={`text-xs px-2 py-1 rounded ${getDifficultyColor(ad.difficulty)}`}>
                                {ad.difficulty.toUpperCase()}
                              </span>
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {ad.type.toUpperCase()}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{formatTime(ad.duration)}</span>
                              </div>
                              <div className="flex items-center gap-1 text-primary font-bold">
                                <DollarSign className="w-4 h-4" />
                                <span>PKR {ad.reward}</span>
                              </div>
                            </div>

                            <Button
                              onClick={() => startWatching(ad)}
                              disabled={isCompleted || (selectedAd && !isCompleted)}
                              className={`w-full transition-all duration-200 transform hover:scale-105 ${
                                isCompleted 
                                  ? "bg-green-600 text-white" 
                                  : isCurrent 
                                    ? "bg-primary text-white" 
                                    : "bg-black text-white hover:bg-primary"
                              } border-2 border-black`}
                              data-testid={`button-watch-${ad.id}`}
                            >
                              {isCompleted ? (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  COMPLETED
                                </>
                              ) : isCurrent ? (
                                <>
                                  <PlayCircle className="w-4 h-4 mr-2" />
                                  CURRENT
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4 mr-2" />
                                  WATCH NOW
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-bold mb-2">Daily Limit Reached</h3>
                  <p className="text-muted-foreground">
                    You've watched {todayAdViews?.count} ads today. Come back tomorrow for more opportunities!
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Daily Progress Chart */}
                <Card className="border-2 border-black">
                  <CardHeader className="bg-black text-white">
                    <CardTitle className="flex items-center justify-between">
                      <span>TODAY'S PROGRESS</span>
                      <BarChart3 className="w-5 h-5" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={dailyProgressData}>
                        <defs>
                          <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ff6b35" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#ff6b35" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip formatter={(value, name) => [
                          name === 'ads' ? `${value} ads` : `PKR ${value}`,
                          name === 'ads' ? 'Ads Watched' : 'Earnings'
                        ]} />
                        <Area 
                          type="monotone" 
                          dataKey="earnings" 
                          stroke="#ff6b35" 
                          strokeWidth={3}
                          fill="url(#progressGradient)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Category Performance */}
                <Card className="border-2 border-black">
                  <CardHeader className="bg-primary text-white">
                    <CardTitle className="flex items-center justify-between">
                      <span>CATEGORY PERFORMANCE</span>
                      <PieChart className="w-5 h-5" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={categoryData} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={60} />
                        <Tooltip formatter={(value, name) => [
                          name === 'ads' ? `${value} ads` : `PKR ${value}`,
                          name === 'ads' ? 'Ads Watched' : 'Total Earnings'
                        ]} />
                        <Bar dataKey="earnings" fill="#ff6b35" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Performance Radial Chart */}
                <Card className="border-2 border-black">
                  <CardHeader className="bg-secondary">
                    <CardTitle>COMPLETION RATE</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ResponsiveContainer width="100%" height={250}>
                      <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={performanceData}>
                        <RadialBar dataKey="value" cornerRadius={10} fill="#22C55E" />
                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold">
                          85%
                        </text>
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="text-center mt-4">
                      <p className="text-green-600 font-bold">Excellent Performance!</p>
                      <p className="text-sm text-muted-foreground">Keep up the great work</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Stats Summary */}
                <Card className="border-2 border-black">
                  <CardHeader className="bg-black text-white">
                    <CardTitle>SUMMARY STATS</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>Total Ads Watched</span>
                        <span className="font-bold">{todayAdViews?.count || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Total Earnings</span>
                        <span className="font-bold text-primary">{formatCurrency((completedAds.size * 2.5).toString())}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Average per Ad</span>
                        <span className="font-bold">PKR 2.50</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Best Category</span>
                        <span className="font-bold">Gaming</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Streak</span>
                        <span className="font-bold text-green-600">7 days</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Achievements Tab */}
            <TabsContent value="achievements" className="space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Achievement Cards */}
                <Card className="border-2 border-black bg-gradient-to-br from-yellow-50 to-yellow-100">
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-4">🏆</div>
                    <h3 className="font-bold mb-2">FIRST STEPS</h3>
                    <p className="text-sm text-muted-foreground mb-4">Watch your first ad</p>
                    <div className="bg-green-600 text-white px-4 py-2 rounded font-bold">
                      COMPLETED
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-black bg-gradient-to-br from-blue-50 to-blue-100">
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-4">🎯</div>
                    <h3 className="font-bold mb-2">AD MASTER</h3>
                    <p className="text-sm text-muted-foreground mb-4">Watch 50 ads in a day</p>
                    <div className="space-y-2">
                      <Progress value={(todayAdViews?.count || 0) / 50 * 100} className="h-2" />
                      <div className="text-sm">{todayAdViews?.count || 0}/50</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-black bg-gradient-to-br from-purple-50 to-purple-100">
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-4">⚡</div>
                    <h3 className="font-bold mb-2">STREAK KEEPER</h3>
                    <p className="text-sm text-muted-foreground mb-4">7-day earning streak</p>
                    <div className="bg-green-600 text-white px-4 py-2 rounded font-bold">
                      COMPLETED
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-black bg-gradient-to-br from-green-50 to-green-100">
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-4">💰</div>
                    <h3 className="font-bold mb-2">MONEY MAKER</h3>
                    <p className="text-sm text-muted-foreground mb-4">Earn PKR 100 in total</p>
                    <div className="space-y-2">
                      <Progress value={parseFloat(user.totalEarnings) / 100 * 100} className="h-2" />
                      <div className="text-sm">{formatCurrency(user.totalEarnings)}/PKR 100</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-black bg-gradient-to-br from-red-50 to-red-100">
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-4">🔥</div>
                    <h3 className="font-bold mb-2">SPEED DEMON</h3>
                    <p className="text-sm text-muted-foreground mb-4">Watch 10 ads in 1 hour</p>
                    <div className="bg-gray-400 text-white px-4 py-2 rounded font-bold">
                      LOCKED
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-black bg-gradient-to-br from-orange-50 to-orange-100">
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-4">🌟</div>
                    <h3 className="font-bold mb-2">PERFECTIONIST</h3>
                    <p className="text-sm text-muted-foreground mb-4">100% completion rate</p>
                    <div className="bg-gray-400 text-white px-4 py-2 rounded font-bold">
                      LOCKED
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}