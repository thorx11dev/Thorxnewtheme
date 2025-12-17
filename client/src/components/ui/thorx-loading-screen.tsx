export default function ThorxLoadingScreen({ 
  message = "Preparing your experience", 
  duration = 1800 
}: { message?: string; duration?: number }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
      <div className="w-full max-w-sm mx-auto px-6">
        {/* Brand Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black tracking-tight text-foreground mb-2">
            THORX<span className="text-primary">.</span>
          </h1>
          <p className="text-xs text-muted-foreground tracking-widest uppercase">
            {message}
          </p>
        </div>

        {/* Content Skeleton Card */}
        <div className="bg-card border border-border/50 rounded-md p-5 mb-6">
          {/* Header Skeleton */}
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border/30">
            <div 
              className="w-9 h-9 rounded-full bg-muted/80"
              style={{ animation: 'shimmer 1.5s ease-in-out infinite' }}
            />
            <div className="flex-1 space-y-2">
              <div 
                className="h-3.5 bg-muted/80 rounded w-28"
                style={{ animation: 'shimmer 1.5s ease-in-out infinite', animationDelay: '0.1s' }}
              />
              <div 
                className="h-2.5 bg-muted/60 rounded w-20"
                style={{ animation: 'shimmer 1.5s ease-in-out infinite', animationDelay: '0.2s' }}
              />
            </div>
          </div>

          {/* List Items */}
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div 
                  className="flex-shrink-0 w-8 h-8 rounded-full bg-muted/70"
                  style={{ animation: 'shimmer 1.5s ease-in-out infinite', animationDelay: `${0.1 * i}s` }}
                />
                <div className="flex-1 space-y-1.5">
                  <div 
                    className="h-3 bg-muted/70 rounded"
                    style={{ 
                      width: `${75 - (i * 10)}%`,
                      animation: 'shimmer 1.5s ease-in-out infinite', 
                      animationDelay: `${0.15 + (0.1 * i)}s` 
                    }}
                  />
                  <div 
                    className="h-2 bg-muted/50 rounded w-full"
                    style={{ animation: 'shimmer 1.5s ease-in-out infinite', animationDelay: `${0.2 + (0.1 * i)}s` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-full h-0.5 bg-muted/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary/80 rounded-full"
              style={{ animation: 'progressSlide 1.8s ease-in-out infinite' }}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <span 
                className="w-1.5 h-1.5 rounded-full bg-primary"
                style={{ animation: 'dotPulse 1.2s ease-in-out infinite' }}
              />
              <span 
                className="w-1.5 h-1.5 rounded-full bg-primary/60"
                style={{ animation: 'dotPulse 1.2s ease-in-out infinite', animationDelay: '0.2s' }}
              />
              <span 
                className="w-1.5 h-1.5 rounded-full bg-primary/30"
                style={{ animation: 'dotPulse 1.2s ease-in-out infinite', animationDelay: '0.4s' }}
              />
            </div>
          </div>
        </div>

        <style>{`
          @keyframes shimmer {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
          @keyframes progressSlide {
            0% { width: 0%; margin-left: 0%; }
            50% { width: 60%; margin-left: 20%; }
            100% { width: 0%; margin-left: 100%; }
          }
          @keyframes dotPulse {
            0%, 100% { transform: scale(1); opacity: 0.4; }
            50% { transform: scale(1.2); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}
