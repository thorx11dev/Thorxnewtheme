import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

interface MetricSkeletonProps {
  className?: string;
}

function MetricSkeleton({ className }: MetricSkeletonProps) {
  return (
    <div className={cn("split-card p-6 text-center space-y-4", className)}>
      <Skeleton className="w-12 h-12 mx-auto rounded-full" />
      <Skeleton className="h-3 w-24 mx-auto" />
      <Skeleton className="h-8 w-32 mx-auto" />
      <Skeleton className="h-3 w-20 mx-auto" />
    </div>
  )
}

interface ChartSkeletonProps {
  className?: string;
}

function ChartSkeleton({ className }: ChartSkeletonProps) {
  return (
    <div className={cn("split-card p-6 space-y-4", className)}>
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="space-y-2">
        <div className="flex items-end justify-between h-32 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton 
              key={i}
              className="w-full"
              style={{ height: `${Math.random() * 60 + 40}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-2 w-6" />
          ))}
        </div>
      </div>
    </div>
  )
}

export { Skeleton, MetricSkeleton, ChartSkeleton }
