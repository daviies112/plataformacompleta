import { Award, Lock, Star, Zap, Crown, Target, Users, TrendingUp, Gift } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GamificationBadge } from "@/features/revendedora/types/gamification";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

interface BadgeCardProps {
  badge: GamificationBadge;
  earned: boolean;
  earnedAt?: string | null;
  className?: string;
}

const rarityColors: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  common: {
    border: "border-gray-400",
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-600 dark:text-gray-400",
    glow: "",
  },
  rare: {
    border: "border-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950",
    text: "text-blue-600 dark:text-blue-400",
    glow: "shadow-blue-500/20",
  },
  epic: {
    border: "border-purple-500",
    bg: "bg-purple-50 dark:bg-purple-950",
    text: "text-purple-600 dark:text-purple-400",
    glow: "shadow-purple-500/30",
  },
  legendary: {
    border: "border-yellow-500",
    bg: "bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950 dark:to-amber-950",
    text: "text-yellow-600 dark:text-yellow-400",
    glow: "shadow-yellow-500/40",
  },
};

const rarityLabels: Record<string, string> = {
  common: "Comum",
  rare: "Raro",
  epic: "Épico",
  legendary: "Lendário",
};

const categoryIcons: Record<string, React.ElementType> = {
  sales: TrendingUp,
  streak: Zap,
  customers: Users,
  referrals: Gift,
  ranking: Crown,
  special: Star,
};

export function BadgeCard({ badge, earned, earnedAt, className }: BadgeCardProps) {
  const rarity = rarityColors[badge.rarity] || rarityColors.common;
  const CategoryIcon = categoryIcons[badge.category] || Award;

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 border-2",
      earned ? rarity.border : "border-gray-300 dark:border-gray-700",
      earned && badge.rarity === "legendary" && "shadow-lg",
      earned && rarity.glow,
      !earned && "opacity-70",
      className
    )}>
      {badge.rarity === "legendary" && earned && (
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 via-transparent to-yellow-400/10 animate-pulse" />
      )}
      
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "relative w-12 h-12 rounded-lg flex items-center justify-center",
            earned ? rarity.bg : "bg-gray-200 dark:bg-gray-800"
          )}>
            {earned ? (
              <CategoryIcon className={cn("w-6 h-6", rarity.text)} />
            ) : (
              <Lock className="w-6 h-6 text-gray-400" />
            )}
            {badge.rarity === "legendary" && earned && (
              <div className="absolute -top-1 -right-1">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={cn(
                "font-semibold truncate",
                !earned && "text-muted-foreground"
              )}>
                {badge.name}
              </h4>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs shrink-0",
                  earned && rarity.text,
                  earned && rarity.border
                )}
              >
                {rarityLabels[badge.rarity]}
              </Badge>
            </div>
            
            <p className={cn(
              "text-sm mt-1 line-clamp-2",
              earned ? "text-muted-foreground" : "text-muted-foreground/60"
            )}>
              {badge.description || "Complete o desafio para desbloquear esta conquista."}
            </p>
            
            {earned && earnedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Conquistado em {format(new Date(earnedAt), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            )}
            
            {!earned && (
              <p className="text-xs text-muted-foreground mt-2">
                🔒 Bloqueado
              </p>
            )}
          </div>
        </div>

        {badge.xp_bonus > 0 && (
          <div className={cn(
            "mt-3 pt-3 border-t flex items-center justify-between",
            !earned && "opacity-50"
          )}>
            <span className="text-xs text-muted-foreground">Bônus XP</span>
            <span className={cn(
              "text-sm font-semibold",
              earned ? "text-purple-500" : "text-muted-foreground"
            )}>
              +{badge.xp_bonus} XP
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
