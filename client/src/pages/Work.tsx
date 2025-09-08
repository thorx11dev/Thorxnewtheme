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
  CheckCircle 
} from "lucide-react";

interface AdItem {
  id: string;
  title: string;
  type: "video" | "banner" | "interactive";
  duration: number; // in seconds
  reward: string;
  description: string;
  thumbnail?: string;
}

// Mock ad data - in a real app this would come from an ad network
const availableAds: AdItem[] = [
  {
    id: "ad_001",
    title: "CRYPTO TRADING PLATFORM",
    type: "video",
    duration: 30,
    reward: "2.50",
    description: "Watch this crypto trading platform advertisement",
  },
  {
    id: "ad_002", 
    title: "MOBILE GAME DOWNLOAD",
    type: "video",
    duration: 15,
    reward: "1.25",
    description: "Download and try this exciting mobile game",
  },
  {
    id: "ad_003",
    title: "E-COMMERCE DEAL",
    type: "interactive",
    duration: 45,
    reward: "3.75",
    description: "Interactive advertisement for latest e-commerce deals",
  },
  {
    id: "ad_004",
    title: "FITNESS APP PROMOTION",
    type: "video",
    duration: 20,
    reward: "1.75",
    description: "Learn about this revolutionary fitness application",
  },
  {
    id: "ad_005",
    title: "INVESTMENT OPPORTUNITY",
    type: "banner",
    duration: 10,
    reward: "0.75",
    description: "Quick banner ad for investment platform",
  },
];

