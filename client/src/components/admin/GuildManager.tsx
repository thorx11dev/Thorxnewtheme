import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Vault, Search, ShieldAlert, ShieldCheck, Snowflake, Play, RefreshCw } from "lucide-react";

interface AdminGuild {
  id: string;
  name: string;
  description: string | null;
  guildRank: string;
  guildScore: number;
  strikes: number;
  status: string;
  memberCount: number;
  vaultBalancePkr: string;
  createdAt: string;
}

export function GuildManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [strikeReason, setStrikeReason] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery<{ guilds: AdminGuild[]; total: number }>({
    queryKey: ["/api/admin/guilds", search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await apiRequest("GET", `/api/admin/guilds?${params.toString()}`);
      return res.json();
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/guilds"] });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await apiRequest("POST", `/api/admin/guilds/${id}/status`, { status })).json(),
    onSuccess: () => {
      toast({ title: "Guild status updated" });
      invalidate();
    },
    onError: (err: any) => toast({ title: "Failed", description: err?.message, variant: "destructive" }),
  });

  const strikeMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
      (await apiRequest("POST", `/api/admin/guilds/${id}/strikes`, { reason })).json(),
    onSuccess: (_data, vars) => {
      toast({ title: "Strike added" });
      setStrikeReason(prev => ({ ...prev, [vars.id]: "" }));
      invalidate();
    },
    onError: (err: any) => toast({ title: "Failed", description: err?.message, variant: "destructive" }),
  });

  const clearStrikesMutation = useMutation({
    mutationFn: async (id: string) => (await apiRequest("POST", `/api/admin/guilds/${id}/strikes/clear`, {})).json(),
    onSuccess: () => {
      toast({ title: "Strikes cleared" });
      invalidate();
    },
    onError: (err: any) => toast({ title: "Failed", description: err?.message, variant: "destructive" }),
  });

  const runResolutionMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/admin/guild-cycles/run-resolution", {})).json(),
    onSuccess: (data: any) => {
      toast({ title: "Weekly resolution run", description: `${data?.resolved ?? 0} cycle(s) resolved.` });
      invalidate();
    },
    onError: (err: any) => toast({ title: "Failed to run resolution", description: err?.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6 pb-24 w-full animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase text-[#111]">Guild Vault</h2>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Moderate guilds, strikes, and vault cycles</p>
        </div>
        <Button
          onClick={() => runResolutionMutation.mutate()}
          disabled={runResolutionMutation.isPending}
          className="border-2 border-black font-black text-xs flex items-center gap-2"
        >
          <RefreshCw className={cn("w-4 h-4", runResolutionMutation.isPending && "animate-spin")} />
          Run Weekly Resolution Now
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 text-zinc-400" />
          <Input placeholder="Search guilds..." value={search} onChange={(e) => setSearch(e.target.value)} className="border-2 border-black h-10" />
        </div>
        <div className="flex gap-2">
          {["", "active", "frozen", "disbanded"].map((s) => (
            <button
              key={s || "all"}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 h-10 border-2 border-black font-black text-xs uppercase rounded-md",
                statusFilter === s ? "bg-black text-white" : "bg-white text-black"
              )}
            >
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="p-20 text-center">
          <div className="w-10 h-10 border-[3px] border-[#111] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        </div>
      ) : (
        <div className="space-y-4">
          {(data?.guilds || []).length === 0 && (
            <div className="text-center py-16 text-sm font-bold text-zinc-400 uppercase tracking-widest">No guilds found</div>
          )}
          {(data?.guilds || []).map((g) => (
            <div key={g.id} className="bg-background border-[1.5px] border-[#111] rounded-2xl p-5 md:p-6 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white border-[1.5px] border-[#111]/20 flex items-center justify-center rounded-full">
                    <Vault className="w-5 h-5 text-zinc-500" />
                  </div>
                  <div>
                    <div className="font-black text-lg text-[#111] flex items-center gap-2">
                      {g.name}
                      <span className="text-[9px] bg-black text-white px-1.5 py-0.5 rounded-sm">RANK {g.guildRank}</span>
                      {g.status === "frozen" && <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded-sm">FROZEN</span>}
                      {g.status === "disbanded" && <span className="text-[9px] bg-zinc-400 text-white px-1.5 py-0.5 rounded-sm">DISBANDED</span>}
                    </div>
                    <div className="text-[11px] text-zinc-400 font-bold">
                      {g.memberCount} members · {g.guildScore} pts · Vault: Rs {parseFloat(g.vaultBalancePkr).toFixed(2)} · {g.strikes} strike(s)
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {g.status !== "frozen" ? (
                    <Button size="sm" variant="outline" className="border-2 border-black font-black text-xs" onClick={() => statusMutation.mutate({ id: g.id, status: "frozen" })}>
                      <Snowflake className="w-3 h-3 mr-1" /> Freeze
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="border-2 border-black font-black text-xs" onClick={() => statusMutation.mutate({ id: g.id, status: "active" })}>
                      <Play className="w-3 h-3 mr-1" /> Unfreeze
                    </Button>
                  )}
                  {g.status !== "disbanded" && (
                    <Button size="sm" variant="outline" className="border-2 border-red-500 text-red-500 font-black text-xs" onClick={() => statusMutation.mutate({ id: g.id, status: "disbanded" })}>
                      Disband
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center pt-3 border-t border-dashed border-black/10">
                <Input
                  placeholder="Strike reason..."
                  value={strikeReason[g.id] || ""}
                  onChange={(e) => setStrikeReason(prev => ({ ...prev, [g.id]: e.target.value }))}
                  className="border-2 border-black h-9 text-sm flex-1"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-2 border-black font-black text-xs"
                    disabled={!strikeReason[g.id]?.trim() || strikeMutation.isPending}
                    onClick={() => strikeMutation.mutate({ id: g.id, reason: strikeReason[g.id] })}
                  >
                    <ShieldAlert className="w-3 h-3 mr-1" /> Add Strike
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-2 border-black font-black text-xs"
                    disabled={g.strikes === 0 || clearStrikesMutation.isPending}
                    onClick={() => clearStrikesMutation.mutate(g.id)}
                  >
                    <ShieldCheck className="w-3 h-3 mr-1" /> Clear Strikes
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
