import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Zap, TrendingUp, TrendingDown, Minus, RefreshCw, X, ChevronRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import TechnicalLabel from "@/components/ui/technical-label";
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
  if (score >= 85) return "from-emerald-50 to-emerald-100/40 border-emerald-300";
  if (score >= 65) return "from-amber-50 to-amber-100/40 border-amber-300";
  return "from-red-50 to-red-100/40 border-red-300";
}

export function SystemHealthCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showReport, setShowReport] = useState(false);

  const { data: snapshot, isLoading } = useQuery<HealthSnapshotData>({
    queryKey: ["/api/admin/system-health"],
    refetchInterval: 5 * 60 * 1000, // refresh every 5 min
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
        whileHover={{ scale: 1.02, translateY: -4 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => !isLoading && setShowReport(true)}
        className={cn(
          "group split-card bg-gradient-to-br border-2 p-6 text-left transition-all duration-300 cursor-pointer shadow-[4px_4px_0_0_#000] hover:shadow-[6px_6px_0_0_#000]",
          isLoading ? "from-muted to-muted/60 border-muted-foreground/20" : scoreBg(overall)
        )}
        data-testid="card-system-health"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className={cn("w-6 h-6", isLoading ? "text-muted-foreground" : scoreColor(overall))} />
            {snapshot?.isStale && <AlertCircle className="w-3.5 h-3.5 text-amber-500" title="Data stale" />}
          </div>
          <TechnicalLabel text="SYSTEM HEALTH" className="text-muted-foreground text-xs" />
        </div>

        <div className="flex items-end gap-3 mb-2">
          <p className={cn("text-3xl font-black", isLoading ? "text-muted-foreground" : scoreColor(overall))}>
            {isLoading ? "..." : `${Math.round(overall)}`}
            <span className="text-base font-bold">/100</span>
          </p>
          {delta24h !== null && !isLoading && (
            <div className={cn("flex items-center gap-0.5 text-xs font-black mb-1", delta24h > 0 ? "text-emerald-600" : delta24h < 0 ? "text-red-500" : "text-muted-foreground")}>
              {delta24h > 0 ? <TrendingUp className="w-3 h-3" /> : delta24h < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              {delta24h > 0 ? "+" : ""}{delta24h.toFixed(1)} vs 24h
            </div>
          )}
        </div>

        {/* Top reason snippet */}
        {snapshot?.topReason && !isLoading && (
          <p className="text-[10px] text-muted-foreground font-bold leading-relaxed line-clamp-2 mb-3">
            {snapshot.topReason.split("·")[0].trim()}
          </p>
        )}

        {snapshot?.isStale && (
          <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-2">
            Data stale — last computed {snapshot?.recordedAt ? Math.round((Date.now() - new Date(snapshot.recordedAt).getTime()) / 60000) : "?"}m ago
          </p>
        )}

        <div className="flex items-center justify-between mt-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
            Click for full report
          </span>
          <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </div>
      </motion.div>

      {/* Full Report Panel */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="border border-black/10 bg-white rounded-[2rem] p-0 max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.15)] [&>button]:hidden">
          <DialogHeader className="p-6 border-b border-zinc-100 flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <Zap className={cn("w-5 h-5", scoreColor(overall))} />
              <DialogTitle className="text-xl font-black tracking-tighter uppercase">System Health Report</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); recalcMutation.mutate(); }}
                disabled={recalcMutation.isPending}
                className="flex items-center gap-1.5 px-4 h-9 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-black/80 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={cn("w-3 h-3", recalcMutation.isPending && "animate-spin")} />
                {recalcMutation.isPending ? "Calculating..." : "Recalculate Now"}
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
