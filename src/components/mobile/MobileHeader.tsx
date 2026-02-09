import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileHeaderProps {
  title?: string;
  showSearch?: boolean;
  onSearchClick?: () => void;
  className?: string;
}

export function MobileHeader({
  title,
  showSearch = false,
  onSearchClick,
  className,
}: MobileHeaderProps) {

  return (
    <header
      className={cn(
        "md:hidden sticky top-0 z-40 w-full bg-[#0a0a0a]/95 backdrop-blur-lg border-b border-primary/20",
        className
      )}
    >
      <div className="flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-3">
          {title && (
            <div>
              <h1 className="text-lg font-bold text-foreground">{title}</h1>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showSearch && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onSearchClick}
              className="h-11 w-11 min-h-[44px] min-w-[44px] touch-manipulation active:scale-95"
            >
              <Search className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
