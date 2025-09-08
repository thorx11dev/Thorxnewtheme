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
  const totalSections = 4;

  useEffect(() => {
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
  }, [currentSection, totalSections]);

  const handleSectionAdvance = () => {
    if (currentSection < totalSections) {
      setCurrentSection(prev => prev + 1);
    }
  };

  return (
    <>
      {/* Industrial Grid Overlay */}
      <div className="industrial-grid" />

      {/* Navigation Header */}
      <nav className="fixed top-0 w-full z-50 bg-background border-b-2 border-black" data-testid="navigation-header">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo Section */}
            <div className="flex items-center space-x-4">
              <TechnicalLabel text="EARNING SYSTEM" />
              <Barcode className="w-16 h-10" />
            </div>
            
            {/* Main Logo */}
            <div className="text-3xl font-black tracking-wider" data-testid="main-logo">THORX</div>
            
            {/* Status Section */}
            <div className="flex items-center space-x-4">
              <TechnicalLabel text="STATUS: ACTIVE" />
              <div className="w-3 h-3 bg-primary rounded-full" data-testid="status-indicator"></div>
            </div>
          </div>
        </div>
      </nav>

      {/* Sections */}
      <HookSection 
        isActive={currentSection === 1} 
        onAdvance={handleSectionAdvance}
      />
      <EarningReveal 
        isActive={currentSection === 2} 
        onAdvance={handleSectionAdvance}
      />
      <TrustBuilder 
        isActive={currentSection === 3} 
        onAdvance={handleSectionAdvance}
      />
      <CallToAction 
        isActive={currentSection === 4}
      />

      {/* Navigation Progress */}
      <NavigationProgress 
        currentSection={currentSection}
        totalSections={totalSections}
        onSectionChange={setCurrentSection}
      />
    </>
  );
}
