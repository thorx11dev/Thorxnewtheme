/**
 * PSProgressCard — THORX v3 (spec F.5)
 * Shows PS progress bar, rank, streak, and what the next rank unlocks.
 */
import { useState } from "react";
import { Flame, ChevronDown, ChevronUp } from "lucide-react";
import { RankBadge } from "@/components/RankBadge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface PSThreshold { min: number; max: number | null; next: string | null; unlocks: string }

const PS_THRESHOLDS: Record<string, PSThreshold> = {
  "E-Rank": { min: 0,     max: 999,   next: "D-Rank", unlocks: "Guild applications (D-Rank)" },
  "D-Rank": { min: 1000,  max: 2999,  next: "C-Rank", unlocks: "Engine B — CPA Offers (C-Rank)" },
  "C-Rank": { min: 3000,  max: 5999,  next: "B-Rank", unlocks: "Guild Creation — become a Captain (B-Rank)" },
  "B-Rank": { min: 6000,  max: 9999,  next: "A-Rank", unlocks: "Wider Thorx Card variance ±5% (A-Rank)" },
  "A-Rank": { min: 10000, max: 19999, next: "S-Rank", unlocks: "Auto-approved withdrawals + ±10% variance (S-Rank)" },
  "S-Rank": { min: 20000, max: null,  next: null,      unlocks: "All features unlocked!" },
};

interface PSProgressCardProps {
  performanceScore: number;
  userRankTier: string;
  streakDays?: number;
  className?: string;
}

export function PSProgressCard({ performanceScore, userRankTier, streakDays = 0, className }: PSProgressCardProps) {
  const [expanded, setExpanded] = useState(false);
  const tier = PS_THRESHOLDS[userRankTier] ?? PS_THRESHOLDS["E-Rank"];

  let pct = 0;
  let psToNext: number | null = null;
  if (tier.max !== null) {
    const range = tier.max - tier.min + 1;
    const progress = Math.max(0, performanceScore - tier.min);
    pct = Math.min(100, (progress / range) * 100);
    psToNext = tier.max + 1 - performanceScore;
  } else {
    pct = 100;
  }

  const streakLabel = streakDays >= 3 ? `+20 PS/day bonus active` :
                      streakDays === 2 ? `+10 PS/day bonus active` :
                      streakDays === 1 ? `+5 PS/day bonus active` : "Start a streak for PS bonus";

  return (
    <div className={cn("rounded-xl border border-zinc-200 bg-white p-4 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RankBadge rank={userRankTier} size="md" />
          <span className="text-sm font-semibold text-zinc-700">
            {performanceScore.toLocaleString()} PS
          </span>
        </div>
        {streakDays > 0 && (
          <span className="text-xs flex items-center gap-1 text-orange-500 font-medium">
            <Flame size={12} />
            {streakDays}-day streak
          </span>
        )}
      </div>

      <div className="space-y-1">
        <Progress value={pct} className="h-2" />
        <div className="flex justify-between text-[11px] text-zinc-400">
          <span>{tier.min.toLocaleString()} PS</span>
          <span>{tier.max !== null ? (tier.max + 1).toLocaleString() + " PS" : "MAX"}</span>
        </div>
      </div>

      {psToNext !== null && tier.next && (
        <p className="text-xs text-zinc-500">
          <span className="font-semibold text-zinc-700">{psToNext.toLocaleString()} more PS</span> to reach {tier.next}
        </p>
      )}

      {streakDays > 0 && (
        <p className="text-xs text-orange-400">🔥 {streakLabel}</p>
      )}

      {tier.next && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          What does {tier.next} unlock?
        </button>
      )}

      {expanded && tier.next && (
        <div className="text-xs text-zinc-600 bg-zinc-50 rounded-lg p-3 border border-zinc-100">
          {tier.unlocks}
        </div>
      )}
    </div>
  );
}

export default PSProgressCard;
