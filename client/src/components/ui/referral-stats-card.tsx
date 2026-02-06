import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, DollarSign, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReferralStatsCardProps {
    stats: {
        totalReferrals: number;
        level1Count: number;
        level2Count: number;
        totalCommissionEarnings: string;
        level1Earnings: string;
        level2Earnings: string;
        pendingCommissions: string;
        paidCommissions: string;
    };
    className?: string;
}

export function ReferralStatsCard({ stats, className }: ReferralStatsCardProps) {
    return (
        <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
            {/* Total Referrals */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.totalReferrals}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                        <span className="text-blue-500 font-semibold">L1: {stats.level1Count}</span>
                        {" • "}
                        <span className="text-purple-500 font-semibold">L2: {stats.level2Count}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Total Commission Earnings */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">PKR {parseFloat(stats.totalCommissionEarnings).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                        <span className="text-blue-500">L1: {parseFloat(stats.level1Earnings).toLocaleString()}</span>
                        {" • "}
                        <span className="text-purple-500">L2: {parseFloat(stats.level2Earnings).toLocaleString()}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Pending Commissions */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-yellow-500">
                        PKR {parseFloat(stats.pendingCommissions).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Awaiting payout approval
                    </p>
                </CardContent>
            </Card>

            {/* Paid Commissions */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Paid</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-500">
                        PKR {parseFloat(stats.paidCommissions).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Successfully credited
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

interface CommissionRatesCardProps {
    className?: string;
}

export function CommissionRatesCard({ className }: CommissionRatesCardProps) {
    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="text-lg">Referral Commission Rates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div>
                        <div className="font-bold text-blue-600 dark:text-blue-400">Level 1 Referrals</div>
                        <div className="text-sm text-muted-foreground">Direct referrals</div>
                    </div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">15%</div>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div>
                        <div className="font-bold text-purple-600 dark:text-purple-400">Level 2 Referrals</div>
                        <div className="text-sm text-muted-foreground">Referrals of your referrals</div>
                    </div>
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">7.5%</div>
                </div>
                <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                    Commissions are credited when your referrals request payouts
                </div>
            </CardContent>
        </Card>
    );
}
