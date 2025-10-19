
import { useEffect, useState } from "react";
import TechnicalLabel from "./technical-label";
import Barcode from "./barcode";

interface ThorxLoadingScreenProps {
  message?: string;
  duration?: number;
}

export default function ThorxLoadingScreen({ 
  message = "INITIALIZING SYSTEM", 
  duration = 1800 
}: ThorxLoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState("");
  
  const statusSequence = [
    "CONNECTING TO NETWORK",
    "AUTHENTICATING USER",
    "LOADING DASHBOARD",
    "PREPARING INTERFACE"
  ];

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + (100 / (duration / 50));
      });
    }, 50);

    const statusInterval = setInterval(() => {
      setCurrentStatus(statusSequence[Math.floor(Math.random() * statusSequence.length)]);
    }, 400);

    return () => {
      clearInterval(progressInterval);
      clearInterval(statusInterval);
    };
  }, [duration]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
      {/* Industrial Grid Background */}
      <div className="industrial-grid fixed inset-0 opacity-20" />

      {/* Main Loading Container */}
      <div className="relative z-10 w-full max-w-2xl mx-auto px-4">
        {/* THORX Logo */}
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-foreground mb-4 animate-pulse">
            THORX.
          </h1>
          <Barcode className="w-32 md:w-48 h-8 md:h-10 mx-auto opacity-60" />
        </div>

        {/* Loading Bar Container - Industrial Design */}
        <div className="relative mb-6">
          {/* Main Progress Bar */}
          <div className="wireframe-border bg-white p-4">
            <div className="mb-4">
              <TechnicalLabel text={message} className="text-foreground text-sm mb-2" />
            </div>
            
            {/* Progress Bar */}
            <div className="relative h-3 bg-muted border-2 border-black overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-primary transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
              {/* Animated scanner line */}
              <div 
                className="absolute inset-y-0 w-1 bg-white/80 animate-pulse"
                style={{ left: `${progress}%` }}
              />
            </div>

            {/* Status Text */}
            <div className="mt-4 flex items-center justify-between">
              <TechnicalLabel 
                text={currentStatus} 
                className="text-primary text-xs animate-pulse" 
              />
              <TechnicalLabel 
                text={`${Math.floor(progress)}%`} 
                className="text-foreground text-xs font-black" 
              />
            </div>
          </div>

          {/* Corner Brackets */}
          <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-primary" />
          <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-primary" />
          <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-primary" />
          <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-primary" />
        </div>

        {/* Portal Preview Skeleton - Desktop Only */}
        <div className="hidden md:block mt-12">
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="border-2 border-black bg-muted/30 p-4 h-24 animate-pulse">
                  <div className="w-8 h-8 bg-black/20 mb-2" />
                  <div className="w-full h-3 bg-black/10 mb-2" />
                  <div className="w-3/4 h-3 bg-black/10" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Preview Skeleton */}
        <div className="md:hidden mt-8">
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="border-2 border-black bg-muted/30 p-3 h-20 animate-pulse">
                  <div className="w-6 h-6 bg-black/20 mb-2" />
                  <div className="w-full h-2 bg-black/10 mb-1" />
                  <div className="w-2/3 h-2 bg-black/10" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Info Footer */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-2 h-2 bg-primary animate-pulse" />
            <TechnicalLabel text="SECURE CONNECTION ESTABLISHED" className="text-muted-foreground text-xs" />
          </div>
          <TechnicalLabel text="PROTOCOL v2.47 • 256-BIT ENCRYPTION" className="text-muted-foreground text-xs" />
        </div>
      </div>
    </div>
  );
}
