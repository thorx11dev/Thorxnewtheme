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
      data-testid="hook-section"
    >
      <div className="text-center max-w-4xl mx-auto px-4 md:px-8 pt-4 md:pt-8">
        {/* Technical Header */}
        <div className="mb-6 md:mb-8">
          <div className="mb-2">
            <TechnicalLabel text="INITIALIZATION PROTOCOL" />
          </div>
          <Barcode className="w-24 md:w-32 h-8 md:h-10 mx-auto mb-4" />
          <TechnicalLabel text="REVENUE-001" />
        </div>
        
        {/* Tagline */}
        <p className="text-2xl md:text-3xl lg:text-4xl font-bold mb-8 md:mb-12 text-secondary px-2">
          Turn Attention into Currency
        </p>
        
        {/* Action Prompt */}
        <div className="space-y-4">
          <TechnicalLabel text="TAP TO START" className="md:hidden" />
          <TechnicalLabel text="PRESS ENTER TO INITIALIZE" className="hidden md:block" />
          <div className="w-12 h-1 bg-primary mx-auto pulse-glow"></div>
        </div>
      </div>
    </section>
  );
}
