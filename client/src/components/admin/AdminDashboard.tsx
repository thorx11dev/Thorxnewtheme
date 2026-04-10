import React from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  Activity, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  UserCheck,
  LayoutDashboard,
  ArrowUpRight,
  BarChart3,
  Zap
} from "lucide-react";
import TechnicalLabel from "@/components/ui/technical-label";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function AdminDashboard() {
  const [dateRange, setDateRange] = React.useState("7d");

  const { data: metrics, isLoading: metricsLoading } = useQuery<any>({
    queryKey: [`/api/team/metrics?range=${dateRange}`],
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<any>({
    queryKey: [`/api/admin/analytics?range=${dateRange}`],
  });

  const metricCardsData = [
    { 
      id: "revenue",
      title: "Total Revenue", 
      value: `₨${parseFloat(metrics?.totalEarnings || '0').toLocaleString()}`, 
      icon: DollarSign, 
      trend: { direction: 'up' as const, percentage: '+12.5%' }, 
      subtitle: "Platform wide earnings",
      variant: "orange" as const
    },
    { 
      id: "users",
      title: "Active Users", 
      value: metrics?.activeUsers?.toLocaleString() || "0", 
      icon: UserCheck, 
      trend: { direction: 'up' as const, percentage: '+5.2%' }, 
      subtitle: "Users active in last 24h",
      variant: "white" as const
    },
    { 
      id: "health",
      title: "System Health", 
      value: "99.9%", 
      icon: Zap, 
      subtitle: "Network uptime status",
      variant: "black" as const
    },
  ];

  const chartData = analytics?.map((item: any) => {
    const date = new Date(item.date);
    return {
      name: date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        ...(dateRange === '24h' ? { hour: '2-digit' } : {}),
        ...(dateRange === '7d' ? { weekday: 'short' } : {})
      }),
      registrations: item.count,
      revenue: item.amount
    };
  }) || [];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mt-4 mb-4 gap-4">
        <div className="hidden lg:block"></div>
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <ToggleGroup 
            type="single" 
            value={dateRange} 
            onValueChange={(val) => val && setDateRange(val)}
            className="bg-white border-2 border-black rounded-full p-1 shadow-[2px_2px_0_0_#000]"
          >
            {['24h', '7d', '30d', 'all'].map((range) => (
              <ToggleGroupItem 
                key={range}
                value={range} 
                className="rounded-full px-4 h-8 text-[10px] font-black uppercase tracking-widest data-[state=on]:bg-black data-[state=on]:text-primary transition-all"
              >
                {range}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

        </div>
      </div>

      {/* High-Level Metrics - Mirrored from User Portal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-12">
        {/* Total Revenue - Styled like Available Balance */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ scale: 1.02, translateY: -4 }}
          whileTap={{ scale: 0.98 }}
          className="group bg-muted/10 border-3 border-black p-6 text-left transition-all duration-300 cursor-pointer shadow-[6px_6px_0_0_#000] hover:shadow-[8px_8px_0_0_#000] hover:border-primary"
        >
          <div className="flex items-start justify-between mb-3">
            <DollarSign className="w-8 h-8 text-primary group-hover:text-primary/80 transition-colors" />
            <TechnicalLabel text="TOTAL REVENUE" className="text-muted-foreground text-xs" />
          </div>
          <p className="text-2xl md:text-3xl font-black text-primary mb-2 group-hover:text-primary/90 transition-colors">
            {`₨${parseFloat(metrics?.totalEarnings || '0').toLocaleString()}`}
          </p>
        </motion.div>

        {/* Active Users - Styled like Active Referrals */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          whileHover={{ scale: 1.02, translateY: -4 }}
          whileTap={{ scale: 0.98 }}
          className="group bg-muted/10 border-3 border-black p-6 text-left transition-all duration-300 cursor-pointer shadow-[6px_6px_0_0_#000] hover:shadow-[8px_8px_0_0_#000] hover:border-primary"
        >
          <div className="flex items-start justify-between mb-3">
            <UserCheck className="w-8 h-8 text-foreground/80 group-hover:text-foreground transition-colors" />
            <TechnicalLabel text="ACTIVE USERS" className="text-muted-foreground text-xs" />
          </div>
          <p className="text-2xl md:text-3xl font-black text-foreground mb-2 group-hover:text-foreground/90 transition-colors">
            {metrics?.activeUsers?.toLocaleString() || "0"}
          </p>
        </motion.div>

        {/* System Health - Styled like Total Earnings */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          whileHover={{ scale: 1.02, translateY: -4 }}
          whileTap={{ scale: 0.98 }}
          className="group bg-white border-3 border-black p-6 text-left transition-all duration-300 cursor-pointer shadow-[6px_6px_0_0_#000] hover:shadow-[8px_8px_0_0_#000]"
        >
          <div className="flex items-start justify-between mb-3">
            <Zap className="w-8 h-8 text-primary group-hover:text-primary/80 transition-colors" />
            <TechnicalLabel text="SYSTEM HEALTH" className="text-muted-foreground text-xs" />
          </div>
          <p className="text-2xl md:text-3xl font-black text-foreground mb-2 group-hover:text-primary/90 transition-colors">
            99.9%
          </p>
        </motion.div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* User Growth Chart */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.3 }}
           className="group bg-card border-3 border-black transition-all duration-300 shadow-[6px_6px_0_0_#000] hover:shadow-[8px_8px_0_0_#000] overflow-hidden"
        >
          <div className="border-b-3 border-black transition-colors p-3 md:p-6 bg-white">
            <div className="flex items-center justify-between">
              <TechnicalLabel text="GROWTH METRICS" className="text-foreground group-hover:text-primary/90 transition-colors text-xs md:text-sm" />
              <div className="p-1 md:p-2 bg-primary/10 border-2 border-black group-hover:bg-primary/20 transition-all duration-300">
                <Users className="w-3 h-3 md:w-4 md:h-4 text-primary" />
              </div>
            </div>
          </div>
          
          <div className="p-2 md:p-4">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 2" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    fontFamily="var(--font-sans)"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    fontFamily="var(--font-sans)"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '2px solid hsl(var(--primary))',
                      borderRadius: '4px',
                      color: 'hsl(var(--primary))',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      boxShadow: '0 4px 12px hsl(var(--primary)/0.25)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="registrations" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorReg)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Revenue Flow Chart */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.4 }}
           className="group bg-card border-3 border-black transition-all duration-300 shadow-[6px_6px_0_0_#000] hover:shadow-[8px_8px_0_0_#000] overflow-hidden"
        >
          <div className="border-b-3 border-black transition-colors p-3 md:p-6 bg-white">
            <div className="flex items-center justify-between">
              <TechnicalLabel text="REVENUE STREAM" className="text-foreground group-hover:text-primary/90 transition-colors text-xs md:text-sm" />
              <div className="p-1 md:p-2 bg-primary/10 border-2 border-black group-hover:bg-primary/20 transition-all duration-300">
                <DollarSign className="w-3 h-3 md:w-4 md:h-4 text-primary" />
              </div>
            </div>
          </div>
          
          <div className="p-2 md:p-4">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    fontFamily="var(--font-sans)"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    fontFamily="var(--font-sans)"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,107,53,0.05)'}}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '2px solid hsl(var(--primary))',
                      borderRadius: '4px',
                      color: 'hsl(var(--primary))',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      boxShadow: '0 4px 12px hsl(var(--primary)/0.25)'
                    }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={0} animationDuration={2000}>
                    {chartData.map((entry: any, index: any) => (
                      <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? "hsl(var(--primary))" : "hsl(var(--foreground))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
