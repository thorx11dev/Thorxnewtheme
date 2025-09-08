import { cn } from "@/lib/utils";

interface TechnicalLabelProps {
  text: string;
  className?: string;
}

export default function TechnicalLabel({ text, className }: TechnicalLabelProps) {
  return (
    <div className={cn("technical-label", className)}>
      {text}
    </div>
  );
}
