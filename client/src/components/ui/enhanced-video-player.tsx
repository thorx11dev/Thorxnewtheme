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
  MoreHorizontal,
  Minimize, // Import Minimize icon
  Maximize // Import Maximize icon
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

// Individual player state for each area
interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  adProgress: number;
  canSkip: boolean;
  isCompleted: boolean;
  showSkip: boolean;
  autoplayEnabled: boolean; // Added for autoplay toggle
}

// Thorx core color scheme for different players
const playerColors: Record<string, string> = {
  "001": "from-blue-600 via-blue-700 to-blue-800", // Example: Blue for AREA 001
  "002": "from-green-600 via-green-700 to-green-800", // Example: Green for AREA 002
  "003": "from-yellow-500 via-yellow-600 to-yellow-700", // Example: Yellow for AREA 003
  "004": "from-purple-600 via-purple-700 to-purple-800", // Example: Purple for AREA 004
};

// Thorx core colors for UI elements
const thorxOrange = "#F97316"; // Example: primary orange
const thorxBlack = "#000000"; // Example: black

// Single area player component
interface AreaPlayerProps {
  areaId: string;
  areaLabel: string;
  tab: VideoTab;
  isActive: boolean;
  isFullscreen: boolean;
  isMobileDevice: boolean;
  onComplete?: (tabId: string, earnings: string) => void;
  onFullscreenToggle: () => void;
}

