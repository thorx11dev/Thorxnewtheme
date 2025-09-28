
import React from 'react';

// JazzCash Icon Component
export const JazzCashIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" fill="#FF6B35" stroke="#E55A2B" strokeWidth="2"/>
    <path d="M25 35h50v30H25z" fill="white"/>
    <text x="50" y="55" textAnchor="middle" className="fill-red-600 text-sm font-black">
      JAZZ
    </text>
    <circle cx="20" cy="20" r="8" fill="#FFD700"/>
    <circle cx="80" cy="80" r="8" fill="#FFD700"/>
  </svg>
);

// EasyPaisa Icon Component  
export const EasyPaisaIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="easyPaisaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4CAF50" />
        <stop offset="100%" stopColor="#2E7D32" />
      </linearGradient>
    </defs>
    <rect x="10" y="20" width="80" height="60" rx="8" fill="url(#easyPaisaGradient)" stroke="#1B5E20" strokeWidth="2"/>
    <path d="M20 35h60v8H20z" fill="white"/>
    <path d="M20 50h60v8H20z" fill="white" opacity="0.8"/>
    <circle cx="25" cy="65" r="4" fill="#FFD700"/>
    <text x="50" y="68" textAnchor="middle" className="fill-white text-xs font-bold">
      EP
    </text>
  </svg>
);

// Bank Transfer Icon Component
export const BankTransferIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bankGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1976D2" />
        <stop offset="100%" stopColor="#0D47A1" />
      </linearGradient>
    </defs>
    {/* Bank building */}
    <path d="M20 75h60v15H20z" fill="url(#bankGradient)" stroke="#0D47A1" strokeWidth="2"/>
    {/* Roof */}
    <path d="M15 70L50 45L85 70H15z" fill="url(#bankGradient)" stroke="#0D47A1" strokeWidth="2"/>
    {/* Columns */}
    <rect x="30" y="55" width="6" height="20" fill="white"/>
    <rect x="42" y="55" width="6" height="20" fill="white"/>
    <rect x="54" y="55" width="6" height="20" fill="white"/>
    <rect x="66" y="55" width="6" height="20" fill="white"/>
    {/* Base */}
    <rect x="15" y="75" width="70" height="4" fill="#0D47A1"/>
    <rect x="15" y="86" width="70" height="4" fill="#0D47A1"/>
  </svg>
);

// Phone Icon for mobile wallets
export const MobileWalletIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="25" y="15" width="50" height="70" rx="8" fill="#333" stroke="#555" strokeWidth="2"/>
    <rect x="30" y="25" width="40" height="50" fill="#4CAF50"/>
    <circle cx="50" cy="80" r="3" fill="#888"/>
    <path d="M40 35h20v2H40z" fill="white"/>
    <path d="M40 40h20v2H40z" fill="white"/>
    <text x="50" y="55" textAnchor="middle" className="fill-white text-xs font-bold">
      PAY
    </text>
  </svg>
);
