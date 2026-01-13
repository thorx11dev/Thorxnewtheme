
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
      <DialogContent className="max-w-lg mx-auto bg-background border-2 border-black p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="bg-primary text-primary-foreground p-4 md:p-6 border-b-2 border-black">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Share2 className="w-5 h-5 md:w-6 md:h-6" />
              <DialogTitle className="text-lg md:text-xl font-black">
                INVITE FRIENDS
              </DialogTitle>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-black text-white hover:bg-white hover:text-black transition-colors border border-black flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <TechnicalLabel text="SHARE PROTOCOL v2.1" className="text-primary-foreground/80 text-xs" />
        </DialogHeader>

        {/* Content */}
        <div className="p-4 md:p-6 space-y-6">
          {/* Referral Code Display */}
          <div className="text-center">
            <TechnicalLabel text="YOUR REFERRAL CODE" className="text-muted-foreground mb-2 text-xs" />
            <div className="bg-black text-white p-3 md:p-4 border-2 border-primary">
              <div className="text-xl md:text-2xl font-black tracking-widest text-center text-primary">
                {referralCode}
              </div>
            </div>
          </div>

          {/* Custom Message Input */}
          <div>
            <TechnicalLabel text="CUSTOM MESSAGE (OPTIONAL)" className="text-foreground mb-2 text-xs font-black" />
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder={defaultMessage}
              className="w-full min-h-[80px] p-3 border-2 border-black text-sm resize-vertical focus:outline-none focus:border-primary"
              maxLength={500}
            />
            <div className="text-right mt-1">
              <TechnicalLabel text={`${customMessage.length}/500`} className="text-muted-foreground text-xs" />
            </div>
          </div>

          {/* Platform Grid */}
          <div>
            <TechnicalLabel text="CHOOSE PLATFORM" className="text-foreground mb-3 text-xs font-black" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {sharePlatforms.map((platform) => {
                const Icon = platform.icon;
                return (
                  <button
                    key={platform.id}
                    onClick={() => handlePlatformShare(platform)}
                    className={`
                      flex flex-col items-center justify-center p-3 md:p-4 
                      border-2 border-black transition-all duration-200 
                      ${platform.bgColor} ${platform.hoverColor}
                      hover:transform hover:scale-105 active:scale-95
                      focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                    `}
                  >
                    <Icon className={`w-6 h-6 md:w-8 md:h-8 mb-2 ${platform.color}`} />
                    <TechnicalLabel 
                      text={platform.name.toUpperCase()} 
                      className="text-xs font-black text-center leading-tight" 
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <TechnicalLabel text="QUICK ACTIONS" className="text-foreground text-xs font-black" />
            
            {/* Copy Link */}
            <div className="flex items-center gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="flex-1 border-2 border-black text-sm bg-muted"
              />
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="border-2 border-black hover:bg-black hover:text-white px-3"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            {/* Copy Full Message */}
            <Button
              onClick={handleCopyMessage}
              variant="outline"
              className="w-full border-2 border-black hover:bg-black hover:text-white py-3 font-black"
            >
              <Link2 className="w-4 h-4 mr-2" />
              COPY FULL MESSAGE
            </Button>
          </div>

          {/* Stats Display */}
          <div className="bg-muted p-3 md:p-4 border border-muted-foreground/20">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-lg font-black text-primary">15% + 7.5%</div>
                <TechnicalLabel text="MULTI-LEVEL COMMISSION" className="text-muted-foreground text-xs" />
              </div>
              <div>
                <div className="text-lg font-black text-foreground">2 LEVELS</div>
                <TechnicalLabel text="L1 + L2 REFERRALS" className="text-muted-foreground text-xs" />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
