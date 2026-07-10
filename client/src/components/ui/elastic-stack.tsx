import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface ElasticStackItem {
  id: string | number;
  image?: string;
  name?: string;
}

export interface ElasticStackProps extends React.HTMLAttributes<HTMLDivElement> {
  items: ElasticStackItem[];
  selectedId?: string | number | null;
  onItemSelect?: (id: string | number) => void;
  itemSize?: number;
  overlap?: number;
  pushForce?: number;
}

export function ElasticStack({
  items,
  selectedId,
  onItemSelect,
  itemSize = 64,
  overlap = 28,
  pushForce = 14,
  className,
  ...props
}: ElasticStackProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = items.length;
  const springEasing = "linear(0, 0.79 14.4%, 1.026 22.4%, 1.164 31.2%, 1.207 38.2%, 1.208 46.2%, 1.033 80%, 1)";

  return (
    <div
      className={cn("flex items-center justify-center cursor-pointer py-6", className)}
      onMouseLeave={() => setHoveredIndex(null)}
      {...props}
    >
      {items.map((item, i) => {
        let translateX = 0;
        let scale = 1;
        let zIndex = i;
        const isHovered = hoveredIndex === i;
        const isSelected = selectedId === item.id;

        if (hoveredIndex !== null) {
          if (i > hoveredIndex) {
            translateX = Math.min(pushForce * (total - i - 1), overlap * 1.5);
          } else if (i < hoveredIndex) {
            translateX = -Math.min(pushForce * i, overlap * 1.5);
          } else {
            scale = 1.3;
            zIndex = 100;
          }
        }

        return (
          <div
            key={item.id}
            onMouseEnter={() => setHoveredIndex(i)}
            onClick={() => onItemSelect?.(item.id)}
            className={cn(
              "relative flex items-center justify-center rounded-full isolate transition-all duration-700 bg-[#1a1a1a]",
              isSelected
                ? "ring-[3px] ring-primary ring-offset-2 ring-offset-black shadow-[0_0_16px_rgba(255,107,51,0.45)]"
                : "ring-[2px] ring-black",
              isHovered && !isSelected ? "shadow-xl" : ""
            )}
            style={{
              width: itemSize,
              height: itemSize,
              marginLeft: i === 0 ? 0 : -overlap,
              transform: `translateX(${translateX}px) scale(${scale})`,
              transitionTimingFunction: springEasing,
              zIndex,
              willChange: "transform",
            }}
          >
            {item.image ? (
              <img
                src={item.image}
                alt={item.name || `Avatar ${i + 1}`}
                className="w-full h-full object-cover rounded-full pointer-events-none"
                style={{ imageRendering: "auto" }}
              />
            ) : (
              <div className="w-full h-full rounded-full flex items-center justify-center font-semibold text-white/60 bg-white/10">
                {item.name ? item.name.charAt(0) : i + 1}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ElasticStack;
