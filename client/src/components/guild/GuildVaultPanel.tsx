import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import TechnicalLabel from "@/components/ui/technical-label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Users, Shield, Vault, Search, Crown, Check, X, LogOut, Coins } from "lucide-react";

interface GuildSummary {
  id: string;
  name: string;
  description: string | null;
  captainId: string;
  guildRank: string;
  guildScore: number;
  strikes: number;
  status: string;
  memberCount: number;
  vaultBalancePkr: string;
}

interface GuildMemberRow {
  id: string;
  guildId: string;
  userId: string;
  role: string;
  status: string;
  requestedAt: string;
  joinedAt: string | null;
  user: { id: string; firstName: string; lastName: string; avatar: string; rank: string; profilePicture?: string };
}

interface VaultBucket {
  id: string;
  userId: string;
  pointsHeld: number;
  pkrHeld: string;
  status: string;
  user: { id: string; firstName: string; lastName: string; avatar: string };
}

interface PointsLedgerEntry {
  id: string;
  sourceType: string;
  pointsDisplayed: number;
  lockedPkrValue: string;
  vaultShareLockedPkr: string;
  createdAt: string;
  metadata: Record<string, any>;
}

function formatPkr(value: string | number) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return `Rs ${n.toFixed(2)}`;
}

export function GuildVaultPanel({ currentUserId }: { currentUserId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [newGuildName, setNewGuildName] = useState("");
  const [newGuildDesc, setNewGuildDesc] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data: myMembershipData, isLoading: isMembershipLoading } = useQuery<{ membership: (GuildMemberRow & { guild: GuildSummary }) | null }>({
    queryKey: ["/api/guilds/mine"],
    queryFn: async () => (await apiRequest("GET", "/api/guilds/mine")).json(),
  });

  const membership = myMembershipData?.membership ?? null;
  const inActiveGuild = membership?.status === "active";
  const guildId = membership?.guildId;

  const { data: guildDetail } = useQuery<{ guild: GuildSummary; members: GuildMemberRow[] }>({
    queryKey: ["/api/guilds", guildId],
    queryFn: async () => (await apiRequest("GET", `/api/guilds/${guildId}`)).json(),
    enabled: !!guildId,
  });

  const { data: vaultStatus } = useQuery<{ guild: GuildSummary; currentCycle: any; memberBuckets: VaultBucket[] }>({
    queryKey: ["/api/guilds", guildId, "vault"],
    queryFn: async () => (await apiRequest("GET", `/api/guilds/${guildId}/vault`)).json(),
    enabled: !!guildId && inActiveGuild,
  });

  const { data: browseGuilds } = useQuery<{ guilds: GuildSummary[]; total: number }>({
    queryKey: ["/api/guilds", search],
    queryFn: async () => (await apiRequest("GET", `/api/guilds?search=${encodeURIComponent(search)}`)).json(),
    enabled: !membership,
  });

  const { data: ledgerData } = useQuery<{ entries: PointsLedgerEntry[]; total: number }>({
    queryKey: ["/api/points-ledger/me"],
    queryFn: async () => (await apiRequest("GET", "/api/points-ledger/me?limit=15")).json(),
  });

  const invalidateGuildQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/guilds"] });
  };

  const createGuildMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/guilds", { name: newGuildName, description: newGuildDesc })).json(),
    onSuccess: () => {
      toast({ title: "Guild created", description: "Your guild is live. Invite members to start earning vault bonuses." });
      setShowCreate(false);
      setNewGuildName("");
      setNewGuildDesc("");
      invalidateGuildQueries();
    },
    onError: (err: any) => toast({ title: "Could not create guild", description: err?.message || "Try again", variant: "destructive" }),
  });

  const joinMutation = useMutation({
    mutationFn: async (id: string) => (await apiRequest("POST", `/api/guilds/${id}/join`, {})).json(),
    onSuccess: () => {
      toast({ title: "Join request sent", description: "The guild captain will review your request." });
      invalidateGuildQueries();
    },
    onError: (err: any) => toast({ title: "Could not join", description: err?.message || "Try again", variant: "destructive" }),
  });

  const leaveMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/guilds/${guildId}/leave`, {})).json(),
    onSuccess: () => {
      toast({ title: "Left guild" });
      invalidateGuildQueries();
    },
    onError: (err: any) => toast({ title: "Could not leave", description: err?.message || "Try again", variant: "destructive" }),
  });

  const decideMutation = useMutation({
    mutationFn: async ({ userId, approve }: { userId: string; approve: boolean }) =>
      (await apiRequest("POST", `/api/guilds/${guildId}/members/${userId}/${approve ? "approve" : "reject"}`, {})).json(),
    onSuccess: () => invalidateGuildQueries(),
    onError: (err: any) => toast({ title: "Action failed", description: err?.message || "Try again", variant: "destructive" }),
  });

  const isCaptain = guildDetail?.guild?.captainId === currentUserId;
  const pendingRequests = (guildDetail?.members || []).filter(m => m.status === "pending");
  const activeMembers = (guildDetail?.members || []).filter(m => m.status === "active");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 md:mt-12"
    >
      <div className="flex items-center gap-3 mb-4 md:mb-6">
        <div className="w-9 h-9 bg-black flex items-center justify-center rounded-full">
          <Vault className="w-4 h-4 text-white" />
        </div>
        <div>
          <TechnicalLabel text="GUILD VAULT" className="font-black text-sm md:text-base" />
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            15% of every earning is held here and released weekly with a bonus
          </p>
        </div>
      </div>

      {isMembershipLoading ? (
        <div className="text-xs font-bold text-muted-foreground py-6 text-center">Loading guild status...</div>
      ) : !membership ? (
        <div className="bg-muted/10 border-2 border-black p-4 md:p-6 space-y-4">
          {!showCreate ? (
            <>
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search guilds..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border-2 border-black h-9 text-sm"
                />
                <Button size="sm" className="border-2 border-black font-black text-xs whitespace-nowrap" onClick={() => setShowCreate(true)}>
                  Create Guild
                </Button>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {(browseGuilds?.guilds || []).length === 0 && (
                  <div className="text-xs text-muted-foreground italic text-center py-6">No guilds found. Be the first to create one.</div>
                )}
                {(browseGuilds?.guilds || []).map((g) => (
                  <div key={g.id} className="flex items-center justify-between p-3 border border-black/20 bg-white">
                    <div>
                      <div className="font-black text-sm flex items-center gap-2">
                        {g.name}
                        <span className="text-[9px] bg-black text-white px-1.5 py-0.5 rounded-sm">RANK {g.guildRank}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">{g.memberCount} members · {g.guildScore} pts</div>
                    </div>
                    <Button size="sm" variant="outline" className="border-2 border-black font-black text-xs" onClick={() => joinMutation.mutate(g.id)} disabled={joinMutation.isPending}>
                      Request to Join
                    </Button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <Input placeholder="Guild name" value={newGuildName} onChange={(e) => setNewGuildName(e.target.value)} className="border-2 border-black h-9 text-sm" />
              <Input placeholder="Description (optional)" value={newGuildDesc} onChange={(e) => setNewGuildDesc(e.target.value)} className="border-2 border-black h-9 text-sm" />
              <div className="flex gap-2">
                <Button size="sm" className="border-2 border-black font-black text-xs" disabled={!newGuildName.trim() || createGuildMutation.isPending} onClick={() => createGuildMutation.mutate()}>
                  Create
                </Button>
                <Button size="sm" variant="outline" className="border-2 border-black font-black text-xs" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : membership.status === "pending" ? (
        <div className="bg-amber-500/10 border-2 border-amber-500 p-6 text-center">
          <p className="font-black text-sm">Join request pending</p>
          <p className="text-xs text-muted-foreground mt-1">Waiting for the guild captain to approve your request.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-muted/10 border-2 border-black p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-black text-lg flex items-center gap-2">
                  <Shield className="w-4 h-4" /> {guildDetail?.guild?.name}
                  <span className="text-[9px] bg-black text-white px-1.5 py-0.5 rounded-sm">RANK {guildDetail?.guild?.guildRank}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {guildDetail?.guild?.memberCount} members · {guildDetail?.guild?.guildScore} pts · {guildDetail?.guild?.strikes || 0} strikes
                  {guildDetail?.guild?.status === "frozen" && <span className="text-red-500 font-black ml-2">FROZEN</span>}
                </div>
              </div>
              <Button size="sm" variant="outline" className="border-2 border-black font-black text-xs" onClick={() => leaveMutation.mutate()} disabled={leaveMutation.isPending}>
                <LogOut className="w-3 h-3 mr-1" /> Leave
              </Button>
            </div>

            {vaultStatus?.currentCycle && (
              <div className="mb-4 p-3 bg-black text-white">
                <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-1">
                  <span>This Week's Goal</span>
                  <span>{vaultStatus.memberBuckets.reduce((s, b) => s + b.pointsHeld, 0)} / {vaultStatus.currentCycle.targetPoints} pts</span>
                </div>
                <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400"
                    style={{ width: `${Math.min(100, (vaultStatus.memberBuckets.reduce((s, b) => s + b.pointsHeld, 0) / Math.max(1, vaultStatus.currentCycle.targetPoints)) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              {activeMembers.map((m) => {
                const bucket = vaultStatus?.memberBuckets.find(b => b.userId === m.userId);
                return (
                  <div key={m.id} className="flex items-center justify-between p-2.5 border border-black/10 bg-white text-xs">
                    <div className="flex items-center gap-2 font-bold">
                      {m.role === "captain" && <Crown className="w-3 h-3 text-amber-500" />}
                      {m.user.firstName} {m.user.lastName}
                    </div>
                    <div className="text-muted-foreground font-black flex items-center gap-1">
                      <Coins className="w-3 h-3" /> {bucket?.pointsHeld ?? 0} pts held ({formatPkr(bucket?.pkrHeld ?? "0")})
                    </div>
                  </div>
                );
              })}
            </div>

            {isCaptain && pendingRequests.length > 0 && (
              <div className="mt-4 pt-4 border-t-2 border-dashed border-black/20">
                <TechnicalLabel text="PENDING REQUESTS" className="text-xs font-black mb-2" />
                <div className="space-y-1.5">
                  {pendingRequests.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-2.5 border border-black/10 bg-white text-xs">
                      <span className="font-bold">{m.user.firstName} {m.user.lastName}</span>
                      <div className="flex gap-1.5">
                        <Button size="sm" className="h-7 px-2 border-2 border-black bg-green-500 hover:bg-green-600" onClick={() => decideMutation.mutate({ userId: m.userId, approve: true })}>
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 border-2 border-black" onClick={() => decideMutation.mutate({ userId: m.userId, approve: false })}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Points Ledger */}
      <div className="mt-6">
        <TechnicalLabel text="POINTS LEDGER" className="font-black text-sm mb-3" />
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {(ledgerData?.entries || []).length === 0 && (
            <div className="text-xs text-muted-foreground italic text-center py-4">No ledger entries yet.</div>
          )}
          {(ledgerData?.entries || []).map((e) => (
            <div key={e.id} className="flex items-center justify-between p-2.5 border border-black/10 bg-white text-xs">
              <div>
                <div className="font-black capitalize">{e.sourceType.replace(/_/g, " ")}</div>
                <div className="text-[10px] text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="font-black text-primary">{e.pointsDisplayed} pts</div>
                {parseFloat(e.vaultShareLockedPkr) > 0 && (
                  <div className="text-[10px] text-amber-600 font-bold">{formatPkr(e.vaultShareLockedPkr)} → vault</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
