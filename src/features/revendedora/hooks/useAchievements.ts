import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/features/revendedora/contexts/SupabaseContext';
import type { GamificationBadge, ResellerGamificationData } from '@/types/gamification';
import type { AchievementWithProgress } from '@/types/achievements';

interface ResellerStats {
  totalSales: number;
  totalAmount: number;
  totalCustomers: number;
  currentStreak: number;
  longestStreak: number;
  weeklyRank: number | null;
  monthlyRank: number | null;
  productsSold: Record<string, number>;
}

const DEMO_BADGES: GamificationBadge[] = [
  { id: '1', company_id: null, name: 'Primeira Venda', description: 'Realize sua primeira venda', icon: '🎯', category: 'sales', criteria_type: 'sales_count', criteria_value: 1, rarity: 'common', xp_bonus: 50, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '2', company_id: null, name: '5 Vendas', description: 'Complete 5 vendas', icon: '🛒', category: 'sales', criteria_type: 'sales_count', criteria_value: 5, rarity: 'common', xp_bonus: 75, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '3', company_id: null, name: '10 Vendas', description: 'Complete 10 vendas', icon: '📦', category: 'sales', criteria_type: 'sales_count', criteria_value: 10, rarity: 'common', xp_bonus: 100, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '4', company_id: null, name: '25 Vendas', description: 'Complete 25 vendas', icon: '🎁', category: 'sales', criteria_type: 'sales_count', criteria_value: 25, rarity: 'common', xp_bonus: 150, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '5', company_id: null, name: '50 Vendas', description: 'Complete 50 vendas', icon: '🥉', category: 'sales', criteria_type: 'sales_count', criteria_value: 50, rarity: 'rare', xp_bonus: 200, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '6', company_id: null, name: '100 Vendas', description: 'Complete 100 vendas', icon: '🥈', category: 'sales', criteria_type: 'sales_count', criteria_value: 100, rarity: 'rare', xp_bonus: 300, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '7', company_id: null, name: '250 Vendas', description: 'Complete 250 vendas', icon: '🥇', category: 'sales', criteria_type: 'sales_count', criteria_value: 250, rarity: 'epic', xp_bonus: 500, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '8', company_id: null, name: '500 Vendas', description: 'Complete 500 vendas', icon: '💎', category: 'sales', criteria_type: 'sales_count', criteria_value: 500, rarity: 'epic', xp_bonus: 750, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '9', company_id: null, name: '1000 Vendas', description: 'Complete 1000 vendas', icon: '👑', category: 'sales', criteria_type: 'sales_count', criteria_value: 1000, rarity: 'legendary', xp_bonus: 1000, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '10', company_id: null, name: 'Sequência de 3 Dias', description: 'Venda por 3 dias consecutivos', icon: '🔥', category: 'streak', criteria_type: 'streak', criteria_value: 3, rarity: 'common', xp_bonus: 50, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '11', company_id: null, name: 'Sequência de 7 Dias', description: 'Venda por 7 dias consecutivos', icon: '🔥', category: 'streak', criteria_type: 'streak', criteria_value: 7, rarity: 'common', xp_bonus: 100, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '12', company_id: null, name: 'Sequência de 14 Dias', description: 'Venda por 14 dias consecutivos', icon: '🔥🔥', category: 'streak', criteria_type: 'streak', criteria_value: 14, rarity: 'rare', xp_bonus: 200, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '13', company_id: null, name: 'Sequência de 30 Dias', description: 'Venda por 30 dias consecutivos', icon: '🔥🔥', category: 'streak', criteria_type: 'streak', criteria_value: 30, rarity: 'rare', xp_bonus: 300, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '14', company_id: null, name: 'Sequência de 60 Dias', description: 'Venda por 60 dias consecutivos', icon: '🔥🔥🔥', category: 'streak', criteria_type: 'streak', criteria_value: 60, rarity: 'epic', xp_bonus: 500, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '15', company_id: null, name: 'Sequência de 100 Dias', description: 'Venda por 100 dias consecutivos', icon: '⚡', category: 'streak', criteria_type: 'streak', criteria_value: 100, rarity: 'legendary', xp_bonus: 1000, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '16', company_id: null, name: 'Primeiro Cliente', description: 'Conquiste seu primeiro cliente', icon: '👤', category: 'customers', criteria_type: 'customers', criteria_value: 1, rarity: 'common', xp_bonus: 50, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '17', company_id: null, name: '10 Clientes', description: 'Conquiste 10 clientes', icon: '👥', category: 'customers', criteria_type: 'customers', criteria_value: 10, rarity: 'common', xp_bonus: 100, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '18', company_id: null, name: '25 Clientes', description: 'Conquiste 25 clientes', icon: '🎯', category: 'customers', criteria_type: 'customers', criteria_value: 25, rarity: 'rare', xp_bonus: 150, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '19', company_id: null, name: '50 Clientes', description: 'Conquiste 50 clientes', icon: '🏆', category: 'customers', criteria_type: 'customers', criteria_value: 50, rarity: 'rare', xp_bonus: 200, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '20', company_id: null, name: '100 Clientes', description: 'Conquiste 100 clientes', icon: '👑', category: 'customers', criteria_type: 'customers', criteria_value: 100, rarity: 'epic', xp_bonus: 400, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '21', company_id: null, name: 'Primeiro Colar', description: 'Venda seu primeiro colar', icon: '📿', category: 'colares', criteria_type: 'colar_count', criteria_value: 1, rarity: 'common', xp_bonus: 30, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '22', company_id: null, name: '10 Colares', description: 'Venda 10 colares', icon: '📿', category: 'colares', criteria_type: 'colar_count', criteria_value: 10, rarity: 'common', xp_bonus: 75, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '23', company_id: null, name: '25 Colares', description: 'Venda 25 colares', icon: '📿', category: 'colares', criteria_type: 'colar_count', criteria_value: 25, rarity: 'rare', xp_bonus: 150, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '24', company_id: null, name: '50 Colares', description: 'Venda 50 colares', icon: '📿', category: 'colares', criteria_type: 'colar_count', criteria_value: 50, rarity: 'epic', xp_bonus: 250, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '25', company_id: null, name: '100 Colares', description: 'Venda 100 colares - Mestre dos Colares!', icon: '📿', category: 'colares', criteria_type: 'colar_count', criteria_value: 100, rarity: 'legendary', xp_bonus: 500, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '26', company_id: null, name: 'Primeiros Brincos', description: 'Venda seus primeiros brincos', icon: '💠', category: 'brincos', criteria_type: 'brinco_count', criteria_value: 1, rarity: 'common', xp_bonus: 30, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '27', company_id: null, name: '10 Brincos', description: 'Venda 10 pares de brincos', icon: '💠', category: 'brincos', criteria_type: 'brinco_count', criteria_value: 10, rarity: 'common', xp_bonus: 75, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '28', company_id: null, name: '25 Brincos', description: 'Venda 25 pares de brincos', icon: '💠', category: 'brincos', criteria_type: 'brinco_count', criteria_value: 25, rarity: 'rare', xp_bonus: 150, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '36', company_id: null, name: '50 Brincos', description: 'Venda 50 pares de brincos', icon: '💠', category: 'brincos', criteria_type: 'brinco_count', criteria_value: 50, rarity: 'epic', xp_bonus: 250, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '37', company_id: null, name: '100 Brincos', description: 'Venda 100 pares de brincos - Mestre dos Brincos!', icon: '💠', category: 'brincos', criteria_type: 'brinco_count', criteria_value: 100, rarity: 'legendary', xp_bonus: 500, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '29', company_id: null, name: 'Primeiro Anel', description: 'Venda seu primeiro anel', icon: '💍', category: 'aneis', criteria_type: 'anel_count', criteria_value: 1, rarity: 'common', xp_bonus: 30, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '30', company_id: null, name: '10 Anéis', description: 'Venda 10 anéis', icon: '💍', category: 'aneis', criteria_type: 'anel_count', criteria_value: 10, rarity: 'common', xp_bonus: 75, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '38', company_id: null, name: '25 Anéis', description: 'Venda 25 anéis', icon: '💍', category: 'aneis', criteria_type: 'anel_count', criteria_value: 25, rarity: 'rare', xp_bonus: 150, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '39', company_id: null, name: '50 Anéis', description: 'Venda 50 anéis', icon: '💍', category: 'aneis', criteria_type: 'anel_count', criteria_value: 50, rarity: 'epic', xp_bonus: 250, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '40', company_id: null, name: '100 Anéis', description: 'Venda 100 anéis - Mestre dos Anéis!', icon: '💍', category: 'aneis', criteria_type: 'anel_count', criteria_value: 100, rarity: 'legendary', xp_bonus: 500, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '31', company_id: null, name: 'Primeira Pulseira', description: 'Venda sua primeira pulseira', icon: '⌚', category: 'pulseiras', criteria_type: 'pulseira_count', criteria_value: 1, rarity: 'common', xp_bonus: 30, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '32', company_id: null, name: '10 Pulseiras', description: 'Venda 10 pulseiras', icon: '⌚', category: 'pulseiras', criteria_type: 'pulseira_count', criteria_value: 10, rarity: 'common', xp_bonus: 75, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '41', company_id: null, name: '25 Pulseiras', description: 'Venda 25 pulseiras', icon: '⌚', category: 'pulseiras', criteria_type: 'pulseira_count', criteria_value: 25, rarity: 'rare', xp_bonus: 150, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '42', company_id: null, name: '50 Pulseiras', description: 'Venda 50 pulseiras', icon: '⌚', category: 'pulseiras', criteria_type: 'pulseira_count', criteria_value: 50, rarity: 'epic', xp_bonus: 250, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '43', company_id: null, name: '100 Pulseiras', description: 'Venda 100 pulseiras - Mestre das Pulseiras!', icon: '⌚', category: 'pulseiras', criteria_type: 'pulseira_count', criteria_value: 100, rarity: 'legendary', xp_bonus: 500, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '33', company_id: null, name: 'Top 10 Semanal', description: 'Fique entre os 10 melhores da semana', icon: '🏅', category: 'ranking', criteria_type: 'weekly_top', criteria_value: 10, rarity: 'rare', xp_bonus: 150, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '34', company_id: null, name: 'Top 3 Semanal', description: 'Fique entre os 3 melhores da semana', icon: '🥈', category: 'ranking', criteria_type: 'weekly_top', criteria_value: 3, rarity: 'epic', xp_bonus: 400, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
  { id: '35', company_id: null, name: 'Campeão Semanal', description: 'Fique em 1º lugar no ranking semanal', icon: '🥇', category: 'ranking', criteria_type: 'weekly_top', criteria_value: 1, rarity: 'legendary', xp_bonus: 600, reward_enabled: false, reward_type: null, reward_value: null, is_active: true, created_at: '', updated_at: '' },
];

const DEMO_STATS: ResellerStats = {
  totalSales: 8,
  totalAmount: 1250,
  totalCustomers: 5,
  currentStreak: 4,
  longestStreak: 7,
  weeklyRank: 5,
  monthlyRank: null,
  productsSold: { colar: 3, brinco: 2, anel: 1, pulseira: 0 },
};

function getProgressForBadge(
  badge: GamificationBadge,
  stats: ResellerStats
): number {
  switch (badge.criteria_type) {
    case 'sales_count':
      return stats.totalSales;
    case 'sales_amount':
      return stats.totalAmount;
    case 'customers':
      return stats.totalCustomers;
    case 'streak':
      return stats.currentStreak;
    case 'longest_streak':
      return stats.longestStreak;
    case 'weekly_top':
      return stats.weeklyRank ? (stats.weeklyRank <= badge.criteria_value ? badge.criteria_value : 0) : 0;
    case 'monthly_top':
      return stats.monthlyRank ? (stats.monthlyRank <= badge.criteria_value ? badge.criteria_value : 0) : 0;
    case 'colar_count':
      return stats.productsSold.colar || 0;
    case 'brinco_count':
      return stats.productsSold.brinco || 0;
    case 'anel_count':
      return stats.productsSold.anel || 0;
    case 'pulseira_count':
      return stats.productsSold.pulseira || 0;
    case 'pingente_count':
      return stats.productsSold.pingente || 0;
    case 'corrente_count':
      return stats.productsSold.corrente || 0;
    case 'conjunto_count':
      return stats.productsSold.conjunto || 0;
    default:
      return 0;
  }
}

function determineTier(badge: GamificationBadge, allBadges: GamificationBadge[]): number {
  const sameCriteriaBadges = allBadges
    .filter(b => b.criteria_type === badge.criteria_type)
    .sort((a, b) => a.criteria_value - b.criteria_value);
  
  const index = sameCriteriaBadges.findIndex(b => b.id === badge.id);
  return index + 1;
}

function getNextTierBadge(
  badge: GamificationBadge,
  allBadges: GamificationBadge[]
): GamificationBadge | null {
  const sameCriteriaBadges = allBadges
    .filter(b => b.criteria_type === badge.criteria_type)
    .sort((a, b) => a.criteria_value - b.criteria_value);
  
  const currentIndex = sameCriteriaBadges.findIndex(b => b.id === badge.id);
  if (currentIndex < sameCriteriaBadges.length - 1) {
    return sameCriteriaBadges[currentIndex + 1];
  }
  return null;
}

export function useResellerStats(resellerId: string | undefined) {
  const { client: supabase, loading: supabaseLoading, configured } = useSupabase();
  
  return useQuery<ResellerStats>({
    queryKey: ['reseller-stats', resellerId, !!supabase],
    queryFn: async () => {
      if (!supabase) {
        console.log('[useResellerStats] Using demo stats');
        return DEMO_STATS;
      }
      
      if (!resellerId) {
        return DEMO_STATS;
      }

      try {
        const { data: reseller } = await supabase
          .from('resellers' as any)
          .select('total_orders, total_sales_amount, total_customers, current_streak, longest_streak')
          .eq('id', resellerId)
          .single();

        const resellerData = reseller as any || {};

        return {
          totalSales: resellerData.total_orders || 0,
          totalAmount: resellerData.total_sales_amount || 0,
          totalCustomers: resellerData.total_customers || 0,
          currentStreak: resellerData.current_streak || 0,
          longestStreak: resellerData.longest_streak || 0,
          weeklyRank: null,
          monthlyRank: null,
          productsSold: {},
        };
      } catch (error) {
        console.error('[useResellerStats] Error:', error);
        return DEMO_STATS;
      }
    },
    staleTime: 30000,
    enabled: !supabaseLoading,
  });
}

export function useAchievementsWithProgress(resellerId: string | undefined) {
  const { client: supabase, loading: supabaseLoading, configured } = useSupabase();
  const { data: stats, isLoading: statsLoading } = useResellerStats(resellerId);
  
  const { data: badges, isLoading: badgesLoading } = useQuery<GamificationBadge[]>({
    queryKey: ['all-badges', !!supabase],
    queryFn: async () => {
      if (!supabase) {
        console.log('[useAchievementsWithProgress] Using demo badges');
        return DEMO_BADGES;
      }
      
      try {
        const { data, error } = await supabase
          .from('gamification_badges' as any)
          .select('*')
          .eq('is_active', true)
          .order('category')
          .order('criteria_value');

        if (error) {
          console.error('[useAchievementsWithProgress] Error:', error);
          return DEMO_BADGES;
        }

        return (data && data.length > 0) ? (data as GamificationBadge[]) : DEMO_BADGES;
      } catch (error) {
        console.error('[useAchievementsWithProgress] Error:', error);
        return DEMO_BADGES;
      }
    },
    staleTime: 300000,
    enabled: !supabaseLoading,
  });

  const { data: earnedBadges, isLoading: earnedLoading } = useQuery<{ badge_id: string; earned_at: string }[]>({
    queryKey: ['earned-badges', resellerId, !!supabase],
    queryFn: async () => {
      if (!supabase || !resellerId) return [];
      
      try {
        const { data, error } = await supabase
          .from('reseller_badges' as any)
          .select('badge_id, earned_at')
          .eq('reseller_id', resellerId);

        if (error) {
          console.error('[useAchievementsWithProgress] Earned badges error:', error);
          return [];
        }

        return (data || []) as { badge_id: string; earned_at: string }[];
      } catch (error) {
        console.error('[useAchievementsWithProgress] Error:', error);
        return [];
      }
    },
    enabled: !!resellerId && !supabaseLoading,
    staleTime: 60000,
  });

  const achievements = useMemo<AchievementWithProgress[]>(() => {
    if (!badges || !stats) return [];

    const earnedMap = new Map(earnedBadges?.map(b => [b.badge_id, b.earned_at]) || []);

    return badges.map(badge => {
      const currentProgress = getProgressForBadge(badge, stats);
      const targetValue = badge.criteria_value;
      const progressPercent = Math.min((currentProgress / targetValue) * 100, 100);
      const isEarned = earnedMap.has(badge.id) || currentProgress >= targetValue;
      const earnedAt = earnedMap.get(badge.id);
      const tier = determineTier(badge, badges);
      const nextTierBadge = getNextTierBadge(badge, badges);

      return {
        ...badge,
        currentProgress,
        targetValue,
        progressPercent,
        isEarned,
        earnedAt,
        tier,
        nextTierBadge,
      };
    });
  }, [badges, stats, earnedBadges]);

  const groupedAchievements = useMemo(() => {
    const groups: Record<string, AchievementWithProgress[]> = {};
    
    achievements.forEach(achievement => {
      const category = achievement.category || 'special';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(achievement);
    });

    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => a.criteria_value - b.criteria_value);
    });

    return groups;
  }, [achievements]);

  const totalAchievements = achievements.length;
  const earnedCount = achievements.filter(a => a.isEarned).length;
  const overallProgress = totalAchievements > 0 ? (earnedCount / totalAchievements) * 100 : 0;

  return {
    achievements,
    groupedAchievements,
    isLoading: supabaseLoading || statsLoading || badgesLoading || earnedLoading,
    stats: {
      total: totalAchievements,
      earned: earnedCount,
      progress: overallProgress,
    },
  };
}
