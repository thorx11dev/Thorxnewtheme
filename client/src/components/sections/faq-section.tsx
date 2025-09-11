import TechnicalLabel from "@/components/ui/technical-label";
import Barcode from "@/components/ui/barcode";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface FAQSectionProps {
  isActive: boolean;
}

const faqData = [
  {
    id: "001",
    question: "What is Thorx?",
    answer: "Thorx is a revolutionary earning platform that allows you to make money through various activities like watching ads, completing tasks, and referring friends."
  },
  {
    id: "002", 
    question: "How can I get paid?",
    answer: "You earn money by watching video ads, completing daily tasks, and building your referral network. Payments are processed through bank transfers and mobile wallets."
  },
  {
    id: "003",
    question: "Can I trust Thorx?",
    answer: "Absolutely! Thorx has a proven track record with millions already paid out to users. Our secure platform ensures reliable payments and transparent earning opportunities."
  }
];

export default function FAQSection({ isActive }: FAQSectionProps) {
  return (
    <section 
      className={`cinematic-section ${isActive ? 'active' : ''}`}
      data-testid="faq-section"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Desktop Layout */}
        <div className="hidden md:flex items-center justify-between gap-16 min-h-[60vh]">
          {/* Left Side - Title */}
          <div className="flex-shrink-0 w-96">
            <h2 className="text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight text-gray-300 leading-tight">
              Frequently<br />Asked<br />Questions.
            </h2>
          </div>
          
          {/* Right Side - FAQ Cards */}
          <div className="flex-1 space-y-3 max-w-3xl">
            {faqData.map((faq) => (
              <div
                key={faq.id}
                className="faq-folder relative group"
                data-testid={`faq-item-${faq.id}`}
              >
                {/* Folder Tab */}
                <div className="absolute -top-4 left-8 w-20 h-8 bg-yellow-400 border-4 border-black border-b-0 rounded-t-lg z-10"></div>
                
                {/* Main Card */}
                <div className="bg-yellow-400 border-4 border-black rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 group-hover:scale-[1.01]">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem 
                      value={faq.id}
                      className="border-none"
                    >
                      <AccordionTrigger className="text-left hover:no-underline px-8 py-6 [&>svg]:hidden">
                        <div className="flex items-center justify-between w-full">
                          <div className="text-2xl lg:text-3xl font-black text-black pr-4 flex-1">
                            {faq.question}
                          </div>
                          <div className="flex items-center">
                            {/* Plus Icon */}
                            <div className="w-8 h-8 flex items-center justify-center text-black text-4xl font-black">
                              +
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-8 pb-6">
                        <div className="text-black text-xl font-medium leading-relaxed">
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
          {/* Mobile Title */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black tracking-tight text-gray-300 leading-tight">
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
                <div className="absolute -top-3 left-6 w-16 h-6 bg-yellow-400 border-3 border-black border-b-0 rounded-t-md z-10"></div>
                
                {/* Mobile Main Card */}
                <div className="bg-yellow-400 border-3 border-black rounded-lg overflow-hidden">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem 
                      value={faq.id}
                      className="border-none"
                    >
                      <AccordionTrigger className="text-left hover:no-underline px-6 py-5 [&>svg]:hidden">
                        <div className="flex items-center justify-between w-full">
                          <div className="text-lg font-black text-black pr-3 leading-tight flex-1">
                            {faq.question}
                          </div>
                          <div className="flex items-center">
                            {/* Mobile Plus Icon */}
                            <div className="w-6 h-6 flex items-center justify-center text-black text-2xl font-black">
                              +
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-5">
                        <div className="text-black text-base font-medium leading-relaxed">
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