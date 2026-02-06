import React, { FC } from "react";
import { cn } from "@/lib/utils";
// Removed next/image and next/link, using standard anchor for external link and div/span for structure
// Link from wouter or react-router-dom could be used if internal linking is needed, but "How to Earn" is usually informational or links to auth/external.
// Assuming "Link" usage in the prompt example was for the whole card. I'll make the cards interactive or just static containers depending on needs.
// For this design, I'll wrap content in a div or anchor if a link is provided.
import { Play, Users, Clock, ShieldCheck, TrendingUp, Plus } from "lucide-react";
import TextBlockAnimation from "@/components/ui/text-block-animation";

// Simplified content mapping
// Card 1: Watch Ads
// Card 2: Refer Friends
// Card 3: Real Interaction (How it works - 30s rule)
// Card 4: Multi-level (Growth)
// Card 5: Secure (Verified Revenue)

const cardContents = [
    {
        title: "Watch & Earn",
        description: "Watch short videos and visit websites. Stay for 30 seconds to get paid instantly.",
        icon: <Play className="size-6 text-black dark:text-white" />,
        href: "/work" // Assuming internal route
    },
    {
        title: "Invite Friends",
        description: "Share your link. Earn commissions when your friends start earning.",
        icon: <Users className="size-6 text-black dark:text-white" />,
        href: "/referrals" // Assuming internal route
    },
    {
        title: "Real Money",
        description: "No fake tasks. Real interaction means real money in your wallet.",
        icon: <Clock className="size-6 text-black dark:text-white" />,
        href: "#"
    },
    {
        title: "Team Growth",
        description: "Earn from your team's success with our multi-level system.",
        icon: <TrendingUp className="size-6 text-black dark:text-white" />,
        href: "#"
    },
    {
        title: "Secure & Verified",
        description: "Your earnings are verified and safe. Cash out when you're ready.",
        icon: <ShieldCheck className="size-6 text-black dark:text-white" />,
        href: "#"
    },
];

const CornerPlusIcons = () => (
    <>
        <div className="absolute -top-3 -left-3 transition-transform duration-500 group-hover:rotate-180 group-hover:scale-125">
            <Plus className="size-6 text-black dark:text-white" />
        </div>
        <div className="absolute -top-3 -right-3 transition-transform duration-500 group-hover:rotate-90 group-hover:scale-125">
            <Plus className="size-6 text-black dark:text-white" />
        </div>
        <div className="absolute -bottom-3 -left-3 transition-transform duration-500 group-hover:-rotate-90 group-hover:scale-125">
            <Plus className="size-6 text-black dark:text-white" />
        </div>
        <div className="absolute -bottom-3 -right-3 transition-transform duration-500 group-hover:-rotate-180 group-hover:scale-125">
            <Plus className="size-6 text-black dark:text-white" />
        </div>
    </>
);

const PlusCard: React.FC<{
    className?: string;
    title: string;
    description: string;
    isActive: boolean;
    icon?: React.ReactNode;
    href?: string;
}> = ({ className = "", title, description, isActive, icon, href }) => {
    const CardWrapper = href && href !== "#" ? "a" : "div";

    return (
        <CardWrapper
            href={href && href !== "#" ? href : undefined}
            className={cn(
                "relative border border-dashed border-zinc-500/50 dark:border-zinc-700/50 rounded-lg p-6 md:p-8 bg-[#EAE5DD] dark:bg-zinc-950 min-h-[200px] md:min-h-[240px]",
                "flex flex-col justify-between group transition-all duration-500 ease-out",
                "hover:-translate-y-2 hover:border-solid hover:border-black dark:hover:border-white",
                "hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[12px_12px_0px_0px_rgba(255,255,255,0.1)]",
                className
            )}
        >
            <CornerPlusIcons />
            {/* Content */}
            <div className="relative z-10 space-y-4">
                <div className="bg-black/5 dark:bg-white/10 w-fit p-3 rounded-md">
                    {icon}
                </div>
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {title}
                    </h3>
                    <TextBlockAnimation blockColor="#ff6b00" duration={0.4} delay={0.2} animateOnScroll={false} trigger={isActive}>
                        <p className="text-gray-700 dark:text-gray-400 leading-relaxed text-sm md:text-base font-medium">
                            {description}
                        </p>
                    </TextBlockAnimation>
                </div>
            </div>
        </CardWrapper>
    );
};

export default function EarningReveal({ isActive, onAdvance }: { isActive: boolean; onAdvance: () => void }) {
    return (
        <section
            className={`cinematic-section ${isActive ? 'active' : ''} bg-[#EAE5DD] dark:bg-black pt-44 md:pt-[320px] pb-24 px-4`}
            data-section="2"
            data-testid="earning-reveal-section"
        >
            <div className="mx-auto container max-w-7xl">
                <div className="mb-12 md:mb-16 text-left">
                    <TextBlockAnimation blockColor="#000" animateOnScroll={false} trigger={isActive}>
                        <h2 className="text-6xl md:text-7xl font-black text-black dark:text-white uppercase tracking-tight leading-none">
                            OUR FEATURES
                        </h2>
                    </TextBlockAnimation>
                </div>

                {/* Responsive Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 auto-rows-auto gap-6 md:gap-8 mb-16 md:mb-24">
                    <PlusCard {...cardContents[0]} className="lg:col-span-3 lg:row-span-2" isActive={isActive} />
                    <PlusCard {...cardContents[1]} className="lg:col-span-3 lg:row-span-2" isActive={isActive} />

                    <PlusCard {...cardContents[2]} className="md:col-span-1 lg:col-span-2 lg:row-span-1" isActive={isActive} />
                    <PlusCard {...cardContents[3]} className="md:col-span-1 lg:col-span-2 lg:row-span-1" isActive={isActive} />
                    <PlusCard {...cardContents[4]} className="md:col-span-2 lg:col-span-2 lg:row-span-1" isActive={isActive} />
                </div>


            </div>
        </section>
    );
}
