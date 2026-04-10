"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import TechnicalLabel from "@/components/ui/technical-label";
import { VariableFontHoverByRandomLetter } from "@/components/ui/variable-font-hover";
import { CinematicBlockReveal } from "@/components/ui/cinematic-block-reveal";

// Interactive Divider Component
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

interface FAQSectionProps {
  isActive: boolean;
}

const allFaqData = [
  {
    id: "001",
    protocol: "PLATFORM-OVERVIEW",
    question: "What is THORX?",
    answer: "THORX is an online earning platform designed specifically for Pakistani users, enabling them to convert their attention into real earnings in PKR. Official domain: thorx.pro. We operate a dual-engine architecture offering transparent earning opportunities."
  },
  {
    id: "002",
    protocol: "EARNING-MODEL",
    question: "How do I earn on THORX?",
    answer: "You earn through two main systems: 1) Engine A (watching video ads in our 4 VAST players), and 2) Engine B (completing high-paying CPE offers). All tasks are verified by our AI Web Panel, tracking 15-second active engagement. Finally, invite new users to earn 15% / 7.5% referral commissions."
  },
  {
    id: "003",
    protocol: "ATTENTION-REQUIREMENT",
    question: "What does 'Turn Attention into Currency' mean?",
    answer: "THORX requires genuine attention and engagement. Whether clicking a video ad or an offer, you must visit the advertiser's product page via our AI Web Panel and stay for 15+ seconds, actively reading and scrolling. Auto-functioning without attention makes earnings haram."
  },
  {
    id: "004",
    protocol: "HALAL-ECOSYSTEM",
    question: "Is THORX earning Halal?",
    answer: "Yes. THORX follows a strict halal-based earning model. All video advertisements and CPE offers undergo content filtering. Furthermore, earnings are based on genuine work (human attention and engagement), not passive income, interest, or gambling."
  },
  {
    id: "005",
    protocol: "REFERRAL-SYSTEM",
    question: "How does the referral system work?",
    answer: "Multi-level system: Level 1 pays 15%, Level 2 pays 7.5%. IMPORTANT: Commission is credited ONLY when the referred user successfully requests a payout. This ensures maximum safety, value, and cash flow for the ecosystem."
  },
  {
    id: "006",
    protocol: "RANKING-SYSTEM",
    question: "What are the user ranks?",
    answer: "We use a Dual-Requirement Ranking System (Referrals AND Earnings) that unlocks withdrawal priorities. 1) Useless (Priority 5), 2) Worker (5 Refs + 2,500 PKR, P4), 3) Soldier (10 Refs + 5,000 PKR, P3), 4) Captain (15 Refs + 10,000 PKR, P2), 5) General (25 Refs + 25,000 PKR, P1)."
  },
  {
    id: "007",
    protocol: "DAILY-TASKS",
    question: "What are daily tasks and why are they mandatory?",
    answer: "Daily Tasks are your Payout Gatekeeper. You MUST complete your assigned tasks (watching specific numbers of ads or doing CPE offers) to unlock the payout page. If tasks are incomplete, the withdrawal system is mathematically locked."
  },
  {
    id: "008",
    protocol: "ENGINE-A",
    question: "What is Engine A (Video Ads)?",
    answer: "Engine A is our VAST Video Waterfall system. It uses 4 custom players connected to multiple ad networks. If one lacks an ad, the next loads instantly. To prevent bot bans, you must click a massive 'ENTER' button after the video to verify human presence."
  },
  {
    id: "009",
    protocol: "ENGINE-B",
    question: "What is Engine B (CPE Offerwall)?",
    answer: "Engine B is our high-profit Cost-Per-Engagement Offerwall pulling tasks from top CPA networks. It features Smart-Cap logic: if an offer needs 1,000 users, we temporarily reserve your slot to ensure no user wastes time on full campaigns."
  },
  {
    id: "010",
    protocol: "WEB-PANEL",
    question: "What is the AI Web Panel?",
    answer: "The AI Web Panel is our core tracker. You are routed here when completing any task. You must stay for at least 15 seconds while the AI tracks scrolling, touch events, and tab visibility to guarantee zero bot traffic. Pass the test, get paid."
  },
  {
    id: "011",
    protocol: "USER-PORTAL",
    question: "What is the User Portal?",
    answer: "The User Portal has 5 sections: 1) Dashboard (earnings, rank, analytics), 2) Work (Engine A video players + Engine B CPE Offerwall), 3) Referral (network tracking), 4) Payout (JazzCash/EasyPaisa), 5) Help (FAQs, AI Chatbot, Contact team)."
  },
  {
    id: "012",
    protocol: "PAYOUT-METHODS",
    question: "How do I withdraw my earnings?",
    answer: "Withdrawals are processed via JazzCash, EasyPaisa, or Bank Transfer. You MUST complete your required daily tasks to unlock the payout page. Higher ranks like General and Captain get their payouts processed first."
  },
  {
    id: "013",
    protocol: "AUTO-FUNCTION-WARNING",
    question: "Can I use auto-functioning bots?",
    answer: "WARNING: Auto-functioning bots or scripts are totally banned. Any attempt to use bots will automatically fail the AI Web Panel 15-second tracking test and will result in a permanent shadow-ban from CPE offers."
  },
  {
    id: "014",
    protocol: "SECURITY",
    question: "Is THORX secure?",
    answer: "Yes. THORX uses multi-factor authentication via Email OTP for registration. We also feature advanced ad-fraud prevention mechanisms, ensuring our publisher accounts and your earnings remain safe from malicious networks."
  },
  {
    id: "015",
    protocol: "VALUE-PROPOSITION",
    question: "How does THORX create value?",
    answer: "For Users: Convert genuine attention into halal earnings. For VAST Networks: High-quality leads without clickjacking. For CPA Networks: Verified human engagement on CPE offers, meaning real App Installs and Action completions."
  }
];

