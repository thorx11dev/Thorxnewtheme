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
    answer: "Thorx operates as an advanced earning protocol system, enabling revenue generation through verified activities: video engagement, task completion, and network expansion. Platform specifications: Multi-channel monetization, real-time processing, enterprise-grade security."
  },
  {
    id: "002", 
    protocol: "PAYMENT-PROC",
    question: "How can I get paid?",
    answer: "Payment processing follows automated protocols: Video AD-revenue ($0.05–$0.50 per engagement), Task completion ($1.00–$5.00 per task), Referral network bonuses ($2.00–$10.00 per referral). Output channels: Bank transfer, mobile wallet, cryptocurrency."
  },
  {
    id: "003",
    protocol: "SECURITY-VER",
    question: "Can I trust Thorx?",
    answer: "Security verification complete. Platform metrics: 99.7% uptime, ~2.4M+ processed payments, enterprise-grade security practices. Multi-layer encryption, real-time fraud detection, transparent audit trails ensure maximum user protection."
  },
  // Adding 12 more questions as requested
  {
    id: "004",
    protocol: "NETWORK-GROWTH",
    question: "How does the network expansion work?",
    answer: "Network expansion is driven by user referrals. Each successful referral contributes to network growth and unlocks bonus rewards. The system tracks referrals through unique invite codes."
  },
  {
    id: "005",
    protocol: "MONETIZATION-MODELS",
    question: "What are the monetization models?",
    answer: "Monetization includes video engagement (ad revenue), task completion (fixed rewards), and network growth (referral bonuses). Each model is designed for sustainable earning."
  },
  {
    id: "006",
    protocol: "REAL-TIME-PROCESSING",
    question: "Is the processing real-time?",
    answer: "Yes, Thorx utilizes a real-time processing engine for all activities, ensuring immediate updates on earnings and network status."
  },
  {
    id: "007",
    protocol: "ENTERPRISE-SECURITY",
    question: "What security measures are in place?",
    answer: "We employ enterprise-grade security, including multi-layer encryption, real-time fraud detection, and transparent audit trails to protect user data and transactions."
  },
  {
    id: "008",
    protocol: "VIDEO-ENGAGEMENT",
    question: "How much can I earn from video engagement?",
    answer: "Earnings from video engagement range from $0.05 to $0.50 per engagement, depending on ad type and user interaction."
  },
  {
    id: "009",
    protocol: "TASK-COMPLETION",
    question: "What kind of tasks are available?",
    answer: "Tasks vary and can include surveys, data entry, content review, and more. Rewards typically range from $1.00 to $5.00 per task."
  },
  {
    id: "010",
    protocol: "REFERRAL-BONUSES",
    question: "What are the referral bonuses?",
    answer: "Referral bonuses start at $2.00 and can go up to $10.00 per successful referral, encouraging network growth."
  },
  {
    id: "011",
    protocol: "PAYOUT-CHANNELS",
    question: "What are the available payout channels?",
    answer: "Payouts can be received via bank transfer, mobile wallet, or cryptocurrency."
  },
  {
    id: "012",
    protocol: "PLATFORM-METRICS",
    question: "What are the platform's uptime metrics?",
    answer: "The platform boasts a 99.7% uptime, ensuring consistent availability for all users."
  },
  {
    id: "013",
    protocol: "FRAUD-DETECTION",
    question: "How is fraud detected?",
    answer: "Real-time fraud detection mechanisms are integrated to identify and prevent suspicious activities, safeguarding the platform and its users."
  },
  {
    id: "014",
    protocol: "AUDIT-TRAILS",
    question: "Are there transparent audit trails?",
    answer: "Yes, transparent audit trails are maintained for all transactions and activities, providing accountability and security."
  },
  {
    id: "015",
    protocol: "USER-PROTECTION",
    question: "How is user data protected?",
    answer: "User data is protected through multi-layer encryption and strict security protocols, ensuring privacy and safety."
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
          {/* Left Side - Industrial Title */}
          <div className="flex-shrink-0 w-96 pt-8">
            <div className="mb-6">
              <TechnicalLabel text="FAQ PROTOCOL v2.47" />
            </div>
            <h2 className="text-5xl lg:text-6xl font-black tracking-tight leading-tight mb-6" style={{ textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }}>
              <span className="text-black">K</span>
              <span className="text-white">n</span>
              <span className="text-primary">o</span>
              <span className="text-black">w</span>
              <span className="text-white">l</span>
              <span className="text-primary">e</span>
              <span className="text-black">d</span>
              <span className="text-white">g</span>
              <span className="text-primary">e</span><br />
              <span className="text-black">B</span>
              <span className="text-white">a</span>
              <span className="text-primary">s</span>
              <span className="text-black">e</span><br />
              <span className="text-white">A</span>
              <span className="text-primary">c</span>
              <span className="text-black">c</span>
              <span className="text-white">e</span>
              <span className="text-primary">s</span>
              <span className="text-black">s</span>
              <span className="text-white">.</span>
            </h2>
            <div className="space-y-2">
              <TechnicalLabel text="SYSTEM STATUS: OPERATIONAL" />
              <Barcode className="w-32 h-8 opacity-60" />
            </div>
          </div>

          {/* Right Side - Protocol Cards */}
          <div className="flex-1 space-y-6 max-w-3xl">
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
                        <div className="flex items-center justify-between w-full">
                          <div className="text-xl lg:text-2xl font-bold text-foreground pr-6 flex-1 leading-tight">
                            {faq.question}
                          </div>
                          <div className="flex items-center gap-3">
                            {/* Status Indicator */}
                            <div className="w-3 h-3 bg-primary rounded-full pulse-glow"></div>
                            {/* Expand Icon */}
                            <div 
                              className="w-8 h-8 flex items-center justify-center text-primary text-2xl font-bold border-2 border-primary transition-all group-hover:bg-primary group-hover:text-white"
                              data-testid={`faq-expand-${faq.id}`}
                            >
                              {openItems[faq.id] ? '−' : '+'}
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-8 pb-6">
                        <div className="text-foreground text-base leading-relaxed bg-muted p-6 border-l-4 border-primary">
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
            <h2 className="text-4xl font-black tracking-tight leading-tight mb-4" style={{ textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }}>
              <span className="text-black">K</span>
              <span className="text-white">n</span>
              <span className="text-primary">o</span>
              <span className="text-black">w</span>
              <span className="text-white">l</span>
              <span className="text-primary">e</span>
              <span className="text-black">d</span>
              <span className="text-white">g</span>
              <span className="text-primary">e</span><br />
              <span className="text-black">B</span>
              <span className="text-white">a</span>
              <span className="text-primary">s</span>
              <span className="text-black">e</span><br />
              <span className="text-white">A</span>
              <span className="text-primary">c</span>
              <span className="text-black">c</span>
              <span className="text-white">e</span>
              <span className="text-primary">s</span>
              <span className="text-black">s</span>
              <span className="text-white">.</span>
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