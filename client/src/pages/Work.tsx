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
  Timer,
  PlayCircle,
  PauseCircle,
  StopCircle,
  Calendar,
  Filter,
  Activity,
  Star,
  Flame,
  Gift,
  TrendingDown
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar
} from 'recharts';

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
    return null;
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

  const filteredAds = availableAds.filter(ad => {
    const categoryMatch = selectedCategory === "all" || ad.category.toLowerCase() === selectedCategory.toLowerCase();
    const difficultyMatch = selectedDifficulty === "all" || ad.difficulty === selectedDifficulty;
    return categoryMatch && difficultyMatch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Refined Industrial Grid */}
      <div className="fixed inset-0 opacity-[0.02]">
        <div className="absolute inset-0 bg-gradient-to-br from-black/5 via-transparent to-primary/5" />
        <div className="industrial-grid" />
      </div>

      {/* Modern Navigation Header */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-sm" data-testid="work-navigation">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            {/* Back Navigation */}
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setLocation("/dashboard")}
                variant="ghost"
                className="flex items-center gap-2 hover:bg-gray-100"
                data-testid="button-back-dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden md:inline">Dashboard</span>
              </Button>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Work Center</h1>
              </div>
            </div>
            
            {/* Progress Stats */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-4 bg-gray-50 rounded-xl px-4 py-2">
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-900">{todayAdViews?.count || 0}</p>
                  <p className="text-xs text-gray-500">Watched Today</p>
                </div>
                <div className="w-px h-8 bg-gray-300" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-primary">{remainingAds}</p>
                  <p className="text-xs text-gray-500">Remaining</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
            <Flame className="w-4 h-4" />
            <TechnicalLabel text="EARN BY WATCHING" className="text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-4">
            Start <span className="bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent">Earning</span><br />
            Watch & Earn Rewards
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Watch advertisements, complete tasks, and earn real money daily
          </p>
          <Barcode className="w-40 h-8 mx-auto opacity-60" />
        </div>

        {/* Progress Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/20 rounded-full transform translate-x-6 -translate-y-6" />
              <div className="relative">
                <Eye className="w-8 h-8 mb-4" />
                <div className="text-2xl font-black">{todayAdViews?.count || 0}</div>
                <div className="text-blue-100 text-sm">Ads Watched</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-primary to-orange-600 text-white overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/20 rounded-full transform translate-x-6 -translate-y-6" />
              <div className="relative">
                <Target className="w-8 h-8 mb-4" />
                <div className="text-2xl font-black">{remainingAds}</div>
                <div className="text-orange-100 text-sm">Remaining</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/20 rounded-full transform translate-x-6 -translate-y-6" />
              <div className="relative">
                <DollarSign className="w-8 h-8 mb-4" />
                <div className="text-2xl font-black">{formatCurrency((completedAds.size * 2.5).toString())}</div>
                <div className="text-green-100 text-sm">Today's Earnings</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/20 rounded-full transform translate-x-6 -translate-y-6" />
              <div className="relative">
                <Award className="w-8 h-8 mb-4" />
                <div className="text-2xl font-black">{Math.round((completedAds.size / dailyLimit) * 100)}%</div>
                <div className="text-purple-100 text-sm">Daily Goal</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ad Player Section */}
        {selectedAd && (
          <div className="mb-12">
            <Card className="border-0 shadow-2xl bg-gradient-to-br from-gray-900 to-black text-white overflow-hidden" data-testid="ad-player">
              <CardHeader className="bg-black/50 backdrop-blur border-b border-gray-700">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{getAdTypeIcon(selectedAd.type)}</div>
                    <div>
                      <h3 className="text-xl font-bold">{selectedAd.title}</h3>
                      <p className="text-gray-400 text-sm">{selectedAd.category} • {formatTime(selectedAd.duration)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-primary">{formatCurrency(selectedAd.reward)}</div>
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getDifficultyColor(selectedAd.difficulty)}`}>
                      {selectedAd.difficulty.toUpperCase()}
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                {/* Ad Display Area */}
                <div className="bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600 rounded-2xl p-12 mb-8 text-center min-h-[300px] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 animate-pulse" />
                  <div className="space-y-6 relative z-10">
                    <div className="text-8xl animate-bounce">{getAdTypeIcon(selectedAd.type)}</div>
                    <h3 className="text-4xl font-bold">{selectedAd.title}</h3>
                    <p className="text-gray-300 max-w-lg text-lg">{selectedAd.description}</p>
                    {isCompleted && (
                      <div className="flex items-center justify-center gap-3 text-green-400 animate-pulse">
                        <CheckCircle className="w-12 h-12" />
                        <span className="text-3xl font-bold">COMPLETED!</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Section */}
                <div className="space-y-6 mb-8">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Timer className="w-5 h-5 text-primary" />
                      <span className="text-lg font-semibold">Progress</span>
                    </div>
                    <span className="text-2xl font-black text-primary">{Math.round(watchProgress)}%</span>
                  </div>
                  <Progress value={watchProgress} className="h-4 bg-gray-700" />
                  <div className="flex justify-between text-gray-400">
                    <span>Elapsed: {formatTime(Math.round((watchProgress / 100) * selectedAd.duration))}</span>
                    <span>Duration: {formatTime(selectedAd.duration)}</span>
                  </div>
                </div>

                {/* Enhanced Controls */}
                <div className="flex items-center justify-center gap-6">
                  {!isCompleted ? (
                    <>
                      {!isWatching ? (
                        <Button
                          onClick={resumeWatching}
                          size="lg"
                          className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg font-semibold"
                          data-testid="button-play-ad"
                        >
                          <PlayCircle className="w-6 h-6 mr-3" />
                          {watchProgress > 0 ? "RESUME" : "START WATCHING"}
                        </Button>
                      ) : (
                        <Button
                          onClick={pauseWatching}
                          size="lg"
                          className="bg-yellow-600 hover:bg-yellow-700 text-white px-8 py-4 text-lg font-semibold"
                          data-testid="button-pause-ad"
                        >
                          <PauseCircle className="w-6 h-6 mr-3" />
                          PAUSE
                        </Button>
                      )}
                      <Button
                        onClick={stopWatching}
                        variant="outline"
                        size="lg"
                        className="border-2 border-white text-white hover:bg-white hover:text-black px-8 py-4 text-lg font-semibold"
                        data-testid="button-stop-ad"
                      >
                        <StopCircle className="w-6 h-6 mr-3" />
                        STOP
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={stopWatching}
                      size="lg"
                      className="bg-primary hover:bg-primary/90 text-white px-12 py-4 text-lg font-semibold"
                      data-testid="button-close-ad"
                    >
                      <CheckCircle className="w-6 h-6 mr-3" />
                      CONTINUE EARNING
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 rounded-2xl p-1">
            <TabsTrigger value="ads" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl">
              <PlayCircle className="w-4 h-4 mr-2" />
              Available Ads
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="achievements" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl">
              <Award className="w-4 h-4 mr-2" />
              Achievements
            </TabsTrigger>
          </TabsList>

          {/* Available Ads Tab */}
          <TabsContent value="ads" className="space-y-8">
            {remainingAds > 0 ? (
              <>
                {/* Filters */}
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex flex-wrap gap-4 items-center">
                      <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-gray-600" />
                        <TechnicalLabel text="FILTER BY:" className="text-gray-600" />
                      </div>
                      <select 
                        value={selectedCategory} 
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="border border-gray-300 rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-primary focus:border-transparent"
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
                        className="border border-gray-300 rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="all">All Difficulties</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                      <div className="ml-auto text-sm text-gray-600">
                        {filteredAds.length} ads available
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Ads Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAds.map((ad) => {
                    const isCompleted = completedAds.has(ad.id);
                    const isCurrent = selectedAd?.id === ad.id;

                    return (
                      <Card key={ad.id} className={`border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden ${isCurrent ? 'ring-2 ring-primary' : ''}`} data-testid={`ad-card-${ad.id}`}>
                        <CardHeader className="pb-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-2xl">{getAdTypeIcon(ad.type)}</div>
                              <div>
                                <h3 className="font-bold text-gray-900 line-clamp-1">{ad.title}</h3>
                                <p className="text-sm text-gray-600">{ad.category}</p>
                              </div>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getDifficultyColor(ad.difficulty)}`}>
                              {ad.difficulty.toUpperCase()}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {ad.description}
                          </p>
                          
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1 text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span>{formatTime(ad.duration)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-primary font-bold text-lg">
                              <DollarSign className="w-5 h-5" />
                              <span>{ad.reward}</span>
                            </div>
                          </div>

                          <Button
                            onClick={() => startWatching(ad)}
                            disabled={Boolean(isCompleted || (selectedAd && !isCompleted))}
                            className={`w-full transition-all duration-200 ${
                              isCompleted 
                                ? "bg-green-600 hover:bg-green-700 text-white" 
                                : isCurrent 
                                  ? "bg-primary hover:bg-primary/90 text-white" 
                                  : "bg-gray-900 hover:bg-black text-white"
                            } border-0 shadow-lg`}
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
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Daily Limit Reached</h3>
                <p className="text-gray-600 mb-6">You've watched all available ads for today. Come back tomorrow for more!</p>
                <Button
                  onClick={() => setLocation("/dashboard")}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  View Dashboard
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-8">
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Advanced Analytics</h3>
              <p className="text-gray-600">Detailed performance metrics and insights coming soon...</p>
            </div>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-8">
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Award className="w-12 h-12 text-yellow-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Achievements & Badges</h3>
              <p className="text-gray-600">Unlock achievements and earn badges for your progress...</p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}