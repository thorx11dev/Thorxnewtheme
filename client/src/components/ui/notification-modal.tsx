import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, TrendingUp, User, Bell, Wallet, Shield, Zap, X } from "lucide-react";
import { format, isToday, subDays, isAfter } from "date-fns";
import { cn } from "@/lib/utils";

interface Commission {
    id: string;
    sourceUserId: string;
    amount: string;
    level: number;
    status: string;
    createdAt: string;
    sourceUser: {
        firstName: string;
        lastName: string;
        email: string;
    };
}

interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: string;
    adminName?: string;
    adminRole?: string;
    amount?: string;
    adjustmentType?: string;
    isRead: boolean;
    createdAt: string;
}

interface NotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    commissions: Commission[];
    notifications: Notification[];
    isLoading: boolean;
}

type CombinedNotification = 
    | { type: 'commission'; data: Commission; date: Date }
    | { type: 'financial'; data: Notification; date: Date };

export function NotificationModal({
    isOpen,
    onClose,
    commissions = [],
    notifications = [],
    isLoading
}: NotificationModalProps) {
    const [isVisible, setIsVisible] = React.useState(false);

    // Prevent scroll when modal is open
    React.useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = "hidden";
        } else {
            setIsVisible(false);
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    // Combined Grouping & Sorting Logic
    const groupedItems = React.useMemo(() => {
        const combined: CombinedNotification[] = [
            ...commissions.map(c => ({ type: 'commission' as const, data: c, date: new Date(c.createdAt) })),
            ...notifications.map(n => ({ type: 'financial' as const, data: n, date: new Date(n.createdAt) }))
        ];

        // Sort by newest first
        combined.sort((a, b) => b.date.getTime() - a.date.getTime());

        const groups: { [key: string]: CombinedNotification[] } = {
            "Today": [],
            "This week": [],
            "Earlier": []
        };

        const now = new Date();
        const oneWeekAgo = subDays(now, 7);

        combined.forEach(item => {
            if (isToday(item.date)) {
                groups["Today"].push(item);
            } else if (isAfter(item.date, oneWeekAgo)) {
                groups["This week"].push(item);
            } else {
                groups["Earlier"].push(item);
            }
        });

        return Object.entries(groups).filter(([_, items]) => items.length > 0);
    }, [commissions, notifications]);

    const totalCount = commissions.length + notifications.length;

    const getRoleBadgeColor = (role?: string) => {
        const r = role?.toUpperCase();
        if (r === 'FOUNDER/CEO' || r === 'FOUNDER') return "bg-primary text-black border-primary shadow-[0_0_10px_rgba(255,107,53,0.3)]";
        if (r === 'ADMIN') return "bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.2)]";
        return "bg-zinc-800 text-zinc-400 border-zinc-700";
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[2000] bg-black text-white flex flex-col overflow-y-auto no-scrollbar"
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 md:top-8 md:right-8 z-50 text-white/40 hover:text-white hover:bg-white/10 rounded-full w-12 h-12 flex items-center justify-center transition-all duration-300 hover:rotate-90"
                        aria-label="Close notifications"
                    >
                        <Bell className="w-6 h-6 rotate-12 opacity-50 absolute -top-1 -right-1 blur-sm text-primary" />
                        <span className="relative z-10"><X className="w-6 h-6" /></span>
                    </button>

                    <div className="max-w-2xl mx-auto w-full flex flex-col min-h-full py-12 md:py-24 px-6 relative">

                        {/* Header Section */}
                        <div className="mb-10 md:mb-16">
                            <div className="flex items-center gap-5">
                                <h1 className="text-[42px] md:text-[64px] font-black tracking-tighter text-white uppercase leading-none">
                                    Activity
                                </h1>
                                {totalCount > 0 && (
                                    <div className="flex h-10 w-10 items-center justify-center bg-primary text-black font-black text-lg border-2 border-black shadow-[4px_4px_0px_rgba(255,107,53,0.3)]">
                                        {totalCount}
                                    </div>
                                )}
                            </div>
                            <div className="h-1 w-24 bg-primary mt-4" />
                            <p className="text-white/30 font-mono text-[10px] mt-4 tracking-[0.3em] uppercase">Security & Revenue Stream Active</p>
                        </div>

                        {/* Main Stream Area */}
                        {isLoading ? (
                            <div className="flex-1 flex items-center justify-center py-20">
                                <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
                            </div>
                        ) : totalCount === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="mb-8 relative">
                                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                                    <div className="relative h-32 w-32 border-3 border-white/10 flex items-center justify-center bg-[#0a0a0a]">
                                        <Bell className="w-16 h-16 text-white/10" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Sector Quiet</h3>
                                <p className="text-white/30 text-xs mt-2 font-mono uppercase tracking-widest">No activity detected on your link</p>
                            </div>
                        ) : (
                            <div className="space-y-16 pb-20">
                                {groupedItems.map(([groupName, items]) => (
                                    <div key={groupName} className="space-y-8">
                                        <div className="flex items-center gap-4">
                                            <h2 className="text-xs font-mono tracking-[0.3em] text-white/30 uppercase">
                                                {groupName}
                                            </h2>
                                            <div className="h-[1px] flex-1 bg-white/5" />
                                        </div>

                                        <div className="space-y-4">
                                            {items.map((item, idx) => {
                                                if (item.type === 'commission') {
                                                    const commission = item.data;
                                                    return (
                                                        <motion.div
                                                            key={commission.id}
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: idx * 0.05 }}
                                                            className="group flex items-center gap-6 p-6 bg-[#0a0a0a] border border-white/5 hover:border-primary transition-all cursor-pointer relative"
                                                        >
                                                            <div className="flex h-16 w-16 shrink-0 items-center justify-center border-2 border-white/10 bg-black group-hover:border-primary transition-colors">
                                                                {commission.level === 1 ? (
                                                                    <TrendingUp className="text-primary w-8 h-8" />
                                                                ) : (
                                                                    <User className="text-white w-8 h-8" />
                                                                )}
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-lg leading-tight text-white/90 font-black tracking-tight group-hover:text-white transition-colors uppercase">
                                                                    Received <span className="text-primary">${parseFloat(commission.amount).toFixed(2)}</span> from {commission.sourceUser.firstName}
                                                                </p>
                                                                <div className="flex items-center gap-3 mt-2">
                                                                    <span className="text-[10px] font-mono text-white/30 tracking-widest uppercase">
                                                                        LVL {commission.level} SECTOR REVENUE
                                                                    </span>
                                                                    <div className="w-1 h-1 rounded-full bg-white/10" />
                                                                    <span className="text-[10px] font-mono text-white/30 tracking-widest">
                                                                        {format(item.date, "HH:mm")}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                } else {
                                                    const notification = item.data;
                                                    const isCredit = notification.adjustmentType === 'credit';
                                                    
                                                    return (
                                                        <motion.div
                                                            key={notification.id}
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: idx * 0.05 }}
                                                            className="group flex flex-col gap-4 p-6 bg-[#0a0a0a] border border-white/5 hover:border-white/20 transition-all cursor-pointer relative overflow-hidden"
                                                        >
                                                            {/* Background Glow for Financial Alerts */}
                                                            <div className={cn(
                                                                "absolute -right-10 -bottom-10 w-32 h-32 blur-3xl opacity-10 transition-opacity group-hover:opacity-20",
                                                                isCredit ? "bg-green-500" : "bg-red-500"
                                                            )} />
                                                            
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex items-center gap-4">
                                                                    <div className={cn(
                                                                        "flex h-12 w-12 items-center justify-center border-2 bg-black transition-colors",
                                                                        isCredit ? "border-green-500/50 group-hover:border-green-500" : "border-red-500/50 group-hover:border-red-500"
                                                                    )}>
                                                                        {isCredit ? <Wallet className="text-green-500 w-6 h-6" /> : <Zap className="text-red-500 w-6 h-6" />}
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="text-white font-black text-xs uppercase tracking-widest">{notification.title}</h4>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <span className={cn(
                                                                                "px-2 py-0.5 text-[8px] font-black border uppercase tracking-tighter rounded-full",
                                                                                getRoleBadgeColor(notification.adminRole)
                                                                            )}>
                                                                                {notification.adminRole || "REGULAR"}
                                                                            </span>
                                                                            <span className="text-[9px] text-white/30 font-mono italic">by {notification.adminName}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <span className="text-[10px] font-mono text-white/30 tracking-widest uppercase">
                                                                    {format(item.date, "HH:mm")}
                                                                </span>
                                                            </div>

                                                            <div className="mt-2 pl-16">
                                                                <p className="text-xl font-black tracking-tighter text-white uppercase italic leading-none mb-2">
                                                                    {isCredit ? '+' : '-'}{parseFloat(notification.amount || "0").toFixed(0)} <span className="text-primary not-italic">PKR</span>
                                                                </p>
                                                                <p className="text-[11px] text-zinc-500 font-bold leading-relaxed max-w-sm">
                                                                    “{notification.message}”
                                                                </p>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                }
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
