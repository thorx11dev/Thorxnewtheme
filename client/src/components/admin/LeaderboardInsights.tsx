import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Trophy, 
  Users, 
  AlertTriangle, 
  Search,
  ArrowUpDown,
  Eye,
  User,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  CheckSquare,
  Square,
  RefreshCw,
  ServerCrash,
  TrendingUp,
  Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { UserInspectorPanel } from "./UserInspectorPanel";

interface LeaderboardData {
  globalRanking: any[];
  topReferrers: any[];
  anomalies: any[];
  totalCount: number;
  lastUpdated: string;
}

function getAvatarSrc(user: any) {
  if (user.avatar && user.avatar !== "default" && user.avatar !== "") return user.avatar;
  if (user.profilePicture && user.profilePicture !== "") return user.profilePicture;
  return null;
}

function UserAvatar({ user, size = 10 }: { user: any; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = getAvatarSrc(user);
  const dim = `w-${size} h-${size}`;

  if (src && !failed) {
    return (
      <div className={cn("rounded-full border-[1.5px] border-[#111]/20 overflow-hidden bg-zinc-100 shrink-0", dim)}>
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }
  return (
    <div className={cn("rounded-full border-[1.5px] border-[#111]/20 bg-zinc-100 flex items-center justify-center shrink-0", dim)}>
      <User className="w-4 h-4 text-zinc-400" />
    </div>
  );
}

function downloadAsCSV(rows: any[], filename: string) {
  if (!rows.length) return;
  const headers = ["Rank", "Name", "Email", "Total Earned", "Available Balance", "Direct Referrals (L1)", "Network Referrals (L2)", "Performance Score", "Verified"];
  const csvRows = rows.map((u, i) => [
    u.globalRank || i + 1,
    `${u.firstName} ${u.lastName}`,
    u.email,
    u.totalEarnings || 0,
    u.availableBalance || 0,
    u.level1Count || u.referralCount || 0,
    u.level2Count || 0,
    u.performanceScore || 0,
    u.isVerified ? "Yes" : "No"
  ]);
  const csv = [headers, ...csvRows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function LeaderboardInsights({ onViewUserInCRM }: { onViewUserInCRM?: (email: string) => void }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("global");
  const [pageSize] = useState("50");
  const [page, setPage] = useState(0);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: insights, isLoading, isError } = useQuery<LeaderboardData>({
    queryKey: [`/api/admin/leaderboard/insights?limit=${pageSize}&offset=${page * parseInt(pageSize)}`],
  });

  const forceSyncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/leaderboard/force-sync");
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || "Unknown server error");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/leaderboard/insights?limit=${pageSize}&offset=${page * parseInt(pageSize)}`] });
      toast({ title: "Rankings Updated", description: "All scores have been recalculated." });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error?.message || "Could not refresh rankings.",
        variant: "destructive"
      });
    }
  });

  const handleSort = (key: string) => {
    setSortConfig(prev =>
      prev?.key === key
        ? { key, direction: prev.direction === "desc" ? "asc" : "desc" }
        : { key, direction: "desc" }
    );
  };

  const applySort = (arr: any[]) => {
    if (!sortConfig) return arr;
    return [...arr].sort((a, b) => {
      const av = parseFloat(a[sortConfig.key]) || 0;
      const bv = parseFloat(b[sortConfig.key]) || 0;
      return sortConfig.direction === "asc" ? av - bv : bv - av;
    });
  };

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const list = insights?.globalRanking || [];
    return applySort(
      term ? list.filter(u => `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(term)) : list
    );
  }, [insights, searchTerm, sortConfig]);

  const filteredReferrers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const list = insights?.topReferrers || [];
    return term ? list.filter(u => `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(term)) : list;
  }, [insights, searchTerm]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedRows = filtered.filter(u => selectedIds.has(u.id));

  const totalPages = Math.ceil((insights?.totalCount || 0) / parseInt(pageSize));

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-red-50 border-[1.5px] border-red-200 rounded-[2rem] text-center space-y-4">
        <ServerCrash className="w-10 h-10 text-red-400" />
        <p className="font-black text-sm uppercase tracking-widest text-red-600">Rankings Unavailable</p>
        <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest max-w-xs">
          Could not load ranking data. Try refreshing.
        </p>
        <Button
          onClick={() => forceSyncMutation.mutate()}
          disabled={forceSyncMutation.isPending}
          className="mt-2 h-10 bg-red-600 text-white hover:bg-red-700 border-b-4 border-red-900 rounded-full font-black text-[10px] uppercase px-6 flex items-center gap-2"
        >
          <RefreshCw size={14} className={forceSyncMutation.isPending ? "animate-spin" : ""} />
          {forceSyncMutation.isPending ? "Refreshing..." : "Refresh Rankings"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase text-[#111]">Rankings</h2>
          {insights?.lastUpdated && (
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
              Last updated: {format(new Date(insights.lastUpdated), "MMM d, yyyy · h:mm a")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <Button
              onClick={() => downloadAsCSV(selectedRows, `thorx-rankings-${Date.now()}.csv`)}
              className="h-10 bg-primary text-white border-[1.5px] border-[#111] font-black text-[10px] px-5 hover:bg-primary/80 rounded-full transition-all uppercase shadow-sm flex items-center gap-2"
            >
              <Download size={13} />
              Export {selectedIds.size} Selected
            </Button>
          )}
          <Button
            onClick={() => forceSyncMutation.mutate()}
            disabled={forceSyncMutation.isPending}
            className="h-10 bg-[#111] text-white border-[1.5px] border-[#111] font-black text-[10px] px-5 hover:bg-primary hover:text-white rounded-full transition-all uppercase shadow-sm flex items-center gap-2"
          >
            <RefreshCw size={13} className={forceSyncMutation.isPending ? "animate-spin" : ""} />
            {forceSyncMutation.isPending ? "Updating..." : "Refresh Rankings"}
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Members", value: insights?.totalCount ?? "—", icon: <Users size={18} /> },
          { label: "Top Earner", value: insights?.globalRanking?.[0] ? `PKR ${parseFloat(insights.globalRanking[0].totalEarnings || "0").toLocaleString()}` : "—", icon: <TrendingUp size={18} /> },
          { label: "Top Referrer", value: insights?.topReferrers?.[0] ? `${insights.topReferrers[0].level1Count || 0} direct` : "—", icon: <Trophy size={18} /> },
          { label: "Watchlist", value: insights?.anomalies?.length ?? 0, icon: <AlertTriangle size={18} /> },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border-[1.5px] border-[#111] p-5 rounded-[2rem] shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
            <div>
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">{stat.label}</p>
              <p className="text-xl font-black tabular-nums text-[#111]">{stat.value}</p>
            </div>
            <div className="w-10 h-10 border-[1.5px] border-[#111] rounded-2xl flex items-center justify-center bg-white shadow-sm group-hover:rotate-12 transition-transform duration-500 shrink-0">
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <TabsList className="bg-zinc-100 border-[1.5px] border-[#111]/10 rounded-full p-1 h-auto">
            <TabsTrigger value="global" className="rounded-full px-5 py-2 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-[#111] data-[state=active]:text-white transition-all">
              All Members
            </TabsTrigger>
            <TabsTrigger value="referrers" className="rounded-full px-5 py-2 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-[#111] data-[state=active]:text-white transition-all">
              Top Recruiters
            </TabsTrigger>
            <TabsTrigger value="watchlist" className="rounded-full px-5 py-2 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-[#111] data-[state=active]:text-white transition-all">
              Watchlist {(insights?.anomalies?.length || 0) > 0 && `(${insights?.anomalies?.length})`}
            </TabsTrigger>
          </TabsList>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search members..."
              className="h-10 pl-11 pr-4 bg-white border-[1.5px] border-[#111] rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-xs font-bold w-64 text-[#111] placeholder:text-zinc-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* All Members Tab */}
        <TabsContent value="global" className="mt-4">
          <div className="bg-background border-[1.5px] border-[#111] rounded-[2rem] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/50 border-b-[1.5px] border-[#111]/10">
                    <th className="p-5 w-12">
                      <button
                        onClick={() => {
                          if (selectedIds.size === filtered.length) setSelectedIds(new Set());
                          else setSelectedIds(new Set(filtered.map(u => u.id)));
                        }}
                        className="text-zinc-400 hover:text-[#111] transition-colors"
                      >
                        {selectedIds.size === filtered.length && filtered.length > 0 
                          ? <CheckSquare size={16} /> 
                          : <Square size={16} />}
                      </button>
                    </th>
                    <th className="p-5 font-black text-[10px] tracking-widest text-[#111]/40 uppercase">Rank</th>
                    <th className="p-5 font-black text-[10px] tracking-widest text-[#111]/40 uppercase">Member</th>
                    <th className="p-5 font-black text-[10px] tracking-widest text-[#111]/40 uppercase">Status</th>
                    <th className="p-5 font-black text-[10px] tracking-widest text-[#111]/40 uppercase cursor-pointer select-none" onClick={() => handleSort("totalEarnings")}>
                      <div className="flex items-center gap-1.5">Total Earned <ArrowUpDown size={11} /></div>
                    </th>
                    <th className="p-5 font-black text-[10px] tracking-widest text-[#111]/40 uppercase">Team Size</th>
                    <th className="p-5 font-black text-[10px] tracking-widest text-[#111]/40 uppercase cursor-pointer select-none" onClick={() => handleSort("performanceScore")}>
                      <div className="flex items-center gap-1.5">Score <ArrowUpDown size={11} /></div>
                    </th>
                    <th className="p-5 font-black text-[10px] tracking-widest text-[#111]/40 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y-[1.5px] divide-[#111]/10">
                  {isLoading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 8 }).map((_, j) => (
                            <td key={j} className="p-5"><Skeleton className="h-4 w-full rounded-full" /></td>
                          ))}
                        </tr>
                      ))
                    : filtered.map((user, idx) => (
                        <tr key={user.id} className="hover:bg-black/[0.02] transition-colors group">
                          <td className="p-5">
                            <button
                              onClick={() => toggleSelect(user.id)}
                              className="text-zinc-300 hover:text-[#111] transition-colors"
                            >
                              {selectedIds.has(user.id) ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} />}
                            </button>
                          </td>
                          <td className="p-5">
                            <span className={cn(
                              "inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-sm border-[1.5px]",
                              idx === 0 ? "bg-yellow-400 border-yellow-500 text-yellow-900" :
                              idx === 1 ? "bg-zinc-200 border-zinc-300 text-zinc-700" :
                              idx === 2 ? "bg-amber-100 border-amber-300 text-amber-800" :
                              "bg-white border-[#111]/10 text-zinc-500"
                            )}>
                              {user.globalRank || idx + 1}
                            </span>
                          </td>
                          <td className="p-5">
                            <div className="flex items-center gap-3">
                              <UserAvatar user={user} size={10} />
                              <div>
                                <div className="font-black text-sm uppercase text-[#111] tracking-tight">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-5">
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 border-[1px] border-[#111]/20 bg-zinc-100 rounded-full font-black text-[8px] tracking-widest uppercase text-[#111]">
                                {user.rank || "Useless"}
                              </span>
                              {user.isVerified && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 border-[1px] border-green-200 rounded-full font-black text-[8px] tracking-widest uppercase text-green-600">
                                  <ShieldCheck size={8} /> Verified
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-5">
                            <span className="font-black text-sm tabular-nums text-[#111]">
                              PKR {parseFloat(user.totalEarnings || "0").toLocaleString()}
                            </span>
                          </td>
                          <td className="p-5">
                            <div className="space-y-1">
                              <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                                L1: <span className="text-[#111]">{user.level1Count || 0}</span>
                              </div>
                              <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                                L2: <span className="text-[#111]">{user.level2Count || 0}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-5">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${Math.min(parseFloat(user.performanceScore || "0"), 100)}%` }}
                                />
                              </div>
                              <span className="font-black text-[10px] tabular-nums text-zinc-500">
                                {parseFloat(user.performanceScore || "0").toFixed(1)}
                              </span>
                            </div>
                          </td>
                          <td className="p-5 text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-9 w-9 border-[1.5px] border-[#111]/20 hover:border-[#111] hover:bg-black/5 rounded-full transition-all text-zinc-400 hover:text-[#111]"
                              onClick={() => { setSelectedUser(user); setIsInspectorOpen(true); }}
                            >
                              <Eye size={14} />
                            </Button>
                          </td>
                        </tr>
                      ))
                  }
                  {!isLoading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-16 text-center text-zinc-400 font-bold text-[10px] uppercase tracking-widest">
                        No members found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t-[1.5px] border-[#111]/10 flex items-center justify-between">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                  Page {page + 1} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                    className="h-8 w-8 rounded-full border-[1.5px] border-[#111]/20 hover:border-[#111]"
                  >
                    <ChevronLeft size={14} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                    className="h-8 w-8 rounded-full border-[1.5px] border-[#111]/20 hover:border-[#111]"
                  >
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Top Recruiters Tab */}
        <TabsContent value="referrers" className="mt-4">
          <div className="bg-background border-[1.5px] border-[#111] rounded-[2rem] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/50 border-b-[1.5px] border-[#111]/10">
                    <th className="p-5 font-black text-[10px] tracking-widest text-[#111]/40 uppercase">Rank</th>
                    <th className="p-5 font-black text-[10px] tracking-widest text-[#111]/40 uppercase">Member</th>
                    <th className="p-5 font-black text-[10px] tracking-widest text-[#111]/40 uppercase">Direct Referrals (L1)</th>
                    <th className="p-5 font-black text-[10px] tracking-widest text-[#111]/40 uppercase">Network (L2)</th>
                    <th className="p-5 font-black text-[10px] tracking-widest text-[#111]/40 uppercase">Total Earned</th>
                    <th className="p-5 font-black text-[10px] tracking-widest text-[#111]/40 uppercase text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y-[1.5px] divide-[#111]/10">
                  {isLoading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 6 }).map((_, j) => (
                            <td key={j} className="p-5"><Skeleton className="h-4 w-full rounded-full" /></td>
                          ))}
                        </tr>
                      ))
                    : filteredReferrers.map((user, idx) => (
                        <tr key={user.id} className="hover:bg-black/[0.02] transition-colors group">
                          <td className="p-5">
                            <span className={cn(
                              "inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-sm border-[1.5px]",
                              idx === 0 ? "bg-yellow-400 border-yellow-500 text-yellow-900" :
                              idx === 1 ? "bg-zinc-200 border-zinc-300 text-zinc-700" :
                              idx === 2 ? "bg-amber-100 border-amber-300 text-amber-800" :
                              "bg-white border-[#111]/10 text-zinc-500"
                            )}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="p-5">
                            <div className="flex items-center gap-3">
                              <UserAvatar user={user} size={10} />
                              <div>
                                <div className="font-black text-sm uppercase text-[#111] tracking-tight">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-5">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${Math.min(((user.level1Count || 0) / (filteredReferrers[0]?.level1Count || 1)) * 100, 100)}%` }}
                                />
                              </div>
                              <span className="font-black text-sm tabular-nums text-[#111]">{user.level1Count || 0}</span>
                            </div>
                          </td>
                          <td className="p-5">
                            <span className="font-black text-sm tabular-nums text-[#111]">{user.level2Count || 0}</span>
                          </td>
                          <td className="p-5">
                            <span className="font-black text-sm tabular-nums text-[#111]">
                              PKR {parseFloat(user.totalEarnings || "0").toLocaleString()}
                            </span>
                          </td>
                          <td className="p-5 text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-9 w-9 border-[1.5px] border-[#111]/20 hover:border-[#111] hover:bg-black/5 rounded-full transition-all text-zinc-400 hover:text-[#111]"
                              onClick={() => { setSelectedUser(user); setIsInspectorOpen(true); }}
                            >
                              <Eye size={14} />
                            </Button>
                          </td>
                        </tr>
                      ))
                  }
                  {!isLoading && filteredReferrers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-16 text-center text-zinc-400 font-bold text-[10px] uppercase tracking-widest">
                        No recruiters found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Watchlist Tab */}
        <TabsContent value="watchlist" className="mt-4">
          {(insights?.anomalies?.length || 0) === 0 && !isLoading ? (
            <div className="bg-green-50 border-[1.5px] border-green-200 rounded-[2rem] p-16 flex flex-col items-center justify-center text-center space-y-3">
              <ShieldCheck className="w-10 h-10 text-green-400" />
              <p className="font-black text-sm uppercase tracking-widest text-green-600">All Clear</p>
              <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest">
                No suspicious accounts found at this time.
              </p>
            </div>
          ) : (
            <div className="bg-background border-[1.5px] border-[#111] rounded-[2rem] overflow-hidden shadow-sm">
              <div className="p-5 border-b-[1.5px] border-[#111]/10 flex items-center gap-3">
                <AlertTriangle size={16} className="text-amber-500" />
                <span className="font-black text-[10px] uppercase tracking-widest text-zinc-600">
                  Accounts flagged for unusual activity
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/50 border-b-[1.5px] border-[#111]/10">
                      <th className="p-5 font-black text-[10px] tracking-widest text-[#111]/40 uppercase">Member</th>
                      <th className="p-5 font-black text-[10px] tracking-widest text-[#111]/40 uppercase">Total Earned</th>
                      <th className="p-5 font-black text-[10px] tracking-widest text-[#111]/40 uppercase">Referrals</th>
                      <th className="p-5 font-black text-[10px] tracking-widest text-[#111]/40 uppercase">Days Active</th>
                      <th className="p-5 font-black text-[10px] tracking-widest text-[#111]/40 uppercase">Flag Reason</th>
                      <th className="p-5 font-black text-[10px] tracking-widest text-[#111]/40 uppercase text-right">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-[1.5px] divide-[#111]/10">
                    {isLoading
                      ? Array.from({ length: 3 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 6 }).map((_, j) => (
                              <td key={j} className="p-5"><Skeleton className="h-4 w-full rounded-full" /></td>
                            ))}
                          </tr>
                        ))
                      : (insights?.anomalies || []).map((user: any) => (
                          <tr key={user.id} className="hover:bg-amber-50/50 transition-colors">
                            <td className="p-5">
                              <div className="flex items-center gap-3">
                                <UserAvatar user={user} size={10} />
                                <div>
                                  <div className="font-black text-sm uppercase text-[#111] tracking-tight">
                                    {user.firstName} {user.lastName}
                                  </div>
                                  <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">{user.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-5">
                              <span className="font-black text-sm tabular-nums text-[#111]">
                                PKR {parseFloat(user.totalEarnings || "0").toLocaleString()}
                              </span>
                            </td>
                            <td className="p-5">
                              <span className="font-black text-sm tabular-nums text-[#111]">
                                {user.referralCount || 0}
                              </span>
                            </td>
                            <td className="p-5">
                              <span className="font-black text-sm tabular-nums text-[#111]">
                                {user.daysActive || "—"}
                              </span>
                            </td>
                            <td className="p-5">
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 border-[1px] border-amber-200 rounded-full font-black text-[8px] tracking-widest uppercase text-amber-700">
                                <AlertTriangle size={8} />
                                {user.reason || "Unusual Activity"}
                              </span>
                            </td>
                            <td className="p-5 text-right">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 border-[1.5px] border-[#111]/20 hover:border-[#111] hover:bg-black/5 rounded-full transition-all text-zinc-400 hover:text-[#111]"
                                onClick={() => { setSelectedUser(user); setIsInspectorOpen(true); }}
                              >
                                <Eye size={14} />
                              </Button>
                            </td>
                          </tr>
                        ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* User Inspector Modal */}
      <UserInspectorPanel
        user={selectedUser}
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        onViewInCRM={onViewUserInCRM}
      />
    </div>
  );
}
