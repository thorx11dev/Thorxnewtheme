import { ArrowLeft, ArrowRight } from "lucide-react";

interface ArrowKeysGuideProps {
  currentSection: number;
  totalSections: number;
  onPrevious: () => void;
  onNext: () => void;
}

export default function ArrowKeysGuide({ currentSection, totalSections, onPrevious, onNext }: ArrowKeysGuideProps) {
  return (
    <div className="arrow-keys-guide" data-testid="arrow-keys-guide">
      <button 
        onClick={onPrevious}
        disabled={currentSection === 1}
        className={`arrow-key ${currentSection === 1 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
        data-testid="arrow-key-left"
      >
        <ArrowLeft size={16} />
      </button>
      
      <button 
        onClick={onNext}
        disabled={currentSection === totalSections}
        className={`arrow-key ${currentSection === totalSections ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
        data-testid="arrow-key-right"
      >
        <ArrowRight size={16} />
      </button>
    </div>
  );
}