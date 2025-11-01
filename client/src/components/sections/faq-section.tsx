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
          {/* Left Side - Clean Modern Title Container */}
          <div className="flex-shrink-0 w-96 pt-8 pr-8">
            <div className="inline-block relative mb-8">
              {/* Subtle gradient background */}
              <div className="relative bg-gradient-to-br from-white to-gray-50 border-l-4 border-primary p-8 lg:p-10 shadow-lg">
                {/* Top accent bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent"></div>
                
                {/* Content */}
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-sm">
                    <div className="w-2 h-2 bg-primary rounded-full pulse-glow"></div>
                    <TechnicalLabel text="FAQ PROTOCOL v2.47" className="text-primary" />
                  </div>
                </div>
                
                <h2 className="text-5xl lg:text-6xl font-black tracking-tight leading-tight mb-6 text-foreground">
                  Knowledge<br />
                  <span className="text-primary">Base</span><br />
                  Access<span className="text-primary">.</span>
                </h2>
                
                <div className="h-1 w-24 bg-gradient-to-r from-primary to-primary/40 mb-6"></div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <TechnicalLabel text="SYSTEM STATUS: OPERATIONAL" className="text-muted-foreground" />
                  </div>
                  <Barcode className="w-32 h-6 opacity-40" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Modern FAQ Cards */}
          <div className="flex-1 space-y-5 max-w-3xl pl-8">
            {displayedFaqs.map((faq) => (
              <div
                key={faq.id}
                className={`bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100 ${isAnimating && displayedFaqCount === allFaqData.length ? 'animate-zoom-in' : ''}`}
                data-testid={`faq-item-${faq.id}`}
              >
                {/* Clean Header */}
                <div className="px-6 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="px-2 py-1 bg-primary/10 rounded text-primary text-xs font-bold">
                        #{faq.id}
                      </div>
                      <TechnicalLabel text={faq.protocol} className="text-muted-foreground text-xs" />
                    </div>
                    <div className="w-12 h-3 opacity-30">
                      <Barcode />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="bg-white">
                  <Accordion type="single" collapsible className="w-full" onValueChange={handleValueChange}>
                    <AccordionItem 
                      value={faq.id}
                      className="border-none"
                    >
                      <AccordionTrigger 
                        className="text-left hover:no-underline px-6 py-5 [&>svg]:hidden hover:bg-gray-50/50 transition-all"
                        data-testid={`faq-trigger-${faq.id}`}
                      >
                        <div className="flex items-center justify-between w-full gap-4">
                          <div className="text-lg lg:text-xl font-bold text-foreground flex-1 leading-snug">
                            {faq.question}
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div 
                              className="w-8 h-8 flex items-center justify-center text-primary text-xl font-bold rounded-full bg-primary/10 hover:bg-primary hover:text-white transition-all"
                              data-testid={`faq-expand-${faq.id}`}
                            >
                              {openItems[faq.id] ? '−' : '+'}
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-5">
                        <div className="text-muted-foreground text-base leading-relaxed bg-gray-50 p-5 rounded-md border-l-3 border-primary/60">
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
              <div className="flex justify-center pt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={isAnimating}
                  className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary to-primary/90 text-white rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="load-more-desktop"
                >
                  <TechnicalLabel text="LOAD MORE" className="text-white font-bold text-sm" />
                  <div className="flex items-center gap-2">
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
          <div className="text-center mb-8 px-4">
            <div className="mb-4 inline-flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-sm">
              <div className="w-2 h-2 bg-primary rounded-full pulse-glow"></div>
              <TechnicalLabel text="FAQ PROTOCOL v2.47" className="text-primary" />
            </div>
            <h2 className="text-3xl font-black tracking-tight leading-tight mb-4 text-foreground">
              Knowledge<br />
              <span className="text-primary">Base</span> Access<span className="text-primary">.</span>
            </h2>
            <div className="h-1 w-16 bg-gradient-to-r from-primary to-primary/40 mx-auto mb-4"></div>
            <Barcode className="w-20 h-5 mx-auto opacity-30" />
          </div>

          {/* Mobile FAQ Cards */}
          <div className="space-y-4 px-4">
            {displayedFaqs.map((faq) => (
              <div
                key={faq.id}
                className={`bg-white rounded-lg shadow-md overflow-hidden border border-gray-100 transition-all duration-500 ${isAnimating && displayedFaqCount === allFaqData.length ? 'animate-zoom-in' : ''}`}
                data-testid={`faq-item-${faq.id}`}
              >
                {/* Mobile Header */}
                <div className="px-4 py-2.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="px-2 py-0.5 bg-primary/10 rounded text-primary text-xs font-bold">
                      #{faq.id}
                    </div>
                    <div className="w-10 h-2.5 opacity-30">
                      <Barcode />
                    </div>
                  </div>
                </div>

                {/* Mobile Content */}
                <div className="bg-white">
                  <Accordion type="single" collapsible className="w-full" onValueChange={handleValueChange}>
                    <AccordionItem 
                      value={faq.id}
                      className="border-none"
                    >
                      <AccordionTrigger 
                        className="text-left hover:no-underline px-4 py-4 [&>svg]:hidden"
                        data-testid={`faq-trigger-mobile-${faq.id}`}
                      >
                        <div className="flex items-center justify-between w-full gap-3">
                          <div className="text-base font-bold text-foreground leading-tight flex-1">
                            {faq.question}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div 
                              className="w-7 h-7 flex items-center justify-center text-primary text-lg font-bold rounded-full bg-primary/10"
                              data-testid={`faq-expand-mobile-${faq.id}`}
                            >
                              {openItems[faq.id] ? '−' : '+'}
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="text-muted-foreground text-sm leading-relaxed bg-gray-50 p-4 rounded-md border-l-3 border-primary/60">
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
                  className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-primary to-primary/90 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                  data-testid="load-more-mobile"
                >
                  <TechnicalLabel text="LOAD MORE" className="text-white font-bold text-sm" />
                  <div className="flex items-center gap-2">
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