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
  const increment = targetValue / 60; // 60 frames for smooth animation
  const duration = 2000; // 2 seconds
  const frameRate = 16; // ~60fps
  
  const interval = setInterval(() => {
    currentValue += increment;
    if (currentValue >= targetValue) {
      currentValue = targetValue;
      clearInterval(interval);
    }
    element.textContent = Math.floor(currentValue) + suffix;
  }, frameRate);
};
