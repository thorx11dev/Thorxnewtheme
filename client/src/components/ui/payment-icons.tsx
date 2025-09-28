import React from 'react';

// JazzCash Logo Component
export const JazzCashLogo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <div className={`${className} flex items-center justify-center bg-white rounded-md p-1`}>
    <svg viewBox="0 0 100 60" className="w-full h-full">
      {/* JazzCash Logo - Red and Yellow design */}
      <rect width="100" height="60" fill="#FFFFFF" rx="4"/>
      <rect x="5" y="10" width="90" height="40" fill="#FF0000" rx="2"/>
      <text x="50" y="25" textAnchor="middle" className="fill-white font-bold text-xs">JAZZ</text>
      <text x="50" y="40" textAnchor="middle" className="fill-yellow-300 font-bold text-xs">CASH</text>
      <circle cx="20" cy="30" r="8" fill="#FFD700"/>
      <circle cx="80" cy="30" r="8" fill="#FFD700"/>
    </svg>
  </div>
);

// EasyPaisa Logo Component
export const EasyPaisaLogo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <div className={`${className} flex items-center justify-center bg-white rounded-md p-1`}>
    <svg viewBox="0 0 100 60" className="w-full h-full">
      {/* EasyPaisa Logo - Green design */}
      <rect width="100" height="60" fill="#FFFFFF" rx="4"/>
      <rect x="5" y="10" width="90" height="40" fill="#00A651" rx="2"/>
      <text x="50" y="25" textAnchor="middle" className="fill-white font-bold text-xs">EASY</text>
      <text x="50" y="40" textAnchor="middle" className="fill-white font-bold text-xs">PAISA</text>
      <circle cx="15" cy="30" r="6" fill="#FFFFFF"/>
      <circle cx="85" cy="30" r="6" fill="#FFFFFF"/>
    </svg>
  </div>
);

// Bank Transfer Logo Component
export const BankTransferLogo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <div className={`${className} flex items-center justify-center bg-white rounded-md p-1`}>
    <svg viewBox="0 0 100 60" className="w-full h-full">
      {/* Bank Transfer Logo - Blue design */}
      <rect width="100" height="60" fill="#FFFFFF" rx="4"/>
      <rect x="5" y="10" width="90" height="40" fill="#1E40AF" rx="2"/>
      {/* Bank building icon */}
      <rect x="20" y="20" width="60" height="25" fill="#FFFFFF"/>
      <rect x="25" y="22" width="8" height="20" fill="#1E40AF"/>
      <rect x="38" y="22" width="8" height="20" fill="#1E40AF"/>
      <rect x="51" y="22" width="8" height="20" fill="#1E40AF"/>
      <rect x="64" y="22" width="8" height="20" fill="#1E40AF"/>
      <rect x="20" y="42" width="60" height="3" fill="#FFFFFF"/>
      <text x="50" y="55" textAnchor="middle" className="fill-white font-bold text-xs">BANK</text>
    </svg>
  </div>
);