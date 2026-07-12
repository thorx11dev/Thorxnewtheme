import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getApiOrigin } from "@/lib/apiOrigin";
import type { User } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

/**
 * Query keys that represent "this user's own data". Any of these must be
 * refetched the instant an admin action changes that user's record (balance,
 * rank, status, etc.) so the user portal never shows a stale state.
 */
const OWN_DATA_QUERY_KEYS: unknown[][] = [
  ["session-auth"],
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
export function useRealtimeSync(user: User | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      const ws = new WebSocket(buildWsUrl());
      socketRef.current = ws;

      ws.onmessage = (event) => {
        let msg: { type?: string; userId?: string; reason?: string; data?: { oldRank?: string; newRank?: string } };
        try {
          msg = JSON.parse(event.data);
        } catch {
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
      };

      ws.onclose = () => {
        if (cancelled) return;
        // Reconnect with a short fixed backoff; sessions are long-lived so
        // this only triggers on network blips or server restarts.
        reconnectTimer.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      socketRef.current?.close();
    };
  }, [user?.id, queryClient]);
}
