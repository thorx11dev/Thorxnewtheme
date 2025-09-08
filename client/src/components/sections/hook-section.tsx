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
      <div className="text-center max-w-4xl mx-auto px-4">
        {/* Technical Header */}
        <div className="mb-8">
          <div className="mb-2">
            <TechnicalLabel text="INITIALIZATION PROTOCOL" />
          </div>
          <Barcode className="w-32 h-10 mx-auto mb-4" />
          <TechnicalLabel text="REVENUE-001" />
        </div>
        
        {/* Tagline */}
        <p className="text-3xl md:text-4xl font-bold mb-12 text-secondary">
          Turn Attention into Currency
        </p>
        
        {/* Action Prompt */}
        <div className="space-y-4">
          <TechnicalLabel text="PRESS ENTER TO INITIALIZE" />
          <div className="w-12 h-1 bg-primary mx-auto pulse-glow"></div>
        </div>
      </div>
    </section>
  );
}
