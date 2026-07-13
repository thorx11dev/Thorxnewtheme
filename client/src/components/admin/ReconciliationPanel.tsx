import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import TechnicalLabel from "@/components/ui/technical-label";
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

function Row({ label, value, sub, variant = "neutral" }: { label: string; value: string; sub?: string; variant?: "positive" | "negative" | "warning" | "neutral" }) {
  const colors = {
    positive: "text-emerald-600",
    negative: "text-red-500",
    warning: "text-amber-600",
    neutral: "text-foreground",
  };
  return (
    <div className="flex items-center justify-between py-4 border-b border-zinc-100 last:border-0">
      <div>
        <p className="text-sm font-black uppercase tracking-widest text-foreground">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5 font-bold">{sub}</p>}
      </div>
      <p className={cn("text-lg font-black", colors[variant])}>₨{parseFloat(value ?? "0").toLocaleString()}</p>
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
      toast({ title: "Credit Reclassified", description: "Entry marked as verified bank deposit." });
    },
    onError: () => toast({ title: "Reclassification failed", variant: "destructive" }),
  });

  const exposure = parseFloat(data?.unverifiedCreditExposure ?? "0");
  const liquidity = parseFloat(data?.netPlatformLiquidity ?? "0");

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-700">
      <div>
        <h2 className="text-4xl font-black tracking-tighter uppercase text-[#111] mb-1">Financial Reconciliation</h2>
        <p className="text-sm text-muted-foreground font-bold">Real money backing vs total user balances · Admin-only view</p>
      </div>

      {/* Alert banner */}
      {exposure > 100000 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border-2 border-red-400 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-black text-red-700">High Unverified Credit Exposure</p>
            <p className="text-xs text-red-600 font-bold">₨{exposure.toLocaleString()} in credits are not backed by real bank deposits. Review and reclassify below.</p>
          </div>
        </div>
      )}

      {liquidity < 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border-2 border-red-400 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm font-black text-red-700">Net liquidity is negative — platform cannot cover all pending obligations from real funds alone.</p>
        </div>
      )}

      {/* Reconciliation Table */}
      <div className="bg-white border-2 border-black shadow-[4px_4px_0_0_#000]">
        <div className="p-5 border-b-2 border-black bg-zinc-50">
          <TechnicalLabel text="PLATFORM FINANCIAL RECONCILIATION" />
        </div>
        <div className="px-5">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground font-bold">Loading financial data…</div>
          ) : (
            <>
              <Row label="Total in User Balances" value={data?.totalUserBalances ?? "0"} sub="Sum of all user available balances" variant="neutral" />
              <Row label="Real Earnings Backing" value={data?.realEarningsBacking ?? "0"} sub="Organic + verified deposit earnings" variant="positive" />
              <Row
                label="Unverified Credit Exposure"
                value={data?.unverifiedCreditExposure ?? "0"}
                sub="Balance not backed by real bank money"
                variant={exposure > 0 ? "warning" : "neutral"}
              />
              <Row
                label="Pending Withdrawal Liability"
                value={data?.pendingWithdrawalLiability ?? "0"}
                sub="Immediate payout obligation (pending requests)"
                variant="warning"
              />
              <Row
                label="Net Platform Liquidity"
                value={data?.netPlatformLiquidity ?? "0"}
                sub="Real earnings minus pending obligations"
                variant={liquidity >= 0 ? "positive" : "negative"}
              />
            </>
          )}
        </div>
      </div>

      {/* Admin Credit Drill-Down */}
      <div className="bg-white border-2 border-black shadow-[4px_4px_0_0_#000]">
        <button
          className="w-full flex items-center justify-between p-5 border-b-2 border-black bg-zinc-50 hover:bg-zinc-100 transition-colors"
          onClick={() => setShowDrilldown(!showDrilldown)}
        >
          <TechnicalLabel text={`UNVERIFIED ADMIN CREDITS (${data?.adminCreditDetails?.length ?? 0})`} />
          {showDrilldown ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {showDrilldown && (
          <div className="divide-y divide-zinc-100">
            {!data?.adminCreditDetails?.length ? (
              <div className="p-8 text-center">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-muted-foreground">No unverified credits — all credits are real or verified.</p>
              </div>
            ) : (
              data.adminCreditDetails.map((credit) => (
                <div key={credit.id} className="flex items-center justify-between p-5 hover:bg-zinc-50 transition-colors">
                  <div className="flex items-start gap-4">
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
                    <span className="font-black text-amber-600">₨{parseFloat(credit.amount).toLocaleString()}</span>
                    {user?.role === "founder" && (
                      <button
                        onClick={() => reclassifyMutation.mutate(credit.id)}
                        disabled={reclassifyMutation.isPending}
                        className="flex items-center gap-1.5 px-3 h-8 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        <Shield className="w-3 h-3" />
                        Mark Verified
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
