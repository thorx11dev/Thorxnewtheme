import { cn } from "@/lib/utils";

interface BarcodeProps {
  className?: string;
  variant?: "default" | "bold";
  color?: string;
}

export default function Barcode({ className, variant = "default", color = "currentColor" }: BarcodeProps) {
  if (variant === "bold") {
    return (
      <svg
        viewBox="0 0 100 20"
        preserveAspectRatio="none"
        className={cn("w-full h-full", className)}
        data-testid="barcode-bold"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill={color}>
          <rect x="0" y="0" width="3" height="20" />
          <rect x="5" y="0" width="1" height="20" />
          <rect x="8" y="0" width="2" height="20" />
          <rect x="12" y="0" width="4" height="20" />
          <rect x="18" y="0" width="1" height="20" />
          <rect x="21" y="0" width="3" height="20" />
          <rect x="26" y="0" width="1" height="20" />
          <rect x="29" y="0" width="2" height="20" />
          <rect x="33" y="0" width="5" height="20" />
          <rect x="40" y="0" width="1" height="20" />
          <rect x="43" y="0" width="3" height="20" />
          <rect x="48" y="0" width="2" height="20" />
          <rect x="52" y="0" width="4" height="20" />
          <rect x="58" y="0" width="1" height="20" />
          <rect x="61" y="0" width="3" height="20" />
          <rect x="66" y="0" width="2" height="20" />
          <rect x="70" y="0" width="6" height="20" />
          <rect x="78" y="0" width="1" height="20" />
          <rect x="81" y="0" width="4" height="20" />
          <rect x="87" y="0" width="2" height="20" />
          <rect x="91" y="0" width="5" height="20" />
          <rect x="98" y="0" width="2" height="20" />
        </g>
      </svg>
    );
  }

  return (
    <div className={cn("barcode", className)} data-testid="barcode" />
  );
}
