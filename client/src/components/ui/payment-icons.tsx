
import React from 'react';

// JazzCash Logo Component - Using actual JazzCash branding
export const JazzCashLogo: React.FC<{ className?: string }> = ({ className = "w-20 h-20" }) => (
  <div className={`${className} flex items-center justify-center bg-gradient-to-br from-red-600 to-red-700 rounded-lg p-3 border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all relative overflow-hidden`}>
    <div className="absolute inset-0 bg-red-600"></div>
    <div className="relative z-10 flex flex-col items-center justify-center text-white w-full h-full">
      <div className="text-xl md:text-2xl font-black tracking-wider mb-1">JAZZ</div>
      <div className="text-xs md:text-sm font-bold tracking-widest">CASH</div>
      <div className="absolute bottom-1 right-1 text-xs opacity-60">💰</div>
    </div>
  </div>
);

// EasyPaisa Logo Component - Using actual EasyPaisa branding
export const EasyPaisaLogo: React.FC<{ className?: string }> = ({ className = "w-20 h-20" }) => (
  <div className={`${className} flex items-center justify-center bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-3 border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all relative overflow-hidden`}>
    <div className="absolute inset-0 bg-green-600"></div>
    <div className="relative z-10 flex flex-col items-center justify-center text-white w-full h-full">
      <div className="text-lg md:text-xl font-black tracking-wider mb-1">EASY</div>
      <div className="text-lg md:text-xl font-black tracking-wider">PAISA</div>
      <div className="absolute bottom-1 right-1 text-xs opacity-60">📱</div>
    </div>
  </div>
);

// Bank Transfer Logo Component - Generic banking design
export const BankTransferLogo: React.FC<{ className?: string }> = ({ className = "w-20 h-20" }) => (
  <div className={`${className} flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-3 border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all relative overflow-hidden`}>
    <div className="absolute inset-0 bg-blue-600"></div>
    <div className="relative z-10 flex flex-col items-center justify-center text-white w-full h-full">
      <div className="text-2xl md:text-3xl mb-1">🏦</div>
      <div className="text-xs md:text-sm font-bold tracking-wider text-center leading-tight">BANK<br />TRANSFER</div>
    </div>
  </div>
);

// Alternative implementation using actual logo URLs (if you prefer external images)
export const JazzCashLogoExternal: React.FC<{ className?: string }> = ({ className = "w-20 h-20" }) => (
  <div className={`${className} flex items-center justify-center bg-white rounded-lg p-3 border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all`}>
    <img 
      src="https://www.jazzcash.com.pk/assets/themes/jazzcash/images/jazzcash-logo.png"
      alt="JazzCash" 
      className="w-full h-full object-contain"
      loading="eager"
      onError={(e) => {
        // Fallback to branded component if external image fails
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        target.parentElement!.innerHTML = `
          <div class="flex flex-col items-center justify-center text-red-600 w-full h-full bg-red-50">
            <div class="text-lg font-black">JAZZ</div>
            <div class="text-sm font-bold">CASH</div>
          </div>
        `;
      }}
    />
  </div>
);

export const EasyPaisaLogoExternal: React.FC<{ className?: string }> = ({ className = "w-20 h-20" }) => (
  <div className={`${className} flex items-center justify-center bg-white rounded-lg p-3 border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all`}>
    <img 
      src="https://www.easypaisa.com.pk/images/easypaisalogo.png"
      alt="EasyPaisa" 
      className="w-full h-full object-contain"
      loading="eager"
      onError={(e) => {
        // Fallback to branded component if external image fails
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        target.parentElement!.innerHTML = `
          <div class="flex flex-col items-center justify-center text-green-600 w-full h-full bg-green-50">
            <div class="text-sm font-black">EASY</div>
            <div class="text-sm font-black">PAISA</div>
          </div>
        `;
      }}
    />
  </div>
);

export const BankTransferLogoExternal: React.FC<{ className?: string }> = ({ className = "w-20 h-20" }) => (
  <div className={`${className} flex items-center justify-center bg-white rounded-lg p-3 border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all`}>
    <div className="flex flex-col items-center justify-center text-blue-600 w-full h-full">
      <div className="text-2xl mb-1">🏦</div>
      <div className="text-xs font-bold text-center leading-tight">BANK<br />TRANSFER</div>
    </div>
  </div>
);
