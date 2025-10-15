
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
      <DialogContent className="max-w-lg mx-auto bg-gradient-to-br from-background to-background/95 border-3 border-black p-0 overflow-hidden shadow-2xl">
        {/* Header with enhanced styling */}
        <DialogHeader className="bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground p-4 md:p-6 border-b-3 border-black relative overflow-hidden">
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-grid-pattern"></div>
          </div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3 animate-zoom-in">
              <div className="p-2 bg-black/20 border-2 border-black rounded-md">
                <Share2 className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <DialogTitle className="text-lg md:text-2xl font-black tracking-tight">
                INVITE FRIENDS
              </DialogTitle>
            </div>
            <button
              onClick={onClose}
              className="group relative w-10 h-10 bg-black text-white hover:bg-white hover:text-black transition-all duration-300 border-2 border-black flex items-center justify-center overflow-hidden transform hover:scale-110 hover:rotate-90"
            >
              <X className="w-5 h-5 relative z-10 transition-transform duration-300 group-hover:rotate-90" />
              <div className="absolute inset-0 bg-white transform scale-0 group-hover:scale-100 transition-transform duration-300"></div>
            </button>
          </div>
          <TechnicalLabel text="SHARE PROTOCOL v2.1" className="text-primary-foreground/90 text-xs mt-2 relative z-10" />
        </DialogHeader>

        {/* Content with enhanced styling */}
        <div className="p-4 md:p-6 space-y-6 relative">
          {/* Background grid pattern */}
          <div className="absolute inset-0 opacity-5 bg-grid-pattern pointer-events-none"></div>
          
          {/* Referral Code Display with enhanced animation */}
          <div className="text-center relative animate-zoom-in">
            <TechnicalLabel text="YOUR REFERRAL CODE" className="text-muted-foreground mb-3 text-xs font-black" />
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary via-primary to-primary/80 blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-black text-white p-4 md:p-5 border-3 border-primary shadow-lg">
                <div className="text-2xl md:text-3xl font-black tracking-widest text-center text-primary animate-pulse">
                  {referralCode}
                </div>
              </div>
            </div>
          </div>

          {/* Custom Message Input with enhanced styling */}
          <div className="relative">
            <TechnicalLabel text="CUSTOM MESSAGE (OPTIONAL)" className="text-foreground mb-3 text-xs font-black" />
            <div className="relative group">
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder={defaultMessage}
                className="w-full min-h-[80px] p-3 border-3 border-black text-sm resize-vertical focus:outline-none focus:border-primary focus:shadow-lg focus:shadow-primary/20 transition-all duration-300 bg-white group-hover:border-primary/50"
                maxLength={500}
              />
            </div>
            <div className="text-right mt-2">
              <TechnicalLabel text={`${customMessage.length}/500`} className="text-muted-foreground text-xs font-bold" />
            </div>
          </div>

          {/* Platform Grid with enhanced animations */}
          <div className="relative">
            <TechnicalLabel text="CHOOSE PLATFORM" className="text-foreground mb-4 text-xs font-black" />
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
                      hover:transform hover:scale-110 hover:shadow-xl hover:shadow-black/20
                      active:scale-95 animate-zoom-in
                      focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                      overflow-hidden
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

          {/* Quick Actions with enhanced styling */}
          <div className="space-y-3 relative">
            <TechnicalLabel text="QUICK ACTIONS" className="text-foreground text-xs font-black" />
            
            {/* Copy Link with enhanced design */}
            <div className="flex items-center gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="flex-1 border-3 border-black text-sm bg-muted font-mono focus:border-primary focus:shadow-lg focus:shadow-primary/20 transition-all"
              />
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="group border-3 border-black hover:bg-black hover:text-white px-4 transition-all duration-300 hover:scale-105 active:scale-95"
              >
                {copied ? (
                  <Check className="w-4 h-4 animate-zoom-in" />
                ) : (
                  <Copy className="w-4 h-4 group-hover:scale-110 transition-transform" />
                )}
              </Button>
            </div>

            {/* Copy Full Message with enhanced design */}
            <Button
              onClick={handleCopyMessage}
              variant="outline"
              className="group w-full border-3 border-black hover:bg-black hover:text-white py-3 font-black transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-lg overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              <Link2 className="w-4 h-4 mr-2 relative z-10 group-hover:scale-110 transition-transform" />
              <span className="relative z-10">COPY FULL MESSAGE</span>
            </Button>
          </div>

          {/* Stats Display with enhanced styling */}
          <div className="relative group bg-gradient-to-br from-muted to-muted/80 p-4 md:p-5 border-3 border-black shadow-lg overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
            <div className="grid grid-cols-2 gap-4 text-center relative z-10">
              <div className="transform group-hover:scale-105 transition-transform duration-300">
                <div className="text-2xl md:text-3xl font-black text-primary">25%</div>
                <TechnicalLabel text="COMMISSION RATE" className="text-muted-foreground text-xs mt-1" />
              </div>
              <div className="transform group-hover:scale-105 transition-transform duration-300">
                <div className="text-2xl md:text-3xl font-black text-foreground">∞</div>
                <TechnicalLabel text="LIFETIME EARNINGS" className="text-muted-foreground text-xs mt-1" />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
