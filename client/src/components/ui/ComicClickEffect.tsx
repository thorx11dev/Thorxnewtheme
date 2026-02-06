import React, { useEffect, useState } from 'react';

interface ClickEffect {
  id: number;
  x: number;
  y: number;
  word: string;
  rotation: number;
}

const COMIC_WORDS = ['POW!', 'BAM!', 'BOOM!', 'ZAP!', 'SLAM!', 'WHAM!', 'KABOOM!', 'CRASH!'];

const ComicClickEffect: React.FC = () => {
  const [effects, setEffects] = useState<ClickEffect[]>([]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Don't show effect if clicking on interactive elements that already have feedback
      // This is optional, but helps reduce clutter. For now, let's keep it global as requested.

      const id = Date.now();
      const word = COMIC_WORDS[Math.floor(Math.random() * COMIC_WORDS.length)];
      const rotation = (Math.random() - 0.5) * 40; // Random rotation between -20 and 20 degrees
      const offset = {
        x: (Math.random() - 0.5) * 20,
        y: (Math.random() - 0.5) * 20
      };

      const newEffect: ClickEffect = {
        id,
        x: e.clientX + offset.x,
        y: e.clientY + offset.y,
        word,
        rotation,
      };

      setEffects((prev) => [...prev, newEffect]);

      // Remove effect after animation
      setTimeout(() => {
        setEffects((prev) => prev.filter((effect) => effect.id !== id));
      }, 500);
    };

    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {effects.map((effect) => (
        <div
          key={effect.id}
          className="absolute comic-burst-container"
          style={{
            left: effect.x,
            top: effect.y,
            transform: `translate(-50%, -50%) rotate(${effect.rotation}deg)`,
          }}
        >
          <div className="relative">
            {/* The "Burst" Background (Shape) */}
            <div className="absolute inset-0 bg-yellow-400 scale-[1.2] comic-burst-shape shadow-[0_0_10px_rgba(255,255,0,0.4)]"></div>

            {/* The Text */}
            <span className="relative z-10 block text-lg md:text-xl font-black text-red-600 italic tracking-tighter select-none"
              style={{
                textShadow: `
                      1.5px 1.5px 0 #000,
                      -0.5px -0.5px 0 #000,  
                      0.5px -0.5px 0 #000,
                      -0.5px 0.5px 0 #000,
                      0.5px 0.5px 0 #000
                    `,
                WebkitTextStroke: '0.5px black'
              }}>
              {effect.word}
            </span>
          </div>
        </div>
      ))}
      <style>{`
        @keyframes comic-pop {
          0% {
            transform: scale(0) rotate(0deg);
            opacity: 0;
          }
          20% {
            transform: scale(1.1) rotate(5deg);
            opacity: 1;
          }
          40% {
            transform: scale(1) rotate(-5deg);
            opacity: 1;
          }
          100% {
            transform: scale(0.9) translateY(-20px) rotate(10deg);
            opacity: 0;
          }
        }

        .comic-burst-container {
          animation: comic-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        .comic-burst-shape {
          clip-path: polygon(
            50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%
          );
          /* More jagged comic burst shape */
          mask-image: radial-gradient(circle, black 100%, transparent 100%);
        }

        /* Customize the shape slightly to be more erratic like a comic burst */
        .comic-burst-shape {
           clip-path: polygon(
            50% 0%, 65% 20%, 95% 10%, 80% 40%, 100% 50%, 80% 60%, 95% 90%, 65% 80%, 50% 100%, 35% 80%, 5% 90%, 20% 60%, 0% 50%, 20% 40%, 5% 10%, 35% 20%
          );
        }
      `}</style>
    </div>
  );
};

export default ComicClickEffect;
