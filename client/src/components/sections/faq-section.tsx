import { useState } from "react";
import TechnicalLabel from "@/components/ui/technical-label";
import Barcode from "@/components/ui/barcode";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ChevronDown } from "lucide-react"; // Assuming ChevronDown is available in lucide-react

interface FAQSectionProps {
  isActive: boolean;
}

const allFaqData = [
  {
    id: "001",
    protocol: "PLATFORM-INIT",
    question: "What is Thorx?",
    answer: "Thorx is an online earning platform designed for Pakistani users. You can earn money in PKR by watching video advertisements and inviting new users through our referral system. Official domain: thorx.pro"
  },
  {
    id: "002", 
    protocol: "EARNING-MODEL",
    question: "How do I earn money on Thorx?",
    answer: "You earn on Thorx through two main methods: 1) Watching video advertisements through our 4 advanced video players connected to different ad networks, and 2) Inviting new users through the referral system. Your earnings are credited in PKR."
  },
  {
    id: "003",
    protocol: "PAYMENT-PROC",
    question: "How can I get paid?",
    answer: "You can request withdrawals via JazzCash, EasyPaisa, or Bank Transfer. To be eligible for payout, you must complete your required daily tasks first. Navigate to the Payout section in your User Portal to request withdrawal."
  },
  {
    id: "004",
    protocol: "REFERRAL-SYSTEM",
    question: "How does the referral system work?",
    answer: "Thorx uses a multi-level referral system: When you refer User B, you earn 15% of their earnings. If User B refers User C, you earn 7.5% of User C's earnings. Commission is credited only when the referred user requests a payout."
  },
  {
    id: "005",
    protocol: "USER-LEVELS",
    question: "What are the user levels?",
    answer: "Thorx has 5 performance levels: Useless, Worker, Soldier, Captain, and General. Each level unlocks new daily tasks and requirements. Your level is based on your platform activity and performance."
  },
  {
    id: "006",
    protocol: "DAILY-TASKS",
    question: "What are daily tasks?",
    answer: "Daily tasks are mandatory activities to qualify for payouts. These may include: watching a required number of video ads, subscribing to Thorx YouTube channel, watching a 30-second YouTube video, and other performance-based activities."
  },
  {
    id: "007",
    protocol: "REGISTRATION",
    question: "How do I register on Thorx?",
    answer: "To register, provide your Name, Email, Phone number (optional), Password, and an Invitation code (optional). Your email and password are validated, and a unique Thorx Identity is generated for you. Registration completes after OTP verification via email."
  },
  {
    id: "008",
    protocol: "LOGIN-SECURITY",
    question: "How does login work?",
    answer: "Log in using your Email or Name and Password. For security, an OTP is sent to your registered email. Login completes only after OTP verification, ensuring your account stays protected."
  },
  {
    id: "009",
    protocol: "VIDEO-PLAYERS",
    question: "What are the video players?",
    answer: "The Work section contains 4 advanced video players, each connected to a different video ad network. Players feature Full Screen, Mute, and Auto-play options for convenient viewing."
  },
  {
    id: "010",
    protocol: "REFERRAL-SHARING",
    question: "How do I invite friends?",
    answer: "Go to the Referral section in your User Portal to copy your referral link, generate invitation codes, or share directly via WhatsApp, Instagram, Facebook, and other platforms."
  },
  {
    id: "011",
    protocol: "PAYOUT-CHANNELS",
    question: "What payout methods are available?",
    answer: "Thorx supports three payout methods for Pakistani users: JazzCash, EasyPaisa, and Bank Transfer. Add your preferred payment details in the Payout section."
  },
  {
    id: "012",
    protocol: "HELP-SUPPORT",
    question: "How do I get help?",
    answer: "The Help section has three areas: Area Guide for FAQs, Area Help for AI Chatbot support, and Area Contact for direct messaging to the Thorx team. We're here to assist you."
  },
  {
    id: "013",
    protocol: "THORX-IDENTITY",
    question: "What is Thorx Identity?",
    answer: "Thorx Identity is a unique identifier automatically generated for each user during registration. It helps track your earnings, referrals, and account activity securely."
  },
  {
    id: "014",
    protocol: "PLATFORM-SECURITY",
    question: "Is Thorx safe and secure?",
    answer: "Yes, Thorx uses multi-factor authentication via Email OTP for both registration and login. Your data is protected with encryption and secure session management."
  },
  {
    id: "015",
    protocol: "COMMISSION-CREDIT",
    question: "When do I receive referral commission?",
    answer: "Referral commissions are credited only when your referred user requests a payout. This ensures fair and verified commission distribution based on actual earnings."
  }
];

