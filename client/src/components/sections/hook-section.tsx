import TechnicalLabel from "@/components/ui/technical-label";
import Barcode from "@/components/ui/barcode";

interface HookSectionProps {
  isActive: boolean;
  onAdvance: () => void;
}

export default function HookSection({ isActive, onAdvance }: HookSectionProps) {
  return (
    <section 
      className={`cinematic-section ${isActive ? 'active' : ''}`}
      data-section="1"
      data-testid="hook-section"
    >
      <div className="text-center w-full max-w-4xl mx-auto px-6 md:px-8">
        {/* Technical Header */}
        <div className="mb-8 md:mb-8">
          <div className="mb-3">
            <TechnicalLabel text="INITIALIZATION PROTOCOL" />
          </div>
          <Barcode className="w-28 md:w-32 h-8 md:h-10 mx-auto mb-4" />
          <TechnicalLabel text="REVENUE-001" />
        </div>
        
        {/* Tagline */}
        <div className="px-4 md:px-2">
          <p className="text-2xl md:text-3xl lg:text-4xl font-bold mb-10 md:mb-12 text-secondary leading-tight">
            Turn Attention into Currency
          </p>
        </div>
        
        {/* Action Prompt */}
        <div className="space-y-6 md:space-y-4">
          <TechnicalLabel text="TAP TO START" className="md:hidden" />
          <TechnicalLabel text="PRESS ENTER TO INITIALIZE" className="hidden md:block" />
          <div className="w-16 md:w-12 h-1 bg-primary mx-auto pulse-glow"></div>
        </div>
      </div>
    </section>
  );
}
