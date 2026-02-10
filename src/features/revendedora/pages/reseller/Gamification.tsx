import { useState } from 'react';
import { useCompany } from '@/features/revendedora/contexts/CompanyContext';
import {
  useGamificationProfile,
  useResellerChallenges,
  useRankings,
} from '@/features/revendedora/hooks/useGamification';
import { useAchievementsWithProgress } from '@/features/revendedora/hooks/useAchievements';
import {
  XPDisplay,
  StreakCounter,
  LeagueBadge,
  ChallengeCard,
  AchievementCard,
  DuolingoStyleAchievements,
} from '@/features/revendedora/components/gamification';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/revendedora/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/revendedora/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/features/revendedora/components/ui/scroll-area';
import { Skeleton } from '@/features/revendedora/components/ui/skeleton';
import { Progress } from '@/features/revendedora/components/ui/progress';
import { Button } from '@/features/revendedora/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/features/revendedora/components/ui/collapsible';
import { 
  Trophy, 
  Target, 
  Award, 
  Flame, 
  Medal, 
  TrendingUp, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Star,
  Users,
  Gift,
  Zap,
  Crown,
  Lock
} from 'lucide-react';
import { cn } from '@/features/revendedora/lib/utils';

const categoryConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  sales: { icon: TrendingUp, color: 'from-green-500 to-emerald-600', label: 'Vendas' },
  streak: { icon: Flame, color: 'from-orange-500 to-red-600', label: 'Sequência' },
  customers: { icon: Users, color: 'from-blue-500 to-indigo-600', label: 'Clientes' },
  colares: { icon: Star, color: 'from-purple-400 to-violet-600', label: '📿 Colares' },
  brincos: { icon: Star, color: 'from-pink-400 to-rose-600', label: '💠 Brincos' },
  aneis: { icon: Star, color: 'from-amber-400 to-orange-600', label: '💍 Anéis' },
  pulseiras: { icon: Star, color: 'from-cyan-400 to-blue-600', label: '⌚ Pulseiras' },
  ranking: { icon: Trophy, color: 'from-yellow-500 to-amber-600', label: 'Ranking' },
  special: { icon: Star, color: 'from-indigo-500 to-purple-600', label: 'Especiais' },
  referrals: { icon: Gift, color: 'from-teal-500 to-green-600', label: 'Indicações' },
};

