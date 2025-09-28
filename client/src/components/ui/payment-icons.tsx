import React from 'react';

// JazzCash Logo Component
export const JazzCashLogo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <div className={`${className} flex items-center justify-center bg-white rounded-md p-1 border`}>
    <img 
      src="/logos/jazzcash-logo.png" 
      alt="JazzCash" 
      className="w-full h-full object-contain"
      style={{ maxWidth: '100%', maxHeight: '100%' }}
    />
  </div>
);

// EasyPaisa Logo Component
export const EasyPaisaLogo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <div className={`${className} flex items-center justify-center bg-white rounded-md p-1 border`}>
    <img 
      src="/logos/easypaisa-logo.png" 
      alt="EasyPaisa" 
      className="w-full h-full object-contain"
      style={{ maxWidth: '100%', maxHeight: '100%' }}
    />
  </div>
);

// Bank Transfer Logo Component
export const BankTransferLogo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <div className={`${className} flex items-center justify-center bg-white rounded-md p-1 border`}>
    <img 
      src="/logos/bank-transfer-logo.png" 
      alt="Bank Transfer" 
      className="w-full h-full object-contain"
      style={{ maxWidth: '100%', maxHeight: '100%' }}
    />
  </div>
);