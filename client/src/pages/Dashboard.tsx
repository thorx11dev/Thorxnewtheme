import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import TechnicalLabel from "@/components/ui/technical-label";
import Barcode from "@/components/ui/barcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { LogOut, TrendingUp, Users, DollarSign, Calendar, Clock, ChevronRight } from "lucide-react";

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

  return (
    <div className="dashboard-page min-h-screen">
      {/* Industrial Grid Overlay */}
      <div className="industrial-grid" />

      {/* Navigation Header */}
      <nav className="fixed top-0 w-full z-50 bg-background border-b-3 border-black" data-testid="dashboard-navigation">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Left Section */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setLocation("/")}
                className="bg-black text-white px-2 py-1 md:px-4 md:py-2 border-2 border-black hover:bg-primary transition-colors"
                data-testid="button-home"
              >
                <TechnicalLabel text="HOME" className="text-white text-xs md:text-sm" />
              </button>
              <button
                onClick={() => setLocation("/work")}
                className="bg-white text-black px-2 py-1 md:px-4 md:py-2 border-2 border-black hover:bg-primary hover:text-white transition-colors"
                data-testid="button-work"
              >
                <TechnicalLabel text="WORK" className="text-xs md:text-sm" />
              </button>
            </div>
            
            {/* Center Section */}
            <div className="flex items-center">
              <h1 className="text-xl md:text-2xl font-black tracking-tighter">DASHBOARD</h1>
            </div>
            
            {/* Right Section */}
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="bg-white border-2 border-black px-2 py-1 md:px-4 md:py-2">
                <div className="text-xs md:text-sm">
                  <TechnicalLabel text={`${user.firstName} ${user.lastName}`} />
                  <TechnicalLabel text={formatCurrency(user.totalEarnings)} />
                </div>
              </div>
              <Button
                onClick={logout}
                variant="outline"
                size="sm"
                className="border-2 border-black"
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
          {/* Header Section */}
          <div className="text-center mb-8 md:mb-12">
            <div className="mb-2">
              <TechnicalLabel text="USER CONTROL PANEL" />
            </div>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-black mb-4">
              EARNING CENTER
            </h2>
            <Barcode className="w-32 md:w-48 h-8 md:h-10 mx-auto" />
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 md:mb-12">
            {/* Total Earnings */}
            <div className="split-card bg-black text-white p-6 relative">
              <div className="absolute top-4 right-4">
                <DollarSign className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <TechnicalLabel text="TOTAL EARNED" className="text-white/80" />
                <div className="text-3xl font-black">
                  {formatCurrency(user.totalEarnings)}
                </div>
              </div>
            </div>

            {/* Available Balance */}
            <div className="split-card bg-primary text-white p-6 relative">
              <div className="absolute top-4 right-4">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <TechnicalLabel text="AVAILABLE BALANCE" className="text-white/80" />
                <div className="text-3xl font-black">
                  {formatCurrency(user.availableBalance)}
                </div>
              </div>
            </div>

            {/* Referrals */}
            <div className="split-card bg-white text-black border-2 border-black p-6 relative">
              <div className="absolute top-4 right-4">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <TechnicalLabel text="REFERRALS" />
                <div className="text-3xl font-black">
                  {referralsData?.stats.count || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Earnings Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl md:text-3xl font-black">RECENT EARNINGS</h3>
                <TechnicalLabel text={`${earningsData?.earnings.length || 0} TRANSACTIONS`} />
              </div>

              <div className="space-y-4">
                {earningsData?.earnings.map((earning) => (
                  <Card key={earning.id} className="border-2 border-black" data-testid={`earning-${earning.id}`}>
                    <CardContent className="p-4">
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
                    </CardContent>
                  </Card>
                )) || (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No earnings yet. Start watching ads to earn!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Referrals Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl md:text-3xl font-black">YOUR REFERRALS</h3>
                <TechnicalLabel text={`EARNED: ${formatCurrency(referralsData?.stats.totalEarned || '0.00')}`} />
              </div>

              {/* Referral Code Display */}
              <Card className="border-2 border-black bg-secondary" data-testid="referral-code-card">
                <CardHeader>
                  <CardTitle className="text-sm font-bold">YOUR REFERRAL CODE</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-white border-2 border-black p-4 text-center">
                    <code className="text-2xl font-black tracking-wider">{user.referralCode}</code>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Share this code to earn when others join THORX!
                  </p>
                </CardContent>
              </Card>

              {/* Referred Users */}
              <div className="space-y-4">
                {referralsData?.referrals.map((referral) => (
                  <Card key={referral.id} className="border-2 border-black" data-testid={`referral-${referral.id}`}>
                    <CardContent className="p-4">
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
                    </CardContent>
                  </Card>
                )) || (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No referrals yet. Share your code to start earning!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Section */}
          <div className="mt-12 text-center">
            <Button
              onClick={() => setLocation("/work")}
              size="lg"
              className="bg-black text-white text-xl font-black px-8 py-4 hover:bg-primary transition-colors border-2 border-black"
              data-testid="button-start-earning"
            >
              START EARNING NOW <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
            <div className="mt-4">
              <TechnicalLabel text="WATCH ADS • COMPLETE TASKS • REFER FRIENDS" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}