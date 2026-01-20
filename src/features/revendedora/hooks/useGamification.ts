import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/features/revendedora/contexts/SupabaseContext';
import type {
  ResellerGamificationData,
  ResellerBadge,
  GamificationBadge,
  ResellerChallenge,
  RankingEntry,
  GamificationLeague,
  GamificationConfig,
  GamificationActivity,
} from '@/types/gamification';

export function calculateXpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

export function calculateXpProgress(currentXp: number, level: number): {
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
  xpToNextLevel: number;
} {
  const currentLevelXp = calculateXpForLevel(level);
  const nextLevelXp = calculateXpForLevel(level + 1);
  const xpInCurrentLevel = currentXp - currentLevelXp;
  const xpNeededForNextLevel = nextLevelXp - currentLevelXp;
  const progressPercent = Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNextLevel) * 100));
  const xpToNextLevel = nextLevelXp - currentXp;

  return {
    currentLevelXp,
    nextLevelXp,
    progressPercent,
    xpToNextLevel,
  };
}

export function useGamificationProfile(resellerId: string | undefined) {
  const { client: supabase, loading: supabaseLoading, configured } = useSupabase();
  
  return useQuery<ResellerGamificationData | null>({
    queryKey: ['gamification-profile', resellerId, configured],
    queryFn: async () => {
      if (supabaseLoading || !configured || !supabase || !resellerId) {
        console.log('[useGamificationProfile] Supabase not configured or no resellerId');
        return null;
      }

      try {
        const { data, error } = await supabase
          .from('resellers' as any)
          .select(`
            id,
            nome,
            email,
            avatar_url,
            xp,
            level,
            current_streak,
            longest_streak,
            last_activity_date,
            league_id,
            league_points,
            total_sales_amount,
            total_orders,
            total_customers
          `)
          .eq('id', resellerId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            console.log('[useGamificationProfile] Reseller not found');
            return null;
          }
          console.error('[useGamificationProfile] Error fetching profile:', error);
          throw error;
        }

        const resellerData = data as any;
        
        if (resellerData.league_id) {
          const { data: leagueData } = await supabase
            .from('gamification_leagues' as any)
            .select('*')
            .eq('id', resellerData.league_id)
            .single();

          if (leagueData) {
            resellerData.league = leagueData;
          }
        }

        return resellerData as ResellerGamificationData;
      } catch (error) {
        console.error('[useGamificationProfile] Error:', error);
        return null;
      }
    },
    enabled: !!resellerId && configured && !!supabase,
    staleTime: 30000,
  });
}

export function useResellerBadges(resellerId: string | undefined) {
  const { client: supabase, loading: supabaseLoading, configured } = useSupabase();
  
  return useQuery<ResellerBadge[]>({
    queryKey: ['reseller-badges', resellerId, configured],
    queryFn: async () => {
      if (supabaseLoading || !configured || !supabase || !resellerId) {
        console.log('[useResellerBadges] Supabase not configured or no resellerId');
        return [];
      }

      try {
        const { data, error } = await supabase
          .from('reseller_badges' as any)
          .select(`
            id,
            reseller_id,
            badge_id,
            earned_at,
            badge:gamification_badges(*)
          `)
          .eq('reseller_id', resellerId)
          .order('earned_at', { ascending: false });

        if (error) {
          if (error.message?.includes('does not exist')) {
            console.log('[useResellerBadges] Table not found');
            return [];
          }
          console.error('[useResellerBadges] Error fetching badges:', error);
          throw error;
        }

        return (data || []) as unknown as ResellerBadge[];
      } catch (error) {
        console.error('[useResellerBadges] Error:', error);
        return [];
      }
    },
    enabled: !!resellerId && configured && !!supabase,
    staleTime: 60000,
  });
}

