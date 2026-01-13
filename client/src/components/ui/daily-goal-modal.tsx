
import { useState, useEffect } from "react";
import { X, Check, ChevronRight, Play, BookOpen, Clock, Zap, Target, AlertCircle, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DailyGoalModalProps {
    isOpen: boolean;
    onClose: () => void;
    adsWatched: number;
    adsTarget: number;
}

export function DailyGoalModal({
    isOpen,
    onClose,
    adsWatched,
    adsTarget,
}: DailyGoalModalProps) {
    const [videoCode, setVideoCode] = useState("");
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = "hidden";
        } else {
            setIsVisible(false);
            document.body.style.overflow = "auto";
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const progress = Math.min((adsWatched / adsTarget) * 100, 100);
    const tasks = [
        { id: 1, title: "Watch Daily Ads", type: "video", status: adsWatched >= adsTarget ? "completed" : "in_progress", count: `${adsWatched}/${adsTarget}` },
        { id: 2, title: "Subscribe to Channel", type: "social", status: "pending", count: "Subscribe" },
        { id: 3, title: "Follow Instagram", type: "social", status: "pending", count: "Follow" },
        { id: 4, title: "Follow TikTok", type: "social", status: "pending", count: "Follow" },
        { id: 5, title: "Enter Secret Code", type: "code", status: videoCode ? "completed" : "pending", count: "Input" },
    ];

    return (
        <div
            className={cn(
                "fixed inset-0 z-[100] bg-black text-white transition-opacity duration-500 ease-out",
                isVisible ? "opacity-100" : "opacity-0"
            )}
        >
            {/* Top Loading Line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                <div
                    className="h-full bg-primary ease-out transition-all duration-1500"
                    style={{ width: isVisible ? `${progress}%` : '0%' }}
                />
            </div>

            {/* Close Button - Fixed Position */}
            <Button
                variant="ghost"
                onClick={onClose}
                className="absolute top-8 right-8 z-50 text-white/40 hover:text-white hover:bg-white/10 rounded-full w-12 h-12 p-0 transition-all duration-300"
            >
                <X className="w-6 h-6" />
            </Button>

            <div className="max-w-5xl mx-auto h-full flex flex-col pt-24 px-6 md:px-12 pb-12">

                {/* Simple Header */}
                <div className={cn(
                    "mb-16 transition-all duration-700 delay-100 transform",
                    isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                )}>
                    <div className="flex items-center gap-2 mb-4">
                        <ListTodo className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium tracking-wide text-primary">Overview</span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-2">
                        Today's Goals
                    </h1>
                    <p className="text-white/40 text-lg font-light">
                        Complete all tasks to maximize your daily earnings.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-24 flex-grow">

                    {/* Progress Section */}
                    <div className={cn(
                        "md:col-span-4 transition-all duration-700 delay-200 transform",
                        isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                    )}>
                        <div className="static md:sticky md:top-32">
                            <span className="text-9xl font-bold tracking-tighter text-white block leading-none mb-2">
                                {Math.round(progress)}%
                            </span>
                            <div className="h-px w-full bg-white/10 my-6" />
                            <div className="space-y-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/40">Ads Watched</span>
                                    <span className="font-mono">{adsWatched} / {adsTarget}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/40">Time Remaining</span>
                                    <span className="font-mono">14h 20m</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Task List */}
                    <div className="md:col-span-8 space-y-4">
                        {tasks.map((task, index) => (
                            <div
                                key={task.id}
                                className={cn(
                                    "group relative p-6 border rounded-xl transition-all duration-300 cursor-pointer flex items-center gap-6",
                                    "transform hover:-translate-y-1",
                                    task.status === 'completed'
                                        ? "border-white/5 bg-white/5"
                                        : "border-white/10 hover:border-white/30 hover:bg-white/[0.02]",
                                    isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                                )}
                                style={{ transitionDelay: `${300 + (index * 100)}ms` }}
                            >
                                {/* Number */}
                                <span className={cn(
                                    "text-sm font-mono transition-colors",
                                    task.status === 'completed' ? "text-primary" : "text-white/20 group-hover:text-white/40"
                                )}>
                                    0{index + 1}
                                </span>

                                {/* Content */}
                                <div className="flex-grow">
                                    <h3 className={cn(
                                        "text-lg font-medium transition-colors",
                                        task.status === 'completed' ? "text-white/40 decoration-white/20 line-through" : "text-white group-hover:text-primary"
                                    )}>
                                        {task.title}
                                    </h3>
                                </div>

                                {/* Action */}
                                <div className="flex-shrink-0">
                                    {task.type === 'code' ? (
                                        task.status === 'completed' ? (
                                            <Check className="w-5 h-5 text-primary" />
                                        ) : (
                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                <Input
                                                    value={videoCode}
                                                    onChange={(e) => setVideoCode(e.target.value)}
                                                    placeholder="Code"
                                                    className="h-9 w-24 bg-transparent border-b border-white/20 rounded-none px-0 text-center text-sm text-white focus-visible:ring-0 focus-visible:border-primary placeholder:text-white/20 transition-colors"
                                                />
                                                <Button size="sm" variant="ghost" className="h-9 w-9 p-0 rounded-full hover:bg-primary/20 hover:text-primary">
                                                    <ChevronRight className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )
                                    ) : (
                                        task.status === 'completed' ? (
                                            <Check className="w-5 h-5 text-primary" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/40 group-hover:border-primary group-hover:text-primary transition-all">
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
