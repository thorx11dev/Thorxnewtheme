import { useRef, useEffect, useState, useCallback } from "react";
import { Home, Zap, Trophy, Users, Settings } from "lucide-react";

const NAV_TABS = [
  { title: "Home", icon: Home },
  { title: "Earn", icon: Zap },
  { title: "Rewards", icon: Trophy },
  { title: "Friends", icon: Users },
  { title: "Settings", icon: Settings },
];

// ── Verlet pendulum state ──────────────────────────────────────────────
interface PendulumState {
  // pivot point (world px)
  pivotX: number;
  pivotY: number;
  // bob position (world px)
  bobX: number;
  bobY: number;
  // previous bob position (Verlet)
  prevBobX: number;
  prevBobY: number;
  // rest length
  length: number;
  // damping factor (0..1, applied per frame)
  damping: number;
  // is the user dragging?
  dragging: boolean;
}

const GRAVITY = 0.55;
const DAMPING = 0.985;
const BOB_RADIUS = 10;
const ROPE_WIDTH = 2;
const SWING_IMPULSE = 4.5;    // px/frame initial kick
const REST_LENGTH = 38;       // pivot → bob distance in pixels

function createPendulum(px: number, py: number): PendulumState {
  return {
    pivotX: px,
    pivotY: py,
    bobX: px + SWING_IMPULSE * 6,
    bobY: py + REST_LENGTH,
    prevBobX: px - SWING_IMPULSE * 2,
    prevBobY: py + REST_LENGTH,
    length: REST_LENGTH,
    damping: DAMPING,
    dragging: false,
  };
}

function stepPendulum(s: PendulumState): PendulumState {
  if (s.dragging) return s;

  // Verlet integrate
  const ax = 0;
  const ay = GRAVITY;

  const newBobX = s.bobX * 2 - s.prevBobX + ax;
  const newBobY = s.bobY * 2 - s.prevBobY + ay;

  // Constrain to rope length (distance constraint)
  const dx = newBobX - s.pivotX;
  const dy = newBobY - s.pivotY;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const scale = s.length / dist;
  const constrainedX = s.pivotX + dx * scale;
  const constrainedY = s.pivotY + dy * scale;

  // Apply damping via velocity
  const vx = (constrainedX - s.bobX) * s.damping;
  const vy = (constrainedY - s.bobY) * s.damping;

  return {
    ...s,
    prevBobX: constrainedX - vx,
    prevBobY: constrainedY - vy,
    bobX: constrainedX,
    bobY: constrainedY,
  };
}

