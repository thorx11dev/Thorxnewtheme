import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getApiOrigin } from "@/lib/apiOrigin";
import type { User } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { QUERY_KEYS } from "@/lib/queryKeys";

/**
 * Query keys that represent "this user's own data". Any of these must be
 * refetched the instant an admin action changes that user's record (balance,
 * rank, status, etc.) so the user portal never shows a stale state.
 */
const OWN_DATA_QUERY_KEYS: unknown[][] = [
  QUERY_KEYS.sessionAuth,
  ["dashboard", "stats"],
  ["earnings"],
  ["earnings", "history", "week"],
  ["referrals"],
  ["referrals", "leaderboard"],
  ["commissions"],
  ["notifications"],
  ["transactions", "history"],
  ["/api/withdrawals"],
];

/** Query keys the team portal's CRM views read — refreshed on any user or team change. */
const TEAM_DATA_QUERY_KEY_PREFIXES: string[] = [
  "/api/team/users",
  "/api/admin/users",
  "/api/admin/withdrawals",
  "/api/team/members",
  "/api/admin/notes",
];

function buildWsUrl(): string {
  const origin = getApiOrigin();
  if (origin) {
    return origin.replace(/^http/, "ws") + "/ws";
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

/**
 * Establishes a single WebSocket connection per authenticated session and
 * invalidates the relevant TanStack Query caches whenever the server
 * broadcasts a change — keeping the user portal, profile modal, and team
 * portal CRM in sync without a manual refresh.
 */
export function useRealtimeSync(user: User | null, guildId?: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  // Prevents reconnection attempts when the account has been suspended (Q3)
  const suspendedRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      const ws = new WebSocket(buildWsUrl());
      socketRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        // Register this socket's active guild so broadcastGuildEvent routes correctly
        if (guildId) ws.send(JSON.stringify({ type: "join_guild", guildId }));
      };

      ws.onmessage = (event) => {
        let msg: { type?: string; userId?: string; guildId?: string; reason?: string; data?: Record<string, unknown> };
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }

        // Q3 business decision: server sends SUSPENDED message before closing socket
        // so the client can show a clear reason rather than a generic disconnect toast.
        if (msg.type === "SUSPENDED") {
          suspendedRef.current = true; // block reconnection loop
          toast({
            title: "⛔ Account Suspended",
            description: (msg as any).message ?? "Your account has been suspended. Please contact support.",
            variant: "destructive",
          });
          // Invalidate session so ProtectedRoute redirects to /auth
          queryClient.invalidateQueries({ queryKey: ["session-auth"] });
          return;
        }

        if (msg.type === "user:updated" && msg.userId === user.id) {
          for (const key of OWN_DATA_QUERY_KEYS) {
            queryClient.invalidateQueries({ queryKey: key });
          }

          if (
            (msg.reason === "rank_updated" || msg.reason === "rank_manually_set") &&
            msg.data?.newRank &&
            msg.data.newRank !== msg.data.oldRank
          ) {
            toast({
              title: "🎉 Rank Upgrade!",
              description: `Congratulations! You've been promoted to ${msg.data.newRank}.`,
            });
          }
        }

        if (msg.type === "user:updated" || msg.type === "team:refresh") {
          for (const prefix of TEAM_DATA_QUERY_KEY_PREFIXES) {
            queryClient.invalidateQueries({
              predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith(prefix),
            });
          }
        }

        if (msg.type === "risk:alert") {
          const ra = msg as any;
          queryClient.invalidateQueries({
            predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/admin/risk-cases"),
          });
          if (ra.severity === "Critical" || ra.severity === "High") {
            toast({
              title: `⚠️ ${ra.severity} Risk — ${ra.userName}`,
              description: `Risk score ${Math.round(ra.riskScore)}/100 · ${ra.signals?.length ?? 0} signals triggered.`,
              variant: ra.severity === "Critical" ? "destructive" : undefined,
            });
          }
        }

        // ── H.1 guild-scoped events ────────────────────────────────────
        if (msg.type === "guild.weekly_points") {
          queryClient.invalidateQueries({ queryKey: ["guild", "weekly-tasks"] });
          queryClient.invalidateQueries({ queryKey: ["/api/guilds", msg.guildId, "weekly-snapshot"] });
        }

        if (msg.type === "guild.application_received") {
          queryClient.invalidateQueries({ queryKey: ["/api/guilds", msg.guildId, "applications"] });
        }

        if (msg.type === "guild.application_decided" && msg.userId === user.id) {
          queryClient.invalidateQueries({ queryKey: ["/api/guilds", msg.guildId, "application-status"] });
          queryClient.invalidateQueries({ queryKey: ["session-auth"] });
          const action = (msg.data as any)?.action;
          toast({
            title: action === "accept" ? "🎉 Guild Application Accepted!" : "Guild Application Update",
            description: action === "accept"
              ? "You have been accepted into the guild. Welcome!"
              : "Your guild application was not accepted this time.",
            variant: action === "accept" ? undefined : "destructive",
          });
        }

        if (msg.type === "guild.nudge_received" && msg.userId === user.id) {
          toast({ title: "👋 Nudge from your Guild Captain", description: "Your captain wants you to complete your weekly tasks!" });
        }

        if (msg.type === "guild.mvp_selected") {
          queryClient.invalidateQueries({ queryKey: ["/api/guilds", msg.guildId, "members"] });
        }

        if (msg.type === "user.ps_updated" && msg.userId === user.id) {
          queryClient.invalidateQueries({ queryKey: ["session-auth"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });
        }

        // ── Phase 6.2: Withdrawal status changed ────────────────────────────
        if (msg.type === "withdrawal_status_changed" && msg.userId === user.id) {
          queryClient.invalidateQueries({ queryKey: ["/api/withdrawals"] });
          const status = (msg.data as any)?.status;
          toast({
            title: status === "approved" ? "✅ Withdrawal Approved" : status === "rejected" ? "❌ Withdrawal Rejected" : "Withdrawal Update",
            description: status === "approved"
              ? "Your payout has been approved and is being processed."
              : status === "rejected"
              ? "Your withdrawal was rejected. Please contact support."
              : `Your withdrawal status changed to ${status}.`,
            variant: status === "rejected" ? "destructive" : undefined,
          });
        }

        // ── Phase 6.1: Guild captain changed ────────────────────────────────
        if (msg.type === "guild.captain_changed" && msg.userId === user.id) {
          queryClient.invalidateQueries({ queryKey: ["/api/guilds/mine"] });
          queryClient.invalidateQueries({ queryKey: ["session-auth"] });
          const promoted = (msg.data as any)?.promoted;
          const demoted = (msg.data as any)?.demoted;
          if (promoted) toast({ title: "⚔️ You are now Guild Captain!", description: "Congratulations — you have been promoted to captain." });
          if (demoted) toast({ title: "Guild Captain Change", description: "You have been replaced as Guild Captain.", variant: "destructive" });
        }

        // ── Phase 15.8: Sunday guild pool credited ───────────────────────────
        if (msg.type === "guild.pool_credited") {
          queryClient.invalidateQueries({ queryKey: ["/api/guilds/mine"] });
          queryClient.invalidateQueries({ queryKey: ["/api/guilds", msg.guildId] });
          queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });
          if (msg.userId === user.id || !msg.userId) {
            toast({ title: "🎉 Sunday Bonus Credited!", description: "Your weekly guild pool bonus has been distributed to your balance." });
          }
        }

        // ── Phase 15.7: DM received — invalidate the DM thread ───────────────
        if (msg.type === "guild.dm_received" && msg.userId === user.id) {
          queryClient.invalidateQueries({
            predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).includes("/dm/"),
          });
        }

        // ── Phase 6.3: Guild settings updated ────────────────────────────────
        if (msg.type === "guild.settings_updated") {
          queryClient.invalidateQueries({ queryKey: ["/api/guilds/mine"] });
          queryClient.invalidateQueries({ queryKey: ["/api/guilds", msg.guildId] });
        }

        // ── Audit fix X: Announcement broadcast → instant member refresh ─────
        if (msg.type === "guild.announcement_posted") {
          const guildId = (msg as any).guildId;
          if (guildId) {
            queryClient.invalidateQueries({ queryKey: ["/api/guilds", guildId] });
            queryClient.invalidateQueries({ queryKey: ["/api/guilds/mine"] });
            const announcement = (msg as any).announcement;
            if (announcement) {
              toast({
                title: "📣 New Announcement",
                description: String(announcement).substring(0, 100),
              });
            }
          }
        }

        // ── Audit fix Z: Guild chat WS push → invalidate chat cache ──────────
        if (msg.type === "engine_c:message") {
          const guildId = (msg as any).guildId;
          if (guildId) {
            queryClient.invalidateQueries({ queryKey: ["/api/guilds", guildId, "chat"] });
          }
        }

        // ── Audit fix Y: GPS updated → invalidate guild score display ─────────
        if (msg.type === "guild.gps_updated") {
          const guildId = (msg as any).guildId;
          if (guildId) {
            queryClient.invalidateQueries({ queryKey: ["/api/guilds", guildId] });
          }
        }

        // ── Phase 15.9: Withdrawal status (legacy user:updated path) ─────────
        // Already handled above via withdrawal_status_changed; keep the
        // user:updated path for generic cache flush.
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (cancelled) return;
        // Don't reconnect if the server suspended this account (Q3)
        if (suspendedRef.current) return;
        // Notify the user that live features are paused (Finding 3-E / Task 17)
        toast({
          title: "Live connection lost",
          description: "Real-time features paused — reconnecting…",
          variant: "destructive",
        });
        // Reconnect with a short fixed backoff; sessions are long-lived so
        // this only triggers on network blips or server restarts.
        reconnectTimer.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        setWsConnected(false);
        ws.close();
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      socketRef.current?.close();
    };
  }, [user?.id, guildId, queryClient]);

  return { wsConnected };
}
