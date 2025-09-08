import TechnicalLabel from "@/components/ui/technical-label";
import Barcode from "@/components/ui/barcode";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface FAQSectionProps {
  isActive: boolean;
}

const faqData = [
  {
    id: "earning-001",
    question: "How do I start earning money with THORX?",
    answer: "Join THORX and earn through three main methods: watch video advertisements, invite new members through your referral code, and complete daily tasks. Each activity has different earning rates and requirements."
  },
  {
    id: "earning-002", 
    question: "What are the payment methods and withdrawal limits?",
    answer: "THORX supports multiple payment methods including bank transfers and mobile wallets. Minimum withdrawal is PKR 500. Payments are processed within 24-48 hours after approval."
  },
  {
    id: "system-001",
    question: "How does the referral system work?",
    answer: "Each user receives a unique referral code (format: THORX-XXXX). When someone joins using your code, you earn a percentage of their earnings. Your referral network can generate passive income over time."
  },
  {
    id: "system-002",
    question: "Are there daily earning limits or restrictions?",
    answer: "Yes, there are fair usage policies in place. Ad viewing has daily limits to ensure quality engagement. Daily tasks refresh every 24 hours. These limits help maintain platform sustainability."
  },
  {
    id: "account-001",
    question: "How is my account security and data protected?",
    answer: "THORX uses enterprise-grade security with encrypted data storage, secure session management, and fraud detection systems. Your personal information and earnings are fully protected."
  },
  {
    id: "technical-001",
    question: "What devices and browsers are supported?",
    answer: "THORX is fully responsive and works on all modern devices - smartphones, tablets, and desktops. Supported browsers include Chrome, Firefox, Safari, and Edge. Mobile apps are coming soon."
  }
];

export default function FAQSection({ isActive }: FAQSectionProps) {
  return (
    <section 
      className={`cinematic-section ${isActive ? 'active' : ''}`}
      data-testid="faq-section"
    >
      <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
        {/* Technical Header */}
        <div className="mb-8 md:mb-12">
          <div className="mb-2">
            <TechnicalLabel text="SYSTEM DOCUMENTATION" />
          </div>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-black mb-4">
            FREQUENTLY ASKED
          </h2>
          <Barcode className="w-32 md:w-48 h-8 md:h-10 mx-auto" />
        </div>

        {/* FAQ Content */}
        <div className="split-card bg-black text-white p-6 md:p-12 mb-6 md:mb-8">
          <div className="mb-6">
            <TechnicalLabel text="KNOWLEDGE BASE" className="text-white/70" />
          </div>
          
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqData.map((faq) => (
              <AccordionItem 
                key={faq.id}
                value={faq.id}
                className="border-white/20 bg-white/5 rounded-none"
                data-testid={`faq-item-${faq.id}`}
              >
                <AccordionTrigger className="text-left hover:no-underline px-4 py-4 md:px-6 md:py-6">
                  <div className="flex items-center gap-4 w-full">
                    <div className="flex-shrink-0">
                      <TechnicalLabel text={faq.id.toUpperCase()} className="text-primary text-xs" />
                    </div>
                    <div className="text-white text-base md:text-lg font-bold flex-1">
                      {faq.question}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 md:px-6 pb-4 md:pb-6">
                  <div className="text-white/80 text-sm md:text-base leading-relaxed pl-16 md:pl-20">
                    {faq.answer}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Additional Resources */}
        <div className="split-card bg-primary text-white p-4 md:p-6 mb-6 md:mb-8">
          <div className="grid md:grid-cols-2 gap-4 md:gap-6 text-left">
            <div>
              <TechnicalLabel text="SUPPORT-CONTACT" className="text-white/70 mb-2" />
              <div className="text-lg md:text-xl font-black">THORX-SUPPORT</div>
              <div className="text-white/80 text-sm">24/7 Technical Assistance</div>
            </div>
            <div>
              <TechnicalLabel text="SYSTEM-VERSION" className="text-white/70 mb-2" />
              <div className="text-lg md:text-xl font-black">v2.47</div>
              <div className="text-white/80 text-sm">Latest Platform Build</div>
            </div>
          </div>
        </div>

        {/* Legal Notice */}
        <div className="text-center">
          <TechnicalLabel text="FOR MORE QUESTIONS, CONTACT THORX TECHNICAL SUPPORT" />
          <Barcode className="w-24 h-10 mx-auto mt-4" />
        </div>
      </div>
    </section>
  );
}