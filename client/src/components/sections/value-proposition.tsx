"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import TechnicalLabel from "@/components/ui/technical-label";
import { RulerCarousel } from "@/components/ui/ruler-carousel";
import TextBlockAnimation from "@/components/ui/text-block-animation";

// Interactive Divider Component (recreated from UserPortal.tsx)
const InteractiveDivider = ({ orientation = "horizontal", className = "" }: { orientation?: "horizontal" | "vertical", className?: string }) => {
    const [isOrange, setIsOrange] = useState(false);

    const handleClick = () => {
        setIsOrange(true);
        setTimeout(() => {
            setIsOrange(false);
        }, 3000);
    };

    if (orientation === "vertical") {
        return (
            <div
                onClick={handleClick}
                className={cn(
                    "w-[3px] self-stretch bg-black/10 dark:bg-white/10 cursor-pointer overflow-hidden relative",
                    className
                )}
            >
                <AnimatePresence>
                    {isOrange && (
                        <motion.div
                            initial={{ scaleY: 0, opacity: 1 }}
                            animate={{ scaleY: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 3, ease: "linear" }}
                            style={{ transformOrigin: "top" }}
                            className="absolute inset-0 bg-primary"
                        />
                    )}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div
            onClick={handleClick}
            className={cn(
                "w-full h-[3px] bg-black/10 dark:bg-white/10 cursor-pointer overflow-hidden relative",
                className
            )}
        >
            <AnimatePresence>
                {isOrange && (
                    <motion.div
                        initial={{ scaleX: 0, opacity: 1 }}
                        animate={{ scaleX: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 3, ease: "linear" }}
                        style={{ transformOrigin: "left" }}
                        className="absolute inset-0 bg-primary"
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

interface ContentBlockProps {
    label: string;
    description: string;
    isActive: boolean;
}

const ContentBlock = ({ label, description, isActive }: ContentBlockProps) => (
    <div className="flex flex-col space-y-6 p-6 md:p-10 h-full">
        <div className="w-fit">
            <div className="bg-black dark:bg-white px-4 py-1.5 rounded-sm">
                <TechnicalLabel
                    text={label}
                    className="text-white dark:text-black font-black tracking-[0.2em] text-[10px] md:text-xs"
                />
            </div>
        </div>
        <TextBlockAnimation blockColor="#ff6b00" delay={0.2} duration={0.4} animateOnScroll={false} trigger={isActive}>
            <p className="text-base md:text-xl text-black/80 dark:text-white/80 leading-relaxed font-bold">
                {description}
            </p>
        </TextBlockAnimation>
    </div>
);

export default function ValueProposition({ isActive }: { isActive: boolean }) {
    const stakeholders = [
        {
            label: "FOR USERS",
            description: "Get paid in PKR for watching short videos and visiting verified websites. With a low $5 minimum payout and direct support for JazzCash and EasyPaisa, THORX turns your daily attention into a reliable and sustainable income stream."
        },
        {
            label: "FOR AD NETWORKS",
            description: "Scale your network with genuine human engagement. Our '30-second attention rule' ensures verified interactions from a logged-in Pakistan audience, eliminating bot traffic and delivering superior eCPM for your video ad inventory."
        },
        {
            label: "FOR ADVERTISERS",
            description: "Reach the active Pakistan market through a platform that guarantees user attention. Every task is 'Revenue Verified,' requiring active engagement to ensure your marketing budget delivers real, measurable ROI and brand impact."
        }
    ];

    return (
        <section
            className={`cinematic-section ${isActive ? 'active' : ''} bg-[#EAE5DD] dark:bg-black pt-44 md:pt-[320px] pb-24 px-4 flex flex-col items-start justify-start overflow-y-auto`}
            data-section="3"
            data-testid="value-proposition-section"
        >
            <div className="mx-auto container max-w-7xl">
                {/* Section Header */}
                <div className="text-left mb-16 md:mb-24">
                    <TextBlockAnimation blockColor="#ff6b00" animateOnScroll={false} trigger={isActive}>
                        <h2 className="text-6xl md:text-7xl lg:text-8xl font-black text-black dark:text-white uppercase tracking-tighter leading-none">
                            Value Proposition
                        </h2>
                    </TextBlockAnimation>
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-[3px] border-black/10 dark:border-white/10 rounded-xl overflow-hidden bg-white/5 backdrop-blur-sm mb-12">
                    {stakeholders.map((stakeholder, index) => (
                        <React.Fragment key={stakeholder.label}>
                            <div className="relative flex flex-col h-full">
                                <ContentBlock {...stakeholder} isActive={isActive} />

                                {/* Vertical Divider (Desktop only, except for the last one) */}
                                {index < stakeholders.length - 1 && (
                                    <InteractiveDivider
                                        orientation="vertical"
                                        className="hidden lg:block absolute right-0 top-0 bottom-0"
                                    />
                                )}

                                {/* Horizontal Divider (Mobile only) */}
                                {index < stakeholders.length - 1 && (
                                    <InteractiveDivider
                                        orientation="horizontal"
                                        className="lg:hidden"
                                    />
                                )}
                            </div>
                        </React.Fragment>
                    ))}
                </div>

                {/* Ruler Carousel */}
                <div className="mt-8 md:mt-16 border-t-[3px] border-black/10 dark:border-white/10 pt-16">
                    <RulerCarousel
                        originalItems={[
                            { id: 1, title: "EARN" },
                            { id: 2, title: "TEAM" },
                            { id: 3, title: "FAST" },
                            { id: 4, title: "24/7" },
                        ]}
                    />
                </div>
            </div>
        </section>
    );
}
