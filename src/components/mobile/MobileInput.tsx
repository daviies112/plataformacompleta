import { Input, InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { forwardRef } from "react";

interface MobileInputProps extends InputProps {
  mobileSize?: "default" | "lg";
}

export const MobileInput = forwardRef<HTMLInputElement, MobileInputProps>(
  ({ className, mobileSize = "default", ...props }, ref) => {
    const isMobile = useIsMobile();

    const mobileSizeClasses = {
      default: "h-11 text-base",
      lg: "h-12 text-base",
    };

    return (
      <Input
        ref={ref}
        className={cn(
          isMobile && mobileSizeClasses[mobileSize],
          isMobile && "touch-manipulation",
          className
        )}
        {...props}
      />
    );
  }
);

MobileInput.displayName = "MobileInput";