// ── Main component ─────────────────────────────────────────────────────
export function PendulumNav() {
  const [activeTab, setActiveTab] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Pendulum state in a ref (no re-renders during physics loop)
  const pendulumRef = useRef<PendulumState | null>(null);
  const rafRef = useRef<number>(0);
  const activeTabRef = useRef(activeTab);
  const tabRectsRef = useRef<DOMRect[]>([]);

  // ── Sync activeTab into ref so rAF closure sees latest ──
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // ── Collect tab button rects relative to canvas ──────────────────
  const refreshTabRects = useCallback(() => {
    if (!navRef.current || !canvasRef.current) return;
    const navEl = navRef.current;
    const buttons = navEl.querySelectorAll<HTMLElement>("[data-tab-btn]");
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const rects: DOMRect[] = [];
    buttons.forEach((btn) => {
      const br = btn.getBoundingClientRect();
      // Translate to canvas-local coords
      rects.push(new DOMRect(
        br.left - canvasRect.left,
        br.top - canvasRect.top,
        br.width,
        br.height
      ));
    });
    tabRectsRef.current = rects;
  }, []);

  // ── Initialise or re-position pendulum when active tab changes ───
  const initPendulum = useCallback(() => {
    refreshTabRects();
    const rects = tabRectsRef.current;
    const idx = activeTabRef.current;
    if (!rects[idx]) return;

    const rect = rects[idx];
    const px = rect.left + rect.width / 2;
    const py = rect.top; // top edge of the button = pivot

    // If pendulum already exists, just move pivot and give fresh kick
    if (pendulumRef.current) {
      const prev = pendulumRef.current;
      pendulumRef.current = {
        ...prev,
        pivotX: px,
        pivotY: py,
        bobX: px + SWING_IMPULSE * 5,
        bobY: py + REST_LENGTH,
        prevBobX: px - SWING_IMPULSE,
        prevBobY: py + REST_LENGTH,
        dragging: false,
      };
    } else {
      pendulumRef.current = createPendulum(px, py);
    }
  }, [refreshTabRects]);

  useEffect(() => {
    initPendulum();
  }, [activeTab, initPendulum]);

  // ── rAF render loop ───────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);

      // Resize canvas to container
      const parent = canvas.parentElement;
      if (parent) {
        if (canvas.width !== parent.offsetWidth) canvas.width = parent.offsetWidth;
        if (canvas.height !== parent.offsetHeight) canvas.height = parent.offsetHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const p = pendulumRef.current;
      if (!p) return;

      // Step physics
      if (!p.dragging) {
        pendulumRef.current = stepPendulum(p);
      }
      const sp = pendulumRef.current!;

      // ── Draw rope ──
      ctx.beginPath();
      ctx.moveTo(sp.pivotX, sp.pivotY);
      ctx.lineTo(sp.bobX, sp.bobY);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = ROPE_WIDTH;
      ctx.lineCap = "round";
      ctx.stroke();

      // ── Draw pivot pin ──
      ctx.beginPath();
      ctx.arc(sp.pivotX, sp.pivotY, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#000";
      ctx.fill();

      // ── Draw bob ──
      ctx.beginPath();
      ctx.arc(sp.bobX, sp.bobY, BOB_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#f97316"; // orange (primary)
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2.5;
      ctx.fill();
      ctx.stroke();

      // ── Orange accent circle under pivot (icon highlight ring) ──
      const rect = tabRectsRef.current[activeTabRef.current];
      if (rect) {
        ctx.beginPath();
        ctx.arc(sp.pivotX, rect.top + rect.height / 2, 22, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(249,115,22,0.45)";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Pointer drag ─────────────────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pendulumRef.current;
    if (!p) return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const dx = mx - p.bobX;
    const dy = my - p.bobY;
    if (Math.sqrt(dx * dx + dy * dy) < BOB_RADIUS + 8) {
      canvas.setPointerCapture(e.pointerId);
      pendulumRef.current = { ...p, dragging: true };
    }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pendulumRef.current;
    if (!p || !p.dragging) return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Constrain to rope
    const dx = mx - p.pivotX;
    const dy = my - p.pivotY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const scale = p.length / dist;
    const bx = p.pivotX + dx * scale;
    const by = p.pivotY + dy * scale;

    pendulumRef.current = {
      ...p,
      prevBobX: p.bobX,
      prevBobY: p.bobY,
      bobX: bx,
      bobY: by,
    };
  }, []);

  const onPointerUp = useCallback(() => {
    const p = pendulumRef.current;
    if (!p) return;
    pendulumRef.current = { ...p, dragging: false };
  }, []);

  // ── Tab click: switch active + re-init pendulum ───────────────────
  const handleTabClick = (idx: number) => {
    setActiveTab(idx);
    // Give DOM time to settle before reading rects
    setTimeout(initPendulum, 16);
  };

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col items-center justify-center gap-12 p-8"
         style={{ fontFamily: "'Inter', sans-serif" }}>

      <div className="text-center">
        <h2 className="text-2xl font-black tracking-tight text-zinc-900 mb-1">
          Drop & Hang Pendulum
        </h2>
        <p className="text-sm text-zinc-500 font-medium">
          Drag the bob · click tabs to see it swing to a new home
        </p>
      </div>

      {/* Navbar container — canvas is absolutely positioned over it */}
      <div className="relative inline-block" ref={navRef}>
        {/* Physics canvas — full overlay, pointer-events only on canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-auto"
          style={{ zIndex: 20, touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />

        {/* Actual navbar */}
        <div className="relative flex items-center" style={{ zIndex: 10 }}>
          {NAV_TABS.map((tab, index) => {
            const isActive = activeTab === index;
            const Icon = tab.icon;
            return (
              <button
                key={tab.title}
                data-tab-btn
                onClick={() => handleTabClick(index)}
                className="relative flex items-center justify-center gap-2 h-12 px-6 transition-all duration-200"
                style={{
                  border: "3px solid #000",
                  marginLeft: index === 0 ? 0 : -3,
                  background: isActive ? "#f97316" : "#fff",
                  color: isActive ? "#000" : "#52525b",
                  zIndex: isActive ? 10 : 0,
                  transform: isActive ? "scale(1.05)" : "scale(1)",
                  boxShadow: isActive ? "4px 4px 0px #000" : "none",
                }}
              >
                <Icon
                  size={18}
                  strokeWidth={isActive ? 3 : 2}
                  style={{ position: "relative", zIndex: 10 }}
                />
                <span
                  style={{
                    position: "relative",
                    zIndex: 10,
                    fontWeight: 900,
                    fontSize: "0.7rem",
                    letterSpacing: "0.1em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tab.title.toUpperCase()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Instructions */}
      <div className="flex gap-6 text-xs text-zinc-500 font-medium">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-orange-400 border border-black" />
          Bob hangs from active tab
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-black opacity-30" />
          Click tab → swings to new pivot
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-black opacity-30" />
          Drag bob to perturb
        </span>
      </div>
    </div>
  );
}
