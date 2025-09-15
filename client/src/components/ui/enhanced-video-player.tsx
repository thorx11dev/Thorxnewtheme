import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import TechnicalLabel from "@/components/ui/technical-label";
import { 
  PlayCircle, 
  PauseCircle, 
  Maximize2, 
  Minimize2, 
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  Settings,
  Download
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
  // Core player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  
  // Advanced features state
  const [showSkip, setShowSkip] = useState(false);
  const [adProgress, setAdProgress] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Mobile-specific state for TikTok-style interactions
  const [showMobileControls, setShowMobileControls] = useState(true);
  const [lastTap, setLastTap] = useState(0);
  
  // Refs
  const playerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Format currency
  const formatCurrency = (amount: string) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  // Auto-hide controls
  useEffect(() => {
    if (isPlaying && !isMobile) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    } else {
      setShowControls(true);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, isMobile]);

  // Main timer for video progress
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying && !isMinimized && !isCompleted) {
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
  }, [isPlaying, isMinimized, duration, canSkip, tab.id, tab.reward, onComplete, isCompleted]);

  // Autoplay when active
  useEffect(() => {
    if (autoplay && isActive && !hasStarted) {
      setTimeout(() => {
        handlePlay();
      }, 1000);
    }
  }, [autoplay, isActive, hasStarted]);

  // Player control handlers
  const handlePlay = () => {
    setIsPlaying(true);
    setHasStarted(true);
    setIsBuffering(false);
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

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
    if (!isMinimized) {
      setIsPlaying(false);
    }
  };

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleVolumeToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  // Mobile double-tap for play/pause
  const handleMobileTap = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      // Double tap
      if (isPlaying) {
        handlePause();
      } else {
        handlePlay();
      }
    }
    setLastTap(now);
    
    // Show controls temporarily
    setShowMobileControls(true);
    setTimeout(() => setShowMobileControls(false), 3000);
  };

  const formatVideoTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Mouse movement handler for desktop
  const handleMouseMove = () => {
    if (!isMobile) {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    }
  };

  // Minimized player view
  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-50 bg-black border-2 border-primary w-64 h-36 cursor-pointer hover:scale-105 transition-transform" 
        data-testid={`minimized-player-${tab.id}`}
        onClick={handleMinimize}
      >
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <TechnicalLabel text={tab.title} className="text-white text-xs" />
            <Maximize2 className="w-4 h-4 text-primary" />
          </div>
          <div className="bg-gray-900 h-20 flex items-center justify-center mb-2">
            <span className="text-3xl">{tab.icon}</span>
          </div>
          <Progress value={adProgress} className="h-1" />
        </div>
      </div>
    );
  }

  return (
    <Card 
      className={`bg-black border-2 border-primary transition-all duration-300 ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      } ${isMobile ? 'aspect-[9/16]' : 'aspect-video'}`} 
      data-testid={`video-player-${tab.id}`}
    >
      <CardContent className="p-0 h-full">
        <div 
          ref={playerRef}
          className={`relative bg-gray-900 h-full flex items-center justify-center overflow-hidden cursor-pointer ${
            isMobile ? 'aspect-[9/16]' : 'aspect-video'
          }`}
          onMouseMove={handleMouseMove}
          onClick={isMobile ? handleMobileTap : undefined}
        >
          {/* Video Content Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-black to-primary/10" />
          
          {/* Industrial Grid Overlay */}
          <div className="absolute inset-0 industrial-grid opacity-5" />
          
          {/* Video Content */}
          <div className="relative z-10 text-center">
            <div className={`mb-4 ${isMobile ? 'text-8xl' : 'text-6xl md:text-8xl'}`}>
              {tab.icon}
            </div>
            <TechnicalLabel 
              text={tab.title} 
              className={`text-white ${isMobile ? 'text-lg' : 'text-xl md:text-2xl'}`} 
            />
            <p className={`text-white/60 mt-2 px-4 ${isMobile ? 'text-sm' : ''}`}>
              {tab.description}
            </p>
            {isCompleted && (
              <div className="mt-4 p-4 bg-primary/20 border border-primary">
                <TechnicalLabel text="AD COMPLETED" className="text-primary" />
                <p className="text-white mt-1">You earned {formatCurrency(tab.reward)}</p>
              </div>
            )}
          </div>

          {/* Buffering Indicator */}
          {isBuffering && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-primary"></div>
            </div>
          )}

          {/* Central Play/Pause Button */}
          {!isMobile && (showControls || !isPlaying) && (
            <div className="absolute inset-0 flex items-center justify-center">
              {!isPlaying ? (
                <button
                  onClick={handlePlay}
                  className="bg-primary hover:bg-primary/90 p-6 transition-all duration-200 hover:scale-110 shadow-lg"
                  data-testid="button-play"
                >
                  <PlayCircle className="w-12 h-12 text-white" />
                </button>
              ) : null}
            </div>
          )}

          {/* Mobile Play/Pause Overlay */}
          {isMobile && (showMobileControls || !isPlaying) && (
            <div className="absolute inset-0 flex items-center justify-center">
              {!isPlaying ? (
                <button
                  onClick={handlePlay}
                  className="bg-primary hover:bg-primary/90 p-8 transition-all duration-200"
                  data-testid="button-play-mobile"
                >
                  <PlayCircle className="w-16 h-16 text-white" />
                </button>
              ) : isPlaying && showMobileControls ? (
                <button
                  onClick={handlePause}
                  className="bg-black/50 hover:bg-black/70 p-8 transition-all duration-200"
                  data-testid="button-pause-mobile"
                >
                  <PauseCircle className="w-16 h-16 text-white" />
                </button>
              ) : null}
            </div>
          )}

          {/* Skip Button */}
          {showSkip && canSkip && !isCompleted && (
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 bg-black/80 hover:bg-black text-white px-4 py-2 border border-primary transition-all duration-200 hover:scale-105"
              data-testid="button-skip"
            >
              <TechnicalLabel text="SKIP AD" className="text-white text-xs" />
            </button>
          )}

          {/* Bottom Controls Bar */}
          {(showControls || isMobile) && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4">
              {/* Progress Bar */}
              <div className="mb-4">
                <Progress 
                  value={adProgress} 
                  className="h-2 bg-gray-600 border border-gray-500" 
                />
                <div className="flex justify-between text-xs text-white/60 mt-1">
                  <span>{formatVideoTime(currentTime)}</span>
                  <span>{formatVideoTime(duration)}</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TechnicalLabel 
                    text={`EARN ${formatCurrency(tab.reward)}`} 
                    className="text-primary" 
                  />
                  <span className="text-white/60 text-sm">•</span>
                  <span className="text-white/60 text-sm">
                    {Math.round(adProgress)}% Complete
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Desktop Controls */}
                  {!isMobile && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleVolumeToggle}
                        className="text-white hover:text-primary transition-colors p-1"
                        data-testid="button-volume"
                      >
                        {isMuted || volume === 0 ? 
                          <VolumeX className="w-5 h-5" /> : 
                          <Volume2 className="w-5 h-5" />
                        }
                      </button>
                      <button
                        onClick={handleMinimize}
                        className="text-white hover:text-primary transition-colors p-1"
                        data-testid="button-minimize"
                      >
                        <Minimize2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleFullscreen}
                        className="text-white hover:text-primary transition-colors p-1"
                        data-testid="button-fullscreen"
                      >
                        {isFullscreen ? 
                          <Minimize2 className="w-5 h-5" /> : 
                          <Maximize2 className="w-5 h-5" />
                        }
                      </button>
                    </div>
                  )}

                  {/* Mobile Controls */}
                  {isMobile && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentTime(Math.max(0, currentTime - 10))}
                        className="text-white hover:text-primary transition-colors p-1"
                        data-testid="button-rewind"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setCurrentTime(Math.min(duration, currentTime + 10))}
                        className="text-white hover:text-primary transition-colors p-1"
                        data-testid="button-forward"
                      >
                        <RotateCw className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleVolumeToggle}
                        className="text-white hover:text-primary transition-colors p-1"
                        data-testid="button-volume-mobile"
                      >
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Fullscreen Exit Hint */}
          {isFullscreen && (
            <div className="absolute top-4 left-4">
              <TechnicalLabel text="Press ESC or click minimize to exit fullscreen" className="text-white/60 text-xs" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}