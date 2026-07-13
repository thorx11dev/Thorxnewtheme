import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users, Activity, DollarSign, TrendingUp, TrendingDown, Minus,
  Clock, UserCheck, LayoutDashboard, ArrowUpRight, BarChart3, Zap,
  AlertTriangle, Network, Pulse, ShieldAlert
} from "lucide-react";
import TechnicalLabel from "@/components/ui/technical-label";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from "recharts";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SystemHealthCard } from "./SystemHealthCard";
import { FounderProfitCard } from "./FounderProfitCard";
import { useAuth } from "@/hooks/useAuth";

// ── Compact metric card ─────────────────────────────────────────────────────

function MetricCard({
  title, value, subtitle, icon: Icon, trend, variant = "white", delay = 0
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { direction: "up" | "down" | "flat"; label: string };
  variant?: "orange" | "black" | "white" | "warning" | "danger";
  delay?: number;
}) {
  const styles = {
    orange: "bg-gradient-to-br from-orange-400 to-amber-500 border-orange-500 text-white",
    black:  "bg-[#111] border-black text-white",
    white:  "bg-white border-black/10 text-foreground",
    warning:"bg-amber-50 border-amber-300 text-foreground",
    danger: "bg-red-50 border-red-300 text-foreground",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "split-card border-2 p-5 shadow-[4px_4px_0_0_#000] space-y-3 flex flex-col justify-between min-h-[130px]",
        styles[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("p-2 rounded-full border", variant === "white" ? "bg-zinc-100 border-zinc-200" : "bg-white/10 border-white/20")}>
          <Icon className={cn("w-4 h-4", variant === "white" ? "text-foreground" : "text-white")} />
        </div>
        <TechnicalLabel text={title} className={cn("text-[9px]", variant === "white" ? "text-muted-foreground" : "text-white/60")} />
      </div>
      <div>
        <p className={cn("text-2xl font-black tracking-tight", variant === "white" ? "text-foreground" : "text-white")}>{value}</p>
        {subtitle && <p className={cn("text-[10px] font-bold mt-0.5", variant === "white" ? "text-muted-foreground" : "text-white/60")}>{subtitle}</p>}
        {trend && (
          <div className={cn("flex items-center gap-1 text-[10px] font-black mt-1", variant === "white" ? (trend.direction === "up" ? "text-emerald-600" : trend.direction === "down" ? "text-red-500" : "text-muted-foreground") : "text-white/80")}>
            {trend.direction === "up" ? <TrendingUp className="w-3 h-3" /> : trend.direction === "down" ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {trend.label}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────────

export function AdminDashboard() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = React.useState("7d");

  const { data: metrics, isLoading: metricsLoading } = useQuery<any>({
    queryKey: [`/api/team/metrics?range=${dateRange}`],
    refetchInterval: 60000,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<any>({
    queryKey: [`/api/admin/analytics?range=${dateRange}`],
  });

  const isFounder = user?.role === "founder";

  // Extract extended metric values with safe defaults
  const pendingTotal = parseFloat(metrics?.pendingWithdrawalTotal ?? "0");
  const pendingCount = metrics?.pendingWithdrawalCount ?? 0;
  const oldestDays = metrics?.oldestPendingDays ?? null;
  const unverifiedTotal = parseFloat(metrics?.unverifiedCreditTotal ?? "0");
  const unverifiedCount = metrics?.unverifiedCreditCount ?? 0;
  const growthRate = metrics?.userGrowthRate ?? 0;
  const thisWeek = metrics?.userGrowthThisWeek ?? 0;
  const lastWeek = metrics?.userGrowthLastWeek ?? 0;
  const l1 = metrics?.networkL1Total ?? 0;
  const l2 = metrics?.networkL2Total ?? 0;
  const networkRatio = metrics?.networkRatio ?? 0;
  const activity24h = metrics?.teamActivity24h ?? 0;
  const activityAvg = metrics?.teamActivityAvg7d ?? 0;
  const mostActive = metrics?.mostActiveTeamMember ?? null;
  const totalUsers = metrics?.totalUsers ?? 0;

  const chartData = (analytics ?? []).map((item: any) => {
    const date = new Date(item.date);
    return {
      name: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        ...(dateRange === "24h" ? { hour: "2-digit" } : {}),
        ...(dateRange === "7d" ? { weekday: "short" } : {}),
      }),
      registrations: item.count,
      revenue: parseFloat(item.amount ?? "0"),
    };
  });

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Date Range Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase text-[#111]">Command Center</h2>
          <p className="text-sm text-muted-foreground font-bold mt-0.5">Platform-wide operational overview</p>
        </div>
        <ToggleGroup
          type="single"
          value={dateRange}
          onValueChange={(val) => val && setDateRange(val)}
          className="bg-white border-2 border-black rounded-full p-1 shadow-[2px_2px_0_0_#000]"
        >
          {["24h", "7d", "30d", "all"].map((range) => (
            <ToggleGroupItem
              key={range}
              value={range}
              className="rounded-full font-black text-[10px] tracking-widest uppercase px-4 h-8 data-[state=on]:bg-black data-[state=on]:text-white"
            >
              {range}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Section 1: Platform Health — special cards */}
      <section className="space-y-3">
        <TechnicalLabel text="PLATFORM HEALTH" />
        <div className={cn("grid gap-5", isFounder ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
          <SystemHealthCard />
          {isFounder && <FounderProfitCard />}
        </div>
      </section>

      {/* Section 2: Core Metrics */}
      <section className="space-y-3">
        <TechnicalLabel text="CORE METRICS" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <MetricCard
            title="TOTAL REVENUE"
            value={`₨${parseFloat(metrics?.totalEarnings ?? "0").toLocaleString()}`}
            subtitle="Platform-wide earnings"
            icon={DollarSign}
            variant="orange"
            delay={0}
          />
          <MetricCard
            title="ACTIVE USERS"
            value={String(metrics?.activeUsers ?? "—")}
            subtitle={`${dateRange} window`}
            icon={UserCheck}
            variant="white"
            delay={0.05}
          />
          <MetricCard
            title="TOTAL MEMBERS"
            value={metricsLoading ? "…" : totalUsers.toLocaleString()}
            subtitle="Registered & active accounts"
            icon={Users}
            variant="white"
            delay={0.1}
          />
          <MetricCard
            title="PENDING WITHDRAWALS"
            value={`₨${pendingTotal.toLocaleString()}`}
            subtitle={`${pendingCount} requests${oldestDays !== null ? ` · oldest ${oldestDays}d` : ""}`}
            icon={Clock}
            variant={oldestDays !== null && oldestDays > 48 ? "warning" : "white"}
            trend={oldestDays !== null && oldestDays > 72 ? { direction: "down", label: `Oldest: ${oldestDays}d old` } : undefined}
            delay={0.15}
          />
        </div>
      </section>

      {/* Section 3: Growth & Activity */}
      <section className="space-y-3">
        <TechnicalLabel text="GROWTH & ACTIVITY" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* User Growth Rate */}
          <MetricCard
            title="USER GROWTH RATE"
            value={`${growthRate > 0 ? "+" : ""}${growthRate}%`}
            subtitle={`This week: ${thisWeek} · Last week: ${lastWeek}`}
            icon={TrendingUp}
            variant="white"
            trend={growthRate > 5 ? { direction: "up", label: "Growing" } : growthRate < -5 ? { direction: "down", label: "Declining" } : { direction: "flat", label: "Flat" }}
            delay={0.05}
          />

          {/* Referral Network Depth */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="split-card border-2 border-black/10 bg-white p-5 shadow-[4px_4px_0_0_#000] space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-full border bg-zinc-100 border-zinc-200">
                <Network className="w-4 h-4 text-foreground" />
              </div>
              <TechnicalLabel text="NETWORK DEPTH" className="text-[9px] text-muted-foreground" />
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-100">
                <p className="text-xs font-black text-foreground">{l1}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">L1</p>
              </div>
              <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-100">
                <p className="text-xs font-black text-foreground">{l2}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">L2</p>
              </div>
              <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-100">
                <p className="text-xs font-black text-foreground">{networkRatio}×</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">RATIO</p>
              </div>
            </div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Referral network spread (L2÷L1)</p>
          </motion.div>

          {/* Team Activity Pulse */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "split-card border-2 p-5 shadow-[4px_4px_0_0_#000] space-y-3",
              activity24h === 0 && activityAvg > 2 ? "bg-amber-50 border-amber-300" :
              activity24h > activityAvg * 3 ? "bg-blue-50 border-blue-300" :
              "bg-white border-black/10"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-full border bg-zinc-100 border-zinc-200">
                <Activity className="w-4 h-4 text-foreground" />
              </div>
              <TechnicalLabel text="TEAM ACTIVITY" className="text-[9px] text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-black tracking-tight">{activity24h}</p>
              <p className="text-[10px] font-bold text-muted-foreground mt-0.5">
                actions today · avg {activityAvg}/day
              </p>
            </div>
            {mostActive && (
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                Most active: {mostActive}
              </p>
            )}
            {activity24h === 0 && activityAvg > 2 && (
              <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> No activity today
              </p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Section 4: Financial Integrity */}
      <section className="space-y-3">
        <TechnicalLabel text="FINANCIAL INTEGRITY" />
        <div className="grid grid-cols-1 md:grid-cols-1 gap-5">
          <MetricCard
            title="UNVERIFIED CREDIT EXPOSURE"
            value={`₨${unverifiedTotal.toLocaleString()}`}
            subtitle={`${unverifiedCount} admin credits not backed by real deposits`}
            icon={ShieldAlert}
            variant={unverifiedTotal > 100000 ? "danger" : unverifiedTotal > 50000 ? "warning" : "white"}
            trend={unverifiedTotal > 100000 ? { direction: "down", label: "High exposure — review recommended" } : undefined}
            delay={0}
          />
        </div>
      </section>

      {/* Section 5: Analytics Charts */}
      <section className="space-y-3">
        <TechnicalLabel text="ANALYTICS" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Registrations chart */}
          <div className="bg-card border-2 border-black shadow-[4px_4px_0_0_#000] overflow-hidden">
            <div className="p-5 border-b-2 border-black bg-white flex items-center gap-2">
              <Users className="w-4 h-4" />
              <TechnicalLabel text="NEW REGISTRATIONS" />
            </div>
            <div className="p-5 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 2" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.15} />
                  <XAxis dataKey="name" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontWeight: 700 }} />
                  <YAxis fontSize={9} tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontWeight: 700 }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "2px solid hsl(var(--primary))", borderRadius: "8px", fontSize: "11px", fontWeight: "bold" }} />
                  <Area type="monotone" dataKey="registrations" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#colorReg)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue chart */}
          <div className="bg-card border-2 border-black shadow-[4px_4px_0_0_#000] overflow-hidden">
            <div className="p-5 border-b-2 border-black bg-white flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <TechnicalLabel text="REVENUE (₨)" />
            </div>
            <div className="p-5 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="2 2" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.15} />
                  <XAxis dataKey="name" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontWeight: 700 }} />
                  <YAxis fontSize={9} tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontWeight: 700 }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "2px solid hsl(var(--primary))", borderRadius: "8px", fontSize: "11px", fontWeight: "bold" }} />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {chartData.map((_: any, i: number) => (
                      <Cell key={i} fill={i % 2 === 0 ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.6)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
