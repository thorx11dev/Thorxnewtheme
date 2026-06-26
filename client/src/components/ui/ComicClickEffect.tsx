import React, { useEffect, useState } from 'react';

interface ClickEffect {
  id: number;
  x: number;
  y: number;
  word: string;
  rotation: number;
  burstColor: string;
  textColor: string;
}

const COMIC_WORDS = [
  'POW!', 'BAM!', 'BOOM!', 'ZAP!', 'SLAM!', 'WHAM!', 'KABOOM!', 'CRASH!',
  'GHOP-GHOP', 'MEOW', 'OUAAAAA', 'NESHA POMI',
];

// Vibrant color pairs [burstBackground, textColor] — all work beautifully on/with white
const COLOR_PAIRS: [string, string][] = [
  ['#FF6B6B', '#1E3A5F'],   // coral burst, navy text
  ['#40E0D0', '#1F3A8A'],   // turquoise burst, royal-blue text
  ['#FFD700', '#C0392B'],   // gold burst, crimson text
  ['#2ECC71', '#1A252F'],   // emerald burst, dark text
  ['#9B59B6', '#FFFDE7'],   // purple burst, cream text
  ['#FF69B4', '#1F3A8A'],   // hot-pink burst, navy text
  ['#4169E1', '#FFD700'],   // royal-blue burst, gold text
  ['#FF8C00', '#1A1A1A'],   // deep-orange burst, black text
  ['#00CED1', '#8B0000'],   // dark-turquoise burst, dark-red text
  ['#32CD32', '#1A1A2E'],   // lime burst, dark text
  ['#FF4500', '#FFFDE7'],   // orange-red burst, cream text
  ['#8A2BE2', '#FFD700'],   // blue-violet burst, gold text
];

const ComicClickEffect: React.FC = () => {
  const [effects, setEffects] = useState<ClickEffect[]>([]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const id = Date.now();
      const word = COMIC_WORDS[Math.floor(Math.random() * COMIC_WORDS.length)];
      const rotation = (Math.random() - 0.5) * 40;
      const [burstColor, textColor] = COLOR_PAIRS[Math.floor(Math.random() * COLOR_PAIRS.length)];
      const offset = {
        x: (Math.random() - 0.5) * 20,
        y: (Math.random() - 0.5) * 20,
      };

      setEffects((prev) => [
        ...prev,
        { id, x: e.clientX + offset.x, y: e.clientY + offset.y, word, rotation, burstColor, textColor },
      ]);

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
            {/* Burst background shape */}
            <div
              className="absolute inset-0 scale-[1.2] comic-burst-shape"
              style={{
                backgroundColor: effect.burstColor,
                boxShadow: `0 0 10px ${effect.burstColor}66`,
              }}
            />
            {/* Word text */}
            <span
              className="relative z-10 block text-lg md:text-xl font-black italic tracking-tighter select-none"
              style={{
                color: effect.textColor,
                textShadow: `
                  1.5px 1.5px 0 #000,
                  -0.5px -0.5px 0 #000,
                  0.5px -0.5px 0 #000,
                  -0.5px 0.5px 0 #000,
                  0.5px 0.5px 0 #000
                `,
                WebkitTextStroke: '0.5px black',
              }}
            >
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
            50% 0%, 65% 20%, 95% 10%, 80% 40%, 100% 50%, 80% 60%, 95% 90%, 65% 80%, 50% 100%, 35% 80%, 5% 90%, 20% 60%, 0% 50%, 20% 40%, 5% 10%, 35% 20%
          );
        }
      `}</style>
    </div>
  );
};

export default ComicClickEffect;
