import React from 'react';

// JazzCash Logo Component
export const JazzCashLogo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <img 
    src="/logos/jazzcash-logo.png" 
    alt="JazzCash" 
    className={`${className} object-contain`}
  />
);

// EasyPaisa Logo Component
export const EasyPaisaLogo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <img 
    src="/logos/easypaisa-logo.png" 
    alt="EasyPaisa" 
    className={`${className} object-contain`}
  />
);

// Bank Transfer Logo Component
export const BankTransferLogo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <img 
    src="/logos/bank-transfer-logo.png" 
    alt="Bank Transfer" 
    className={`${className} object-contain`}
  />
);