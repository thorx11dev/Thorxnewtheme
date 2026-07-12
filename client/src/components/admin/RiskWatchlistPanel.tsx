import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Search,
  RefreshCw,
  ChevronRight,
  User,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Zap,
  Activity,
  TrendingUp,
  Users2,
  Smartphone,
  Link2,
  Banknote,
  ChevronLeft,
  GitBranch,
  Gauge,
  ShieldQuestion,
  ArrowUpDown,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { format, formatDistanceToNow } from "date-fns";
import { resolveAvatarUrl } from "@/lib/rankAvatars";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RiskSignal {
  name: string;
  score: number;
  detail: string;
}

interface RiskCaseUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string | null;
  rank?: string | null;
  profilePicture?: string | null;
}

interface RiskCase {
  id: string;
  userId: string;
  riskScore: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "Investigating" | "Cleared" | "Actioned";
  signals: RiskSignal[];
  assignedTo?: string | null;
  notes?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  resolution?: string | null;
  createdAt: string;
  updatedAt: string;
  user: RiskCaseUser;
}

interface RiskCasesResponse {
  cases: RiskCase[];
  total: number;
  /** Server-computed totals across ALL cases (not page-scoped). */
  severityCounts: { Critical: number; High: number; Medium: number; Low: number };
}

interface ScoreHistoryPoint {
  snapshotAt: string;
  performanceScore: string;
  riskScore: string;
  earningsScore: string;
  teamScore: string;
  activeScore: string;
  healthScore: string;
}

// ─── Severity / Status helpers ────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  Low:      { bg: "bg-zinc-50",   border: "border-zinc-200",   text: "text-zinc-600",   icon: <Shield      size={12} />, ring: "ring-zinc-200",   bar: "bg-zinc-400"    },
  Medium:   { bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700",  icon: <AlertTriangle size={12} />, ring: "ring-amber-200", bar: "bg-amber-400"   },
  High:     { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", icon: <ShieldAlert size={12} />, ring: "ring-orange-200",  bar: "bg-orange-500"  },
  Critical: { bg: "bg-red-50",    border: "border-red-200",    text: "text-red-700",    icon: <ShieldX     size={12} />, ring: "ring-red-300",     bar: "bg-red-600"     },
};

const STATUS_CONFIG = {
  Open:          { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-700",   label: "Open"          },
  Investigating: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", label: "Investigating" },
  Cleared:       { bg: "bg-green-50",  border: "border-green-200",  text: "text-green-700",  label: "Cleared"       },
  Actioned:      { bg: "bg-zinc-100",  border: "border-zinc-200",   text: "text-zinc-600",   label: "Actioned"      },
};

const SIGNAL_ICONS: Record<string, React.ReactNode> = {
  "Earnings Velocity":     <TrendingUp size={14} />,
  "Bot Network":           <Users2     size={14} />,
  "Device Clustering":     <Smartphone size={14} />,
  "Chain Linearity":       <Link2      size={14} />,
  "Cash-out Velocity":     <Banknote   size={14} />,
  "Circular Referral":     <GitBranch  size={14} />,
  "Task Completion Speed": <Gauge      size={14} />,
};

// Signal maximum scores (fixed weights matching risk-engine.ts)
const MAX_BY_SIGNAL: Record<string, number> = {
  "Earnings Velocity":     25,
  "Bot Network":           20,
  "Device Clustering":     15,
  "Chain Linearity":       12,
  "Cash-out Velocity":     10,
  "Circular Referral":      8,
  "Task Completion Speed": 10,
};

const TRUST_STATUSES = ["Special", "Trusted", "Normal", "Dangerous"] as const;

// ─── Badges ───────────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: RiskCase["severity"] }) {
  const c = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.Low;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-widest",
      c.bg, c.border, c.text
    )}>
      {c.icon} {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: RiskCase["status"] }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.Open;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-widest",
      c.bg, c.border, c.text
    )}>
      {c.label}
    </span>
  );
}

// ─── User Avatar ─────────────────────────────────────────────────────────────

