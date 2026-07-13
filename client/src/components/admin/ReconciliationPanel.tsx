import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle, ChevronDown, ChevronRight, User, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ReconciliationData {
  totalUserBalances: string;
  realEarningsBacking: string;
  unverifiedCreditExposure: string;
  pendingWithdrawalLiability: string;
  netPlatformLiquidity: string;
  adminCreditDetails: Array<{
    id: string;
    userId: string;
    userName: string;
    adminName: string;
    amount: string;
    description: string;
    createdAt: string;
  }>;
}

function Row({ label, value, sub, variant = "neutral" }: {
  label: string;
  value: string;
  sub?: string;
  variant?: "positive" | "negative" | "warning" | "neutral";
}) {
  const colors = {
    positive: "text-emerald-600",
    negative: "text-red-500",
    warning: "text-amber-600",
    neutral: "text-foreground",
  };
  return (
    <div className="flex items-center justify-between py-4 border-b border-zinc-100 last:border-0">
      <div>
        <p className="text-sm font-bold text-foreground">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <p className={cn("text-base font-black", colors[variant])}>₨{parseFloat(value ?? "0").toLocaleString()}</p>
    </div>
  );
}

export function ReconciliationPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDrilldown, setShowDrilldown] = useState(false);

  const { data, isLoading } = useQuery<ReconciliationData>({
    queryKey: ["/api/admin/reconciliation"],
    refetchInterval: 2 * 60 * 1000,
  });

  const reclassifyMutation = useMutation({
    mutationFn: async (earningId: string) => {
      const res = await apiRequest("POST", `/api/admin/earnings/${earningId}/reclassify`, { type: "verified_deposit" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reconciliation"] });
      toast({ title: "Marked as Verified", description: "Entry reclassified as real bank deposit." });
    },
    onError: () => toast({ title: "Action failed", variant: "destructive" }),
  });

  const exposure = parseFloat(data?.unverifiedCreditExposure ?? "0");
  const liquidity = parseFloat(data?.netPlatformLiquidity ?? "0");

  return (
    <div className="space-y-7 animate-in slide-in-from-bottom-2 duration-700">
      <div>
        <h2 className="text-3xl font-black tracking-tighter text-foreground mb-1">Money Overview</h2>
        <p className="text-sm text-muted-foreground">How much real money backs your user balances</p>
      </div>

      {/* Alert banners */}
      {exposure > 100000 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-red-700">High unverified credit exposure</p>
            <p className="text-xs text-red-600 mt-0.5">₨{exposure.toLocaleString()} in manual credits are not backed by real deposits. Review and verify below.</p>
          </div>
        </div>
      )}

      {liquidity < 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm font-black text-red-700">Net liquidity is negative — the platform cannot cover all pending payouts from verified funds alone.</p>
        </div>
      )}

      {/* Reconciliation Table */}
      <div className="bg-white border-[1.5px] border-zinc-200 rounded-[2rem] overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50 rounded-t-[2rem]">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Money Breakdown</p>
        </div>
        <div className="px-6">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground font-bold text-sm">Loading financial data…</div>
          ) : (
            <>
              <Row label="Total in User Balances" value={data?.totalUserBalances ?? "0"} sub="Sum of all user available balances" variant="neutral" />
              <Row label="Real Earnings" value={data?.realEarningsBacking ?? "0"} sub="Organic tasks + verified bank deposits" variant="positive" />
              <Row
                label="Manual Credits (Unverified)"
                value={data?.unverifiedCreditExposure ?? "0"}
                sub="Admin-granted credits not backed by real deposits"
                variant={exposure > 0 ? "warning" : "neutral"}
              />
              <Row
                label="Pending Payout Obligations"
                value={data?.pendingWithdrawalLiability ?? "0"}
                sub="Pending withdrawal requests to be paid"
                variant="warning"
              />
              <Row
                label="Net Liquidity"
                value={data?.netPlatformLiquidity ?? "0"}
                sub="Real earnings minus pending obligations"
                variant={liquidity >= 0 ? "positive" : "negative"}
              />
            </>
          )}
        </div>
      </div>

      {/* Manual Credits Drill-Down */}
      <div className="bg-white border-[1.5px] border-zinc-200 rounded-[2rem] overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50 hover:bg-zinc-100 transition-colors rounded-t-[2rem]"
          onClick={() => setShowDrilldown(!showDrilldown)}
        >
          <div className="flex items-center gap-2">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Manual Credits</p>
            <span className="text-[10px] font-black bg-zinc-200 text-zinc-600 px-2 py-0.5 rounded-full">
              {data?.adminCreditDetails?.length ?? 0}
            </span>
          </div>
          {showDrilldown ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showDrilldown && (
          <div className="divide-y divide-zinc-100">
            {!data?.adminCreditDetails?.length ? (
              <div className="p-8 text-center">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-muted-foreground">No unverified credits — all balances are real or verified.</p>
              </div>
            ) : (
              data.adminCreditDetails.map((credit) => (
                <div key={credit.id} className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-zinc-100 border border-zinc-200 rounded-full flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-foreground">{credit.userName}</p>
                      <p className="text-[10px] text-muted-foreground font-bold mt-0.5">
                        By {credit.adminName} · {new Date(credit.createdAt).toLocaleDateString()}
                      </p>
                      {credit.description && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 italic">"{credit.description}"</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-amber-600 text-sm">₨{parseFloat(credit.amount).toLocaleString()}</span>
                    {user?.role === "founder" && (
                      <button
                        onClick={() => reclassifyMutation.mutate(credit.id)}
                        disabled={reclassifyMutation.isPending}
                        className="flex items-center gap-1.5 px-3 h-8 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        <Shield className="w-3 h-3" />
                        Verify
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
