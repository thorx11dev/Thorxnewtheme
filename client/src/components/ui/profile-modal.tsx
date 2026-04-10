import { useState, useEffect, useRef } from "react";
import { X, User, Edit2, Upload, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Exported so other components (e.g. AdminHeader) can use avatar URLs directly
export const AVATARS = [
  { id: "avatar1", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" },
  { id: "avatar2", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka" },
  { id: "avatar3", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna" },
  { id: "avatar4", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Max" },
  { id: "avatar5", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie" },
  { id: "avatar6", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver" },
  { id: "avatar7", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma" },
  { id: "avatar8", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack" },
  { id: "avatar9", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mia" },
  { id: "avatar10", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie" },
];

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
  const [avatar, setAvatar] = useState(user?.avatar || "avatar1");
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(user?.profilePicture || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      const currentName = user?.name || (user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "");
      setName(currentName);
      setAvatar(user?.avatar || "avatar1");
      setUploadedPhotoUrl(user?.profilePicture || null);
      document.body.style.overflow = "hidden";
    } else {
      setIsVisible(false);
      document.body.style.overflow = "auto";
    }
  }, [isOpen, user]);

  // Handle local file upload — convert to base64 and send to backend
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
      setAvatar("custom"); // signal that custom photo is active
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
      // Explicitly clear profilePicture when a preset avatar is chosen
      payload.profilePicture = null;
    }
    updateProfileMutation.mutate(payload);
  };

  // Current preview: custom upload takes priority over selected avatar
  const previewSrc =
    avatar === "custom" && uploadedPhotoUrl
      ? uploadedPhotoUrl
      : AVATARS.find((a) => a.id === avatar)?.url;

  const getNextRankReqs = (earnings: number, refs: number) => {
    if (earnings < 2500 || refs < 5)  return { name: "WORKER",  reqEarned: 2500,  reqRefs: 5 };
    if (earnings < 5000 || refs < 10) return { name: "SOLDIER", reqEarned: 5000,  reqRefs: 10 };
    if (earnings < 10000 || refs < 15) return { name: "CAPTAIN", reqEarned: 10000, reqRefs: 15 };
    if (earnings < 25000 || refs < 25) return { name: "GENERAL", reqEarned: 25000, reqRefs: 25 };
    return null;
  };

  const nextRank = getNextRankReqs(Number(user?.totalEarnings || 0), activeRefsCount);

  const isAdmin = user?.role === 'admin' || user?.role === 'founder' || user?.role === 'team';

  const getRankDetails = (rankTitle?: string) => {
    if (isAdmin) {
      let displayTitle = "REGULAR";
      if (user?.role === 'founder') displayTitle = "FOUNDER";
      if (user?.role === 'admin') displayTitle = "ADMIN";
      
      return { title: displayTitle, color: "text-zinc-500", bg: "bg-zinc-500", border: "border-zinc-500" };
    }
    const title = rankTitle?.toUpperCase() || "USELESS";
    // Force silver/zinc style for all ranks as requested
    return { title: title, color: "text-zinc-500", bg: "bg-zinc-500", border: "border-zinc-500" };
  };

  const rank = getRankDetails(user?.rank);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] bg-black text-white transition-opacity duration-300 ease-out",
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
      <Button
        variant="ghost"
        onClick={onClose}
        className="absolute top-4 right-4 md:top-8 md:right-8 z-50 text-white/40 hover:text-white hover:bg-white/10 rounded-full w-12 h-12 p-0 transition-all duration-300 hover:rotate-90"
      >
        <X className="w-6 h-6" />
      </Button>

      <div className="max-w-5xl mx-auto h-full flex flex-col justify-center overflow-y-auto no-scrollbar py-8 px-6 md:px-12">

        {/* Header */}
        <div className={cn("mb-8 md:mb-10 transition-all duration-500 delay-100 transform max-w-2xl", isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0")}>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white mb-2 uppercase">Profile</h1>
        </div>

        {/* Content Grid */}
        <div className={cn("grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 transition-all duration-500 delay-200 transform", isVisible ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0")}>

          {/* Left: Rank / Preview Card */}
          <div className="md:col-span-12 lg:col-span-5">
            <div className="bg-[#0a0a0a] border border-white/10 p-8 relative overflow-hidden group hover:border-primary/50 transition-colors duration-300">
              <div className="relative z-10 flex flex-col">
                <div className="flex items-center gap-6 mb-8">
                  {/* Avatar preview with upload overlay */}
                  <div className="relative group/avatar">
                    <div className={cn("w-20 h-20 flex items-center justify-center border-2 bg-black overflow-hidden", rank.color.replace("text-", "border-"))}>
                      {previewSrc ? (
                        <img src={previewSrc} alt="Selected Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-10 h-10 text-white/20" />
                      )}
                    </div>
                    {/* Upload hover overlay */}
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
                  <div className="flex flex-col">
                    <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 leading-none">Security Rank</div>
                    <div className="text-2xl md:text-3xl font-black text-black bg-zinc-500 border-2 border-black px-4 py-1.5 tracking-tighter uppercase shadow-[4px_4px_0px_#000] inline-block">
                      {rank.title}
                    </div>
                  </div>
                </div>

                {/* Rank progress */}
                <div className="w-full space-y-4 pt-6 border-t border-white/10">
                  {!isAdmin && (
                    <div className="flex items-center justify-between text-sm uppercase">
                      <span className="text-white/50">Total Earnings</span>
                      <span className="font-mono font-bold">PKR {Number(user?.totalEarnings || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {!isAdmin && nextRank ? (
                    <>
                      <div className="mb-1 flex justify-between text-[10px] font-bold uppercase text-white/50 pt-2 border-t border-white/5">
                        <span>Earnings Required</span>
                        <span>{Number(user?.totalEarnings || 0).toFixed(0)} / {nextRank.reqEarned}</span>
                      </div>
                      <div className="relative h-1.5 w-full bg-white/5 overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${Math.min((Number(user?.totalEarnings || 0) / nextRank.reqEarned) * 100, 100)}%` }} />
                      </div>
                      <div className="mb-1 flex justify-between text-[10px] font-bold uppercase text-white/50 pt-2">
                        <span>Referrals Required</span>
                        <span>{activeRefsCount} / {nextRank.reqRefs}</span>
                      </div>
                      <div className="relative h-1.5 w-full bg-white/5 overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-white" style={{ width: `${Math.min((activeRefsCount / nextRank.reqRefs) * 100, 100)}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-white/30 font-mono uppercase mt-4">
                        <span>{rank.title}</span>
                        <span>Next: {nextRank.name}</span>
                      </div>
                    </>
                  ) : !isAdmin && (
                    <div className="flex items-center justify-between text-[10px] text-white/30 font-mono uppercase pt-4">
                      <span>{rank.title}</span>
                      <span className="text-amber-500">Max Rank Achieved</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Edit Form */}
          <div className="md:col-span-12 lg:col-span-7 space-y-8">

            {/* Name Input */}
            <div className="space-y-6">
              <span className="text-xs font-mono tracking-widest text-white/40 uppercase">Username</span>
              <div className="group relative">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-transparent border-3 border-white/20 hover:border-primary/50 focus:border-primary rounded-none px-4 py-6 text-xl md:text-2xl font-black h-auto transition-all placeholder:text-white/10"
                  placeholder="CHOOSE A USERNAME..."
                />
                <div className="absolute top-0 right-4 h-full flex items-center">
                  <Edit2 className="w-4 h-4 text-white/20 group-hover:text-primary transition-colors" />
                </div>
              </div>
            </div>

            {/* Upload from device button */}
            <div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full flex items-center justify-center gap-3 h-12 border-3 border-dashed border-white/20 hover:border-primary/50 text-white/40 hover:text-primary transition-all font-black text-xs uppercase tracking-widest"
              >
                <Upload className="w-4 h-4" />
                {isUploading ? "Uploading..." : "Upload Photo From Device"}
              </button>
            </div>

            {/* Avatar Grid */}
            <div className="space-y-3">
              <span className="text-xs font-mono tracking-widest text-white/40 uppercase">Or Choose an Avatar</span>
              <div className="grid grid-cols-5 gap-3">
                {AVATARS.map((av, index) => (
                  <button
                    key={av.id}
                    onClick={() => { setAvatar(av.id); setUploadedPhotoUrl(null); }}
                    className={cn(
                      "aspect-square flex items-center justify-center transition-all duration-300 relative overflow-hidden bg-white/5 hover:bg-white/10 border-3",
                      avatar === av.id && avatar !== "custom"
                        ? "border-primary shadow-[4px_4px_0px_#000] -translate-x-[2px] -translate-y-[2px]"
                        : "border-white/10 grayscale opacity-60 hover:opacity-100 hover:grayscale-0 hover:border-white/30"
                    )}
                  >
                    <img src={av.url} alt={`Avatar ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-row items-center gap-4">
              <Button
                onClick={handleSave}
                disabled={updateProfileMutation.isPending || isUploading}
                className="h-14 px-10 bg-primary text-black hover:bg-primary/90 font-black uppercase tracking-tighter rounded-none border-3 border-black shadow-[6px_6px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex-1"
              >
                {updateProfileMutation.isPending ? "SAVING..." : "SAVE"}
              </Button>
              <Button
                variant="ghost"
                onClick={onClose}
                className="h-14 px-8 text-white/40 hover:text-white hover:bg-white/5 font-black uppercase tracking-tighter rounded-none border-3 border-white/10 transition-all flex-1"
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
