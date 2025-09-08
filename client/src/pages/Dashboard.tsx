import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import TechnicalLabel from "@/components/ui/technical-label";
import Barcode from "@/components/ui/barcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import { 
  LogOut, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar, 
  ChevronRight,
  Eye,
  Target,
  Award,
  ArrowUpRight,
  Zap,
  PlayCircle,
  Copy,
  CheckCircle
} from "lucide-react";
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
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState(false);

  // Fetch user earnings
  const { data: earningsData } = useQuery({
    queryKey: ["earnings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/earnings?limit=5");
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

  const dailyGoal = 50;
  const currentProgress = parseFloat(user.totalEarnings);
  const progressPercentage = Math.min((currentProgress / dailyGoal) * 100, 100);

  const copyReferralCode = async () => {
    try {
      await navigator.clipboard.writeText(user.referralCode);
      setCopiedCode(true);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast({
        title: "Copy Failed",
        description: "Please copy the code manually",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="dashboard-page min-h-screen bg-background">
      {/* Industrial Grid Overlay */}
      <div className="industrial-grid" />

      {/* Simplified Navigation Header */}
      <nav className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur border-b-2 border-black" data-testid="dashboard-navigation">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Title */}
            <div className="flex items-center space-x-4">
              <h1 className="text-xl md:text-2xl font-black tracking-tight">THORX DASHBOARD</h1>
            </div>
            
            {/* User Info & Actions */}
            <div className="flex items-center space-x-4">
              <div className="bg-white border-2 border-black px-3 py-1">
                <TechnicalLabel text={`${user.firstName} ${user.lastName}`} className="text-xs" />
                <div className="flex items-center gap-1 mt-1">
                  <DollarSign className="w-3 h-3" />
                  <span className="font-bold text-sm">{formatCurrency(user.totalEarnings)}</span>
                </div>
              </div>
              <Button
                onClick={logout}
                variant="outline"
                size="sm"
                className="border-2 border-black hover:bg-red-500 hover:text-white"
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
      <main className="pt-20 pb-8">
        <div className="max-w-6xl mx-auto px-4 md:px-6 space-y-8">
          
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <TechnicalLabel text="EARNING CONTROL CENTER" />
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">
              WELCOME BACK
            </h2>
            <Barcode className="w-32 h-8 mx-auto" />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Earnings */}
            <Card className="border-3 border-black bg-gradient-to-br from-black to-gray-800 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <TechnicalLabel text="TOTAL EARNED" className="text-white/80" />
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <div className="text-3xl font-black mb-2">
                  {formatCurrency(user.totalEarnings)}
                </div>
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Keep earning more!</span>
                </div>
              </CardContent>
            </Card>

            {/* Available Balance */}
            <Card className="border-3 border-black bg-gradient-to-br from-primary to-orange-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <TechnicalLabel text="BALANCE" className="text-white/80" />
                  <Target className="w-6 h-6" />
                </div>
                <div className="text-3xl font-black mb-2">
                  {formatCurrency(user.availableBalance)}
                </div>
                <div className="text-sm">
                  <span>Ready for withdrawal</span>
                </div>
              </CardContent>
            </Card>

            {/* Referrals */}
            <Card className="border-3 border-black bg-white text-black">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <TechnicalLabel text="REFERRALS" />
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div className="text-3xl font-black mb-2 text-primary">
                  {referralsData?.stats.count || 0}
                </div>
                <div className="text-sm text-primary">
                  <span>+{formatCurrency(referralsData?.stats.totalEarned || '0.00')} earned</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Progress */}
          <Card className="border-2 border-black">
            <CardHeader className="bg-secondary text-white">
              <CardTitle className="flex items-center justify-between">
                <span>TODAY'S PROGRESS</span>
                <Award className="w-5 h-5" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-bold">Daily Goal</span>
                <span className="text-xl font-black text-primary">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <Progress value={progressPercentage} className="h-4 mb-4" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formatCurrency(currentProgress.toString())} earned</span>
                <span>{formatCurrency(dailyGoal.toString())} goal</span>
              </div>
            </CardContent>
          </Card>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Start Working */}
            <Card className="border-2 border-black hover:shadow-lg transition-all cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-black mb-2">START EARNING</h3>
                    <p className="text-muted-foreground">Watch ads to earn money</p>
                  </div>
                  <PlayCircle className="w-12 h-12 text-primary group-hover:scale-110 transition-transform" />
                </div>
                <Button 
                  onClick={() => setLocation("/work")}
                  className="w-full bg-primary hover:bg-orange-600 text-white font-bold"
                  data-testid="button-work"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  GO TO WORK CENTER
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Referral Code */}
            <Card className="border-2 border-black">
              <CardContent className="p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-black mb-2">INVITE FRIENDS</h3>
                  <p className="text-muted-foreground">Share your referral code</p>
                </div>
                <div className="bg-black text-white p-4 border-2 border-black mb-4">
                  <TechnicalLabel text="YOUR REFERRAL CODE" className="text-white/80 mb-2" />
                  <div className="flex items-center justify-between">
                    <code className="text-xl font-black tracking-wider">{user.referralCode}</code>
                    <Button
                      onClick={copyReferralCode}
                      variant="outline"
                      size="sm"
                      className="border-white text-white hover:bg-white hover:text-black"
                      data-testid="button-copy-code"
                    >
                      {copiedCode ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Earn PKR 12.50 for each friend who joins with your code!
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="border-2 border-black">
            <CardHeader className="bg-black text-white">
              <CardTitle className="flex items-center justify-between">
                <span>RECENT EARNINGS</span>
                <Eye className="w-5 h-5" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {earningsData?.earnings && earningsData.earnings.length > 0 ? (
                <div className="space-y-0">
                  {earningsData.earnings.map((earning, index) => (
                    <div 
                      key={earning.id} 
                      className={`p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${index === 0 ? 'bg-primary/5' : ''}`} 
                      data-testid={`earning-${earning.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">
                            {getEarningTypeIcon(earning.type)}
                          </div>
                          <div>
                            <p className="font-bold">
                              {earning.description}
                            </p>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(earning.createdAt)}</span>
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
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Eye className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No earnings yet</p>
                  <Button
                    onClick={() => setLocation("/work")}
                    className="bg-primary hover:bg-orange-600 text-white"
                  >
                    Start Earning Now
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}