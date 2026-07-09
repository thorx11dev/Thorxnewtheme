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
    answer: "THORX is an AI-powered digital engagement platform that connects businesses with verified human attention while enabling users to earn real money through meaningful online activities. We operate a dual-engine architecture: Engine A (Attention Marketplace) and Engine B (AI-Driven CPA Offers), backed by a 3-tier referral system."
  },
  {
    id: "002",
    protocol: "EARNING-MODEL",
    question: "How do I earn on THORX?",
    answer: "You earn through three systems: 1) Engine A — watch 15–25 second video ads then actively explore the advertiser's page for 15 seconds inside our AI sandbox. 2) Engine B — complete curated CPA tasks (app downloads, reviews, registrations) with AI-verified proof submission. 3) Engine C — earn 15% / 7.5% referral commissions when your invited users withdraw earnings."
  },
  {
    id: "003",
    protocol: "ATTENTION-REQUIREMENT",
    question: "What does 'Turn Attention into Currency' mean?",
    answer: "THORX's hidden AI Attention Detector tracks three real behavioral signals: Tab Visibility (pauses if you switch tabs), Micro-Movement Delta (detects cursor or touch activity), and Scroll Vector (confirms you've scrolled at least 10–20% of the page). All three must pass before a payout is issued. Genuine attention is the product — no shortcuts allowed."
  },
  {
    id: "004",
    protocol: "HALAL-ECOSYSTEM",
    question: "Is THORX earning Halal?",
    answer: "Yes. THORX operates within a strict halal-based earning model. All video advertisements and CPA offers undergo content filtering — no haram or inappropriate material is promoted. Earnings are based on genuine work (verified human attention and engagement), not passive income, interest, or gambling."
  },
  {
    id: "005",
    protocol: "REFERRAL-SYSTEM",
    question: "How does the 3-Division Referral Matrix work?",
    answer: "THORX uses a 3-tier referral structure: When your Level 1 referral (User B) withdraws, you receive 15% of their gross earnings. When their Level 1 referral (User C) withdraws, you receive 7.5% and User B receives 15%. Users who join without a referral link pay a flat 15% Admin Charge at withdrawal instead. Commissions are triggered by payout requests — not by earnings."
  },
  {
    id: "006",
    protocol: "WALLET-DEDUCTIONS",
    question: "What fees are deducted at withdrawal?",
    answer: "THORX uses a Net-First UI — your wallet always shows your exact withdrawable balance with all fees already calculated in the background. At withdrawal: Referred users have 34.5% deducted total (12% platform fee + 15% Level 1 referral + 7.5% Level 2 referral). Solo/organic users have 27% deducted (12% platform fee + 15% admin charge). What you see is exactly what you get."
  },
  {
    id: "007",
    protocol: "ENGINE-A",
    question: "What is Engine A — the Attention Marketplace?",
    answer: "Engine A is the core earning engine. Phase 1: You watch a 15–25 second video ad via our Waterfall Video Player (if one ad network is empty, the next loads instantly — zero downtime). Phase 2: The advertiser's landing page loads inside a secure Thorx sandbox. You must actively explore it for 15 seconds. A hidden AI behavioral tracker verifies genuine attention before crediting your wallet."
  },
  {
    id: "008",
    protocol: "ENGINE-B",
    question: "What is Engine B — AI-Driven CPA Offers?",
    answer: "Engine B is the high-yield task system. The THORX team curates reliable offers from top CPA networks (app downloads, reviews, registrations). You complete the task and upload proof. Our AI Agent then runs a multi-tier fraud check: Tier 1 checks metadata/hash for duplicates, Tier 2 uses OCR + LLM to verify screenshot content, Tier 3 moves approved tasks to escrow before admin final release."
  },
  {
    id: "009",
    protocol: "LEADX-SYSTEM",
    question: "What is the LeadX System?",
    answer: "LeadX is THORX's proprietary lead generation system for advertisers. It combines Engine A's attention verification and Engine B's offer infrastructure to deliver verified, high-quality leads — not just impressions or clicks. Advertisers can opt into LeadX for best results or choose to launch their own campaigns directly through the Advertiser Portal."
  },
  {
    id: "010",
    protocol: "USER-PORTAL",
    question: "What is inside the User Portal?",
    answer: "The User Portal has 5 sections: 1) Dashboard — earnings overview, rank, and analytics. 2) Work — Engine A video players + Engine B CPA Offerwall. 3) Referral — team tracking and referral link. 4) Payout — withdraw to JazzCash or EasyPaisa. 5) Help — Area Guide (FAQs), Area Help (AI chatbot), Area Contact (direct support)."
  },
  {
    id: "011",
    protocol: "RANKING-SYSTEM",
    question: "What are the user ranks and how do they work?",
    answer: "THORX uses a Dual-Requirement Ranking System — you must meet BOTH referral and earnings thresholds to upgrade. Ranks and withdrawal priorities: 1) Nawa Aya (Priority 5 — new users), 2) Chota Don (5 refs + 2,500 PKR — Priority 4), 3) Baja Ji (10 refs + 5,000 PKR — Priority 3), 4) Haji Sab (15 refs + 10,000 PKR — Priority 2), 5) Supreme Chacha (25 refs + 25,000 PKR — Priority 1, fastest payouts)."
  },
  {
    id: "012",
    protocol: "PAYOUT-METHODS",
    question: "How do I withdraw my earnings?",
    answer: "Withdrawals are sent directly to JazzCash or EasyPaisa. You must complete your required daily tasks to unlock the payout page. Higher-ranked users (Supreme Chacha, Haji Sab) have their payouts processed first. The minimum withdrawal amount is shown in your Wallet section. Deductions are calculated before display — there are no surprise cuts at checkout."
  },
  {
    id: "013",
    protocol: "AD-BLOCKER",
    question: "Why does THORX ask me to disable my ad-blocker?",
    answer: "Thorx delivers real ad content as the core earning mechanism. If an ad-blocker or ad-blocking browser (like Brave) is detected, THORX serves a gateway modal that blocks access to the earning area until you whitelist THORX. Ads must load for the earning loop to function — blocking them means no earning is possible."
  },
  {
    id: "014",
    protocol: "SECURITY",
    question: "Is THORX secure and my data safe?",
    answer: "Yes. THORX uses secure authentication, encrypted data handling, and AI-powered fraud prevention on every interaction. The platform is web-first by design — no app download needed — which allows immediate security patches and hot-fixes to be deployed without app store delays."
  },
  {
    id: "015",
    protocol: "VALUE-PROPOSITION",
    question: "How does THORX create value for all sides?",
    answer: "For Users: Convert genuine attention into real PKR earnings via JazzCash/EasyPaisa with full fee transparency. For Advertisers: Verified human attention — not bot traffic — with AI behavioral proof on every impression, delivering higher conversion rates than traditional social media ads. For the Ecosystem: A self-sustaining viral growth engine powered by the 3-tier referral matrix."
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
            <div className="py-2">
              <VariableFontHoverByRandomLetter
                label="FAQ."
                className="font-black uppercase tracking-tighter text-4xl md:text-7xl lg:text-8xl leading-tight text-black dark:text-white"
                fromFontVariationSettings="'wght' 900, 'slnt' 0"
                toFontVariationSettings="'wght' 400, 'slnt' -10"
              />
            </div>
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
