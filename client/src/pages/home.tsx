import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import HookSection from "@/components/sections/hook-section";
import EarningReveal from "@/components/sections/earning-reveal";
import TrustBuilder from "@/components/sections/trust-builder";
import FAQSection from "@/components/sections/faq-section";
import NavigationProgress from "@/components/ui/navigation-progress";
import ArrowKeysGuide from "@/components/ui/arrow-keys-guide";
import TechnicalLabel from "@/components/ui/technical-label";
import DigitalClock from "@/components/ui/digital-clock";
import Barcode from "@/components/ui/barcode";

export default function Home() {
  const [currentSection, setCurrentSection] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [, setLocation] = useLocation();
  const totalSections = 4;

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        // Navigate to Auth page on Enter
        setLocation("/auth");
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentSection < totalSections) {
          setCurrentSection(prev => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentSection > 1) {
          setCurrentSection(prev => prev - 1);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentSection, totalSections]);

  const handleSectionAdvance = () => {
    // Navigate to Auth page for all action buttons
    setLocation("/auth");
  };
  
  const handleSectionChange = (section: number) => {
    setCurrentSection(section);
  };
  
  const handlePrevious = () => {
    if (currentSection > 1) {
      setCurrentSection(prev => prev - 1);
    }
  };
  
  const handleNext = () => {
    if (currentSection < totalSections) {
      setCurrentSection(prev => prev + 1);
    }
  };

  return (
    <>
      {/* Industrial Grid Overlay */}
      <div className="industrial-grid" />

      {/* Navigation Header */}
      <nav className="fixed top-0 w-full z-50 bg-background border-b-3 border-black" data-testid="navigation-header">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Left Section - Transform to Enter button when not on first section */}
            <div className="flex items-center">
              {currentSection === 1 && !isMobile ? (
                <div className="bg-black text-white px-2 py-1 md:px-4 md:py-2 border-2 border-black">
                  <TechnicalLabel text="EARNING SYSTEM V01" className="text-white text-xs md:text-sm" />
                </div>
              ) : (
                <button
                  onClick={() => setLocation("/auth")}
                  className="bg-primary text-white px-2 py-1 md:px-4 md:py-2 border-2 border-black hover:bg-black transition-all duration-300 transform hover:scale-105"
                  data-testid="button-navbar-enter"
                >
                  <TechnicalLabel text="ENTER" className="text-white text-xs md:text-sm font-black" />
                </button>
              )}
            </div>
            
            {/* Right Section */}
            <div className="flex items-center">
              {currentSection >= 3 ? (
                <DigitalClock />
              ) : (
                <div className="bg-white border-2 border-black px-2 py-1 md:px-4 md:py-2">
                  <div className="text-xs md:text-sm">
                    <TechnicalLabel text="ID: 571" />
                    <TechnicalLabel text="v 2.47" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Main Title Section */}
        <div className="bg-white border-b-3 border-black py-4 md:py-6">
          <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter" data-testid="main-logo">
              THORX.
            </h1>
          </div>
        </div>
      </nav>

      {/* Sections */}
      <div data-section="1">
        <HookSection 
          isActive={currentSection === 1} 
          onAdvance={handleSectionAdvance}
        />
      </div>
      <div data-section="2">
        <EarningReveal 
          isActive={currentSection === 2} 
          onAdvance={handleSectionAdvance}
        />
      </div>
      <div data-section="3">
        <TrustBuilder 
          isActive={currentSection === 3} 
          onAdvance={handleSectionAdvance}
        />
      </div>
      <div data-section="4">
        <FAQSection 
          isActive={currentSection === 4}
        />
      </div>

      {/* Navigation Elements */}
      <NavigationProgress 
        currentSection={currentSection}
        totalSections={totalSections}
        onSectionChange={handleSectionChange}
      />
      <ArrowKeysGuide 
        currentSection={currentSection}
        totalSections={totalSections}
        onPrevious={handlePrevious}
        onNext={handleNext}
      />
    </>
  );
}
