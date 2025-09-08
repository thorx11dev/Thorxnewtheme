interface NavigationProgressProps {
  currentSection: number;
  totalSections: number;
  onSectionChange: (section: number) => void;
}

export default function NavigationProgress({ currentSection, totalSections, onSectionChange }: NavigationProgressProps) {
  return (
    <div className="navigation-progress" data-testid="navigation-progress">
      <div className="flex space-x-4">
        {Array.from({ length: totalSections }, (_, index) => (
          <button
            key={index + 1}
            onClick={() => onSectionChange(index + 1)}
            className={`progress-dot ${currentSection === index + 1 ? 'active' : ''}`}
            data-testid={`progress-dot-${index + 1}`}
            aria-label={`Go to section ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
