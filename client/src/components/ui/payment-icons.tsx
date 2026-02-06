import jazzCashLogo from '@assets/stock_images/jazzcash_logo_offici_d1da53e5.jpg';
import easyPaisaLogo from '@assets/stock_images/easypaisa_logo_offic_b5f9d6fc.jpg';
import bankTransferLogo from '@assets/stock_images/bank_transfer_icon_m_996396c5.jpg';

import unnamed_removebg_preview from "@assets/unnamed-removebg-preview.png";

import download_removebg_preview__1_ from "@assets/download-removebg-preview (1).png";

import download_removebg_preview from "@assets/download-removebg-preview.png";

// JazzCash Logo Component
export const JazzCashLogo: React.FC<{ className?: string }> = ({ className = "w-20 h-20" }) => (
  <div className={`${className} flex items-center justify-center bg-white rounded-lg p-3 border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all`}>
    <img 
      src={unnamed_removebg_preview}
      alt="JazzCash" 
      className="w-full h-full object-contain"
      loading="eager"
    />
  </div>
);

// EasyPaisa Logo Component
export const EasyPaisaLogo: React.FC<{ className?: string }> = ({ className = "w-20 h-20" }) => (
  <div className={`${className} flex items-center justify-center bg-white rounded-lg p-3 border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all`}>
    <img 
      src={download_removebg_preview__1_}
      alt="EasyPaisa" 
      className="w-full h-full object-contain"
      loading="eager"
    />
  </div>
);

// Bank Transfer Logo Component
export const BankTransferLogo: React.FC<{ className?: string }> = ({ className = "w-20 h-20" }) => (
  <div className={`${className} flex items-center justify-center bg-white rounded-lg p-3 border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all`}>
    <img 
      src={download_removebg_preview}
      alt="Bank Transfer" 
      className="w-full h-full object-contain"
      loading="eager"
    />
  </div>
);