export default function ResellerGamification() {
  const { reseller, loading: companyLoading } = useCompany();
  const resellerId = reseller?.id;
  
  const [activeTab, setActiveTab] = useState('desafios');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['sales', 'streak']));
  
  const { data: profile, isLoading: profileLoading } = useGamificationProfile(resellerId);
  const { data: challenges, isLoading: challengesLoading } = useResellerChallenges(resellerId);
  const { data: weeklyRankings, isLoading: rankingsLoading } = useRankings('weekly');
  const { achievements, groupedAchievements, isLoading: achievementsLoading, stats: achievementStats } = useAchievementsWithProgress(resellerId);
  
  const earnedAchievements = achievements.filter(a => a.isEarned);
  const pendingAchievements = achievements.filter(a => !a.isEarned);
  
  const groupedEarnedAchievements = earnedAchievements.reduce((acc, achievement) => {
    const category = achievement.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(achievement);
    return acc;
  }, {} as Record<string, typeof achievements>);
  
  const groupedPendingAchievements = pendingAchievements.reduce((acc, achievement) => {
    const category = achievement.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(achievement);
    return acc;
  }, {} as Record<string, typeof achievements>);

  const isLoading = companyLoading || profileLoading;
  const userRankPosition = weeklyRankings?.find(r => r.reseller.id === resellerId)?.position;

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            Gamificação
          </h1>
          <p className="text-muted-foreground mt-1">
            {profile?.nome ? `Olá, ${profile.nome}!` : 'Olá!'} Complete desafios e conquiste prêmios.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <XPDisplay 
          currentXP={profile?.xp || 0} 
          level={profile?.level || 1} 
        />
        <StreakCounter 
          currentStreak={profile?.current_streak || 0} 
          longestStreak={profile?.longest_streak || 0} 
        />
        {profile?.league ? (
          <LeagueBadge
            league={{
              name: profile.league.name,
              icon: profile.league.icon,
              color: profile.league.color,
              tier: profile.league.tier,
            }}
            position={userRankPosition}
            points={profile.league_points}
          />
        ) : (
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                <Medal className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Sem Liga</p>
                <p className="text-sm text-muted-foreground">Faça vendas para entrar!</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-orange-500/10 border-purple-200/50 dark:border-purple-800/50">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0">
              <Award className="w-10 h-10 text-white" />
            </div>
            
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-bold">Progresso das Conquistas</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Complete desafios para ganhar XP e desbloquear recompensas
              </p>
              
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Conquistas desbloqueadas</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    {achievementStats.earned} de {achievementStats.total}
                  </span>
                </div>
                <Progress
                  value={achievementStats.progress}
                  className="h-3 bg-purple-100 dark:bg-purple-900/50"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start h-auto flex-wrap gap-1 bg-muted/50 p-1">
          <TabsTrigger value="desafios" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Desafios
          </TabsTrigger>
          <TabsTrigger value="ranking" className="flex items-center gap-2">
            <Medal className="w-4 h-4" />
            Ranking
          </TabsTrigger>
          <TabsTrigger value="conquistas" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Conquistas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conquistas" className="mt-6 space-y-4">
          {achievementsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-4">
                    <div className="h-6 w-32 bg-muted rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {[1, 2, 3, 4].map(j => (
                        <div key={j} className="w-24 h-28 bg-muted rounded-xl shrink-0" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : earnedAchievements.length > 0 ? (
            <div className="space-y-4">
              {Object.entries(groupedEarnedAchievements)
                .sort((a, b) => {
                  const order = ['sales', 'streak', 'customers', 'colares', 'brincos', 'aneis', 'pulseiras', 'ranking', 'special', 'referrals'];
                  return order.indexOf(a[0]) - order.indexOf(b[0]);
                })
                .map(([category, categoryAchievements]) => {
                  const config = categoryConfig[category] || categoryConfig.special;
                  const Icon = config.icon;

                  return (
                    <Card key={category} className="overflow-hidden">
                      <CardHeader className="py-4">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md",
                            config.color
                          )}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              {config.label}
                              <span className="text-sm font-normal text-green-600 dark:text-green-400">
                                ({categoryAchievements.length} conquistadas)
                              </span>
                            </CardTitle>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0 pb-4">
                        <ScrollArea className="w-full">
                          <div className="flex gap-3 pb-3">
                            {categoryAchievements
                              .sort((a, b) => a.criteria_value - b.criteria_value)
                              .map((achievement) => (
                                <div
                                  key={achievement.id}
                                  className="relative flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all min-w-[100px] shrink-0 bg-gradient-to-b from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 border-green-300 dark:border-green-700"
                                >
                                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl relative bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg ring-4 ring-green-400/30">
                                    <span className="drop-shadow-sm">{achievement.icon}</span>
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900">
                                      <Zap className="w-3 h-3 text-white" />
                                    </div>
                                  </div>

                                  <div className="text-center w-full">
                                    <p className="text-xs font-bold text-green-700 dark:text-green-300">
                                      {achievement.targetValue.toLocaleString('pt-BR')}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground truncate max-w-[90px] mx-auto">
                                      {achievement.name}
                                    </p>
                                    <p className="text-[10px] text-green-600 dark:text-green-400 font-medium mt-1">
                                      ✓ Completo
                                    </p>
                                  </div>

                                  {achievement.xp_bonus > 0 && (
                                    <div className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                                      +{achievement.xp_bonus} XP
                                    </div>
                                  )}
                                </div>
                              ))}
                          </div>
                          <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma conquista ainda</h3>
                <p className="text-muted-foreground">
                  Complete desafios para desbloquear suas primeiras conquistas!
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="desafios" className="mt-6 space-y-4">
          {achievementsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-4">
                    <div className="h-6 w-32 bg-muted rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {[1, 2, 3, 4].map(j => (
                        <div key={j} className="w-24 h-28 bg-muted rounded-xl shrink-0" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : pendingAchievements.length > 0 ? (
            <div className="space-y-4">
              {Object.entries(groupedPendingAchievements)
                .sort((a, b) => {
                  const order = ['sales', 'streak', 'customers', 'colares', 'brincos', 'aneis', 'pulseiras', 'ranking', 'special', 'referrals'];
                  return order.indexOf(a[0]) - order.indexOf(b[0]);
                })
                .map(([category, categoryAchievements]) => {
                  const config = categoryConfig[category] || categoryConfig.special;
                  const Icon = config.icon;
                  const isExpanded = expandedCategories.has(category);
                  const inProgressCount = categoryAchievements.filter(a => a.currentProgress > 0).length;

                  return (
                    <Collapsible
                      key={category}
                      open={isExpanded}
                      onOpenChange={() => toggleCategory(category)}
                    >
                      <Card className="overflow-hidden">
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md",
                                  config.color
                                )}>
                                  <Icon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    {config.label}
                                    <span className="text-sm font-normal text-muted-foreground">
                                      ({categoryAchievements.length} desafios)
                                    </span>
                                  </CardTitle>
                                  {inProgressCount > 0 && (
                                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                      {inProgressCount} em progresso
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
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
                          <CardContent className="pt-0 pb-4">
                            <ScrollArea className="w-full">
                              <div className="flex gap-3 pb-3">
                                {categoryAchievements
                                  .sort((a, b) => a.criteria_value - b.criteria_value)
                                  .map((achievement, index) => {
                                    const hasProgress = achievement.currentProgress > 0;
                                    const isNext = index === 0 || categoryAchievements.slice(0, index).every(a => 
                                      earnedAchievements.some(e => e.id === a.id) || a.currentProgress > 0
                                    );

                                    return (
                                      <div
                                        key={achievement.id}
                                        className={cn(
                                          "relative flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all min-w-[100px] shrink-0",
                                          hasProgress && "bg-gradient-to-b from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 border-purple-300 dark:border-purple-700",
                                          !hasProgress && "bg-muted/30 border-muted"
                                        )}
                                      >
                                        <div
                                          className={cn(
                                            "w-14 h-14 rounded-full flex items-center justify-center text-2xl relative",
                                            hasProgress && "bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50",
                                            !hasProgress && "bg-muted"
                                          )}
                                        >
                                          {hasProgress ? (
                                            <span className="opacity-60">{achievement.icon}</span>
                                          ) : (
                                            <Lock className="w-6 h-6 text-muted-foreground opacity-40" />
                                          )}

                                          {hasProgress && (
                                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 animate-pulse">
                                              <Sparkles className="w-3 h-3 text-white" />
                                            </div>
                                          )}
                                        </div>

                                        <div className="text-center w-full">
                                          <p className={cn(
                                            "text-xs font-bold",
                                            hasProgress ? "text-purple-700 dark:text-purple-300" : "text-muted-foreground"
                                          )}>
                                            {achievement.targetValue.toLocaleString('pt-BR')}
                                          </p>
                                          <p className="text-[10px] text-muted-foreground truncate max-w-[90px] mx-auto">
                                            {achievement.name}
                                          </p>
                                          
                                          <div className="mt-2 space-y-1">
                                            <Progress
                                              value={achievement.progressPercent}
                                              className="h-1.5 w-16 mx-auto"
                                            />
                                            <p className="text-[10px] text-muted-foreground">
                                              {achievement.currentProgress}/{achievement.targetValue}
                                            </p>
                                          </div>
                                        </div>

                                        {achievement.xp_bonus > 0 && (
                                          <div className="text-[10px] font-bold text-muted-foreground">
                                            +{achievement.xp_bonus} XP
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                              </div>
                              <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Parabéns! Todos os desafios foram concluídos!</h3>
                <p className="text-muted-foreground">
                  Você completou todos os desafios disponíveis.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ranking" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Medal className="w-5 h-5 text-yellow-500" />
                Ranking Semanal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rankingsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} className="h-14" />
                  ))}
                </div>
              ) : weeklyRankings && weeklyRankings.length > 0 ? (
                <div className="space-y-2">
                  {weeklyRankings.slice(0, 10).map((entry) => {
                    const isCurrentUser = entry.reseller.id === resellerId;
                    return (
                      <div
                        key={entry.reseller.id}
                        className={cn(
                          "flex items-center gap-4 p-3 rounded-xl transition-colors",
                          isCurrentUser ? "bg-purple-50 dark:bg-purple-950/50 ring-2 ring-purple-400/50" : "hover:bg-muted/50"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg",
                          entry.position === 1 && "bg-gradient-to-br from-yellow-400 to-amber-500 text-white",
                          entry.position === 2 && "bg-gradient-to-br from-slate-300 to-slate-400 text-white",
                          entry.position === 3 && "bg-gradient-to-br from-amber-600 to-amber-700 text-white",
                          entry.position > 3 && "bg-muted text-muted-foreground"
                        )}>
                          {entry.position <= 3 ? (
                            entry.position === 1 ? '🥇' : entry.position === 2 ? '🥈' : '🥉'
                          ) : (
                            entry.position
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={cn("font-medium", isCurrentUser && "text-purple-700 dark:text-purple-300")}>
                            {entry.reseller.nome || 'Revendedor'}
                            {isCurrentUser && <span className="ml-2 text-xs">(Você)</span>}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Nível {entry.reseller.level}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-purple-600 dark:text-purple-400">
                            {entry.xp_period.toLocaleString('pt-BR')} XP
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Medal className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    Nenhum participante no ranking ainda.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
