"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Rewind, FastForward } from "lucide-react";

export interface CarouselItem {
    id: number | string;
    title: string;
}

// Create infinite items by triplicating the array
const createInfiniteItems = (originalItems: CarouselItem[]) => {
    const items: (CarouselItem & { originalIndex: number })[] = [];
    for (let i = 0; i < 3; i++) {
        originalItems.forEach((item, index) => {
            items.push({
                ...item,
                id: `${i}-${item.id}`,
                originalIndex: index,
            });
        });
    }
    return items;
};

const RulerLines = ({
    top = true,
    totalLines = 101,
}: {
    top?: boolean;
    totalLines?: number;
}) => {
    const lines = [];
    const lineSpacing = 100 / (totalLines - 1);

    for (let i = 0; i < totalLines; i++) {
        const isFifth = i % 5 === 0;
        const isCenter = i === Math.floor(totalLines / 2);

        let height = "h-3";
        let color = "bg-black/10 dark:bg-white/10";

        if (isCenter) {
            height = "h-8";
            color = "bg-primary";
        } else if (isFifth) {
            height = "h-4";
            color = "bg-black/30 dark:bg-white/30";
        }

        const positionClass = top ? "top-0" : "bottom-0";

        lines.push(
            <div
                key={i}
                className={`absolute w-0.5 ${height} ${color} ${positionClass} transform -translate-x-1/2`}
                style={{ left: `${i * lineSpacing}%` }}
            />
        );
    }

    return <div className="relative w-full h-8">{lines}</div>;
};

