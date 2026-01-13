import { useEffect, useRef, useState } from "react";
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
  const sectionRef = useRef<HTMLElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Desktop animation (based on isActive)
  useEffect(() => {
    if (!isMobile && isActive && !hasAnimated) {
      setTimeout(() => {
        animateCounters();
        setHasAnimated(true);
      }, 600);
    }
    // Reset animation state when section becomes inactive
    if (!isMobile && !isActive) {
      setHasAnimated(false);
    }
  }, [isActive, isMobile, hasAnimated]);

  // Mobile animation - Simplified and reliable
  useEffect(() => {
    if (!isMobile) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setTimeout(() => {
              animateCounters();
              setHasAnimated(true);
            }, 600);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '100px 0px -50px 0px'
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [isMobile, hasAnimated]);

  // Mobile animation - Backup trigger on isActive change
  useEffect(() => {
    if (isMobile && isActive && !hasAnimated) {
      const timer = setTimeout(() => {
        animateCounters();
        setHasAnimated(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isActive, isMobile, hasAnimated]);

  // Reset animation on section change for both mobile and desktop
  useEffect(() => {
    if (!isActive) {
      setHasAnimated(false);
    }
  }, [isActive]);

  const animateCounters = () => {
    if (adsCounterRef.current) {
      CounterDisplay.animateCounter(adsCounterRef.current, 4);
    }
    if (referralCounterRef.current) {
      CounterDisplay.animateCounter(referralCounterRef.current, 15);
    }
  };

  return (
    <section
      ref={sectionRef}
      className={`cinematic-section ${isActive ? 'active' : ''}`}
      data-testid="earning-reveal-section"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Technical Header */}
        <div className="text-center mb-8 md:mb-12">
          <div className="mb-2">
            <TechnicalLabel text="REVENUE GENERATION METHODS" />
          </div>
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-black mb-4">
            EARN PKR IN 2 WAYS
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
              <div className="text-white/80 text-sm font-semibold tracking-wider">WATCH VIDEO ADS</div>

              {/* Stats */}
              <div className="space-y-4">
                <div className="text-4xl font-black counter-display text-white">
                  <span ref={adsCounterRef} data-testid="ads-counter">4</span> <span className="text-2xl">PLAYERS</span>
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
              <div className="text-white/80 text-sm font-semibold tracking-wider">REFER FRIENDS</div>

              {/* Stats */}
              <div className="space-y-4">
                <div className="text-4xl font-black counter-display text-white">
                  <span ref={referralCounterRef} data-testid="referral-counter">15</span>%
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

        {/* Referral Commission Info Card - COMIC REDESIGN */}
        <div className="relative max-w-6xl mx-auto px-2 md:px-0">
          {/* Main Comic Panel */}
          <div className="comic-panel comic-panel-offset bg-white rounded-lg p-4 sm:p-6 md:p-12 overflow-hidden">
            {/* Halftone background pattern */}
            <div className="absolute inset-0 halftone-pattern-light opacity-30 pointer-events-none"></div>

            {/* Top Label with comic styling */}
            <div className="relative z-10 text-center mb-4 sm:mb-6 md:mb-8">
              <div className="inline-block bg-black text-white px-3 py-1 sm:px-4 sm:py-2 md:px-6 md:py-2 border-3 md:border-4 border-black transform -rotate-2">
                <TechnicalLabel text="REFERRAL-COMMISSION" className="text-white text-xs sm:text-sm md:text-base" />
              </div>
            </div>

            {/* Main Title with comic text effect - Improved for high contrast */}
            <h3 className="relative z-10 text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black mb-6 sm:mb-8 md:mb-12 text-center text-white italic px-2"
              style={{
                textShadow: '3px 3px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000, 0px 2px 0px #000, 0px -2px 0px #000, 2px 0px #000, -2px 0px #000'
              }}>
              MULTI-LEVEL EARNINGS!
            </h3>

            {/* Comic Bubbles Container */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 md:gap-16 mb-6 sm:mb-8 md:mb-12 max-w-4xl mx-auto">
              {/* Left Bubble - 15% Direct Referral */}
              <div className="flex justify-center">
                <div className="comic-bubble comic-hover relative w-full max-w-[280px] sm:max-w-none">
                  {/* Starburst background */}
                  <div className="absolute -top-6 -right-6 sm:-top-8 sm:-right-8 w-16 h-16 sm:w-24 sm:h-24 comic-starburst opacity-20"></div>

                  <div className="text-center relative z-10 py-2 sm:py-0">
                    <div className="text-5xl sm:text-6xl md:text-7xl font-black text-primary mb-1 sm:mb-2" style={{ textShadow: '2px 2px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000' }}>
                      15%
                    </div>
                    <div className="text-base sm:text-lg md:text-xl font-bold text-black uppercase tracking-wide">
                      Direct Referral
                    </div>

                    {/* Comic "POW" style accent */}
                    <div className="absolute -top-4 -left-4 sm:-top-6 sm:-left-6 bg-primary text-white px-2 py-0.5 sm:px-3 sm:py-1 border-2 sm:border-3 border-black transform -rotate-12 text-[10px] sm:text-xs font-black">
                      POW!
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Bubble - 7.5% Second Level */}
              <div className="flex justify-center">
                <div className="comic-bubble comic-hover relative bg-primary/5 w-full max-w-[280px] sm:max-w-none">
                  {/* Starburst background */}
                  <div className="absolute -bottom-6 -left-6 sm:-bottom-8 sm:-left-8 w-16 h-16 sm:w-24 sm:h-24 comic-starburst opacity-20"></div>

                  <div className="text-center relative z-10 py-2 sm:py-0">
                    <div className="text-5xl sm:text-6xl md:text-7xl font-black text-black mb-1 sm:mb-2" style={{ textShadow: '2px 2px 0px #fff, -1px -1px 0px #fff, 1px -1px 0px #fff, -1px 1px 0px #fff' }}>
                      7.5%
                    </div>
                    <div className="text-base sm:text-lg md:text-xl font-bold text-black uppercase tracking-wide">
                      Second Level
                    </div>

                    {/* Comic "BOOM" style accent */}
                    <div className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 bg-black text-white px-2 py-0.5 sm:px-3 sm:py-1 border-2 sm:border-3 border-black transform rotate-12 text-[10px] sm:text-xs font-black">
                      BOOM!
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description with comic panel styling */}
            <div className="relative z-10 max-w-3xl mx-auto px-2 sm:px-0">
              <div className="bg-white border-3 sm:border-4 border-black p-4 sm:p-6 md:p-8 transform hover:scale-105 transition-transform duration-200">
                <p className="text-sm sm:text-base md:text-lg text-center font-bold text-black leading-relaxed">
                  💰 Earn commission when your referrals request payouts. Build your network and earn passively!
                </p>

                {/* Speed lines decoration - hidden on mobile */}
                <div className="hidden sm:block absolute -right-4 top-1/2 -translate-y-1/2 w-12 h-1 bg-black"></div>
                <div className="hidden sm:block absolute -right-6 top-1/2 -translate-y-1/2 w-8 h-1 bg-black"></div>
                <div className="hidden sm:block absolute -right-8 top-1/2 -translate-y-1/2 w-4 h-1 bg-black"></div>
              </div>
            </div>

            {/* Corner decorations - smaller on mobile */}
            <div className="absolute top-2 left-2 sm:top-4 sm:left-4 w-4 h-4 sm:w-8 sm:h-8 border-l-2 border-t-2 sm:border-l-4 sm:border-t-4 border-black"></div>
            <div className="absolute top-2 right-2 sm:top-4 sm:right-4 w-4 h-4 sm:w-8 sm:h-8 border-r-2 border-t-2 sm:border-r-4 sm:border-t-4 border-black"></div>
            <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 w-4 h-4 sm:w-8 sm:h-8 border-l-2 border-b-2 sm:border-l-4 sm:border-b-4 border-black"></div>
            <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 w-4 h-4 sm:w-8 sm:h-8 border-r-2 border-b-2 sm:border-r-4 sm:border-b-4 border-black"></div>
          </div>
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
