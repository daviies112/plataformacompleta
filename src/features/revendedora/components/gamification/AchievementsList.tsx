import { useState } from 'react';
import { Trophy, Target, TrendingUp, Flame, Users, Star, Gift, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { AchievementCard } from './AchievementCard';
import { AchievementWithProgress, ACHIEVEMENT_CATEGORIES } from '@/types/achievements';

interface AchievementsListProps {
  groupedAchievements: Record<string, AchievementWithProgress[]>;
  totalStats: {
    total: number;
    earned: number;
    progress: number;
  };
  isLoading?: boolean;
}

const categoryIcons: Record<string, React.ElementType> = {
  sales: TrendingUp,
  amount: Gift,
  streak: Flame,
  customers: Users,
  products: Sparkles,
  ranking: Trophy,
  special: Star,
  referrals: Users,
};

const categoryColors: Record<string, string> = {
  sales: 'from-green-500 to-emerald-600',
  amount: 'from-yellow-500 to-amber-600',
  streak: 'from-orange-500 to-red-600',
  customers: 'from-blue-500 to-indigo-600',
  products: 'from-purple-500 to-pink-600',
  ranking: 'from-cyan-500 to-blue-600',
  special: 'from-pink-500 to-rose-600',
  referrals: 'from-teal-500 to-cyan-600',
};

const categoryLabels: Record<string, string> = {
  sales: 'Vendas',
  amount: 'Faturamento',
  streak: 'Sequência',
  customers: 'Clientes',
  products: 'Produtos',
  ranking: 'Ranking',
  special: 'Especiais',
  referrals: 'Indicações',
};

export function AchievementsList({ groupedAchievements, totalStats, isLoading }: AchievementsListProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['sales', 'streak']));
  const [showAll, setShowAll] = useState(false);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const expandAll = () => {
    setExpandedCategories(new Set(Object.keys(groupedAchievements)));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  const categories = Object.entries(groupedAchievements).sort((a, b) => {
    const order = ['sales', 'streak', 'customers', 'amount', 'ranking', 'referrals', 'special', 'products'];
    return order.indexOf(a[0]) - order.indexOf(b[0]);
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-4">
              <div className="h-6 w-32 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {[1, 2, 3, 4].map(j => (
                  <div key={j} className="h-24 bg-muted rounded-xl" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10 border-purple-200 dark:border-purple-800">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-bold">Suas Conquistas</h2>
              <p className="text-muted-foreground mt-1">
                Complete desafios para ganhar XP e subir de nível
              </p>
              
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progresso total</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    {totalStats.earned} de {totalStats.total} conquistas
                  </span>
                </div>
                <Progress
                  value={totalStats.progress}
                  className="h-3 bg-purple-100 dark:bg-purple-900"
                />
              </div>
            </div>

            <div className="hidden sm:flex flex-col gap-2">
              <Button variant="outline" size="sm" onClick={expandAll}>
                Expandir Tudo
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                Recolher Tudo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {categories.map(([category, achievements]) => {
          const Icon = categoryIcons[category] || Star;
          const isExpanded = expandedCategories.has(category);
          const earnedInCategory = achievements.filter(a => a.isEarned).length;
          const categoryProgress = (earnedInCategory / achievements.length) * 100;
          const colorClass = categoryColors[category] || 'from-gray-500 to-gray-600';

          return (
            <Collapsible
              key={category}
              open={isExpanded}
              onOpenChange={() => toggleCategory(category)}
            >
              <Card className="overflow-hidden">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md",
                          colorClass
                        )}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {categoryLabels[category] || category}
                            <span className="text-sm font-normal text-muted-foreground">
                              ({earnedInCategory}/{achievements.length})
                            </span>
                          </CardTitle>
                          <Progress
                            value={categoryProgress}
                            className="h-1.5 w-32 mt-2"
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {earnedInCategory === achievements.length && (
                          <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full">
                            Completo!
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {achievements.map(achievement => (
                        <AchievementCard
                          key={achievement.id}
                          achievement={achievement}
                          variant="compact"
                        />
                      ))}
                    </div>

                    {!showAll && achievements.length > 6 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-4"
                        onClick={() => setShowAll(true)}
                      >
                        Ver todas as {achievements.length} conquistas
                      </Button>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
