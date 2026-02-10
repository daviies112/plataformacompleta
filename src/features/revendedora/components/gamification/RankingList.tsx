import { Medal, Crown, TrendingUp, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { RankingEntry } from "@/features/revendedora/types/gamification";

interface RankingListProps {
  rankings: RankingEntry[];
  currentResellerId?: string;
  title?: string;
  className?: string;
}

const positionStyles: Record<number, { 
  bg: string; 
  border: string; 
  icon: React.ElementType;
  iconColor: string;
}> = {
  1: {
    bg: "bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30",
    border: "border-l-4 border-l-yellow-500",
    icon: Crown,
    iconColor: "text-yellow-500",
  },
  2: {
    bg: "bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/30 dark:to-slate-950/30",
    border: "border-l-4 border-l-gray-400",
    icon: Medal,
    iconColor: "text-gray-400",
  },
  3: {
    bg: "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30",
    border: "border-l-4 border-l-amber-600",
    icon: Medal,
    iconColor: "text-amber-600",
  },
};

export function RankingList({ rankings, currentResellerId, title = "Ranking", className }: RankingListProps) {
  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5 text-purple-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {rankings.map((entry) => {
            const isCurrentUser = entry.reseller.id === currentResellerId;
            const positionStyle = positionStyles[entry.position];
            const PositionIcon = positionStyle?.icon || User;

            return (
              <div
                key={entry.reseller.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 transition-colors",
                  positionStyle?.bg,
                  positionStyle?.border,
                  isCurrentUser && "bg-purple-50 dark:bg-purple-950/30 border-l-4 border-l-purple-500"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                  entry.position === 1 && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
                  entry.position === 2 && "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                  entry.position === 3 && "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
                  entry.position > 3 && "bg-muted text-muted-foreground"
                )}>
                  {entry.position <= 3 ? (
                    <PositionIcon className={cn("w-4 h-4", positionStyle?.iconColor)} />
                  ) : (
                    entry.position
                  )}
                </div>

                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarImage src={entry.reseller.avatar_url || undefined} alt={entry.reseller.nome || ""} />
                  <AvatarFallback className={cn(
                    isCurrentUser && "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                  )}>
                    {getInitials(entry.reseller.nome)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium truncate",
                    isCurrentUser && "text-purple-700 dark:text-purple-300"
                  )}>
                    {entry.reseller.nome || "Revendedor"}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs text-purple-500">(você)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Level {entry.reseller.level} • {entry.reseller.total_orders} vendas
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-bold text-purple-600 dark:text-purple-400">
                    {entry.xp_period.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">XP</p>
                </div>
              </div>
            );
          })}

          {rankings.length === 0 && (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum participante no ranking ainda.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
