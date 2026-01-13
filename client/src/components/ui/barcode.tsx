import { cn } from "@/lib/utils";

interface BarcodeProps {
  className?: string;
}

export default function Barcode({ className }: BarcodeProps) {
  return (
    <div className={cn("barcode", className)} data-testid="barcode" />
  );
}
