import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { ReactNode, useRef } from "react";

interface HorizontalScrollCardsProps {
  title?: string;
  showSeeAll?: boolean;
  onSeeAllClick?: () => void;
  children: ReactNode;
  className?: string;
  cardWidth?: string;
}

export function HorizontalScrollCards({
  title,
  showSeeAll = false,
  onSeeAllClick,
  children,
  className,
  cardWidth = "280px",
}: HorizontalScrollCardsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className={cn("w-full", className)}>
      {title && (
        <div className="flex items-center justify-between mb-4 px-4 md:px-0">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {showSeeAll && (
            <button
              onClick={onSeeAllClick}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors active:scale-95"
            >
              Ver todos
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
      
      <div className="relative">
        <div
          ref={scrollRef}
          className={cn(
            "flex gap-4 overflow-x-auto overflow-y-hidden pb-2",
            "snap-x snap-mandatory scroll-smooth",
            "px-4 md:px-0",
            "[&::-webkit-scrollbar]:h-2",
            "[&::-webkit-scrollbar-track]:bg-transparent",
            "[&::-webkit-scrollbar-thumb]:bg-primary/20",
            "[&::-webkit-scrollbar-thumb]:rounded-full",
            "[&::-webkit-scrollbar-thumb]:hover:bg-primary/30"
          )}
          style={{
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div
            className="flex gap-4"
            style={{
              minWidth: "min-content",
            }}
          >
            {children}
          </div>
        </div>
        
        <div className="absolute top-0 right-0 w-12 h-full bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden" />
      </div>
    </div>
  );
}

interface ScrollCardProps {
  children: ReactNode;
  className?: string;
  width?: string;
}

export function ScrollCard({ children, className, width = "280px" }: ScrollCardProps) {
  return (
    <div
      className={cn(
        "flex-shrink-0 snap-start",
        className
      )}
      style={{ width }}
    >
      {children}
    </div>
  );
}
