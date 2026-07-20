/**
 * WsStatusBanner — persistent bottom banner shown while the WebSocket is disconnected.
 * Disappears immediately on reconnect. Replaces the one-shot toast that could be missed
 * if the user was looking away (Finding 3-B).
 */
export function WsStatusBanner({ wsConnected }: { wsConnected: boolean }) {
  if (wsConnected) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2
                 bg-amber-500 text-black text-xs font-semibold px-4 py-2 rounded-full
                 shadow-lg animate-pulse pointer-events-none select-none"
      role="status"
      aria-live="polite"
    >
      <span className="h-2 w-2 rounded-full bg-black opacity-60" />
      Live connection lost — reconnecting…
    </div>
  );
}
