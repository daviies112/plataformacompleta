import { CheckCircle2, Lock, Star, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AchievementWithProgress } from "@/features/revendedora/types/achievements";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

interface AchievementCardProps {
  achievement: AchievementWithProgress;
  variant?: 'compact' | 'full';
  className?: string;
}

const rarityConfig = {
  common: {
    bg: 'bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-900',
    border: 'border-slate-200 dark:border-slate-700',
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-600 dark:text-slate-400',
    progressBg: 'bg-slate-200 dark:bg-slate-700',
    progressFill: 'bg-gradient-to-r from-slate-400 to-slate-500',
  },
  rare: {
    bg: 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950',
    border: 'border-blue-200 dark:border-blue-800',
    iconBg: 'bg-blue-100 dark:bg-blue-900',
    text: 'text-blue-600 dark:text-blue-400',
    progressBg: 'bg-blue-100 dark:bg-blue-900',
    progressFill: 'bg-gradient-to-r from-blue-400 to-indigo-500',
  },
  epic: {
    bg: 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950',
    border: 'border-purple-200 dark:border-purple-800',
    iconBg: 'bg-purple-100 dark:bg-purple-900',
    text: 'text-purple-600 dark:text-purple-400',
    progressBg: 'bg-purple-100 dark:bg-purple-900',
    progressFill: 'bg-gradient-to-r from-purple-400 to-pink-500',
  },
  legendary: {
    bg: 'bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950 dark:via-yellow-950 dark:to-orange-950',
    border: 'border-amber-300 dark:border-amber-700',
    iconBg: 'bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900 dark:to-yellow-900',
    text: 'text-amber-600 dark:text-amber-400',
    progressBg: 'bg-amber-100 dark:bg-amber-900',
    progressFill: 'bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500',
  },
};

const rarityLabels: Record<string, string> = {
  common: 'Comum',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Lendário',
};

export function AchievementCard({ achievement, variant = 'full', className }: AchievementCardProps) {
  const config = rarityConfig[achievement.rarity] || rarityConfig.common;
  const isEarned = achievement.isEarned;
  const hasProgress = achievement.currentProgress > 0 && !isEarned;

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl border transition-all duration-300",
          isEarned ? config.bg : 'bg-muted/30',
          isEarned ? config.border : 'border-muted',
          !isEarned && !hasProgress && 'opacity-60',
          className
        )}
      >
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 relative",
            isEarned ? config.iconBg : 'bg-muted'
          )}
        >
          {isEarned ? (
            <>
              <span>{achievement.icon}</span>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-white" />
              </div>
            </>
          ) : (
            <Lock className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className={cn("font-semibold text-sm truncate", !isEarned && "text-muted-foreground")}>
            {achievement.name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Progress
              value={achievement.progressPercent}
              className={cn("h-1.5 flex-1", config.progressBg)}
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {achievement.currentProgress}/{achievement.targetValue}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-300 hover:shadow-md",
        isEarned ? config.bg : 'bg-card',
        isEarned ? config.border : 'border-muted',
        isEarned && achievement.rarity === 'legendary' && 'ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/10',
        !isEarned && !hasProgress && 'opacity-70',
        className
      )}
    >
      {isEarned && achievement.rarity === 'legendary' && (
        <div className="absolute inset-0 bg-gradient-to-r from-amber-400/5 via-yellow-400/10 to-amber-400/5 animate-pulse pointer-events-none" />
      )}

      <CardContent className="p-4 relative">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0 relative transition-transform hover:scale-105",
              isEarned ? config.iconBg : 'bg-muted'
            )}
          >
            {isEarned ? (
              <>
                <span className="drop-shadow-sm">{achievement.icon}</span>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                {achievement.rarity === 'legendary' && (
                  <div className="absolute -top-1 -left-1">
                    <Star className="w-5 h-5 text-amber-500 fill-amber-500 drop-shadow" />
                  </div>
                )}
              </>
            ) : hasProgress ? (
              <span className="opacity-50">{achievement.icon}</span>
            ) : (
              <Lock className="w-8 h-8 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className={cn(
                  "font-bold text-base leading-tight",
                  isEarned ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {achievement.name}
                </h4>
                <p className={cn(
                  "text-sm mt-1 line-clamp-2",
                  isEarned ? 'text-muted-foreground' : 'text-muted-foreground/70'
                )}>
                  {achievement.description || 'Complete o desafio para desbloquear'}
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "shrink-0 text-xs font-medium",
                  isEarned && config.text,
                  isEarned && config.border
                )}
              >
                {rarityLabels[achievement.rarity]}
              </Badge>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Progresso
                </span>
                <span className={cn(
                  "text-sm font-bold tabular-nums",
                  isEarned ? 'text-green-600 dark:text-green-400' : config.text
                )}>
                  {achievement.currentProgress.toLocaleString('pt-BR')} / {achievement.targetValue.toLocaleString('pt-BR')}
                </span>
              </div>
              
              <div className={cn("h-3 rounded-full overflow-hidden", config.progressBg)}>
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700 ease-out",
                    isEarned ? 'bg-green-500' : config.progressFill
                  )}
                  style={{ width: `${achievement.progressPercent}%` }}
                />
              </div>
            </div>

            {isEarned && achievement.earnedAt && (
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                Conquistado em {format(new Date(achievement.earnedAt), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
              </p>
            )}

            {!isEarned && achievement.nextTierBadge && achievement.isEarned && (
              <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-muted-foreground">
                <span>Próximo nível:</span>
                <span className="font-medium">{achievement.nextTierBadge.name}</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            )}

            {achievement.xp_bonus > 0 && (
              <div className={cn(
                "mt-3 pt-3 border-t flex items-center justify-between",
                !isEarned && "opacity-60"
              )}>
                <span className="text-xs text-muted-foreground">Recompensa</span>
                <span className={cn(
                  "text-sm font-bold",
                  isEarned ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground"
                )}>
                  +{achievement.xp_bonus} XP
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
