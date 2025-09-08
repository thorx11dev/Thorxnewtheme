import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import TechnicalLabel from "@/components/ui/technical-label";
import Barcode from "@/components/ui/barcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import { 
  LogOut, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar, 
  Clock, 
  ChevronRight,
  Eye,
  Target,
  Award,
  ArrowUpRight,
  BarChart3,
  PieChart,
  Zap,
  Copy,
  CheckCircle2,
  Wallet,
  Activity,
  Star,
  Gift
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useToast } from "@/hooks/use-toast";

interface Earning {
  id: string;
  type: string;
  amount: string;
  description: string;
  status: string;
  createdAt: string;
}

interface ReferralUser {
  id: string;
  referrerId: string;
  referredId: string;
  status: string;
  totalEarned: string;
  createdAt: string;
  referred: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    createdAt: string;
  };
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  // Fetch user earnings
  const { data: earningsData } = useQuery({
    queryKey: ["earnings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/earnings?limit=10");
      return await response.json() as { earnings: Earning[]; total: string };
    },
    enabled: !!user,
  });

  // Fetch user referrals
  const { data: referralsData } = useQuery({
    queryKey: ["referrals"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/referrals");
      return await response.json() as { 
        referrals: ReferralUser[]; 
        stats: { count: number; totalEarned: string } 
      };
    },
    enabled: !!user,
  });

  if (!user) {
    return null; // ProtectedRoute will handle redirect
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: string) => {
    return `PKR ${parseFloat(amount).toFixed(2)}`;
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(user.referralCode);
    toast({
      title: "Copied!",
      description: "Referral code copied to clipboard",
    });
  };

  // Enhanced mock data for charts
  const earningsChartData = [
    { date: 'Mon', earnings: 5.25, ads: 8, tasks: 2 },
    { date: 'Tue', earnings: 3.75, ads: 6, tasks: 1 },
    { date: 'Wed', earnings: 8.50, ads: 12, tasks: 3 },
    { date: 'Thu', earnings: 6.25, ads: 10, tasks: 2 },
    { date: 'Fri', earnings: 12.75, ads: 18, tasks: 4 },
    { date: 'Sat', earnings: 15.50, ads: 22, tasks: 5 },
    { date: 'Sun', earnings: 9.25, ads: 14, tasks: 3 }
  ];

  const earningTypesData = [
    { name: 'Ad Views', value: 65, color: '#ff6b35' },
    { name: 'Referrals', value: 25, color: '#000000' },
    { name: 'Daily Tasks', value: 7, color: '#f7931e' },
    { name: 'Bonuses', value: 3, color: '#004CFF' }
  ];

  const dailyGoal = 50;
  const currentProgress = parseFloat(user.totalEarnings);
  const progressPercentage = Math.min((currentProgress / dailyGoal) * 100, 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Refined Industrial Grid */}
      <div className="fixed inset-0 opacity-[0.02]">
        <div className="absolute inset-0 bg-gradient-to-br from-black/5 via-transparent to-primary/5" />
        <div className="industrial-grid" />
      </div>

      {/* Modern Navigation Header */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-sm" data-testid="dashboard-navigation">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-4">
              <div className="bg-black text-white p-3 rounded-lg">
                <TechnicalLabel text="THORX" className="text-white text-sm font-black" />
              </div>
              <div className="hidden md:flex items-center space-x-2 text-gray-400">
                <ChevronRight className="w-4 h-4" />
                <TechnicalLabel text="DASHBOARD" className="text-gray-600" />
              </div>
            </div>
            
            {/* User Info & Controls */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-4 bg-gray-50 rounded-xl px-4 py-2">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(user.totalEarnings)} earned</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                  {user.firstName[0]}{user.lastName[0]}
                </div>
              </div>
              
              <Button
                onClick={() => setLocation("/work")}
                className="bg-gradient-to-r from-primary to-orange-600 hover:from-orange-600 hover:to-primary text-white border-0 shadow-lg"
                data-testid="button-work"
              >
                <Zap className="w-4 h-4 mr-2" />
                Start Working
              </Button>
              
              <Button
                onClick={logout}
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
            <Star className="w-4 h-4" />
            <TechnicalLabel text="EARNING DASHBOARD" className="text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-4">
            Welcome Back,<br />
            <span className="bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent">
              {user.firstName}
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Track your earnings, manage referrals, and monitor your progress in real-time
          </p>
          <Barcode className="w-40 h-8 mx-auto opacity-60" />
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {/* Total Earnings */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-gray-900 to-black text-white overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-primary/20 rounded-full transform translate-x-8 -translate-y-8" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-green-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-white/80 text-sm">Total Earnings</p>
                  <p className="text-3xl font-black">{formatCurrency(user.totalEarnings)}</p>
                  <p className="text-green-400 text-sm">+15.2% this week</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Balance */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-primary to-orange-600 text-white overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/20 rounded-full transform translate-x-8 -translate-y-8" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <Activity className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-white/80 text-sm">Available Balance</p>
                  <p className="text-3xl font-black">{formatCurrency(user.availableBalance)}</p>
                  <p className="text-white/80 text-sm">Ready for withdrawal</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Referrals */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-white overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full transform translate-x-8 -translate-y-8" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-gray-600 text-sm">Active Referrals</p>
                  <p className="text-3xl font-black text-gray-900">{referralsData?.stats.count || 0}</p>
                  <p className="text-primary text-sm font-semibold">+{formatCurrency(referralsData?.stats.totalEarned || '0.00')} earned</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Daily Progress */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-green-500 to-emerald-600 text-white overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/20 rounded-full transform translate-x-8 -translate-y-8" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black">{Math.round(progressPercentage)}%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-white/80 text-sm">Daily Goal</p>
                  <Progress value={progressPercentage} className="h-2 bg-white/20" />
                  <p className="text-white/80 text-sm">{formatCurrency(currentProgress.toString())} / {formatCurrency(dailyGoal.toString())}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-4 bg-gray-100 rounded-2xl p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="earnings" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl">
              <DollarSign className="w-4 h-4 mr-2" />
              Earnings
            </TabsTrigger>
            <TabsTrigger value="referrals" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl">
              <Users className="w-4 h-4 mr-2" />
              Referrals
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl">
              <PieChart className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Weekly Earnings Chart */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-xl font-bold">Weekly Earnings</span>
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-primary" />
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={earningsChartData}>
                      <defs>
                        <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ff6b35" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ff6b35" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" stroke="#666" />
                      <YAxis stroke="#666" />
                      <Tooltip 
                        formatter={(value) => [`PKR ${value}`, 'Earnings']}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="earnings" 
                        stroke="#ff6b35" 
                        strokeWidth={3}
                        fill="url(#earningsGradient)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Earnings Breakdown */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-xl font-bold">Earnings Breakdown</span>
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <PieChart className="w-5 h-5 text-primary" />
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={earningTypesData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {earningTypesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings" className="space-y-8">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold">Recent Transactions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="space-y-0">
                      {earningsData?.earnings.map((earning, index) => (
                        <div key={earning.id} className={`p-6 border-b border-gray-100 hover:bg-gray-50 transition-colors ${index === 0 ? 'bg-primary/5' : ''}`} data-testid={`earning-${earning.id}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                <Gift className="w-6 h-6 text-primary" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {earning.description}
                                </p>
                                <div className="flex items-center space-x-2 text-sm text-gray-500">
                                  <Calendar className="w-4 h-4" />
                                  <span>{formatDate(earning.createdAt)}</span>
                                  <span>•</span>
                                  <span className="capitalize">{earning.type.replace('_', ' ')}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-primary">
                                +{formatCurrency(earning.amount)}
                              </p>
                              <p className="text-sm text-green-600 capitalize">
                                {earning.status}
                              </p>
                            </div>
                          </div>
                        </div>
                      )) || (
                        <div className="text-center py-12">
                          <Clock className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                          <p className="text-gray-500">No earnings yet. Start watching ads to earn!</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                {/* Quick Actions */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      onClick={() => setLocation("/work")}
                      className="w-full bg-gradient-to-r from-primary to-orange-600 hover:from-orange-600 hover:to-primary text-white border-0"
                      data-testid="button-start-earning"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Start Earning
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full border-2 hover:bg-gray-50"
                      data-testid="button-view-history"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View History
                    </Button>
                  </CardContent>
                </Card>

                {/* Daily Goal Progress */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">Daily Goal</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-black text-primary mb-2">{Math.round(progressPercentage)}%</div>
                      <Progress value={progressPercentage} className="h-3 mb-4" />
                      <p className="text-sm text-gray-600">
                        {formatCurrency(currentProgress.toString())} of {formatCurrency(dailyGoal.toString())} goal
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals" className="space-y-8">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold">Your Referrals</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="space-y-0">
                      {referralsData?.referrals.map((referral, index) => (
                        <div key={referral.id} className="p-6 border-b border-gray-100 hover:bg-gray-50 transition-colors" data-testid={`referral-${referral.id}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-primary to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                                {referral.referred.firstName[0]}{referral.referred.lastName[0]}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {referral.referred.firstName} {referral.referred.lastName}
                                </p>
                                <p className="text-sm text-gray-500">{referral.referred.email}</p>
                                <p className="text-xs text-gray-400">
                                  Joined {formatDate(referral.createdAt)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-primary">
                                +{formatCurrency(referral.totalEarned)}
                              </p>
                              <p className="text-sm text-green-600 capitalize">
                                {referral.status}
                              </p>
                            </div>
                          </div>
                        </div>
                      )) || (
                        <div className="text-center py-12">
                          <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                          <p className="text-gray-500">No referrals yet. Share your code to earn!</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                {/* Referral Code */}
                <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-900 to-black text-white">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-white">Your Referral Code</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-white/10 rounded-lg p-4 text-center">
                      <p className="text-white/80 text-sm mb-2">Share this code:</p>
                      <code className="text-2xl font-black tracking-wider text-primary">{user.referralCode}</code>
                    </div>
                    <Button
                      onClick={copyReferralCode}
                      className="w-full bg-white text-black hover:bg-gray-100"
                      data-testid="button-copy-code"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Code
                    </Button>
                  </CardContent>
                </Card>

                {/* Referral Stats */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">Referral Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-black text-primary">{referralsData?.stats.count || 0}</div>
                        <div className="text-sm text-gray-600">Total Referrals</div>
                      </div>
                      <div>
                        <div className="text-2xl font-black text-green-600">{formatCurrency(referralsData?.stats.totalEarned || '0.00')}</div>
                        <div className="text-sm text-gray-600">Total Earned</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-8">
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Advanced Analytics</h3>
              <p className="text-gray-600">Detailed analytics and reporting coming soon...</p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}