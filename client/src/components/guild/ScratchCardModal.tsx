import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Coins, Sparkles, Vault, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ScratchCardBreakdown {
  basePoints: number;
  guildBonusPoints: number;
  totalPoints: number;
  vaultPkr: string;
  walletPkr: string;
  guildId: string | null;
}

interface ScratchCardModalProps {
  open: boolean;
  breakdown: ScratchCardBreakdown | null;
  onClose: () => void;
}

function formatPkr(value: string | number) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return `Rs ${n.toFixed(2)}`;
}

// Threshold of scratched-off canvas area (0-1) before we auto-reveal the rest.
const REVEAL_THRESHOLD = 0.55;

export function ScratchCardModal({ open, breakdown, onClose }: ScratchCardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isScratchingRef = useRef(false);
  const [revealed, setRevealed] = useState(false);

  const paintCoatLayer = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const { width, height } = container.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#a1a1aa");
    gradient.addColorStop(0.5, "#71717a");
    gradient.addColorStop(1, "#52525b");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.font = "bold 13px sans-serif";
    for (let y = 12; y < height; y += 26) {
      for (let x = (y % 52 === 0 ? 0 : 20); x < width; x += 90) {
        ctx.fillText("THORX", x, y);
      }
    }

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SCRATCH HERE", width / 2, height / 2 - 6);
    ctx.font = "10px sans-serif";
    ctx.fillText("to reveal your reward", width / 2, height / 2 + 12);
    ctx.textAlign = "left";
  }, []);

  useEffect(() => {
    if (open) {
      setRevealed(false);
      // Wait a tick so the container has its final size before painting.
      const id = requestAnimationFrame(() => paintCoatLayer());
      return () => cancelAnimationFrame(id);
    }
  }, [open, paintCoatLayer]);

  const computeScratchedRatio = useCallback((): number => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const ctx = canvas.getContext("2d");
    if (!ctx) return 0;
    const { width, height } = canvas;
    if (!width || !height) return 0;
    const sampleStep = 6;
    const pixels = ctx.getImageData(0, 0, width, height).data;
    let cleared = 0;
    let total = 0;
    for (let y = 0; y < height; y += sampleStep) {
      for (let x = 0; x < width; x += sampleStep) {
        total++;
        const alpha = pixels[(y * width + x) * 4 + 3];
        if (alpha < 40) cleared++;
      }
    }
    return total === 0 ? 0 : cleared / total;
  }, []);

  const scratchAt = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const handleScratchMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isScratchingRef.current || revealed) return;
      scratchAt(clientX, clientY);
      if (computeScratchedRatio() >= REVEAL_THRESHOLD) {
        setRevealed(true);
      }
    },
    [computeScratchedRatio, revealed, scratchAt]
  );

  if (!breakdown) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-testid="scratch-card-overlay"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="relative w-full max-w-sm rounded-2xl border-2 border-black bg-white shadow-2xl overflow-hidden"
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-20 rounded-full bg-black/80 text-white p-1.5 hover:bg-black"
              data-testid="button-close-scratch-card"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-5 pb-3 text-center border-b-2 border-black bg-gradient-to-b from-amber-50 to-white">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Reward Unlocked
              </div>
              <div className="text-lg font-black tracking-tight text-[#111]">Scratch Your Card</div>
            </div>

            <div ref={containerRef} className="relative h-56 mx-5 my-4 rounded-xl border-2 border-black overflow-hidden">
              {/* Prize layer, underneath the scratchable coat */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-amber-100 via-white to-amber-50">
                <Sparkles className="w-6 h-6 text-amber-500" />
                <div className="flex items-center gap-1.5 text-3xl font-black text-[#111]">
                  <Coins className="w-6 h-6 text-amber-500" />
                  {breakdown.totalPoints.toLocaleString()}
                  <span className="text-sm font-bold text-zinc-500">pts</span>
                </div>
                <div className="text-xs font-bold text-zinc-500">
                  {formatPkr(breakdown.walletPkr)} to your wallet
                </div>
                {breakdown.guildId && parseFloat(breakdown.vaultPkr) > 0 && (
                  <div className="flex items-center gap-1 text-[11px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 mt-1">
                    <Vault className="w-3 h-3" />
                    +{breakdown.guildBonusPoints.toLocaleString()} pts guild-locked
                  </div>
                )}
              </div>

              {/* Scratchable coat */}
              {!revealed && (
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 h-full w-full cursor-pointer touch-none"
                  data-testid="canvas-scratch-coat"
                  onMouseDown={(e) => {
                    isScratchingRef.current = true;
                    scratchAt(e.clientX, e.clientY);
                  }}
                  onMouseUp={() => (isScratchingRef.current = false)}
                  onMouseLeave={() => (isScratchingRef.current = false)}
                  onMouseMove={(e) => handleScratchMove(e.clientX, e.clientY)}
                  onTouchStart={(e) => {
                    isScratchingRef.current = true;
                    const t = e.touches[0];
                    if (t) scratchAt(t.clientX, t.clientY);
                  }}
                  onTouchEnd={() => (isScratchingRef.current = false)}
                  onTouchMove={(e) => {
                    const t = e.touches[0];
                    if (t) handleScratchMove(t.clientX, t.clientY);
                  }}
                />
              )}
            </div>

            <div className="px-5 pb-5 text-center">
              <button
                onClick={onClose}
                className={cn(
                  "w-full rounded-lg border-2 border-black py-2.5 text-xs font-black uppercase tracking-widest transition-colors",
                  revealed ? "bg-[#111] text-white hover:bg-black" : "bg-white text-zinc-400 cursor-not-allowed"
                )}
                disabled={!revealed}
                data-testid="button-collect-reward"
              >
                {revealed ? "Collect Reward" : "Scratch to Continue"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
