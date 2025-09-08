import { useEffect, useRef } from "react";
import TechnicalLabel from "@/components/ui/technical-label";
import Barcode from "@/components/ui/barcode";
import CounterDisplay from "@/components/ui/counter-display";

interface EarningRevealProps {
  isActive: boolean;
  onAdvance: () => void;
}

export default function EarningReveal({ isActive, onAdvance }: EarningRevealProps) {
  const adsCounterRef = useRef<HTMLSpanElement>(null);
  const referralCounterRef = useRef<HTMLSpanElement>(null);
  const dailyCounterRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isActive) {
      // Animate counters when section becomes active
      setTimeout(() => {
        if (adsCounterRef.current) {
          CounterDisplay.animateCounter(adsCounterRef.current, 15);
        }
        if (referralCounterRef.current) {
          CounterDisplay.animateCounter(referralCounterRef.current, 250);
        }
        if (dailyCounterRef.current) {
          CounterDisplay.animateCounter(dailyCounterRef.current, 50);
        }
      }, 500);
    }
  }, [isActive]);

  return (
    <section 
      className={`cinematic-section ${isActive ? 'active' : ''}`}
      data-testid="earning-reveal-section"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4 md:pt-8">
        {/* Technical Header */}
        <div className="text-center mb-8 md:mb-12">
          <div className="mb-2">
            <TechnicalLabel text="REVENUE GENERATION METHODS" />
          </div>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-black mb-4">
            EARN PKR IN 3 WAYS
          </h2>
          <Barcode className="w-32 md:w-48 h-8 md:h-10 mx-auto" />
        </div>

        {/* Split Screen Cards */}
        <div className="grid md:grid-cols-2 gap-4 md:gap-0 mb-8 md:mb-12 max-w-6xl mx-auto">
          {/* Dark Section */}
          <div className="split-card bg-black text-white p-6 md:p-12 relative min-h-64 md:h-96">
            {/* Corner Number */}
            <div className="absolute top-4 left-4 text-white text-6xl font-black">01</div>
            
            <div className="mt-16 space-y-6">
              <div className="text-white/80 text-sm font-semibold tracking-wider">WATCH ADS</div>
              
              {/* Stats */}
              <div className="space-y-4">
                <div className="text-5xl font-black counter-display text-white">
                  <span ref={adsCounterRef} data-testid="ads-counter">1628</span>
                </div>
                
                {/* Progress bars */}
                <div className="space-y-2">
                  <div className="w-full bg-white/20 h-1">
                    <div className="bg-white h-1 w-3/4"></div>
                  </div>
                  <div className="w-full bg-white/20 h-1">
                    <div className="bg-white h-1 w-1/2"></div>
                  </div>
                  <div className="w-full bg-white/20 h-1">
                    <div className="bg-white h-1 w-2/3"></div>
                  </div>
                </div>
              </div>

              {/* Bottom corner icon */}
              <div className="absolute bottom-6 right-6">
                <div className="w-12 h-12 border-2 border-white rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 bg-white rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Orange Section */}
          <div className="split-card bg-primary text-white p-6 md:p-12 relative min-h-64 md:h-96 overflow-hidden">
            {/* Next button */}
            <div className="absolute top-4 left-4">
              <button onClick={onAdvance} className="bg-black text-white px-3 py-1 text-sm font-semibold flex items-center">
                ← Next
              </button>
            </div>
            
            {/* Corner Number */}
            <div className="absolute top-4 right-4 text-white text-6xl font-black">02</div>
            
            {/* Central Product Showcase */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 w-64 h-32 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-white text-2xl font-black mb-2">THORX</div>
                  <div className="text-white/80 text-sm">EARNING PLATFORM</div>
                </div>
              </div>
            </div>
            
            <div className="mt-16 space-y-6 relative z-10">
              <div className="text-white/80 text-sm font-semibold tracking-wider">INVITE MEMBERS</div>
              
              {/* Stats */}
              <div className="space-y-4">
                <div className="text-5xl font-black counter-display text-white">
                  <span ref={referralCounterRef} data-testid="referral-counter">2,628</span>
                </div>
                
                {/* Progress bars */}
                <div className="space-y-2">
                  <div className="w-full bg-white/20 h-1">
                    <div className="bg-white h-1 w-4/5"></div>
                  </div>
                  <div className="w-full bg-white/20 h-1">
                    <div className="bg-white h-1 w-3/4"></div>
                  </div>
                  <div className="w-full bg-white/20 h-1">
                    <div className="bg-white h-1 w-5/6"></div>
                  </div>
                </div>
              </div>

              {/* Bottom corner icon */}
              <div className="absolute bottom-6 right-6">
                <div className="w-12 h-12 border-2 border-white rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 bg-white rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Rewards Card */}
        <div className="split-card bg-muted border-2 border-black p-6 md:p-8 lg:p-12 text-center">
          <TechnicalLabel text="METHOD-003" className="mb-4" />
          <h3 className="text-2xl md:text-4xl font-black mb-4 text-black">DAILY REWARDS</h3>
          <div className="text-4xl md:text-6xl font-black counter-display text-black mb-4">
            ₨<span ref={dailyCounterRef} data-testid="daily-counter">0</span>
          </div>
          <p className="text-base md:text-lg text-secondary px-2">Consistent engagement yields consistent returns. Login daily for bonus rewards.</p>
        </div>

        {/* Continue Button */}
        <div className="text-center mt-8 md:mt-12">
          <button 
            onClick={onAdvance}
            className="bg-black text-white px-8 md:px-12 py-3 md:py-4 text-lg md:text-xl font-black tracking-wider hover:bg-primary transition-colors pulse-glow"
            data-testid="button-proceed"
          >
            PROCEED →
          </button>
        </div>
      </div>
    </section>
  );
}