export function useAvailableBadges() {
  const { client: supabase, loading: supabaseLoading, configured } = useSupabase();
  
  return useQuery<GamificationBadge[]>({
    queryKey: ['available-badges', configured],
    queryFn: async () => {
      if (supabaseLoading || !configured || !supabase) {
        console.log('[useAvailableBadges] Supabase not configured');
        return [];
      }

      try {
        const { data, error } = await supabase
          .from('gamification_badges' as any)
          .select('*')
          .eq('is_active', true)
          .order('category')
          .order('criteria_value');

        if (error) {
          if (error.message?.includes('does not exist')) {
            console.log('[useAvailableBadges] Table not found');
            return [];
          }
          console.error('[useAvailableBadges] Error fetching badges:', error);
          throw error;
        }

        return (data || []) as GamificationBadge[];
      } catch (error) {
        console.error('[useAvailableBadges] Error:', error);
        return [];
      }
    },
    enabled: configured && !!supabase,
    staleTime: 300000,
  });
}

export function useResellerChallenges(resellerId: string | undefined) {
  const { client: supabase, loading: supabaseLoading, configured } = useSupabase();
  
  return useQuery<ResellerChallenge[]>({
    queryKey: ['reseller-challenges', resellerId, configured],
    queryFn: async () => {
      if (supabaseLoading || !configured || !supabase || !resellerId) {
        console.log('[useResellerChallenges] Supabase not configured or no resellerId');
        return [];
      }

      try {
        const now = new Date().toISOString();
        
        const { data, error } = await supabase
          .from('reseller_challenges' as any)
          .select(`
            id,
            reseller_id,
            challenge_id,
            progress,
            is_completed,
            completed_at,
            period_start,
            period_end,
            started_at,
            challenge:gamification_challenges(*)
          `)
          .eq('reseller_id', resellerId)
          .gte('period_end', now)
          .order('period_end', { ascending: true });

        if (error) {
          if (error.message?.includes('does not exist')) {
            console.log('[useResellerChallenges] Table not found');
            return [];
          }
          console.error('[useResellerChallenges] Error fetching challenges:', error);
          throw error;
        }

        return (data || []) as unknown as ResellerChallenge[];
      } catch (error) {
        console.error('[useResellerChallenges] Error:', error);
        return [];
      }
    },
    enabled: !!resellerId && configured && !!supabase,
    staleTime: 60000,
  });
}

