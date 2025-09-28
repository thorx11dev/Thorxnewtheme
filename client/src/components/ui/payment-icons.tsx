
import React from 'react';

// JazzCash Logo Component
export const JazzCashLogo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <div className={`${className} flex items-center justify-center`}>
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* JazzCash Logo - Red and Yellow crescents */}
      <path
        d="M0 50 C0 22.4 22.4 0 50 0 C77.6 0 100 22.4 100 50 L75 50 C75 36.2 63.8 25 50 25 C36.2 25 25 36.2 25 50 Z"
        fill="#FFD700"
      />
      <path
        d="M100 50 C100 77.6 77.6 100 50 100 C22.4 100 0 77.6 0 50 L25 50 C25 63.8 36.2 75 50 75 C63.8 75 75 63.8 75 50 Z"
        fill="#FF0000"
      />
    </svg>
  </div>
);

// EasyPaisa Logo Component
export const EasyPaisaLogo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <div className={`${className} flex items-center justify-center`}>
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* EasyPaisa Logo - Purple circle with green arc */}
      <circle cx="50" cy="50" r="45" fill="#4A4A4A" />
      <circle cx="50" cy="50" r="20" fill="transparent" />
      <path
        d="M50 30 A20 20 0 0 1 70 50 A20 20 0 0 1 50 70"
        fill="transparent"
        stroke="#00C853"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </svg>
  </div>
);

// Bank Transfer Logo Component
export const BankTransferLogo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <div className={`${className} flex items-center justify-center`}>
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* Bank Transfer Logo - Bank building with arrows */}
      <rect x="10" y="10" width="80" height="80" rx="8" fill="#4CAF50" />
      <rect x="25" y="25" width="50" height="50" rx="4" fill="#2196F3" />
      {/* Bank building */}
      <rect x="35" y="35" width="30" height="20" fill="#FFFFFF" />
      <rect x="38" y="38" width="6" height="14" fill="#2196F3" />
      <rect x="48" y="38" width="6" height="14" fill="#2196F3" />
      <rect x="58" y="38" width="6" height="14" fill="#2196F3" />
      <rect x="35" y="55" width="30" height="3" fill="#FFFFFF" />
      {/* Arrows */}
      <path d="M5 50 L15 45 L15 55 Z" fill="#4CAF50" />
      <path d="M95 50 L85 45 L85 55 Z" fill="#4CAF50" />
    </svg>
  </div>
);
