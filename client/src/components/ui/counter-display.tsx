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
  const frames = 60; // Fewer frames for faster animation
  const increment = targetValue / frames;
  const duration = 800; // Much faster - 0.8 seconds
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
