import { motion } from "framer-motion";
import { Crown, Trophy, Medal, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface RankBadgeProps {
    rank: string;
    size?: "sm" | "md" | "lg";
    showLabel?: boolean;
    animated?: boolean;
    className?: string;
}

const RANK_CONFIG: Record<string, {
    icon: any;
    color: string;
    bgColor: string;
    borderColor: string;
    gradient: string;
}> = {
    "Useless": {
        icon: Zap,
        color: "text-gray-400",
        bgColor: "bg-gray-100 dark:bg-gray-800",
        borderColor: "border-gray-300 dark:border-gray-700",
        gradient: "from-gray-400 to-gray-600"
    },
    "Worker": {
        icon: Shield,
        color: "text-blue-500",
        bgColor: "bg-blue-100 dark:bg-blue-900/30",
        borderColor: "border-blue-300 dark:border-blue-700",
        gradient: "from-blue-400 to-blue-600"
    },
    "Soldier": {
        icon: Medal,
        color: "text-green-500",
        bgColor: "bg-green-100 dark:bg-green-900/30",
        borderColor: "border-green-300 dark:border-green-700",
        gradient: "from-green-400 to-green-600"
    },
    "Captain": {
        icon: Trophy,
        color: "text-purple-500",
        bgColor: "bg-purple-100 dark:bg-purple-900/30",
        borderColor: "border-purple-300 dark:border-purple-700",
        gradient: "from-purple-400 to-purple-600"
    },
    "General": {
        icon: Crown,
        color: "text-yellow-500",
        bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
        borderColor: "border-yellow-300 dark:border-yellow-700",
        gradient: "from-yellow-400 to-yellow-600"
    }
};

const SIZE_CONFIG = {
    sm: {
        container: "px-2 py-1 text-xs gap-1",
        icon: "w-3 h-3",
        text: "text-xs"
    },
    md: {
        container: "px-3 py-1.5 text-sm gap-1.5",
        icon: "w-4 h-4",
        text: "text-sm"
    },
    lg: {
        container: "px-4 py-2 text-base gap-2",
        icon: "w-5 h-5",
        text: "text-base"
    }
};

export function RankBadge({
    rank,
    size = "md",
    showLabel = true,
    animated = false,
    className
}: RankBadgeProps) {
    const config = RANK_CONFIG[rank] || RANK_CONFIG["Useless"];
    const sizeConfig = SIZE_CONFIG[size];
    const Icon = config.icon;

    const badge = (
        <div
            className={cn(
                "inline-flex items-center rounded-full border font-bold transition-all",
                config.bgColor,
                config.borderColor,
                sizeConfig.container,
                className
            )}
        >
            <Icon className={cn(sizeConfig.icon, config.color)} />
            {showLabel && (
                <span className={cn(sizeConfig.text, config.color)}>
                    {rank}
                </span>
            )}
        </div>
    );

    if (animated) {
        return (
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
                {badge}
            </motion.div>
        );
    }

    return badge;
}

interface RankProgressBarProps {
    currentRank: string;
    totalEarnings: number;
    className?: string;
}

const RANK_THRESHOLDS = [
    { name: "Useless", min: 0, max: 25000 },
    { name: "Worker", min: 25000, max: 50000 },
    { name: "Soldier", min: 50000, max: 75000 },
    { name: "Captain", min: 75000, max: 100000 },
    { name: "General", min: 100000, max: Infinity },
];

export function RankProgressBar({
    currentRank,
    totalEarnings,
    className
}: RankProgressBarProps) {
    const currentRankIndex = RANK_THRESHOLDS.findIndex(r => r.name === currentRank);
    const currentThreshold = RANK_THRESHOLDS[currentRankIndex];
    const nextThreshold = RANK_THRESHOLDS[currentRankIndex + 1];

    if (!nextThreshold || currentRank === "General") {
        return (
            <div className={cn("space-y-2", className)}>
                <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-yellow-500">
                        <Crown className="w-4 h-4 inline mr-1" />
                        Maximum Rank Achieved!
                    </span>
                </div>
            </div>
        );
    }

    const progress = ((totalEarnings - currentThreshold.min) / (nextThreshold.min - currentThreshold.min)) * 100;
    const remaining = nextThreshold.min - totalEarnings;
    const config = RANK_CONFIG[nextThreshold.name];

    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                    Progress to <span className={cn("font-semibold", config.color)}>{nextThreshold.name}</span>
                </span>
                <span className="text-muted-foreground">
                    PKR {remaining.toLocaleString()} remaining
                </span>
            </div>
            <div className="relative h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progress, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={cn(
                        "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r",
                        config.gradient
                    )}
                />
            </div>
            <div className="text-xs text-muted-foreground text-right">
                {Math.min(progress, 100).toFixed(1)}% complete
            </div>
        </div>
    );
}
