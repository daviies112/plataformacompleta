import { Crown, TrendingUp, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GamificationLeague } from "@/features/revendedora/types/gamification";

interface LeagueBadgeProps {
  league: Pick<GamificationLeague, 'name' | 'icon' | 'color' | 'tier'>;
  position?: number | null;
  points?: number;
  className?: string;
}

const tierNames: Record<number, string> = {
  1: "Bronze",
  2: "Prata",
  3: "Ouro",
  4: "Diamante",
  5: "Mestre",
};

const tierColors: Record<number, string> = {
  1: "from-amber-700 to-amber-900",
  2: "from-gray-300 to-gray-500",
  3: "from-yellow-400 to-yellow-600",
  4: "from-cyan-300 to-blue-500",
  5: "from-purple-400 to-pink-500",
};

const tierBorderColors: Record<number, string> = {
  1: "border-amber-700",
  2: "border-gray-400",
  3: "border-yellow-500",
  4: "border-cyan-400",
  5: "border-purple-500",
};

export function LeagueBadge({ league, position, points, className }: LeagueBadgeProps) {
  const tierColor = tierColors[league.tier] || tierColors[1];
  const borderColor = tierBorderColors[league.tier] || tierBorderColors[1];
  
  const LeagueIcon = () => {
    const iconClass = "w-8 h-8";
    switch (league.icon) {
      case 'crown':
        return <Crown className={iconClass} />;
      case 'trending-up':
        return <TrendingUp className={iconClass} />;
      default:
        return <Users className={iconClass} />;
    }
  };

  return (
    <Card className={cn(
      "overflow-hidden border-2 transition-all hover:shadow-lg",
      borderColor,
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br text-white shadow-lg",
            tierColor
          )}>
            <LeagueIcon />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg">{league.name}</h3>
              <Badge 
                variant="secondary" 
                className={cn(
                  "text-xs",
                  league.tier >= 4 && "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0"
                )}
              >
                {tierNames[league.tier] || `Tier ${league.tier}`}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              {position !== null && position !== undefined && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  <span>#{position}</span>
                </div>
              )}
              {points !== undefined && (
                <div className="flex items-center gap-1">
                  <span className="font-medium text-foreground">{points.toLocaleString()}</span>
                  <span>pontos</span>
                </div>
              )}
            </div>
          </div>

          {position !== null && position !== undefined && position <= 3 && (
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-md",
              position === 1 && "bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900",
              position === 2 && "bg-gradient-to-br from-gray-200 to-gray-400 text-gray-700",
              position === 3 && "bg-gradient-to-br from-amber-500 to-amber-700 text-amber-100"
            )}>
              {position}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
