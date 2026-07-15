/**
 * LiveActivityFeed — THORX v3 (spec F.12)
 * Real-time Engine event feed for admins. Polls /api/admin/live-feed.
 * Shows Engine type, user, PKR amount, Thorx Card points, timestamps.
 */
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RankBadge } from "@/components/RankBadge";
import { Badge } from "@/components/ui/badge";
import { Activity, RefreshCw, Zap, Users, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface FeedEvent {
  id: string;
  eventType: string;
  userId: string | null;
  userEmail: string | null;
  userRankTier: string | null;
  guildId: string | null;
  guildName: string | null;
  engineType: string | null;
  pkrAmount: string | null;
  pointsAmount: number | null;
  metadata: any;
  createdAt: string;
}

const ENGINE_COLORS: Record<string, string> = {
  Engine_A: "#f97316",
  Engine_B: "#7c3aed",
  Engine_C: "#16a34a",
  Indirect:  "#6b7280",
};

const EVENT_ICONS: Record<string, React.ReactNode> = {
  earn:        <Zap size={12} />,
  withdrawal:  <Activity size={12} />,
  rank_up:     <Badge className="text-[10px] px-1 py-0 h-4">↑</Badge>,
  guild:       <Users size={12} />,
  ad_view:     <Eye size={12} />,
};

function FeedRow({ event }: { event: FeedEvent }) {
  const engineColor = event.engineType ? ENGINE_COLORS[event.engineType] ?? "#71717a" : "#71717a";

  return (
    <div className="flex items-start gap-3 py-2 px-3 hover:bg-zinc-50 rounded-lg transition-colors">
      <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center shrink-0 mt-0.5"
        style={event.engineType ? { backgroundColor: engineColor + "20", color: engineColor } : {}}>
        {EVENT_ICONS[event.eventType] ?? <Activity size={12} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold truncate">{event.userEmail ?? "System"}</span>
          {event.userRankTier && <RankBadge rank={event.userRankTier} size="sm" showLabel={false} />}
          {event.engineType && (
            <span className="text-[10px] font-mono px-1 py-0 rounded" style={{ backgroundColor: engineColor + "20", color: engineColor }}>
              {event.engineType}
            </span>
          )}
          <span className="text-[10px] text-zinc-400 font-mono uppercase">{event.eventType.replace(/_/g, " ")}</span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {event.pkrAmount && parseFloat(event.pkrAmount) > 0 && (
            <span className="text-xs text-emerald-600 font-semibold">+Rs.{parseFloat(event.pkrAmount).toFixed(2)}</span>
          )}
          {event.pointsAmount && event.pointsAmount > 0 && (
            <span className="text-xs text-zinc-500">{event.pointsAmount.toLocaleString()} pts</span>
          )}
          {event.guildName && (
            <span className="text-[11px] text-zinc-400">{event.guildName}</span>
          )}
          <span className="text-[10px] text-zinc-300 ml-auto">{formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}</span>
        </div>
      </div>
    </div>
  );
}

export function LiveActivityFeed() {
  const { data, isLoading, refetch, isFetching } = useQuery<FeedEvent[]>({
    queryKey: ["/api/admin/live-feed"],
    queryFn: async () => {
      const r = await apiRequest("GET", "/api/admin/live-feed?limit=100");
      const d = await r.json();
      return d.events ?? d;
    },
    refetchInterval: 8000,
    staleTime: 5000,
  });

  const events = data ?? [];

  const totals = events.reduce((acc, e) => {
    if (e.engineType) acc[e.engineType] = (acc[e.engineType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">Live Activity Feed</h2>
          <p className="text-sm text-zinc-500 mt-0.5">Real-time earn events across all engines.</p>
        </div>
        <button
          onClick={() => refetch()}
          className={cn("flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors", isFetching ? "animate-pulse" : "")}
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Engine totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Object.entries(ENGINE_COLORS).map(([eng, color]) => (
          <div key={eng} className="rounded-lg border border-zinc-200 bg-white p-2.5">
            <div className="text-[10px] font-mono" style={{ color }}>{eng}</div>
            <div className="text-xl font-black mt-0.5">{(totals[eng] || 0).toLocaleString()}</div>
            <div className="text-[10px] text-zinc-400">events (100 records)</div>
          </div>
        ))}
      </div>

      {/* Feed */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="p-3 border-b border-zinc-100 flex items-center gap-2">
          <Activity size={14} className="text-zinc-400" />
          <span className="text-sm font-semibold">Event Stream</span>
          <span className="ml-auto text-[10px] text-zinc-400">{events.length} events</span>
        </div>
        {isLoading ? (
          <div className="text-center py-12 text-zinc-400 text-sm">Loading feed…</div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 text-sm">No events yet.</div>
        ) : (
          <div className="divide-y divide-zinc-50 max-h-[600px] overflow-y-auto">
            {events.map(e => <FeedRow key={e.id} event={e} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default LiveActivityFeed;
