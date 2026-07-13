import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Zap, TrendingUp, TrendingDown, Minus, RefreshCw, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HealthReportPanel } from "./HealthReportPanel";

interface HealthSnapshotData {
  id: string;
  overallScore: string;
  financialScore: string;
  operationalScore: string;
  userHealthScore: string;
  riskHealthScore: string;
  integrityScore: string;
  topReason: string;
  delta1h: string | null;
  delta24h: string | null;
  recordedAt: string;
  isStale: boolean;
}

function scoreColor(score: number): string {
  if (score >= 85) return "text-emerald-600";
  if (score >= 65) return "text-amber-500";
  return "text-red-500";
}

function scoreBg(score: number): string {
  if (score >= 85) return "bg-emerald-50 border-emerald-200";
  if (score >= 65) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

function scoreGrade(score: number): string {
  if (score >= 85) return "Healthy";
  if (score >= 65) return "Fair";
  return "Needs Attention";
}

export function SystemHealthCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showReport, setShowReport] = useState(false);

  const { data: snapshot, isLoading } = useQuery<HealthSnapshotData>({
    queryKey: ["/api/admin/system-health"],
    refetchInterval: 5 * 60 * 1000,
  });

  const recalcMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/system-health/recalculate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/system-health"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/system-health/history"] });
      toast({ title: "Health Recalculated", description: "System health snapshot updated." });
    },
    onError: () => toast({ title: "Recalculation failed", variant: "destructive" }),
  });

  const overall = parseFloat(snapshot?.overallScore ?? "0");
  const delta24h = snapshot?.delta24h ? parseFloat(snapshot.delta24h) : null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
        onClick={() => !isLoading && setShowReport(true)}
        className={cn(
          "border-[1.5px] rounded-[2rem] p-6 text-left transition-all duration-300 cursor-pointer",
          "hover:shadow-lg hover:-translate-y-0.5",
          isLoading ? "bg-zinc-50 border-zinc-200" : scoreBg(overall)
        )}
        data-testid="card-system-health"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-full", isLoading ? "bg-zinc-200" : score(overall) >= 85 ? "bg-emerald-100" : overall >= 65 ? "bg-amber-100" : "bg-red-100")}>
              <Zap className={cn("w-4 h-4", isLoading ? "text-zinc-400" : scoreColor(overall))} />
            </div>
            {snapshot?.isStale && <AlertCircle className="w-3.5 h-3.5 text-amber-500" title="Data may be outdated" />}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">System Health</span>
        </div>

        <div className="flex items-end gap-3 mb-2">
          <p className={cn("text-4xl font-black", isLoading ? "text-zinc-300" : scoreColor(overall))}>
            {isLoading ? "—" : Math.round(overall)}
            <span className="text-lg font-bold text-muted-foreground">/100</span>
          </p>
          {delta24h !== null && !isLoading && (
            <div className={cn("flex items-center gap-0.5 text-xs font-black mb-1.5", delta24h > 0 ? "text-emerald-600" : delta24h < 0 ? "text-red-500" : "text-muted-foreground")}>
              {delta24h > 0 ? <TrendingUp className="w-3 h-3" /> : delta24h < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              {delta24h > 0 ? "+" : ""}{delta24h.toFixed(1)} today
            </div>
          )}
        </div>

        {!isLoading && (
          <p className={cn("text-sm font-bold mb-3", scoreColor(overall))}>{scoreGrade(overall)}</p>
        )}

        {snapshot?.topReason && !isLoading && (
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mb-4">
            {snapshot.topReason.split("·")[0].trim()}
          </p>
        )}

        {snapshot?.isStale && (
          <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-3">
            Outdated — {snapshot?.recordedAt ? Math.round((Date.now() - new Date(snapshot.recordedAt).getTime()) / 60000) : "?"}m old
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-muted-foreground">Tap for full report →</span>
        </div>
      </motion.div>

      {/* Full Report Dialog */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="border border-black/10 bg-white rounded-[2rem] p-0 max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.15)] [&>button]:hidden">
          <DialogHeader className="p-6 border-b border-zinc-100 flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <Zap className={cn("w-5 h-5", scoreColor(overall))} />
              <DialogTitle className="text-xl font-black tracking-tighter">System Health Report</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); recalcMutation.mutate(); }}
                disabled={recalcMutation.isPending}
                className="flex items-center gap-1.5 px-4 h-9 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-black/80 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={cn("w-3 h-3", recalcMutation.isPending && "animate-spin")} />
                {recalcMutation.isPending ? "Updating..." : "Refresh Now"}
              </button>
              <button onClick={() => setShowReport(false)} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-zinc-100">
                <X className="w-4 h-4" />
              </button>
            </div>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
            <HealthReportPanel snapshot={snapshot ?? null} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Helper to avoid TS error in JSX
function score(s: number) { return s; }
