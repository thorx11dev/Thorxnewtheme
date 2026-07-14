import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, CheckCircle2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReferralStatsCardProps {
    stats: {
        totalReferrals: number;
        level1Count: number;
        totalCommissionEarnings: string;
        level1Earnings: string;
        pendingCommissions: string;
        paidCommissions: string;
        // Legacy fields — ignored; kept for backward-compat with any callers
        level2Count?: number;
        level2Earnings?: string;
    };
    className?: string;
}

const toPoints = (pkrStr: string) =>
    `${Math.round(parseFloat(pkrStr || "0") * 100).toLocaleString()} TX-Pts`;

export function ReferralStatsCard({ stats, className }: ReferralStatsCardProps) {
    return (
        <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
            {/* Direct Referrals */}
            <Card className="border-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Direct Referrals</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.level1Count}</div>
                    <div className="text-xs text-muted-foreground mt-1 font-semibold">
                        Level 1 — Direct invites only
                    </div>
                </CardContent>
            </Card>

            {/* Commission Points */}
            <Card className="border-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Commission Points</CardTitle>
                    <Zap className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-primary">{toPoints(stats.totalCommissionEarnings)}</div>
                    <div className="text-xs text-muted-foreground mt-1 font-semibold">
                        From referral conversions
                    </div>
                </CardContent>
            </Card>

            {/* Pending */}
            <Card className="border-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-yellow-500">
                        {toPoints(stats.pendingCommissions)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Awaiting payout approval</p>
                </CardContent>
            </Card>

            {/* Paid */}
            <Card className="border-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Credited</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-500">
                        {toPoints(stats.paidCommissions)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Successfully credited</p>
                </CardContent>
            </Card>
        </div>
    );
}

export function CommissionRatesCard({ className }: { className?: string }) {
    return (
        <Card className={cn("border-2", className)}>
            <CardHeader>
                <CardTitle className="text-lg">Referral Commission Rate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
                    <div>
                        <div className="font-black text-primary text-base">Direct Referral Commission</div>
                        <div className="text-sm text-muted-foreground">
                            When your referral converts TX-Points, you earn a share as TX-Points
                        </div>
                    </div>
                    <div className="text-3xl font-black text-primary">15%</div>
                </div>
                <div className="text-xs text-muted-foreground text-center pt-2 border-t font-medium">
                    Commissions are credited as TX-Points when your direct referrals convert their earnings
                </div>
            </CardContent>
        </Card>
    );
}
