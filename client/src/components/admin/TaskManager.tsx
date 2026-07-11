import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Target as TargetIcon, 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Search,
  Filter,
  Youtube,
  Share2,
  Globe,
  Check,
  X,
  Play as PlayIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import TechnicalLabel from "@/components/ui/technical-label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type DailyTask } from "@shared/schema";

export function TaskManager() {
  const [activeTab, setActiveTab] = useState<"tasks" | "payout">("tasks");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [localRules, setLocalRules] = useState<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading: tasksLoading } = useQuery<DailyTask[]>({
    queryKey: ['/api/admin/tasks'],
  });

  const { data: payoutRules, isLoading: rulesLoading } = useQuery({
    queryKey: ['/api/system-config/rank_payout_requirements'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/system-config/rank_payout_requirements");
      return res.json();
    }
  });

  // Sync local rules with fetched rules
  React.useEffect(() => {
    if (payoutRules?.value && !localRules) {
      // Ensure all keys are lowercase for consistency
      const normalizedRules = Object.keys(payoutRules.value).reduce((acc: any, key) => {
        acc[key.toLowerCase()] = payoutRules.value[key];
        return acc;
      }, {});
      setLocalRules(normalizedRules);
    }
  }, [payoutRules, localRules]);

  const upsertMutation = useMutation({
    mutationFn: async (taskData: any) => {
      if (editingTask) {
        const res = await apiRequest("PATCH", `/api/admin/tasks/${editingTask.id}`, taskData);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/admin/tasks", taskData);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tasks'] });
      setIsDialogOpen(false);
      setEditingTask(null);
      toast({
        title: editingTask ? "Task Updated" : "Task Created",
        description: "The task matrix has been synchronized.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Configuration Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateRulesMutation = useMutation({
    mutationFn: async (rules: any) => {
      const res = await apiRequest("POST", "/api/admin/system-config", {
        key: 'rank_payout_requirements',
        value: rules
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-config/rank_payout_requirements'] });
      toast({
         title: "Rules Synchronized",
         description: "Rank-based payout requirements updated.",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tasks'] });
      toast({
        title: "Task Deleted",
        description: "Task has been removed from the protocol.",
      });
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<DailyTask> }) => {
      const res = await apiRequest("PATCH", `/api/admin/tasks/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tasks'] });
    }
  });

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title'),
      type: formData.get('type'),
      actionUrl: formData.get('actionUrl'),
      secretCode: formData.get('secretCode'),
      instructions: formData.get('instructions'),
      targetRank: formData.get('targetRank'),
      isMandatory: formData.get('isMandatory') === 'on',
      isActive: formData.get('isActive') === 'on',
    };
    upsertMutation.mutate(data);
  };

  const handleRuleChange = (rank: string, field: string, val: string) => {
    const key = rank.toLowerCase();
    const currentRules = localRules || {};
    const rankRules = currentRules[key] || { minAds: 0, minTasks: 0 };
    
    const numVal = parseInt(val) || 0;
    
    setLocalRules({
      ...currentRules,
      [key]: {
        ...rankRules,
        [field]: numVal
      }
    });
  };

  const RANKS = ["Supreme Chacha", "Haji Sab", "Baja Ji", "Chota Don", "Nawa Aya"];

  const filteredTasks = tasks?.filter(task => 
    task.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Youtube size={16} />;
      case 'social': return <Share2 size={16} />;
      default: return <Globe size={16} />;
    }
  };


  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-4">
          <h1 className="text-4xl font-black tracking-tighter uppercase text-[#111]">Tasks</h1>
          
          <div className="flex items-center gap-2">
             <button 
               onClick={() => setActiveTab("tasks")}
               className={cn(
                 "px-6 py-2 font-black text-[10px] tracking-widest uppercase transition-all rounded-full border-[1.5px]",
                 activeTab === "tasks" ? "bg-[#111] text-white border-[#111]" : "bg-white text-zinc-400 border-zinc-200 hover:border-[#111] hover:text-[#111]"
               )}
             >
               Internal Tasks
             </button>
             <button 
                onClick={() => setActiveTab("payout")}
                className={cn(
                  "px-6 py-2 font-black text-[10px] tracking-widest uppercase transition-all rounded-full border-[1.5px]",
                  activeTab === "payout" ? "bg-[#111] text-white border-[#111]" : "bg-white text-zinc-400 border-zinc-200 hover:border-[#111] hover:text-[#111]"
                )}
             >
               Engine Tasks
             </button>
          </div>
        </div>
        {activeTab === "tasks" && (
          <Button 
            onClick={() => {
              setEditingTask(null);
              setIsDialogOpen(true);
            }}
            className="h-12 bg-primary text-white border-[1.5px] border-[#111] font-black text-xs px-8 hover:bg-primary/80 rounded-full transition-all uppercase shadow-md flex items-center gap-2"
          >
            <Plus size={18} /> New Task
          </Button>
        )}
      </div>

      {activeTab === "tasks" ? (
        /* Main Table Container */
        <div className="bg-background border-[1.5px] border-[#111] rounded-[2rem] overflow-hidden shadow-sm">
          {/* Table Filters */}
          <div className="p-6 border-b-[1.5px] border-[#111]/10 bg-white/50 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#111] transition-colors" size={18} />
              <Input 
                placeholder="Search Task" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 pl-11 pr-4 bg-white border-[1.5px] border-[#111] rounded-full focus-visible:ring-2 focus-visible:ring-primary/50 transition-all text-xs font-bold text-[#111] placeholder:text-zinc-400"
              />
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
               <div className="w-10 h-10 bg-[#111] text-white flex items-center justify-center font-black text-sm shadow-sm">
                 {filteredTasks.length}
               </div>
            </div>
          </div>

        {/* Dynamic Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/50 border-b-[1.5px] border-[#111]/10">
                <th className="p-6 font-black text-[10px] tracking-widest text-[#111]/40 uppercase">Tasks</th>
                <th className="p-6 font-black text-[10px] tracking-widest text-[#111]/40 uppercase">Type</th>
                <th className="p-6 font-black text-[10px] tracking-widest text-[#111]/40 uppercase text-center">Rank</th>
                <th className="p-6 font-black text-[10px] tracking-widest text-[#111]/40 uppercase text-center">Importance</th>
                <th className="p-6 font-black text-[10px] tracking-widest text-[#111]/40 uppercase text-center">Status</th>
                <th className="p-6 font-black text-[10px] tracking-widest text-[#111]/40 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-[1.5px] divide-[#111]/10">
              <AnimatePresence mode="popLayout">
                {tasksLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-8 py-6">
                        <Skeleton className="h-8 w-full bg-zinc-100" />
                      </td>
                    </tr>
                  ))
                ) : filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center space-y-4">
                      <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-black/10">
                         <AlertCircle className="text-zinc-300" size={32} />
                      </div>
                      <p className="font-black text-xs tracking-widest uppercase text-zinc-400">No tasks detected in current grid</p>
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task, idx) => (
                    <motion.tr 
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-black/5 transition-colors group"
                    >
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white border-[1.5px] border-[#111]/20 flex items-center justify-center rounded-full group-hover:bg-primary/20 group-hover:border-primary transition-colors shadow-sm">
                             {getTypeIcon(task.type)}
                          </div>
                          <div>
                            <p className="font-black text-sm uppercase tracking-tight text-[#111] flex items-center gap-2">
                               {task.title}
                               {task.isMandatory && <Lock size={12} className="text-primary" />}
                            </p>
                            <p className="text-[10px] font-bold text-[#111]/40 uppercase tracking-widest mt-0.5">
                              {task.actionUrl ? (
                                <span className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer" onClick={() => window.open(task.actionUrl!, '_blank')}>
                                  {task.actionUrl.substring(0, 30)}...
                                </span>
                              ) : "INTERNAL TASK"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                         <div className="px-3 py-1 bg-[#e5e5e5] border-[1.5px] border-[#111]/10 rounded-full font-black text-[9px] tracking-widest uppercase text-[#111] shadow-sm">
                            {task.type}
                         </div>
                      </td>
                      <td className="p-6 text-center">
                         <span className="px-3 py-1 bg-black text-white rounded-full font-black text-[9px] tracking-widest uppercase shadow-sm">
                            {task.targetRank}
                         </span>
                      </td>
                      <td className="p-6 text-center whitespace-nowrap">
                         <button
                           onClick={() => toggleStatusMutation.mutate({ id: task.id, updates: { isMandatory: !task.isMandatory } })}
                           className={cn(
                             "w-10 h-10 rounded-full flex items-center justify-center border-[1.5px] transition-all shadow-sm mx-auto",
                             task.isMandatory 
                               ? "bg-primary text-white border-primary hover:bg-primary/80" 
                               : "bg-[#111] text-white border-[#111] hover:bg-[#222]"
                           )}
                           title={task.isMandatory ? "Mandatory" : "Optional"}
                         >
                           {task.isMandatory ? <Lock size={16} /> : <Unlock size={16} />}
                         </button>
                      </td>
                      <td className="p-6 text-center whitespace-nowrap">
                         <button
                           onClick={() => toggleStatusMutation.mutate({ id: task.id, updates: { isActive: !task.isActive } })}
                           className={cn(
                             "w-10 h-10 rounded-full flex items-center justify-center border-[1.5px] transition-all shadow-sm mx-auto",
                             task.isActive 
                               ? "bg-primary text-white border-primary hover:bg-primary/80" 
                               : "bg-[#111] text-white border-[#111] hover:bg-[#222]"
                           )}
                           title={task.isActive ? "Active" : "Inactive"}
                         >
                           {task.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                         </button>
                      </td>
                      <td className="p-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 transition-all">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setEditingTask(task);
                              setIsDialogOpen(true);
                            }}
                            className="h-10 w-10 border-[1.5px] border-[#111]/20 hover:border-[#111] hover:bg-white text-[#111] transition-all rounded-full shadow-sm"
                          >
                            <Edit2 size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              if (confirm("ARCHIVE TASK? THIS ACTION IS PERMANENT.")) {
                                deleteMutation.mutate(task.id);
                              }
                            }}
                            className="h-10 w-10 border-[1.5px] border-[#111]/20 hover:border-primary hover:bg-primary/5 text-[#111] hover:text-primary transition-all rounded-full shadow-sm"
                          >
                            <Trash2 size={16} />
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
        </div>
      ) : (
        /* Payout Rules Container */
        <div className="bg-background border-[1.5px] border-[#111] rounded-[2rem] overflow-hidden shadow-sm p-10">
           <div className="grid grid-cols-1 gap-4">
              {RANKS.map((rank) => {
                 const rules = localRules?.[rank.toLowerCase()] || { minAds: 0, minTasks: 0 };
                 return (
                   <div key={rank} className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 border-[1.5px] border-[#111]/10 rounded-3xl hover:bg-black/5 transition-all group">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-white border-[1.5px] border-[#111]/20 flex items-center justify-center rounded-full font-black text-lg text-[#111] group-hover:bg-primary/20 group-hover:border-primary transition-colors shadow-sm uppercase">
                            {rank[0]}
                         </div>
                         <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-[#111]">{rank}</h3>
                            <p className="text-[10px] font-black text-[#111]/40 uppercase tracking-widest mt-1">Daily Engagement Quota</p>
                         </div>
                      </div>

                      <div className="flex flex-col md:flex-row gap-8">
                         <div className="space-y-2">
                            <label className="font-black text-[9px] tracking-widest uppercase text-[#111]/40 block ml-4">Min Video Ads</label>
                            <Input 
                               type="number"
                               value={rules.minAds}
                               onChange={(e) => handleRuleChange(rank, 'minAds', e.target.value)}
                               className="w-full md:w-32 h-11 bg-white border-[1.5px] border-[#111] rounded-full font-black text-sm text-center focus-visible:ring-2 focus-visible:ring-primary/50"
                            />
                         </div>

                         <div className="space-y-2">
                            <label className="font-black text-[9px] tracking-widest uppercase text-[#111]/40 block ml-4">Min CPA Tasks</label>
                            <Input 
                               type="number"
                               value={rules.minTasks}
                               onChange={(e) => handleRuleChange(rank, 'minTasks', e.target.value)}
                               className="w-full md:w-32 h-11 bg-white border-[1.5px] border-[#111] rounded-full font-black text-sm text-center focus-visible:ring-2 focus-visible:ring-primary/50"
                            />
                         </div>
                      </div>
                   </div>
                 );
              })}
           </div>

           <div className="mt-12 pt-8 border-t-[1.5px] border-[#111]/10 flex justify-end">
              <Button 
                onClick={() => updateRulesMutation.mutate(localRules)}
                disabled={updateRulesMutation.isPending}
                className="h-12 bg-[#111] text-white font-black text-xs px-10 hover:bg-[#222] rounded-full transition-all uppercase shadow-md"
              >
                {updateRulesMutation.isPending ? "Synchronizing..." : "Save Changes"}
              </Button>
           </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl bg-white border border-zinc-200 rounded-2xl p-0 gap-0 overflow-hidden outline-none shadow-xl">
          <form onSubmit={handleSave}>
            <DialogHeader className="px-7 py-5 border-b border-zinc-100 bg-white">
              <DialogTitle className="text-xl font-semibold text-zinc-900">
                Daily Task
              </DialogTitle>
            </DialogHeader>

            <div className="px-7 py-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold tracking-widest uppercase text-zinc-400 ml-1">Title</Label>
                  <Input 
                    name="title" 
                    defaultValue={editingTask?.title || ""} 
                    required 
                    className="h-11 bg-white border border-zinc-300 rounded-xl font-medium px-4 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/60" 
                    placeholder="e.g. Subscribe to YouTube" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold tracking-widest uppercase text-zinc-400 ml-1">Type</Label>
                  <Select name="type" defaultValue={editingTask?.type || "video"}>
                    <SelectTrigger className="h-11 bg-white border border-zinc-300 rounded-xl font-medium text-sm px-4">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border border-zinc-200 rounded-xl text-sm">
                      <SelectItem value="video">YouTube Video</SelectItem>
                      <SelectItem value="social">Social Action</SelectItem>
                      <SelectItem value="internal">Platform Task</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold tracking-widest uppercase text-zinc-400 ml-1">URL Address</Label>
                <Input 
                  name="actionUrl" 
                  defaultValue={editingTask?.actionUrl || ""} 
                  className="h-11 bg-white border border-zinc-300 rounded-xl font-medium px-4 focus-visible:ring-2 focus-visible:ring-primary/40" 
                  placeholder="https://youtu.be/xxxx" 
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold tracking-widest uppercase text-zinc-400 ml-1">Instructions</Label>
                <Input 
                  name="instructions" 
                  defaultValue={editingTask?.instructions || ""} 
                  className="h-11 bg-white border border-zinc-300 rounded-xl font-medium px-4 focus-visible:ring-2 focus-visible:ring-primary/40" 
                  placeholder="e.g. Go to Work section and complete task..." 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold tracking-widest uppercase text-zinc-400 ml-1">Code</Label>
                  <Input 
                    name="secretCode" 
                    defaultValue={editingTask?.secretCode || ""} 
                    className="h-11 bg-white border border-zinc-300 rounded-xl font-medium px-4 focus-visible:ring-2 focus-visible:ring-primary/40 tracking-widest" 
                    placeholder="SECRET-KEY-123" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold tracking-widest uppercase text-zinc-400 ml-1">Target Rank</Label>
                  <Select name="targetRank" defaultValue={editingTask?.targetRank || "Nawa Aya"}>
                    <SelectTrigger className="h-11 bg-white border border-zinc-300 rounded-xl font-medium text-sm px-4">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border border-zinc-200 rounded-xl text-sm">
                      <SelectItem value="Nawa Aya">Nawa Aya (Public)</SelectItem>
                      <SelectItem value="Chota Don">Chota Don</SelectItem>
                      <SelectItem value="Baja Ji">Baja Ji</SelectItem>
                      <SelectItem value="Haji Sab">Haji Sab</SelectItem>
                      <SelectItem value="Supreme Chacha">Supreme Chacha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="flex items-center justify-between px-4 py-3.5 border border-zinc-100 bg-zinc-50 rounded-xl">
                  <Label className="text-sm font-medium text-zinc-700 cursor-pointer">Mandatory</Label>
                  <input type="checkbox" name="isMandatory" defaultChecked={editingTask?.isMandatory === true} className="w-4 h-4 accent-zinc-900 cursor-pointer" />
                </div>
                <div className="flex items-center justify-between px-4 py-3.5 border border-zinc-100 bg-zinc-50 rounded-xl">
                  <Label className="text-sm font-medium text-zinc-700 cursor-pointer">Active</Label>
                  <input type="checkbox" name="isActive" defaultChecked={editingTask?.isActive !== false} className="w-4 h-4 accent-zinc-900 cursor-pointer" />
                </div>
              </div>
            </div>

            <DialogFooter className="px-7 py-5 border-t border-zinc-100 bg-white flex flex-col items-center gap-2">
              <Button 
                type="submit"
                disabled={upsertMutation.isPending}
                className="w-full h-11 bg-zinc-900 text-white font-semibold text-sm rounded-xl hover:bg-black transition-all"
              >
                {upsertMutation.isPending ? "Saving..." : "Save Task"}
              </Button>
              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors py-1"
              >
                Cancel
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
