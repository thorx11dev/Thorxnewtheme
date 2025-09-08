import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import TechnicalLabel from '@/components/ui/technical-label';
import Barcode from '@/components/ui/barcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  Users, 
  Eye, 
  Gift, 
  TrendingUp,
  Copy,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState(false);

  const { data: earnings } = useQuery({
    queryKey: ['/api/earnings'],
    retry: false,
  });

  const { data: referrals } = useQuery({
    queryKey: ['/api/referrals'],
    retry: false,
  });

  const handleCopyReferralCode = async () => {
    if (user?.referralCode) {
      await navigator.clipboard.writeText(user.referralCode);
      setCopiedCode(true);
      toast({
        title: "Referral Code Copied!",
        description: "Share this code to earn referral bonuses",
      });
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/api/logout';
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Industrial Grid Overlay */}
      <div className="industrial-grid" />

      {/* Header */}
      <header className="border-b-3 border-black bg-background relative z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center">
              <div className="bg-black text-white px-2 py-1 md:px-4 md:py-2 border-2 border-black">
                <TechnicalLabel text="THORX DASHBOARD V1.0" className="text-white text-xs md:text-sm" />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <UserIcon className="w-5 h-5" />
                <span className="font-semibold">{user.firstName} {user.lastName}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-2 border-black"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 relative z-10">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <div className="mb-2">
            <TechnicalLabel text="EARNINGS DASHBOARD" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-black mb-4">
            Welcome back, {user.firstName}!
          </h1>
          <Barcode className="w-32 md:w-48 h-8 md:h-10 mx-auto" />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="split-card bg-black text-white">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4" />
                Total Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-primary">
                ₨{user.totalEarnings || '0.00'}
              </div>
            </CardContent>
          </Card>

          <Card className="split-card bg-primary text-white">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4" />
                Available Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">
                ₨{user.availableBalance || '0.00'}
              </div>
            </CardContent>
          </Card>

          <Card className="split-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4" />
                Referrals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-black">
                {referrals?.stats?.count || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="split-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge 
                variant={user.isActive ? "default" : "secondary"}
                className="bg-green-600 text-white"
              >
                {user.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Referral Code Section */}
        <Card className="split-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              Your Referral Code
            </CardTitle>
            <CardDescription>
              Share this code with friends to earn referral bonuses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="bg-black text-white px-4 py-2 font-mono text-lg font-bold tracking-wider">
                {user.referralCode || 'THORX-XXXX'}
              </div>
              <Button
                onClick={handleCopyReferralCode}
                variant="outline"
                size="sm"
                className="border-2 border-black"
                data-testid="button-copy-referral"
              >
                <Copy className="w-4 h-4 mr-2" />
                {copiedCode ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white border-2 border-black">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="earnings" data-testid="tab-earnings">Earnings</TabsTrigger>
            <TabsTrigger value="referrals" data-testid="tab-referrals">Referrals</TabsTrigger>
            <TabsTrigger value="tasks" data-testid="tab-tasks">Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6">
              <Card className="split-card">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Start earning with these activities</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button className="h-24 flex-col gap-2 bg-black text-white hover:bg-gray-800" data-testid="button-watch-ads">
                    <Eye className="w-6 h-6" />
                    Watch Ads
                  </Button>
                  <Button className="h-24 flex-col gap-2 bg-primary text-white hover:bg-orange-600" data-testid="button-refer-friends">
                    <Users className="w-6 h-6" />
                    Refer Friends
                  </Button>
                  <Button className="h-24 flex-col gap-2" variant="outline" data-testid="button-daily-tasks">
                    <Gift className="w-6 h-6" />
                    Daily Tasks
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="earnings">
            <Card className="split-card">
              <CardHeader>
                <CardTitle>Earnings History</CardTitle>
                <CardDescription>Your recent earning activities</CardDescription>
              </CardHeader>
              <CardContent>
                {earnings?.earnings && earnings.earnings.length > 0 ? (
                  <div className="space-y-4">
                    {earnings.earnings.map((earning: any) => (
                      <div key={earning.id} className="flex items-center justify-between p-4 border border-gray-200 rounded">
                        <div>
                          <p className="font-semibold">{earning.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(earning.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">+₨{earning.amount}</p>
                          <Badge variant="secondary">{earning.type}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No earnings yet. Start by watching ads or referring friends!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referrals">
            <Card className="split-card">
              <CardHeader>
                <CardTitle>Your Referrals</CardTitle>
                <CardDescription>People you've invited to THORX</CardDescription>
              </CardHeader>
              <CardContent>
                {referrals?.referrals && referrals.referrals.length > 0 ? (
                  <div className="space-y-4">
                    {referrals.referrals.map((referral: any) => (
                      <div key={referral.id} className="flex items-center justify-between p-4 border border-gray-200 rounded">
                        <div>
                          <p className="font-semibold">
                            {referral.referred.firstName} {referral.referred.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Joined {new Date(referral.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">₨{referral.totalEarned}</p>
                          <Badge variant={referral.status === 'active' ? 'default' : 'secondary'}>
                            {referral.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No referrals yet. Share your referral code to start earning!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks">
            <Card className="split-card">
              <CardHeader>
                <CardTitle>Daily Tasks</CardTitle>
                <CardDescription>Complete these tasks to earn extra rewards</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <Eye className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold">Watch 5 Ads</p>
                        <p className="text-sm text-muted-foreground">Earn ₨15 for watching ads</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Progress value={0} className="w-20 mb-2" />
                      <p className="text-sm text-muted-foreground">0/5</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold">Daily Login</p>
                        <p className="text-sm text-muted-foreground">Login daily to earn bonus</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-green-600 text-white">Completed</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}