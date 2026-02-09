import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface MobileOptimizedCardProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function MobileOptimizedCard({
  title,
  description,
  icon: Icon,
  children,
  className,
  headerAction,
  collapsible = false,
  defaultCollapsed = false,
}: MobileOptimizedCardProps) {
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  const toggleCollapse = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <Card
      className={cn(
        "glass-card border-border/20",
        isMobile ? "mx-0" : "",
        className
      )}
    >
      {(title || description) && (
        <CardHeader
          className={cn(
            isMobile ? "p-4 pb-3" : "p-6",
            collapsible && "cursor-pointer active:scale-[0.99] transition-transform"
          )}
          onClick={toggleCollapse}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {Icon && (
                <div className={cn(
                  "flex-shrink-0",
                  isMobile ? "h-5 w-5" : "h-6 w-6"
                )}>
                  <Icon className="w-full h-full text-secondary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                {title && (
                  <CardTitle className={cn(
                    "flex items-center gap-2",
                    isMobile ? "text-base" : "text-xl"
                  )}>
                    {title}
                  </CardTitle>
                )}
                {description && !isCollapsed && (
                  <CardDescription className={cn(
                    isMobile ? "text-xs mt-1" : "text-sm mt-2"
                  )}>
                    {description}
                  </CardDescription>
                )}
              </div>
            </div>
            {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
            {collapsible && (
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform flex-shrink-0 ml-2",
                  isCollapsed && "transform rotate-180"
                )}
              />
            )}
          </div>
        </CardHeader>
      )}
      {!isCollapsed && (
        <CardContent className={cn(
          isMobile ? "p-4 pt-0" : "p-6",
          !title && !description && (isMobile ? "p-4" : "p-6")
        )}>
          {children}
        </CardContent>
      )}
    </Card>
  );
}

import { ChevronDown } from "lucide-react";
import React from "react";