function AreaPlayer({ 
  areaId, 
  areaLabel, 
  tab, 
  isActive, 
  isFullscreen, 
  isMobileDevice,
  onComplete,
  onFullscreenToggle
}: AreaPlayerProps) {
  // Independent state for this specific area player
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [adProgress, setAdProgress] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const [autoplayEnabled, setAutoplayEnabled] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [adQueue, setAdQueue] = useState<number[]>([1, 2, 3]); // Queue of ads for this area
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  const duration = 30; // Video duration in seconds
  const playerRef = useRef<HTMLDivElement>(null);

  // Format currency
  const formatCurrency = (amount: string) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const formatVideoTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Timer for video progress - only runs when this area is active
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && isPlaying && !isCompleted) {
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
            onComplete?.(`${tab.id}-area-${areaId}-ad-${currentAdIndex + 1}`, tab.reward);

            // If autoplay is enabled and there are more ads in queue
            if (autoplayEnabled && currentAdIndex < adQueue.length - 1) {
              setTimeout(() => {
                // Move to next ad in queue
                setCurrentAdIndex(prev => prev + 1);
                setCurrentTime(0);
                setAdProgress(0);
                setCanSkip(false);
                setIsCompleted(false);
                setShowSkip(false);
                setIsPlaying(true); // Auto-start next ad
              }, 1500);
            } else if (autoplayEnabled && currentAdIndex >= adQueue.length - 1) {
              // No more ads in queue, disable autoplay
              setAutoplayEnabled(false);
            }

            return duration;
          }

          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isPlaying, isCompleted, duration, canSkip, autoplayEnabled, currentAdIndex, adQueue.length, tab.id, tab.reward, areaId, onComplete]);

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  const handleSkip = () => {
    if (canSkip && !isCompleted) {
      setCurrentTime(duration);
      setAdProgress(100);
      setIsPlaying(false);
      setIsCompleted(true);
      onComplete?.(`${tab.id}-area-${areaId}-ad-${currentAdIndex + 1}`, tab.reward);
    }
  };

  const handleVolumeToggle = () => setIsMuted(!isMuted);
  const handleAutoplayToggle = () => setAutoplayEnabled(!autoplayEnabled);

  if (!isActive) return null;

  return (
    <div 
      ref={playerRef}
      className={`relative flex items-center justify-center overflow-hidden transition-all duration-300 ${
        isFullscreen 
          ? isMobileDevice
            ? 'h-[calc(100vh-80px)] w-full border border-black'
            : 'h-[calc(100vh-200px)] w-full border-2 border-black' 
          : isMobileDevice
            ? 'aspect-video border border-black'
            : 'aspect-video border-2 border-black'
      }`}
      data-testid={`video-player-${areaId}`}
      style={{ 
        backgroundColor: areaId === "001" ? "#1E3A8A" : 
                       areaId === "002" ? "#166534" : 
                       areaId === "003" ? "#92400E" : 
                       areaId === "004" ? "#581C87" : 
                       "black"
      }}
    >
      {/* Industrial Grid Pattern */}
      <div className={`absolute inset-0 ${isMobileDevice ? 'hidden' : 'opacity-10'}`}>
        <div className="industrial-grid" />
      </div>

      {/* Video Content Background */}
      <div className={`absolute inset-0 ${playerColors[areaId] || 'from-black/80 via-gray-900/90 to-black/80'}`} />

      {/* Play Button */}
      <div className="relative z-10 flex items-center justify-center">
        {!isPlaying ? (
          <button
            onClick={handlePlay}
            className={`group relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center transition-all duration-300 hover:bg-white/20 hover:scale-105 hover:border-white/40 ${
              isFullscreen ? 'w-24 h-24' : 'w-16 h-16'
            }`}
            data-testid={`button-play-${areaId}`}
          >
            <PlayCircle className={`text-white group-hover:text-white/90 transition-colors ${
              isFullscreen ? 'w-12 h-12' : 'w-8 h-8'
            }`} />
          </button>
        ) : (
          <div className="text-center text-white">
            <div className={`mb-2 ${isFullscreen ? 'text-6xl mb-4' : 'text-4xl'}`}>{tab.icon}</div>
            <TechnicalLabel 
              text={`${areaLabel} - AD ${currentAdIndex + 1}/${adQueue.length}`} 
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

      {/* Skip Button */}
      {showSkip && canSkip && !isCompleted && (
        <button
          onClick={handleSkip}
          className={`absolute bg-white/90 backdrop-blur-sm text-black border border-black/20 rounded-md hover:bg-white hover:border-black/40 transition-all duration-200 shadow-lg z-20 ${
            isFullscreen ? 'top-6 right-6 px-4 py-3' : 'top-4 right-4 px-3 py-2'
          }`}
          data-testid={`button-skip-${areaId}`}
        >
          <TechnicalLabel 
            text="SKIP AD" 
            className={`text-black font-medium ${isFullscreen ? 'text-sm' : 'text-xs'}`} 
          />
        </button>
      )}

      {/* Progress Bar */}
      <div className={`absolute bottom-0 left-0 right-0 bg-black/80 transition-all duration-300 ${
        isFullscreen ? 'p-4' : isMobileDevice ? 'p-2' : 'p-3'
      }`}>
        <div className={`flex items-center justify-between ${
          isFullscreen ? 'mb-3' : isMobileDevice ? 'mb-1' : 'mb-2'
        }`}>
          <TechnicalLabel 
            text={`${areaLabel} - EARN ${formatCurrency(tab.reward)}`} 
            className={`text-white ${
              isFullscreen ? 'text-sm' : isMobileDevice ? 'text-xs' : 'text-xs'
            }`} 
          />
          <div className={`flex items-center ${isMobileDevice ? 'gap-2' : 'gap-3'}`}>
            <span className={`text-white/60 ${
              isFullscreen ? 'text-sm' : isMobileDevice ? 'text-xs' : 'text-xs'
            }`}>
              {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
            </span>
            {!isMobileDevice && (
              <>
                <button
                  onClick={handleAutoplayToggle}
                  className={`relative rounded-full transition-all duration-300 ${
                    isFullscreen ? 'w-12 h-6' : 'w-10 h-5'
                  } ${
                    autoplayEnabled ? 'bg-primary' : 'bg-gray-400'
                  } border-2 border-white`}
                  data-testid={`button-autoplay-${areaId}`}
                  title={autoplayEnabled ? 'Autoplay: ON' : 'Autoplay: OFF'}
                >
                  <div className={`absolute top-0.5 transition-all duration-300 rounded-full bg-white ${
                    isFullscreen ? 'w-4 h-4' : 'w-3 h-3'
                  } ${
                    autoplayEnabled ? (isFullscreen ? 'left-6' : 'left-5') : 'left-0.5'
                  }`} />
                </button>
                <button
                  onClick={handleVolumeToggle}
                  className="text-white hover:text-primary transition-colors p-1"
                  data-testid={`button-volume-${areaId}`}
                >
                  {isMuted || volume === 0 ? 
                    <VolumeX className={isFullscreen ? 'w-5 h-5' : 'w-4 h-4'} /> : 
                    <Volume2 className={isFullscreen ? 'w-5 h-5' : 'w-4 h-4'} />
                  }
                </button>
                <button
                  onClick={onFullscreenToggle}
                  className="text-white hover:text-primary transition-colors p-1"
                  data-testid={`button-fullscreen-${areaId}`}
                >
                  {isFullscreen ? 
                    <Minimize2 className={isFullscreen ? 'w-5 h-5' : 'w-4 h-4'} /> : 
                    <Maximize2 className={isFullscreen ? 'w-5 h-5' : 'w-4 h-4'} />
                  }
                </button>
              </>
            )}
          </div>
        </div>

        <div className={`w-full bg-gray-600 transition-all duration-300 ${
          isFullscreen ? 'h-3 border border-white/20' : isMobileDevice ? 'h-2 border-none rounded-sm' : 'h-2 border border-white/20'
        }`}>
          <div 
            className={`h-full bg-primary transition-all duration-500 ${
              isMobileDevice ? 'rounded-sm' : 'border-r border-white/40'
            }`}
            style={{ width: `${adProgress}%` }}
          />
        </div>
      </div>

      {/* Industrial Corner Accents */}
      {!isMobileDevice && (
        <>
          <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-white/40" />
          <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-white/40" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-white/40" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-white/40" />
        </>
      )}
    </div>
  );
}

export default function EnhancedVideoPlayer({ 
  tab, 
  isActive = true, 
  onComplete, 
  autoplay = false,
  isMobile = false 
}: EnhancedVideoPlayerProps) {
  const isMobileDevice = useIsMobile();

  // Shared state across all players
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeAreaTab, setActiveAreaTab] = useState("001");
  const [autoplayEnabled, setAutoplayEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);

  const playerRef = useRef<HTMLDivElement>(null);
  
  const handleAutoplayToggle = () => setAutoplayEnabled(!autoplayEnabled);
  const handleVolumeToggle = () => setIsMuted(!isMuted);

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

      setIsFullscreen(isCurrentlyFullscreen);

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
      document.body.classList.remove('video-fullscreen-active');
      document.body.classList.remove('cinematic-mode');
    };
  }, [isMobileDevice]);

  const handleFullscreenToggle = async () => {
    if (!isFullscreen) {
      // Enter fullscreen
      try {
        setIsFullscreen(true);
        
        if (isMobileDevice) {
          // Mobile-specific fullscreen behavior
          document.body.classList.add('video-fullscreen-active');
          document.documentElement.style.overflow = 'hidden';
          document.body.style.overflow = 'hidden';
          
          // Add mobile-specific viewport meta tag adjustments
          const viewport = document.querySelector('meta[name=viewport]');
          if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
          }

          // Request fullscreen on the player container
          if (playerRef.current) {
            if (playerRef.current.requestFullscreen) {
              await playerRef.current.requestFullscreen();
            } else if ((playerRef.current as any).webkitRequestFullscreen) {
              await (playerRef.current as any).webkitRequestFullscreen();
            } else if ((playerRef.current as any).mozRequestFullScreen) {
              await (playerRef.current as any).mozRequestFullScreen();
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
        }
      } catch (error) {
        console.error('Failed to enter fullscreen:', error);
      }
    } else {
      // Exit fullscreen
      try {
        setIsFullscreen(false);
        
        if (isMobileDevice) {
          // Mobile exit fullscreen
          document.body.classList.remove('video-fullscreen-active');
          document.documentElement.style.overflow = '';
          document.body.style.overflow = '';
          
          // Reset viewport meta tag
          const viewport = document.querySelector('meta[name=viewport]');
          if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
          }
        }

        // Exit fullscreen API
        const isActuallyFullscreen = !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
        );

        if (isActuallyFullscreen) {
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
      } catch (error) {
        console.error('Failed to exit fullscreen:', error);
        // Ensure cleanup
        document.body.classList.remove('video-fullscreen-active');
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
      }
    }
  };

  


  return (
    <div 
      ref={playerRef}
      className={`w-full transition-all duration-300 ${
        isFullscreen 
          ? 'fixed inset-0 z-50 bg-black video-player-fullscreen'
          : ''
      }`}
      style={isFullscreen && isMobileDevice ? {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        maxHeight: '100vh'
      } : {}}
    >
      {/* Industrial Frame Container */}
      <div className={`bg-black transition-all duration-300 ${
        isFullscreen 
          ? isMobileDevice
            ? 'h-full w-full p-1'
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

        {/* Main Video Content Area - Independent Players for Each Area */}
        {areaTabs.map((areaTab) => (
          <AreaPlayer
            key={areaTab.id}
            areaId={areaTab.id}
            areaLabel={areaTab.label}
            tab={tab}
            isActive={activeAreaTab === areaTab.id}
            isFullscreen={isFullscreen}
            isMobileDevice={isMobileDevice}
            onComplete={onComplete}
            onFullscreenToggle={handleFullscreenToggle}
          />
        ))}

        {/* Industrial Status Bar - Mobile Controls on Bottom Left */}
        <div className={`bg-white transition-all duration-300 ${
          isFullscreen 
            ? 'mt-4 p-4 border-2 border-black' 
            : isMobileDevice 
              ? 'mt-1 p-1.5 border border-black' 
              : 'mt-2 p-2 border-2 border-black'
        }`}>
          <div className={`flex items-center justify-between ${isMobileDevice ? 'text-xs' : ''}`}>
            <div className={`flex items-center ${isMobileDevice ? 'gap-2' : 'gap-4'}`}>
              {!isMobileDevice ? (
                <>
                  <TechnicalLabel 
                    text={`ACTIVE: ${activeAreaTab}`} 
                    className={`text-black ${isFullscreen ? 'text-sm' : 'text-xs'}`} 
                  />
                  <TechnicalLabel 
                    text="STATUS: READY" 
                    className={`text-black ${isFullscreen ? 'text-sm' : 'text-xs'}`} 
                  />
                </>
              ) : (
                /* Mobile Controls - Bottom Left */
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAutoplayToggle}
                    className={`relative rounded-full transition-all duration-300 ${
                      isFullscreen ? 'w-10 h-5' : 'w-9 h-4'
                    } ${
                      autoplayEnabled ? 'bg-primary' : 'bg-gray-400'
                    } border border-black`}
                    data-testid={`button-autoplay-${activeAreaTab}`}
                    title={autoplayEnabled ? 'Autoplay: ON' : 'Autoplay: OFF'}
                  >
                    <div className={`absolute top-0.5 transition-all duration-300 rounded-full bg-white ${
                      isFullscreen ? 'w-3 h-3' : 'w-2.5 h-2.5'
                    } ${
                      autoplayEnabled ? (isFullscreen ? 'left-5' : 'left-4.5') : 'left-0.5'
                    }`} />
                  </button>
                  <button
                    onClick={handleVolumeToggle}
                    className="text-black hover:text-primary transition-colors p-1 active:scale-95"
                    data-testid={`button-volume-${activeAreaTab}`}
                  >
                    {isMuted || volume === 0 ? 
                      <VolumeX className={isFullscreen ? 'w-4 h-4' : 'w-3.5 h-3.5'} /> : 
                      <Volume2 className={isFullscreen ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
                    }
                  </button>
                  <button
                    onClick={onFullscreenToggle}
                    className="text-black hover:text-primary transition-colors p-1 active:scale-95"
                    data-testid={`button-fullscreen-${activeAreaTab}`}
                  >
                    {isFullscreen ? 
                      <Minimize className={isFullscreen ? 'w-4 h-4' : 'w-3.5 h-3.5'} /> : 
                      <Maximize className={isFullscreen ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
                    }
                  </button>
                </div>
              )}
            </div>
            <div className={`flex items-center ${isMobileDevice ? 'gap-1' : 'gap-2'}`}>
              <TechnicalLabel 
                text="AREA PLAYER" 
                className={`text-black ${isFullscreen ? 'text-sm' : isMobileDevice ? 'text-xs' : 'text-xs'}`} 
              />
              <div className={`bg-black ${
                isFullscreen ? 'w-5 h-5 border border-gray-400' : isMobileDevice ? 'w-3 h-3' : 'w-4 h-4 border border-gray-400'
              }`}>
                <div className={`bg-primary ${
                  isFullscreen ? 'w-2.5 h-2.5 m-0.5' : isMobileDevice ? 'w-1.5 h-1.5 m-0.25' : 'w-2 h-2 m-0.5'
                }`} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}