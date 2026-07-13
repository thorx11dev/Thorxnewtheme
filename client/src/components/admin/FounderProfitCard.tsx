import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Plus, History, AlertTriangle, CheckCircle, DollarSign, X, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import TechnicalLabel from "@/components/ui/technical-label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProfitSummary {
  totalProfitEarned: string;
  thisMonthProfitEarned: string;
  totalWithdrawnToPersonal: string;
  thisMonthWithdrawn: string;
  safeToWithdrawNow: string;
  monthlyBalance: string;
  isOverWithdrawn: boolean;
  overWithdrawnAmount: string;
  currentFeeRate: string;
  lastWithdrawalDate: string | null;
  daysSinceLastWithdrawal: number | null;
}

interface FounderWithdrawal {
  id: string;
  amount: string;
  withdrawalDate: string;
  description: string | null;
  createdAt: string;
}

export function FounderProfitCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showLogModal, setShowLogModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [amount, setAmount] = useState("");
  const [wdDate, setWdDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");

  const { data: summary, isLoading } = useQuery<ProfitSummary>({
    queryKey: ["/api/admin/founder/profit-summary"],
    refetchInterval: 60000,
  });

  const { data: withdrawalsData } = useQuery<{ withdrawals: FounderWithdrawal[]; total: number }>({
    queryKey: ["/api/admin/founder/withdrawals"],
    enabled: showHistory || showLogModal,
  });

  const logMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/founder/withdrawals", {
        amount,
        withdrawalDate: wdDate,
        description: description || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/founder/profit-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/founder/withdrawals"] });
      toast({ title: "Withdrawal Logged", description: "Personal transfer recorded in profit ledger." });
      setShowLogModal(false);
      setAmount("");
      setDescription("");
    },
    onError: () => {
      toast({ title: "Failed to log withdrawal", variant: "destructive" });
    },
  });

  if (user?.role !== "founder") return null;

  const safe = parseFloat(summary?.safeToWithdrawNow ?? "0");
  const isOver = summary?.isOverWithdrawn ?? false;
  const stale = summary?.daysSinceLastWithdrawal !== null && (summary?.daysSinceLastWithdrawal ?? 0) > 14;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "group split-card border-2 p-6 text-left transition-all duration-300 cursor-pointer shadow-[4px_4px_0_0_#000] hover:shadow-[6px_6px_0_0_#000]",
          isOver
            ? "bg-gradient-to-br from-red-50 to-red-100/50 border-red-400 hover:border-red-500"
            : "bg-gradient-to-br from-emerald-50 to-emerald-100/40 border-emerald-400 hover:border-emerald-500"
        )}
        data-testid="card-founder-profit"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className={cn("w-6 h-6", isOver ? "text-red-500" : "text-emerald-600")} />
            {isOver ? (
              <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            )}
          </div>
          <TechnicalLabel text="FOUNDER PROFIT" className="text-muted-foreground text-xs" />
        </div>

        {/* Safe to withdraw */}
        <div className="mb-4">
          <p className={cn(
            "text-2xl md:text-3xl font-black mb-1",
            isOver ? "text-red-600" : "text-emerald-700"
          )}>
            {isLoading ? "..." : isOver
              ? `−₨${parseFloat(summary?.overWithdrawnAmount ?? "0").toLocaleString()}`
              : `₨${safe.toLocaleString()}`
            }
          </p>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {isOver ? "⚠ OVER-WITHDRAWN" : "SAFE TO WITHDRAW"}
          </p>
        </div>

        {/* Two-col metrics */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">This Month Profit</p>
            <p className="font-black text-foreground">₨{parseFloat(summary?.thisMonthProfitEarned ?? "0").toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">This Month Withdrawn</p>
            <p className="font-black text-foreground">₨{parseFloat(summary?.thisMonthWithdrawn ?? "0").toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Monthly Balance</p>
            <p className={cn("font-black", parseFloat(summary?.monthlyBalance ?? "0") >= 0 ? "text-emerald-600" : "text-red-500")}>
              ₨{parseFloat(summary?.monthlyBalance ?? "0").toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Fee Rate</p>
            <p className="font-black text-foreground">{summary?.currentFeeRate ?? "10"}%</p>
          </div>
        </div>

        {/* Stale warning */}
        {stale && (
          <div className="mb-3 px-3 py-1.5 bg-amber-100 border border-amber-300 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-700">
              Last logged {summary?.daysSinceLastWithdrawal}d ago — update recommended
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={(e) => { e.stopPropagation(); setShowLogModal(true); }}
            className="flex-1 flex items-center justify-center gap-1.5 h-9 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-full hover:bg-black/80 transition-colors"
          >
            <Plus className="w-3 h-3" /> Log Withdrawal
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowHistory(true); }}
            className="h-9 px-3 flex items-center gap-1.5 border-2 border-black text-[9px] font-black uppercase tracking-widest rounded-full hover:bg-black/5 transition-colors"
          >
            <History className="w-3 h-3" />
          </button>
        </div>
      </motion.div>

      {/* Log Withdrawal Modal */}
      <Dialog open={showLogModal} onOpenChange={setShowLogModal}>
        <DialogContent className="border border-black/10 bg-white rounded-[2rem] p-0 max-w-md overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.15)] [&>button]:hidden">
          <DialogHeader className="p-8 border-b border-zinc-100">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-black tracking-tighter uppercase">Log Withdrawal</DialogTitle>
              <button onClick={() => setShowLogModal(false)} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-zinc-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
              Total earned: ₨{parseFloat(summary?.totalProfitEarned ?? "0").toLocaleString()} · Already withdrawn: ₨{parseFloat(summary?.totalWithdrawnToPersonal ?? "0").toLocaleString()}
            </p>
          </DialogHeader>

          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black tracking-widest uppercase text-zinc-500">Amount (₨)</Label>
              <Input
                type="number"
                placeholder="0.00"
                className="rounded-2xl border border-zinc-200 focus:border-black focus:ring-0 font-mono text-2xl font-black h-16 px-6"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black tracking-widest uppercase text-zinc-500">Date of Bank Transfer</Label>
              <Input
                type="date"
                className="rounded-2xl border border-zinc-200 focus:border-black focus:ring-0 font-bold h-12 px-4"
                value={wdDate}
                onChange={(e) => setWdDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black tracking-widest uppercase text-zinc-500">Bank Reference / Note (optional)</Label>
              <Input
                placeholder="Transaction ID or note..."
                className="rounded-2xl border border-zinc-200 focus:border-black focus:ring-0 font-bold h-12 px-4"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="p-8 pt-0 flex-col gap-3 sm:flex-col sm:space-x-0">
            <Button
              className="w-full h-14 rounded-2xl bg-black text-white hover:bg-black/80 font-black uppercase tracking-widest text-xs"
              onClick={() => { if (!amount || !wdDate) return; logMutation.mutate(); }}
              disabled={!amount || !wdDate || logMutation.isPending}
            >
              {logMutation.isPending ? "Saving..." : "Confirm Log Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="border border-black/10 bg-white rounded-[2rem] p-0 max-w-lg overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.15)] [&>button]:hidden">
          <DialogHeader className="p-8 border-b border-zinc-100">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-black tracking-tighter uppercase">Personal Withdrawals</DialogTitle>
              <button onClick={() => setShowHistory(false)} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-zinc-100">
                <X className="w-4 h-4" />
              </button>
            </div>
          </DialogHeader>
          <div className="p-8 space-y-3 max-h-[400px] overflow-y-auto">
            {!withdrawalsData?.withdrawals?.length ? (
              <p className="text-center text-sm text-muted-foreground py-8">No personal withdrawals logged yet.</p>
            ) : (
              withdrawalsData.withdrawals.map((w) => (
                <div key={w.id} className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-200 rounded-2xl">
                  <div>
                    <p className="font-black text-sm text-foreground">₨{parseFloat(w.amount).toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                      {new Date(w.withdrawalDate).toLocaleDateString()}
                      {w.description && ` · ${w.description}`}
                    </p>
                  </div>
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                </div>
              ))
            )}
          </div>
          <div className="px-8 pb-8">
            <div className="p-4 bg-black rounded-2xl grid grid-cols-2 gap-4 text-white">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Total Profit Earned</p>
                <p className="font-black text-lg">₨{parseFloat(summary?.totalProfitEarned ?? "0").toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Total Withdrawn</p>
                <p className="font-black text-lg">₨{parseFloat(summary?.totalWithdrawnToPersonal ?? "0").toLocaleString()}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