function UserAvatar({ user, size = 9 }: { user: RiskCaseUser; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = user.profilePicture || resolveAvatarUrl(user.avatar, user.rank);
  const dim = `w-${size} h-${size}`;
  if (src && !failed) {
    return (
      <div className={cn("rounded-full border-[1.5px] border-[#111]/20 overflow-hidden bg-zinc-100 shrink-0", dim)}>
        <img src={src} alt="" className="w-full h-full object-cover" onError={() => setFailed(true)} />
      </div>
    );
  }
  return (
    <div className={cn("rounded-full border-[1.5px] border-[#111]/20 bg-zinc-100 flex items-center justify-center shrink-0", dim)}>
      <User className="w-4 h-4 text-zinc-400" />
    </div>
  );
}

// ─── Signal Bar ───────────────────────────────────────────────────────────────

function SignalBar({ signal, maxPossible }: { signal: RiskSignal; maxPossible: number }) {
  const pct = Math.min(100, (signal.score / Math.max(1, maxPossible)) * 100);
  const color = pct >= 70 ? "bg-red-500" : pct >= 40 ? "bg-orange-400" : pct > 0 ? "bg-amber-300" : "bg-zinc-200";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#111]">
          <span className={cn("opacity-60", pct > 0 ? "opacity-100" : "")}>
            {SIGNAL_ICONS[signal.name] ?? <Activity size={14} />}
          </span>
          {signal.name}
        </div>
        <span className={cn(
          "text-[11px] font-black tabular-nums",
          signal.score > 0 ? (pct >= 70 ? "text-red-600" : pct >= 40 ? "text-orange-600" : "text-amber-600") : "text-zinc-400"
        )}>
          {signal.score} pts
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-zinc-400 leading-snug">{signal.detail}</p>
    </div>
  );
}

// ─── Score History Mini Chart ─────────────────────────────────────────────────

