"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowDown } from "lucide-react";
import TechnicalLabel from "@/components/ui/technical-label";
import TextBlockAnimation from "@/components/ui/text-block-animation";

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
    answer: "THORX is an online earning platform designed specifically for Pakistani users, enabling them to convert their attention into real earnings in PKR. Official domain: thorx.pro. Our objective is to provide a halal and sustainable income opportunity through a transparent ecosystem where the entire community can earn together."
  },
  {
    id: "002",
    protocol: "EARNING-MODEL",
    question: "How do I earn on THORX?",
    answer: "You earn by: 1) Watching video advertisements attentively using the THORX Ads Player, 2) Visiting advertiser product pages via the THORX Web Panel and staying for approximately 30 seconds while reading and scrolling, 3) Inviting new users through the referral system. Tasks convert to earnings only when you actively engage with both video ads and web panels."
  },
  {
    id: "003",
    protocol: "ATTENTION-REQUIREMENT",
    question: "What does 'Turn Attention into Currency' mean?",
    answer: "THORX requires genuine attention and engagement. After watching a video ad completely, you must visit the advertiser's product page and stay for approximately 30 seconds, actively reading and scrolling. Tasks will NOT convert to earnings without real interaction. Auto-functioning without attention makes earnings haram."
  },
  {
    id: "004",
    protocol: "HALAL-ECOSYSTEM",
    question: "Is THORX earning Halal?",
    answer: "Yes. THORX operates within a halal-based earning model. All video advertisements follow strict content guidelines to ensure haram or inappropriate material is not promoted. Earnings are based on genuine work (attention and engagement), not passive income or interest."
  },
  {
    id: "005",
    protocol: "REFERRAL-SYSTEM",
    question: "How does the referral system work?",
    answer: "Multi-level system: When User A invites User B, User A earns 15% of User B's earnings. When User B invites User C, User A earns 7.5% and User B earns 15%. IMPORTANT: Commission is credited ONLY when the referred user requests a payout, not when they earn."
  },
  {
    id: "006",
    protocol: "RANKING-SYSTEM",
    question: "What are the user ranks?",
    answer: "Ranks based on BOTH total referrals AND total earnings: 1) Useless (new users, 50 ads), 2) Worker (10 refs + 25,000 PKR, 75 ads), 3) Soldier (15 refs + 35,000 PKR, 100 ads), 4) Captain (20 refs + 50,000 PKR, 125 ads), 5) General (25 refs + 100,000 PKR, 150 ads). Both conditions must be met to upgrade."
  },
  {
    id: "007",
    protocol: "DAILY-TASKS",
    question: "What are daily tasks?",
    answer: "Mandatory tasks (required for payout eligibility): watching required video ads based on rank, watching a YouTube video for 30+ seconds, watching a specific YouTube video and submitting verification code. Optional tasks: subscribing to THORX YouTube, TikTok, and Instagram channels."
  },
  {
    id: "008",
    protocol: "REGISTRATION-FLOW",
    question: "How do I register?",
    answer: "Provide: Full Name, Email Address, Password, Password Confirmation, and Invitation Code (optional). A unique THORX Identity is generated for you. An OTP is sent to your email. Registration completes only after OTP verification."
  },
  {
    id: "009",
    protocol: "PAYOUT-METHODS",
    question: "How do I withdraw my earnings?",
    answer: "Withdrawal options: JazzCash, EasyPaisa, or Bank Transfer. You MUST complete required daily tasks to be eligible for payouts. Navigate to the Payout section in your User Portal to request withdrawal."
  },
  {
    id: "010",
    protocol: "USER-PORTAL",
    question: "What is the User Portal?",
    answer: "The User Portal has 5 sections: 1) Dashboard (earnings summary, rank, analytics), 2) Work (4 advanced video ad players), 3) Referral (view invited users, copy links, generate codes), 4) Payout (withdrawal via JazzCash/EasyPaisa), 5) Help (FAQs, AI Chatbot, Contact team)."
  },
  {
    id: "011",
    protocol: "VIDEO-PLAYERS",
    question: "What are the video players?",
    answer: "The Work section includes 4 advanced video ad players, each connected to a different ad network. Features: Full-screen mode, Mute option, Auto-functioning support. You must watch ads completely and then visit product pages to complete tasks."
  },
  {
    id: "012",
    protocol: "AUTO-FUNCTION-WARNING",
    question: "Can I use auto-functioning features?",
    answer: "WARNING: Auto-functioning exists to simplify actions, NOT to replace attention. If you enable auto-functioning without actively paying attention, the earnings generated will be considered haram. Users must remain attentive at all times while completing tasks."
  },
  {
    id: "013",
    protocol: "THORX-IDENTITY",
    question: "What is THORX Identity?",
    answer: "THORX Identity is a unique identifier automatically generated during registration. It securely tracks your earnings, referral network, and all account activity. It never changes and is displayed in your Dashboard."
  },
  {
    id: "014",
    protocol: "SECURITY",
    question: "Is THORX secure?",
    answer: "Yes. THORX uses multi-factor authentication via Email OTP for both registration and login. Your data is encrypted and protected with secure session management. Sessions automatically expire for additional protection."
  },
  {
    id: "015",
    protocol: "VALUE-PROPOSITION",
    question: "How does THORX create value?",
    answer: "For Users: Convert genuine attention into halal earnings. For Ad Networks: Higher-quality leads from real engagement. For Advertisers: Users visit product pages for ~30 seconds, leading to better engagement, higher lead quality, and improved conversion rates."
  }
];

