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
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        {/* Desktop Layout */}
        <div className="hidden md:flex items-start gap-12 lg:gap-16">
          {/* Left Side - Title */}
          <div className="flex-shrink-0 w-80">
            <h2 className="text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight text-gray-500 leading-tight">
              Frequently<br />Asked<br />Questions.
            </h2>
          </div>
          
          {/* Right Side - FAQ Cards */}
          <div className="flex-1 space-y-4 max-w-2xl">
            {faqData.map((faq) => (
              <div
                key={faq.id}
                className="faq-folder relative"
                data-testid={`faq-item-${faq.id}`}
              >
                {/* Folder Tab */}
                <div className="absolute -top-3 left-6 w-16 h-6 bg-gradient-to-r from-orange-400 to-orange-500 border-2 border-black border-b-0 rounded-t-lg"></div>
                
                {/* Main Card */}
                <div className="bg-gradient-to-r from-orange-400 to-orange-500 border-2 border-black rounded-lg overflow-hidden">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem 
                      value={faq.id}
                      className="border-none"
                    >
                      <AccordionTrigger className="text-left hover:no-underline px-6 py-6 [&>svg]:h-8 [&>svg]:w-8 [&>svg]:stroke-[3px] [&>svg]:text-black">
                        <div className="text-xl lg:text-2xl font-black text-black pr-4">
                          {faq.question}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <div className="text-black/80 text-lg font-medium leading-relaxed">
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
        <div className="md:hidden">
          {/* Mobile Title */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black tracking-tight text-gray-500 leading-tight">
              Frequently<br />Asked<br />Questions.
            </h2>
          </div>
          
          {/* Mobile FAQ Cards */}
          <div className="space-y-4">
            {faqData.map((faq) => (
              <div
                key={faq.id}
                className="faq-folder relative"
                data-testid={`faq-item-${faq.id}`}
              >
                {/* Mobile Folder Tab */}
                <div className="absolute -top-2 left-4 w-12 h-5 bg-gradient-to-r from-orange-400 to-orange-500 border-2 border-black border-b-0 rounded-t-md"></div>
                
                {/* Mobile Main Card */}
                <div className="bg-gradient-to-r from-orange-400 to-orange-500 border-2 border-black rounded-lg overflow-hidden">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem 
                      value={faq.id}
                      className="border-none"
                    >
                      <AccordionTrigger className="text-left hover:no-underline px-4 py-5 [&>svg]:h-6 [&>svg]:w-6 [&>svg]:stroke-[3px] [&>svg]:text-black">
                        <div className="text-lg font-black text-black pr-3 leading-tight">
                          {faq.question}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-5">
                        <div className="text-black/80 text-base font-medium leading-relaxed">
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