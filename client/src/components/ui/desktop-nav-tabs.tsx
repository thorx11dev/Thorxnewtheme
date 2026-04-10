import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

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

interface DesktopNavTabsProps {
    tabs: TabItem[];
    activeTab?: number | null;
    onChange?: (index: number | null) => void;
    className?: string;
}

export function DesktopNavTabs({
    tabs,
    activeTab,
    onChange,
    className
}: DesktopNavTabsProps) {
    const handleSelect = (index: number) => {
        onChange?.(index);
    };

    return (
        <div className={cn("flex items-center", className)}>
            {tabs.map((tab, index) => {
                if (tab.type === "separator") {
                    // Render a separator if needed, or omit for a perfectly joined look
                    return null;
                }

                const isActive = activeTab === index;
                const Icon = tab.icon;
                
                // Determine if it's the first or last real tab to apply grouping borders if desired
                // In brutalism, individual distinct blocks often work best.

                return (
                    <button
                        key={`tab-${index}-${tab.title}`}
                        onClick={() => handleSelect(index)}
                        className={cn(
                            "relative flex items-center justify-center gap-2 h-10 md:h-12 px-4 md:px-6 transition-all duration-200 border-3 border-black group",
                            "ml-[-3px]", // Negative margin to overlap borders and create a segmented control look
                            isActive
                                ? "bg-primary text-black z-10 scale-[1.05] shadow-[4px_4px_0px_#000]"
                                : "bg-white text-zinc-600 hover:bg-zinc-100 hover:text-black z-0 hover:z-10 hover:shadow-[4px_4px_0px_#000]"
                        )}
                        style={{
                            // First item shouldn't have negative margin to avoid shifting the whole block
                            marginLeft: index === 0 ? '0' : undefined
                        }}
                    >
                        <div className="relative z-10 flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                            <Icon size={18} strokeWidth={isActive ? 3 : 2} className={cn(
                                "transition-colors duration-200",
                                isActive ? "text-black" : "text-inherit"
                            )} />
                        </div>

                        <span className={cn(
                            "relative z-10 font-black text-xs tracking-[0.1em] whitespace-nowrap transition-all duration-200"
                        )}>
                            {tab.title.toUpperCase()}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
