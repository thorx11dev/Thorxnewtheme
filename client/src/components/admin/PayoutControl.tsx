import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  ExternalLink, 
  MoreVertical,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Ban,
  AlertCircle,
  Copy,
  Check,
  Smartphone,
  Info,
  Inbox,
  X,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import TechnicalLabel from "@/components/ui/technical-label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

import { useDebounce } from "@/hooks/use-debounce";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Withdrawal {
  id: string;
  userId: string;
  amount: string;
  method: string;
  accountName: string;
  accountNumber: string;
  status: 'pending' | 'completed' | 'rejected' | 'processing';
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    rank: string;
  };
}

export function PayoutControl() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortType, setSortType] = useState<'latest' | 'rank' | 'deadtime'>('latest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'view' | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ withdrawals: Withdrawal[], totalCount: number }>({
    queryKey: ['/api/admin/withdrawals', { page: currentPage, status: filterStatus, search: debouncedSearch }],
    queryFn: async ({ queryKey }) => {
      const [_url, params] = queryKey as [string, any];
      const statusParam = params.status !== 'all' ? `&status=${params.status}` : '';
      const searchParam = params.search ? `&search=${encodeURIComponent(params.search)}` : '';
      const response = await apiRequest("GET", `/api/admin/withdrawals?page=${params.page}&limit=${itemsPerPage}${statusParam}${searchParam}`);
      return await response.json();
    },
    refetchInterval: 5000, 
  });

  const rawWithdrawals = data?.withdrawals || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const rankPriority: Record<string, number> = {
    "FOUNDER": 1,
    "ADMIN": 2,
    "GENERAL": 3,
    "CAPTAIN": 4,
    "SOLDIER": 5,
    "WORKER": 6,
    "USELESS": 7
  };

  const getDeadtimeLeft = (createdAt: string) => {
    const deadline = new Date(createdAt).getTime() + 48 * 60 * 60 * 1000;
    return deadline - Date.now();
  };

  const formattedTimeLeft = (ms: number) => {
    if (ms <= 0) return "EXPIRED";
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  };

  const withdrawalsList = [...rawWithdrawals].sort((a, b) => {
    if (sortType === 'rank') {
      const pA = rankPriority[a.user.rank?.toUpperCase() || "USELESS"] || 8;
      const pB = rankPriority[b.user.rank?.toUpperCase() || "USELESS"] || 8;
      if (pA !== pB) return pA - pB;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortType === 'deadtime') {
      return getDeadtimeLeft(a.createdAt) - getDeadtimeLeft(b.createdAt);
    }
    // Default: latest
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, transactionId, rejectionReason }: { id: string; status: string; transactionId?: string; rejectionReason?: string }) => {
      return await apiRequest("PATCH", `/api/admin/withdrawals/${id}`, { status, transactionId, rejectionReason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/withdrawals'] });
      toast({ title: "Operation Successful", description: "Withdrawal queue synchronized with ledger." });
      closeModal();
    },
    onError: (error: Error) => {
      toast({ title: "System Error", description: error.message, variant: "destructive" });
    }
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      return await apiRequest("POST", "/api/admin/withdrawals/bulk", { ids, status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/withdrawals'] });
      toast({ title: "Atomic Batch Complete", description: `Successfully processed ${selectedIds.length} withdrawals.` });
      setSelectedIds([]);
    },
    onError: (error: Error) => {
      toast({ title: "Bulk Conflict", description: error.message, variant: "destructive" });
    }
  });

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeModal = () => {
    setSelectedWithdrawal(null);
    setActionType(null);
    setTransactionId("");
    setRejectionReason("");
  };

  const handleExport = () => {
    const statusParam = filterStatus !== 'all' ? `status=${filterStatus}` : '';
    const searchParam = debouncedSearch ? `search=${encodeURIComponent(debouncedSearch)}` : '';
    const idsParam = selectedIds.length > 0 ? `ids=${selectedIds.join(',')}` : '';
    const query = [statusParam, searchParam, idsParam].filter(Boolean).join('&');
    window.location.href = `/api/admin/withdrawals/export${query ? `?${query}` : ''}`;
    toast({ 
      title: selectedIds.length > 0 ? "Selective Ledger Export" : "Full Ledger Export", 
      description: `Downloading ${selectedIds.length > 0 ? selectedIds.length : 'filtered'} payout nodes.` 
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Copied to Clipboard", description: "Value ready for transfer protocol." });
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-primary/10 text-primary border-primary/20';
      case 'completed': return 'bg-primary/20 text-primary border-primary/40';
      case 'rejected': return 'bg-red-50 text-red-600 border-red-200';
      default: return 'bg-zinc-50 text-zinc-500 border-zinc-200';
    }
  };

  const allSelected = withdrawalsList.length > 0 && withdrawalsList.every(w => selectedIds.includes(w.id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const idsToAdd = withdrawalsList.map(w => w.id).filter(id => !selectedIds.includes(id));
      setSelectedIds(prev => [...prev, ...idsToAdd]);
    } else {
      setSelectedIds([]);
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-5xl font-black tracking-tighter uppercase text-[#111]">Payout</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search beneficiary..."
              className="h-10 pl-11 pr-4 bg-white border-[1.5px] border-[#111] rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-xs font-bold w-64 text-[#111] placeholder:text-zinc-400"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <Button 
            className="h-10 bg-white border-[1.5px] border-[#111] text-[#111] font-black text-xs px-6 hover:bg-[#111] hover:text-white rounded-full transition-all uppercase shadow-sm whitespace-nowrap"
            onClick={handleExport}
          >
            Export
          </Button>

          <select 
            className="h-10 px-4 bg-white border-[1.5px] border-[#111] rounded-full font-black text-[10px] uppercase tracking-widest focus:outline-none cursor-pointer hover:bg-black/5 transition-colors"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="rejected">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="bg-background border-[1.5px] border-[#111] rounded-[2rem] overflow-hidden shadow-sm">
        <div className="bg-white border-b-[1.5px] border-[#111] px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-1 bg-[#111]/5 p-1 rounded-full">
            {(['latest', 'rank', 'deadtime'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortType(s)}
                className={cn(
                  "py-1.5 px-4 rounded-full text-[9px] font-black uppercase tracking-widest transition-all min-w-[80px]",
                  sortType === s ? "bg-black text-white shadow-sm" : "hover:bg-black/10 text-zinc-400"
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="bg-black text-white px-4 py-1.5 rounded-lg font-black text-xs min-w-[40px] text-center shadow-lg uppercase tracking-tight">
            {totalCount < 10 ? `0${totalCount}` : totalCount}
          </div>
        </div>
        
        {selectedIds.length > 0 && (
          <div className="bg-[#111] px-8 py-3 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">
              {selectedIds.length} {selectedIds.length === 1 ? 'item' : 'items'} ready for export...
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/50 border-b-[1.5px] border-[#111]/10">
                <th className="p-6 w-12 text-center align-middle">
                  <Checkbox 
                    checked={allSelected}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    className="border-[#111] data-[state=checked]:bg-[#111] data-[state=checked]:text-primary"
                  />
                </th>
                <th className="p-6 font-black text-[10px] tracking-widest text-[#111] uppercase">Beneficiary</th>
                <th className="p-6 font-black text-[10px] tracking-widest text-[#111] uppercase text-center">Identity Rank</th>
                <th className="p-6 font-black text-[10px] tracking-widest text-[#111] uppercase">Transfer Protocol</th>
                <th className="p-6 font-black text-[10px] tracking-widest text-[#111] uppercase text-center">Amount (₨)</th>
                <th className="p-6 font-black text-[10px] tracking-widest text-[#111] uppercase text-center">Status</th>
                <th className="p-6 font-black text-[10px] tracking-widest text-[#111] uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-[1.5px] divide-[#111]/10">
              <AnimatePresence mode="popLayout">
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="border-b-[1.5px] border-[#111]/5">
                      <td className="p-6"><Skeleton className="h-4 w-4 rounded" /></td>
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2">
                             <Skeleton className="h-4 w-32" />
                             <Skeleton className="h-3 w-48" />
                          </div>
                        </div>
                      </td>
                      <td colSpan={4} className="p-6"><Skeleton className="h-10 w-full" /></td>
                    </tr>
                  ))
                ) : withdrawalsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-20 text-center">
                       <Inbox className="w-12 h-12 mx-auto mb-4 text-zinc-300" />
                       <TechnicalLabel text="Registry Empty" className="text-zinc-400 font-black italic uppercase tracking-widest" />
                       <p className="text-xs font-bold text-zinc-400 mt-2">No withdrawal nodes match the current filter.</p>
                    </td>
                  </tr>
                ) : (
                  withdrawalsList.map((withdrawal, idx) => (
                    <motion.tr 
                      key={withdrawal.id} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05, type: "spring", stiffness: 300, damping: 30 }}
                      className="hover:bg-black/5 transition-all group border-b-[1.5px] border-[#111]/5"
                    >
                      <td className="p-6">
                        <Checkbox 
                          checked={selectedIds.includes(withdrawal.id)}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedIds(prev => [...prev, withdrawal.id]);
                            else setSelectedIds(prev => prev.filter(id => id !== withdrawal.id));
                          }}
                          className="border-[#111] data-[state=checked]:bg-[#111] transition-colors"
                        />
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white border-[1.5px] border-[#111] flex items-center justify-center text-[10px] font-black group-hover:bg-primary/20 transition-all">
                            {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                          </div>
                          <div>
                            <div className="font-black text-xs text-[#111] uppercase tracking-tight">{withdrawal.user.firstName} {withdrawal.user.lastName}</div>
                            <div className="text-[10px] font-bold text-zinc-400">{withdrawal.user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[8px] font-black text-black bg-zinc-500 border-2 border-black px-2 py-0.5 tracking-widest uppercase shadow-sm">
                            {(withdrawal.user.rank ?? 'Useless')}
                          </span>
                          {sortType === 'deadtime' && (
                            <div className={cn(
                              "text-[10px] font-black tracking-tighter uppercase px-2 py-0.5 bg-black text-white rounded-sm min-w-[70px] shadow-sm",
                              getDeadtimeLeft(withdrawal.createdAt) < 7200000 && "bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                            )}>
                              {formattedTimeLeft(getDeadtimeLeft(withdrawal.createdAt))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-6">
                         <div className="flex items-center gap-2">
                           <TechnicalLabel text={withdrawal.accountNumber} className="text-[#111] !tracking-normal font-mono text-[11px]" />
                           <Button 
                             size="icon" 
                             variant="ghost" 
                             className="h-6 w-6 p-1 rounded-md hover:bg-black hover:text-white transition-all"
                             onClick={() => handleCopy(withdrawal.accountNumber)}
                           >
                             {copiedId === withdrawal.accountNumber ? <Check size={10} /> : <Copy size={10} />}
                           </Button>
                         </div>
                         <div className="text-[9px] font-bold text-zinc-400 mt-1 truncate max-w-[150px]">{withdrawal.accountName}</div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="font-black text-sm text-[#111]">₨ {parseFloat(withdrawal.amount).toLocaleString()}</div>
                        <div className="text-[9px] font-black uppercase text-zinc-400 tracking-widest mt-0.5">{withdrawal.method}</div>
                      </td>
                      <td className="p-6">
                        <div className={cn("px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border-[1.5px] inline-flex items-center gap-2 shadow-sm", getStatusStyle(withdrawal.status))}>
                           {withdrawal.status === 'pending' && <Clock size={10} />}
                           {withdrawal.status === 'completed' && <CheckCircle size={10} />}
                           {withdrawal.status === 'rejected' && <XCircle size={10} />}
                           {withdrawal.status}
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {withdrawal.status === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-10 w-10 p-0 rounded-full border-[1.5px] border-[#111]/20 hover:border-primary hover:bg-primary/20 hover:text-primary transition-colors text-[#111]"
                                onClick={() => { setSelectedWithdrawal(withdrawal); setActionType('approve'); }}
                              >
                                <CheckCircle size={16} />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-10 w-10 p-0 rounded-full border-[1.5px] border-[#111]/20 hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-500 transition-colors text-[#111]"
                                onClick={() => { setSelectedWithdrawal(withdrawal); setActionType('reject'); }}
                              >
                                <XCircle size={16} />
                              </Button>
                            </>
                          )}
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-10 w-10 border-[1.5px] border-[#111]/20 hover:bg-black hover:text-white rounded-full transition-all"
                            onClick={() => { setSelectedWithdrawal(withdrawal); setActionType('view'); }}
                          >
                            <ChevronRight size={14} />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-6 bg-white border-t-[1.5px] border-[#111] flex items-center justify-between">
            <div className="text-[10px] font-black tracking-widest uppercase text-zinc-400">
              Showing <span className="text-[#111]">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-[#111]">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of <span className="text-[#111]">{totalCount}</span> nodes
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="h-10 px-6 border-[1.5px] border-[#111] rounded-full font-black text-xs uppercase hover:bg-[#111] hover:text-white transition-all disabled:opacity-30"
              >
                Previous
              </Button>
              <div className="flex items-center gap-1 px-4">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handlePageChange(i + 1)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      currentPage === i + 1 ? "w-8 bg-[#111]" : "bg-[#111]/20 hover:bg-[#111]/40"
                    )}
                  />
                ))}
              </div>
              <Button
                variant="ghost"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="h-10 px-6 border-[1.5px] border-[#111] rounded-full font-black text-xs uppercase hover:bg-[#111] hover:text-white transition-all disabled:opacity-30"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!selectedWithdrawal && actionType === 'view'} onOpenChange={(open) => !open && closeModal()}>
         <DialogContent className="border-[1.5px] border-[#111] bg-white rounded-[2rem] p-0 max-w-lg overflow-hidden shadow-2xl *:!rounded-none [&>button]:hidden">
            <DialogHeader className="p-8 border-b-[1.5px] border-[#111]/10 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl font-black tracking-tighter text-[#111] uppercase">Withdrawal Entry</DialogTitle>
                  <DialogDescription className="text-zinc-500 font-bold text-[10px] tracking-widest mt-1 uppercase">ID: {selectedWithdrawal?.id}</DialogDescription>
                </div>
                <Button onClick={closeModal} variant="ghost" className="h-10 w-10 p-0 rounded-full hover:bg-black/5">
                  <X size={20} className="text-[#111]" />
                </Button>
              </div>
            </DialogHeader>
            <div className="p-8 space-y-6">
               <div className="grid grid-cols-2 gap-6">
                  <div>
                    <TechnicalLabel text="Beneficiary" className="mb-2" />
                    <div className="p-4 bg-muted/10 border-[1.5px] border-[#111]/20 rounded-2xl">
                      <div className="font-black text-[#111] uppercase">{selectedWithdrawal?.user.firstName} {selectedWithdrawal?.user.lastName}</div>
                      <div className="text-[10px] font-bold text-zinc-400 mt-1">{selectedWithdrawal?.user.email}</div>
                      <div className="mt-3">
                        <span className="text-[8px] font-black text-black bg-zinc-500 border-2 border-black px-2 py-0.5 tracking-widest uppercase shadow-sm">
                          {selectedWithdrawal?.user.rank}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <TechnicalLabel text="Payout Amount" className="mb-2" />
                    <div className="p-4 bg-[#111] border-[1.5px] border-[#111] rounded-2xl">
                      <div className="text-2xl font-black text-primary">₨ {parseFloat(selectedWithdrawal?.amount || "0").toLocaleString()}</div>
                      <div className="text-[9px] font-black text-white/40 uppercase tracking-widest mt-1">Beneficiary Node Payout</div>
                    </div>
                  </div>
               </div>
               <div>
                  <TechnicalLabel text="Account Protocol" className="mb-2" />
                  <div className="p-5 bg-white border-[1.5px] border-[#111]/20 rounded-2xl space-y-4">
                     <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Gateway</span>
                        <span className="text-xs font-black text-[#111] uppercase">{selectedWithdrawal?.method}</span>
                     </div>
                     <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Account Name</span>
                        <span className="text-xs font-black text-[#111] uppercase">{selectedWithdrawal?.accountName}</span>
                     </div>
                     <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                        <div className="flex flex-col">
                           <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Account/IBAN</span>
                           <span className="text-xs font-mono font-bold text-[#111]">{selectedWithdrawal?.accountNumber}</span>
                        </div>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 rounded-full border-[1.5px] border-[#111]/20 hover:bg-black hover:text-white transition-all"
                          onClick={() => handleCopy(selectedWithdrawal?.accountNumber || "")}
                        >
                          {copiedId === selectedWithdrawal?.accountNumber ? <Check size={12} /> : <Copy size={12} />}
                        </Button>
                     </div>
                  </div>
               </div>
            </div>
            <DialogFooter className="p-8 bg-white border-t-[1.5px] border-[#111]/10">
               {selectedWithdrawal?.status === 'pending' ? (
                 <div className="flex gap-4 w-full">
                   <Button variant="outline" className="flex-1 h-12 rounded-full border-[1.5px] border-red-500 text-red-500 font-black uppercase text-[10px] hover:bg-red-500 hover:text-white" onClick={() => setActionType('reject')}>Reject</Button>
                   <Button className="flex-1 h-12 rounded-full bg-primary text-white font-black uppercase text-[10px] border-[1.5px] border-[#111] hover:bg-[#111]" onClick={() => setActionType('approve')}>Approve Payout</Button>
                 </div>
               ) : (
                 <Button variant="outline" className="w-full h-12 rounded-full border-[1.5px] border-[#111] font-black uppercase text-[10px] hover:bg-black/5" onClick={closeModal}>Close Entry</Button>
               )}
            </DialogFooter>
         </DialogContent>
      </Dialog>

      <Dialog open={!!selectedWithdrawal && actionType === 'approve'} onOpenChange={(open) => !open && setActionType('view')}>
         <DialogContent className="border-[1.5px] border-[#111] bg-white rounded-[2rem] p-0 max-w-md overflow-hidden shadow-2xl *:!rounded-none">
            <DialogHeader className="p-8 border-b-[1.5px] border-[#111]/10 bg-white">
              <DialogTitle className="text-2xl font-black tracking-tighter text-[#111] uppercase">Authorize Payout</DialogTitle>
              <DialogDescription className="text-zinc-500 font-bold text-[10px] tracking-widest mt-1 uppercase">Enter Transaction Identifier</DialogDescription>
            </DialogHeader>
            <div className="p-8 bg-transparent space-y-6">
               <div className="p-4 bg-primary/5 border-[1.5px] border-primary/20 rounded-2xl flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-primary shrink-0 mt-1" />
                  <p className="text-xs font-bold text-primary/80 leading-relaxed">Please ensure the transaction has been executed through the bank portal before recording the reference ID.</p>
               </div>
               <div className="space-y-2">
                 <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Ref ID / Transaction Number</Label>
                 <Input 
                   placeholder="e.g. TRX-99283-A" 
                   className="h-14 rounded-full border-[1.5px] border-[#111]/30 focus:border-primary font-mono font-bold text-sm px-6 transition-all"
                   value={transactionId}
                   onChange={(e) => setTransactionId(e.target.value)}
                 />
               </div>
            </div>
            <DialogFooter className="p-8 bg-white border-t-[1.5px] border-[#111]/10">
               <Button className="w-full h-14 bg-primary font-black uppercase tracking-widest text-[11px] rounded-full border-[1.5px] border-[#111] hover:bg-[#111]"
                 onClick={() => updateStatusMutation.mutate({ id: selectedWithdrawal!.id, status: 'completed', transactionId })}
                 disabled={updateStatusMutation.isPending || !transactionId}
               >
                 {updateStatusMutation.isPending ? "Syncing..." : "Finalize Payout"}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

      <Dialog open={!!selectedWithdrawal && actionType === 'reject'} onOpenChange={(open) => !open && setActionType('view')}>
         <DialogContent className="border-[1.5px] border-[#111] bg-white rounded-[2rem] p-0 max-w-md overflow-hidden shadow-2xl *:!rounded-none">
            <DialogHeader className="p-8 border-b-[1.5px] border-[#111]/10 bg-white">
              <DialogTitle className="text-2xl font-black tracking-tighter text-red-500 uppercase">Reject Request</DialogTitle>
              <DialogDescription className="text-zinc-500 font-bold text-[10px] tracking-widest mt-1 uppercase">Specify Conflict Details</DialogDescription>
            </DialogHeader>
            <div className="p-8 bg-transparent space-y-6">
               <div className="space-y-2">
                 <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Rejection Statement</Label>
                 <Input 
                   placeholder="e.g. Incorrect account details provided." 
                   className="h-14 rounded-full border-[1.5px] border-[#111]/30 focus:border-red-500 font-bold text-sm px-6 transition-all"
                   value={rejectionReason}
                   onChange={(e) => setRejectionReason(e.target.value)}
                 />
               </div>
            </div>
            <DialogFooter className="p-8 bg-white border-t-[1.5px] border-[#111]/10">
               <Button className="w-full h-14 bg-red-500 text-white font-black uppercase tracking-widest text-[11px] rounded-full border-[1.5px] border-[#111] hover:bg-black hover:border-black"
                 onClick={() => updateStatusMutation.mutate({ id: selectedWithdrawal!.id, status: 'rejected', rejectionReason })}
                 disabled={updateStatusMutation.isPending || !rejectionReason}
               >
                 {updateStatusMutation.isPending ? "Syncing..." : "Decline Entry"}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
}
