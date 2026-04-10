"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

// Local implementation of useOnClickOutside to avoid missing dependencies
function useOnClickOutside(ref: React.RefObject<HTMLElement>, handler: (event: MouseEvent | TouchEvent) => void) {
    React.useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            if (!ref.current || ref.current.contains(event.target as Node)) {
                return;
            }
            handler(event);
        };
        document.addEventListener("mousedown", listener);
        document.addEventListener("touchstart", listener);
        return () => {
            document.removeEventListener("mousedown", listener);
            document.removeEventListener("touchstart", listener);
        };
    }, [ref, handler]);
}

interface Tab {
    title: string;
    icon: LucideIcon;
    type?: never;
    id?: string;
}

interface Separator {
    type: "separator";
    title?: never;
    icon?: never;
    id?: string;
}

export type TabItem = Tab | Separator;

interface ExpandableTabsProps {
    tabs: TabItem[];
    className?: string;
    activeColor?: string;
    activeTab?: number | null;
    onChange?: (index: number | null) => void;
}

const buttonVariants = {
    initial: {
        gap: 0,
        paddingLeft: ".5rem",
        paddingRight: ".5rem",
    },
    animate: (isSelected: boolean) => ({
        gap: isSelected ? ".5rem" : 0,
        paddingLeft: isSelected ? "1rem" : ".5rem",
        paddingRight: isSelected ? "1rem" : ".5rem",
    }),
};

const spanVariants = {
    initial: { width: 0, opacity: 0 },
    animate: { width: "auto", opacity: 1 },
    exit: { width: 0, opacity: 0 },
};

const transition = { type: "spring", stiffness: 260, damping: 20 };

export function ExpandableTabs({
    tabs,
    className,
    activeColor = "bg-primary text-white shadow-[0_0_20px_rgba(255,107,53,0.3)]",
    activeTab,
    onChange,
}: ExpandableTabsProps) {
    const [selected, setSelected] = React.useState<number | null>(activeTab !== undefined ? activeTab : null);
    const outsideClickRef = React.useRef(null);

    React.useEffect(() => {
        if (activeTab !== undefined) {
            setSelected(activeTab);
        }
    }, [activeTab]);

    useOnClickOutside(outsideClickRef, () => {
        // Keeping selection persistent for navigation
    });

    const handleSelect = (index: number) => {
        setSelected(index);
        onChange?.(index);
    };

    const Separator = () => (
        <div className="mx-2 h-6 w-px bg-white/5 self-center" aria-hidden="true" />
    );

    return (
        <div
            ref={outsideClickRef}
            className={cn(
                "flex items-center bg-black/80 backdrop-blur-xl border border-white/10 rounded-full p-1.5 gap-1 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/5",
                className
            )}
        >
            {tabs.map((tab, index) => {
                if (tab.type === "separator") {
                    return <Separator key={`separator-${index}-${tab.id || ""}`} />;
                }

                const Icon = tab.icon;
                const isSelected = selected === index;

                return (
                    <motion.button
                        key={tab.title}
                        variants={buttonVariants}
                        initial={false}
                        animate="animate"
                        custom={isSelected}
                        onClick={() => handleSelect(index)}
                        transition={transition}
                        className={cn(
                            "relative flex items-center rounded-full transition-all duration-500",
                            isSelected
                                ? "text-white py-2"
                                : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5 w-12 h-12 justify-center"
                        )}
                        aria-selected={isSelected}
                    >
                        {/* Sliding Active Background */}
                        {isSelected && (
                            <motion.div
                                layoutId="active-pill"
                                className={cn("absolute inset-0 rounded-full z-0", activeColor)}
                                transition={transition}
                            />
                        )}

                        <div className={cn(
                            "relative z-10 flex items-center justify-center rounded-full transition-transform duration-500",
                            isSelected ? "bg-white/15 w-8 h-8 scale-100" : "scale-90"
                        )}>
                            <Icon size={20} strokeWidth={isSelected ? 2.5 : 2} />
                        </div>

                        <AnimatePresence mode="popLayout" initial={false}>
                            {isSelected && (
                                <motion.span
                                    variants={spanVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    transition={transition}
                                    className="relative z-10 overflow-hidden whitespace-nowrap font-black text-xs tracking-[0.1em] pr-1"
                                >
                                    {tab.title.toUpperCase()}
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </motion.button>
                );
            })}
        </div>
    );
}
