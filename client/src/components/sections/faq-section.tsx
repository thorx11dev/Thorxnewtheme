import { useState } from "react";
import TechnicalLabel from "@/components/ui/technical-label";
import Barcode from "@/components/ui/barcode";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface FAQSectionProps {
  isActive: boolean;
}

const faqData = [
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
  }
];

export default function FAQSection({ isActive }: FAQSectionProps) {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const handleValueChange = (value: string) => {
    setOpenItems(prev => ({
      ...prev,
      [value]: !prev[value]
    }));
  };
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
            <h2 className="text-5xl lg:text-6xl font-black tracking-tight text-primary leading-tight mb-6">
              Knowledge<br />Base<br />Access.
            </h2>
            <div className="space-y-2">
              <TechnicalLabel text="SYSTEM STATUS: OPERATIONAL" />
              <Barcode className="w-32 h-8 opacity-60" />
            </div>
          </div>
          
          {/* Right Side - Protocol Cards */}
          <div className="flex-1 space-y-6 max-w-3xl">
            {faqData.map((faq) => (
              <div
                key={faq.id}
                className="split-card bg-background relative group"
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
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden py-12">
          {/* Mobile Header */}
          <div className="text-center mb-8">
            <div className="mb-4">
              <TechnicalLabel text="FAQ PROTOCOL v2.47" />
            </div>
            <h2 className="text-4xl font-black tracking-tight text-primary leading-tight mb-4">
              Knowledge<br />Base<br />Access.
            </h2>
            <Barcode className="w-24 h-6 mx-auto opacity-60" />
          </div>
          
          {/* Mobile Protocol Cards */}
          <div className="space-y-4">
            {faqData.map((faq) => (
              <div
                key={faq.id}
                className="split-card bg-background relative"
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
          </div>
        </div>
      </div>
    </section>
  );
}