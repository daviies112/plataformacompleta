import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { forwardRef } from "react";

interface MobileButtonProps extends ButtonProps {
  mobileSize?: "default" | "lg" | "xl";
}

export const MobileButton = forwardRef<HTMLButtonElement, MobileButtonProps>(
  ({ className, mobileSize = "default", ...props }, ref) => {
    const isMobile = useIsMobile();

    const mobileSizeClasses = {
      default: "min-h-[44px]",
      lg: "min-h-[52px] text-base",
      xl: "min-h-[60px] text-lg",
    };

    return (
      <Button
        ref={ref}
        className={cn(
          "touch-manipulation active:scale-95 transition-transform duration-150",
          isMobile && mobileSizeClasses[mobileSize],
          className
        )}
        {...props}
      />
    );
  }
);

MobileButton.displayName = "MobileButton";
