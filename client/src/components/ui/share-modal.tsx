
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TechnicalLabel from "@/components/ui/technical-label";
import { useToast } from "@/hooks/use-toast";
import {
  Copy,
  Check,
  Share2,
  MessageCircle,
  Send,
  Mail,
  Facebook,
  Instagram,
  X,
  Smartphone,
  Link2,
  ExternalLink
} from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralCode: string;
  userName?: string;
}

interface SharePlatform {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  hoverColor: string;
  url: (code: string, message: string) => string;
}

export default function ShareModal({ isOpen, onClose, referralCode, userName = "User" }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const { toast } = useToast();

  const shareUrl = `${window.location.origin}/auth?ref=${referralCode}`;
  const defaultMessage = `🚀 Join me on THORX and start earning money by watching ads! Use my referral code: ${referralCode}`;

  const sharePlatforms: SharePlatform[] = [
    {
      id: "whatsapp",
      name: "WhatsApp",
      icon: MessageCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      hoverColor: "hover:bg-green-100",
      url: (code, message) => 
        `https://wa.me/?text=${encodeURIComponent(`${message}\n\n👉 ${shareUrl}`)}`
    },
    {
      id: "telegram",
      name: "Telegram",
      icon: Send,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
      hoverColor: "hover:bg-blue-100",
      url: (code, message) => 
        `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(message)}`
    },
    {
      id: "messenger",
      name: "Messenger",
      icon: MessageCircle,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      hoverColor: "hover:bg-blue-100",
      url: (code, message) => 
        `https://m.me/?text=${encodeURIComponent(`${message}\n${shareUrl}`)}`
    },
    {
      id: "instagram",
      name: "Instagram",
      icon: Instagram,
      color: "text-pink-500",
      bgColor: "bg-pink-50",
      hoverColor: "hover:bg-pink-100",
      url: (code, message) => 
        `https://www.instagram.com/direct/new/?text=${encodeURIComponent(`${message}\n${shareUrl}`)}`
    },
    {
      id: "tiktok",
      name: "TikTok",
      icon: Smartphone,
      color: "text-black",
      bgColor: "bg-gray-50",
      hoverColor: "hover:bg-gray-100",
      url: (code, message) => 
        `https://www.tiktok.com/share?text=${encodeURIComponent(`${message}\n${shareUrl}`)}`
    },
    {
      id: "facebook",
      name: "Facebook",
      icon: Facebook,
      color: "text-blue-700",
      bgColor: "bg-blue-50",
      hoverColor: "hover:bg-blue-100",
      url: (code, message) => 
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(message)}`
    },
    {
      id: "gmail",
      name: "Gmail",
      icon: Mail,
      color: "text-red-500",
      bgColor: "bg-red-50",
      hoverColor: "hover:bg-red-100",
      url: (code, message) => 
        `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent("Join THORX and Start Earning!")}&body=${encodeURIComponent(`${message}\n\n${shareUrl}`)}`
    }
  ];

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const handlePlatformShare = (platform: SharePlatform) => {
    const message = customMessage || defaultMessage;
    const url = platform.url(referralCode, message);
    window.open(url, '_blank', 'width=600,height=400');
    
    toast({
      title: "Opening " + platform.name,
      description: "Share window opened",
    });
  };

  const handleCopyLink = () => {
    copyToClipboard(shareUrl);
  };

  const handleCopyMessage = () => {
    const message = customMessage || defaultMessage;
    copyToClipboard(`${message}\n\n${shareUrl}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg mx-auto bg-gradient-to-br from-background via-background to-muted/30 border-[4px] border-black p-0 overflow-hidden shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] rounded-xl">
        {/* Enhanced Header with improved styling */}
        <DialogHeader className="bg-gradient-to-r from-primary via-primary/95 to-primary text-primary-foreground p-5 md:p-7 border-b-[4px] border-black relative overflow-hidden">
          {/* Animated background pattern - matching logo area */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-grid-pattern animate-pulse"></div>
          </div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3 animate-zoom-in">
              <div className="p-2.5 bg-black/30 border-[3px] border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.7)] transition-all">
                <Share2 className="w-6 h-6 md:w-7 md:h-7 animate-pulse" />
              </div>
              <DialogTitle className="text-2xl md:text-3xl font-black tracking-tight leading-tight drop-shadow-[2px_2px_0px_rgba(0,0,0,0.3)]">
                INVITE FRIENDS
              </DialogTitle>
            </div>
            
            {/* Enhanced close button with better styling */}
            <button
              onClick={onClose}
              className="group relative w-12 h-12 bg-black/30 border-[3px] border-black rounded-lg text-primary-foreground hover:bg-black hover:text-white transition-all duration-300 flex items-center justify-center overflow-hidden transform hover:scale-110 hover:rotate-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
              aria-label="Close modal"
            >
              <X className="w-6 h-6 relative z-10 transition-transform duration-300 group-hover:rotate-90" strokeWidth={3} />
              <div className="absolute inset-0 bg-gradient-to-br from-black to-black/80 transform scale-0 group-hover:scale-100 transition-transform duration-300"></div>
            </button>
          </div>
          <TechnicalLabel text="SHARE PROTOCOL v2.5 ENHANCED" className="text-primary-foreground/95 text-xs mt-3 relative z-10 font-black tracking-widest drop-shadow-md" />
        </DialogHeader>

        {/* Enhanced Content with refined borders and spacing */}
        <div className="p-5 md:p-7 space-y-7 relative bg-gradient-to-b from-transparent to-muted/20">
          {/* Background grid pattern */}
          <div className="absolute inset-0 opacity-10 bg-grid-pattern pointer-events-none animate-pulse"></div>
          
          {/* Referral Code Display - matching logo area animation */}
          <div className="text-center relative animate-zoom-in">
            <div className="inline-block mb-4 px-4 py-1.5 bg-black border-[3px] border-primary rounded-lg shadow-[4px_4px_0px_0px_rgba(255,119,0,0.4)]">
              <TechnicalLabel text="YOUR REFERRAL CODE" className="text-primary text-xs font-black tracking-widest" />
            </div>
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-primary via-primary to-primary/80 blur-md opacity-40 group-hover:opacity-60 transition duration-300 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-black to-black/90 text-white p-5 md:p-6 border-[4px] border-primary rounded-xl shadow-[6px_6px_0px_0px_rgba(255,119,0,0.5)] group-hover:shadow-[8px_8px_0px_0px_rgba(255,119,0,0.7)] transition-all">
                <div className="text-3xl md:text-4xl font-black tracking-widest text-center text-primary animate-pulse drop-shadow-[0_0_10px_rgba(255,119,0,0.5)]">
                  {referralCode}
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Custom Message Input */}
          <div className="relative">
            <div className="inline-block mb-3 px-3 py-1 bg-foreground/5 border-[2px] border-black rounded-md">
              <TechnicalLabel text="CUSTOM MESSAGE (OPTIONAL)" className="text-foreground text-xs font-black tracking-widest" />
            </div>
            <div className="relative group">
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder={defaultMessage}
                className="w-full min-h-[80px] p-3 border-3 border-black text-sm resize-vertical focus:outline-none focus:border-primary focus:shadow-[4px_4px_0px_0px_rgba(255,119,0,0.2)] transition-all duration-300 bg-white group-hover:border-primary/50 rounded-md"
                maxLength={500}
              />
            </div>
            <div className="text-right mt-2">
              <TechnicalLabel text={`${customMessage.length}/500`} className="text-muted-foreground text-xs font-bold" />
            </div>
          </div>

          {/* Enhanced Platform Grid */}
          <div className="relative">
            <div className="inline-block mb-4 px-3 py-1 bg-foreground/5 border-[2px] border-black rounded-md">
              <TechnicalLabel text="CHOOSE PLATFORM" className="text-foreground text-xs font-black tracking-widest" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {sharePlatforms.map((platform, index) => {
                const Icon = platform.icon;
                return (
                  <button
                    key={platform.id}
                    onClick={() => handlePlatformShare(platform)}
                    style={{ animationDelay: `${index * 0.05}s` }}
                    className={`
                      group relative flex flex-col items-center justify-center p-3 md:p-4 
                      border-3 border-black transition-all duration-300 
                      ${platform.bgColor} ${platform.hoverColor}
                      hover:transform hover:scale-110 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                      active:scale-95 animate-zoom-in
                      focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                      overflow-hidden rounded-md
                    `}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <Icon className={`w-6 h-6 md:w-8 md:h-8 mb-2 ${platform.color} relative z-10 transform group-hover:scale-110 transition-transform duration-300`} />
                    <TechnicalLabel 
                      text={platform.name.toUpperCase()} 
                      className="text-xs font-black text-center leading-tight relative z-10" 
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Enhanced Quick Actions */}
          <div className="space-y-3 relative">
            <div className="inline-block mb-2 px-3 py-1 bg-foreground/5 border-[2px] border-black rounded-md">
              <TechnicalLabel text="QUICK ACTIONS" className="text-foreground text-xs font-black tracking-widest" />
            </div>
            
            {/* Copy Link with refined borders */}
            <div className="flex items-center gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="flex-1 border-3 border-black text-sm bg-muted font-mono focus:border-primary focus:shadow-[4px_4px_0px_0px_rgba(255,119,0,0.2)] transition-all rounded-md"
              />
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="group border-3 border-black hover:bg-black hover:text-white px-4 transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-md"
              >
                {copied ? (
                  <Check className="w-4 h-4 animate-zoom-in" />
                ) : (
                  <Copy className="w-4 h-4 group-hover:scale-110 transition-transform" />
                )}
              </Button>
            </div>

            {/* Copy Full Message with refined styling */}
            <Button
              onClick={handleCopyMessage}
              variant="outline"
              className="group w-full border-3 border-black hover:bg-black hover:text-white py-3 font-black transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden relative rounded-md"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              <Link2 className="w-4 h-4 mr-2 relative z-10 group-hover:scale-110 transition-transform" />
              <span className="relative z-10">COPY FULL MESSAGE</span>
            </Button>
          </div>

          {/* Enhanced Stats Display */}
          <div className="relative group bg-gradient-to-br from-primary/10 via-muted to-muted/80 p-5 md:p-6 border-[4px] border-black rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] transition-all overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-10 animate-pulse"></div>
            <div className="grid grid-cols-2 gap-6 text-center relative z-10">
              <div className="transform group-hover:scale-110 transition-transform duration-300 p-3 bg-white/50 border-[3px] border-black rounded-lg">
                <div className="text-3xl md:text-4xl font-black text-primary drop-shadow-md">25%</div>
                <TechnicalLabel text="COMMISSION RATE" className="text-foreground text-xs mt-2 font-black tracking-wider" />
              </div>
              <div className="transform group-hover:scale-110 transition-transform duration-300 p-3 bg-white/50 border-[3px] border-black rounded-lg">
                <div className="text-3xl md:text-4xl font-black text-foreground drop-shadow-md">∞</div>
                <TechnicalLabel text="LIFETIME EARNINGS" className="text-foreground text-xs mt-2 font-black tracking-wider" />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
