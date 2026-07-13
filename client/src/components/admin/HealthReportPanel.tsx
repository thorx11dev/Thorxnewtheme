import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import TechnicalLabel from "@/components/ui/technical-label";
import { CheckCircle, AlertTriangle, XCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface HealthSignal {
  name: string;
  score: number;
  rawValue: string;
  detail: string;
}

interface HealthSnapshotData {
  id: string;
  overallScore: string;
  financialScore: string;
  operationalScore: string;
  userHealthScore: string;
  riskHealthScore: string;
  integrityScore: string;
  signalsJson: {
    financial?: HealthSignal[];
    operational?: HealthSignal[];
    userHealth?: HealthSignal[];
    risk?: HealthSignal[];
    integrity?: HealthSignal[];
  };
  topReason: string;
  delta1h: string | null;
  delta24h: string | null;
  recordedAt: string;
  isStale: boolean;
}

interface HistorySnapshot {
  overallScore: string;
  recordedAt: string;
  topReason: string;
}

function scoreColor(s: number) {
  if (s >= 85) return "text-emerald-600";
  if (s >= 65) return "text-amber-500";
  return "text-red-500";
}

function scoreBg(s: number) {
  if (s >= 85) return "bg-emerald-50 border-emerald-200";
  if (s >= 65) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

function SignalIcon({ score }: { score: number }) {
  if (score >= 85) return <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
  if (score >= 50) return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
  return <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />;
}

function DimensionBar({ label, score, weight, signals }: { label: string; score: number; weight: string; signals?: HealthSignal[] }) {
  const [expanded, setExpanded] = React.useState(false);
  const pct = Math.round(score);
  return (
    <div className="space-y-2">
      <div
        className="flex items-center justify-between cursor-pointer group"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-widest text-foreground">{label}</span>
          <span className="text-[9px] font-bold text-muted-foreground border border-muted-foreground/30 px-1.5 py-0.5 rounded-full">{weight}</span>
        </div>
        <span className={cn("text-sm font-black", scoreColor(pct))}>{pct}/100</span>
      </div>
      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", pct >= 85 ? "bg-emerald-500" : pct >= 65 ? "bg-amber-500" : "bg-red-500")}
          style={{ width: `${pct}%` }}
        />
      </div>
      {expanded && signals && (
        <div className="pl-2 space-y-1 pt-1">
          {signals.map((sig) => (
            <div key={sig.name} className="flex items-start gap-2 text-[10px]">
              <SignalIcon score={sig.score} />
              <div className="flex-1">
                <span className="font-black uppercase tracking-widest text-foreground">{sig.name.replace(/_/g, " ")}</span>
                <span className="text-muted-foreground ml-2">{sig.rawValue}</span>
                <p className="text-muted-foreground/70 mt-0.5">{sig.detail}</p>
              </div>
              <span className={cn("font-black shrink-0", scoreColor(sig.score))}>{Math.round(sig.score)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function HealthReportPanel({ snapshot }: { snapshot: HealthSnapshotData | null }) {
  const { data: history } = useQuery<HistorySnapshot[]>({
    queryKey: ["/api/admin/system-health/history"],
    refetchInterval: 5 * 60 * 1000,
  });

  const chartData = (history ?? []).map((h) => ({
    time: new Date(h.recordedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
    score: parseFloat(h.overallScore),
    reason: h.topReason,
  })).reverse();

  const overall = parseFloat(snapshot?.overallScore ?? "0");
  const delta24h = snapshot?.delta24h ? parseFloat(snapshot.delta24h) : null;
  const signals = snapshot?.signalsJson ?? {};

  return (
    <div className="p-6 space-y-8">
      {/* Score Hero */}
      <div className={cn("rounded-2xl border p-6 flex items-center justify-between", scoreBg(overall))}>
        <div>
          <p className={cn("text-5xl font-black", scoreColor(overall))}>{Math.round(overall)}<span className="text-2xl">/100</span></p>
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mt-1">Composite Health Score</p>
        </div>
        {delta24h !== null && (
          <div className={cn("flex items-center gap-1.5 text-lg font-black", delta24h > 0 ? "text-emerald-600" : delta24h < 0 ? "text-red-500" : "text-muted-foreground")}>
            {delta24h > 0 ? <TrendingUp className="w-5 h-5" /> : delta24h < 0 ? <TrendingDown className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
            {delta24h > 0 ? "+" : ""}{delta24h.toFixed(1)} vs 24h ago
          </div>
        )}
      </div>

      {/* Top Reason */}
      {snapshot?.topReason && (
        <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl">
          <TechnicalLabel text="ROOT CAUSE ANALYSIS" className="mb-2" />
          <p className="text-sm text-foreground font-semibold leading-relaxed">{snapshot.topReason}</p>
        </div>
      )}

      {/* 24h Trend Chart */}
      {chartData.length > 0 && (
        <div className="bg-card border-2 border-black shadow-[4px_4px_0_0_#000] overflow-hidden rounded-none">
          <div className="p-4 border-b-2 border-black bg-white">
            <TechnicalLabel text="24H SCORE TREND" />
          </div>
          <div className="p-4 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="2 2" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.15} />
                <XAxis dataKey="time" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis domain={[0, 100]} fontSize={9} tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--background))", border: "2px solid hsl(var(--primary))", borderRadius: "8px", fontSize: "11px", fontWeight: "bold" }}
                  formatter={(v: any) => [`${Math.round(v)}/100`, "Score"]}
                />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Dimension Bars */}
      <div className="space-y-5">
        <TechnicalLabel text="DIMENSION BREAKDOWN — CLICK TO EXPAND SIGNALS" />
        <DimensionBar label="Financial Health" score={parseFloat(snapshot?.financialScore ?? "0")} weight="25%" signals={signals.financial} />
        <DimensionBar label="Operational Health" score={parseFloat(snapshot?.operationalScore ?? "0")} weight="25%" signals={signals.operational} />
        <DimensionBar label="User & Growth Health" score={parseFloat(snapshot?.userHealthScore ?? "0")} weight="20%" signals={signals.userHealth} />
        <DimensionBar label="Risk & Integrity" score={parseFloat(snapshot?.riskHealthScore ?? "0")} weight="20%" signals={signals.risk} />
        <DimensionBar label="Platform Integrity" score={parseFloat(snapshot?.integrityScore ?? "0")} weight="10%" signals={signals.integrity} />
      </div>

      {/* Last 10 snapshots */}
      {(history?.length ?? 0) > 0 && (
        <div>
          <TechnicalLabel text="RECENT SNAPSHOTS" className="mb-3" />
          <div className="space-y-2">
            {(history ?? []).slice(0, 10).map((h, i) => {
              const s = parseFloat(h.overallScore);
              return (
                <div key={i} className="flex items-start gap-3 p-3 bg-zinc-50 border border-zinc-100 rounded-xl">
                  <span className={cn("text-sm font-black w-16 shrink-0", scoreColor(s))}>{Math.round(s)}/100</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground truncate">{h.topReason}</p>
                  </div>
                  <span className="text-[9px] text-muted-foreground shrink-0 font-bold">
                    {new Date(h.recordedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