export function useRankings(period: 'weekly' | 'monthly') {
  const { client: supabase, loading: supabaseLoading, configured } = useSupabase();
  
  return useQuery<RankingEntry[]>({
    queryKey: ['rankings', period, configured],
    queryFn: async () => {
      if (supabaseLoading || !configured || !supabase) {
        console.log('[useRankings] Supabase not configured');
        return [];
      }

      try {
        const now = new Date();
        let startDate: Date;

        if (period === 'weekly') {
          const dayOfWeek = now.getDay();
          const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          startDate = new Date(now);
          startDate.setDate(now.getDate() - daysToSubtract);
          startDate.setHours(0, 0, 0, 0);
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        const { data, error } = await supabase
          .from('resellers' as any)
          .select(`
            id,
            nome,
            email,
            avatar_url,
            xp,
            level,
            current_streak,
            longest_streak,
            last_activity_date,
            league_id,
            league_points,
            total_sales_amount,
            total_orders,
            total_customers
          `)
          .gte('last_activity_date', startDate.toISOString())
          .order('xp', { ascending: false })
          .limit(100);

        if (error) {
          if (error.message?.includes('does not exist')) {
            console.log('[useRankings] Table not found');
            return [];
          }
          console.error('[useRankings] Error fetching rankings:', error);
          throw error;
        }

        const rankings: RankingEntry[] = (data || []).map((reseller: any, index: number) => ({
          position: index + 1,
          reseller: reseller as ResellerGamificationData,
          xp_period: reseller.xp || 0,
          sales_period: reseller.total_sales_amount || 0,
        }));

        return rankings;
      } catch (error) {
        console.error('[useRankings] Error:', error);
        return [];
      }
    },
    enabled: configured && !!supabase,
    staleTime: 60000,
  });
}

export function useLeagues() {
  const { client: supabase, loading: supabaseLoading, configured } = useSupabase();
  
  return useQuery<GamificationLeague[]>({
    queryKey: ['leagues', configured],
    queryFn: async () => {
      if (supabaseLoading || !configured || !supabase) {
        console.log('[useLeagues] Supabase not configured');
        return [];
      }

      try {
        const { data, error } = await supabase
          .from('gamification_leagues' as any)
          .select('*')
          .eq('is_active', true)
          .order('tier', { ascending: true });

        if (error) {
          if (error.message?.includes('does not exist')) {
            console.log('[useLeagues] Table not found');
            return [];
          }
          console.error('[useLeagues] Error fetching leagues:', error);
          throw error;
        }

        return (data || []) as GamificationLeague[];
      } catch (error) {
        console.error('[useLeagues] Error:', error);
        return [];
      }
    },
    enabled: configured && !!supabase,
    staleTime: 300000,
  });
}

export function useGamificationConfig() {
  const { client: supabase, loading: supabaseLoading, configured } = useSupabase();
  
  return useQuery<GamificationConfig | null>({
    queryKey: ['gamification-config', configured],
    queryFn: async () => {
      if (supabaseLoading || !configured || !supabase) {
        console.log('[useGamificationConfig] Supabase not configured');
        return null;
      }

      try {
        const { data, error } = await supabase
          .from('gamification_config' as any)
          .select('*')
          .limit(1)
          .maybeSingle();

        if (error) {
          if (error.message?.includes('does not exist')) {
            console.log('[useGamificationConfig] Table not found');
            return null;
          }
          console.error('[useGamificationConfig] Error fetching config:', error);
          throw error;
        }

        if (!data) {
          return {
            id: 'default',
            company_id: null,
            gamification_enabled: true,
            rewards_enabled: true,
            leagues_enabled: true,
            challenges_enabled: true,
            badges_enabled: true,
            xp_per_sale: 10,
            xp_new_customer_bonus: 50,
            streak_bonus_7_days: 100,
            streak_bonus_30_days: 500,
            level_rewards: {},
            ranking_rewards: {},
            badge_rewards: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as GamificationConfig;
        }

        return data as GamificationConfig;
      } catch (error) {
        console.error('[useGamificationConfig] Error:', error);
        return null;
      }
    },
    enabled: configured && !!supabase,
    staleTime: 300000,
  });
}

export function useGamificationActivities(resellerId: string | undefined, limit: number = 20) {
  const { client: supabase, loading: supabaseLoading, configured } = useSupabase();
  
  return useQuery<GamificationActivity[]>({
    queryKey: ['gamification-activities', resellerId, limit, configured],
    queryFn: async () => {
      if (supabaseLoading || !configured || !supabase || !resellerId) {
        console.log('[useGamificationActivities] Supabase not configured or no resellerId');
        return [];
      }

      try {
        const { data, error } = await supabase
          .from('gamification_activities' as any)
          .select('*')
          .eq('reseller_id', resellerId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) {
          if (error.message?.includes('does not exist')) {
            console.log('[useGamificationActivities] Table not found');
            return [];
          }
          console.error('[useGamificationActivities] Error fetching activities:', error);
          throw error;
        }

        return (data || []) as GamificationActivity[];
      } catch (error) {
        console.error('[useGamificationActivities] Error:', error);
        return [];
      }
    },
    enabled: !!resellerId && configured && !!supabase,
    staleTime: 30000,
  });
}

export function useGamificationStats(resellerId: string | undefined) {
  const { data: profile } = useGamificationProfile(resellerId);
  const { data: badges } = useResellerBadges(resellerId);
  const { data: availableBadges } = useAvailableBadges();
  const { data: challenges } = useResellerChallenges(resellerId);
  const { data: weeklyRankings } = useRankings('weekly');
  const { data: monthlyRankings } = useRankings('monthly');

  const weeklyRank = weeklyRankings?.find(r => r.reseller.id === resellerId)?.position || null;
  const monthlyRank = monthlyRankings?.find(r => r.reseller.id === resellerId)?.position || null;

  return {
    totalXp: profile?.xp || 0,
    level: profile?.level || 1,
    currentStreak: profile?.current_streak || 0,
    longestStreak: profile?.longest_streak || 0,
    badgesEarned: badges?.length || 0,
    totalBadges: availableBadges?.length || 0,
    challengesCompleted: challenges?.filter(c => c.is_completed).length || 0,
    activeChallenges: challenges?.filter(c => !c.is_completed).length || 0,
    weeklyRank,
    monthlyRank,
    leagueName: profile?.league?.name || null,
    leagueIcon: profile?.league?.icon || null,
    leaguePosition: null,
    xpProgress: profile ? calculateXpProgress(profile.xp, profile.level) : null,
  };
}
