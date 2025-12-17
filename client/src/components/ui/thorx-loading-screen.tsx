export default function ThorxLoadingScreen({ 
  message = "Loading", 
  duration = 1800 
}: { message?: string; duration?: number }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
      <div className="w-full max-w-md mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-1">App Loading</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>

        {/* Skeleton List */}
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              {/* Avatar Skeleton */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted animate-pulse" />
              
              {/* Content Skeleton */}
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-3 bg-muted rounded animate-pulse w-full" />
              </div>
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full"
                style={{
                  animation: 'progress 2s ease-in-out infinite'
                }}
              />
            </div>
            <span>Loading</span>
          </div>
        </div>

        <style>{`
          @keyframes progress {
            0% { width: 0%; }
            50% { width: 100%; }
            100% { width: 0%; }
          }
        `}</style>
      </div>
    </div>
  );
}
