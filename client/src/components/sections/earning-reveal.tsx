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
      <div className="max-w-7xl mx-auto px-4">
        {/* Technical Header */}
        <div className="text-center mb-12">
          <div className="mb-2">
            <TechnicalLabel text="REVENUE GENERATION METHODS" />
          </div>
          <h2 className="text-5xl md:text-6xl font-black tracking-tight text-black mb-4">
            EARN PKR IN 3 WAYS
          </h2>
          <Barcode className="w-48 h-10 mx-auto" />
        </div>

        {/* Split Screen Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Dark Section */}
          <div className="split-card bg-black text-white p-8 md:p-12">
            <div className="space-y-8">
              <TechnicalLabel text="METHOD-001" className="text-white/70" />
              <h3 className="text-4xl font-black mb-4">WATCH ADS</h3>
              <div className="text-6xl font-black counter-display text-primary mb-4">
                ₨<span ref={adsCounterRef} data-testid="ads-counter">0</span>
              </div>
              <p className="text-lg mb-6">Earn PKR for every advertisement watched. Simple attention, instant rewards.</p>
              <Barcode className="w-full h-10 bg-white" />
            </div>
          </div>

          {/* Orange Section */}
          <div className="split-card bg-primary text-white p-8 md:p-12">
            <div className="space-y-8">
              <TechnicalLabel text="METHOD-002" className="text-white/70" />
              <h3 className="text-4xl font-black mb-4">INVITE MEMBERS</h3>
              <div className="text-6xl font-black counter-display mb-4">
                ₨<span ref={referralCounterRef} data-testid="referral-counter">0</span>
              </div>
              <p className="text-lg mb-6">Build your network. Each referral multiplies your earning potential exponentially.</p>
              <Barcode className="w-full h-10 bg-white" />
            </div>
          </div>
        </div>

        {/* Daily Rewards Card */}
        <div className="split-card bg-muted border-2 border-black p-8 md:p-12 text-center">
          <TechnicalLabel text="METHOD-003" className="mb-4" />
          <h3 className="text-4xl font-black mb-4 text-black">DAILY REWARDS</h3>
          <div className="text-6xl font-black counter-display text-black mb-4">
            ₨<span ref={dailyCounterRef} data-testid="daily-counter">0</span>
          </div>
          <p className="text-lg text-secondary">Consistent engagement yields consistent returns. Login daily for bonus rewards.</p>
        </div>

        {/* Continue Button */}
        <div className="text-center mt-12">
          <button 
            onClick={onAdvance}
            className="bg-black text-white px-12 py-4 text-xl font-black tracking-wider hover:bg-primary transition-colors pulse-glow"
            data-testid="button-proceed"
          >
            PROCEED →
          </button>
        </div>
      </div>
    </section>
  );
}
