import { useEffect, useState } from "react";
import HookSection from "@/components/sections/hook-section";
import EarningReveal from "@/components/sections/earning-reveal";
import TrustBuilder from "@/components/sections/trust-builder";
import CallToAction from "@/components/sections/call-to-action";
import NavigationProgress from "@/components/ui/navigation-progress";
import TechnicalLabel from "@/components/ui/technical-label";
import Barcode from "@/components/ui/barcode";

export default function Home() {
  const [currentSection, setCurrentSection] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
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
    if (isMobile) return; // Disable keyboard navigation on mobile
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'ArrowRight') {
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
  }, [currentSection, totalSections, isMobile]);

  const handleSectionAdvance = () => {
    if (isMobile) {
      // On mobile, smooth scroll to next section instead of changing state
      const nextSectionElement = document.querySelector(`[data-section="${currentSection + 1}"]`);
      if (nextSectionElement) {
        nextSectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    
    if (currentSection < totalSections) {
      setCurrentSection(prev => prev + 1);
    }
  };
  
  const handleSectionChange = (section: number) => {
    if (isMobile) {
      const sectionElement = document.querySelector(`[data-section="${section}"]`);
      if (sectionElement) {
        sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    setCurrentSection(section);
  };

  return (
    <>
      {/* Industrial Grid Overlay */}
      <div className="industrial-grid" />

      {/* Navigation Header */}
      <nav className="fixed top-0 w-full z-50 bg-background border-b-3 border-black" data-testid="navigation-header">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Left Section */}
            <div className="flex items-center">
              <div className="bg-black text-white px-2 py-1 md:px-4 md:py-2 border-2 border-black">
                <TechnicalLabel text="EARNING SYSTEM V01" className="text-white text-xs md:text-sm" />
              </div>
            </div>
            
            {/* Right Section */}
            <div className="flex items-center">
              <div className="bg-white border-2 border-black px-2 py-1 md:px-4 md:py-2">
                <div className="text-xs md:text-sm">
                  <TechnicalLabel text="ID: 571" />
                  <TechnicalLabel text="v 2.47" />
                </div>
              </div>
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
          isActive={isMobile || currentSection === 1} 
          onAdvance={handleSectionAdvance}
        />
      </div>
      <div data-section="2">
        <EarningReveal 
          isActive={isMobile || currentSection === 2} 
          onAdvance={handleSectionAdvance}
        />
      </div>
      <div data-section="3">
        <TrustBuilder 
          isActive={isMobile || currentSection === 3} 
          onAdvance={handleSectionAdvance}
        />
      </div>
      <div data-section="4">
        <CallToAction 
          isActive={isMobile || currentSection === 4}
        />
      </div>

      {/* Navigation Progress */}
      {!isMobile && (
        <NavigationProgress 
          currentSection={currentSection}
          totalSections={totalSections}
          onSectionChange={handleSectionChange}
        />
      )}
    </>
  );
}
