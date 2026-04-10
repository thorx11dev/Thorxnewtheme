import { useEffect, useRef, useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AdNetwork {
  id: string;
  name: string;
  zoneId: string;
  type: string;
  priority: number;
  isActive: boolean;
}

interface WaterfallAdPlayerProps {
  onComplete?: () => void;
  adFormat?: "video" | "banner";
}

export function WaterfallAdPlayer({ onComplete, adFormat = "video" }: WaterfallAdPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [networks, setNetworks] = useState<AdNetwork[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [adCode, setAdCode] = useState<string>("");
  const { toast } = useToast();

  // 1. Fetch Waterfall Configuration
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/config/AD_NETWORKS");
        const data = await res.json();
        const activeNetworks = (data.value || [])
          .filter((n: AdNetwork) => n.isActive)
          .sort((a: AdNetwork, b: AdNetwork) => a.priority - b.priority);
        
        setNetworks(activeNetworks);
        if (activeNetworks.length === 0) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to fetch ad waterfall config:", error);
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, []);

  // 2. Load Ad Code for current network
  const loadAdForNetwork = useCallback(async (network: AdNetwork) => {
    try {
      setIsLoading(true);
      console.log(`[Waterfall] Attempting to load ad from: ${network.name} (Zone: ${network.zoneId})`);
      
      // Generic anti-adblock fetcher
      const response = await fetch(`/api/hilltopads/anti-adblock/${network.zoneId}`);
      if (!response.ok) throw new Error("Network response error");
      
      const data = await response.json();
      setAdCode(data.code);
      setIsLoading(false);
    } catch (error) {
      console.warn(`[Waterfall] ${network.name} failed. Moving to next provider.`);
      handleFallback();
    }
  }, [currentIndex, networks]);

  const handleFallback = () => {
    if (currentIndex + 1 < networks.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      console.error("[Waterfall] All ad networks exhausted.");
      setIsLoading(false);
      toast({
        title: "Monetization Error",
        description: "Unable to load advertisements at this time. Please try again later.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (networks.length > 0 && currentIndex < networks.length) {
      loadAdForNetwork(networks[currentIndex]);
    }
  }, [networks, currentIndex, loadAdForNetwork]);

  // 3. Inject Ad Code and Setup Completion
  useEffect(() => {
    if (!adCode || !containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = adCode;

    const scripts = container.getElementsByTagName("script");
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      const newScript = document.createElement("script");
      
      if (script.src) {
        newScript.src = script.src;
        newScript.onerror = () => {
          console.error("[Waterfall] Script load failed for network", networks[currentIndex].name);
          handleFallback();
        };
      } else {
        newScript.textContent = script.textContent;
      }
      
      script.parentNode?.replaceChild(newScript, script);
    }

    const handleAdComplete = async () => {
      try {
        await apiRequest("POST", "/api/hilltopads/ad-completion", {
          zoneId: networks[currentIndex].zoneId,
          adType: adFormat,
          duration: 30
        });

        toast({
          title: "System Rewarded",
          description: "Economic cycle completed. Points synchronized.",
        });

        onComplete?.();
      } catch (error) {
        console.error("Failed to track ad completion:", error);
      }
    };

    const timer = setTimeout(() => {
      handleAdComplete();
    }, 3000);

    return () => clearTimeout(timer);
  }, [adCode, currentIndex, networks, adFormat, toast, onComplete]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-zinc-50 border-2 border-black/5 rounded-2xl animate-pulse">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40">Synchronizing Network...</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="waterfall-ads-container w-full min-h-[250px] flex items-center justify-center overflow-hidden rounded-xl bg-black/5"
      data-network={networks[currentIndex]?.name}
    />
  );
}
