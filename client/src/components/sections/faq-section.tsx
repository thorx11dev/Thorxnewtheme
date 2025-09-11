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
        {/* Desktop Layout - Adjusted to match image */}
        <div className="hidden md:flex items-start justify-start gap-20 min-h-[70vh] pt-16">
          {/* Left Side - Title positioned as in image */}
          <div className="flex-shrink-0 w-80 pt-8">
            <h2 className="text-5xl lg:text-6xl font-black tracking-tight text-gray-400 leading-tight">
              Frequently<br />Asked<br />Questions.
            </h2>
          </div>
          
          {/* Right Side - FAQ Cards positioned as in image */}
          <div className="flex-1 space-y-4 max-w-2xl pt-0">
            {faqData.map((faq) => (
              <div
                key={faq.id}
                className="faq-document relative group"
                data-testid={`faq-item-${faq.id}`}
              >
                {/* File Tab - More realistic folder tab */}
                <div className="absolute -top-5 left-6 w-24 h-10 bg-gradient-to-b from-yellow-300 to-yellow-400 border-2 border-black border-b-0 rounded-t-lg z-10 shadow-md"></div>
                
                {/* Main Document */}
                <div className="bg-gradient-to-b from-yellow-400 to-yellow-500 border-2 border-black rounded-lg shadow-lg overflow-hidden relative">
                  {/* Document top edge highlight */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-yellow-300"></div>
                  
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem 
                      value={faq.id}
                      className="border-none"
                    >
                      <AccordionTrigger className="text-left hover:no-underline px-8 py-8 [&>svg]:hidden">
                        <div className="flex items-center justify-between w-full">
                          <div className="text-xl lg:text-2xl font-bold text-black pr-6 flex-1 leading-tight">
                            {faq.question}
                          </div>
                          <div className="flex items-center">
                            {/* Plus Icon with better styling */}
                            <div className="w-10 h-10 flex items-center justify-center text-black text-3xl font-bold bg-yellow-300 rounded-full border-2 border-black">
                              +
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-8 pb-8">
                        <div className="text-black text-lg font-medium leading-relaxed bg-yellow-50 p-4 rounded-md border border-yellow-600">
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