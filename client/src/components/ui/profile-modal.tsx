
import { useState, useEffect } from "react";
import { X, User, ChevronRight, Shield, Award, Medal, Zap, LayoutDashboard, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import TechnicalLabel from "@/components/ui/technical-label";

// Avatar images - using DiceBear API for human avatars
const AVATARS = [
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
}

export function ProfileModal({ isOpen, onClose, user }: ProfileModalProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [name, setName] = useState(user?.name || "");
    const [avatar, setAvatar] = useState(user?.avatar || "avatar1");
    const queryClient = useQueryClient();
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            setName(user?.name || "");
            setAvatar(user?.avatar || "avatar1");
            document.body.style.overflow = "hidden";
        } else {
            setIsVisible(false);
            document.body.style.overflow = "auto";
        }
    }, [isOpen, user]);

    const updateProfileMutation = useMutation({
        mutationFn: async (data: { name: string; avatar: string }) => {
            const res = await apiRequest("PATCH", `/api/users/${user?.id}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/user"] });
            toast({ title: "Success", description: "Profile updated successfully." });
            onClose();
        },
        onError: () => {
            toast({ title: "Error", description: "Could not save changes.", variant: "destructive" });
        },
    });

    const handleSave = () => {
        updateProfileMutation.mutate({ name, avatar });
    };

    const getRank = (earnings: number) => {
        if (earnings < 100) return { title: "USELESS", icon: User, color: "text-zinc-500" };
        if (earnings < 1000) return { title: "WORKER", icon: Shield, color: "text-blue-500" };
        if (earnings < 5000) return { title: "SOLDIER", icon: Medal, color: "text-orange-500" };
        return { title: "MAJOR", icon: Award, color: "text-red-500" };
    };

    const rank = getRank(Number(user?.totalEarnings || 0));
    const RankIcon = rank.icon;

    if (!isOpen) return null;

    return (
        <div
            className={cn(
                "fixed inset-0 z-[100] bg-black text-white transition-opacity duration-300 ease-out",
                isVisible ? "opacity-100" : "opacity-0"
            )}
        >
            {/* Close Button */}
            <Button
                variant="ghost"
                onClick={onClose}
                className="absolute top-4 right-4 md:top-8 md:right-8 z-50 text-white/40 hover:text-white hover:bg-white/10 rounded-full w-12 h-12 p-0 transition-all duration-300 hover:rotate-90"
            >
                <X className="w-6 h-6" />
            </Button>

            <div className="max-w-5xl mx-auto h-full flex flex-col justify-center overflow-y-auto no-scrollbar py-8 px-6 md:px-12">

                {/* Header - Compact */}
                <div className={cn(
                    "mb-8 md:mb-10 transition-all duration-500 delay-100 transform max-w-2xl",
                    isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                )}>

                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white mb-2 uppercase">
                        Profile
                    </h1>
                </div>

                {/* Content Grid - Compact Gap */}
                <div className={cn(
                    "grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 transition-all duration-500 delay-200 transform",
                    isVisible ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
                )}>

                    {/* Left Column: Rank Card - Solid Background */}
                    <div className="md:col-span-12 lg:col-span-5">
                        <div className="bg-[#0a0a0a] border border-white/10 p-8 relative overflow-hidden group hover:border-primary/50 transition-colors duration-300">

                            <div className="relative z-10 flex flex-col">
                                <span className="text-xs font-mono tracking-widest text-white/40 uppercase mb-4">Current Rank</span>

                                <div className="flex items-center gap-6 mb-8">
                                    <div className={cn(
                                        "w-20 h-20 flex items-center justify-center border-2 bg-black overflow-hidden",
                                        rank.color.replace('text-', 'border-')
                                    )}>
                                        <img
                                            src={AVATARS.find(a => a.id === avatar)?.url}
                                            alt="Selected Avatar"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <h3 className={cn("text-4xl font-black tracking-tighter uppercase leading-none", rank.color)}>
                                            {rank.title}
                                        </h3>
                                        <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase mt-1">Status: Active</span>
                                    </div>
                                </div>

                                <div className="w-full space-y-4 pt-6 border-t border-white/10">
                                    <div className="flex items-center justify-between text-sm uppercase">
                                        <span className="text-white/50">Total Earnings</span>
                                        <span className="font-mono font-bold">${Number(user?.totalEarnings || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="h-2 w-full bg-white/5 overflow-hidden">
                                        <div className={cn("h-full", rank.color.replace('text-', 'bg-'))} style={{ width: '65%' }}></div>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-white/30 font-mono uppercase">
                                        <span>Start</span>
                                        <span>Next Rank</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Edit Form */}
                    <div className="md:col-span-12 lg:col-span-7 space-y-8">

                        {/* Personal Info - Sleek Comic Style */}
                        <div className="space-y-6">


                            <div className="space-y-6">
                                <div className="group relative">

                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="bg-transparent border-3 border-white/20 hover:border-primary/50 focus:border-primary rounded-none px-4 py-6 text-xl md:text-2xl font-black h-auto transition-all placeholder:text-white/5"
                                        placeholder="ENTER YOUR NAME..."
                                    />
                                    <div className="absolute top-0 right-4 h-full flex items-center">
                                        <Edit2 className="w-4 h-4 text-white/20 group-hover:text-primary transition-colors" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">

                            <div className="grid grid-cols-5 gap-3">
                                {AVATARS.map((av, index) => (
                                    <button
                                        key={av.id}
                                        onClick={() => setAvatar(av.id)}
                                        className={cn(
                                            "aspect-square flex items-center justify-center transition-all duration-300 relative overflow-hidden bg-white/5 hover:bg-white/10 border-3",
                                            avatar === av.id
                                                ? "border-primary shadow-[4px_4px_0px_#000] -translate-x-[2px] -translate-y-[2px]"
                                                : "border-white/10 grayscale opacity-60 hover:opacity-100 hover:grayscale-0 hover:border-white/30"
                                        )}
                                    >
                                        <img
                                            src={av.url}
                                            alt={`Avatar ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-4 flex flex-row items-center gap-4">
                            <Button
                                onClick={handleSave}
                                disabled={updateProfileMutation.isPending}
                                className="h-14 px-10 bg-primary text-black hover:bg-primary/90 font-black uppercase tracking-tighter rounded-none border-3 border-black shadow-[6px_6px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex-1"
                            >
                                {updateProfileMutation.isPending ? "PROCESSING..." : "SAVE_CONFIG"}
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
        </div >
    );
}