const INITIAL_FAQ_COUNT = 3;

export default function FAQSection({ isActive }: FAQSectionProps) {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [displayedFaqCount, setDisplayedFaqCount] = useState(INITIAL_FAQ_COUNT);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const handleValueChange = (value: string) => {
    setOpenItems(prev => ({
      ...prev,
      [value]: !prev[value]
    }));
  };

  const handleLoadMore = () => {
    setIsAnimating(true);
    setDisplayedFaqCount(allFaqData.length);
    setShowAll(true);
    setTimeout(() => {
      setIsAnimating(false);
    }, 500); // Animation duration
  };

  const displayedFaqs = allFaqData.slice(0, displayedFaqCount);

  return (
    <section 
      className={`cinematic-section ${isActive ? 'active' : ''}`}
      data-testid="faq-section"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 relative">
        {/* Industrial Grid Overlay */}
        <div className="industrial-grid"></div>

        {/* Desktop Layout */}
        <div className="hidden md:flex items-start justify-between gap-16 min-h-[70vh] pt-16">
          {/* Left Side - Clean Modern Title Container */}
          <div className="flex-shrink-0 w-96 pt-8 pr-8">
            <div className="space-y-8">
              {/* Protocol Badge */}
              <div className="inline-flex items-center gap-2 bg-primary/5 border border-primary/10 px-4 py-2 rounded-md">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <TechnicalLabel text="FAQ PROTOCOL v2.47" className="text-primary text-xs font-bold" />
              </div>
              
              {/* Main Title */}
              <div className="space-y-4">
                <h2 className="text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-foreground">
                  Knowledge<br />
                  <span className="text-primary">Base</span><br />
                  Access<span className="text-primary">.</span>
                </h2>
                
                {/* Accent Line */}
                <div className="h-1 w-20 bg-gradient-to-r from-primary to-primary/30 rounded-full"></div>
              </div>
              
              {/* Status & Barcode */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <TechnicalLabel text="SYSTEM STATUS: OPERATIONAL" className="text-muted-foreground text-xs" />
                </div>
                <Barcode className="w-32 h-6 opacity-30" />
              </div>
            </div>
          </div>

          {/* Right Side - Protocol Cards */}
          <div className="flex-1 space-y-6 max-w-3xl pl-8">
            {displayedFaqs.map((faq) => (
              <div
                key={faq.id}
                className={`split-card bg-background relative group transition-all duration-500 ${isAnimating && displayedFaqCount === allFaqData.length ? 'animate-zoom-in' : ''}`}
                data-testid={`faq-item-${faq.id}`}
              >
                {/* Protocol Header */}
                <div className="px-8 py-4 bg-primary text-primary-foreground border-b-[3px] border-black">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <TechnicalLabel text={`FAQ-${faq.id}`} className="text-white" />
                      <TechnicalLabel text={faq.protocol} className="text-white opacity-80" />
                    </div>
                    <div className="w-16 h-4 opacity-60">
                      <Barcode />
                    </div>
                  </div>
                </div>

                {/* Protocol Content */}
                <div className="bg-background">
                  <Accordion type="single" collapsible className="w-full" onValueChange={handleValueChange}>
                    <AccordionItem 
                      value={faq.id}
                      className="border-none"
                    >
                      <AccordionTrigger 
                        className="text-left hover:no-underline px-8 py-6 [&>svg]:hidden group-hover:bg-muted/20 transition-all"
                        data-testid={`faq-trigger-${faq.id}`}
                      >
                        <div className="flex items-center justify-between w-full gap-4">
                          <div className="text-xl lg:text-2xl font-bold text-foreground flex-1 leading-tight">
                            {faq.question}
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <div 
                              className="w-10 h-10 flex items-center justify-center bg-primary text-primary-foreground text-2xl font-black border-2 border-black hover:bg-primary/90 transition-all"
                              data-testid={`faq-expand-${faq.id}`}
                            >
                              {openItems[faq.id] ? '−' : '+'}
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-8 pb-6">
                        <div className="text-muted-foreground text-base lg:text-lg leading-relaxed border-l-4 border-primary pl-6 py-2">
                          {faq.answer}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </div>
            ))}

            {/* Load More Button - Desktop */}
            {!showAll && (
              <div className="flex justify-center pt-6">
                <button
                  onClick={handleLoadMore}
                  disabled={isAnimating}
                  className="group flex items-center gap-3 px-6 py-3 bg-primary text-primary-foreground border-2 border-black hover:bg-background hover:text-primary transition-all duration-300 disabled:opacity-50"
                  data-testid="load-more-desktop"
                >
                  <TechnicalLabel text="LOAD MORE" className="text-current font-bold text-sm" />
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-current rounded-full pulse-glow"></div>
                    <ChevronDown 
                      className={`w-5 h-5 transition-transform duration-300 ${
                        isAnimating ? 'animate-spin' : 'group-hover:translate-y-1'
                      }`} 
                    />
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden py-12">
          {/* Mobile Header */}
          <div className="text-center mb-8">
            <div className="mb-4">
              <TechnicalLabel text="FAQ PROTOCOL v2.47" />
            </div>
            <h2 className="text-4xl font-black tracking-tight leading-tight mb-4">
              <span className="text-foreground">Frequently</span><br />
              <span className="text-foreground">Asked</span><br />
              <span className="text-primary">Questions</span>
            </h2>
            <Barcode className="w-24 h-6 mx-auto opacity-60" />
          </div>

          {/* Mobile Protocol Cards */}
          <div className="space-y-4">
            {displayedFaqs.map((faq) => (
              <div
                key={faq.id}
                className={`split-card bg-background relative transition-all duration-500 ${isAnimating && displayedFaqCount === allFaqData.length ? 'animate-zoom-in' : ''}`}
                data-testid={`faq-item-${faq.id}`}
              >
                {/* Mobile Protocol Header */}
                <div className="px-6 py-3 bg-primary text-primary-foreground border-b-[3px] border-black">
                  <div className="flex items-center justify-between">
                    <TechnicalLabel text={`FAQ-${faq.id}`} className="text-white text-xs" />
                    <div className="w-12 h-3">
                      <Barcode />
                    </div>
                  </div>
                </div>

                {/* Mobile Content */}
                <div className="bg-background">
                  <Accordion type="single" collapsible className="w-full" onValueChange={handleValueChange}>
                    <AccordionItem 
                      value={faq.id}
                      className="border-none"
                    >
                      <AccordionTrigger 
                        className="text-left hover:no-underline px-6 py-5 [&>svg]:hidden"
                        data-testid={`faq-trigger-mobile-${faq.id}`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="text-lg font-bold text-foreground pr-3 leading-tight flex-1">
                            {faq.question}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-primary rounded-full pulse-glow"></div>
                            <div 
                              className="w-6 h-6 flex items-center justify-center text-primary text-xl font-bold border border-primary"
                              data-testid={`faq-expand-mobile-${faq.id}`}
                            >
                              {openItems[faq.id] ? '−' : '+'}
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-5">
                        <div className="text-foreground text-sm leading-relaxed bg-muted p-4 border-l-4 border-primary">
                          {faq.answer}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </div>
            ))}

            {/* Load More Button - Mobile */}
            {!showAll && (
              <div className="flex justify-center pt-6">
                <button
                  onClick={handleLoadMore}
                  disabled={isAnimating}
                  className="group flex items-center gap-3 px-6 py-3 bg-primary text-primary-foreground border-2 border-black hover:bg-background hover:text-primary transition-all duration-300 disabled:opacity-50"
                  data-testid="load-more-mobile"
                >
                  <TechnicalLabel text="LOAD MORE" className="text-current font-bold text-sm" />
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-current rounded-full pulse-glow"></div>
                    <ChevronDown 
                      className={`w-5 h-5 transition-transform duration-300 ${
                        isAnimating ? 'animate-spin' : 'group-hover:translate-y-1'
                      }`} 
                    />
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}