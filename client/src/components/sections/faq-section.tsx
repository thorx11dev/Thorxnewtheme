import TechnicalLabel from "@/components/ui/technical-label";
import Barcode from "@/components/ui/barcode";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface FAQSectionProps {
  isActive: boolean;
}

const faqData = [
  {
    id: "001",
    question: "How do I start earning with THORX?",
    answer: "Join and earn through video ads, referrals, and daily tasks."
  },
  {
    id: "002", 
    question: "What are the withdrawal methods?",
    answer: "Bank transfers and mobile wallets. Minimum PKR 500."
  },
  {
    id: "003",
    question: "How does the referral system work?",
    answer: "Get your THORX code and earn from your network's activity."
  }
];

export default function FAQSection({ isActive }: FAQSectionProps) {
  return (
    <section 
      className={`cinematic-section ${isActive ? 'active' : ''}`}
      data-testid="faq-section"
    >
      <div className="max-w-5xl mx-auto px-4 md:px-8 text-center">
        {/* Modern Header */}
        <div className="mb-12 md:mb-16">
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-black mb-6">
            Frequently<br />Asked<br />Questions.
          </h2>
        </div>

        {/* Modern FAQ Cards */}
        <div className="space-y-6 md:space-y-8 max-w-4xl mx-auto">
          {faqData.map((faq) => (
            <div
              key={faq.id}
              className="faq-card bg-gradient-to-br from-yellow-400 to-yellow-500 border-4 border-black text-black p-6 md:p-8 transform hover:scale-[1.02] transition-all duration-300"
              data-testid={`faq-item-${faq.id}`}
            >
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem 
                  value={faq.id}
                  className="border-none"
                >
                  <AccordionTrigger className="text-left hover:no-underline p-0 [&>svg]:h-6 [&>svg]:w-6 [&>svg]:stroke-[3px]">
                    <div className="flex items-center gap-4 w-full">
                      <div className="text-2xl md:text-3xl font-black flex-1 text-left">
                        {faq.question}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 p-0">
                    <div className="text-black/80 text-lg md:text-xl font-medium leading-relaxed">
                      {faq.answer}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}