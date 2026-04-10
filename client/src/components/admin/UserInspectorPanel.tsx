import React from "react";
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  ExternalLink,
  Trophy,
  Users,
  Wallet,
  TrendingUp,
  ShieldCheck,
  Activity
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UserInspectorProps {
  user: any | null;
  isOpen: boolean;
  onClose: () => void;
  onViewInCRM?: (email: string) => void;
}

export function UserInspectorPanel({ user, isOpen, onClose, onViewInCRM }: UserInspectorProps) {
  if (!user) return null;

  const handleViewCRM = () => {
    onClose();
    if (onViewInCRM) {
      onViewInCRM(user.email);
    }
  };

  const avatarSrc = (() => {
    if (user.avatar && user.avatar !== "default" && user.avatar !== "") return user.avatar;
    if (user.profilePicture && user.profilePicture !== "") return user.profilePicture;
    return null;
  })();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-0 border-[1.5px] border-[#111] bg-white rounded-[2rem] overflow-hidden shadow-2xl gap-0 [&>button]:hidden">
        
        {/* Header */}
        <DialogHeader className="p-0">
          <div className="p-6 border-b-[1.5px] border-[#111]/10 flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Profile Picture */}
              <div className="w-16 h-16 border-[1.5px] border-[#111]/20 rounded-2xl overflow-hidden bg-zinc-100 shrink-0 flex items-center justify-center">
                {avatarSrc ? (
                  <img 
                    src={avatarSrc} 
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.style.display = "none";
                      const fallback = img.parentElement?.querySelector(".avatar-fallback");
                      if (fallback) (fallback as HTMLElement).style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className={cn("avatar-fallback w-full h-full items-center justify-center", avatarSrc ? "hidden" : "flex")}
                >
                  <User className="w-8 h-8 text-zinc-300" />
                </div>
              </div>
              <div>
                <DialogTitle className="text-xl font-black uppercase tracking-tighter text-[#111] mb-1">
                  {user.firstName} {user.lastName}
                </DialogTitle>
                <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                  {user.email}
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 border-2 border-[#111] bg-zinc-200 rounded-full font-black text-[8px] tracking-widest uppercase text-[#111]">
                    <Trophy size={8} />
                    {user.rank || "Useless"}
                  </span>
                  {user.isVerified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 border-[1px] border-green-200 rounded-full font-black text-[8px] tracking-widest uppercase text-green-600">
                      <ShieldCheck size={8} />
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-black/5 shrink-0"
              onClick={onClose}
            >
              <X size={16} />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">

          {/* Earnings vs Balance */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-zinc-50 border-[1.5px] border-[#111]/10 rounded-2xl space-y-2">
              <div className="flex items-center gap-1.5 text-zinc-400">
                <TrendingUp size={12} />
                <span className="text-[9px] font-black uppercase tracking-widest">Total Earned</span>
              </div>
              <div className="text-xl font-black tabular-nums text-[#111]">
                PKR {parseFloat(user.totalEarnings || "0").toLocaleString()}
              </div>
            </div>
            <div className="p-4 bg-primary/5 border-[1.5px] border-primary/20 rounded-2xl space-y-2">
              <div className="flex items-center gap-1.5 text-primary/60">
                <Wallet size={12} />
                <span className="text-[9px] font-black uppercase tracking-widest">Available</span>
              </div>
              <div className="text-xl font-black tabular-nums text-primary">
                PKR {parseFloat(user.availableBalance || "0").toLocaleString()}
              </div>
            </div>
          </div>

          {/* Referral Count */}
          <div>
            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">
              Referrals
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-4 bg-white border-[1.5px] border-[#111]/10 rounded-2xl">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border-[1px] border-blue-100">
                    <Users size={13} />
                  </div>
                  <span className="text-[10px] font-black uppercase text-zinc-500">Direct (L1)</span>
                </div>
                <span className="text-lg font-black tabular-nums">{user.level1Count || 0}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-white border-[1.5px] border-[#111]/10 rounded-2xl">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center border-[1px] border-orange-100">
                    <Users size={13} />
                  </div>
                  <span className="text-[10px] font-black uppercase text-zinc-500">Network (L2)</span>
                </div>
                <span className="text-lg font-black tabular-nums">{user.level2Count || 0}</span>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">
              Contact Info
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-zinc-50 border-[1.5px] border-[#111]/5 rounded-xl">
                <Mail size={13} className="text-zinc-400 shrink-0" />
                <span className="text-xs font-bold text-[#111] truncate">{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-3 p-3 bg-zinc-50 border-[1.5px] border-[#111]/5 rounded-xl">
                  <Phone size={13} className="text-zinc-400 shrink-0" />
                  <span className="text-xs font-bold text-[#111]">{user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-3 p-3 bg-zinc-50 border-[1.5px] border-[#111]/5 rounded-xl">
                <Activity size={13} className="text-zinc-400 shrink-0" />
                <span className="text-xs font-bold text-[#111]">
                  Score: {parseFloat(user.performanceScore || "0").toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 pt-0">
          <Button
            onClick={handleViewCRM}
            className="w-full h-12 bg-[#111] text-white hover:bg-primary hover:text-white border-[1.5px] border-[#111] rounded-full font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <ExternalLink size={14} />
            View Full Profile in CRM
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
