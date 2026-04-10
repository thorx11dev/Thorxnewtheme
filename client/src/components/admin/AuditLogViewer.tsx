import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  FileText, 
  Search, 
  Filter, 
  MoreVertical, 
  Shield, 
  User, 
  Clock, 
  Database, 
  AlertCircle,
  Activity,
  ArrowRight,
  ChevronRight,
  Terminal,
  ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import TechnicalLabel from "@/components/ui/technical-label";

import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDebounce } from "@/hooks/use-debounce";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AuditLog {
  id: string;
  adminId: string;
  admin?: {
    firstName: string;
    lastName: string;
  };
  action: string;
  targetType: string;
  targetId: string;
  details: any;
  ipAddress: string;
  createdAt: string;
}

export function AuditLogViewer() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [period, setPeriod] = useState("all_time");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const itemsPerPage = 10;
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ logs: AuditLog[], totalCount: number }>({
    queryKey: ['/api/admin/audit-logs', { page: currentPage, search: debouncedSearch, period }],
    queryFn: async ({ queryKey }) => {
      const [_url, params] = queryKey as [string, any];
      const searchParam = params.search ? `&search=${encodeURIComponent(params.search)}` : '';
      const periodParam = params.period ? `&period=${params.period}` : '';
      const response = await apiRequest("GET", `/api/admin/audit-logs?page=${params.page}&limit=${itemsPerPage}${searchParam}${periodParam}`);
      return await response.json();
    }
  });

  const rawLogs = data?.logs || [];
  const filteredLogs = actionFilter === "ALL" 
    ? rawLogs 
    : rawLogs.filter(log => log.action === actionFilter || log.action.includes(actionFilter));
    
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const allSelected = filteredLogs.length > 0 && filteredLogs.every(log => selectedIds.includes(log.id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const idsToAdd = filteredLogs.map(log => log.id).filter(id => !selectedIds.includes(id));
      setSelectedIds(prev => [...prev, ...idsToAdd]);
    } else {
      setSelectedIds([]);
    }
  };

  const handleExport = () => {
    const searchParam = debouncedSearch ? `search=${encodeURIComponent(debouncedSearch)}` : '';
    const periodParam = period ? `period=${period}` : '';
    const idsParam = selectedIds.length > 0 ? `ids=${selectedIds.join(',')}` : '';
    const query = [searchParam, periodParam, idsParam].filter(Boolean).join('&');
    
    window.location.href = `/api/admin/audit-logs/export${query ? `?${query}` : ''}`;
    toast({ 
      title: "Export Initialized", 
      description: selectedIds.length > 0 ? `Selective ledger for ${selectedIds.length} items.` : "Chronological ledger generation queued." 
    });
  };

  const getActionStyles = (action: string) => {
    return 'text-black border-zinc-500 bg-zinc-200';
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-5xl font-black tracking-tighter uppercase text-[#111]">Logs</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search activity..."
              className="h-10 pl-11 pr-4 bg-white border-[1.5px] border-[#111] rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-xs font-bold w-64 text-[#111] placeholder:text-zinc-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button 
            className="h-10 bg-white border-[1.5px] border-[#111] text-[#111] font-black text-xs px-6 hover:bg-[#111] hover:text-white rounded-full transition-all uppercase shadow-sm"
            onClick={handleExport}
          >
            Export
          </Button>
          <select 
            className="h-10 px-4 bg-white border-[1.5px] border-[#111] rounded-full font-black text-[10px] uppercase tracking-widest focus:outline-none cursor-pointer hover:bg-black/5 transition-colors"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All Actions</option>
            <option value="LEDGER_EXPORTED">Data Extractions</option>
            <option value="ADMIN_AUTH_SUCCESS">Access & Security</option>
            <option value="WITHDRAWAL">Withdrawals</option>
            <option value="BALANCE">Balance Changes</option>
            <option value="USER_DELETED">Node Destructions</option>
            <option value="BAN">Bans / Suspensions</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
           {[
             { id: 'today', label: 'Today' },
             { id: 'yesterday', label: 'Yesterday' },
             { id: 'this_week', label: 'This Week' },
             { id: 'this_month', label: 'This Month' },
             { id: 'this_year', label: 'This Year' },
             { id: 'all_time', label: 'All-time' },
           ].map((p) => (
             <button
               key={p.id}
               onClick={() => { setPeriod(p.id); setCurrentPage(1); }}
               className={cn(
                 "px-6 py-2 rounded-full border-[1.5px] font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap shadow-sm",
                 period === p.id 
                  ? "bg-[#111] text-white border-[#111]" 
                  : "bg-white text-[#111] border-[#111]/10 hover:border-[#111]"
               )}
             >
               {p.label}
             </button>
           ))}
        </div>

        <div className="bg-background border-[1.5px] border-[#111] rounded-[2rem] overflow-hidden shadow-sm">
          <div className="bg-white px-8 py-5 flex items-center justify-between border-b-[1.5px] border-[#111]/10">
            <div className="flex items-center gap-4">
               <TechnicalLabel text="Operational Ledger" className="text-[#111] font-black uppercase" />
            </div>
            <div className="bg-black text-white px-4 py-1.5 rounded-lg font-black text-xs min-w-[40px] text-center shadow-lg">
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
                <th className="p-6 font-black text-[10px] tracking-widest text-[#111] uppercase whitespace-nowrap">Admin Ref</th>
                <th className="p-6 font-black text-[10px] tracking-widest text-[#111] uppercase whitespace-nowrap">actions</th>
                <th className="p-6 font-black text-[10px] tracking-widest text-[#111] uppercase whitespace-nowrap">Target Details</th>
                <th className="p-6 font-black text-[10px] tracking-widest text-[#111] uppercase whitespace-nowrap">period</th>
                <th className="p-6 font-black text-[10px] tracking-widest text-[#111] uppercase text-right whitespace-nowrap">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y-[1.5px] divide-[#111]/10">
              <AnimatePresence mode="popLayout">
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="border-b-[1.5px] border-[#111]/5">
                      <td className="p-6"><Skeleton className="h-10 w-full" /></td>
                      <td className="p-6"><Skeleton className="h-10 w-full" /></td>
                      <td className="p-6"><Skeleton className="h-10 w-full" /></td>
                      <td className="p-6"><Skeleton className="h-10 w-full" /></td>
                      <td className="p-6"><Skeleton className="h-10 w-full" /></td>
                      <td className="p-6"><Skeleton className="h-10 w-full" /></td>
                    </tr>
                  ))
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-20 text-center">
                       <Activity className="w-12 h-12 mx-auto mb-4 text-zinc-300" />
                       <TechnicalLabel text="Silence In The Ledger" className="text-zinc-400 font-black italic uppercase tracking-widest" />
                       <p className="text-xs font-bold text-zinc-400 mt-2">No audit records match the current search vector.</p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, idx) => (
                    <motion.tr 
                      key={log.id} 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03, type: "spring", stiffness: 300, damping: 30 }}
                      className="hover:bg-black/5 transition-all group border-b-[1.5px] border-[#111]/5"
                    >
                      <td className="p-6 text-center align-middle">
                         <Checkbox 
                           checked={selectedIds.includes(log.id)}
                           onCheckedChange={(checked) => {
                             if (checked) setSelectedIds(prev => [...prev, log.id]);
                             else setSelectedIds(prev => prev.filter(id => id !== log.id));
                           }}
                           className="border-[#111] data-[state=checked]:bg-[#111] transition-colors"
                         />
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-white border-[1.5px] border-[#111] flex items-center justify-center">
                              <Shield size={14} className="text-[#111]" />
                           </div>
                           <div>
                              <div className="text-[10px] font-black uppercase text-[#111] tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]" title={log.admin ? `${log.admin.firstName} ${log.admin.lastName}` : log.adminId}>
                                {log.admin ? `${log.admin.firstName} ${log.admin.lastName}` : `${log.adminId.substring(0, 10)}...`}
                              </div>
                              <div className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1 mt-0.5">
                                 <Terminal size={10} />
                                 IP: {log.ipAddress || 'Internal'}
                              </div>
                           </div>
                        </div>
                      </td>
                      <td className="p-6">
                         <div className={cn("inline-flex px-3 pt-1.5 pb-1 rounded-sm border-2 border-black text-[9px] font-black uppercase tracking-widest shadow-sm", getActionStyles(log.action))}>
                            {log.action}
                         </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                           <Database size={12} className="text-zinc-400" />
                           <span className="text-[10px] font-black uppercase text-[#111]">{log.targetType}</span>
                           <ArrowRight size={10} className="text-zinc-400" />
                           <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-[10px] font-mono font-bold text-zinc-500 hover:text-[#111] transition-colors bg-[#111]/5 px-2 py-0.5 rounded cursor-help">
                                    {log.targetId.substring(0, 10)}...
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="bg-[#111] text-primary border-[1.5px] border-[#111] font-mono text-[10px] uppercase">
                                  {log.targetId}
                                </TooltipContent>
                              </Tooltip>
                           </TooltipProvider>
                        </div>
                      </td>
                      <td className="p-6">
                         <div className="flex items-center gap-2 text-zinc-500">
                            <Clock size={12} className="opacity-40" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{new Date(log.createdAt).toLocaleString()}</span>
                         </div>
                      </td>
                      <td className="p-6 text-right">
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           className="h-8 w-8 rounded-full hover:bg-black hover:text-white transition-all border-[1.5px] border-transparent hover:border-[#111]"
                           onClick={() => toast({ title: "Log Details", description: "Metadata: " + JSON.stringify(log.details) })}
                         >
                            <ChevronRight size={14} />
                         </Button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Scalable Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-8 border-t-[1.5px] border-[#111]/10 px-4 pb-8 bg-white">
            <div className="text-[10px] font-black tracking-widest uppercase text-zinc-400">
              Trace <span className="text-[#111]">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-[#111]">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of <span className="text-[#111]">{totalCount}</span> events
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="h-10 px-6 border-[1.5px] border-[#111] rounded-full font-black text-xs uppercase hover:bg-[#111] hover:text-white transition-all disabled:opacity-30"
              >
                Retrace
              </Button>
              <div className="flex items-center gap-1.5 px-2">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handlePageChange(i + 1)}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      currentPage === i + 1 ? "w-6 bg-[#111]" : "w-1.5 bg-[#111]/20 hover:bg-[#111]/40"
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
                Forward
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);
}

