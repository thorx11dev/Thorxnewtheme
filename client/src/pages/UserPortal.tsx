import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import TechnicalLabel from "@/components/ui/technical-label";
import Barcode from "@/components/ui/barcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import EnhancedVideoPlayer from "@/components/ui/enhanced-video-player";
import IndustrialTabs, { WORK_TABS } from "@/components/ui/industrial-tabs";
import MetricsCards from "@/components/ui/metrics-cards";
import { DailyGoalModal } from "@/components/ui/daily-goal-modal";
import { ProfileModal } from "@/components/ui/profile-modal";
import { JazzCashLogo, EasyPaisaLogo, BankTransferLogo } from "@/components/ui/payment-icons";
import { useLocation } from "wouter";
import {
  LogOut,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Clock,
  ChevronRight,
  ChevronLeft,
  Eye,
  Target,
  Award,
  ArrowUpRight,
  BarChart3,
  PieChart,
  Zap,
  Copy,
  CheckCircle2,
  Wallet,
  Activity,
  Star,
  Gift,
  Play,
  Pause,
  Timer,
  PlayCircle,
  PauseCircle,
  StopCircle,
  Filter,
  Flame,
  HelpCircle,
  MessageCircle,
  Book,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  Phone,
  Mail,
  CreditCard,
  History,
  Download,
  Home,
  Briefcase,
  UserCheck,
  HandHeart,
  LifeBuoy,
  Crown,
  Trophy,
  Medal,
  Zap as ZapIcon,
  TrendingDown,
  RefreshCw,
  Share2,
  Link2,
  ExternalLink,
  X,
  Settings
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { SiWhatsapp, SiTelegram, SiMessenger, SiInstagram, SiTiktok, SiFacebook, SiGmail } from 'react-icons/si';

// Share Modal Component - Loading Screen Design Standard
function ShareModal({ isOpen, onClose, referralCode, userName, toast }: { isOpen: boolean; onClose: () => void; referralCode: string; userName: string; toast: any }) {
  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/?ref=${referralCode}`;
  const shareMessage = `Hey ${userName}! Check out THORX and start earning. Use my code: ${referralCode}`;
  const [copied, setCopied] = useState(false);

  const handleShare = async (platform: string) => {
    try {
      if (platform === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(`${shareMessage} ${shareUrl}`)}`);
      } else if (platform === 'telegram') {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`${shareMessage}`)}`);
      } else if (platform === 'messenger') {
        window.open(`fb-messenger://share?link=${encodeURIComponent(shareUrl)}&app_id=${encodeURIComponent(shareUrl)}`);
      } else if (platform === 'instagram') {
        window.open(`https://www.instagram.com/create/?text=${encodeURIComponent(`${shareMessage}`)}&url=${encodeURIComponent(shareUrl)}`);
      } else if (platform === 'tiktok') {
        window.open(`https://www.tiktok.com/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`${shareMessage}`)}`);
      } else if (platform === 'facebook') {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareMessage)}`);
      } else if (platform === 'gmail') {
        window.open(`mailto:?subject=${encodeURIComponent('Invitation to Join THORX!')}&body=${encodeURIComponent(`${shareMessage}\n\nClick here to join: ${shareUrl}`)}`);
      }
    } catch (error) {
      console.error("Sharing error:", error);
      toast({ title: "Sharing Failed", description: "Could not share via this platform. Please try again." });
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: "Link Copied!", description: "Referral link copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy error:", error);
      toast({ title: "Copy Failed", description: "Could not copy link. Please try again." });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black animate-in fade-in duration-300 share-modal-wrapper" onClick={onClose}>
      <div className="h-screen flex flex-col items-center justify-center relative px-4 md:px-8" onClick={(e) => e.stopPropagation()}>

        {/* Close Button - Upper Right Corner */}
        <button
          onClick={onClose}
          className="absolute top-6 md:top-8 right-6 md:right-8 p-2 md:p-3 text-white hover:scale-125 hover:opacity-70 active:scale-110 transition-all duration-200 animate-in fade-in slide-in-from-top-4 duration-500 delay-200 z-10"
          data-testid="button-close-modal"
          aria-label="Close modal"
        >
          <X className="w-6 h-6 md:w-7 md:h-7" />
        </button>

        {/* Center Content - Referral Link & Share Icons */}
        <div className="w-full max-w-2xl animate-in fade-in zoom-in duration-500">

          {/* Referral Link Display - Input Container Style */}
          <div className="text-center mb-12 md:mb-16">
            <div className="bg-white/5 border border-white/20 rounded-lg p-6 md:p-8 backdrop-blur-sm animate-in fade-in duration-500 delay-100 hover:border-white/40 transition-colors duration-300" onClick={handleCopyLink}>
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="w-full bg-transparent text-white text-center text-lg md:text-xl lg:text-2xl font-black break-all outline-none select-all placeholder-white/40"
                data-testid="input-referral-link"
              />
            </div>
          </div>

          {/* Social Share Icons - Below Referral Link */}
          <div className="flex justify-center items-center gap-6 md:gap-8 mb-16 md:mb-20 flex-wrap">
            {/* WhatsApp */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShare('whatsapp');
              }}
              className="text-white hover:scale-125 hover:drop-shadow-[0_0_12px_rgba(37,211,102,0.6)] active:scale-95 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 transform origin-center"
              data-testid="share-whatsapp"
              aria-label="Share on WhatsApp"
              title="Share on WhatsApp"
            >
              <SiWhatsapp className="w-8 h-8 md:w-10 md:h-10" />
            </button>
            {/* Telegram */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShare('telegram');
              }}
              className="text-white hover:scale-125 hover:drop-shadow-[0_0_12px_rgba(0,136,204,0.6)] active:scale-95 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 transform origin-center"
              data-testid="share-telegram"
              aria-label="Share on Telegram"
              title="Share on Telegram"
            >
              <SiTelegram className="w-8 h-8 md:w-10 md:h-10" />
            </button>
            {/* Messenger */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShare('messenger');
              }}
              className="text-white hover:scale-125 hover:drop-shadow-[0_0_12px_rgba(0,132,250,0.6)] active:scale-95 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 transform origin-center"
              data-testid="share-messenger"
              aria-label="Share on Messenger"
              title="Share on Messenger"
            >
              <SiMessenger className="w-8 h-8 md:w-10 md:h-10" />
            </button>
            {/* Instagram */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShare('instagram');
              }}
              className="text-white hover:scale-125 hover:drop-shadow-[0_0_12px_rgba(224,33,103,0.6)] active:scale-95 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-250 transform origin-center"
              data-testid="share-instagram"
              aria-label="Share on Instagram"
              title="Share on Instagram"
            >
              <SiInstagram className="w-8 h-8 md:w-10 md:h-10" />
            </button>
            {/* TikTok */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShare('tiktok');
              }}
              className="text-white hover:scale-125 hover:drop-shadow-[0_0_12px_rgba(0,0,0,0.6)] active:scale-95 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 transform origin-center"
              data-testid="share-tiktok"
              aria-label="Share on TikTok"
              title="Share on TikTok"
            >
              <SiTiktok className="w-8 h-8 md:w-10 md:h-10" />
            </button>
            {/* Facebook */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShare('facebook');
              }}
              className="text-white hover:scale-125 hover:drop-shadow-[0_0_12px_rgba(59,89,152,0.6)] active:scale-95 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-350 transform origin-center"
              data-testid="share-facebook"
              aria-label="Share on Facebook"
              title="Share on Facebook"
            >
              <SiFacebook className="w-8 h-8 md:w-10 md:h-10" />
            </button>
            {/* Gmail */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShare('gmail');
              }}
              className="text-white hover:scale-125 hover:drop-shadow-[0_0_12px_rgba(221,75,57,0.6)] active:scale-95 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400 transform origin-center"
              data-testid="share-gmail"
              aria-label="Share via Gmail"
              title="Share via Gmail"
            >
              <SiGmail className="w-8 h-8 md:w-10 md:h-10" />
            </button>
          </div>
        </div>

        {/* Footer - Bottom with Copy Button on Right */}
        <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500">
          <p className="text-white text-base md:text-lg lg:text-xl font-black tracking-widest">REFERRAL SYSTEM</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopyLink();
            }}
            className={`p-2 md:p-3 text-white transition-all duration-300 hover:scale-125 active:scale-95 transform ${copied
              ? 'scale-110 drop-shadow-[0_0_12px_rgba(255,255,255,0.6)]'
              : ''
              }`}
            data-testid="button-copy-referral-link"
            aria-label="Copy referral link"
            title="Copy referral link"
          >
            <Copy className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}


// Animated Placeholder Component for Contact Form
function AnimatedPlaceholder({ examples }: { examples: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    const example = examples[currentIndex];
    let timeout: NodeJS.Timeout;

    if (isTyping) {
      if (currentText.length < example.length) {
        timeout = setTimeout(() => {
          setCurrentText(example.slice(0, currentText.length + 1));
        }, 100);
      } else {
        timeout = setTimeout(() => setIsTyping(false), 1000);
      }
    } else {
      if (currentText.length > 0) {
        timeout = setTimeout(() => {
          setCurrentText(currentText.slice(0, -1));
        }, 50);
      } else {
        setCurrentIndex((prev) => (prev + 1) % examples.length);
        setIsTyping(true);
      }
    }

    return () => clearTimeout(timeout);
  }, [currentText, currentIndex, examples, isTyping]);

  return (
    <span className="text-muted-foreground">
      {currentText}<span className="animate-pulse">|</span>
    </span>
  );
}

// Interfaces
interface Earning {
  id: string;
  type: string;
  amount: string;
  description: string;
  status: string;
  createdAt: string;
}

interface ReferralUser {
  id: string;
  referrerId: string;
  referredId: string;
  status: string;
  totalEarned: string;
  createdAt: string;
  referred: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    createdAt: string;
  };
}

interface AdItem {
  id: string;
  title: string;
  type: "video" | "banner" | "interactive";
  duration: number;
  reward: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  thumbnail?: string;
}

// Sample data
const availableAds: AdItem[] = [
  {
    id: "ad_001",
    title: "CRYPTO TRADING PLATFORM",
    type: "video",
    duration: 30,
    reward: "2.50",
    description: "Watch this crypto trading platform advertisement",
    difficulty: "easy",
    category: "Finance",
  },
  {
    id: "ad_002",
    title: "MOBILE GAME DOWNLOAD",
    type: "video",
    duration: 15,
    reward: "1.25",
    description: "Download and try this exciting mobile game",
    difficulty: "easy",
    category: "Gaming",
  },
  {
    id: "ad_003",
    title: "E-COMMERCE DEAL",
    type: "interactive",
    duration: 45,
    reward: "3.75",
    description: "Interactive advertisement for latest e-commerce deals",
    difficulty: "medium",
    category: "Shopping",
  },
  {
    id: "ad_004",
    title: "FITNESS APP PROMOTION",
    type: "video",
    duration: 20,
    reward: "1.75",
    description: "Learn about this revolutionary fitness application",
    difficulty: "easy",
    category: "Health",
  },
];

const sections = [
  { id: "dashboard", name: "Dashboard", icon: Home },
  { id: "work", name: "Work", icon: Briefcase },
  { id: "referrals", name: "Referrals", icon: UserCheck },
  { id: "payout", name: "Payout", icon: CreditCard },
  { id: "help", name: "Help", icon: LifeBuoy },
];

export default function UserPortal() {
  const { user, logout, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Share Modal State
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReferralLink, setShowReferralLink] = useState(false);
  const [showDailyGoalModal, setShowDailyGoalModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Current section state
  const [currentSection, setCurrentSection] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Work section states
  const [selectedAd, setSelectedAd] = useState<AdItem | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [watchProgress, setWatchProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Enhanced work section states
  const [activeWorkTab, setActiveWorkTab] = useState<string>("player1");
  const [completedVideos, setCompletedVideos] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Enhanced work section configuration complete

  const [completedAds, setCompletedAds] = useState<Set<string>>(new Set());

  // Fetch user data
  const { data: earningsData } = useQuery({
    queryKey: ["earnings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/earnings?limit=10");
      return await response.json() as { earnings: Earning[]; total: string };
    },
    enabled: !!user,
  });

  const { data: referralsData } = useQuery({
    queryKey: ["referrals"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/referrals");
      return await response.json() as {
        referrals: ReferralUser[];
        stats: { count: number; totalEarned: string }
      };
    },
    enabled: !!user,
  });

  const { data: todayAdViews } = useQuery({
    queryKey: ["ad-views", "today"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/ad-views/today");
      return await response.json() as { count: number };
    },
    enabled: !!user,
  });

  // Record ad view mutation
  const recordAdViewMutation = useMutation({
    mutationFn: async (data: {
      adId: string;
      adType: string;
      duration: number;
      completed: boolean;
      earnedAmount: string;
    }) => {
      const response = await apiRequest("POST", "/api/ad-view", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-views"] });
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });

  // Chat and Help Section state
  const [activeHelpTab, setActiveHelpTab] = useState("guide");
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      text: "Hello! Welcome to THORX Support. How can I assist you today?",
      sender: "support",
      timestamp: new Date(Date.now() - 5000).toISOString(),
      avatar: "TS"
    }
  ]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    description: ""
  });
  const [isContactSubmitting, setIsContactSubmitting] = useState(false);

  // Handle contact form submission
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contactForm.name || !contactForm.email || !contactForm.description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields before submitting.",
        variant: "destructive"
      });
      return;
    }

    setIsContactSubmitting(true);

    try {
      const response = await apiRequest("POST", "/api/contact", {
        name: contactForm.name,
        email: contactForm.email,
        description: contactForm.description
      });

      if (response.ok) {
        toast({
          title: "Message Sent!",
          description: "We'll get back to you within 24 hours."
        });
        setContactForm({ name: "", email: "", description: "" });
      } else {
        throw new Error("Failed to send message");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsContactSubmitting(false);
    }
  };

  // Payout section states
  const [currentStep, setCurrentStep] = useState(1);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("");
  const [paymentDetails, setPaymentDetails] = useState({
    name: "",
    number: "",
    id: "",
    iban: ""
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Add auth token if available
      if (user?.access_token) {
        headers['Authorization'] = `Bearer ${user.access_token}`;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({ message: message.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      const supportMessage = {
        id: chatMessages.length + 2,
        text: data.response,
        sender: "support",
        timestamp: new Date().toISOString(),
        avatar: "TS"
      };
      setChatMessages(prev => [...prev, supportMessage]);
    },
    onError: (error) => {
      console.error("Chat error:", error);
      const errorMessage = {
        id: chatMessages.length + 2,
        text: "Sorry, I'm having trouble connecting right now. Please try again or use the Contact section to reach our team.",
        sender: "support",
        timestamp: new Date().toISOString(),
        avatar: "TS"
      };
      setChatMessages(prev => [...prev, errorMessage]);
    }
  });

  // Fetch chat history
  const { data: chatHistoryData, isLoading: isChatHistoryLoading } = useQuery<{ messages: Array<{ id: number; text: string; sender: string; timestamp: string; avatar: string }> }>({
    queryKey: ["chat-history"],
    queryFn: async () => {
      const headers: Record<string, string> = {};

      // Add auth token if available
      if (user?.access_token) {
        headers['Authorization'] = `Bearer ${user.access_token}`;
      }

      const response = await fetch(`/api/chat/history?limit=50`, {
        headers
      });

      if (!response.ok) {
        throw new Error("Failed to fetch chat history");
      }
      return await response.json() as { messages: Array<{ id: number; text: string; sender: string; timestamp: string; avatar: string }> };
    },
    enabled: !!user, // Only fetch if user exists
  });

  // Handle chat history data with useEffect
  useEffect(() => {
    if (chatHistoryData?.messages) {
      setChatMessages([{
        id: 1,
        text: "Hello! Welcome to THORX Support. How can I assist you today?",
        sender: "support",
        timestamp: new Date(Date.now() - 5000).toISOString(),
        avatar: "TS"
      }, ...chatHistoryData.messages.map((msg: { id: number; text: string; sender: string; timestamp: string; avatar: string }) => ({ ...msg, id: Date.now() + Math.random() }))]); // Append fetched messages
    }
  }, [chatHistoryData]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!newMessage || typeof newMessage !== 'string' || !newMessage.trim()) return;

    const userMessage = {
      id: Date.now(), // Simple unique ID
      text: newMessage,
      sender: "user",
      timestamp: new Date().toISOString(),
      avatar: user?.firstName?.charAt(0).toUpperCase() || "U"
    };

    setChatMessages(prev => [...prev, userMessage]);
    const messageToSend = newMessage;
    setNewMessage('');

    try {
      await chatMutation.mutateAsync(messageToSend);
    } catch (error) {
      console.error("Failed to send message:", error);
      // Add an error message to the chat
      const errorMessage = {
        id: Date.now() + 1,
        text: "Message failed to send. Please try again.",
        sender: "support",
        timestamp: new Date().toISOString(),
        avatar: "TS"
      };
      setChatMessages(prev => [...prev, errorMessage]);
    }
  };

  // Navigation handlers
  const navigateToSection = useCallback((index: number) => {
    if (index >= 0 && index < sections.length && index !== currentSection) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSection(index);
        setIsTransitioning(false);
      }, 150);
    }
  }, [currentSection]);

  const nextSection = useCallback(() => {
    navigateToSection((currentSection + 1) % sections.length);
  }, [currentSection, navigateToSection]);

  const prevSection = useCallback(() => {
    navigateToSection((currentSection - 1 + sections.length) % sections.length);
  }, [currentSection, navigateToSection]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          prevSection();
          break;
        case "ArrowRight":
          e.preventDefault();
          nextSection();
          break;
        case "Escape":
          e.preventDefault();
          setLocation("/");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSection, prevSection, setLocation]);

  // Ad watching timer
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isWatching && selectedAd && watchProgress < 100) {
      interval = setInterval(() => {
        setWatchProgress(prev => {
          const newProgress = prev + (100 / selectedAd.duration);
          if (newProgress >= 100) {
            setIsWatching(false);
            setIsCompleted(true);

            recordAdViewMutation.mutate({
              adId: selectedAd.id,
              adType: selectedAd.type,
              duration: selectedAd.duration,
              completed: true,
              earnedAmount: selectedAd.reward,
            });

            setCompletedAds(prev => new Set(Array.from(prev).concat(selectedAd.id)));

            toast({
              title: "Ad Completed! 🎉",
              description: `You earned ${formatCurrency(selectedAd.reward)}`,
              variant: "default",
            });

            return 100;
          }
          return newProgress;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWatching, selectedAd, watchProgress, recordAdViewMutation, toast]);

  // If no user data and not loading, show default guest user
  const displayUser = user || {
    id: "guest",
    firstName: "Guest",
    lastName: "User",
    email: "guest@thorx.com",
    identity: "GUEST_USER",
    phone: "+92 300 0000000",
    referralCode: "GUEST-CODE",
    totalEarnings: "0.00",
    availableBalance: "0.00",
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  // Utility functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `PKR ${numAmount.toFixed(2)}`;
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(displayUser?.referralCode || 'GUEST-CODE');
    toast({
      title: "Copied!",
      description: "Referral code copied to clipboard",
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAdTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return '🎥';
      case 'banner': return '📰';
      case 'interactive': return '🎮';
      default: return '📺';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'hard': return 'bg-rose-100 text-rose-800 border-rose-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getDifficultyColorDark = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-emerald-900/30 text-emerald-300 border-emerald-600';
      case 'medium': return 'bg-amber-900/30 text-amber-300 border-amber-600';
      case 'hard': return 'bg-rose-900/30 text-rose-300 border-rose-600';
      default: return 'bg-slate-800 text-slate-300 border-slate-600';
    }
  };

  const startWatching = (ad: AdItem) => {
    setSelectedAd(ad);
    setWatchProgress(0);
    setIsCompleted(false);
    setIsWatching(true);
  };

  // Enhanced mock data for charts
  const earningsChartData = [
    { date: 'Mon', earnings: 5.25, ads: 8, tasks: 2 },
    { date: 'Tue', earnings: 3.75, ads: 6, tasks: 1 },
    { date: 'Wed', earnings: 8.50, ads: 12, tasks: 3 },
    { date: 'Thu', earnings: 6.25, ads: 10, tasks: 2 },
    { date: 'Fri', earnings: 12.75, ads: 18, tasks: 4 },
    { date: 'Sat', earnings: 15.50, ads: 22, tasks: 5 },
    { date: 'Sun', earnings: 9.25, ads: 14, tasks: 3 }
  ];

  // Calculate real-time earnings breakdown from actual data
  const calculateEarningsBreakdown = () => {
    // Check if we are inside a hook or functional component context
    // These values are used for the chart, we should ensure they are stable
    const adViewsEarnings = (todayAdViews?.count || 0) * 2.5;
    const referralEarnings = parseFloat(referralsData?.stats?.totalEarned || '0');
    const totalEarnings = parseFloat(displayUser?.totalEarnings || '0');

    // Calculate remaining from other sources
    const otherEarnings = totalEarnings - adViewsEarnings - referralEarnings;
    const dailyTasksEarnings = Math.max(0, otherEarnings * 0.7);
    const bonusesEarnings = Math.max(0, otherEarnings * 0.3);

    const total = adViewsEarnings + referralEarnings + dailyTasksEarnings + bonusesEarnings;

    // Theme-consistent color palette: Primary orange, black, beige accents, white
    const chartColors = {
      primary: '#FF6B35',      // Primary orange
      secondary: '#000000',    // Black
      tertiary: '#E8DCC4',     // Beige
      quaternary: '#FFFFFF'    // White (with black border for visibility)
    };

    // Calculate percentages
    if (total === 0) {
      return [
        { name: 'Ad Views', value: 65, color: chartColors.primary },
        { name: 'Referrals', value: 25, color: chartColors.secondary },
        { name: 'Daily Tasks', value: 7, color: chartColors.tertiary },
        { name: 'Bonuses', value: 3, color: chartColors.quaternary }
      ];
    }

    return [
      {
        name: 'Ad Views',
        value: Math.round((adViewsEarnings / total) * 100),
        color: chartColors.primary
      },
      {
        name: 'Referrals',
        value: Math.round((referralEarnings / total) * 100),
        color: chartColors.secondary
      },
      {
        name: 'Daily Tasks',
        value: Math.round((dailyTasksEarnings / total) * 100),
        color: chartColors.tertiary
      },
      {
        name: 'Bonuses',
        value: Math.round((bonusesEarnings / total) * 100),
        color: chartColors.quaternary
      }
    ];
  };

  const earningTypesData = calculateEarningsBreakdown();

  const dailyGoal = 50;
  const currentProgress = parseFloat(displayUser?.totalEarnings || '0.00');
  const progressPercentage = Math.min((currentProgress / dailyGoal) * 100, 100);
  const dailyLimit = 50;
  const remainingAds = dailyLimit - (todayAdViews?.count || 0);

  return (
    <div className="min-h-screen bg-background relative">
      {/* Industrial Grid Overlay */}
      <div className="industrial-grid fixed inset-0 z-0" />

      {/* Navigation Header */}
      <nav className="fixed top-0 w-full z-50 bg-white border-b-4 border-black" data-testid="portal-navigation">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Original Landing Page Logo Style - Sleek & Minimal */}
            <div className="flex items-center">
              <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-black" data-testid="portal-logo">
                THORX.
              </h1>
            </div>

            {/* Minimal Sleek Tab Navigation */}
            <nav className="hidden md:flex items-center space-x-2" role="navigation" aria-label="Primary navigation">
              {sections.map((section, index) => {
                const Icon = section.icon;
                const isActive = currentSection === index;
                return (
                  <button
                    key={section.id}
                    onClick={() => navigateToSection(index)}
                    className={`flex items-center space-x-3 px-5 py-2 border-3 border-black transition-all duration-200 focus-visible:outline-none ${isActive
                      ? 'bg-primary text-black translate-x-[1px] translate-y-[1px] shadow-none'
                      : 'bg-white text-black hover:bg-white/80 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none'
                      }`}
                    data-testid={`nav-tab-${section.id}`}
                    aria-label={`Go to ${section.name}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'stroke-[3px]' : 'stroke-[2px]'}`} />
                    <span className="text-xs font-black uppercase tracking-wider">
                      {section.name}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Mobile Section Indicator (simple dots for reference) */}
            <div className="flex md:hidden items-center space-x-2" aria-hidden="true">
              {sections.map((section, index) => (
                <div
                  key={section.id}
                  className={`w-2 h-2 border border-black transition-all duration-300 ${currentSection === index
                    ? 'bg-primary'
                    : 'bg-transparent'
                    }`}
                  data-testid={`nav-indicator-${section.id}`}
                />
              ))}
            </div>

            {/* Minimal User Controls */}
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => setShowProfileModal(true)}
                variant="outline"
                size="sm"
                className="border-3 border-black text-black bg-white hover:bg-primary shadow-[3px_3px_0px_#000] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all"
                style={{ borderRadius: '0' }}
                data-testid="button-profile"
              >
                <Settings className="w-5 h-5 stroke-[2px]" />
              </Button>
              <Button
                onClick={() => logout()}
                variant="outline"
                size="sm"
                className="border-3 border-black text-black bg-white hover:bg-rose-500 hover:text-white shadow-[3px_3px_0px_#000] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all"
                style={{ borderRadius: '0' }}
                data-testid="button-logout"
              >
                <LogOut className="w-5 h-5 stroke-[2px]" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Desktop Navigation Controls - Landing Page Style (Hidden on Mobile for User Portal) */}
      <div className="arrow-keys-guide hidden md:flex">
        <div className="flex items-center gap-3">
          <button
            onClick={prevSection}
            className="arrow-key"
            disabled={currentSection === 0}
            data-testid="button-prev-section"
          >
            ←
          </button>
          <button
            onClick={nextSection}
            className="arrow-key"
            disabled={currentSection === sections.length - 1}
            data-testid="button-next-section"
          >
            →
          </button>
        </div>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-6 left-6 right-6 z-50 bg-white border-4 border-black shadow-[5px_5px_0px_#000] rounded-none overflow-hidden" role="navigation" aria-label="Mobile navigation">
        <div className="flex h-16">
          {sections.map((section, index) => {
            const Icon = section.icon;
            const isActive = currentSection === index;
            return (
              <button
                key={section.id}
                onClick={() => navigateToSection(index)}
                className={`flex-1 flex flex-col items-center justify-center transition-all duration-200 focus-visible:outline-none ${isActive
                  ? 'bg-primary text-black'
                  : 'bg-white text-black opacity-50 grayscale hover:opacity-100 hover:grayscale-0'
                  } border-r-4 border-black last:border-r-0`}
                data-testid={`mobile-tab-${section.id}`}
                aria-label={`Go to ${section.name}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[3px]' : 'stroke-[2px]'}`} />
                <span className={`text-[8px] mt-1 font-black uppercase tracking-tighter ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                  {section.name}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Section Content */}
      <div className="pt-24 md:pt-32 pb-[calc(8rem+env(safe-area-inset-bottom))] md:pb-12">
        {sections.map((section, index) => (
          <section
            key={section.id}
            className={`cinematic-section ${currentSection === index ? 'active' : ''} ${isTransitioning ? 'transitioning' : ''
              }`}
            data-testid={`section-${section.id}`}
          >
            {/* Section Content */}
            {index === 0 && renderDashboardSection()}
            {index === 1 && renderWorkSection()}
            {index === 2 && renderReferralsSection()}
            {index === 3 && renderPayoutSection()}
            {index === 4 && renderHelpSection()}
          </section>
        ))}
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        referralCode={displayUser?.referralCode || 'GUEST-CODE'}
        userName={displayUser?.firstName || 'Guest'}
        toast={toast}
      />

      {/* Daily Goal Modal */}
      <DailyGoalModal
        isOpen={showDailyGoalModal}
        onClose={() => setShowDailyGoalModal(false)}
        dailyGoalAmount={dailyGoal}
        currentEarnings={currentProgress}
        adsWatched={todayAdViews?.count || 0}
        adsTarget={dailyLimit}
        referralsToday={referralsData?.stats.count || 0} // Using total for demo, ideally should be today's referrals
      />
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={displayUser}
      />
    </div>
  );

  // Dashboard Section
  function renderDashboardSection() {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-0 relative z-10">
        {/* Hero Section */}
        <div className="wireframe-border p-4 md:p-8 mb-4 md:mb-8">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-xl md:text-4xl lg:text-5xl font-black text-foreground mb-3 md:mb-4 tracking-tighter leading-tight px-1 md:px-2">
              ASSALAM U ALAYKUM,<br />
              <span className="text-primary bg-primary/10 px-1 md:px-2 py-1 inline-block mt-2 text-lg md:text-4xl lg:text-5xl">{displayUser?.firstName || "GUEST"}</span>
            </h1>
            <div className="max-w-3xl mx-auto mb-2">
              <p className="text-xs md:text-lg text-muted-foreground leading-relaxed px-1 md:px-2">
                Track your earnings • Monitor your progress in real-time
              </p>
            </div>
            <Barcode className="w-24 md:w-32 lg:w-48 h-6 md:h-8 lg:h-10 mx-auto opacity-60" />
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
          {/* Total Earnings */}
          <div className="group split-card bg-gradient-to-br from-card to-card/80 hover:from-primary/5 hover:to-primary/10 border-2 border-muted-foreground/20 hover:border-primary/30 p-6 text-left transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-primary/10" data-testid="card-total-earnings">
            <div className="flex items-start justify-between mb-3">
              <Wallet className="w-8 h-8 text-primary group-hover:text-primary/80 transition-colors" />
              <TechnicalLabel text="TOTAL EARNINGS" className="text-muted-foreground text-xs" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-foreground mb-2 group-hover:text-primary/90 transition-colors" data-testid="text-total-earnings">{formatCurrency(displayUser?.totalEarnings || '0.00')}</p>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <TechnicalLabel text="+15.2% THIS WEEK" className="text-green-500 text-xs" />
            </div>
          </div>

          {/* Available Balance */}
          <div className="group split-card bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border-2 border-primary/20 hover:border-primary/40 p-6 text-left transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-primary/20" data-testid="card-available-balance">
            <div className="flex items-start justify-between mb-3">
              <DollarSign className="w-8 h-8 text-primary group-hover:text-primary/80 transition-colors" />
              <TechnicalLabel text="AVAILABLE BALANCE" className="text-muted-foreground text-xs" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-primary mb-2 group-hover:text-primary/90 transition-colors" data-testid="text-available-balance">{formatCurrency(displayUser?.availableBalance || '0.00')}</p>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-primary" />
              <TechnicalLabel text="READY FOR WITHDRAWAL" className="text-primary/70 text-xs" />
            </div>
          </div>

          {/* Active Referrals */}
          <div className="group split-card bg-gradient-to-br from-muted to-muted/60 hover:from-muted/80 hover:to-muted/40 border-2 border-muted-foreground/20 hover:border-muted-foreground/40 p-6 text-left transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-muted-foreground/10" data-testid="card-active-referrals">
            <div className="flex items-start justify-between mb-3">
              <Users className="w-8 h-8 text-foreground/80 group-hover:text-foreground transition-colors" />
              <TechnicalLabel text="ACTIVE REFERRALS" className="text-muted-foreground text-xs" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-foreground mb-2 group-hover:text-foreground/90 transition-colors" data-testid="text-referrals-count">{referralsData?.stats.count || 0}</p>
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
              <TechnicalLabel text={`+${formatCurrency(referralsData?.stats.totalEarned || '0.00')} EARNED`} className="text-muted-foreground text-xs" />
            </div>
          </div>

          {/* Daily Progress */}
          <div
            className="group split-card bg-gradient-to-br from-card to-card/80 hover:from-card/90 hover:to-card/70 border-2 border-muted-foreground/20 hover:border-muted-foreground/40 p-6 text-left transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-muted-foreground/10"
            data-testid="card-daily-goal"
            onClick={() => setShowDailyGoalModal(true)}
          >
            <div className="flex items-start justify-between mb-3">
              <Target className="w-8 h-8 text-primary group-hover:text-primary/80 transition-colors" />
              <TechnicalLabel text="DAILY GOAL" className="text-muted-foreground text-xs" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-primary mb-3 group-hover:text-primary/90 transition-colors" data-testid="text-daily-progress">{Math.round(progressPercentage)}%</p>
            <Progress value={progressPercentage} className="progress-enhanced h-2 mb-3" />
            <TechnicalLabel text={`${formatCurrency(currentProgress.toString())} / ${formatCurrency(dailyGoal.toString())}`} className="text-muted-foreground text-xs" />
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
          {/* Weekly Earnings Chart */}
          <Card className="group split-card bg-gradient-to-br from-card to-card/90 border-2 border-muted-foreground/20 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
            <CardHeader className="border-b border-muted-foreground/20 group-hover:border-primary/30 transition-colors p-3 md:p-6">
              <CardTitle className="flex items-center justify-between">
                <TechnicalLabel text="WEEKLY EARNINGS" className="text-foreground group-hover:text-primary/90 transition-colors text-xs md:text-sm" />
                <div className="p-1 md:p-2 bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-all duration-300">
                  <BarChart3 className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 md:p-4">
              <ResponsiveContainer width="100%" height={isMobile ? 200 : 280} minHeight={isMobile ? 180 : 250}>
                <AreaChart data={earningsChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 2" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={isMobile ? 8 : 10}
                    fontFamily="var(--font-sans)"
                    tickLine={false}
                    axisLine={false}
                    hide={isMobile}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={isMobile ? 8 : 10}
                    fontFamily="var(--font-sans)"
                    tickFormatter={(value) => isMobile ? `${value}` : `PKR ${value}`}
                    tickLine={false}
                    axisLine={false}
                    hide={isMobile}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    formatter={(value) => [`PKR ${value}`, 'Earnings']}
                    labelFormatter={(label) => `Day: ${label}`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '2px solid hsl(var(--primary))',
                      borderRadius: '4px',
                      color: 'hsl(var(--primary))',
                      fontFamily: 'var(--font-sans)',
                      fontSize: isMobile ? '10px' : '12px',
                      fontWeight: 'bold',
                      boxShadow: '0 4px 12px hsl(var(--primary)/0.25)'
                    }}
                    labelStyle={{ color: 'hsl(var(--primary))' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="earnings"
                    stroke="hsl(var(--primary))"
                    strokeWidth={isMobile ? 2 : 3}
                    fill="url(#earningsGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Earnings Breakdown */}
          <Card className="group split-card bg-gradient-to-br from-card to-card/90 border-2 border-black hover:border-primary transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
            <CardHeader className="border-b-2 border-black group-hover:border-primary transition-colors p-3 md:p-6">
              <CardTitle className="flex items-center justify-between">
                <TechnicalLabel text="EARNINGS BREAKDOWN" className="text-foreground group-hover:text-primary/90 transition-colors text-xs md:text-sm" />
                <div className="p-1 md:p-2 bg-primary/10 border-2 border-black group-hover:bg-primary/20 transition-all duration-300">
                  <PieChart className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 md:p-4">
              <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
                {/* Pie Chart */}
                <div className="flex-1 w-full flex justify-center">
                  <ResponsiveContainer width="100%" height={isMobile ? 180 : 280} minHeight={isMobile ? 160 : 250}>
                    <RechartsPieChart margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <Pie
                        data={earningTypesData}
                        cx="50%"
                        cy="50%"
                        outerRadius={isMobile ? 60 : 90}
                        innerRadius={0}
                        dataKey="value"
                        stroke="#000000"
                        strokeWidth={3}
                        label={false}
                      >
                        {earningTypesData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            stroke="#000000"
                            strokeWidth={3}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [`${value}%`, name]}
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          border: '3px solid #000000',
                          borderRadius: '0px',
                          padding: isMobile ? '8px' : '12px',
                          fontFamily: 'var(--font-sans)',
                          fontSize: isMobile ? '10px' : '13px',
                          fontWeight: '900',
                          boxShadow: '4px 4px 0px #000000'
                        }}
                        labelStyle={{
                          color: '#000000',
                          fontWeight: '900',
                          marginBottom: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          fontSize: isMobile ? '9px' : '11px'
                        }}
                        itemStyle={{
                          color: 'hsl(var(--primary))',
                          fontWeight: '900',
                          fontSize: isMobile ? '9px' : '12px'
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="w-full md:w-auto grid grid-cols-2 md:flex md:flex-col gap-1.5 md:gap-2 mt-2 md:mt-0">
                  {earningTypesData.map((entry, index) => (
                    <div key={`legend-${index}`} className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 bg-background border border-black md:border-2 hover:bg-primary/5 transition-colors">
                      <div
                        className="w-3 h-3 md:w-4 md:h-4 border border-black md:border-2 flex-shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <div className="text-xs font-black text-foreground whitespace-nowrap">
                        {entry.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Enhanced Work Section
  function renderWorkSection() {
    // Handle video completion
    const handleVideoComplete = (tabId: string, earnings: string) => {
      setCompletedVideos(prev => new Set(Array.from(prev).concat(tabId)));
      toast({
        title: "Ad Completed!",
        description: `You earned $${earnings}`,
      });
    };

    // Get current video tab data for player
    const activeTabData = WORK_TABS.find(tab => tab.id === activeWorkTab);
    const currentVideoTab = {
      id: activeWorkTab,
      title: activeTabData?.title || "PLAYER 1",
      icon: "play",
      color: "primary",
      videoUrl: `#${activeWorkTab}-video`,
      reward: "2.50",
      description: activeTabData?.description || "Watch video ads to earn rewards"
    };

    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-0 relative z-10">
        {/* Hero Section - Dashboard Style */}
        <div className="wireframe-border p-4 md:p-8 mb-4 md:mb-8">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-xl md:text-4xl lg:text-5xl font-black text-foreground mb-3 md:mb-4 tracking-tighter leading-tight px-1 md:px-2">
              START <span className="text-primary">EARNING</span><br />
              WATCH & EARN REWARDS
            </h1>
            <div className="max-w-3xl mx-auto mb-2">
              <p className="text-xs md:text-lg text-muted-foreground leading-relaxed px-1 md:px-2">
                Watch advertisements, complete tasks, and earn real money daily
              </p>
            </div>
            <Barcode className="w-24 md:w-32 lg:w-48 h-6 md:h-8 lg:h-10 mx-auto opacity-60" />
          </div>
        </div>

        {/* Key Metrics Cards - Exact Dashboard Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
          {/* Ads Watched */}
          <div className="group split-card bg-gradient-to-br from-card to-card/80 hover:from-primary/5 hover:to-primary/10 border-2 border-muted-foreground/20 hover:border-primary/30 p-6 text-left transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-primary/10" data-testid="card-work-ads-watched">
            <div className="flex items-start justify-between mb-3">
              <Eye className="w-8 h-8 text-primary group-hover:text-primary/80 transition-colors" />
              <TechnicalLabel text="ADS WATCHED" className="text-muted-foreground text-xs" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-foreground mb-2 group-hover:text-primary/90 transition-colors" data-testid="text-work-ads-watched">
              {todayAdViews?.count || 0}
            </p>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <TechnicalLabel text="+12% TODAY" className="text-green-500 text-xs" />
            </div>
          </div>

          {/* Remaining Ads */}
          <div className="group split-card bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border-2 border-primary/20 hover:border-primary/40 p-6 text-left transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-primary/20" data-testid="card-work-remaining-ads">
            <div className="flex items-start justify-between mb-3">
              <Target className="w-8 h-8 text-primary group-hover:text-primary/80 transition-colors" />
              <TechnicalLabel text="REMAINING ADS" className="text-muted-foreground text-xs" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-primary mb-2 group-hover:text-primary/90 transition-colors" data-testid="text-work-remaining-ads">
              {remainingAds}
            </p>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-primary" />
              <TechnicalLabel text="DAILY QUOTA LEFT" className="text-primary/70 text-xs" />
            </div>
          </div>

          {/* Today's Earnings */}
          <div className="group split-card bg-gradient-to-br from-muted to-muted/60 hover:from-muted/80 hover:to-muted/40 border-2 border-muted-foreground/20 hover:border-muted-foreground/40 p-6 text-left transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-muted-foreground/10" data-testid="card-work-today-earnings">
            <div className="flex items-start justify-between mb-3">
              <DollarSign className="w-8 h-8 text-foreground/80 group-hover:text-foreground transition-colors" />
              <TechnicalLabel text="TODAY'S EARNINGS" className="text-muted-foreground text-xs" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-foreground mb-2 group-hover:text-foreground/90 transition-colors" data-testid="text-work-today-earnings">
              {formatCurrency((completedAds.size * 2.5))}
            </p>
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
              <TechnicalLabel text="+₨2.50 SESSION" className="text-muted-foreground text-xs" />
            </div>
          </div>

          {/* Daily Goal */}
          <div
            className="group split-card bg-gradient-to-br from-card to-card/80 hover:from-card/90 hover:to-card/70 border-2 border-muted-foreground/20 hover:border-muted-foreground/40 p-6 text-left transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-muted-foreground/10"
            data-testid="card-work-daily-goal"
            onClick={() => setShowDailyGoalModal(true)}
          >
            <div className="flex items-start justify-between mb-3">
              <Award className="w-8 h-8 text-primary group-hover:text-primary/80 transition-colors" />
              <TechnicalLabel text="DAILY GOAL" className="text-muted-foreground text-xs" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-primary mb-3 group-hover:text-primary/90 transition-colors" data-testid="text-work-daily-goal">
              {Math.round((completedAds.size / dailyLimit) * 100)}%
            </p>
            <Progress value={Math.round((completedAds.size / dailyLimit) * 100)} className="progress-enhanced h-2 mb-3" />
            <TechnicalLabel text={`${completedAds.size} / ${dailyLimit} ADS`} className="text-muted-foreground text-xs" />
          </div>
        </div>

        {/* Industrial Work Interface - Full Width */}
        <div className="industrial-video-frame p-4">
          <Tabs value={activeWorkTab} onValueChange={setActiveWorkTab} className="w-full">
            {WORK_TABS.map(tab => (
              <TabsContent key={tab.id} value={tab.id} className="mt-0">
                <div className="space-y-4">
                  {/* Enhanced Video Player for active tab */}
                  {tab.id === activeWorkTab && (
                    <EnhancedVideoPlayer
                      tab={currentVideoTab}
                      isActive={true}
                      onComplete={handleVideoComplete}
                      autoplay={false}
                      isMobile={isMobile}
                    />
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    );
  }

  // Enhanced Referrals Section - Dashboard Style
  function renderReferralsSection() {
    const [leaderboardTab, setLeaderboardTab] = useState<"l1" | "l2">("l1");

    // Move Hook here to avoid order issues
    const { data: referralsData } = useQuery<any>({
      queryKey: ['/api/referrals'],
    });

    // Mock data for leadership board
    const leaderboardData = [
      {
        id: "1",
        rank: 1,
        name: "Don Ivan",
        earnings: "2,450.00",
        referrals: 15,
        l1: 10,
        l2: 5,
        status: "ACTIVE",
        tier: "PLATINUM",
        joinDate: "2024-01-15",
        isCurrentUser: false
      },
      {
        id: "2",
        rank: 2,
        name: "Saad Rauf",
        earnings: "1,890.50",
        referrals: 12,
        l1: 8,
        l2: 4,
        status: "ACTIVE",
        tier: "GOLD",
        joinDate: "2024-02-03",
        isCurrentUser: false
      },
      {
        id: "3",
        rank: 3,
        name: "Zain Abbas",
        earnings: "1,425.75",
        referrals: 9,
        l1: 6,
        l2: 3,
        status: "ACTIVE",
        tier: "SILVER",
        joinDate: "2024-02-18",
        isCurrentUser: false
      }
    ];

    // Sorting logic based on active tab
    const sortedLeaderboard = [...leaderboardData].sort((a, b) => b[leaderboardTab] - a[leaderboardTab]);


    const getRankIcon = (rank: number) => {
      switch (rank) {
        case 1: return <Crown className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />;
        case 2: return <Trophy className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />;
        case 3: return <Medal className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />;
        default: return <Star className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />;
      }
    };

    const getTierColor = (tier: string) => {
      switch (tier) {
        case 'PLATINUM': return 'bg-gradient-to-r from-blue-600 to-purple-600 text-white';
        case 'GOLD': return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white';
        case 'SILVER': return 'bg-gradient-to-r from-gray-400 to-gray-600 text-white';
        default: return 'bg-black text-white';
      }
    };

    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-0 relative z-10">
        {/* Hero Section - Dashboard Style */}
        <div className="wireframe-border p-4 md:p-8 mb-4 md:mb-8">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-xl md:text-4xl lg:text-5xl font-black text-foreground mb-3 md:mb-4 tracking-tighter leading-tight px-1 md:px-2">
              BUILD YOUR <span className="text-primary">NETWORK</span><br />
              EARN MORE TOGETHER
            </h1>
            <div className="max-w-3xl mx-auto mb-2">
              <p className="text-xs md:text-lg text-muted-foreground leading-relaxed px-1 md:px-2">
                Invite friends, earn together, and build a passive income stream through referrals
              </p>
            </div>
            <Barcode className="w-24 md:w-32 lg:w-48 h-6 md:h-8 lg:h-10 mx-auto opacity-60" />
          </div>
        </div>
        {/* Key Metrics Cards - Dashboard Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
          {/* Total Referrals */}
          <div className="group split-card bg-gradient-to-br from-card to-card/80 hover:from-primary/5 hover:to-primary/10 border-2 border-muted-foreground/20 hover:border-primary/30 p-6 text-left transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-primary/10" data-testid="card-total-referrals">
            <div className="flex items-start justify-between mb-3">
              <Users className="w-8 h-8 text-primary group-hover:text-primary/80 transition-colors" />
              <TechnicalLabel text="TOTAL REFERRALS" className="text-muted-foreground text-xs" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-foreground mb-2 group-hover:text-primary/90 transition-colors" data-testid="text-referrals-count">{referralsData?.stats.count || 0}</p>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <TechnicalLabel text="+2 THIS WEEK" className="text-green-500 text-xs" />
            </div>
          </div>

          {/* Referral Earnings */}
          <div className="group split-card bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border-2 border-primary/20 hover:border-primary/40 p-6 text-left transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-primary/20" data-testid="card-referral-earnings">
            <div className="flex items-start justify-between mb-3">
              <DollarSign className="w-8 h-8 text-primary group-hover:text-primary/80 transition-colors" />
              <TechnicalLabel text="REFERRAL EARNINGS" className="text-muted-foreground text-xs" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-primary mb-2 group-hover:text-primary/90 transition-colors" data-testid="text-referral-earnings">{formatCurrency(referralsData?.stats.totalEarned || '0.00')}</p>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-primary" />
              <TechnicalLabel text="15% + 7.5% COMMISSION" className="text-primary/70 text-xs" />
            </div>
          </div>

          {/* Commission Rate */}
          <div className="group split-card bg-gradient-to-br from-muted to-muted/60 hover:from-muted/80 hover:to-muted/40 border-2 border-muted-foreground/20 hover:border-muted-foreground/40 p-6 text-left transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-muted-foreground/10" data-testid="card-commission-rate">
            <div className="flex items-start justify-between mb-3">
              <TrendingUp className="w-8 h-8 text-foreground/80 group-hover:text-foreground transition-colors" />
              <TechnicalLabel text="COMMISSION RATE" className="text-muted-foreground text-xs" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-foreground mb-2 group-hover:text-foreground/90 transition-colors" data-testid="text-commission-rate">15%</p>
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
              <TechnicalLabel text="L1: 15% / L2: 7.5%" className="text-muted-foreground text-xs" />
            </div>
          </div>

          {/* Network Potential */}
          <div className="group split-card bg-gradient-to-br from-card to-card/80 hover:from-card/90 hover:to-card/70 border-2 border-muted-foreground/20 hover:border-muted-foreground/40 p-6 text-left transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-muted-foreground/10" data-testid="card-network-potential">
            <div className="flex items-start justify-between mb-3">
              <RefreshCw className="w-8 h-8 text-primary group-hover:text-primary/80 transition-colors" />
              <TechnicalLabel text="NETWORK POTENTIAL" className="text-muted-foreground text-xs" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-primary mb-2 group-hover:text-primary/90 transition-colors" data-testid="text-network-potential">∞</p>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <TechnicalLabel text="UNLIMITED GROWTH" className="text-green-500 text-xs" />
            </div>
          </div>
        </div>
        {/* Middle Section - Invitation Area and Leadership Area */}
        <div className="grid lg:grid-cols-2 gap-4 md:gap-8 mb-6 md:mb-8">
          {/* Invitation Area */}
          <div className="wireframe-section p-4 md:p-6">
            <div className="border-b-2 border-black pb-3 md:pb-4 mb-4 md:mb-6">
              <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                <Share2 className="w-4 h-4 md:w-6 md:h-6 text-primary" />
                <TechnicalLabel text="INVITATION AREA" className="text-foreground text-sm md:text-lg font-black" />
              </div>
              <TechnicalLabel text="PROTOCOL: NETWORK_EXPANSION_v2.1" className="text-muted-foreground text-xs" />
            </div>

            {/* Referral Code/Link Display */}
            <div className="bg-black text-white p-4 md:p-6 border-2 border-primary mb-4 md:mb-6 transition-all duration-300">
              <TechnicalLabel text={showReferralLink ? "YOUR REFERRAL LINK" : "YOUR REFERRAL CODE"} className="text-primary mb-3 md:mb-4 text-center text-xs md:text-sm" />
              <div className="referral-code-display bg-primary text-black px-3 md:px-6 py-3 md:py-4 text-sm md:text-3xl font-black tracking-widest text-center border-2 border-white break-all">
                {showReferralLink
                  ? `${window.location.origin}/?ref=${displayUser?.referralCode}`
                  : displayUser?.referralCode
                }
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 md:space-y-3">
              <Button
                onClick={async () => {
                  const textToCopy = showReferralLink
                    ? `${window.location.origin}/?ref=${displayUser?.referralCode}`
                    : displayUser?.referralCode;
                  try {
                    await navigator.clipboard.writeText(textToCopy);
                    toast({ title: "Copied!", description: showReferralLink ? "Referral link copied to clipboard." : "Referral code copied to clipboard." });
                  } catch (error) {
                    toast({ title: "Copy Failed", description: "Could not copy. Please try again.", variant: "destructive" });
                  }
                }}
                className="w-full bg-primary hover:bg-primary/90 text-black px-4 md:px-6 py-3 md:py-4 text-sm md:text-lg font-black border-2 border-black"
                data-testid="button-copy-referral"
              >
                <Copy className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3" />
                Copy
              </Button>

              <div className="button-group-mobile grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowReferralLink(!showReferralLink)}
                  className="referral-action-button border-2 border-black text-foreground hover:bg-black hover:text-white py-2 md:py-3 font-black text-xs md:text-sm transition-all duration-200"
                  data-testid="button-generate-link"
                >
                  <Link2 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  {showReferralLink ? "GENERATE CODE" : "GENERATE LINK"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowShareModal(true)}
                  className="referral-action-button border-2 border-black text-foreground hover:bg-black hover:text-white py-2 md:py-3 font-black text-xs md:text-sm"
                >
                  <ExternalLink className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  SHARE
                </Button>
              </div>
            </div>

            <div className="mt-4 md:mt-6 p-3 md:p-4 bg-muted/40 border border-muted-foreground/15 rounded-sm">
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <TechnicalLabel text="Level 1 Commission" className="text-muted-foreground text-xs md:text-sm" />
                  <div className="text-lg md:text-xl font-black text-foreground">15%</div>
                </div>
                <div className="flex justify-between items-baseline">
                  <TechnicalLabel text="Level 2 Commission" className="text-muted-foreground text-xs md:text-sm" />
                  <div className="text-lg md:text-xl font-black text-foreground">7.5%</div>
                </div>
              </div>
              <div className="border-t border-muted-foreground/10 mt-2 pt-2">
                <TechnicalLabel text="Credited upon payout request" className="text-muted-foreground text-xs" />
              </div>
            </div>
          </div>

          {/* Leadership Area */}
          <div className="wireframe-section p-4 md:p-6">
            <div className="border-b-2 border-black pb-3 md:pb-4 mb-4 md:mb-6">
              <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                <Crown className="w-4 h-4 md:w-6 md:h-6 text-primary" />
                <TechnicalLabel text="LEADERSHIP AREA" className="text-foreground text-sm md:text-lg font-black" />
              </div>
              <TechnicalLabel text="TOP PERFORMERS RANKING" className="text-muted-foreground text-xs" />
            </div>

            {/* Leadership Stats */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
              <div className="text-center p-2 md:p-3 bg-muted border border-muted-foreground/20">
                <div className="metric-value-mobile text-base md:text-lg font-black text-foreground">#{referralsData?.stats.count ? Math.min(referralsData.stats.count + 15, 50) : 42}</div>
                <TechnicalLabel text="YOUR RANK" className="text-muted-foreground text-xs leading-tight" />
              </div>
              <div className="text-center p-2 md:p-3 bg-primary text-white border border-primary">
                <div className="metric-value-mobile text-base md:text-lg font-black text-white">TOP 10%</div>
                <TechnicalLabel text="PERCENTILE" className="text-white/80 text-xs leading-tight" />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2 md:space-y-3">
              <Button
                variant="outline"
                onClick={() => navigateToSection(0)}
                className="w-full border-2 border-black text-foreground hover:bg-black hover:text-white py-2 md:py-3 font-black text-xs md:text-sm"
              >
                <BarChart3 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                VIEW PROGRESS
              </Button>
              <Button
                variant="outline"
                onClick={() => navigateToSection(1)}
                className="w-full border-2 border-black text-foreground hover:bg-black hover:text-white py-2 md:py-3 font-black text-xs md:text-sm"
              >
                <Zap className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                EARN MORE!
              </Button>
              <Button
                variant="outline"
                onClick={() => navigateToSection(3)}
                className="w-full border-2 border-black text-foreground hover:bg-black hover:text-white py-2 md:py-3 font-black text-xs md:text-sm"
              >
                <Wallet className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                GET PAYOUT
              </Button>
              <Button
                variant="outline"
                onClick={() => navigateToSection(4)}
                className="w-full border-2 border-black text-foreground hover:bg-black hover:text-white py-2 md:py-3 font-black text-xs md:text-sm"
              >
                <HelpCircle className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                ANY HELP?
              </Button>
            </div>
          </div>
        </div>
        {/* Bottom Section - Leaderboard List (Blue highlighted in wireframe) */}
        <div className="wireframe-border bg-primary/5 p-4 md:p-6">
          <div className="border-b-2 border-primary pb-3 md:pb-4 mb-4 md:mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2 md:gap-3">
                <Trophy className="w-4 h-4 md:w-6 md:h-6 text-primary" />
                <TechnicalLabel text="TOP REFERRERS LEADERBOARD" className="text-foreground text-sm md:text-lg font-black" />
              </div>

              {/* Tab Switcher */}
              <div className="flex bg-black/5 p-1 border-2 border-black rounded-sm">
                <button
                  onClick={() => setLeaderboardTab("l1")}
                  className={`px-3 py-1.5 text-xs font-black transition-all ${leaderboardTab === "l1"
                    ? "bg-primary text-black"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  LEVEL 1
                </button>
                <button
                  onClick={() => setLeaderboardTab("l2")}
                  className={`px-3 py-1.5 text-xs font-black transition-all ${leaderboardTab === "l2"
                    ? "bg-primary text-black"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  LEVEL 2
                </button>
              </div>

              <div className="bg-primary text-white px-2 md:px-3 py-1 border border-primary">
                <TechnicalLabel text="LIVE RANKINGS" className="text-white text-xs" />
              </div>
            </div>
          </div>

          {/* Mobile Optimized Leaderboard List */}
          <div className="mobile-leaderboard-list space-y-2 md:space-y-4">
            {sortedLeaderboard.map((leader, index) => (

              <div key={leader.id} className="mobile-leaderboard-card bg-white border-2 border-black hover:bg-primary/5 transition-all duration-200 overflow-hidden">
                {/* Mobile Card Layout */}
                <div className="block md:hidden">
                  {/* Top Row - Rank, Icon, Name */}
                  <div className="flex items-center gap-3 p-3 border-b border-muted-foreground/20">
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-8 h-8 bg-black text-white font-black text-lg flex items-center justify-center border border-black">
                        {leader.rank}
                      </div>
                      {getRankIcon(leader.rank)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-lg font-black text-foreground truncate">
                        {leader.name}
                      </div>
                      <div className="flex gap-2">
                        <TechnicalLabel text={`${leader.referrals} TOTAL`} className="text-muted-foreground text-[10px]" />
                        <TechnicalLabel
                          text={`L1: ${leader.l1}`}
                          className={`text-[10px] font-bold ${leaderboardTab === 'l1' ? 'text-primary' : 'text-muted-foreground'}`}
                        />
                        <TechnicalLabel
                          text={`L2: ${leader.l2}`}
                          className={`text-[10px] font-bold ${leaderboardTab === 'l2' ? 'text-primary' : 'text-muted-foreground'}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Middle Row - Earnings and Status */}
                  <div className="flex items-center justify-between p-3 border-b border-muted-foreground/20">
                    <div className="text-center">
                      <div className="text-xl font-black text-primary mb-1">
                        {formatCurrency(leader.earnings)}
                      </div>
                      <TechnicalLabel text="TOTAL EARNED" className="text-muted-foreground text-xs" />
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-2 justify-center mb-1">
                        <div className={`w-3 h-3 rounded-full ${leader.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <TechnicalLabel text={leader.status} className={`text-xs font-black ${leader.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-600'}`} />
                      </div>
                      <TechnicalLabel text="STATUS" className="text-muted-foreground text-xs" />
                    </div>
                  </div>

                  {/* Bottom Row - Additional Info */}
                  <div className="flex items-center justify-between p-3 text-xs">
                    <TechnicalLabel text={`JOINED ${new Date(leader.joinDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`} className="text-muted-foreground" />
                    <TechnicalLabel text={`RANK #${leader.rank} OF 500+`} className="text-muted-foreground font-black" />
                  </div>
                </div>

                {/* Desktop Layout (Unchanged) */}
                <div className="hidden md:block p-4">
                  <div className="flex items-center justify-between">
                    {/* Left Side - Rank and Name */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-8 h-8 bg-black text-white font-black text-lg flex items-center justify-center border border-black">
                          {leader.rank}
                        </div>
                        {getRankIcon(leader.rank)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-lg font-black text-foreground mb-1">
                          {leader.name}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <TechnicalLabel text={`${leader.referrals} TOTAL REFERRALS`} className="text-muted-foreground text-xs" />
                          <div className="flex gap-2 items-center bg-muted/30 px-2 py-0.5 rounded-sm">
                            <TechnicalLabel
                              text={`L1: ${leader.l1}`}
                              className={`text-[10px] font-black ${leaderboardTab === 'l1' ? 'text-primary' : 'text-muted-foreground'}`}
                            />
                            <div className="w-1 h-1 bg-muted-foreground/30 rounded-full"></div>
                            <TechnicalLabel
                              text={`L2: ${leader.l2}`}
                              className={`text-[10px] font-black ${leaderboardTab === 'l2' ? 'text-primary' : 'text-muted-foreground'}`}
                            />
                          </div>
                          <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                          <TechnicalLabel text={`JOINED ${new Date(leader.joinDate).toLocaleDateString()}`} className="text-muted-foreground text-xs" />
                        </div>
                      </div>
                    </div>

                    {/* Right Side - Rank Info */}
                    <div className="text-right">
                      <div className="text-lg font-black text-primary mb-1">
                        {formatCurrency(leader.earnings)}
                      </div>
                      <TechnicalLabel text="TOTAL EARNED" className="text-muted-foreground text-xs" />
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TechnicalLabel text={`STATUS: ${leader.status}`} className="text-muted-foreground text-xs" />
                    </div>
                    <TechnicalLabel text={`RANK #${leader.rank} OF 500+ USERS`} className="text-muted-foreground text-xs" />
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
        {/* Your Referrals Section */}
        {referralsData?.referrals && referralsData.referrals.length > 0 && (
          <div className="mt-6 md:mt-8 wireframe-section p-4 md:p-6">
            <div className="border-b-2 border-black pb-3 md:pb-4 mb-4 md:mb-6">
              <TechnicalLabel text="YOUR NETWORK" className="text-foreground text-sm md:text-lg font-black" />
            </div>

            <div className="grid gap-3 md:gap-4">
              {referralsData.referrals.map((referral: any, index: number) => (
                <div key={referral.id} className="referral-network-card wireframe-section p-3 md:p-4 hover:bg-white transition-colors" data-testid={`referral-${referral.id}`}>
                  <div className="flex items-center justify-between flex-col md:flex-row gap-3 md:gap-0">
                    <div className="flex items-center space-x-3 md:space-x-4 w-full md:w-auto">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary to-primary/60 text-white font-black text-sm md:text-lg flex items-center justify-center border-2 border-black flex-shrink-0">
                        {referral.referred.firstName[0]}{referral.referred.lastName[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm md:text-lg font-black text-foreground">
                          {referral.referred.firstName} {referral.referred.lastName}
                        </h3>
                        <TechnicalLabel text={referral.referred.email} className="text-muted-foreground text-xs break-all" />
                        <TechnicalLabel text={`Joined: ${formatDate(referral.referred.createdAt)}`} className="text-muted-foreground text-xs" />
                      </div>
                    </div>
                    <div className="text-center md:text-right w-full md:w-auto">
                      <div className="text-lg md:text-xl font-black text-primary">
                        +{formatCurrency(referral.totalEarned)}
                      </div>
                      <TechnicalLabel text={`TIER ${index + 1}`} className="text-muted-foreground text-xs" />
                      <div className={`status-indicator-mobile inline-block px-2 py-1 text-xs font-semibold border mt-1 ${referral.status === 'active'
                        ? 'bg-green-100 text-green-800 border-green-600'
                        : 'bg-gray-100 text-gray-800 border-gray-600'
                        }`}>
                        {referral.status.toUpperCase()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Progressive Payout Section - Dashboard Style
  function renderPayoutSection() {
    // Static transaction history data
    const staticHistoryItems = [
      {
        id: 'history_1',
        date: '2024-01-15T10:30:00.000Z',
        amount: '1250.00',
        method: 'JazzCash',
        status: 'COMPLETED',
        transactionId: 'TX1000001'
      },
      {
        id: 'history_2',
        date: '2024-01-14T14:15:00.000Z',
        amount: '890.50',
        method: 'EasyPaisa',
        status: 'PROCESSING',
        transactionId: 'TX1000002'
      },
      {
        id: 'history_3',
        date: '2024-01-13T09:45:00.000Z',
        amount: '2100.75',
        method: 'Bank Transfer',
        status: 'COMPLETED',
        transactionId: 'TX1000003'
      },
      {
        id: 'history_4',
        date: '2024-01-12T16:20:00.000Z',
        amount: '450.25',
        method: 'JazzCash',
        status: 'PENDING',
        transactionId: 'TX1000004'
      },
      {
        id: 'history_5',
        date: '2024-01-11T11:30:00.000Z',
        amount: '1850.00',
        method: 'EasyPaisa',
        status: 'COMPLETED',
        transactionId: 'TX1000005'
      }
    ];

    // Numeric keypad input handling
    const handleNumberInput = (num: string) => {
      if (withdrawAmount.length < 8) {
        setWithdrawAmount(prev => prev + num);
      }
    };

    const handleClear = () => {
      setWithdrawAmount("");
    };

    const handleBackspace = () => {
      setWithdrawAmount(prev => prev.slice(0, -1));
    };

    // Navigation handlers
    const handleNext = () => {
      if (currentStep === 1 && withdrawAmount && parseFloat(withdrawAmount) >= 100) {
        setCurrentStep(2);
      } else if (currentStep === 2 && selectedMethod) {
        setCurrentStep(3);
      } else if (currentStep === 3) {
        handleSubmit();
      }
    };

    const handleBack = () => {
      if (currentStep > 1) {
        setCurrentStep(currentStep - 1);
      }
    };

    const handleSubmit = async () => {
      setIsProcessing(true);
      // Simulate API call
      setTimeout(() => {
        setIsProcessing(false);
        toast({
          title: "Payout Request Submitted!",
          description: `Your withdrawal of ${formatCurrency(withdrawAmount)} has been submitted for processing.`,
        });
        // Reset form
        setCurrentStep(1);
        setWithdrawAmount("");
        setSelectedMethod("");
        setPaymentDetails({ name: "", number: "", id: "", iban: "" });
      }, 2000);
    };

    // Payment method data
    const paymentMethods = [
      {
        id: 'jazzcash',
        name: 'JAZZ CASH',
        LogoComponent: JazzCashLogo,
        description: 'Mobile Wallet Transfer',
        color: 'bg-gradient-to-r from-red-600 to-red-700',
        processing: '2-4 hours'
      },
      {
        id: 'easypaisa',
        name: 'EASY PAISA',
        LogoComponent: EasyPaisaLogo,
        description: 'Digital Wallet Service',
        color: 'bg-gradient-to-r from-green-600 to-green-700',
        processing: '2-4 hours'
      },
      {
        id: 'bank',
        name: 'BANK TRANSFER',
        LogoComponent: BankTransferLogo,
        description: 'Direct Bank Account',
        color: 'bg-gradient-to-r from-blue-600 to-blue-700',
        processing: '24-48 hours'
      }
    ];

    // Get current step button states
    const canProceed = () => {
      if (currentStep === 1) return withdrawAmount && parseFloat(withdrawAmount) >= 100;
      if (currentStep === 2) return selectedMethod;
      if (currentStep === 3) {
        if (selectedMethod === 'bank') return paymentDetails.iban.trim();
        return paymentDetails.name.trim() && paymentDetails.number.trim() && paymentDetails.id.trim();
      }
      return false;
    };

    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-0 relative z-10">
        {/* Hero Section - Dashboard Style */}
        <div className="wireframe-border p-4 md:p-8 mb-4 md:mb-8">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-xl md:text-4xl lg:text-5xl font-black text-foreground mb-3 md:mb-4 tracking-tighter leading-tight px-1 md:px-2">
              WITHDRAW <span className="text-primary">EARNINGS</span><br />
              SECURE PAYMENTS
            </h1>
            <div className="max-w-3xl mx-auto mb-2">
              <p className="text-xs md:text-lg text-muted-foreground leading-relaxed px-1 md:px-2">
                Fast, secure withdrawals with multiple payment options
              </p>
            </div>
            <Barcode className="w-24 md:w-32 lg:w-48 h-6 md:h-8 lg:h-10 mx-auto opacity-60" />
          </div>
        </div>

        {/* Main Content Area - Single Column Layout for Mobile, Two Column for Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          {/* Main Payout Interface - Full Width on Mobile, 2/3 width on Desktop */}
          <div className="lg:col-span-2">
            <div className="wireframe-border bg-gradient-to-br from-background to-muted/20 p-3 md:p-6 lg:p-8 relative">
              {/* Current Balance Display */}
              <div className="text-center mb-4 md:mb-6 lg:mb-8">
                <div className="mb-3 md:mb-4">
                  <TechnicalLabel text="AVAILABLE BALANCE" className="text-muted-foreground text-xs md:text-sm mb-2" />
                  <div className="text-xl md:text-3xl lg:text-4xl font-black text-primary">
                    {formatCurrency(displayUser?.availableBalance || '0.00')}
                  </div>
                </div>

                {/* Step Indicator - Mobile Optimized */}
                <div className="flex items-center justify-center gap-2 md:gap-4 mb-4 md:mb-6">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center">
                      <div className={`step-indicator w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-black flex items-center justify-center font-black text-xs md:text-sm ${currentStep >= step ? 'bg-primary text-black active' : 'bg-background text-foreground'
                        }`}>
                        {step}
                      </div>
                      {step < 3 && (
                        <div className={`w-6 md:w-12 h-0.5 mx-1 md:mx-2 transition-all duration-300 ${currentStep > step ? 'bg-primary' : 'bg-muted-foreground/30'
                          }`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step Content Container - Mobile Optimized */}
              <div className="min-h-[300px] md:min-h-[400px] flex flex-col justify-center overflow-hidden">
                {/* Step 1: Amount Input with Numeric Keypad - Mobile Optimized */}
                {currentStep === 1 && (
                  <div className="w-full max-w-sm md:max-w-lg mx-auto px-2 md:px-0">
                    <div className="text-center mb-4 md:mb-8">
                      <TechnicalLabel text="WITHDRAWAL AMOUNT" className="text-foreground mb-3 md:mb-4 text-xs md:text-sm" />
                      <div className="text-2xl md:text-4xl lg:text-5xl font-black text-foreground mb-3 md:mb-4 min-h-[40px] md:min-h-[60px] flex items-center justify-center border-b-2 border-muted-foreground/30 pb-2 md:pb-4">
                        ₨ {withdrawAmount || "0.00"}
                      </div>
                    </div>

                    {/* Enhanced Numeric Keypad - Mobile Responsive */}
                    <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4 md:mb-6 max-w-xs md:max-w-sm mx-auto">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                          key={num}
                          onClick={() => handleNumberInput(num.toString())}
                          className="industrial-keypad-button h-12 md:h-14 lg:h-16 bg-background border-2 border-black text-lg md:text-xl lg:text-2xl font-black text-foreground hover:bg-muted transition-all duration-200 hover:transform hover:scale-105"
                        >
                          {num}
                        </button>
                      ))}
                      <button
                        onClick={() => handleNumberInput("0")}
                        className="industrial-keypad-button h-12 md:h-14 lg:h-16 bg-background border-2 border-black text-lg md:text-xl lg:text-2xl font-black text-foreground hover:bg-muted transition-all duration-200 hover:transform hover:scale-105 col-span-2"
                      >
                        0
                      </button>
                      <button
                        onClick={handleBackspace}
                        className="industrial-keypad-button h-12 md:h-14 lg:h-16 bg-destructive/10 border-2 border-destructive text-destructive hover:bg-destructive/20 transition-all duration-200 hover:transform hover:scale-105 flex items-center justify-center"
                      >
                        ⌫
                      </button>
                    </div>

                    {/* Clear Button - Mobile Optimized */}
                    <div className="text-center mb-4 md:mb-6">
                      <button
                        onClick={handleClear}
                        className="border-2 border-black bg-background hover:bg-black hover:text-white px-4 md:px-6 py-2 text-xs md:text-sm font-black transition-colors"
                      >
                        CLEAR ALL
                      </button>
                    </div>

                    {/* Minimum Amount Notice */}
                    <div className="text-center text-xs md:text-sm text-muted-foreground">
                      <TechnicalLabel text="MINIMUM WITHDRAWAL: ₨ 100" className="text-muted-foreground" />
                    </div>
                  </div>
                )}

                {/* Step 2: Payment Method Selection - Mobile Optimized */}
                {currentStep === 2 && (
                  <div className="w-full max-w-lg md:max-w-2xl mx-auto px-2 md:px-0">
                    <div className="text-center mb-4 md:mb-8">
                      <TechnicalLabel text="SELECT PAYMENT METHOD" className="text-foreground mb-3 md:mb-4 text-xs md:text-sm" />
                      <div className="text-lg md:text-xl lg:text-2xl font-black text-primary mb-2">
                        Withdrawing {formatCurrency(withdrawAmount)}
                      </div>
                    </div>

                    <div className="grid gap-3 md:gap-4 mb-4 md:mb-6">
                      {paymentMethods.map((method) => {
                        const LogoComponent = method.LogoComponent;
                        const isSelected = selectedMethod === method.id;

                        return (
                          <button
                            key={method.id}
                            onClick={() => setSelectedMethod(method.id)}
                            className={`payment-method-selection-card flex items-center p-3 md:p-4 lg:p-6 border-2 w-full ${isSelected
                              ? 'border-primary bg-primary/10 selected'
                              : 'border-black bg-background'
                              }`}
                          >
                            <div className="mr-3 md:mr-4 lg:mr-6">
                              <LogoComponent className="w-14 h-14 md:w-16 md:h-16 lg:w-20 lg:h-20" />
                            </div>
                            <div className="flex-1 text-left">
                              <TechnicalLabel
                                text={method.name}
                                className={`font-black text-xs md:text-sm mb-1 ${isSelected ? 'text-primary' : 'text-foreground'
                                  }`}
                              />
                              <div className="text-xs text-muted-foreground">{method.description}</div>
                              <div className="text-xs text-muted-foreground">Processing: {method.processing}</div>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Step 3: Payment Details Input - Mobile Optimized */}
                {currentStep === 3 && (
                  <div className="w-full max-w-sm md:max-w-lg mx-auto px-2 md:px-0">
                    <div className="text-center mb-4 md:mb-8">
                      <TechnicalLabel text="ENTER PAYMENT DETAILS" className="text-foreground mb-3 md:mb-4 text-xs md:text-sm" />
                      <div className="text-base md:text-lg lg:text-xl font-black text-primary mb-2">
                        {paymentMethods.find(m => m.id === selectedMethod)?.name}
                      </div>
                      <div className="text-sm md:text-base lg:text-lg text-foreground">
                        {formatCurrency(withdrawAmount)}
                      </div>
                    </div>

                    <div className="space-y-4 md:space-y-6">
                      {selectedMethod === 'bank' ? (
                        <div>
                          <TechnicalLabel text="BANK IBAN" className="text-foreground mb-2 md:mb-3 text-xs md:text-sm font-black" />
                          <Input
                            type="text"
                            value={paymentDetails.iban}
                            onChange={(e) => setPaymentDetails(prev => ({ ...prev, iban: e.target.value }))}
                            placeholder="PK36 SCBL 0000 0011 2345 6702"
                            className="industrial-input h-12 md:h-14 text-sm md:text-base border-2 border-black"
                          />
                        </div>
                      ) : (
                        <>
                          <div>
                            <TechnicalLabel text="FULL NAME" className="text-foreground mb-2 md:mb-3 text-xs md:text-sm font-black" />
                            <Input
                              type="text"
                              value={paymentDetails.name}
                              onChange={(e) => setPaymentDetails(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Enter Full Name"
                              className="industrial-input h-12 md:h-14 text-sm md:text-base border-2 border-black"
                            />
                          </div>

                          <div>
                            <TechnicalLabel text="MOBILE NUMBER" className="text-foreground mb-2 md:mb-3 text-xs md:text-sm font-black" />
                            <Input
                              type="text"
                              value={paymentDetails.number}
                              onChange={(e) => setPaymentDetails(prev => ({ ...prev, number: e.target.value }))}
                              placeholder="03XXXXXXXXX"
                              className="industrial-input h-12 md:h-14 text-sm md:text-base border-2 border-black"
                            />
                          </div>

                          <div>
                            <TechnicalLabel text="CNIC / ID NUMBER" className="text-foreground mb-2 md:mb-3 text-xs md:text-sm font-black" />
                            <Input
                              type="text"
                              value={paymentDetails.id}
                              onChange={(e) => setPaymentDetails(prev => ({ ...prev, id: e.target.value }))}
                              placeholder="XXXXX-XXXXXXX-X"
                              className="industrial-input h-12 md:h-14 text-sm md:text-base border-2 border-black"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Buttons - Mobile Optimized */}
              <div className="border-t-2 border-black pt-4 md:pt-6 mt-4 md:mt-8">
                <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 md:gap-0">
                  <div className="flex gap-2 md:gap-3 justify-center md:justify-start">
                    {currentStep > 1 && (
                      <Button
                        onClick={handleBack}
                        variant="outline"
                        className="border-2 border-black text-foreground hover:bg-black hover:text-white px-4 md:px-6 py-2 md:py-3 font-black text-sm md:text-base"
                      >
                        <ChevronLeft className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                        BACK
                      </Button>
                    )}
                  </div>

                  <Button
                    onClick={handleNext}
                    disabled={!canProceed() || isProcessing}
                    className="bg-primary hover:bg-primary/80 text-black px-6 md:px-8 py-2 md:py-3 font-black border-2 border-black text-sm md:text-base"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 animate-spin" />
                        <span className="text-xs md:text-base">PROCESSING...</span>
                      </>
                    ) : currentStep === 3 ? (
                      <>
                        <Zap className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                        <span className="text-xs md:text-base">SUBMIT REQUEST</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs md:text-base">CONTINUE</span>
                        <ChevronRight className="w-3 h-3 md:w-4 md:h-4 ml-1 md:ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Side Panel - Hidden on Mobile, Visible on Desktop */}
          <div className="hidden lg:block lg:col-span-1 space-y-6">
            {/* Quick Stats */}
            <div className="wireframe-border p-4 md:p-6">
              <TechnicalLabel text="PAYOUT STATISTICS" className="text-foreground font-black text-sm mb-4" />
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-lg md:text-xl font-black text-primary">
                    {formatCurrency(displayUser?.totalEarnings || '0.00')}
                  </div>
                  <TechnicalLabel text="TOTAL EARNED" className="text-muted-foreground text-xs" />
                </div>
                <div className="text-center">
                  <div className="text-lg md:text-xl font-black text-foreground">
                    {formatCurrency(displayUser?.availableBalance || '0.00')}
                  </div>
                  <TechnicalLabel text="AVAILABLE NOW" className="text-muted-foreground text-xs" />
                </div>
                <div className="text-center">
                  <div className="text-lg md:text-xl font-black text-muted-foreground">
                    ₨ 15.00
                  </div>
                  <TechnicalLabel text="PROCESSING FEE" className="text-muted-foreground text-xs" />
                </div>
              </div>
            </div>

            {/* Professional History Button */}
            <div className="wireframe-border p-4 md:p-6">
              <TechnicalLabel text="TRANSACTION HISTORY" className="text-foreground font-black text-sm mb-4" />
              <Button
                onClick={() => setShowHistory(!showHistory)}
                variant="outline"
                className="w-full border-2 border-black text-foreground hover:bg-black hover:text-white py-3 font-black"
              >
                <History className="w-4 h-4 mr-2" />
                {showHistory ? 'HIDE HISTORY' : 'VIEW HISTORY'}
              </Button>

              {showHistory && (
                <div className="mt-4 max-h-60 overflow-y-auto border-t-2 border-black pt-4">
                  <div className="space-y-3">
                    {staticHistoryItems.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="p-3 border border-muted-foreground/20 bg-muted/10 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <TechnicalLabel text={item.method} className="text-foreground font-black text-xs" />
                          <div className={`w-2 h-2 rounded-full ${item.status === 'COMPLETED' ? 'bg-green-500' :
                            item.status === 'PROCESSING' ? 'bg-yellow-500' : 'bg-orange-500'
                            }`} />
                        </div>
                        <div className="text-sm font-black text-primary mb-1">{formatCurrency(item.amount)}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(item.date)}</div>
                      </div>
                    ))}
                  </div>
                  {staticHistoryItems.length > 3 && (
                    <div className="text-center mt-3">
                      <TechnicalLabel text={`+${staticHistoryItems.length - 3} MORE TRANSACTIONS`} className="text-muted-foreground text-xs" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Help & Support */}
            <div className="wireframe-border p-4 md:p-6">
              <TechnicalLabel text="NEED HELP?" className="text-foreground font-black text-sm mb-4" />
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground leading-relaxed">
                  • Minimum withdrawal: ₨ 100<br />
                  • Processing time: 2-48 hours<br />
                  • Processing fee: ₨ 15.00<br />
                  • 24/7 customer support
                </div>
                <Button
                  variant="outline"
                  className="w-full border-2 border-black text-foreground hover:bg-black hover:text-white py-2 font-black text-xs"
                  onClick={() => navigateToSection(4)} // Navigate to help section
                >
                  <HelpCircle className="w-3 h-3 mr-2" />
                  GET SUPPORT
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Transaction History - Show Below Main Interface */}
        <div className="lg:hidden mt-6">
          <div className="wireframe-border p-3 md:p-4">
            <TechnicalLabel text="TRANSACTION HISTORY" className="text-foreground font-black text-sm mb-4" />
            <Button
              onClick={() => setShowHistory(!showHistory)}
              variant="outline"
              className="w-full border-2 border-black text-foreground hover:bg-black hover:text-white py-2 md:py-3 font-black text-sm"
            >
              <History className="w-3 h-3 md:w-4 md:h-4 mr-2" />
              {showHistory ? 'HIDE HISTORY' : 'VIEW HISTORY'}
            </Button>

            {showHistory && (
              <div className="mt-4 max-h-64 overflow-y-auto border-t-2 border-black pt-4">
                <div className="space-y-3">
                  {staticHistoryItems.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border border-muted-foreground/20 bg-muted/10 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <TechnicalLabel text={item.method} className="text-foreground font-black text-xs" />
                        <div className={`w-2 h-2 rounded-full ${item.status === 'COMPLETED' ? 'bg-green-500' :
                          item.status === 'PROCESSING' ? 'bg-yellow-500' : 'bg-orange-500'
                          }`} />
                      </div>
                      <div className="text-sm font-black text-primary mb-1">{formatCurrency(item.amount)}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(item.date)}</div>
                      <div className="text-xs text-muted-foreground">#{item.transactionId}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Help Section
  function renderHelpSection() {
    const formatTime = (timestamp: string) => {
      return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    // Help section options for dropdown
    const helpSectionOptions = [
      { id: "guide", label: "AREA GUIDE", icon: Book },
      { id: "help", label: "AREA HELP", icon: MessageCircle },
      { id: "contact", label: "AREA CONTACT", icon: Phone }
    ];

    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-0 relative z-10">
        {/* Hero Section - Dashboard Style */}
        <div className="wireframe-border p-4 md:p-8 mb-4 md:mb-8">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-xl md:text-4xl lg:text-5xl font-black text-foreground mb-3 md:mb-4 tracking-tighter leading-tight px-1 md:px-2">
              GET <span className="text-primary">SUPPORT</span><br />
              INSTANT ASSISTANCE
            </h1>
            <div className="max-w-3xl mx-auto mb-2">
              <p className="text-xs md:text-lg text-muted-foreground leading-relaxed px-1 md:px-2">
                Professional support, instant solutions, comprehensive guidance
              </p>
            </div>
            <Barcode className="w-24 md:w-32 lg:w-48 h-6 md:h-8 lg:h-10 mx-auto opacity-60" />
          </div>
        </div>

        {/* Navigation and Content */}
        <div className="max-w-7xl mx-auto mb-6 md:mb-8">
          <div className="split-card bg-white border-3 border-black p-3 md:p-6 lg:p-8 help-section-content">
            {/* Desktop: Tabs, Mobile: Dropdown */}
            <div className="w-full">
              {/* Desktop Navigation */}
              <div className="hidden md:block">
                <Tabs value={activeHelpTab} onValueChange={setActiveHelpTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-4 md:mb-6 bg-muted border-2 border-black h-10 md:h-12">
                    <TabsTrigger
                      value="guide"
                      className="help-tab-button data-[state=active]:bg-black data-[state=active]:text-white font-black text-xs md:text-base h-full flex items-center justify-center px-1 md:px-2"
                    >
                      AREA GUIDE
                    </TabsTrigger>
                    <TabsTrigger
                      value="help"
                      className="help-tab-button data-[state=active]:bg-black data-[state=active]:text-white font-black text-xs md:text-base h-full flex items-center justify-center px-1 md:px-2"
                    >
                      AREA HELP
                    </TabsTrigger>
                    <TabsTrigger
                      value="contact"
                      className="help-tab-button data-[state=active]:bg-black data-[state=active]:text-white font-black text-xs md:text-base h-full flex items-center justify-center px-1 md:px-2"
                    >
                      AREA CONTACT
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Mobile Navigation Dropdown - Industrial Theme */}
              <div className="md:hidden mb-4 help-dropdown-container">
                <div className="help-dropdown-wrapper">
                  <select
                    value={activeHelpTab}
                    onChange={(e) => setActiveHelpTab(e.target.value)}
                    className="help-dropdown-industrial"
                  >
                    {helpSectionOptions.map((option) => (
                      <option key={option.id} value={option.id} className="font-black bg-white text-black">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tab Content */}
              <div className="mt-4 md:mt-6 help-main-content">
                {/* Area Guide - FAQ Section Style */}
                {activeHelpTab === "guide" && (
                  <div className="mt-0">
                    {/* Section Heading - Minimal and Clean */}
                    <div className="text-center mb-8 md:mb-12">
                      <div className="inline-block px-4 md:px-6 lg:px-8 py-6 md:py-8 mx-4">
                        <h3 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-tight mb-3 text-foreground">
                          Frequently Asked
                          <br />
                          <span className="text-primary">Questions</span>
                        </h3>

                        <div className="h-1 w-16 bg-primary mx-auto mb-4"></div>

                        <TechnicalLabel text="INSTANT ANSWERS TO YOUR THORX QUERIES" className="text-muted-foreground text-xs md:text-sm" />
                      </div>
                    </div>

                    {/* FAQ Items - Landing Page Style */}
                    <div className="space-y-4 md:space-y-6">
                      {[
                        {
                          id: "001",
                          protocol: "EARNING-MODEL",
                          question: "How do I start earning on Thorx?",
                          answer: "Go to the Work section where you'll find 4 video players connected to different ad networks. Watch video advertisements to earn PKR. You can also invite friends through the Referral section to earn commission."
                        },
                        {
                          id: "002",
                          protocol: "DAILY-TASKS",
                          question: "What are daily tasks and why are they important?",
                          answer: "Daily tasks are mandatory activities you must complete to qualify for payouts. These may include watching a required number of video ads, subscribing to Thorx YouTube channel, or watching specific videos."
                        },
                        {
                          id: "003",
                          protocol: "PAYOUT-PROC",
                          question: "How do I withdraw my earnings?",
                          answer: "Go to the Payout section and select JazzCash, EasyPaisa, or Bank Transfer. Important: You must complete your daily tasks first to be eligible for payout requests."
                        },
                        {
                          id: "004",
                          protocol: "REFERRAL-SYSTEM",
                          question: "How does the referral system work?",
                          answer: "You earn 15% commission from your direct referrals' earnings and 7.5% from their referrals' earnings. Commission is credited only when your referred users request a payout."
                        },
                        {
                          id: "005",
                          protocol: "USER-LEVELS",
                          question: "What are user levels?",
                          answer: "Thorx has 5 performance levels: Useless, Worker, Soldier, Captain, and General. Each level unlocks new daily tasks. Your level increases based on your platform activity and performance."
                        },
                        {
                          id: "006",
                          protocol: "SECURITY-VER",
                          question: "Is Thorx secure?",
                          answer: "Yes, Thorx uses multi-factor authentication with Email OTP for registration and login. Your data is protected with encryption and secure session management."
                        }
                      ].map((faq) => (
                        <div
                          key={faq.id}
                          className="split-card bg-background relative group transition-all duration-500"
                        >
                          {/* Protocol Header */}
                          <div className="px-4 md:px-8 py-3 md:py-4 bg-primary text-primary-foreground border-b-[3px] border-black">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 md:gap-4">
                                <TechnicalLabel text={`FAQ-${faq.id}`} className="text-white text-xs md:text-sm" />
                                <TechnicalLabel text={faq.protocol} className="text-white opacity-80 text-xs" />
                              </div>
                              <div className="w-12 md:w-16 h-3 md:h-4 opacity-60">
                                <Barcode />
                              </div>
                            </div>
                          </div>

                          {/* Protocol Content */}
                          <div className="bg-background p-4 md:p-6">
                            <div className="mb-3 md:mb-4">
                              <h4 className="text-base md:text-xl lg:text-2xl font-bold text-foreground leading-tight">
                                {faq.question}
                              </h4>
                            </div>
                            <div className="text-foreground text-sm md:text-base leading-relaxed bg-muted p-3 md:p-6 border-l-4 border-primary">
                              {faq.answer}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t-2 border-black text-center">
                      <TechnicalLabel text="NEED MORE HELP? USE AREA HELP FOR LIVE CHAT OR AREA CONTACT FOR DIRECT SUPPORT" className="text-muted-foreground text-xs md:text-sm" />
                    </div>
                  </div>
                )}

                {/* Area Help - Telegram/WhatsApp Style Chat */}
                {activeHelpTab === "help" && (
                  <div className="mt-0 chat-section-wrapper">
                    <div className="bg-white border-2 border-black overflow-hidden">
                      {/* Chat Messages - WhatsApp Style */}
                      <div className="chat-container bg-[#f0f2f5] min-h-[300px] md:min-h-[500px] p-3 md:p-4 space-y-2 md:space-y-3 overflow-y-auto">
                        {chatMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex items-end gap-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            {message.sender === 'support' && (
                              <div className="w-6 h-6 md:w-8 md:h-8 bg-primary text-black rounded-full flex items-center justify-center text-xs md:text-sm font-black mb-1 flex-shrink-0">
                                {message.avatar}
                              </div>
                            )}

                            <div
                              className={`chat-message max-w-[80%] md:max-w-[70%] px-3 md:px-4 py-2 md:py-3 rounded-lg shadow-sm ${message.sender === 'user'
                                ? 'bg-primary text-black ml-auto'
                                : 'bg-white text-black border border-gray-200'
                                }`}
                            >
                              <p className="text-xs md:text-sm font-medium mb-1 break-words">{message.text}</p>
                              <p className={`text-xs ${message.sender === 'user' ? 'text-black/60' : 'text-gray-500'} text-right`}>
                                {formatTime(message.timestamp)}
                              </p>
                            </div>

                            {message.sender === 'user' && (
                              <div className="w-6 h-6 md:w-8 md:h-8 bg-black text-white rounded-full flex items-center justify-center text-xs md:text-sm font-black mb-1 flex-shrink-0">
                                {message.avatar}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Chat Input - Modern Style with Enhanced Mobile Support */}
                      <div className="chat-input-wrapper bg-white border-t-2 border-black p-3 md:p-4">
                        <div className="chat-input-container flex items-center gap-2 md:gap-3">
                          <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type your message..."
                            className="chat-input flex-1 bg-gray-100 border-2 border-gray-300 text-black px-3 md:px-4 py-2 md:py-3 rounded-lg focus:outline-none focus:border-primary placeholder-gray-500 font-medium text-sm md:text-base min-h-[44px]"
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          />
                          <Button
                            onClick={handleSendMessage}
                            className="chat-send-button bg-primary hover:bg-primary/90 text-black px-3 md:px-6 py-2 md:py-3 font-black border-2 border-black rounded-lg min-w-[60px] min-h-[44px] flex-shrink-0"
                            disabled={!newMessage.trim() || chatMutation.isPending}
                          >
                            <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
                          </Button>
                        </div>
                        <div className="chat-input-help-text mt-2 text-center">
                          <TechnicalLabel text="Press Enter to send • Our support team is standing by 24/7" className="text-gray-500 text-xs" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Area Contact - Registration Form Style */}
                {activeHelpTab === "contact" && (
                  <div className="mt-0">
                    <div className="text-center mb-6">
                      <TechnicalLabel text="DIRECT TEAM CONTACT" className="mb-2" />
                      <h3 className="text-2xl md:text-3xl font-black text-black">SEND US A MESSAGE</h3>
                    </div>

                    <div className="contact-form-container max-w-2xl mx-auto">
                      <form onSubmit={handleContactSubmit} className="space-y-6">
                        <div>
                          <TechnicalLabel text="FULL NAME" className="mb-3 font-black" />
                          <div className="relative">
                            <Input
                              type="text"
                              required
                              value={contactForm.name}
                              onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                              className="contact-form-input border-2 border-black text-base md:text-lg py-3 md:py-3 min-h-[44px] rounded"
                            />
                            {!contactForm.name && (
                              <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                                <AnimatedPlaceholder examples={['John Doe', 'Ahmed Khan', 'Sarah Wilson']} />
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <TechnicalLabel text="EMAIL ADDRESS" className="mb-3 font-black" />
                          <div className="relative">
                            <Input
                              type="email"
                              required
                              value={contactForm.email}
                              onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                              className="contact-form-input border-2 border-black text-base md:text-lg py-3 md:py-3 min-h-[44px] rounded"
                            />
                            {!contactForm.email && (
                              <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                                <AnimatedPlaceholder examples={['your.email@gmail.com', 'contact@thorx.com', 'support@example.com']} />
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <TechnicalLabel text="PROBLEM / DESCRIPTION" className="mb-3 font-black" />
                          <div className="relative">
                            <textarea
                              required
                              rows={isMobile ? 5 : 6}
                              value={contactForm.description}
                              onChange={(e) => setContactForm(prev => ({ ...prev, description: e.target.value }))}
                              className="contact-form-textarea flex w-full border-2 border-black bg-background px-3 py-3 text-base md:text-lg ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-vertical rounded min-h-[140px] line-height-relaxed"
                              placeholder=""
                            />
                            {!contactForm.description && (
                              <div className="absolute top-3 left-3 pointer-events-none text-muted-foreground">
                                <AnimatedPlaceholder examples={['Describe your issue in detail...', 'Tell us what happened...', 'How can we help you today?']} />
                              </div>
                            )}
                          </div>
                        </div>

                        <Button
                          type="submit"
                          disabled={isContactSubmitting}
                          className="contact-form-submit w-full bg-black text-white text-base md:text-xl font-black py-4 hover:bg-primary hover:text-black transition-colors border-2 border-black disabled:opacity-50 min-h-[50px] flex items-center justify-center rounded"
                        >
                          {isContactSubmitting ? (
                            <span className="flex items-center justify-center">
                              <RefreshCw className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3 animate-spin" />
                              <span className="text-sm md:text-base">SENDING MESSAGE...</span>
                            </span>
                          ) : (
                            <span className="text-sm md:text-base">SEND MESSAGE TO TEAM →</span>
                          )}
                        </Button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}