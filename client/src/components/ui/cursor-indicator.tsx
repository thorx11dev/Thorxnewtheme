
import React, { useEffect, useState } from 'react';

interface CursorIndicatorProps {
  show?: boolean;
  type?: 'loading' | 'success' | 'error' | 'info';
}

export function CursorIndicator({ show = false, type = 'info' }: CursorIndicatorProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    if (show) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [show]);

  if (!show) return null;

  const getIndicatorStyles = () => {
    switch (type) {
      case 'loading':
        return 'border-primary bg-primary/20';
      case 'success':
        return 'border-green-500 bg-green-500/20';
      case 'error':
        return 'border-red-500 bg-red-500/20';
      default:
        return 'border-black bg-black/10';
    }
  };

  return (
    <div
      className="fixed pointer-events-none z-[9999] transition-transform duration-100"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(12px, 12px)',
      }}
    >
      <div className={`w-6 h-6 rounded-full border-2 ${getIndicatorStyles()} animate-pulse`} />
    </div>
  );
}

// Utility hook for cursor states
export function useCursorState() {
  const [cursorState, setCursorState] = useState<'default' | 'pointer' | 'grab' | 'grabbing' | 'wait' | 'not-allowed'>('default');

  const setCursor = (state: typeof cursorState) => {
    setCursorState(state);
    document.body.style.cursor = `var(--cursor-${state})`;
  };

  const resetCursor = () => {
    setCursorState('default');
    document.body.style.cursor = 'var(--cursor-default)';
  };

  return { cursorState, setCursor, resetCursor };
}