const INITIAL_COUNT = 4;

export default function FAQSection({ isActive }: FAQSectionProps) {
  const [showAll, setShowAll] = useState(false);

  const displayedFaqs = showAll ? allFaqData : allFaqData.slice(0, INITIAL_COUNT);

  return (
    <section
      className={`cinematic-section ${isActive ? 'active' : ''} bg-[#EAE5DD] dark:bg-black pt-44 md:pt-[320px] pb-24 px-4 overflow-y-auto`}
      data-testid="faq-section"
    >
      <div className="container mx-auto max-w-4xl">
        <div className="mb-12 md:mb-16">
          <TechnicalLabel text="KNOWLEDGE BASE" className="text-black/40 dark:text-white/40 mb-2" />
          <TextBlockAnimation blockColor="#ff6b00" animateOnScroll={false} trigger={isActive}>
            <h2 className="text-5xl md:text-8xl font-black text-black dark:text-white uppercase tracking-tight leading-none text-left">
              FAQ<span className="text-primary">.</span>
            </h2>
          </TextBlockAnimation>
          <div className="mt-4 w-24 h-1 bg-primary" />
        </div>

        <div className="space-y-0 border-[3px] border-black/10 dark:border-white/10 rounded-xl overflow-hidden bg-white/5 backdrop-blur-sm shadow-2xl">
          <Accordion type="single" collapsible className="w-full">
            {displayedFaqs.map((faq, index) => (
              <React.Fragment key={faq.id}>
                <AccordionItem
                  value={`item-${index}`}
                  className="border-none px-6 md:px-10 transition-all duration-300 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] data-[state=open]:bg-black/[0.03] dark:data-[state=open]:bg-white/[0.03]"
                >
                  <AccordionTrigger className="text-left py-8 md:py-10 text-xl md:text-3xl font-black hover:text-primary transition-colors hover:no-underline uppercase tracking-tight [&>svg]:size-6">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-lg md:text-2xl text-black/70 dark:text-white/70 pb-10 md:pb-14 font-bold leading-relaxed pt-2">
                    <div className="pl-6 border-l-[3px] border-primary/30">
                      {faq.answer}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                {index < displayedFaqs.length - 1 && (
                  <InteractiveDivider className="opacity-30" />
                )}
              </React.Fragment>
            ))}
          </Accordion>
        </div>

        {!showAll && (
          <div className="mt-16 group">
            <div className="flex items-center gap-4 md:gap-8 w-full">
              <InteractiveDivider className="flex-1 opacity-20" />
              <button
                onClick={() => setShowAll(true)}
                className="flex-shrink-0 flex items-center gap-4 px-8 py-4 bg-black dark:bg-white text-white dark:text-black hover:bg-primary dark:hover:bg-primary dark:hover:text-white transition-all duration-300 rounded-full"
              >
                <TechnicalLabel text="REVEAL FULL DATASET" className="font-black text-xs" />
                <ArrowDown className="size-4 animate-bounce" />
              </button>
              <InteractiveDivider className="flex-1 opacity-20" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}