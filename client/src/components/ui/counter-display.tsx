interface CounterDisplayProps {
  value: number;
  suffix?: string;
}

export default function CounterDisplay({ value, suffix = "" }: CounterDisplayProps) {
  return (
    <span className="counter-display">
      {value}{suffix}
    </span>
  );
}

// Static method for animation
CounterDisplay.animateCounter = (element: HTMLElement, targetValue: number, suffix: string = '') => {
  let currentValue = 0;
  const frames = 80; // More frames for smoother animation
  const increment = targetValue / frames;
  const duration = 1200; // Consistent timing - 1.2 seconds
  const frameRate = duration / frames; // Calculate frame rate
  
  const interval = setInterval(() => {
    currentValue += increment;
    if (currentValue >= targetValue) {
      currentValue = targetValue;
      clearInterval(interval);
    }
    element.textContent = Math.floor(currentValue) + suffix;
  }, frameRate);
};
