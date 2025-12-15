import { cn } from "@/lib/utils";
import TechnicalLabel from "@/components/ui/technical-label";
import { LucideIcon } from "lucide-react";
import { memo, useMemo } from "react";

interface MetricCardData {
  id: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant: 'orange' | 'black' | 'white' | 'accent';
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    percentage?: string;
  };
  isLoading?: boolean;
}

interface MetricsCardsProps {
  metrics: MetricCardData[];
  className?: string;
}

const MetricsCards = memo(function MetricsCards({ metrics, className }: MetricsCardsProps) {
  const getCardStyles = (variant: MetricCardData['variant']) => {
    switch (variant) {
      case 'orange':
        return {
          container: "bg-primary text-white border-primary hover:shadow-primary/20",
          icon: "text-white group-hover:text-white/90",
          value: "text-white group-hover:text-white/95",
          title: "text-white/90 group-hover:text-white",
          subtitle: "text-white/70"
        };
      case 'black':
        return {
          container: "bg-black text-primary border-primary hover:shadow-primary/15",
          icon: "text-primary group-hover:text-primary/90",
          value: "text-primary group-hover:text-primary/95",
          title: "text-white/90 group-hover:text-white",
          subtitle: "text-white/60"
        };
      case 'white':
        return {
          container: "bg-white text-black border-primary hover:shadow-lg",
          icon: "text-primary group-hover:text-primary/90",
          value: "text-black group-hover:text-black/95",
          title: "text-black/80 group-hover:text-black",
          subtitle: "text-black/60"
        };
      case 'accent':
        return {
          container: "bg-primary/10 text-primary border-primary hover:shadow-primary/10",
          icon: "text-primary group-hover:text-primary/90",
          value: "text-primary group-hover:text-primary/95",
          title: "text-white/90 group-hover:text-white",
          subtitle: "text-white/60"
        };
      default:
        return {
          container: "bg-black text-white border-primary",
          icon: "text-primary",
          value: "text-white",
          title: "text-white/90",
          subtitle: "text-white/60"
        };
    }
  };

  const formatValue = (value: string | number) => {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return value;
  };

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6", className)}>
      {metrics.map((metric) => {
        const styles = getCardStyles(metric.variant);
        const IconComponent = metric.icon;

        return (
          <div
            key={metric.id}
            className={cn(
              "group relative border-2 p-6 transition-all duration-300 cursor-default",
              "hover:scale-[1.02] hover:shadow-xl",
              "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-black",
              styles.container
            )}
            data-testid={`card-${metric.id}`}
          >
            {/* Industrial corner elements */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-current opacity-40" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-current opacity-40" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-current opacity-40" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-current opacity-40" />

            {/* Main content */}
            <div className="relative z-10">
              {/* Header with icon and value */}
              <div className="flex items-center justify-between mb-3">
                <div className={cn(
                  "transition-all duration-300 group-hover:scale-110",
                  styles.icon
                )}>
                  <IconComponent className="w-10 h-10 md:w-12 md:h-12" />
                </div>
                
                <div className="text-right">
                  {metric.isLoading ? (
                    <div className="h-8 w-16 bg-current opacity-20 animate-pulse" />
                  ) : (
                    <div className={cn(
                      "text-3xl md:text-4xl font-black tracking-tight transition-colors duration-300",
                      styles.value
                    )}>
                      {formatValue(metric.value)}
                    </div>
                  )}
                  
                  {/* Trend indicator */}
                  {metric.trend && (
                    <div className={cn(
                      "text-xs mt-1 flex items-center justify-end gap-1",
                      metric.trend.direction === 'up' ? 'text-green-400' :
                      metric.trend.direction === 'down' ? 'text-red-400' :
                      'text-gray-400'
                    )}>
                      {metric.trend.direction === 'up' ? '↗' : 
                       metric.trend.direction === 'down' ? '↘' : '→'}
                      {metric.trend.percentage && <span>{metric.trend.percentage}</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Title */}
              <TechnicalLabel 
                text={metric.title} 
                className={cn("transition-colors duration-300", styles.title)} 
              />

              {/* Subtitle */}
              {metric.subtitle && (
                <div className={cn(
                  "text-xs mt-1 transition-colors duration-300",
                  styles.subtitle
                )}>
                  {metric.subtitle}
                </div>
              )}
            </div>

            {/* Hover effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            {/* Bottom accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />
          </div>
        );
      })}
    </div>
  );
});

export default MetricsCards;

// Loading skeleton for metrics cards
export function MetricsCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="border-2 border-gray-600 bg-gray-800 p-6 animate-pulse"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gray-600 rounded" />
            <div className="w-16 h-8 bg-gray-600 rounded" />
          </div>
          <div className="w-24 h-4 bg-gray-600 rounded mb-1" />
          <div className="w-20 h-3 bg-gray-600 rounded" />
        </div>
      ))}
    </div>
  );
}