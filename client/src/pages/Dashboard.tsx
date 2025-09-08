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
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  Target,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Settings,
  Zap,
  TrendingDown
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

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
  const [showEarningsDetails, setShowEarningsDetails] = useState(false);
  const [showReferralDetails, setShowReferralDetails] = useState(false);

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

  const getEarningTypeIcon = (type: string) => {
    switch (type) {
      case 'ad_view':
        return '📺';
      case 'referral':
        return '👥';
      case 'daily_task':
        return '✅';
      case 'bonus':
        return '🎁';
      default:
        return '💰';
    }
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

  const referralProgressData = [
    { month: 'Jan', referrals: 2, earnings: 25 },
    { month: 'Feb', referrals: 5, earnings: 62.5 },
    { month: 'Mar', referrals: 8, earnings: 100 },
    { month: 'Apr', referrals: 12, earnings: 150 },
    { month: 'May', referrals: 15, earnings: 187.5 },
    { month: 'Jun', referrals: 18, earnings: 225 }
  ];

  const earningTypesData = [
    { name: 'Ad Views', value: 65, color: '#000000' },
    { name: 'Referrals', value: 25, color: '#ff6b35' },
    { name: 'Daily Tasks', value: 7, color: '#f7931e' },
    { name: 'Bonuses', value: 3, color: '#004CFF' }
  ];

  const dailyGoal = 50;
  const currentProgress = parseFloat(user.totalEarnings);
  const progressPercentage = Math.min((currentProgress / dailyGoal) * 100, 100);

  return (
    <div className="dashboard-page min-h-screen">
      {/* Industrial Grid Overlay */}
      <div className="industrial-grid" />

      {/* Enhanced Navigation Header */}
      <nav className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur border-b-3 border-black" data-testid="dashboard-navigation">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Left Section with Navigation */}
            <div className="flex items-center space-x-2 md:space-x-4">
              <button
                onClick={() => setLocation("/")}
                className="bg-black text-white px-2 py-1 md:px-4 md:py-2 border-2 border-black hover:bg-primary transition-all duration-200 transform hover:scale-105"
                data-testid="button-home"
              >
                <TechnicalLabel text="HOME" className="text-white text-xs md:text-sm" />
              </button>
              <ChevronRight className="w-4 h-4 text-black" />
              <button
                onClick={() => setLocation("/work")}
                className="bg-primary text-white px-2 py-1 md:px-4 md:py-2 border-2 border-black hover:bg-orange-600 transition-all duration-200 transform hover:scale-105"
                data-testid="button-work"
              >
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3 md:w-4 md:h-4" />
                  <TechnicalLabel text="WORK" className="text-white text-xs md:text-sm" />
                </div>
              </button>
            </div>
            
            {/* Center Section */}
            <div className="flex items-center">
              <h1 className="text-xl md:text-2xl font-black tracking-tighter">DASHBOARD</h1>
            </div>
            
            {/* Right Section with User Info */}
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="bg-white border-2 border-black px-2 py-1 md:px-4 md:py-2">
                <div className="text-xs md:text-sm">
                  <TechnicalLabel text={`${user.firstName} ${user.lastName}`} />
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    <TechnicalLabel text={formatCurrency(user.totalEarnings)} />
                  </div>
                </div>
              </div>
              <Button
                onClick={logout}
                variant="outline"
                size="sm"
                className="border-2 border-black hover:bg-red-500 hover:text-white transition-colors"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline ml-2">LOGOUT</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-20 md:pt-24 pb-8">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* Enhanced Header Section */}
          <div className="text-center mb-8 md:mb-12">
            <div className="mb-2">
              <TechnicalLabel text="USER CONTROL PANEL" />
            </div>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-black mb-4">
              EARNING CENTER
            </h2>
            <Barcode className="w-32 md:w-48 h-8 md:h-10 mx-auto mb-6" />
            
            {/* Enhanced Quick Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-black text-white p-3 border-2 border-black relative overflow-hidden group hover:bg-gray-800 transition-colors">
                <div className="absolute top-0 right-0 w-8 h-8 bg-primary/20 rounded-full transform translate-x-2 -translate-y-2" />
                <div className="text-sm font-bold">TODAY'S GOAL</div>
                <div className="text-lg font-black">{Math.round(progressPercentage)}%</div>
                <Progress value={progressPercentage} className="h-1 mt-2" />
              </div>
              <div className="bg-primary text-white p-3 border-2 border-black relative overflow-hidden group hover:bg-orange-600 transition-colors">
                <div className="absolute top-0 right-0 w-8 h-8 bg-white/20 rounded-full transform translate-x-2 -translate-y-2" />
                <div className="text-sm font-bold">STREAK</div>
                <div className="text-lg font-black flex items-center gap-1">
                  <Award className="w-4 h-4" />
                  7 DAYS
                </div>
              </div>
              <div className="bg-white text-black p-3 border-2 border-black relative overflow-hidden group hover:bg-gray-50 transition-colors">
                <div className="absolute top-0 right-0 w-8 h-8 bg-primary/20 rounded-full transform translate-x-2 -translate-y-2" />
                <div className="text-sm font-bold">RANK</div>
                <div className="text-lg font-black flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  #142
                </div>
              </div>
              <div className="bg-secondary text-black p-3 border-2 border-black relative overflow-hidden group hover:bg-gray-200 transition-colors">
                <div className="absolute top-0 right-0 w-8 h-8 bg-primary/20 rounded-full transform translate-x-2 -translate-y-2" />
                <div className="text-sm font-bold">LEVEL</div>
                <div className="text-lg font-black">BRONZE</div>
              </div>
            </div>
          </div>

          {/* Enhanced Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 md:mb-12">
            {/* Total Earnings - Enhanced */}
            <Card className="split-card bg-gradient-to-br from-black to-gray-800 text-white border-3 border-black relative overflow-hidden group hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="absolute top-4 right-4">
                  <DollarSign className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
                </div>
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-primary/20 rounded-full" />
                <div className="space-y-2">
                  <TechnicalLabel text="TOTAL EARNED" className="text-white/80" />
                  <div className="text-4xl font-black mb-2">
                    {formatCurrency(user.totalEarnings)}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <ArrowUpRight className="w-4 h-4 text-green-400" />
                    <span className="text-green-400">+15.2% this week</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Available Balance - Enhanced */}
            <Card className="split-card bg-gradient-to-br from-primary to-orange-600 text-white border-3 border-black relative overflow-hidden group hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="absolute top-4 right-4">
                  <TrendingUp className="w-8 h-8 text-white/80 group-hover:scale-110 transition-transform" />
                </div>
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/20 rounded-full" />
                <div className="space-y-2">
                  <TechnicalLabel text="AVAILABLE BALANCE" className="text-white/80" />
                  <div className="text-4xl font-black mb-2">
                    {formatCurrency(user.availableBalance)}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="w-4 h-4" />
                    <span>Ready for withdrawal</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Referrals - Enhanced */}
            <Card className="split-card bg-white text-black border-3 border-black relative overflow-hidden group hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="absolute top-4 right-4">
                  <Users className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
                </div>
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-primary/20 rounded-full" />
                <div className="space-y-2">
                  <TechnicalLabel text="ACTIVE REFERRALS" />
                  <div className="text-4xl font-black mb-2">
                    {referralsData?.stats.count || 0}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Award className="w-4 h-4 text-primary" />
                    <span className="text-primary">+{formatCurrency(referralsData?.stats.totalEarned || '0.00')} earned</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Advanced Tabbed Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-white border-2 border-black">
              <TabsTrigger value="overview" className="data-[state=active]:bg-black data-[state=active]:text-white font-bold">
                <BarChart3 className="w-4 h-4 mr-2" />
                OVERVIEW
              </TabsTrigger>
              <TabsTrigger value="earnings" className="data-[state=active]:bg-black data-[state=active]:text-white font-bold">
                <DollarSign className="w-4 h-4 mr-2" />
                EARNINGS
              </TabsTrigger>
              <TabsTrigger value="referrals" className="data-[state=active]:bg-black data-[state=active]:text-white font-bold">
                <Users className="w-4 h-4 mr-2" />
                REFERRALS
              </TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-black data-[state=active]:text-white font-bold">
                <PieChart className="w-4 h-4 mr-2" />
                ANALYTICS
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Weekly Earnings Chart */}
                <Card className="border-2 border-black">
                  <CardHeader className="bg-black text-white">
                    <CardTitle className="flex items-center justify-between">
                      <span>WEEKLY EARNINGS</span>
                      <BarChart3 className="w-5 h-5" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={earningsChartData}>
                        <defs>
                          <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ff6b35" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#ff6b35" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`PKR ${value}`, 'Earnings']} />
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

                {/* Earnings Breakdown Pie Chart */}
                <Card className="border-2 border-black">
                  <CardHeader className="bg-primary text-white">
                    <CardTitle className="flex items-center justify-between">
                      <span>EARNINGS BREAKDOWN</span>
                      <PieChart className="w-5 h-5" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <Pie
                          data={earningTypesData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {earningTypesData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Earnings Tab */}
            <TabsContent value="earnings" className="space-y-6">
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card className="border-2 border-black">
                    <CardHeader className="bg-black text-white">
                      <CardTitle className="flex items-center justify-between">
                        <span>RECENT TRANSACTIONS</span>
                        <button 
                          onClick={() => setShowEarningsDetails(!showEarningsDetails)}
                          className="flex items-center gap-1 hover:text-primary transition-colors"
                        >
                          {showEarningsDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          {showEarningsDetails ? 'HIDE' : 'SHOW'} DETAILS
                        </button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="space-y-0">
                        {earningsData?.earnings.map((earning, index) => (
                          <div key={earning.id} className={`p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${index === 0 ? 'bg-primary/5' : ''}`} data-testid={`earning-${earning.id}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="text-2xl">
                                  {getEarningTypeIcon(earning.type)}
                                </div>
                                <div>
                                  <p className="font-bold text-sm">
                                    {earning.description}
                                  </p>
                                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                    <Calendar className="w-3 h-3" />
                                    <span>{formatDate(earning.createdAt)}</span>
                                    <span className="text-primary">•</span>
                                    <span className="uppercase">{earning.type.replace('_', ' ')}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-black text-primary">
                                  +{formatCurrency(earning.amount)}
                                </p>
                                <p className="text-xs uppercase text-green-600">
                                  {earning.status}
                                </p>
                              </div>
                            </div>
                            {showEarningsDetails && (
                              <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-muted-foreground">
                                <div className="grid grid-cols-2 gap-4">
                                  <span>Transaction ID: {earning.id.slice(0, 8)}...</span>
                                  <span>Type: {earning.type.toUpperCase()}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )) || (
                          <div className="text-center py-8">
                            <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No earnings yet. Start watching ads to earn!</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  {/* Daily Goal Progress */}
                  <Card className="border-2 border-black">
                    <CardHeader className="bg-secondary">
                      <CardTitle className="text-sm">DAILY GOAL PROGRESS</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span className="font-bold">{formatCurrency(currentProgress.toString())} / {formatCurrency(dailyGoal.toString())}</span>
                        </div>
                        <Progress value={progressPercentage} className="h-3" />
                        <div className="text-center">
                          <span className="text-2xl font-black text-primary">{Math.round(progressPercentage)}%</span>
                          <p className="text-xs text-muted-foreground">of daily goal</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card className="border-2 border-black">
                    <CardHeader className="bg-primary text-white">
                      <CardTitle className="text-sm">QUICK ACTIONS</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <Button
                        onClick={() => setLocation("/work")}
                        className="w-full bg-black text-white hover:bg-gray-800"
                        data-testid="button-start-earning"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        START EARNING
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-2 border-black"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        VIEW ALL EARNINGS
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Referrals Tab */}
            <TabsContent value="referrals" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Referral Code & Management */}
                <div className="space-y-6">
                  <Card className="border-2 border-black bg-secondary" data-testid="referral-code-card">
                    <CardHeader className="bg-black text-white">
                      <CardTitle className="flex items-center justify-between">
                        <span>YOUR REFERRAL CODE</span>
                        <Users className="w-5 h-5" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="bg-white border-2 border-black p-4 text-center mb-4">
                        <code className="text-2xl font-black tracking-wider">{user.referralCode}</code>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" className="border-2 border-black text-xs">
                          COPY CODE
                        </Button>
                        <Button variant="outline" className="border-2 border-black text-xs">
                          SHARE LINK
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3 text-center">
                        Share this code to earn when others join THORX!
                      </p>
                    </CardContent>
                  </Card>

                  {/* Referral Progress Chart */}
                  <Card className="border-2 border-black">
                    <CardHeader className="bg-primary text-white">
                      <CardTitle>REFERRAL GROWTH</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={referralProgressData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Line 
                            type="monotone" 
                            dataKey="referrals" 
                            stroke="#ff6b35" 
                            strokeWidth={3}
                            dot={{ fill: '#ff6b35', strokeWidth: 2, r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Referred Users List */}
                <Card className="border-2 border-black">
                  <CardHeader className="bg-black text-white">
                    <CardTitle className="flex items-center justify-between">
                      <span>YOUR REFERRALS</span>
                      <button 
                        onClick={() => setShowReferralDetails(!showReferralDetails)}
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        {showReferralDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {showReferralDetails ? 'HIDE' : 'SHOW'} DETAILS
                      </button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="space-y-0">
                      {referralsData?.referrals.map((referral, index) => (
                        <div key={referral.id} className={`p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${index === 0 ? 'bg-primary/5' : ''}`} data-testid={`referral-${referral.id}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-black">
                                {referral.referred.firstName.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-sm">
                                  {referral.referred.firstName} {referral.referred.lastName}
                                </p>
                                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                  <Calendar className="w-3 h-3" />
                                  <span>Joined {formatDate(referral.referred.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-primary">
                                {formatCurrency(referral.totalEarned)}
                              </p>
                              <p className="text-xs uppercase text-green-600">
                                {referral.status}
                              </p>
                            </div>
                          </div>
                          {showReferralDetails && (
                            <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-muted-foreground">
                              <div className="grid grid-cols-2 gap-4">
                                <span>Email: {referral.referred.email}</span>
                                <span>Status: {referral.status.toUpperCase()}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )) || (
                        <div className="text-center py-8">
                          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">No referrals yet. Share your code to start earning!</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Performance Metrics */}
                <Card className="border-2 border-black">
                  <CardHeader className="bg-black text-white">
                    <CardTitle>PERFORMANCE METRICS</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-green-50 border border-green-200 rounded">
                        <ArrowUpRight className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <div className="text-2xl font-black text-green-600">+15.2%</div>
                        <div className="text-sm text-green-700">Weekly Growth</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded">
                        <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <div className="text-2xl font-black text-blue-600">85%</div>
                        <div className="text-sm text-blue-700">Goal Achievement</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 border border-purple-200 rounded">
                        <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                        <div className="text-2xl font-black text-purple-600">{referralsData?.stats.count || 0}</div>
                        <div className="text-sm text-purple-700">Active Referrals</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 border border-orange-200 rounded">
                        <Award className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                        <div className="text-2xl font-black text-orange-600">7</div>
                        <div className="text-sm text-orange-700">Day Streak</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Activity Breakdown */}
                <Card className="border-2 border-black">
                  <CardHeader className="bg-primary text-white">
                    <CardTitle>ACTIVITY BREAKDOWN</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={earningsChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="ads" fill="#000000" name="Ads Watched" />
                        <Bar dataKey="tasks" fill="#ff6b35" name="Tasks Completed" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Enhanced Action Section */}
          <div className="mt-12 text-center">
            <div className="mb-6">
              <h3 className="text-2xl md:text-3xl font-black mb-2">READY TO EARN MORE?</h3>
              <TechnicalLabel text="WATCH ADS • COMPLETE TASKS • REFER FRIENDS" />
            </div>
            <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
              <Button
                onClick={() => setLocation("/work")}
                size="lg"
                className="bg-black text-white text-xl font-black px-8 py-4 hover:bg-primary transition-all transform hover:scale-105 border-2 border-black"
                data-testid="button-start-earning-main"
              >
                <Zap className="w-5 h-5 mr-2" />
                START EARNING NOW <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-black border-2 border-black hover:bg-secondary transition-all"
              >
                <Settings className="w-5 h-5 mr-2" />
                SETTINGS
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}