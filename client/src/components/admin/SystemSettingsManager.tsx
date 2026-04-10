import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, Settings, DollarSign, Network, Trash2, Plus, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdNetwork {
  id: string;
  name: string;
  zoneId: string;
  type: string;
  priority: number;
  isActive: boolean;
}

export function SystemSettingsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [localConfigs, setLocalConfigs] = useState<Record<string, any>>({});
  
  // Fetch specific configuration keys
  const configKeys = ["MIN_PAYOUT", "SYSTEM_FEE", "L1_BONUS", "L2_BONUS", "AD_NETWORKS", "CPA_NETWORKS"];
  
  const { data: dbConfigs, isLoading } = useQuery<{ key: string; value: any }[]>({
    queryKey: ["/api/admin/config/bulk"],
    queryFn: async () => {
      // In a real app, I'd have a bulk endpoint, but for now I'll map over keys or fetch all
      const res = await apiRequest("GET", "/api/admin/config");
      const data = await res.json();
      return data.configs;
    }
  });

  useEffect(() => {
    if (dbConfigs) {
      const configMap: Record<string, any> = {};
      dbConfigs.forEach(c => {
        configMap[c.key] = c.value;
      });
      setLocalConfigs(configMap);
    }
  }, [dbConfigs]);

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const res = await apiRequest("PATCH", `/api/admin/config/${key}`, { value });
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/config/bulk"] });
      toast({
        title: "Configuration Saved",
        description: `Successfully synchronized ${variables.key} protocol.`,
      });
    },
    onError: () => {
      toast({
        title: "Sync Error",
        description: "Failed to broadcast configuration to the backend.",
        variant: "destructive"
      });
    }
  });

  const handleSave = (key: string) => {
    saveMutation.mutate({ key, value: localConfigs[key] });
  };

  const updateValue = (key: string, value: any) => {
    setLocalConfigs(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="p-20 text-center animate-in fade-in duration-500">
        <div className="w-10 h-10 border-[3px] border-[#111] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <p className="font-bold text-xs uppercase tracking-[0.2em] text-[#111]/40">Accessing Core Config...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 w-full animate-in slide-in-from-bottom-2 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase text-[#111]">System Protocol</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Economic Constants */}
        <div className="bg-background border-[1.5px] border-[#111] rounded-[2rem] p-8 overflow-hidden shadow-sm hover:shadow-md transition-shadow relative group flex flex-col">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 bg-white border-[1.5px] border-[#111]/20 flex items-center justify-center rounded-full shadow-sm group-hover:border-primary transition-colors">
              <DollarSign className="w-5 h-5 text-zinc-500 group-hover:text-primary transition-colors" />
            </div>
            <div>
              <h3 className="font-black text-xl uppercase text-[#111] tracking-tight">Economic Thresholds</h3>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-tight">Platform-wide financial variables</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <EconomicControl 
              label="Minimum Payout (PKR)" 
              value={localConfigs["MIN_PAYOUT"] || 0} 
              onChange={(val: number) => updateValue("MIN_PAYOUT", val)}
              onSave={() => handleSave("MIN_PAYOUT")}
              isLoading={saveMutation.isPending && saveMutation.variables?.key === "MIN_PAYOUT"}
            />
            
            <EconomicControl 
              label="System Fee (%)" 
              value={localConfigs["SYSTEM_FEE"] || 0} 
              onChange={(val: number) => updateValue("SYSTEM_FEE", val)}
              onSave={() => handleSave("SYSTEM_FEE")}
              isLoading={saveMutation.isPending && saveMutation.variables?.key === "SYSTEM_FEE"}
            />

            <div className="grid grid-cols-2 gap-6">
              <EconomicControl 
                label="L1 Bonus (%)" 
                value={localConfigs["L1_BONUS"] || 0} 
                onChange={(val: number) => updateValue("L1_BONUS", val)}
                onSave={() => handleSave("L1_BONUS")}
                isLoading={saveMutation.isPending && saveMutation.variables?.key === "L1_BONUS"}
              />
              <EconomicControl 
                label="L2 Bonus (%)" 
                value={localConfigs["L2_BONUS"] || 0} 
                onChange={(val: number) => updateValue("L2_BONUS", val)}
                onSave={() => handleSave("L2_BONUS")}
                isLoading={saveMutation.isPending && saveMutation.variables?.key === "L2_BONUS"}
              />
            </div>
          </div>
        </div>

        {/* Global Settings */}
        <div className="bg-background border-[1.5px] border-[#111] rounded-[2rem] p-8 overflow-hidden shadow-sm hover:shadow-md transition-shadow relative flex flex-col group">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 bg-white border-[1.5px] border-[#111]/20 flex items-center justify-center rounded-full shadow-sm group-hover:border-primary transition-colors">
              <Settings className="w-5 h-5 text-zinc-500 group-hover:text-primary transition-colors" />
            </div>
            <div>
              <h3 className="font-black text-xl uppercase text-[#111] tracking-tight">Core Integration</h3>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-tight">Platform localization & identity</p>
            </div>
          </div>

          <div className="space-y-6 flex-1 flex flex-col justify-between">
            <div className="p-6 border-[1.5px] border-[#111]/10 bg-white/50 rounded-[1.5rem]">
              <TechnicalLabel text="CURRENCY SYMBOL" className="text-[#111]/50 mb-3 font-black text-[9px] uppercase tracking-widest" />
              <div className="flex gap-3">
                <Input 
                  value="PKR" 
                  disabled 
                  className="flex-1 h-10 bg-white border-[1.5px] border-[#111]/20 focus-visible:ring-0 font-bold text-sm rounded-full tracking-tight text-[#111]" 
                />
                <div className="bg-zinc-100 border-[1.5px] border-zinc-200 text-zinc-400 px-5 flex items-center justify-center font-black text-[10px] rounded-full uppercase tracking-widest">
                  Locked
                </div>
              </div>
              <p className="text-[9px] font-bold text-zinc-400 mt-3 uppercase tracking-widest">Currency is locked to Pakistani Rupee (PKR).</p>
            </div>

            <div className="p-6 border-[1.5px] border-[#111]/10 bg-white/50 rounded-[1.5rem] opacity-70">
              <TechnicalLabel text="API ENDPOINT SECURITY" className="text-[#111]/50 mb-3 font-black text-[9px] uppercase tracking-widest" />
              <div className="h-10 bg-zinc-100 border-[1.5px] border-dashed border-[#111]/20 rounded-full flex items-center justify-center font-black text-[9px] uppercase tracking-widest text-[#111]/30">
                Encrypted Connection Active
              </div>
            </div>
          </div>
        </div>

        {/* Waterfall Management - Full Width */}
        <div className="lg:col-span-2">
          <WaterfallSection 
            title="Ad Network Waterfall" 
            networks={localConfigs["AD_NETWORKS"] || []}
            onUpdate={(networks: AdNetwork[]) => updateValue("AD_NETWORKS", networks)}
            onSave={() => handleSave("AD_NETWORKS")}
            isLoading={saveMutation.isPending && saveMutation.variables?.key === "AD_NETWORKS"}
            icon={<Network className="w-5 h-5 text-zinc-500 group-hover:text-primary transition-colors" />}
          />
        </div>

        <div className="lg:col-span-2">
          <WaterfallSection 
            title="CPA Network Waterfall" 
            networks={localConfigs["CPA_NETWORKS"] || []}
            onUpdate={(networks: AdNetwork[]) => updateValue("CPA_NETWORKS", networks)}
            onSave={() => handleSave("CPA_NETWORKS")}
            isLoading={saveMutation.isPending && saveMutation.variables?.key === "CPA_NETWORKS"}
            icon={<Network className="w-5 h-5 text-zinc-500 group-hover:text-primary transition-colors" />}
          />
        </div>

      </div>
    </div>
  );
}

function EconomicControl({ label, value, onChange, onSave, isLoading }: any) {
  return (
    <div className="space-y-2">
      <TechnicalLabel text={label} className="text-[#111]/50 font-black text-[9px] uppercase tracking-widest pl-1" />
      <div className="flex gap-3">
        <Input 
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="flex-1 h-10 bg-white border-[1.5px] border-[#111] rounded-full focus-visible:ring-primary shadow-sm font-bold text-sm text-[#111]"
        />
        <Button 
          onClick={onSave}
          disabled={isLoading}
          className="h-10 bg-[#111] hover:bg-primary text-white border-[1.5px] border-[#111] rounded-full font-black text-[10px] uppercase transition-all shadow-sm px-6"
        >
          {isLoading ? "Saving..." : "Update"}
        </Button>
      </div>
    </div>
  );
}

function WaterfallSection({ title, networks, onUpdate, onSave, isLoading, icon }: any) {
  const addNetwork = () => {
    const newNetwork: AdNetwork = {
      id: `nw_${Date.now()}`,
      name: "New Network",
      zoneId: "",
      type: "video",
      priority: networks.length + 1,
      isActive: true
    };
    onUpdate([...networks, newNetwork]);
  };

  const removeNetwork = (id: string) => {
    onUpdate(networks.filter((n: AdNetwork) => n.id !== id));
  };

  const updateNetwork = (id: string, field: string, value: any) => {
    onUpdate(networks.map((n: AdNetwork) => n.id === id ? { ...n, [field]: value } : n));
  };

  return (
    <div className="bg-background border-[1.5px] border-[#111] rounded-[2rem] overflow-hidden shadow-sm group hover:shadow-md transition-all">
      <div className="p-6 md:p-8 border-b-[1.5px] border-[#111]/10 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white border-[1.5px] border-[#111]/20 flex items-center justify-center rounded-full shadow-sm group-hover:border-primary transition-colors">
            {icon}
          </div>
          <div>
            <h3 className="font-black text-xl uppercase text-[#111] tracking-tight">{title}</h3>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-tight">Priority-based failover list</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button 
            onClick={addNetwork}
            variant="outline"
            className="h-10 border-[1.5px] border-[#111] text-[#111] rounded-full font-black text-[10px] uppercase hover:bg-black/5 hover:text-[#111] shadow-sm transition-all flex items-center gap-1.5"
          >
            <Plus size={14} className="text-[#111]" />
            <span className="hidden sm:inline">Add</span>
          </Button>
          <Button 
            onClick={onSave}
            disabled={isLoading}
            className="h-10 bg-[#111] hover:bg-primary text-white border-[1.5px] border-[#111] rounded-full font-black text-[10px] uppercase shadow-sm transition-all flex items-center gap-1.5 px-6"
          >
            <Save size={14} />
            {isLoading ? "Saving..." : "Save Config"}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden bg-white/30">
        {networks.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-bold text-[10px] text-zinc-400 uppercase tracking-widest italic">No networks configured in waterfall</p>
          </div>
        ) : (
          <div className="divide-y-[1.5px] divide-[#111]/10">
            {[...networks].sort((a: AdNetwork, b: AdNetwork) => a.priority - b.priority).map((nw: AdNetwork, idx: number) => (
              <div key={nw.id} className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center hover:bg-black/[0.02] transition-colors relative">
                
                <div className="flex flex-col gap-1 shrink-0 bg-white border-[1.5px] border-[#111]/10 p-1 rounded-full shadow-sm">
                  <button 
                    onClick={() => updateNetwork(nw.id, "priority", Math.max(1, nw.priority - 1))}
                    className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-[#111] hover:bg-black/5 rounded-full transition-colors"
                  >
                    <ArrowUp size={12} strokeWidth={3} />
                  </button>
                  <div className="w-6 h-6 text-[#111] flex items-center justify-center font-black text-xs">
                    {nw.priority}
                  </div>
                  <button 
                    onClick={() => updateNetwork(nw.id, "priority", nw.priority + 1)}
                    className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-[#111] hover:bg-black/5 rounded-full transition-colors"
                  >
                    <ArrowDown size={12} strokeWidth={3} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 w-full">
                  <div className="space-y-1.5">
                    <TechnicalLabel text="NETWORK NAME" className="text-[#111]/50 font-black text-[9px] uppercase tracking-widest pl-1" />
                    <Input 
                      value={nw.name}
                      onChange={(e) => updateNetwork(nw.id, "name", e.target.value)}
                      className="h-10 border-[1.5px] border-[#111]/20 bg-white font-bold text-xs rounded-full shadow-sm focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <TechnicalLabel text="ZONE ID" className="text-[#111]/50 font-black text-[9px] uppercase tracking-widest pl-1" />
                    <Input 
                      value={nw.zoneId}
                      onChange={(e) => updateNetwork(nw.id, "zoneId", e.target.value)}
                      className="h-10 border-[1.5px] border-[#111]/20 bg-white font-mono text-xs rounded-full shadow-sm focus-visible:ring-primary font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <TechnicalLabel text="FORMAT" className="text-[#111]/50 font-black text-[9px] uppercase tracking-widest pl-1" />
                    <select 
                      value={nw.type}
                      onChange={(e) => updateNetwork(nw.id, "type", e.target.value)}
                      className="w-full h-10 border-[1.5px] border-[#111]/20 bg-white font-bold text-xs rounded-full px-4 shadow-sm outline-none focus:ring-1 focus:ring-primary text-[#111] cursor-pointer"
                    >
                      <option value="video">VIDEO_AD</option>
                      <option value="banner">BANNER_AD</option>
                      <option value="native">NATIVE_AD</option>
                      <option value="pop">POP_UNDER</option>
                    </select>
                  </div>
                  <div className="flex items-end gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => updateNetwork(nw.id, "isActive", !nw.isActive)}
                      className={cn(
                        "flex-1 h-10 rounded-full border-[1.5px] font-black text-[9px] tracking-widest uppercase transition-all shadow-sm",
                        nw.isActive ? "bg-primary border-primary text-white hover:bg-primary/90 hover:text-white" : "bg-white border-[#111]/20 text-zinc-500 hover:bg-zinc-100"
                      )}
                    >
                      {nw.isActive ? "ACTIVE" : "OFFLINE"}
                    </Button>
                    <Button 
                      variant="outline"
                      size="icon"
                      onClick={() => removeNetwork(nw.id)}
                      className="h-10 w-10 shrink-0 bg-white border-[1.5px] border-[#111]/20 text-red-500 hover:bg-red-50 hover:border-red-500 rounded-full transition-all shadow-sm"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TechnicalLabel({ text, className }: any) {
  return (
    <div className={cn("font-black tracking-widest uppercase leading-none", className)}>
      {text}
    </div>
  );
}
