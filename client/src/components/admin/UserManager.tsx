import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Ban, 
  CheckCircle, 
  DollarSign, 
  Network,
  ArrowRight,
  ExternalLink,
  Edit3,
  Calendar,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  X,
  StickyNote,
  Send,
  Plus,
  Check
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import TechnicalLabel from "@/components/ui/technical-label";
import { apiRequest } from "@/lib/queryClient";
import { apiAbsolutePath } from "@/lib/apiOrigin";
import { useToast } from "@/hooks/use-toast";
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
import { ReferralTree } from "@/components/ui/referral-tree";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  identity: string;
  role: string;
  rank: string;
  availableBalance: string;
  totalEarnings: string;
  referralCode: string;
  createdAt: string;
  avatar?: string;
  profilePicture?: string;
}

interface InternalNote {
  id: string;
  adminId: string;
  admin?: {
    firstName: string;
    lastName: string;
  };
  content: string;
  createdAt: string;
}

export function UserManager({ initialSearch = "" }: { initialSearch?: string }) {
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Optimized for admin view
  
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [modalType, setModalType] = useState<'details' | 'balance' | 'network' | 'notes' | 'delete' | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [newNote, setNewNote] = useState("");
  const [networkZoom, setNetworkZoom] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // When initialSearch changes (e.g. navigated from leaderboard), update the search term
  useEffect(() => {
    if (initialSearch) setSearchTerm(initialSearch);
  }, [initialSearch]);

  const { data, isLoading } = useQuery<{ users: UserProfile[], totalCount: number }>({
    queryKey: ['/api/team/users', { page: currentPage, search: debouncedSearch }],
    queryFn: async ({ queryKey }) => {
      const [_url, params] = queryKey as [string, any];
      const searchParam = params.search ? `&search=${encodeURIComponent(params.search)}` : '';
      const response = await apiRequest("GET", `/api/team/users?page=${params.page}&limit=${itemsPerPage}${searchParam}`);
      return await response.json();
    }
  });


  const { data: networkData } = useQuery<any>({
    queryKey: [`/api/admin/users/${selectedUser?.id}/network`],
    enabled: !!selectedUser && (modalType === 'network' || modalType === 'details'),
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/admin/users/${selectedUser?.id}/network`);
      return await response.json();
    }
  });

  const { data: notesData } = useQuery<{ notes: InternalNote[] }>({
    queryKey: [`/api/admin/notes/user/${selectedUser?.id}`],
    enabled: !!selectedUser && modalType === 'notes',
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/admin/notes/user/${selectedUser?.id}`);
      return await response.json();
    }
  });

  const adjustBalanceMutation = useMutation({
    mutationFn: async ({ userId, amount, type, reason }: { userId: string, amount: string, type: string, reason: string }) => {
      return await apiRequest("POST", `/api/admin/users/${userId}/adjust-balance`, { amount, type, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team/users'] });
      toast({ title: "Balance Adjusted", description: "User's financial ledger has been updated." });
      closeModal();
    }
  });

  const createNoteMutation = useMutation({
    mutationFn: async ({ targetType, targetId, content }: { targetType: string, targetId: string, content: string }) => {
      return await apiRequest("POST", "/api/admin/notes", { targetType, targetId, content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/notes/user/${selectedUser?.id}`] });
      setNewNote("");
      toast({ title: "Note Recorded", description: "Internal observation saved to user registry." });
    }
  });

  const usersList = data?.users || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleExport = () => {
    const searchParam = debouncedSearch ? `search=${encodeURIComponent(debouncedSearch)}` : '';
    const idsParam = selectedIds.length > 0 ? `ids=${selectedIds.join(',')}` : '';
    const query = [searchParam, idsParam].filter(Boolean).join('&');
    window.location.href = apiAbsolutePath(`/api/admin/users/export${query ? `?${query}` : ""}`);
    toast({ 
      title: selectedIds.length > 0 ? "Selective Data Export" : "Directory Export", 
      description: `Downloading ${selectedIds.length > 0 ? selectedIds.length : 'filtered'} user nodes.` 
    });
  };

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team/users'] });
      toast({ title: "Node Terminated", description: "User has been permanently removed from the directory." });
      closeModal();
    }
  });

  const closeModal = () => {
    setSelectedUser(null);
    setModalType(null);
    setAdjustmentAmount("");
    setAdjustmentReason("");
    setNewNote("");
    setConfirmText("");
    setNetworkZoom(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const allSelected = usersList.length > 0 && usersList.every(u => selectedIds.includes(u.id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const idsToAdd = usersList.map(u => u.id).filter(id => !selectedIds.includes(id));
      setSelectedIds(prev => [...prev, ...idsToAdd]);
    } else {
      setSelectedIds([]);
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-5xl font-black tracking-tighter uppercase text-[#111]">User CRM</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search directory..."
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
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-background border-[1.5px] border-[#111] rounded-[2rem] overflow-hidden shadow-sm">
        <div className="bg-white border-b-[1.5px] border-[#111] px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <TechnicalLabel text="Operational Registry" className="text-[#111] font-black uppercase" />
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
                <th className="px-4 lg:px-6 py-6 font-black text-[10px] tracking-widest text-[#111] uppercase whitespace-nowrap">Profile</th>
                <th className="px-4 lg:px-6 py-6 font-black text-[10px] tracking-widest text-[#111] uppercase whitespace-nowrap">Contact Protocol</th>
                <th className="px-4 lg:px-6 py-6 font-black text-[10px] tracking-widest text-[#111] uppercase whitespace-nowrap text-center">Rank</th>
                <th className="px-4 lg:px-6 py-6 font-black text-[10px] tracking-widest text-[#111] uppercase whitespace-nowrap">Financials (₨)</th>
                <th className="px-4 lg:px-6 py-6 font-black text-[10px] tracking-widest text-[#111] uppercase text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-[1.5px] divide-[#111]/10">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`}>
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <Skeleton className="w-12 h-12 min-w-[3rem] shrink-0 rounded-[1rem] bg-zinc-200" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32 bg-zinc-200" />
                          <Skeleton className="h-3 w-24 bg-zinc-200" />
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-40 bg-zinc-200" />
                        <Skeleton className="h-3 w-32 bg-zinc-200" />
                      </div>
                    </td>
                    <td className="p-6 space-y-2">
                      <Skeleton className="h-5 w-24 rounded-sm bg-zinc-200" />
                    </td>
                    <td className="p-6 space-y-2">
                      <Skeleton className="h-5 w-24 bg-zinc-200" />
                      <Skeleton className="h-3 w-20 bg-zinc-200" />
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Skeleton className="h-10 w-10 rounded-full bg-zinc-200" />
                        <Skeleton className="h-10 w-10 rounded-full bg-zinc-200" />
                        <Skeleton className="h-10 w-10 rounded-full bg-zinc-200" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                usersList.map((user, idx) => (
                  <motion.tr 
                    key={user.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, type: "spring", stiffness: 300, damping: 30 }}
                    className="hover:bg-black/5 transition-all group border-b-[1.5px] border-[#111]/5"
                  >
                    <td className="p-6">
                      <Checkbox 
                        checked={selectedIds.includes(user.id)}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedIds(prev => [...prev, user.id]);
                          else setSelectedIds(prev => prev.filter(id => id !== user.id));
                        }}
                        className="border-[#111] data-[state=checked]:bg-[#111] transition-colors"
                      />
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 min-w-[3rem] shrink-0 bg-white border-[1.5px] border-[#111] rounded-[1rem] flex items-center justify-center group-hover:bg-primary/20 transition-all">
                          <User className="w-6 h-6 text-[#111]/50 group-hover:text-primary transition-colors" />
                        </div>
                        <div>
                          <div className="font-black text-sm tracking-tight text-[#111] uppercase">{user.firstName} {user.lastName}</div>
                          <div className="text-[10px] text-zinc-400 font-bold mt-1 tracking-widest uppercase">TX-ID: {user.identity || 'Pending'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-600 uppercase">
                          <Mail size={12} className="text-[#111]/30" />
                          {user.email}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase">
                          <Phone size={12} className="text-[#111]/30" />
                          {user.phone}
                        </div>
                      </div>
                    </td>
                    <td className="p-6 text-center">
                        <div className="flex flex-col gap-2 items-center">
                           <span className="text-[9px] font-black text-black bg-zinc-500 border-2 border-black px-2 py-0.5 tracking-widest uppercase shadow-sm">
                             {(user.rank ?? 'Useless')}
                           </span>
                        </div>
                    </td>
                    <td className="p-6">
                      <div className="font-black text-base text-[#111] mb-1 leading-none">{parseFloat(user.availableBalance).toLocaleString()}</div>
                      <div className="flex items-center gap-1.5">
                         <span className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold">Total:</span>
                         <span className="text-[10px] font-black text-[#111]/50">{parseFloat(user.totalEarnings).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-10 w-10 p-0 rounded-full border-[1.5px] border-[#111]/20 hover:border-[#111] hover:bg-[#111] hover:text-white transition-colors"
                          onClick={() => { setSelectedUser(user); setModalType('notes'); }}
                          title="Notes"
                        >
                          <StickyNote size={16} />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-10 w-10 p-0 rounded-full border-[1.5px] border-[#111]/20 hover:border-primary hover:bg-primary/20 hover:text-primary transition-colors text-[#111]"
                          onClick={() => { setSelectedUser(user); setModalType('network'); }}
                          title="Network"
                        >
                          <Network size={16} />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-10 w-10 p-0 rounded-full border-[1.5px] border-[#111]/20 hover:border-[#111] hover:bg-[#111] hover:text-white transition-colors"
                          onClick={() => { setSelectedUser(user); setModalType('balance'); }}
                          title="Balance"
                        >
                          <DollarSign size={16} />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-10 w-10 p-0 rounded-full border-[1.5px] border-red-500/20 hover:bg-red-500 hover:text-white hover:border-red-600 transition-all text-red-500"
                          onClick={() => {
                            setSelectedUser(user);
                            setModalType('delete');
                          }}
                          title="Terminate Node"
                        >
                          <Ban size={16} />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-10 w-10 border-[1.5px] border-[#111]/20 hover:bg-black hover:text-white rounded-full transition-all"
                          onClick={() => {
                            setSelectedUser(user);
                            setModalType('details');
                          }}
                        >
                          <ChevronRight size={14} />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Global Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-8 border-t-[1.5px] border-[#111]/10">
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
                Previous Protocol
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
                Next Protocol
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Internal Notes Dialog */}
      <Dialog open={!!selectedUser && modalType === 'notes'} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="border-[1.5px] border-[#111] bg-background rounded-[2rem] p-0 max-w-lg flex flex-col overflow-hidden shadow-2xl h-[600px] max-h-[85vh] *:!rounded-none [&>button]:hidden">
          <DialogHeader className="p-8 border-b-[1.5px] border-[#111]/10 bg-white shrink-0">
             <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl font-black tracking-tighter text-[#111] uppercase">
                    Admin Notes
                  </DialogTitle>
                  <DialogDescription className="text-zinc-500 font-bold text-[10px] tracking-widest mt-1 uppercase">
                    Subject: {selectedUser?.firstName} {selectedUser?.lastName}
                  </DialogDescription>
                </div>
                <Button onClick={closeModal} variant="ghost" className="h-10 w-10 p-0 rounded-full hover:bg-black/5">
                  <X size={20} className="text-[#111]" />
                </Button>
             </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 p-8 bg-transparent">
               <div className="space-y-4">
                  {notesData?.notes.length === 0 && (
                    <div className="p-10 text-center text-zinc-400 font-black italic text-[11px] uppercase tracking-widest">
                       <StickyNote className="w-10 h-10 mx-auto mb-4 opacity-10" />
                       No notes recorded yet
                    </div>
                  )}
                  {notesData?.notes.map((note) => (
                    <div key={note.id} className="bg-white border-[1.5px] border-[#111]/20 rounded-2xl p-5 space-y-3 relative hover:border-[#111]/50 transition-colors">
                       <div className="flex items-center justify-between border-b-[1.5px] border-[#111]/5 pb-3">
                          <TechnicalLabel 
                            text={`Author: ${note.admin ? `${note.admin.firstName} ${note.admin.lastName}` : note.adminId.substring(0, 8)}`} 
                            className="text-zinc-400 text-[9px] uppercase tracking-wider font-black" 
                          />
                          <TechnicalLabel text={new Date(note.createdAt).toLocaleString()} className="text-zinc-400 text-[9px] tracking-wider" />
                       </div>
                       <p className="text-xs font-bold leading-relaxed text-[#111]">{note.content}</p>
                    </div>
                  ))}
               </div>
            </ScrollArea>
           
            <div className="p-6 bg-white border-t-[1.5px] border-[#111]/10 shrink-0">
               <div className="flex gap-3">
                  <Input 
                    placeholder="Type a new note..." 
                    className="flex-1 rounded-full border-[1.5px] border-[#111]/30 h-12 px-6 font-bold text-xs focus:ring-0 focus:border-[#111] transition-colors"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newNote) {
                        createNoteMutation.mutate({ targetType: 'user', targetId: selectedUser!.id, content: newNote });
                      }
                    }}
                  />
                  <Button 
                    className="h-12 w-12 rounded-full bg-[#111] text-white hover:bg-primary hover:text-white border-[1.5px] border-[#111] transition-colors p-0 flex items-center justify-center shrink-0 shadow-sm"
                    onClick={() => {
                      if (!newNote) return;
                      createNoteMutation.mutate({ targetType: 'user', targetId: selectedUser!.id, content: newNote });
                    }}
                    disabled={createNoteMutation.isPending}
                  >
                    <Send size={16} />
                  </Button>
               </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Network View Dialog */}
      <Dialog open={!!selectedUser && modalType === 'network'} onOpenChange={(open) => { if (!open) { closeModal(); setNetworkZoom(1); } }}>
        <DialogContent className="border-[1.5px] border-[#111] bg-background rounded-[2rem] p-0 max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl *:!rounded-none [&>button]:hidden">
          <DialogHeader className="p-8 border-b-[1.5px] border-[#111]/10 bg-white">
             <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl font-black tracking-tighter text-[#111] uppercase">
                    Referral Network
                  </DialogTitle>
                  <DialogDescription className="text-zinc-500 font-bold text-[10px] tracking-widest mt-1 uppercase">
                    Topology map for: {selectedUser?.firstName} {selectedUser?.lastName}
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-2">
                  {/* Zoom Controls */}
                  <button
                    onClick={() => setNetworkZoom(z => Math.max(0.4, parseFloat((z - 0.15).toFixed(2))))}
                    className="h-9 w-9 rounded-full border-[1.5px] border-[#111]/20 hover:border-[#111] hover:bg-[#111] hover:text-white transition-colors flex items-center justify-center text-[#111] font-black text-lg"
                    title="Zoom Out"
                  >−</button>
                  <span className="text-[10px] font-black text-zinc-400 tracking-widest uppercase w-10 text-center">{Math.round(networkZoom * 100)}%</span>
                  <button
                    onClick={() => setNetworkZoom(z => Math.min(2.5, parseFloat((z + 0.15).toFixed(2))))}
                    className="h-9 w-9 rounded-full border-[1.5px] border-[#111]/20 hover:border-[#111] hover:bg-[#111] hover:text-white transition-colors flex items-center justify-center text-[#111] font-black text-lg"
                    title="Zoom In"
                  >+</button>
                  <button
                    onClick={() => setNetworkZoom(1)}
                    className="h-8 px-3 rounded-full border-[1.5px] border-[#111]/20 hover:border-[#111] hover:bg-[#111] hover:text-white transition-colors text-[#111] font-black text-[9px] tracking-widest uppercase"
                    title="Fit to View"
                  >Fit</button>
                  <Button onClick={() => { closeModal(); setNetworkZoom(1); }} variant="ghost" className="h-10 w-10 p-0 rounded-full hover:bg-black/5 ml-1">
                    <X size={20} className="text-[#111]" />
                  </Button>
                </div>
             </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-[#fdfbf7] relative">
            {networkData ? (
               <div
                 className="w-full h-full flex justify-center items-start overflow-auto scrollbar-hide pt-12"
               >
                 <div
                   style={{ 
                     transform: `scale(${networkZoom})`, 
                     transformOrigin: 'top center', 
                     transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' 
                   }}
                 >
                   <ReferralTree 
                      currentUser={{
                        id: selectedUser!.id,
                        firstName: selectedUser!.firstName,
                        lastName: selectedUser!.lastName,
                        rank: selectedUser!.rank,
                        avatar: selectedUser!.avatar,
                        profilePicture: selectedUser!.profilePicture
                      }} 
                      referrals={networkData.referrals || []} 
                   />
                 </div>
               </div>
            ) : (
               <div className="flex flex-col items-center justify-center h-64 grayscale opacity-40">
                  <div className="w-12 h-12 border-4 border-[#111] border-t-transparent animate-spin rounded-full mb-6"></div>
                  <TechnicalLabel text="Mapping network..." className="font-black text-xs text-[#111] uppercase tracking-widest border border-[#111] rounded-full px-4 py-1" />
               </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Balance Adjustment Dialog */}
      <Dialog open={!!selectedUser && modalType === 'balance'} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="border-[1.5px] border-[#111] bg-background rounded-[2rem] p-0 max-w-md overflow-hidden shadow-2xl *:!rounded-none [&>button]:hidden">
          <DialogHeader className="p-8 border-b-[1.5px] border-[#111]/10 bg-white">
            <DialogTitle className="text-2xl font-black tracking-tighter text-[#111] uppercase">
              Financial Operation
            </DialogTitle>
            <DialogDescription className="text-zinc-500 font-bold text-[10px] tracking-widest mt-1 uppercase">
               Account: {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>

          <div className="p-8 space-y-8 bg-transparent">
             <div className="flex gap-4">
                <button 
                  onClick={() => setAdjustmentType('add')}
                  className={cn("flex-1 h-14 rounded-[1.5rem] border-[1.5px] border-[#111] font-black text-[10px] tracking-widest uppercase transition-colors flex items-center justify-center gap-2", adjustmentType === 'add' ? "bg-[#111] text-white" : "bg-white hover:bg-black/5 text-[#111]")}
                >
                  <ArrowUpRight size={16} />
                  Credit
                </button>
                <button 
                  onClick={() => setAdjustmentType('subtract')}
                  className={cn("flex-1 h-14 rounded-[1.5rem] border-[1.5px] border-[#111] font-black text-[10px] tracking-widest uppercase transition-colors flex items-center justify-center gap-2", adjustmentType === 'subtract' ? "bg-red-500 text-white border-red-500" : "bg-white hover:bg-black/5 text-[#111]")}
                >
                  <ArrowDownRight size={16} />
                  Debit
                </button>
             </div>

             <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black tracking-widest uppercase text-zinc-500 ml-2">Amount (₨)</Label>
                  <Input 
                    type="number"
                    placeholder="0.00" 
                    className="rounded-[1.5rem] border-[1.5px] border-[#111]/30 focus:border-[#111] focus:ring-0 font-mono text-xl font-black h-16 px-6 bg-white transition-colors"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black tracking-widest uppercase text-zinc-500 ml-2">Operation Reason</Label>
                  <Input 
                    placeholder="Enter short description..." 
                    className="rounded-full border-[1.5px] border-[#111]/30 focus:border-[#111] focus:ring-0 font-bold text-sm h-14 px-6 bg-white transition-colors"
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                  />
                </div>
             </div>
          </div>

          <DialogFooter className="p-8 bg-white border-t-[1.5px] border-[#111]/10">
            <Button 
               className="w-full h-14 rounded-full bg-primary text-white hover:bg-[#111] hover:text-white border-[1.5px] border-[#111] font-black uppercase tracking-widest text-[11px] transition-colors shadow-sm"
               onClick={() => {
                 if (!adjustmentAmount) return;
                 adjustBalanceMutation.mutate({
                   userId: selectedUser!.id,
                   amount: adjustmentAmount,
                   type: adjustmentType,
                   reason: adjustmentReason || "No reason provided"
                 });
               }}
               disabled={adjustBalanceMutation.isPending}
            >
              {adjustBalanceMutation.isPending ? "Processing..." : "Confirm Action"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog open={!!selectedUser && modalType === 'details'} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="border-[1.5px] border-[#111] bg-background rounded-[2rem] p-0 max-w-2xl overflow-hidden shadow-2xl *:!rounded-none [&>button]:hidden">
          <DialogHeader className="p-8 border-b-[1.5px] border-[#111]/10 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-black tracking-tighter text-[#111] uppercase">
                  User Intelligence
                </DialogTitle>
                <DialogDescription className="text-zinc-500 font-bold text-[10px] tracking-widest mt-1 uppercase">
                  Digital Signature ID: {selectedUser?.id}
                </DialogDescription>
              </div>
              <Button onClick={closeModal} variant="ghost" className="h-10 w-10 p-0 rounded-full hover:bg-black/5">
                <X size={20} className="text-[#111]" />
              </Button>
            </div>
          </DialogHeader>

          <div className="p-8 grid grid-cols-2 gap-8 bg-transparent">
             <div className="space-y-6">
                <div>
                  <TechnicalLabel text="Identity" className="mb-2" />
                  <div className="p-5 bg-white border-[1.5px] border-[#111]/20 rounded-2xl relative overflow-hidden group hover:border-[#111] transition-all">
                    <div className="text-lg font-black text-[#111] uppercase">{selectedUser?.firstName} {selectedUser?.lastName}</div>
                    <div className="text-[10px] text-zinc-400 font-bold uppercase mt-1">TX-ID: {selectedUser?.identity}</div>
                  </div>
                </div>
                <div>
                  <TechnicalLabel text="Contact Node" className="mb-2" />
                  <div className="p-5 bg-white border-[1.5px] border-[#111]/20 rounded-2xl space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail size={14} className="text-primary" />
                      <span className="text-xs font-bold text-[#111]">{selectedUser?.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone size={14} className="text-primary" />
                      <span className="text-xs font-bold text-[#111]">{selectedUser?.phone}</span>
                    </div>
                  </div>
                </div>
             </div>

             <div className="space-y-6">
                <div>
                  <TechnicalLabel text="Financial Ledger" className="mb-2" />
                  <div className="p-5 bg-[#111] border-[1.5px] border-[#111] rounded-2xl space-y-4">
                    <div>
                      <div className="text-[9px] font-black text-white/40 uppercase tracking-widest">Available Balance</div>
                      <div className="text-2xl font-black text-white">₨ {parseFloat(selectedUser?.availableBalance || "0").toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black text-white/40 uppercase tracking-widest">Lifetime Earnings</div>
                      <div className="text-lg font-black text-primary italic">₨ {parseFloat(selectedUser?.totalEarnings || "0").toLocaleString()}</div>
                    </div>
                  </div>
                </div>
                <div>
                  <TechnicalLabel text="System Metadata" className="mb-2" />
                  <div className="p-5 bg-white border-[1.5px] border-[#111]/20 rounded-2xl grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Rank</div>
                      <span className="text-[10px] font-black text-black bg-zinc-500 border-2 border-black px-2 py-0.5 tracking-widest uppercase shadow-sm inline-block">
                        {(selectedUser?.rank ?? 'Useless')}
                      </span>
                    </div>
                    <div>
                      <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Joined</div>
                      <div className="text-xs font-black text-[#111] uppercase">{selectedUser ? new Date(selectedUser.createdAt).toLocaleDateString() : ''}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <TechnicalLabel text="Referral Intelligence" className="mb-2" />
                  <div className="p-5 bg-white border-[1.5px] border-[#111]/20 rounded-2xl grid grid-cols-2 gap-4">
                    <div className="border-r-[1.5px] border-[#111]/5">
                      <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Level 1</div>
                      <div className="text-xl font-black text-[#111]">
                        {networkData?.referrals?.filter((r: any) => r.level === 1).length || 0}
                        <span className="text-[10px] ml-1 opacity-30 font-bold">Nodes</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Level 2</div>
                      <div className="text-xl font-black text-[#111]">
                        {networkData?.referrals?.filter((r: any) => r.level === 2).length || 0}
                        <span className="text-[10px] ml-1 opacity-30 font-bold">Nodes</span>
                      </div>
                    </div>
                  </div>
                </div>
             </div>
          </div>

          <DialogFooter className="p-8 bg-white border-t-[1.5px] border-[#111]/10 flex gap-4">
            <Button 
                variant="outline"
                className="flex-1 h-14 border-[1.5px] border-[#111] rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-black/5"
                onClick={() => setModalType('notes')}
            >
              Observations
            </Button>
            <Button 
                variant="outline"
                className="flex-1 h-14 border-[1.5px] border-[#111] rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-black/5"
                onClick={() => setModalType('network')}
            >
              Network Map
            </Button>
            <Button 
                className="flex-1 h-14 bg-primary border-[1.5px] border-[#111] rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-[#111] hover:text-white"
                onClick={() => setModalType('balance')}
            >
              Adjust Ledger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete/Ban Dialog */}
      <Dialog open={!!selectedUser && modalType === 'delete'} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="border-[1.5px] border-[#111] bg-white rounded-[2rem] p-0 max-w-md overflow-hidden shadow-2xl *:!rounded-none [&>button]:hidden">
          <div className="p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-red-500 border-[1.5px] border-[#111] rounded-full flex items-center justify-center mx-auto shadow-[0_8px_20px_rgba(239,68,68,0.3)] animate-bounce">
              <Ban size={32} className="text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-[#111] uppercase tracking-tighter">Terminate Node?</h3>
              <p className="text-zinc-500 font-bold text-xs mt-2 leading-relaxed px-4">
                You are about to permanently remove <span className="text-[#111]">{selectedUser?.firstName} {selectedUser?.lastName}</span> from the system. This action is irreversible.
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Input 
                  placeholder="Type 'TERMINATE' to confirm" 
                  className="rounded-full border-[1.5px] border-[#111] h-14 text-center font-black uppercase text-xs focus:ring-red-500 focus:border-red-500 transition-all"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 h-14 rounded-full border-[1.5px] border-[#111] font-black text-[10px] uppercase tracking-widest hover:bg-black/5"
                  onClick={closeModal}
                >
                  Abort
                </Button>
                <Button 
                  className="flex-1 h-14 bg-red-500 text-white border-[1.5px] border-[#111] rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-red-600 disabled:opacity-50"
                  disabled={confirmText !== 'TERMINATE' || deleteUserMutation.isPending}
                  onClick={() => deleteUserMutation.mutate(selectedUser!.id)}
                >
                  {deleteUserMutation.isPending ? "Executing..." : "Confirm"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
