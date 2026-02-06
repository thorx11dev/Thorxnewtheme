import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface HilltopAdsPlayerProps {
  zoneId: string;
  adFormat: "in-page-push" | "popunder";
  onComplete?: () => void;
}

export function HilltopAdsPlayer({ zoneId, adFormat, onComplete }: HilltopAdsPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adCode, setAdCode] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    const loadAdCode = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/hilltopads/anti-adblock/${zoneId}`);
        const data = await response.json();
        setAdCode(data.code);
      } catch (error) {
        console.error("Failed to load ad code:", error);
        toast({
          title: "Ad Load Error",
          description: "Failed to load advertisement",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAdCode();
  }, [zoneId, toast]);

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
      } else {
        newScript.textContent = script.textContent;
      }
      
      script.parentNode?.replaceChild(newScript, script);
    }

    const handleAdComplete = async () => {
      try {
        await apiRequest("POST", "/api/hilltopads/ad-completion", {
          zoneId,
          adType: adFormat,
          duration: 0
        });

        toast({
          title: "Reward Earned!",
          description: "You've earned points for viewing this ad",
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
  }, [adCode, zoneId, adFormat, toast, onComplete]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 bg-muted/50 rounded-lg" data-testid="ad-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="hilltop-ads-container w-full"
      data-testid={`hilltop-ad-${adFormat}`}
    />
  );
}
