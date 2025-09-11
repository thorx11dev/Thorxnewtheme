import { useState, useEffect } from "react";
import TechnicalLabel from "@/components/ui/technical-label";

interface DigitalClockProps {
  className?: string;
}

export default function DigitalClock({ className = "" }: DigitalClockProps) {
  const [timeSpent, setTimeSpent] = useState(0);

  useEffect(() => {
    // Get start time from localStorage or set current time
    const startTime = localStorage.getItem('thorx-start-time');
    const sessionStart = startTime ? parseInt(startTime) : Date.now();
    
    if (!startTime) {
      localStorage.setItem('thorx-start-time', sessionStart.toString());
    }

    const interval = setInterval(() => {
      const currentTime = Date.now();
      const elapsed = Math.floor((currentTime - sessionStart) / 1000);
      setTimeSpent(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`bg-white border-2 border-black px-2 py-1 md:px-4 md:py-2 ${className}`} data-testid="digital-clock">
      <div className="text-xs md:text-sm">
        <TechnicalLabel text="TIME ON THORX" />
        <div className="font-mono text-lg md:text-xl font-black tracking-wider">
          {formatTime(timeSpent)}
        </div>
      </div>
    </div>
  );
}