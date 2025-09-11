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
  const frames = 90; // More frames for slower, smoother animation
  const increment = targetValue / frames;
  const duration = 3500; // 3.5 seconds for slower animation
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