export function RulerCarousel({
    originalItems,
}: {
    originalItems: CarouselItem[];
}) {
    const infiniteItems = createInfiniteItems(originalItems);
    const itemsPerSet = originalItems.length;

    // Start with the middle set, first item
    const [activeIndex, setActiveIndex] = useState(itemsPerSet);
    const [isResetting, setIsResetting] = useState(false);
    const previousIndexRef = useRef(itemsPerSet);

    const handleItemClick = (newIndex: number) => {
        if (isResetting) return;

        // Find the original item index
        const targetOriginalIndex = newIndex % itemsPerSet;

        // Find all instances of this item across the 3 copies
        const possibleIndices = [
            targetOriginalIndex, // First copy
            targetOriginalIndex + itemsPerSet, // Second copy
            targetOriginalIndex + itemsPerSet * 2, // Third copy
        ];

        // Find the closest index to current position
        let closestIndex = possibleIndices[0];
        let smallestDistance = Math.abs(possibleIndices[0] - activeIndex);

        for (const index of possibleIndices) {
            const distance = Math.abs(index - activeIndex);
            if (distance < smallestDistance) {
                smallestDistance = distance;
                closestIndex = index;
            }
        }

        previousIndexRef.current = activeIndex;
        setActiveIndex(closestIndex);
    };

    const handlePrevious = () => {
        if (isResetting) return;
        setActiveIndex((prev) => prev - 1);
    };

    const handleNext = () => {
        if (isResetting) return;
        setActiveIndex((prev) => prev + 1);
    };

    // Handle infinite scrolling
    useEffect(() => {
        if (isResetting) return;

        // If we're in the first set, jump to the equivalent position in the middle set
        if (activeIndex < itemsPerSet) {
            setIsResetting(true);
            setTimeout(() => {
                setActiveIndex(activeIndex + itemsPerSet);
                setIsResetting(false);
            }, 0);
        }
        // If we're in the last set, jump to the equivalent position in the middle set
        else if (activeIndex >= itemsPerSet * 2) {
            setIsResetting(true);
            setTimeout(() => {
                setActiveIndex(activeIndex - itemsPerSet);
                setIsResetting(false);
            }, 0);
        }
    }, [activeIndex, itemsPerSet, isResetting]);

    // Add keyboard navigation
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (isResetting) return;

            if (event.key === "ArrowLeft") {
                event.preventDefault();
                setActiveIndex((prev) => prev - 1);
            } else if (event.key === "ArrowRight") {
                event.preventDefault();
                setActiveIndex((prev) => prev + 1);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isResetting]);

    // Responsive width logic
    const [itemWidth, setItemWidth] = useState(400);
    const gap = 100;

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setItemWidth(280);
            } else {
                setItemWidth(400);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const itemWidthWithGap = itemWidth + gap;
    const targetX = -(activeIndex * itemWidthWithGap);

    // Get current page info
    const currentPage = (activeIndex % itemsPerSet) + 1;
    const totalPages = itemsPerSet;

    return (
        <div className="w-full py-20 flex flex-col items-center justify-center">
            <div className="w-full h-[200px] flex flex-col justify-center relative">
                <div className="flex items-center justify-center">
                    <RulerLines top />
                </div>
                <div className="flex items-center w-full h-full relative overflow-hidden">
                    {/* Central Indicator Mask */}
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-24 border-y-2 border-black/20 dark:border-white/20 pointer-events-none z-10" />

                    <motion.div
                        className="flex items-center absolute left-1/2 top-0 bottom-0"
                        animate={{
                            x: -(activeIndex * itemWidthWithGap + itemWidth / 2)
                        }}
                        initial={false}
                        transition={
                            isResetting
                                ? { duration: 0 }
                                : {
                                    type: "spring",
                                    stiffness: 150,
                                    damping: 25,
                                    mass: 1,
                                }
                        }
                    >
                        {infiniteItems.map((item, index) => {
                            const isActive = index === activeIndex;

                            return (
                                <motion.button
                                    key={item.id}
                                    onClick={() => handleItemClick(index)}
                                    className={`text-6xl md:text-8xl font-black whitespace-nowrap cursor-pointer flex items-center justify-center uppercase tracking-tighter ${isActive
                                        ? "text-black dark:text-white"
                                        : "text-black/20 dark:text-white/10 hover:text-black/50 dark:hover:text-white/30"
                                        }`}
                                    animate={{
                                        scale: isActive ? 1.1 : 0.8,
                                        opacity: isActive ? 1 : 0.3,
                                    }}
                                    transition={
                                        isResetting
                                            ? { duration: 0 }
                                            : {
                                                type: "spring",
                                                stiffness: 300,
                                                damping: 30,
                                            }
                                    }
                                    style={{
                                        width: `${itemWidth}px`,
                                        marginRight: `${gap}px`
                                    }}
                                >
                                    {item.title}
                                </motion.button>
                            );
                        })}
                    </motion.div>
                </div>

                <div className="flex items-center justify-center">
                    <RulerLines top={false} />
                </div>
            </div>

            <div className="flex items-center justify-center gap-8 mt-12 bg-black/5 dark:bg-white/5 px-6 py-3 rounded-full backdrop-blur-sm border border-black/10 dark:border-white/10">
                <button
                    onClick={handlePrevious}
                    disabled={isResetting}
                    className="flex items-center justify-center cursor-pointer hover:scale-125 transition-transform"
                    aria-label="Previous item"
                >
                    <Rewind className="w-6 h-6 text-primary" />
                </button>

                <div className="flex items-center gap-3">
                    <span className="text-xl font-black text-black dark:text-white min-w-[2ch] text-center">
                        {currentPage}
                    </span>
                    <span className="text-lg text-black/30 dark:text-white/20 font-light">
                        /
                    </span>
                    <span className="text-xl font-black text-black/40 dark:text-white/40">
                        {totalPages}
                    </span>
                </div>

                <button
                    onClick={handleNext}
                    disabled={isResetting}
                    className="flex items-center justify-center cursor-pointer hover:scale-125 transition-transform"
                    aria-label="Next item"
                >
                    <FastForward className="w-6 h-6 text-primary" />
                </button>
            </div>
        </div>
    );
}
