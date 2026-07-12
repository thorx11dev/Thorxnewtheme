import type { Server as HttpServer, IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import type session from "express-session";
import { storage } from "./storage";

/**
 * Lightweight real-time sync layer.
 *
 * Every admin action that mutates a user's financial/profile/rank/status data
 * broadcasts a `user:updated` event to:
 *   1. that specific user's open sessions (any tab/device where they're logged in), and
 *   2. every connected team/admin session that has permission to view user data
 *      (so other team members' CRM views refresh too).
 *
 * Clients react by invalidating their TanStack Query caches — see
 * client/src/hooks/useRealtimeSync.ts.
 */

interface SocketMeta {
  userId: string;
  /** True only for sessions allowed to see cross-user activity (founder/admin, or team with a users/dashboard section grant). */
  canSeeUserActivity: boolean;
}

const sockets = new Map<WebSocket, SocketMeta>();

let wss: WebSocketServer | null = null;

/** Mirrors the section-level grants requirePermission() treats as covering VIEW_USERS in server/routes.ts. */
const USER_VISIBILITY_SECTIONS = ["users", "dashboard"];

async function canSeeUserActivity(role: string | undefined, userId: string): Promise<boolean> {
  if (role === "founder" || role === "admin") return true;
  if (role !== "team") return false;
  try {
    const keys = await storage.getTeamKeysByUser(userId);
    const activeKey = keys.find((k) => k.isActive !== false);
    const permissions: string[] = activeKey?.permissions || [];
    return permissions.some((p) => USER_VISIBILITY_SECTIONS.includes(p) || p === "VIEW_USERS" || p === "MANAGE_USERS");
  } catch {
    return false;
  }
}

export function initRealtime(
  httpServer: HttpServer,
  sessionMiddleware: ReturnType<typeof session>
) {
  wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (req: IncomingMessage, socket, head) => {
    if (req.url !== "/ws") return; // let other upgrade handlers (e.g. Vite HMR) proceed
    // Reuse the same express-session middleware to parse the session cookie.
    sessionMiddleware(req as any, {} as any, async () => {
      const sess: any = (req as any).session;
      const userId: string | undefined = sess?.userId;
      if (!userId) {
        socket.destroy();
        return;
      }
      const role: string | undefined = sess?.user?.role;
      const visibility = await canSeeUserActivity(role, userId);
      wss!.handleUpgrade(req, socket, head, (ws) => {
        sockets.set(ws, { userId, canSeeUserActivity: visibility });
        ws.on("close", () => sockets.delete(ws));
        ws.on("error", () => sockets.delete(ws));
      });
    });
  });
}

function send(ws: WebSocket, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

/**
 * Notify a specific user's connections and all team/admin connections
 * permitted to see cross-user activity that the user's record changed. Call
 * this after any mutation to a user's balance, rank, status, role, or profile.
 */
export function broadcastUserUpdated(userId: string, reason?: string, data?: Record<string, unknown>) {
  const payload = { type: "user:updated", userId, reason, data, at: Date.now() };
  sockets.forEach((meta, ws) => {
    if (meta.userId === userId || meta.canSeeUserActivity) {
      send(ws, payload);
    }
  });
}

/** Notify all connected sessions permitted to see cross-user activity (e.g. new user registered, directory changed). */
export function broadcastTeamRefresh(reason?: string) {
  const payload = { type: "team:refresh", reason, at: Date.now() };
  sockets.forEach((meta, ws) => {
    if (meta.canSeeUserActivity) send(ws, payload);
  });
}
