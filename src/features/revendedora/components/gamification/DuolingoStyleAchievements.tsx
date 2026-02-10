import { useState } from 'react';
import { Trophy, CheckCircle2, Lock, ChevronRight, Sparkles, Star, Flame, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { AchievementWithProgress } from '@/types/achievements';

interface DuolingoStyleAchievementsProps {
  achievements: AchievementWithProgress[];
  className?: string;
}

const tierConfig = [
  { tier: 1, color: 'from-amber-600 to-amber-700', name: 'Bronze', ring: 'ring-amber-500/50' },
  { tier: 2, color: 'from-slate-400 to-slate-500', name: 'Prata', ring: 'ring-slate-400/50' },
  { tier: 3, color: 'from-yellow-400 to-amber-500', name: 'Ouro', ring: 'ring-yellow-400/50' },
  { tier: 4, color: 'from-cyan-300 to-blue-400', name: 'Platina', ring: 'ring-cyan-300/50' },
  { tier: 5, color: 'from-purple-400 to-pink-500', name: 'Diamante', ring: 'ring-purple-400/50' },
  { tier: 6, color: 'from-red-500 to-orange-500', name: 'Lenda', ring: 'ring-red-500/50' },
];

function getTierConfig(tier: number) {
  return tierConfig[Math.min(tier - 1, tierConfig.length - 1)] || tierConfig[0];
}

interface AchievementRowProps {
  achievements: AchievementWithProgress[];
  title: string;
  icon: React.ReactNode;
}

function AchievementRow({ achievements, title, icon }: AchievementRowProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        {icon}
        <h3 className="font-semibold text-sm">{title}</h3>
        <span className="text-xs text-muted-foreground">
          ({achievements.filter(a => a.isEarned).length}/{achievements.length})
        </span>
      </div>
      
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 pb-3">
          {achievements.map((achievement, index) => {
            const isEarned = achievement.isEarned;
            const hasProgress = achievement.currentProgress > 0;
            const tierCfg = getTierConfig(achievement.tier);
            const isNext = !isEarned && (index === 0 || achievements[index - 1]?.isEarned);

            return (
              <div
                key={achievement.id}
                className={cn(
                  "relative flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all duration-300 min-w-[100px]",
                  isEarned && "bg-gradient-to-b from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-300 dark:border-green-700",
                  isNext && !isEarned && "bg-gradient-to-b from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-300 dark:border-purple-700 ring-2 ring-purple-400/30",
                  !isEarned && !isNext && "bg-muted/30 border-muted opacity-60"
                )}
              >
                <div
                  className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center text-2xl relative transition-transform",
                    isEarned && `bg-gradient-to-br ${tierCfg.color} shadow-lg`,
                    isNext && "bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900",
                    !isEarned && !isNext && "bg-muted",
                    isEarned && tierCfg.ring && `ring-4 ${tierCfg.ring}`
                  )}
                >
                  {isEarned ? (
                    <span className="drop-shadow-sm filter">{achievement.icon}</span>
                  ) : hasProgress ? (
                    <span className="opacity-40">{achievement.icon}</span>
                  ) : (
                    <Lock className="w-6 h-6 text-muted-foreground" />
                  )}

                  {isEarned && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  )}

                  {isNext && !isEarned && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 animate-pulse">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <p className={cn(
                    "text-xs font-semibold truncate max-w-[80px]",
                    isEarned ? "text-green-700 dark:text-green-300" : "text-muted-foreground"
                  )}>
                    {achievement.criteria_value.toLocaleString('pt-BR')}
                  </p>
                  {!isEarned && (
                    <div className="mt-1 w-16 mx-auto">
                      <Progress
                        value={achievement.progressPercent}
                        className="h-1.5"
                      />
                    </div>
                  )}
                  {isEarned && (
                    <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                      ✓ Completo
                    </span>
                  )}
                </div>

                {!isEarned && hasProgress && (
                  <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap">
                    {achievement.currentProgress}/{achievement.targetValue}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

export function DuolingoStyleAchievements({ achievements, className }: DuolingoStyleAchievementsProps) {
  const groupedByCriteria = achievements.reduce((acc, achievement) => {
    const key = achievement.criteria_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(achievement);
    return acc;
  }, {} as Record<string, AchievementWithProgress[]>);

  Object.keys(groupedByCriteria).forEach(key => {
    groupedByCriteria[key].sort((a, b) => a.criteria_value - b.criteria_value);
  });

  const criteriaLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    sales_count: { label: 'Número de Vendas', icon: <TrendingUp className="w-4 h-4 text-green-500" /> },
    sales_amount: { label: 'Valor em Vendas', icon: <Star className="w-4 h-4 text-yellow-500" /> },
    streak: { label: 'Dias de Sequência', icon: <Flame className="w-4 h-4 text-orange-500" /> },
    customers: { label: 'Clientes Conquistados', icon: <Trophy className="w-4 h-4 text-blue-500" /> },
    weekly_top: { label: 'Top Semanal', icon: <Trophy className="w-4 h-4 text-purple-500" /> },
    monthly_top: { label: 'Top Mensal', icon: <Trophy className="w-4 h-4 text-pink-500" /> },
  };

  const rows = Object.entries(groupedByCriteria)
    .filter(([key]) => criteriaLabels[key])
    .map(([key, items]) => ({
      key,
      label: criteriaLabels[key].label,
      icon: criteriaLabels[key].icon,
      achievements: items,
    }));

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4 space-y-6">
        {rows.map(row => (
          <AchievementRow
            key={row.key}
            title={row.label}
            icon={row.icon}
            achievements={row.achievements}
          />
        ))}

        {rows.length === 0 && (
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              Nenhuma conquista disponível no momento
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
