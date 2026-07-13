import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users, Activity, DollarSign, TrendingUp, TrendingDown, Minus,
  Clock, UserCheck, ArrowUpRight, BarChart3, AlertTriangle,
  Network, ShieldAlert, GitBranch, Coins
} from "lucide-react";
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

// ── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({
  title, value, subtitle, icon: Icon, trend, variant = "white", delay = 0
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { direction: "up" | "down" | "flat"; label: string };
  variant?: "accent" | "dark" | "white" | "warning" | "danger";
  delay?: number;
}) {
  const styles: Record<string, string> = {
    accent: "bg-[#111] text-white border-[#111]",
    dark:   "bg-zinc-900 text-white border-zinc-800",
    white:  "bg-white text-foreground border-zinc-200",
    warning:"bg-amber-50 text-foreground border-amber-200",
    danger: "bg-red-50 text-foreground border-red-200",
  };
  const isLight = variant === "white" || variant === "warning" || variant === "danger";
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "border-[1.5px] rounded-[2rem] p-5 space-y-3 flex flex-col justify-between min-h-[130px]",
        styles[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("p-2 rounded-full border", isLight ? "bg-zinc-100 border-zinc-200" : "bg-white/10 border-white/20")}>
          <Icon className={cn("w-4 h-4", isLight ? "text-foreground" : "text-white")} />
        </div>
        <span className={cn("text-[9px] font-black uppercase tracking-widest", isLight ? "text-muted-foreground" : "text-white/60")}>{title}</span>
      </div>
      <div>
        <p className={cn("text-2xl font-black tracking-tight", isLight ? "text-foreground" : "text-white")}>{value}</p>
        {subtitle && <p className={cn("text-[10px] font-bold mt-0.5", isLight ? "text-muted-foreground" : "text-white/60")}>{subtitle}</p>}
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-[10px] font-black mt-1.5",
            isLight
              ? trend.direction === "up" ? "text-emerald-600" : trend.direction === "down" ? "text-red-500" : "text-muted-foreground"
              : "text-white/80"
          )}>
            {trend.direction === "up" ? <TrendingUp className="w-3 h-3" /> : trend.direction === "down" ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {trend.label}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{text}</p>
  );
}

// ── Chart card ────────────────────────────────────────────────────────────────

function ChartCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white border-[1.5px] border-zinc-200 rounded-[2rem] overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-black uppercase tracking-widest text-foreground">{title}</span>
      </div>
      <div className="p-5 h-[220px]">{children}</div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

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

  // Derived values
  const pendingTotal   = parseFloat(metrics?.pendingWithdrawalTotal ?? "0");
  const pendingCount   = metrics?.pendingWithdrawalCount ?? 0;
  const oldestDays     = metrics?.oldestPendingDays ?? null;
  const unverifiedTotal= parseFloat(metrics?.unverifiedCreditTotal ?? "0");
  const unverifiedCount= metrics?.unverifiedCreditCount ?? 0;
  const growthRate     = metrics?.userGrowthRate ?? 0;
  const thisWeek       = metrics?.userGrowthThisWeek ?? 0;
  const lastWeek       = metrics?.userGrowthLastWeek ?? 0;
  const l1             = metrics?.networkL1Total ?? 0;
  const l2             = metrics?.networkL2Total ?? 0;
  const networkRatio   = metrics?.networkRatio ?? 0;
  const activity24h    = metrics?.teamActivity24h ?? 0;
  const activityAvg    = metrics?.teamActivityAvg7d ?? 0;
  const mostActive     = metrics?.mostActiveTeamMember ?? null;
  const totalUsers     = metrics?.totalUsers ?? 0;
  const totalEarnings  = parseFloat(metrics?.totalEarnings ?? "0");
  const activeUsers    = metrics?.activeUsers ?? 0;

  const chartData = (analytics ?? []).map((item: any) => {
    const date = new Date(item.date);
    return {
      name: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        ...(dateRange === "7d" ? { weekday: "short" } : {}),
      }),
      registrations: item.count,
      revenue: parseFloat(item.amount ?? "0"),
    };
  });

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Page Header + Date Range Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-foreground">Platform Overview</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Live stats across your entire platform</p>
        </div>
        <ToggleGroup
          type="single"
          value={dateRange}
          onValueChange={(val) => val && setDateRange(val)}
          className="bg-white border-[1.5px] border-zinc-200 rounded-full p-1"
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

      {/* Section 1: System Health */}
      <section className="space-y-3">
        <SectionLabel text="System Health" />
        <div className={cn("grid gap-5", isFounder ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
          <SystemHealthCard />
          {isFounder && <FounderProfitCard />}
        </div>
      </section>

      {/* Section 2: Core Metrics */}
      <section className="space-y-3">
        <SectionLabel text="Core Metrics" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Revenue"
            value={`₨${totalEarnings.toLocaleString()}`}
            subtitle="All-time platform earnings"
            icon={DollarSign}
            variant="accent"
            delay={0}
          />
          <MetricCard
            title="Active Users"
            value={String(activeUsers ?? "—")}
            subtitle={`In the selected ${dateRange} window`}
            icon={UserCheck}
            variant="white"
            delay={0.05}
          />
          <MetricCard
            title="Total Members"
            value={metricsLoading ? "…" : totalUsers.toLocaleString()}
            subtitle="Registered accounts"
            icon={Users}
            variant="white"
            delay={0.1}
          />
          <MetricCard
            title="Pending Payouts"
            value={`₨${pendingTotal.toLocaleString()}`}
            subtitle={`${pendingCount} request${pendingCount !== 1 ? "s" : ""}${oldestDays !== null ? ` · oldest ${oldestDays}d` : ""}`}
            icon={Clock}
            variant={oldestDays !== null && oldestDays > 48 ? "warning" : "white"}
            trend={oldestDays !== null && oldestDays > 72 ? { direction: "down", label: `Oldest: ${oldestDays}d overdue` } : undefined}
            delay={0.15}
          />
        </div>
      </section>

      {/* Section 3: Growth & Network */}
      <section className="space-y-3">
        <SectionLabel text="Growth & Network" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* User Growth */}
          <MetricCard
            title="User Growth"
            value={`${growthRate > 0 ? "+" : ""}${growthRate}%`}
            subtitle={`This week: ${thisWeek} new · Last week: ${lastWeek}`}
            icon={TrendingUp}
            variant="white"
            trend={growthRate > 5 ? { direction: "up", label: "Growing" } : growthRate < -5 ? { direction: "down", label: "Declining" } : { direction: "flat", label: "Stable" }}
            delay={0.05}
          />

          {/* Referral Network */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white border-[1.5px] border-zinc-200 rounded-[2rem] p-5 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-full border bg-zinc-100 border-zinc-200">
                <Network className="w-4 h-4 text-foreground" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Referral Network</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-100">
                <p className="text-sm font-black text-foreground">{l1}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Direct</p>
              </div>
              <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-100">
                <p className="text-sm font-black text-foreground">{l2}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Network</p>
              </div>
              <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-100">
                <p className="text-sm font-black text-foreground">{networkRatio}×</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Ratio</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground font-bold">Network depth (L2 ÷ L1)</p>
          </motion.div>

          {/* Team Activity */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "border-[1.5px] rounded-[2rem] p-5 space-y-3",
              activity24h === 0 && activityAvg > 2 ? "bg-amber-50 border-amber-200" :
              activity24h > activityAvg * 3 ? "bg-blue-50 border-blue-200" :
              "bg-white border-zinc-200"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-full border bg-zinc-100 border-zinc-200">
                <Activity className="w-4 h-4 text-foreground" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Team Activity</span>
            </div>
            <div>
              <p className="text-2xl font-black tracking-tight">{activity24h}</p>
              <p className="text-[10px] font-bold text-muted-foreground mt-0.5">
                actions today · avg {activityAvg}/day
              </p>
            </div>
            {mostActive && (
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                Most active: {mostActive}
              </p>
            )}
            {activity24h === 0 && activityAvg > 2 && (
              <p className="text-[9px] font-black text-amber-700 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> No admin activity today
              </p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Section 4: Financial Integrity */}
      <section className="space-y-3">
        <SectionLabel text="Financial Integrity" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            title="Unverified Credit Exposure"
            value={`₨${unverifiedTotal.toLocaleString()}`}
            subtitle={`${unverifiedCount} manual credits not backed by real deposits`}
            icon={ShieldAlert}
            variant={unverifiedTotal > 100000 ? "danger" : unverifiedTotal > 50000 ? "warning" : "white"}
            trend={unverifiedTotal > 100000 ? { direction: "down", label: "High exposure — review recommended" } : undefined}
            delay={0}
          />
          <MetricCard
            title="Payout Queue Value"
            value={`₨${pendingTotal.toLocaleString()}`}
            subtitle={`${pendingCount} pending · real cash obligation`}
            icon={Coins}
            variant={pendingTotal > 50000 ? "warning" : "white"}
            trend={pendingCount > 10 ? { direction: "down", label: `${pendingCount} users waiting` } : { direction: "flat", label: "Queue is manageable" }}
            delay={0.05}
          />
        </div>
      </section>

      {/* Section 5: Analytics Charts */}
      <section className="space-y-3">
        <SectionLabel text="Analytics" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="New Registrations" icon={Users}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.1} />
                <XAxis dataKey="name" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontWeight: 700 }} />
                <YAxis fontSize={9} tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontWeight: 700 }} />
                <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e4e4e7", borderRadius: "12px", fontSize: "11px", fontWeight: "bold" }} />
                <Area type="monotone" dataKey="registrations" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorReg)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Revenue (₨)" icon={DollarSign}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.1} />
                <XAxis dataKey="name" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontWeight: 700 }} />
                <YAxis fontSize={9} tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontWeight: 700 }} />
                <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e4e4e7", borderRadius: "12px", fontSize: "11px", fontWeight: "bold" }} />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {chartData.map((_: any, i: number) => (
                    <Cell key={i} fill={i % 2 === 0 ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.55)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </section>
    </div>
  );
}
