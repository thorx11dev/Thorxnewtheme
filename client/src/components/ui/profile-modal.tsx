import { useState, useEffect, useRef } from "react";
import { X, User, Edit2, Camera, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ElasticStack } from "@/components/ui/elastic-stack";
import {
  getRankDef,
  resolveAvatarUrl,
  ALL_AVATARS,
  getDefaultAvatarUrl,
  type RankAvatar,
} from "@/lib/rankAvatars";

// Legacy export — consumed by AdminHeader and other components
export const AVATARS = ALL_AVATARS;

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  activeRefsCount?: number;
}

export function ProfileModal({ isOpen, onClose, user, activeRefsCount = 0 }: ProfileModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const initialName = user?.name || (user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "");
  const [name, setName] = useState(initialName);
  const [avatar, setAvatar] = useState(user?.avatar || "default");
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(user?.profilePicture || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Current rank config
  const rankDef = getRankDef(user?.rank);

  // Only show current rank's avatars in the selector
  const rankAvatars: RankAvatar[] = rankDef.avatars;

  // Ensure avatar is always valid for the current rank
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      const currentName = user?.name || (user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "");
      setName(currentName);

      // If saved avatar belongs to this rank, keep it; otherwise assign rank default
      const savedAvatar = user?.avatar;
      const isInCurrentRank = savedAvatar && rankDef.avatars.some((a) => a.id === savedAvatar);
      if (!savedAvatar || savedAvatar === "default" || (!isInCurrentRank && savedAvatar !== "custom")) {
        setAvatar(rankDef.defaultAvatarId);
      } else {
        setAvatar(savedAvatar);
      }

      setUploadedPhotoUrl(user?.profilePicture || null);
      document.body.style.overflow = "hidden";
    } else {
      setIsVisible(false);
      document.body.style.overflow = "auto";
    }
  }, [isOpen, user, rankDef]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 5MB.", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setUploadedPhotoUrl(base64);
      setAvatar("custom");
      setIsUploading(false);
    };
    reader.onerror = () => {
      toast({ title: "Upload failed", description: "Could not read the image.", variant: "destructive" });
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; avatar: string; profilePicture?: string }) => {
      const res = await apiRequest("PATCH", "/api/profile", data);
      return res.json();
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ["auth"] });
      const previousUser = queryClient.getQueryData(["auth"]);
      queryClient.setQueryData(["auth"], (old: any) => ({
        ...old,
        name: newData.name,
        avatar: newData.avatar,
        profilePicture: newData.profilePicture,
      }));
      onClose();
      return { previousUser };
    },
    onSuccess: (updatedUser) => {
      if (updatedUser) queryClient.setQueryData(["auth"], updatedUser);
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
      queryClient.invalidateQueries({ queryKey: ["earnings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast({ title: "Profile Updated", description: "Your changes have been saved." });
    },
    onError: (_err, _newData, context: any) => {
      if (context?.previousUser) queryClient.setQueryData(["auth"], context.previousUser);
      toast({ title: "Error", description: "Could not save changes.", variant: "destructive" });
    },
  });

  const handleSave = () => {
    const payload: any = { name, avatar };
    if (avatar === "custom" && uploadedPhotoUrl) {
      payload.profilePicture = uploadedPhotoUrl;
    } else if (avatar !== "custom") {
      payload.profilePicture = null;
    }
    updateProfileMutation.mutate(payload);
  };

  // Resolve what to show in the avatar preview
  const previewSrc =
    avatar === "custom" && uploadedPhotoUrl
      ? uploadedPhotoUrl
      : resolveAvatarUrl(avatar, user?.rank);

  const getNextRankReqs = (earnings: number, refs: number) => {
    if (earnings < 2500 || refs < 5)   return { name: "MUNNA",           reqEarned: 2500,  reqRefs: 5 };
    if (earnings < 5000 || refs < 10)  return { name: "BAWA JI",         reqEarned: 5000,  reqRefs: 10 };
    if (earnings < 10000 || refs < 15) return { name: "HAJI SAAB",       reqEarned: 10000, reqRefs: 15 };
    if (earnings < 25000 || refs < 25) return { name: "CHACHA SUPREME",  reqEarned: 25000, reqRefs: 25 };
    return null;
  };

  const nextRank = getNextRankReqs(Number(user?.totalEarnings || 0), activeRefsCount);
  const isAdmin = user?.role === "admin" || user?.role === "founder" || user?.role === "team";

  const getRankDetails = (rankTitle?: string) => {
    if (isAdmin) {
      let displayTitle = "REGULAR";
      if (user?.role === "founder") displayTitle = "FOUNDER";
      if (user?.role === "admin") displayTitle = "ADMIN";
      return { title: displayTitle };
    }
    return { title: rankTitle?.toUpperCase() || "NAWA AYA" };
  };

  const rank = getRankDetails(user?.rank);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] bg-black text-white transition-opacity duration-300 ease-out overflow-y-auto",
        isVisible ? "opacity-100" : "opacity-0"
      )}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Close Button */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 md:top-6 md:right-6 z-50 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-all duration-300 hover:rotate-90"
      >
        <X className="w-5 h-5 md:w-6 md:h-6" />
      </button>

      {/* Page layout */}
      <div className="min-h-full flex flex-col justify-center px-5 py-16 md:px-12 md:py-12 max-w-5xl mx-auto">

        {/* Header */}
        <div className={cn(
          "mb-8 transition-all duration-500 delay-100",
          isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        )}>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white uppercase">Profile</h1>
        </div>

        {/* Two-column content */}
        <div className={cn(
          "grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10 transition-all duration-500 delay-200",
          isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
        )}>

          {/* ── Left: Preview + Rank Card ── */}
          <div className="lg:col-span-5">
            <div className="bg-[#0a0a0a] border border-white/10 p-6 md:p-8 relative overflow-hidden hover:border-white/20 transition-colors duration-300 h-full">

              {/* Avatar + name row */}
              <div className="flex items-center gap-5 mb-8">
                {/* Clickable avatar preview */}
                <div className="relative group/avatar flex-shrink-0">
                  <div className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center border-2 border-zinc-500 bg-black overflow-hidden">
                    {previewSrc ? (
                      <img src={previewSrc} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-white/20" />
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    title="Upload photo"
                  >
                    {isUploading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5 text-white" />
                    )}
                  </button>
                </div>

                {/* Name + rank badge */}
                <div className="min-w-0">
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1.5">Current Profile</p>
                  <p className="text-white font-black text-lg md:text-xl uppercase tracking-tighter leading-tight truncate">
                    {name || "—"}
                  </p>
                  <div className={cn(
                    "mt-2 inline-block text-xs font-black text-white px-3 py-0.5 uppercase tracking-widest",
                    rankDef.bgColor
                  )}>
                    {rank.title}
                  </div>
                </div>
              </div>

              {/* Rank progress */}
              <div className="space-y-4 pt-6 border-t border-white/10">
                {!isAdmin && (
                  <div className="flex items-center justify-between text-sm uppercase">
                    <span className="text-white/40 text-xs font-bold">Total Earnings</span>
                    <span className="font-mono font-bold text-sm">PKR {Number(user?.totalEarnings || 0).toFixed(2)}</span>
                  </div>
                )}
                {!isAdmin && nextRank ? (
                  <>
                    <div>
                      <div className="flex justify-between text-[10px] font-bold uppercase text-white/40 mb-1.5">
                        <span>Earnings</span>
                        <span>{Number(user?.totalEarnings || 0).toFixed(0)} / {nextRank.reqEarned}</span>
                      </div>
                      <div className="relative h-1 w-full bg-white/5 overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-primary transition-all" style={{ width: `${Math.min((Number(user?.totalEarnings || 0) / nextRank.reqEarned) * 100, 100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] font-bold uppercase text-white/40 mb-1.5">
                        <span>Referrals</span>
                        <span>{activeRefsCount} / {nextRank.reqRefs}</span>
                      </div>
                      <div className="relative h-1 w-full bg-white/5 overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-white transition-all" style={{ width: `${Math.min((activeRefsCount / nextRank.reqRefs) * 100, 100)}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-white/30 font-mono uppercase pt-2">
                      <span>{rank.title}</span>
                      <span>Next: {nextRank.name}</span>
                    </div>
                  </>
                ) : !isAdmin && (
                  <div className="flex items-center justify-between text-[10px] text-white/30 font-mono uppercase pt-2">
                    <span>{rank.title}</span>
                    <span className="text-amber-500">Max Rank Achieved</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: Edit form ── */}
          <div className="lg:col-span-7 flex flex-col gap-6 md:gap-8">

            {/* Username */}
            <div className="space-y-3">
              <span className="text-[10px] font-black tracking-widest text-white/40 uppercase">Username</span>
              <div className="group relative">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-transparent border-2 border-white/20 hover:border-white/40 focus:border-primary rounded-none px-4 py-5 text-lg md:text-2xl font-black h-auto transition-all placeholder:text-white/10"
                  placeholder="CHOOSE A USERNAME..."
                />
                <div className="absolute top-0 right-4 h-full flex items-center pointer-events-none">
                  <Edit2 className="w-4 h-4 text-white/20 group-hover:text-primary transition-colors" />
                </div>
              </div>
            </div>

            {/* Rank-locked avatar selector */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest text-white/40 uppercase">
                  {rankDef.label} Getups
                </span>
                <span className={cn("text-[9px] font-black px-2 py-0.5 uppercase tracking-widest", rankDef.bgColor)}>
                  {rankAvatars.length} styles
                </span>
                {!isAdmin && (
                  <span className="flex items-center gap-1 text-[9px] text-white/30 uppercase tracking-widest ml-auto">
                    <Lock className="w-3 h-3" /> Rank locked
                  </span>
                )}
              </div>
              <ElasticStack
                items={rankAvatars.map((av) => ({ id: av.id, image: av.url, name: av.label }))}
                selectedId={avatar !== "custom" ? avatar : null}
                onItemSelect={(id) => { setAvatar(id as string); setUploadedPhotoUrl(null); }}
                itemSize={54}
                overlap={26}
                pushForce={20}
              />
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-auto">
              <Button
                onClick={handleSave}
                disabled={updateProfileMutation.isPending || isUploading}
                className="h-12 md:h-14 px-8 bg-primary text-black hover:bg-primary/90 font-black uppercase tracking-tighter rounded-none border-2 border-black shadow-[4px_4px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex-1 text-sm md:text-base"
              >
                {updateProfileMutation.isPending ? "SAVING..." : "SAVE CHANGES"}
              </Button>
              <Button
                variant="ghost"
                onClick={onClose}
                className="h-12 md:h-14 px-8 text-white/40 hover:text-white hover:bg-white/5 font-black uppercase tracking-tighter rounded-none border-2 border-white/10 transition-all sm:flex-none text-sm md:text-base"
              >
                CANCEL
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