export default function Work() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Ad watching state
  const [selectedAd, setSelectedAd] = useState<AdItem | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [watchProgress, setWatchProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedAds, setCompletedAds] = useState<Set<string>>(new Set());

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
      // Refresh ad views count and user data
      queryClient.invalidateQueries({ queryKey: ["ad-views"] });
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });

  // Ad watching timer effect
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
              title: "Ad Completed!",
              description: `You earned PKR ${selectedAd.reward}`,
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

  const startWatching = (ad: AdItem) => {
    setSelectedAd(ad);
    setWatchProgress(0);
    setIsCompleted(false);
    setIsWatching(true);
  };

  const pauseWatching = () => {
    setIsWatching(false);
  };

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  if (!user) {
    return null; // ProtectedRoute will handle redirect
  }

  const dailyLimit = 50; // Example daily limit
  const remainingAds = dailyLimit - (todayAdViews?.count || 0);

  return (
    <div className="work-page min-h-screen">
      {/* Industrial Grid Overlay */}
      <div className="industrial-grid" />

      {/* Navigation Header */}
      <nav className="fixed top-0 w-full z-50 bg-background border-b-3 border-black" data-testid="work-navigation">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Left Section */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setLocation("/dashboard")}
                className="bg-black text-white px-2 py-1 md:px-4 md:py-2 border-2 border-black hover:bg-primary transition-colors flex items-center gap-2"
                data-testid="button-back-dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
                <TechnicalLabel text="DASHBOARD" className="text-white text-xs md:text-sm" />
              </button>
            </div>
            
            {/* Center Section */}
            <div className="flex items-center">
              <h1 className="text-xl md:text-2xl font-black tracking-tighter">WORK CENTER</h1>
            </div>
            
            {/* Right Section */}
            <div className="flex items-center">
              <div className="bg-white border-2 border-black px-2 py-1 md:px-4 md:py-2">
                <div className="text-xs md:text-sm">
                  <TechnicalLabel text="AD VIEWING" />
                  <TechnicalLabel text={`${todayAdViews?.count || 0}/${dailyLimit}`} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-20 md:pt-24 pb-8">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* Header Section */}
          <div className="text-center mb-8 md:mb-12">
            <div className="mb-2">
              <TechnicalLabel text="ADVERTISEMENT VIEWING SYSTEM" />
            </div>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-black mb-4">
              EARN BY WATCHING
            </h2>
            <Barcode className="w-32 md:w-48 h-8 md:h-10 mx-auto" />
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 md:mb-12">
            <div className="split-card bg-black text-white p-4 relative">
              <div className="absolute top-2 right-2">
                <Eye className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <TechnicalLabel text="TODAY'S VIEWS" className="text-white/80 text-xs" />
                <div className="text-2xl font-black">
                  {todayAdViews?.count || 0}
                </div>
              </div>
            </div>

            <div className="split-card bg-primary text-white p-4 relative">
              <div className="absolute top-2 right-2">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <TechnicalLabel text="REMAINING" className="text-white/80 text-xs" />
                <div className="text-2xl font-black">
                  {remainingAds}
                </div>
              </div>
            </div>

            <div className="split-card bg-white text-black border-2 border-black p-4 relative">
              <div className="absolute top-2 right-2">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <TechnicalLabel text="AVAILABLE ADS" className="text-xs" />
                <div className="text-2xl font-black">
                  {availableAds.length}
                </div>
              </div>
            </div>

            <div className="split-card bg-secondary text-black p-4 relative">
              <div className="absolute top-2 right-2">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <TechnicalLabel text="COMPLETED" className="text-xs" />
                <div className="text-2xl font-black">
                  {completedAds.size}
                </div>
              </div>
            </div>
          </div>

          {/* Ad Player Section */}
          {selectedAd && (
            <div className="mb-8 md:mb-12">
              <Card className="border-3 border-black" data-testid="ad-player">
                <CardHeader className="bg-black text-white">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="text-2xl">{getAdTypeIcon(selectedAd.type)}</span>
                      {selectedAd.title}
                    </span>
                    <span className="text-primary">PKR {selectedAd.reward}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Mock Ad Display */}
                  <div className="bg-gradient-to-br from-gray-900 to-gray-700 text-white p-8 rounded-lg mb-4 text-center min-h-[200px] flex items-center justify-center">
                    <div className="space-y-4">
                      <div className="text-6xl">{getAdTypeIcon(selectedAd.type)}</div>
                      <h3 className="text-2xl font-bold">{selectedAd.title}</h3>
                      <p className="text-gray-300">{selectedAd.description}</p>
                      {isCompleted && (
                        <div className="flex items-center justify-center gap-2 text-green-400">
                          <CheckCircle className="w-6 h-6" />
                          <span className="font-bold">COMPLETED!</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{Math.round(watchProgress)}%</span>
                    </div>
                    <Progress value={watchProgress} className="h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Time: {formatTime(Math.round((watchProgress / 100) * selectedAd.duration))}</span>
                      <span>Duration: {formatTime(selectedAd.duration)}</span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-center gap-4">
                    {!isCompleted ? (
                      <>
                        {!isWatching ? (
                          <Button
                            onClick={resumeWatching}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            data-testid="button-play-ad"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            {watchProgress > 0 ? "RESUME" : "START"}
                          </Button>
                        ) : (
                          <Button
                            onClick={pauseWatching}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white"
                            data-testid="button-pause-ad"
                          >
                            <Pause className="w-4 h-4 mr-2" />
                            PAUSE
                          </Button>
                        )}
                        <Button
                          onClick={stopWatching}
                          variant="outline"
                          className="border-2 border-black"
                          data-testid="button-stop-ad"
                        >
                          <Square className="w-4 h-4 mr-2" />
                          STOP
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={stopWatching}
                        className="bg-primary hover:bg-primary/90 text-white"
                        data-testid="button-close-ad"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        CLOSE
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Available Ads Grid */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl md:text-3xl font-black">AVAILABLE ADS</h3>
              <TechnicalLabel text={`${availableAds.length} ADS READY`} />
            </div>

            {remainingAds > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableAds.map((ad) => {
                  const isCompleted = completedAds.has(ad.id);
                  const isCurrent = selectedAd?.id === ad.id;
                  
                  return (
                    <Card 
                      key={ad.id} 
                      className={`border-2 transition-all ${
                        isCurrent 
                          ? "border-primary bg-primary/10" 
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
                            {ad.title}
                          </span>
                          {isCompleted && <CheckCircle className="w-5 h-5 text-green-600" />}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          {ad.description}
                        </p>
                        
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
                          className="w-full bg-black text-white hover:bg-primary transition-colors border-2 border-black"
                          data-testid={`button-watch-${ad.id}`}
                        >
                          {isCompleted ? "COMPLETED" : isCurrent ? "CURRENT" : "WATCH NOW"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-bold mb-2">Daily Limit Reached</h3>
                <p className="text-muted-foreground">
                  You've watched {todayAdViews?.count} ads today. Come back tomorrow for more opportunities!
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}