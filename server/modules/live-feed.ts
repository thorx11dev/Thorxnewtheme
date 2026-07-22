// THORX v3 — Centralized event emission for the admin Live Activity Feed
// (Part E.4 of the v3 spec). Every notable platform event (earn, rank_up,
// guild_target, withdrawal, registration, guild_event, inactivity) should be
// routed through emitFeedEvent so the admin Live Activity Feed and audit
// trail stay complete and consistent.

import { db } from "../db";
import { logger } from "../lib/logger";
import { activityFeed } from "@shared/schema";

export type FeedEventType =
  | "earn"
  | "rank_up"
  | "guild_target"
  | "withdrawal"
  | "registration"
  | "guild_event"
  | "inactivity";

export interface FeedEvent {
  type: FeedEventType;
  userId?: string;
  guildId?: string;
  displayMessage: string; // pre-formatted for admin display
  data: Record<string, any>;
}

export async function emitFeedEvent(event: FeedEvent): Promise<void> {
  await db.insert(activityFeed).values({
    eventType: event.type,
    userId: event.userId,
    guildId: event.guildId,
    displayMessage: event.displayMessage,
    data: event.data ?? {},
  });

  try {
    const { broadcastAdminFeedEvent } = await import("../realtime");
    broadcastAdminFeedEvent(event);
  } catch (e) {
    logger.error({ err: e }, "Failed to broadcast admin feed event");
  }
}