function ScoreHistoryChart({ userId }: { userId: string }) {
  const { data: history = [], isLoading } = useQuery<ScoreHistoryPoint[]>({
    queryKey: [`/api/admin/risk-cases/user/${userId}/score-history`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/risk-cases/user/${userId}/score-history`);
      return res.json();
    },
    staleTime: 60_000,
  });

  if (isLoading) return <div className="h-16 bg-zinc-50 rounded-xl animate-pulse" />;
  if (!history.length) return (
    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
      No history recorded yet.
    </p>
  );

  const sorted = [...history].reverse().slice(-15);

  return (
    <div className="space-y-2">
      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
        Performance Score Trend (last {sorted.length} snapshots)
      </p>
      <div className="flex items-end gap-1 h-16">
        {sorted.map((pt, i) => {
          const h = Math.max(4, (parseFloat(pt.performanceScore) / 100) * 64);
          const risk = parseFloat(pt.riskScore);
          const barColor =
            risk >= 75 ? "bg-red-500" :
            risk >= 50 ? "bg-orange-400" :
            risk >= 25 ? "bg-amber-300" : "bg-emerald-400";
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
              <div className={cn("w-full rounded-sm transition-all", barColor)} style={{ height: `${h}px` }} />
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                <div className="bg-[#111] text-white rounded-lg px-2 py-1 text-[9px] font-black whitespace-nowrap shadow-lg">
                  Perf: {parseFloat(pt.performanceScore).toFixed(1)}<br />
                  Risk: {parseFloat(pt.riskScore).toFixed(1)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[8px] font-bold text-zinc-300 uppercase tracking-widest">
        <span>{sorted.length > 0 ? format(new Date(sorted[0].snapshotAt), "MMM d") : ""}</span>
        <span>{sorted.length > 0 ? format(new Date(sorted[sorted.length - 1].snapshotAt), "MMM d") : ""}</span>
      </div>
    </div>
  );
}

// ─── Case Detail Drawer ───────────────────────────────────────────────────────
// Positioned below the portal header (h-20 md:h-24) so it never obscures
// the THORX branding or the logged-in user badge.

function CaseDetailDrawer({
  riskCase,
  onClose,
  onUpdated,
}: {
  riskCase: RiskCase;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(riskCase.notes ?? "");
  const [resolution, setResolution] = useState(riskCase.resolution ?? "");
  const [trustStatusOutcome, setTrustStatusOutcome] = useState<string>("");

  const updateMutation = useMutation({
    mutationFn: async (updates: {
      status?: string;
      notes?: string;
      resolution?: string;
      trustStatusOutcome?: string;
    }) => {
      const res = await apiRequest("PATCH", `/api/admin/risk-cases/${riskCase.id}`, updates);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Update failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/risk-cases"] });
      onUpdated();
      toast({ title: "Case updated" });
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const handleStatus = (status: string) => {
    updateMutation.mutate({
      status,
      notes,
      resolution,
      ...(trustStatusOutcome ? { trustStatusOutcome } : {}),
    });
  };

  const handleSaveNotes = () => {
    updateMutation.mutate({ notes });
  };

  const score = parseFloat(riskCase.riskScore);
  const sc = SEVERITY_CONFIG[riskCase.severity] ?? SEVERITY_CONFIG.Low;
  const isPending = updateMutation.isPending;

  // Score bar color
  const scoreBarColor =
    score >= 75 ? "bg-red-600" :
    score >= 50 ? "bg-orange-500" :
    score >= 25 ? "bg-amber-400" : "bg-emerald-500";

  return (
    <>
      {/* Backdrop — full screen for click-to-close, but visually behind the panel */}
      <div
        className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Close panel"
      />

      {/* Sliding panel — starts below the portal header (h-20 = 5rem on mobile, h-24 = 6rem on desktop) */}
      <div className="fixed top-20 md:top-24 right-0 bottom-0 z-50 w-full max-w-[480px] flex flex-col bg-[#f5f0e8] border-l-4 border-[#111] shadow-2xl animate-in slide-in-from-right-8 duration-300">

        {/* ── Panel Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-[#111]/15 bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar user={riskCase.user} size={10} />
            <div className="min-w-0">
              <p className="font-black text-sm text-[#111] uppercase tracking-tight truncate leading-none">
                {riskCase.user.firstName} {riskCase.user.lastName}
              </p>
              <p className="text-[10px] text-zinc-400 font-bold truncate mt-0.5">{riskCase.user.email}</p>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <SeverityBadge severity={riskCase.severity} />
                <StatusBadge status={riskCase.status} />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full border-2 border-[#111] bg-white hover:bg-[#111] hover:text-white text-[#111] flex items-center justify-center transition-all"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Composite Risk Score */}
          <div className="bg-white border-2 border-[#111] rounded-2xl p-5 shadow-sm">
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3">
              Composite Risk Score
            </p>
            <div className="flex items-end gap-3">
              <span className={cn("text-5xl font-black tabular-nums leading-none", sc.text)}>
                {score.toFixed(0)}
              </span>
              <span className="text-zinc-400 font-bold text-sm mb-1">/ 100</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-zinc-100 border border-[#111]/10 overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-700", scoreBarColor)}
                style={{ width: `${Math.min(100, score)}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-1.5">
              <span>Low</span><span>Medium</span><span>High</span><span>Critical</span>
            </div>
          </div>

          {/* Signal Breakdown */}
          <div className="bg-white border-2 border-[#111] rounded-2xl p-5 shadow-sm space-y-4">
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Signal Breakdown</p>
            {Array.isArray(riskCase.signals) && riskCase.signals.length > 0 ? (
              riskCase.signals.map((sig, i) => (
                <SignalBar key={i} signal={sig} maxPossible={MAX_BY_SIGNAL[sig.name] ?? 30} />
              ))
            ) : (
              <p className="text-[11px] text-zinc-400 font-bold">No signals recorded.</p>
            )}
          </div>

          {/* Score History Chart */}
          <div className="bg-white border-2 border-[#111] rounded-2xl p-5 shadow-sm">
            <ScoreHistoryChart userId={riskCase.userId} />
          </div>

          {/* Timeline */}
          <div className="bg-white border-2 border-[#111] rounded-2xl p-5 shadow-sm space-y-3">
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Timeline</p>
            <div className="space-y-2 text-[11px] text-zinc-600 font-bold">
              <div className="flex items-center gap-2">
                <Clock size={12} className="text-zinc-300 shrink-0" />
                <span>Case opened {formatDistanceToNow(new Date(riskCase.createdAt), { addSuffix: true })}</span>
              </div>
              {riskCase.updatedAt !== riskCase.createdAt && (
                <div className="flex items-center gap-2">
                  <Activity size={12} className="text-zinc-300 shrink-0" />
                  <span>Last updated {formatDistanceToNow(new Date(riskCase.updatedAt), { addSuffix: true })}</span>
                </div>
              )}
              {riskCase.resolvedAt && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                  <span>Resolved {formatDistanceToNow(new Date(riskCase.resolvedAt), { addSuffix: true })}</span>
                </div>
              )}
              {riskCase.resolution && (
                <p className="pl-5 text-[10px] text-zinc-400 italic">"{riskCase.resolution}"</p>
              )}
            </div>
          </div>

          {/* Investigation Notes */}
          <div className="bg-white border-2 border-[#111] rounded-2xl p-5 shadow-sm space-y-3">
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Investigation Notes</p>
            <textarea
              className="w-full h-24 bg-[#f5f0e8] border-2 border-[#111]/20 rounded-xl p-3 text-xs font-medium text-[#111] placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#111]/20 transition-all"
              placeholder="Add notes about this case…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <Button
              onClick={handleSaveNotes}
              disabled={isPending}
              className="h-8 bg-[#111] text-white font-black text-[9px] uppercase tracking-widest px-5 rounded-full hover:bg-zinc-700 transition-all"
            >
              Save Notes
            </Button>
          </div>

          {/* Resolution / Trust Status (only for open cases) */}
          {(riskCase.status === "Open" || riskCase.status === "Investigating") && (
            <div className="bg-white border-2 border-[#111] rounded-2xl p-5 shadow-sm space-y-4">
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Resolve Case</p>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Resolution Reason</label>
                <input
                  className="w-full h-9 bg-[#f5f0e8] border-2 border-[#111]/20 rounded-full px-4 text-xs font-medium text-[#111] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#111]/20 transition-all"
                  placeholder="Why clearing or actioning this case…"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                  Set Trust Status on Resolution
                </label>
                <select
                  value={trustStatusOutcome}
                  onChange={(e) => setTrustStatusOutcome(e.target.value)}
                  className="w-full h-9 px-4 bg-[#f5f0e8] border-2 border-[#111]/20 rounded-full text-xs font-bold text-[#111] focus:outline-none focus:ring-2 focus:ring-[#111]/20 transition-all appearance-none cursor-pointer"
                >
                  <option value="">Don't change trust status</option>
                  {TRUST_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <p className="text-[9px] text-zinc-400 leading-snug">
                  The resolution reason is logged as the "why" for the trust status change.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Action Footer ── */}
        <div className="px-5 py-4 border-t-2 border-[#111]/15 bg-white shrink-0 flex flex-wrap gap-2">
          {riskCase.status === "Open" && (
            <Button
              onClick={() => handleStatus("Investigating")}
              disabled={isPending}
              className="flex-1 h-10 bg-purple-600 text-white border-b-4 border-purple-800 font-black text-[10px] uppercase tracking-widest rounded-full hover:bg-purple-700 transition-all flex items-center justify-center gap-1.5"
            >
              <Eye size={13} /> Investigate
            </Button>
          )}
          {(riskCase.status === "Open" || riskCase.status === "Investigating") && (
            <>
              <Button
                onClick={() => handleStatus("Cleared")}
                disabled={isPending}
                className="flex-1 h-10 bg-emerald-600 text-white border-b-4 border-emerald-800 font-black text-[10px] uppercase tracking-widest rounded-full hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 size={13} /> Clear
              </Button>
              <Button
                onClick={() => handleStatus("Actioned")}
                disabled={isPending}
                className="flex-1 h-10 bg-red-600 text-white border-b-4 border-red-800 font-black text-[10px] uppercase tracking-widest rounded-full hover:bg-red-700 transition-all flex items-center justify-center gap-1.5"
              >
                <XCircle size={13} /> Action
              </Button>
            </>
          )}
          {(riskCase.status === "Cleared" || riskCase.status === "Actioned") && (
            <Button
              onClick={() => handleStatus("Open")}
              disabled={isPending}
              className="flex-1 h-10 bg-[#111] text-white border-b-4 border-zinc-800 font-black text-[10px] uppercase tracking-widest rounded-full hover:bg-zinc-700 transition-all"
            >
              Reopen Case
            </Button>
          )}
          {isPending && (
            <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2">
              <RefreshCw size={12} className="animate-spin" /> Saving…
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Signal Accuracy (Feedback Loop) ───────────────────────────────────────────

interface SignalStat {
  signal: string;
  timesTriggered: number;
  actioned: number;
  cleared: number;
  precision: number | null;
}

function SignalAccuracyPanel() {
  const { data: stats = [], isLoading } = useQuery<SignalStat[]>({
    queryKey: ["/api/admin/risk-cases/signal-stats"],
    staleTime: 60_000,
  });

  if (isLoading) return <div className="h-24 bg-zinc-50 rounded-[1.5rem] animate-pulse" />;
  if (!stats.length) return null;

  return (
    <div className="bg-white border-[1.5px] border-[#111]/10 rounded-[1.5rem] p-5 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldQuestion size={16} className="text-zinc-400" />
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
          Signal Accuracy — from resolved cases
        </p>
      </div>
      <p className="text-[10px] text-zinc-400 leading-snug">
        Precision = share of triggered cases confirmed as fraud (Actioned) vs. dismissed (Cleared). Low precision = noisy signal.
      </p>
      <div className="space-y-2">
        {stats.map((s) => (
          <div key={s.signal} className="flex items-center gap-3">
            <div className="w-40 shrink-0 flex items-center gap-1.5 text-[11px] font-bold text-zinc-700">
              {SIGNAL_ICONS[s.signal] ?? <Activity size={14} />}
              <span className="truncate">{s.signal}</span>
            </div>
            <div className="flex-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  (s.precision ?? 0) >= 66 ? "bg-emerald-500" :
                  (s.precision ?? 0) >= 33 ? "bg-amber-400" : "bg-red-400"
                )}
                style={{ width: `${s.precision ?? 0}%` }}
              />
            </div>
            <span className="w-14 shrink-0 text-right text-[10px] font-black tabular-nums text-zinc-500">
              {s.precision === null ? "—" : `${s.precision}%`}
            </span>
            <span className="w-20 shrink-0 text-right text-[9px] font-bold text-zinc-300 uppercase tracking-widest">
              {s.timesTriggered} cases
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export function RiskWatchlistPanel({ onViewUserInCRM }: { onViewUserInCRM?: (email: string) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [selectedCase, setSelectedCase] = useState<RiskCase | null>(null);

  const queryKey = `/api/admin/risk-cases?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}${severityFilter ? `&severity=${severityFilter}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}${search ? `&search=${encodeURIComponent(search)}` : ""}`;

  const { data, isLoading, isError } = useQuery<RiskCasesResponse>({
    queryKey: [queryKey],
    staleTime: 30_000,
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/risk-scan");
      if (!res.ok) throw new Error("Scan failed");
      return res.json();
    },
    onSuccess: (d) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/risk-cases"] });
      toast({
        title: "Risk Scan Complete",
        description: `${d.scanned} users scanned — ${d.flagged} flagged, ${d.critical} critical.`,
      });
    },
    onError: () => {
      toast({ title: "Scan Failed", description: "Could not run risk scan.", variant: "destructive" });
    },
  });

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  // Use server-computed counts (all cases in DB, not just the current page)
  const severityCounts = data?.severityCounts ?? { Critical: 0, High: 0, Medium: 0, Low: 0 };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase text-[#111]">Risk Watchlist</h2>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
            Persistent case management · {data?.total ?? "—"} cases tracked · Sorted by risk score
          </p>
        </div>
        <Button
          onClick={() => scanMutation.mutate()}
          disabled={scanMutation.isPending}
          className="h-10 bg-[#111] text-white border-[1.5px] border-[#111] font-black text-[10px] px-5 hover:bg-red-600 hover:border-red-600 rounded-full transition-all uppercase shadow-sm flex items-center gap-2"
        >
          <Zap size={13} className={scanMutation.isPending ? "animate-pulse" : ""} />
          {scanMutation.isPending ? "Scanning…" : "Run Risk Scan"}
        </Button>
      </div>

      {/* Signal Accuracy Feedback Loop */}
      <SignalAccuracyPanel />

      {/* Severity Summary Cards — counts from server (all cases, not page) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["Critical", "High", "Medium", "Low"] as const).map((sev) => {
          const c = SEVERITY_CONFIG[sev];
          const count = severityCounts[sev];
          const isActive = severityFilter === sev;
          return (
            <button
              key={sev}
              onClick={() => { setSeverityFilter(isActive ? "" : sev); setPage(0); }}
              className={cn(
                "p-4 rounded-[1.5rem] border-[1.5px] text-left transition-all hover:shadow-md",
                isActive
                  ? `${c.bg} ${c.border} ring-2 ${c.ring}`
                  : "bg-white border-[#111]/10 hover:border-[#111]/20"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn("text-[9px] font-black uppercase tracking-widest", isActive ? c.text : "text-zinc-400")}>
                  {sev}
                </span>
                <span className={cn("w-7 h-7 rounded-xl flex items-center justify-center border", c.bg, c.border, c.text)}>
                  {c.icon}
                </span>
              </div>
              <p className="text-2xl font-black tabular-nums text-[#111]">{count}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by name or email…"
            className="w-full h-10 pl-11 pr-4 bg-white border-[1.5px] border-[#111] rounded-full text-xs font-bold text-[#111] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="h-10 px-4 bg-white border-[1.5px] border-[#111] rounded-full text-xs font-bold text-[#111] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="Open">Open</option>
          <option value="Investigating">Investigating</option>
          <option value="Cleared">Cleared</option>
          <option value="Actioned">Actioned</option>
        </select>
        {(severityFilter || statusFilter || search) && (
          <Button
            onClick={() => { setSeverityFilter(""); setStatusFilter(""); setSearch(""); setPage(0); }}
            className="h-10 bg-zinc-100 text-zinc-500 font-black text-[10px] uppercase px-4 rounded-full border border-zinc-200 hover:bg-zinc-200 transition-all"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Case List */}
      <div className="bg-white border-[1.5px] border-[#111] rounded-[2rem] overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-zinc-100 animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-12 text-center">
            <ShieldX className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="font-black text-sm uppercase tracking-widest text-red-600">Failed to load cases</p>
            <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-widest font-bold">
              Run a Risk Scan to generate the first cases.
            </p>
          </div>
        ) : !data?.cases.length ? (
          <div className="p-12 text-center">
            <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="font-black text-sm uppercase tracking-widest text-zinc-600">No Cases Found</p>
            <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-widest font-bold">
              {search || severityFilter || statusFilter
                ? "Try adjusting your filters."
                : "Run a Risk Scan to generate cases."}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b-[1.5px] border-[#111]/10 bg-zinc-50">
                <th className="px-4 py-3 text-left text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-6">User</th>
                <th className="px-4 py-3 text-left text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                  <div className="flex items-center gap-1">
                    Risk Score
                    <ArrowUpDown size={10} className="text-zinc-300" aria-label="Sorted highest to lowest" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-[9px] font-black text-zinc-400 uppercase tracking-widest">Severity</th>
                <th className="px-4 py-3 text-left text-[9px] font-black text-zinc-400 uppercase tracking-widest">Status</th>
                <th className="px-4 py-3 text-left text-[9px] font-black text-zinc-400 uppercase tracking-widest">Updated</th>
                <th className="pr-6 pl-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.cases.map((rc) => {
                const score = parseFloat(rc.riskScore);
                const barColor =
                  score >= 75 ? "bg-red-500" :
                  score >= 50 ? "bg-orange-400" :
                  score >= 25 ? "bg-amber-400" : "bg-zinc-300";
                return (
                  <tr
                    key={rc.id}
                    className={cn(
                      "border-b border-[#111]/5 last:border-0 transition-colors cursor-pointer group",
                      rc.severity === "Critical" ? "hover:bg-red-50/60" :
                      rc.severity === "High"     ? "hover:bg-orange-50/60" : "hover:bg-zinc-50/80"
                    )}
                    onClick={() => setSelectedCase(rc)}
                  >
                    <td className="pl-6 pr-4 py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={rc.user} size={9} />
                        <div className="min-w-0">
                          <p className="font-black text-xs text-[#111] truncate">
                            {rc.user.firstName} {rc.user.lastName}
                          </p>
                          <p className="text-[10px] text-zinc-400 font-bold truncate max-w-[160px]">
                            {rc.user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", barColor)}
                            style={{ width: `${Math.min(100, score)}%` }}
                          />
                        </div>
                        <span className={cn(
                          "font-black text-xs tabular-nums",
                          score >= 75 ? "text-red-600" :
                          score >= 50 ? "text-orange-600" :
                          score >= 25 ? "text-amber-600" : "text-zinc-500"
                        )}>
                          {score.toFixed(0)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><SeverityBadge severity={rc.severity} /></td>
                    <td className="px-4 py-3"><StatusBadge status={rc.status} /></td>
                    <td className="px-4 py-3 text-[10px] font-bold text-zinc-400 whitespace-nowrap">
                      {formatDistanceToNow(new Date(rc.updatedAt), { addSuffix: true })}
                    </td>
                    <td className="pr-6 pl-2 py-3">
                      <ChevronRight size={14} className="text-zinc-300 group-hover:text-zinc-600 transition-colors" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            Page {page + 1} of {totalPages} · {data?.total} total
          </p>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="h-9 w-9 p-0 bg-white border-[1.5px] border-[#111] rounded-full font-black text-[10px] flex items-center justify-center hover:bg-zinc-50 disabled:opacity-40 transition-all"
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="h-9 w-9 p-0 bg-white border-[1.5px] border-[#111] rounded-full font-black text-[10px] flex items-center justify-center hover:bg-zinc-50 disabled:opacity-40 transition-all"
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* Case Detail Drawer */}
      {selectedCase && (
        <CaseDetailDrawer
          riskCase={selectedCase}
          onClose={() => setSelectedCase(null)}
          onUpdated={() => {
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            setSelectedCase(null);
          }}
        />
      )}
    </div>
  );
}