const INITIAL_COUNT = 4;

interface FAQCellProps {
  faq: typeof allFaqData[0];
  index: number;
}

const FAQCell = ({ faq, index }: FAQCellProps) => (
  <div className="p-8 md:p-12 h-full flex flex-col space-y-6 relative group transition-colors duration-300 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
    <div className="flex justify-between items-center">
      <div className="bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-sm">
        <TechnicalLabel
          text={faq.protocol}
          className="text-black/40 dark:text-white/40 text-[8px] md:text-[9px] font-black tracking-widest"
        />
      </div>
      <span className="text-[10px] md:text-xs font-mono opacity-20 font-black">ID://{faq.id}</span>
    </div>

    <div className="space-y-4">
      <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter leading-none group-hover:text-primary transition-colors duration-300">
        {faq.question}
      </h3>
      <div className="w-12 h-0.5 bg-primary/30" />
      <p className="text-sm md:text-base text-black/70 dark:text-white/70 font-bold leading-relaxed">
        {faq.answer}
      </p>
    </div>
  </div>
);

export default function FAQSection({ isActive }: FAQSectionProps) {
  const [showAll, setShowAll] = useState(false);

  return (
    <section
      className={`cinematic-section ${isActive ? 'active' : ''} bg-[#EAE5DD] dark:bg-black pt-44 md:pt-[320px] pb-24 px-4 overflow-y-auto`}
      data-testid="faq-section"
    >
      <div className="container mx-auto max-w-7xl">
        <div className="text-left mb-16 md:mb-24">
          <CinematicBlockReveal
            trigger={isActive}
            blockColor="#ff6b00"
          >
            <VariableFontHoverByRandomLetter
              label="FAQ."
              className="font-black uppercase tracking-tighter text-4xl md:text-7xl lg:text-8xl leading-none text-black dark:text-white"
              fromFontVariationSettings="'wght' 900, 'slnt' 0"
              toFontVariationSettings="'wght' 400, 'slnt' -10"
            />
          </CinematicBlockReveal>
        </div>

        <div className="border-[3px] border-black/10 dark:border-white/10 rounded-xl overflow-hidden bg-white/5 backdrop-blur-sm shadow-2xl">
          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {allFaqData.slice(0, INITIAL_COUNT).map((faq, index) => (
              <div key={faq.id} className="relative flex flex-col h-full overflow-hidden">
                <FAQCell faq={faq} index={index} />

                {/* Vertical Divider (Desktop) */}
                {index % 2 === 0 && (
                  <InteractiveDivider
                    orientation="vertical"
                    className="hidden lg:block absolute right-0 top-0 bottom-0 opacity-30"
                  />
                )}

                {/* Horizontal Divider (Mobile Always, Desktop only between rows) */}
                <InteractiveDivider
                  orientation="horizontal"
                  className={cn(
                    "opacity-30",
                    index < 2 ? "lg:hidden" : "" // Hide horizontal divider on desktop's first row
                  )}
                />
              </div>
            ))}
          </div>

          {/* Hidden Grid Area */}
          <AnimatePresence>
            {showAll && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden border-t-[3px] border-black/10 dark:border-white/10"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2">
                  {allFaqData.slice(INITIAL_COUNT).map((faq, index) => (
                    <div key={faq.id} className="relative flex flex-col h-full overflow-hidden">
                      <FAQCell faq={faq} index={index + INITIAL_COUNT} />

                      {/* Vertical Divider (Desktop) */}
                      {index % 2 === 0 && (
                        <InteractiveDivider
                          orientation="vertical"
                          className="hidden lg:block absolute right-0 top-0 bottom-0 opacity-30"
                        />
                      )}

                      {/* Horizontal Divider */}
                      {index < allFaqData.length - INITIAL_COUNT - 1 && (
                        <InteractiveDivider
                          orientation="horizontal"
                          className="opacity-30"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!showAll && (
          <div className="mt-16 flex flex-col items-center">
            <button
              onClick={() => setShowAll(true)}
              className="flex items-center gap-3 group p-6 transition-all duration-300 hover:scale-110"
              aria-label="Show more questions"
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="size-4 md:size-6 bg-black dark:bg-white rounded-full transition-all duration-300 group-hover:bg-primary group-hover:shadow-[0_0_20px_rgba(255,107,0,0.6)]"
                />
              ))}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
