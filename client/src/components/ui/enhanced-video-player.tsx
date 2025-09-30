
import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import TechnicalLabel from "@/components/ui/technical-label";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  PlayCircle, 
  PauseCircle, 
  Maximize2, 
  Minimize2, 
  Volume2,
  VolumeX,
  Settings,
  User,
  HelpCircle,
  MoreHorizontal
} from "lucide-react";

interface VideoTab {
  id: string;
  title: string;
  icon: string;
  color: string;
  videoUrl: string;
  reward: string;
  description: string;
}

interface EnhancedVideoPlayerProps {
  tab: VideoTab;
  isActive?: boolean;
  onComplete?: (tabId: string, earnings: string) => void;
  autoplay?: boolean;
  isMobile?: boolean;
}

export default function EnhancedVideoPlayer({ 
  tab, 
  isActive = true, 
  onComplete, 
  autoplay = false,
  isMobile = false 
}: EnhancedVideoPlayerProps) {
  const isMobileDevice = useIsMobile();
  // Core player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const [adProgress, setAdProgress] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [activeAreaTab, setActiveAreaTab] = useState("001");
  
  const playerRef = useRef<HTMLDivElement>(null);

  // Area tabs data matching wireframe
  const areaTabs = [
    { id: "001", label: "AREA 001", type: "video" },
    { id: "002", label: "AREA 002", type: "survey" },
    { id: "003", label: "AREA 003", type: "task" },
    { id: "004", label: "AREA 004", type: "bonus" }
  ];

  // Control icons for top right
  const controlIcons = [
    { id: "settings", icon: Settings, active: false },
    { id: "user", icon: User, active: false },
    { id: "help", icon: HelpCircle, active: false },
    { id: "active", icon: MoreHorizontal, active: true }
  ];

  // Format currency
  const formatCurrency = (amount: string) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  // Fullscreen change event listeners
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      
      // Always sync with browser fullscreen state for both desktop and mobile
      setIsFullscreen(isCurrentlyFullscreen);
      
      // Handle body classes - always sync with actual browser state
      if (isMobileDevice) {
        if (isCurrentlyFullscreen) {
          document.body.classList.add('video-fullscreen-active');
        } else {
          document.body.classList.remove('video-fullscreen-active');
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      
      // Cleanup body classes
      document.body.classList.remove('video-fullscreen-active');
      document.body.classList.remove('cinematic-mode');
    };
  }, [isMobileDevice]);

  // Main timer for video progress
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying && !isCompleted) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 1;
          const progress = (newTime / duration) * 100;
          setAdProgress(progress);

          // Allow skip after 5 seconds
          if (newTime >= 5 && !canSkip) {
            setCanSkip(true);
            setShowSkip(true);
          }

          // Auto-complete at end
          if (newTime >= duration) {
            setIsPlaying(false);
            setIsCompleted(true);
            onComplete?.(tab.id, tab.reward);
            return duration;
          }

          return newTime;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, duration, canSkip, tab.id, tab.reward, onComplete, isCompleted]);

  // Player control handlers
  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleSkip = () => {
    if (canSkip && !isCompleted) {
      setCurrentTime(duration);
      setAdProgress(100);
      setIsPlaying(false);
      setIsCompleted(true);
      onComplete?.(tab.id, tab.reward);
    }
  };

  const handleFullscreen = async () => {
    if (!isFullscreen) {
      // Enter fullscreen
      try {
        if (isMobileDevice) {
          // Mobile-specific fullscreen behavior - no rotation, just fullscreen
          setIsFullscreen(true);
          
          // Add body class to prevent scrolling
          document.body.classList.add('video-fullscreen-active');
          document.documentElement.style.overflow = 'hidden';
          
          // Request fullscreen on the player container specifically for mobile
          if (playerRef.current) {
            if (playerRef.current.requestFullscreen) {
              await playerRef.current.requestFullscreen();
            } else if ((playerRef.current as any).webkitRequestFullscreen) {
              await (playerRef.current as any).webkitRequestFullscreen();
            } else if ((playerRef.current as any).mozRequestFullScreen) {
              await (playerRef.current as any).mozRequestFullScreen();
            }
          } else {
            // Fallback to document fullscreen if player ref not available
            if (document.documentElement.requestFullscreen) {
              await document.documentElement.requestFullscreen();
            } else if ((document.documentElement as any).webkitRequestFullscreen) {
              await (document.documentElement as any).webkitRequestFullscreen();
            }
          }
          
        } else {
          // Desktop fullscreen on the player container
          if (playerRef.current) {
            if (playerRef.current.requestFullscreen) {
              await playerRef.current.requestFullscreen();
            } else if ((playerRef.current as any).webkitRequestFullscreen) {
              await (playerRef.current as any).webkitRequestFullscreen();
            } else if ((playerRef.current as any).mozRequestFullScreen) {
              await (playerRef.current as any).mozRequestFullScreen();
            } else if ((playerRef.current as any).msRequestFullscreen) {
              await (playerRef.current as any).msRequestFullscreen();
            }
          }
          setIsFullscreen(true);
        }
      } catch (error) {
        console.error('Failed to enter fullscreen:', error);
        // Fallback for mobile when fullscreen API fails
        if (isMobileDevice) {
          setIsFullscreen(true);
          document.body.classList.add('video-fullscreen-active');
          document.documentElement.style.overflow = 'hidden';
        }
      }
    } else {
      // Exit fullscreen
      try {
        if (isMobileDevice) {
          // Mobile exit fullscreen - comprehensive approach
          
          // Step 1: Immediate visual state update for instant feedback
          setIsFullscreen(false);
          
          // Step 2: Immediate DOM cleanup
          document.body.classList.remove('video-fullscreen-active');
          document.documentElement.style.overflow = '';
          
          // Step 3: Browser API exit with enhanced error handling
          const exitFullscreenSafely = async () => {
            try {
              // Check if actually in fullscreen before attempting exit
              const isActuallyFullscreen = !!(
                document.fullscreenElement ||
                (document as any).webkitFullscreenElement ||
                (document as any).mozFullScreenElement ||
                (document as any).msFullscreenElement
              );
              
              if (isActuallyFullscreen) {
                // Try different browser APIs in order of preference
                if (document.exitFullscreen) {
                  await document.exitFullscreen();
                } else if ((document as any).webkitExitFullscreen) {
                  await (document as any).webkitExitFullscreen();
                } else if ((document as any).mozCancelFullScreen) {
                  await (document as any).mozCancelFullScreen();
                } else if ((document as any).msExitFullscreen) {
                  await (document as any).msExitFullscreen();
                }
              }
            } catch (apiError) {
              // API failed but visual state is correct - this is acceptable
              console.log('Fullscreen API exit failed, visual state maintained');
              
              // Force cleanup as fallback
              document.body.classList.remove('video-fullscreen-active');
              document.documentElement.style.overflow = '';
            }
          };
          
          // Execute API exit without blocking UI
          setTimeout(exitFullscreenSafely, 16); // Use 16ms for next frame
          
        } else {
          // Desktop exit fullscreen
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen();
          } else if ((document as any).mozCancelFullScreen) {
            await (document as any).mozCancelFullScreen();
          } else if ((document as any).msExitFullscreen) {
            await (document as any).msExitFullscreen();
          }
          setIsFullscreen(false);
        }
      } catch (error) {
        console.error('Failed to exit fullscreen:', error);
        // Ensure cleanup even if API calls fail
        setIsFullscreen(false);
        document.body.classList.remove('video-fullscreen-active');
        document.documentElement.style.overflow = '';
      }
    }
  };

  const handleVolumeToggle = () => {
    setIsMuted(!isMuted);
  };

  const formatVideoTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`w-full transition-all duration-300 ${
      isFullscreen 
        ? 'fixed inset-0 z-50 bg-black video-player-fullscreen'
        : ''
    }`}>
      {/* Industrial Frame Container */}
      <div className={`bg-black transition-all duration-300 ${
        isFullscreen 
          ? isMobileDevice
            ? 'h-screen w-screen p-1'
            : 'h-screen w-screen p-4' 
          : isMobileDevice 
            ? 'border-2 border-white p-1' 
            : 'border-4 border-white p-2'
      }`}>
        {/* Top Navigation Bar - Wireframe Style - Simplified for Mobile */}
        <div className={`bg-white transition-all duration-300 ${
          isFullscreen ? 'mb-4 border-2 border-black' : isMobileDevice ? 'mb-1 border border-black' : 'border-2 border-black mb-2'
        }`}>
          <div className={`flex items-center justify-between transition-all duration-300 ${
            isFullscreen ? 'p-4' : isMobileDevice ? 'p-1.5' : 'p-2'
          }`}>
            {/* Area Tabs - Left Side - Simplified for Mobile */}
            <div className={`flex items-center ${isMobileDevice ? 'gap-0.5' : 'gap-1'}`}>
              {areaTabs.map((areaTab) => (
                <button
                  key={areaTab.id}
                  onClick={() => setActiveAreaTab(areaTab.id)}
                  className={`border border-black transition-all duration-200 ${
                    isFullscreen 
                      ? 'text-sm px-4 py-2' 
                      : isMobileDevice 
                        ? 'text-xs px-2 py-1' 
                        : 'text-xs px-3 py-1'
                  } ${
                    activeAreaTab === areaTab.id
                      ? 'bg-black text-white'
                      : 'bg-white text-black hover:bg-gray-100'
                  }`}
                  data-testid={`area-tab-${areaTab.id}`}
                >
                  <TechnicalLabel 
                    text={areaTab.label} 
                    className={isFullscreen ? "text-sm" : isMobileDevice ? "text-xs" : "text-xs"} 
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Video Content Area */}
        <div 
          ref={playerRef}
          className={`relative bg-gray-200 flex items-center justify-center overflow-hidden transition-all duration-300 ${
            isFullscreen 
              ? isMobileDevice
                ? 'h-[calc(100vh-80px)] w-full border border-black'
                : 'h-[calc(100vh-200px)] w-full border-2 border-black' 
              : isMobileDevice
                ? 'aspect-video border border-black'
                : 'aspect-video border-2 border-black'
          }`}
          data-testid={`video-player-${tab.id}`}
        >
          {/* Industrial Grid Pattern - Hidden on Mobile for Cleaner Look */}
          <div className={`absolute inset-0 ${isMobileDevice ? 'hidden' : 'opacity-10'}`}>
            <div className="industrial-grid" />
          </div>

          {/* Video Content Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-gray-900/90 to-black/80" />

          {/* Minimal Clean Play Button */}
          <div className="relative z-10 flex items-center justify-center">
            {!isPlaying ? (
              <button
                onClick={handlePlay}
                className={`group relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center transition-all duration-300 hover:bg-white/20 hover:scale-105 hover:border-white/40 ${
                  isFullscreen ? 'w-24 h-24' : 'w-16 h-16'
                }`}
                data-testid="button-play"
              >
                <PlayCircle className={`text-white group-hover:text-white/90 transition-colors ${
                  isFullscreen ? 'w-12 h-12' : 'w-8 h-8'
                }`} />
              </button>
            ) : (
              <div className="text-center text-white">
                <div className={`mb-2 ${isFullscreen ? 'text-6xl mb-4' : 'text-4xl'}`}>{tab.icon}</div>
                <TechnicalLabel 
                  text={tab.title} 
                  className={`text-white mb-1 ${isFullscreen ? 'text-2xl mb-2' : 'text-lg'}`} 
                />
                <p className={`text-white/80 ${isFullscreen ? 'text-lg' : 'text-sm'}`}>{tab.description}</p>
                {isCompleted && (
                  <div className={`mt-4 bg-green-600/20 border border-green-400 ${
                    isFullscreen ? 'p-4 mt-6' : 'p-3'
                  }`}>
                    <TechnicalLabel 
                      text="AD COMPLETED" 
                      className={`text-green-400 ${isFullscreen ? 'text-lg' : ''}`} 
                    />
                    <p className={`text-white mt-1 ${isFullscreen ? 'text-lg mt-2' : ''}`}>
                      You earned {formatCurrency(tab.reward)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Skip Button - Clearly Visible */}
          {showSkip && canSkip && !isCompleted && (
            <button
              onClick={handleSkip}
              className={`absolute bg-white/90 backdrop-blur-sm text-black border border-black/20 rounded-md hover:bg-white hover:border-black/40 transition-all duration-200 shadow-lg z-20 ${
                isFullscreen 
                  ? 'top-6 right-6 px-4 py-3' 
                  : 'top-4 right-4 px-3 py-2'
              }`}
              data-testid="button-skip"
            >
              <TechnicalLabel 
                text="SKIP AD" 
                className={`text-black font-medium ${isFullscreen ? 'text-sm' : 'text-xs'}`} 
              />
            </button>
          )}

          {/* Progress Bar - Simplified for Mobile */}
          <div className={`absolute bottom-0 left-0 right-0 bg-black/80 transition-all duration-300 ${
            isFullscreen 
              ? 'p-4' 
              : isMobileDevice 
                ? 'p-2' 
                : 'p-3'
          }`}>
            <div className={`flex items-center justify-between ${
              isFullscreen 
                ? 'mb-3' 
                : isMobileDevice 
                  ? 'mb-1' 
                  : 'mb-2'
            }`}>
              <TechnicalLabel 
                text={`EARN ${formatCurrency(tab.reward)}`} 
                className={`text-white ${
                  isFullscreen 
                    ? 'text-sm' 
                    : isMobileDevice 
                      ? 'text-xs' 
                      : 'text-xs'
                }`} 
              />
              <div className={`flex items-center ${isMobileDevice ? 'gap-2' : 'gap-3'}`}>
                <span className={`text-white/60 ${
                  isFullscreen 
                    ? 'text-sm' 
                    : isMobileDevice 
                      ? 'text-xs' 
                      : 'text-xs'
                }`}>
                  {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
                </span>
                {/* Hide control buttons on mobile - they're relocated to status bar */}
                {!isMobileDevice && (
                  <>
                    <button
                      onClick={handleVolumeToggle}
                      className="text-white hover:text-primary transition-colors p-1"
                      data-testid="button-volume"
                    >
                      {isMuted || volume === 0 ? 
                        <VolumeX className={
                          isFullscreen 
                            ? 'w-5 h-5' 
                            : 'w-4 h-4'
                        } /> : 
                        <Volume2 className={
                          isFullscreen 
                            ? 'w-5 h-5' 
                            : 'w-4 h-4'
                        } />
                      }
                    </button>
                    <button
                      onClick={handleFullscreen}
                      className="text-white hover:text-primary transition-colors p-1"
                      data-testid="button-fullscreen"
                    >
                      {isFullscreen ? 
                        <Minimize2 className={
                          isFullscreen 
                            ? 'w-5 h-5' 
                            : 'w-4 h-4'
                        } /> : 
                        <Maximize2 className={
                          isFullscreen 
                            ? 'w-5 h-5' 
                            : 'w-4 h-4'
                        } />
                      }
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {/* Progress Bar with Simplified Mobile Styling */}
            <div className={`w-full bg-gray-600 transition-all duration-300 ${
              isFullscreen 
                ? 'h-3 border border-white/20' 
                : isMobileDevice 
                  ? 'h-2 border-none rounded-sm' 
                  : 'h-2 border border-white/20'
            }`}>
              <div 
                className={`h-full bg-primary transition-all duration-500 ${
                  isMobileDevice ? 'rounded-sm' : 'border-r border-white/40'
                }`}
                style={{ width: `${adProgress}%` }}
              />
            </div>
          </div>

          {/* Industrial Corner Accents - Simplified for Mobile */}
          {!isMobileDevice && (
            <>
              <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-white/40" />
              <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-white/40" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-white/40" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-white/40" />
            </>
          )}
        </div>

        {/* Industrial Status Bar - Mobile Controls Relocated */}
        <div className={`bg-white transition-all duration-300 ${
          isFullscreen 
            ? 'mt-4 p-4 border-2 border-black' 
            : isMobileDevice 
              ? 'mt-1 p-1.5 border border-black' 
              : 'mt-2 p-2 border-2 border-black'
        }`}>
          <div className={`flex items-center justify-between ${isMobileDevice ? 'text-xs' : ''}`}>
            <div className={`flex items-center ${isMobileDevice ? 'gap-2' : 'gap-4'}`}>
              {/* Mobile: Replace ACTIVE label with video controls */}
              {isMobileDevice ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleVolumeToggle}
                    className="text-black hover:text-primary transition-colors p-1 bg-gray-100 border border-black hover:bg-gray-200"
                    data-testid="button-volume-status"
                  >
                    {isMuted || volume === 0 ? 
                      <VolumeX className="w-4 h-4" /> : 
                      <Volume2 className="w-4 h-4" />
                    }
                  </button>
                  <button
                    onClick={handleFullscreen}
                    className="text-black hover:text-primary transition-colors p-1 bg-gray-100 border border-black hover:bg-gray-200"
                    data-testid="button-fullscreen-status"
                  >
                    {isFullscreen ? 
                      <Minimize2 className="w-4 h-4" /> : 
                      <Maximize2 className="w-4 h-4" />
                    }
                  </button>
                </div>
              ) : (
                <>
                  <TechnicalLabel 
                    text={`ACTIVE: ${activeAreaTab}`} 
                    className={`text-black ${
                      isFullscreen 
                        ? 'text-sm' 
                        : 'text-xs'
                    }`} 
                  />
                  <TechnicalLabel 
                    text={`STATUS: ${isPlaying ? 'PLAYING' : isCompleted ? 'COMPLETE' : 'READY'}`} 
                    className={`text-black ${
                      isFullscreen 
                        ? 'text-sm' 
                        : 'text-xs'
                    }`} 
                  />
                </>
              )}
              {/* Desktop keeps original layout */}
              {!isMobileDevice && (
                <TechnicalLabel 
                  text={`STATUS: ${isPlaying ? 'PLAYING' : isCompleted ? 'COMPLETE' : 'READY'}`} 
                  className={`text-black ${
                    isFullscreen 
                      ? 'text-sm' 
                      : 'text-xs'
                  }`} 
                />
              )}
            </div>
            <div className={`flex items-center ${isMobileDevice ? 'gap-1' : 'gap-2'}`}>
              <TechnicalLabel 
                text={`${Math.round(adProgress)}%`} 
                className={`text-black ${
                  isFullscreen 
                    ? 'text-sm' 
                    : isMobileDevice 
                      ? 'text-xs' 
                      : 'text-xs'
                }`} 
              />
              <div className={`bg-black ${
                isFullscreen 
                  ? 'w-5 h-5 border border-gray-400' 
                  : isMobileDevice 
                    ? 'w-3 h-3' 
                    : 'w-4 h-4 border border-gray-400'
              }`}>
                <div className={`bg-primary ${
                  isFullscreen 
                    ? 'w-2.5 h-2.5 m-0.5' 
                    : isMobileDevice 
                      ? 'w-1.5 h-1.5 m-0.25' 
                      : 'w-2 h-2 m-0.5'
                }`} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
