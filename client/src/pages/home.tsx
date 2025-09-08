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
      <nav className="fixed top-0 w-full z-50 bg-background border-b-3 border-black" data-testid="navigation-header">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-center justify-between h-20">
            {/* Left Section */}
            <div className="flex items-center space-x-6">
              <div className="bg-black text-white px-4 py-2 border-2 border-black">
                <TechnicalLabel text="EARNING SYSTEM V01" className="text-white" />
              </div>
            </div>
            

            {/* Right Section */}
            <div className="flex items-center space-x-6">
              <div className="bg-white border-2 border-black px-4 py-2">
                <TechnicalLabel text="ID: 571" />
                <TechnicalLabel text="v 2.47" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Title Section */}
        <div className="bg-white border-b-3 border-black py-6">
          <div className="max-w-7xl mx-auto px-8 text-center">
            <h1 className="text-6xl md:text-7xl font-black tracking-tighter" data-testid="main-logo">
              THORX.
            </h1>
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
