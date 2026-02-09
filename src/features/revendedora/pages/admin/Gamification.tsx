import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGamificationConfig, useAvailableBadges, useRankings, useLeagues } from '@/hooks/useGamification';
import { RankingList } from '@/components/gamification';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Settings,
  Award,
  Target,
  Gift,
  Trophy,
  Plus,
  Edit,
  Trash2,
  Users,
  Zap,
  TrendingUp,
  BarChart3,
  Flame,
  Medal,
  Save,
  Loader2,
} from 'lucide-react';
import type {
  GamificationConfig,
  GamificationBadge,
  GamificationChallenge,
  GamificationReward,
} from '@/types/gamification';

const badgeCategories = [
  { value: 'sales', label: 'Vendas' },
  { value: 'streak', label: 'Sequência' },
  { value: 'customers', label: 'Clientes' },
  { value: 'referrals', label: 'Indicações' },
  { value: 'ranking', label: 'Ranking' },
  { value: 'special', label: 'Especial' },
];

const badgeRarities = [
  { value: 'common', label: 'Comum', color: 'bg-gray-500' },
  { value: 'rare', label: 'Raro', color: 'bg-blue-500' },
  { value: 'epic', label: 'Épico', color: 'bg-purple-500' },
  { value: 'legendary', label: 'Lendário', color: 'bg-yellow-500' },
];

const challengeTypes = [
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'special', label: 'Especial' },
];

const rewardTypes = [
  { value: 'discount', label: 'Desconto' },
  { value: 'product', label: 'Produto' },
  { value: 'voucher', label: 'Vale' },
  { value: 'gift', label: 'Presente' },
  { value: 'access', label: 'Acesso' },
  { value: 'other', label: 'Outro' },
];

export default function AdminGamification() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [rankingPeriod, setRankingPeriod] = useState<'weekly' | 'monthly'>('weekly');

  const { data: config, isLoading: configLoading } = useGamificationConfig();
  const { data: weeklyRankings, isLoading: weeklyRankingsLoading } = useRankings('weekly');
  const { data: monthlyRankings, isLoading: monthlyRankingsLoading } = useRankings('monthly');
  const { data: leagues } = useLeagues();

  const [allBadges, setAllBadges] = useState<GamificationBadge[]>([]);
  const [allChallenges, setAllChallenges] = useState<GamificationChallenge[]>([]);
  const [allRewards, setAllRewards] = useState<GamificationReward[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [configForm, setConfigForm] = useState<Partial<GamificationConfig>>({});
  const [savingConfig, setSavingConfig] = useState(false);

  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<GamificationBadge | null>(null);
  const [badgeForm, setBadgeForm] = useState({
    name: '',
    description: '',
    icon: '🏆',
    category: 'sales' as GamificationBadge['category'],
    criteria_type: 'sales_count',
    criteria_value: 1,
    rarity: 'common' as GamificationBadge['rarity'],
    xp_bonus: 100,
    is_active: true,
  });
  const [savingBadge, setSavingBadge] = useState(false);

  const [challengeDialogOpen, setChallengeDialogOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<GamificationChallenge | null>(null);
  const [challengeForm, setChallengeForm] = useState({
    name: '',
    description: '',
    icon: '🎯',
    type: 'daily' as GamificationChallenge['type'],
    frequency: 'recurring' as 'one_time' | 'recurring',
    criteria_type: 'sales_count',
    criteria_value: 1,
    xp_reward: 50,
    is_active: true,
  });
  const [savingChallenge, setSavingChallenge] = useState(false);

  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<GamificationReward | null>(null);
  const [rewardForm, setRewardForm] = useState({
    name: '',
    description: '',
    type: 'discount' as GamificationReward['type'],
    value: {},
    has_stock: false,
    stock_quantity: 0,
    is_active: true,
  });
  const [savingReward, setSavingReward] = useState(false);

  useEffect(() => {
    if (config) {
      setConfigForm(config);
    }
  }, [config]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoadingData(true);
    try {
      await Promise.all([
        loadAllBadges(),
        loadAllChallenges(),
        loadAllRewards(),
      ]);
    } finally {
      setLoadingData(false);
    }
  };

  const loadAllBadges = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('gamification_badges' as any)
        .select('*')
        .order('category')
        .order('criteria_value');
      if (error) throw error;
      setAllBadges((data || []) as GamificationBadge[]);
    } catch (error) {
      console.error('Error loading badges:', error);
    }
  };

  const loadAllChallenges = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('gamification_challenges' as any)
        .select('*')
        .order('type')
        .order('name');
      if (error) throw error;
      setAllChallenges((data || []) as GamificationChallenge[]);
    } catch (error) {
      console.error('Error loading challenges:', error);
    }
  };

  const loadAllRewards = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('gamification_rewards' as any)
        .select('*')
        .order('name');
      if (error) throw error;
      setAllRewards((data || []) as GamificationReward[]);
    } catch (error) {
      console.error('Error loading rewards:', error);
    }
  };

  const handleSaveConfig = async () => {
    if (!supabase || !configForm) return;
    setSavingConfig(true);
    try {
      const updateData = {
        gamification_enabled: configForm.gamification_enabled,
        rewards_enabled: configForm.rewards_enabled,
        leagues_enabled: configForm.leagues_enabled,
        challenges_enabled: configForm.challenges_enabled,
        badges_enabled: configForm.badges_enabled,
        xp_per_sale: configForm.xp_per_sale,
        xp_new_customer_bonus: configForm.xp_new_customer_bonus,
        streak_bonus_7_days: configForm.streak_bonus_7_days,
        streak_bonus_30_days: configForm.streak_bonus_30_days,
        updated_at: new Date().toISOString(),
      };

      if (config?.id && config.id !== 'default') {
        const { error } = await supabase
          .from('gamification_config' as any)
          .update(updateData)
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('gamification_config' as any)
          .insert([updateData]);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['gamification-config'] });
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleOpenBadgeDialog = (badge?: GamificationBadge) => {
    if (badge) {
      setEditingBadge(badge);
      setBadgeForm({
        name: badge.name,
        description: badge.description || '',
        icon: badge.icon,
        category: badge.category,
        criteria_type: badge.criteria_type,
        criteria_value: badge.criteria_value,
        rarity: badge.rarity,
        xp_bonus: badge.xp_bonus,
        is_active: badge.is_active,
      });
    } else {
      setEditingBadge(null);
      setBadgeForm({
        name: '',
        description: '',
        icon: '🏆',
        category: 'sales',
        criteria_type: 'sales_count',
        criteria_value: 1,
        rarity: 'common',
        xp_bonus: 100,
        is_active: true,
      });
    }
    setBadgeDialogOpen(true);
  };

  const handleSaveBadge = async () => {
    if (!supabase) return;
    setSavingBadge(true);
    try {
      const badgeData = {
        name: badgeForm.name,
        description: badgeForm.description || null,
        icon: badgeForm.icon,
        category: badgeForm.category,
        criteria_type: badgeForm.criteria_type,
        criteria_value: badgeForm.criteria_value,
        rarity: badgeForm.rarity,
        xp_bonus: badgeForm.xp_bonus,
        is_active: badgeForm.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingBadge) {
        const { error } = await supabase
          .from('gamification_badges' as any)
          .update(badgeData)
          .eq('id', editingBadge.id);
        if (error) throw error;
        toast.success('Badge atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('gamification_badges' as any)
          .insert([badgeData]);
        if (error) throw error;
        toast.success('Badge criado com sucesso!');
      }

      setBadgeDialogOpen(false);
      loadAllBadges();
      queryClient.invalidateQueries({ queryKey: ['available-badges'] });
    } catch (error) {
      console.error('Error saving badge:', error);
      toast.error('Erro ao salvar badge');
    } finally {
      setSavingBadge(false);
    }
  };

  const handleToggleBadge = async (badge: GamificationBadge) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('gamification_badges' as any)
        .update({ is_active: !badge.is_active, updated_at: new Date().toISOString() })
        .eq('id', badge.id);
      if (error) throw error;
      toast.success(badge.is_active ? 'Badge desativado' : 'Badge ativado');
      loadAllBadges();
      queryClient.invalidateQueries({ queryKey: ['available-badges'] });
    } catch (error) {
      console.error('Error toggling badge:', error);
      toast.error('Erro ao alterar status do badge');
    }
  };

  const handleDeleteBadge = async (badge: GamificationBadge) => {
    if (!supabase) return;
    if (!confirm(`Tem certeza que deseja excluir o badge "${badge.name}"?`)) return;
    try {
      const { error } = await supabase
        .from('gamification_badges' as any)
        .delete()
        .eq('id', badge.id);
      if (error) throw error;
      toast.success('Badge excluído com sucesso!');
      loadAllBadges();
      queryClient.invalidateQueries({ queryKey: ['available-badges'] });
    } catch (error) {
      console.error('Error deleting badge:', error);
      toast.error('Erro ao excluir badge');
    }
  };

  const handleOpenChallengeDialog = (challenge?: GamificationChallenge) => {
    if (challenge) {
      setEditingChallenge(challenge);
      setChallengeForm({
        name: challenge.name,
        description: challenge.description || '',
        icon: challenge.icon || '🎯',
        type: challenge.type,
        frequency: challenge.frequency,
        criteria_type: challenge.criteria_type,
        criteria_value: challenge.criteria_value,
        xp_reward: challenge.xp_reward,
        is_active: challenge.is_active,
      });
    } else {
      setEditingChallenge(null);
      setChallengeForm({
        name: '',
        description: '',
        icon: '🎯',
        type: 'daily',
        frequency: 'recurring',
        criteria_type: 'sales_count',
        criteria_value: 1,
        xp_reward: 50,
        is_active: true,
      });
    }
    setChallengeDialogOpen(true);
  };

  const handleSaveChallenge = async () => {
    if (!supabase) return;
    setSavingChallenge(true);
    try {
      const challengeData = {
        name: challengeForm.name,
        description: challengeForm.description || null,
        icon: challengeForm.icon,
        type: challengeForm.type,
        frequency: challengeForm.frequency,
        criteria_type: challengeForm.criteria_type,
        criteria_value: challengeForm.criteria_value,
        xp_reward: challengeForm.xp_reward,
        is_active: challengeForm.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingChallenge) {
        const { error } = await supabase
          .from('gamification_challenges' as any)
          .update(challengeData)
          .eq('id', editingChallenge.id);
        if (error) throw error;
        toast.success('Desafio atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('gamification_challenges' as any)
          .insert([challengeData]);
        if (error) throw error;
        toast.success('Desafio criado com sucesso!');
      }

      setChallengeDialogOpen(false);
      loadAllChallenges();
    } catch (error) {
      console.error('Error saving challenge:', error);
      toast.error('Erro ao salvar desafio');
    } finally {
      setSavingChallenge(false);
    }
  };

  const handleToggleChallenge = async (challenge: GamificationChallenge) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('gamification_challenges' as any)
        .update({ is_active: !challenge.is_active, updated_at: new Date().toISOString() })
        .eq('id', challenge.id);
      if (error) throw error;
      toast.success(challenge.is_active ? 'Desafio desativado' : 'Desafio ativado');
      loadAllChallenges();
    } catch (error) {
      console.error('Error toggling challenge:', error);
      toast.error('Erro ao alterar status do desafio');
    }
  };

  const handleDeleteChallenge = async (challenge: GamificationChallenge) => {
    if (!supabase) return;
    if (!confirm(`Tem certeza que deseja excluir o desafio "${challenge.name}"?`)) return;
    try {
      const { error } = await supabase
        .from('gamification_challenges' as any)
        .delete()
        .eq('id', challenge.id);
      if (error) throw error;
      toast.success('Desafio excluído com sucesso!');
      loadAllChallenges();
    } catch (error) {
      console.error('Error deleting challenge:', error);
      toast.error('Erro ao excluir desafio');
    }
  };

  const handleOpenRewardDialog = (reward?: GamificationReward) => {
    if (reward) {
      setEditingReward(reward);
      setRewardForm({
        name: reward.name,
        description: reward.description || '',
        type: reward.type,
        value: reward.value || {},
        has_stock: reward.has_stock,
        stock_quantity: reward.stock_quantity,
        is_active: reward.is_active,
      });
    } else {
      setEditingReward(null);
      setRewardForm({
        name: '',
        description: '',
        type: 'discount',
        value: {},
        has_stock: false,
        stock_quantity: 0,
        is_active: true,
      });
    }
    setRewardDialogOpen(true);
  };

  const handleSaveReward = async () => {
    if (!supabase) return;
    setSavingReward(true);
    try {
      const rewardData = {
        name: rewardForm.name,
        description: rewardForm.description || null,
        type: rewardForm.type,
        value: rewardForm.value,
        has_stock: rewardForm.has_stock,
        stock_quantity: rewardForm.stock_quantity,
        is_active: rewardForm.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingReward) {
        const { error } = await supabase
          .from('gamification_rewards' as any)
          .update(rewardData)
          .eq('id', editingReward.id);
        if (error) throw error;
        toast.success('Prêmio atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('gamification_rewards' as any)
          .insert([rewardData]);
        if (error) throw error;
        toast.success('Prêmio criado com sucesso!');
      }

      setRewardDialogOpen(false);
      loadAllRewards();
    } catch (error) {
      console.error('Error saving reward:', error);
      toast.error('Erro ao salvar prêmio');
    } finally {
      setSavingReward(false);
    }
  };

  const handleToggleReward = async (reward: GamificationReward) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('gamification_rewards' as any)
        .update({ is_active: !reward.is_active, updated_at: new Date().toISOString() })
        .eq('id', reward.id);
      if (error) throw error;
      toast.success(reward.is_active ? 'Prêmio desativado' : 'Prêmio ativado');
      loadAllRewards();
    } catch (error) {
      console.error('Error toggling reward:', error);
      toast.error('Erro ao alterar status do prêmio');
    }
  };

  const handleDeleteReward = async (reward: GamificationReward) => {
    if (!supabase) return;
    if (!confirm(`Tem certeza que deseja excluir o prêmio "${reward.name}"?`)) return;
    try {
      const { error } = await supabase
        .from('gamification_rewards' as any)
        .delete()
        .eq('id', reward.id);
      if (error) throw error;
      toast.success('Prêmio excluído com sucesso!');
      loadAllRewards();
    } catch (error) {
      console.error('Error deleting reward:', error);
      toast.error('Erro ao excluir prêmio');
    }
  };

  const getRarityBadge = (rarity: string) => {
    const rarityConfig = badgeRarities.find(r => r.value === rarity);
    return (
      <Badge className={`${rarityConfig?.color || 'bg-gray-500'} text-white`}>
        {rarityConfig?.label || rarity}
      </Badge>
    );
  };

  const getChallengeTypeBadge = (type: string) => {
    const typeConfig = challengeTypes.find(t => t.value === type);
    const colors: Record<string, string> = {
      daily: 'bg-green-500',
      weekly: 'bg-blue-500',
      monthly: 'bg-purple-500',
      special: 'bg-yellow-500',
    };
    return (
      <Badge className={`${colors[type] || 'bg-gray-500'} text-white`}>
        {typeConfig?.label || type}
      </Badge>
    );
  };

  const getRewardTypeBadge = (type: string) => {
    const typeConfig = rewardTypes.find(t => t.value === type);
    const colors: Record<string, string> = {
      discount: 'bg-green-500',
      product: 'bg-blue-500',
      voucher: 'bg-purple-500',
      gift: 'bg-pink-500',
      access: 'bg-cyan-500',
      other: 'bg-gray-500',
    };
    return (
      <Badge className={`${colors[type] || 'bg-gray-500'} text-white`}>
        {typeConfig?.label || type}
      </Badge>
    );
  };

  const totalXpDistributed = weeklyRankings?.reduce((sum, r) => sum + (r.xp_period || 0), 0) || 0;
  const activeUsers = weeklyRankings?.length || 0;
  const activeBadges = allBadges.filter(b => b.is_active).length;
  const activeChallenges = allChallenges.filter(c => c.is_active).length;

  if (configLoading || loadingData) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Trophy className="h-8 w-8 text-yellow-500" />
          Gamificação
        </h1>
        <p className="text-muted-foreground">
          Configure o sistema de gamificação, badges, desafios e recompensas
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6 max-w-4xl">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configurações</span>
          </TabsTrigger>
          <TabsTrigger value="badges" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">Badges</span>
          </TabsTrigger>
          <TabsTrigger value="challenges" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Desafios</span>
          </TabsTrigger>
          {config?.rewards_enabled && (
            <TabsTrigger value="rewards" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              <span className="hidden sm:inline">Prêmios</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="rankings" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Rankings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeUsers}</div>
                <p className="text-xs text-muted-foreground">Participantes esta semana</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">XP Distribuído</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{totalXpDistributed.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Total esta semana</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Badges Ativos</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{activeBadges}</div>
                <p className="text-xs text-muted-foreground">De {allBadges.length} cadastrados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Desafios Ativos</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{activeChallenges}</div>
                <p className="text-xs text-muted-foreground">De {allChallenges.length} cadastrados</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Medal className="h-5 w-5 text-yellow-500" />
                  Badges Mais Conquistados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {allBadges.filter(b => b.is_active).slice(0, 5).length > 0 ? (
                  <div className="space-y-3">
                    {allBadges.filter(b => b.is_active).slice(0, 5).map(badge => (
                      <div key={badge.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        <span className="text-2xl">{badge.icon}</span>
                        <div className="flex-1">
                          <p className="font-medium">{badge.name}</p>
                          <p className="text-xs text-muted-foreground">{badge.description}</p>
                        </div>
                        {getRarityBadge(badge.rarity)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Nenhum badge cadastrado ainda</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  Desafios em Destaque
                </CardTitle>
              </CardHeader>
              <CardContent>
                {allChallenges.filter(c => c.is_active).slice(0, 5).length > 0 ? (
                  <div className="space-y-3">
                    {allChallenges.filter(c => c.is_active).slice(0, 5).map(challenge => (
                      <div key={challenge.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        <span className="text-2xl">{challenge.icon || '🎯'}</span>
                        <div className="flex-1">
                          <p className="font-medium">{challenge.name}</p>
                          <p className="text-xs text-muted-foreground">+{challenge.xp_reward} XP</p>
                        </div>
                        {getChallengeTypeBadge(challenge.type)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Nenhum desafio cadastrado ainda</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                Top 10 Ranking Semanal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyRankingsLoading ? (
                <Skeleton className="h-64" />
              ) : (
                <RankingList
                  rankings={weeklyRankings?.slice(0, 10) || []}
                  title="Ranking Semanal"
                  className="border-0 shadow-none"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações de Gamificação
              </CardTitle>
              <CardDescription>
                Configure os módulos e valores do sistema de gamificação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Módulos</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label htmlFor="gamification_enabled" className="font-medium">Gamificação</Label>
                      <p className="text-xs text-muted-foreground">Ativar sistema de gamificação</p>
                    </div>
                    <Switch
                      id="gamification_enabled"
                      checked={configForm.gamification_enabled ?? true}
                      onCheckedChange={(checked) => setConfigForm({ ...configForm, gamification_enabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label htmlFor="badges_enabled" className="font-medium">Badges</Label>
                      <p className="text-xs text-muted-foreground">Sistema de conquistas</p>
                    </div>
                    <Switch
                      id="badges_enabled"
                      checked={configForm.badges_enabled ?? true}
                      onCheckedChange={(checked) => setConfigForm({ ...configForm, badges_enabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label htmlFor="challenges_enabled" className="font-medium">Desafios</Label>
                      <p className="text-xs text-muted-foreground">Sistema de desafios</p>
                    </div>
                    <Switch
                      id="challenges_enabled"
                      checked={configForm.challenges_enabled ?? true}
                      onCheckedChange={(checked) => setConfigForm({ ...configForm, challenges_enabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label htmlFor="leagues_enabled" className="font-medium">Ligas</Label>
                      <p className="text-xs text-muted-foreground">Sistema de ligas competitivas</p>
                    </div>
                    <Switch
                      id="leagues_enabled"
                      checked={configForm.leagues_enabled ?? true}
                      onCheckedChange={(checked) => setConfigForm({ ...configForm, leagues_enabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label htmlFor="rewards_enabled" className="font-medium">Prêmios</Label>
                      <p className="text-xs text-muted-foreground">Sistema de recompensas</p>
                    </div>
                    <Switch
                      id="rewards_enabled"
                      checked={configForm.rewards_enabled ?? true}
                      onCheckedChange={(checked) => setConfigForm({ ...configForm, rewards_enabled: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Configurações de XP</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="xp_per_sale">XP por Venda</Label>
                    <Input
                      id="xp_per_sale"
                      type="number"
                      min="0"
                      value={configForm.xp_per_sale ?? 10}
                      onChange={(e) => setConfigForm({ ...configForm, xp_per_sale: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-muted-foreground">XP ganho a cada venda realizada</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="xp_new_customer_bonus">Bônus Novo Cliente</Label>
                    <Input
                      id="xp_new_customer_bonus"
                      type="number"
                      min="0"
                      value={configForm.xp_new_customer_bonus ?? 50}
                      onChange={(e) => setConfigForm({ ...configForm, xp_new_customer_bonus: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-muted-foreground">XP extra por venda para novo cliente</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Bônus de Sequência</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="streak_bonus_7_days">Bônus 7 Dias</Label>
                    <Input
                      id="streak_bonus_7_days"
                      type="number"
                      min="0"
                      value={configForm.streak_bonus_7_days ?? 100}
                      onChange={(e) => setConfigForm({ ...configForm, streak_bonus_7_days: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-muted-foreground">XP bônus por 7 dias consecutivos</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="streak_bonus_30_days">Bônus 30 Dias</Label>
                    <Input
                      id="streak_bonus_30_days"
                      type="number"
                      min="0"
                      value={configForm.streak_bonus_30_days ?? 500}
                      onChange={(e) => setConfigForm({ ...configForm, streak_bonus_30_days: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-muted-foreground">XP bônus por 30 dias consecutivos</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveConfig} disabled={savingConfig}>
                  {savingConfig ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="badges" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  Gerenciar Badges
                </CardTitle>
                <CardDescription>
                  Configure as conquistas disponíveis para os revendedores
                </CardDescription>
              </div>
              <Button onClick={() => handleOpenBadgeDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Badge
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ícone</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Raridade</TableHead>
                    <TableHead>Critério</TableHead>
                    <TableHead>XP Bônus</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allBadges.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <Award className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">Nenhum badge cadastrado ainda</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    allBadges.map(badge => (
                      <TableRow key={badge.id}>
                        <TableCell className="text-2xl">{badge.icon}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{badge.name}</p>
                            {badge.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{badge.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {badgeCategories.find(c => c.value === badge.category)?.label || badge.category}
                          </Badge>
                        </TableCell>
                        <TableCell>{getRarityBadge(badge.rarity)}</TableCell>
                        <TableCell>
                          <span className="text-sm">{badge.criteria_type}: {badge.criteria_value}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-purple-600">+{badge.xp_bonus} XP</span>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={badge.is_active}
                            onCheckedChange={() => handleToggleBadge(badge)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenBadgeDialog(badge)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteBadge(badge)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="challenges" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-500" />
                  Gerenciar Desafios
                </CardTitle>
                <CardDescription>
                  Configure os desafios disponíveis para os revendedores
                </CardDescription>
              </div>
              <Button onClick={() => handleOpenChallengeDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Desafio
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ícone</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Critério</TableHead>
                    <TableHead>XP Recompensa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allChallenges.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">Nenhum desafio cadastrado ainda</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    allChallenges.map(challenge => (
                      <TableRow key={challenge.id}>
                        <TableCell className="text-2xl">{challenge.icon || '🎯'}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{challenge.name}</p>
                            {challenge.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{challenge.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getChallengeTypeBadge(challenge.type)}</TableCell>
                        <TableCell>
                          <span className="text-sm">{challenge.criteria_type}: {challenge.criteria_value}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-green-600">+{challenge.xp_reward} XP</span>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={challenge.is_active}
                            onCheckedChange={() => handleToggleChallenge(challenge)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenChallengeDialog(challenge)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteChallenge(challenge)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {config?.rewards_enabled && (
          <TabsContent value="rewards" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-pink-500" />
                    Gerenciar Prêmios
                  </CardTitle>
                  <CardDescription>
                    Configure os prêmios disponíveis para resgate
                  </CardDescription>
                </div>
                <Button onClick={() => handleOpenRewardDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Prêmio
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estoque</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allRewards.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-muted-foreground">Nenhum prêmio cadastrado ainda</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      allRewards.map(reward => (
                        <TableRow key={reward.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{reward.name}</p>
                              {reward.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">{reward.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getRewardTypeBadge(reward.type)}</TableCell>
                          <TableCell>
                            {reward.has_stock ? (
                              <Badge variant={reward.stock_quantity > 0 ? 'default' : 'destructive'}>
                                {reward.stock_quantity} un.
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Ilimitado</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={reward.is_active}
                              onCheckedChange={() => handleToggleReward(reward)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenRewardDialog(reward)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteReward(reward)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="rankings" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Rankings de Revendedores
                  </CardTitle>
                  <CardDescription>
                    Acompanhe o desempenho dos revendedores
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={rankingPeriod === 'weekly' ? 'default' : 'outline'}
                    onClick={() => setRankingPeriod('weekly')}
                  >
                    Semanal
                  </Button>
                  <Button
                    variant={rankingPeriod === 'monthly' ? 'default' : 'outline'}
                    onClick={() => setRankingPeriod('monthly')}
                  >
                    Mensal
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(rankingPeriod === 'weekly' ? weeklyRankingsLoading : monthlyRankingsLoading) ? (
                <Skeleton className="h-96" />
              ) : (
                <RankingList
                  rankings={rankingPeriod === 'weekly' ? (weeklyRankings || []) : (monthlyRankings || [])}
                  title={rankingPeriod === 'weekly' ? 'Ranking Semanal' : 'Ranking Mensal'}
                  className="border-0 shadow-none"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={badgeDialogOpen} onOpenChange={setBadgeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBadge ? 'Editar Badge' : 'Novo Badge'}</DialogTitle>
            <DialogDescription>
              {editingBadge ? 'Atualize as informações do badge' : 'Preencha as informações do novo badge'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="badge-icon">Ícone (Emoji)</Label>
                <Input
                  id="badge-icon"
                  value={badgeForm.icon}
                  onChange={(e) => setBadgeForm({ ...badgeForm, icon: e.target.value })}
                  placeholder="🏆"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="badge-name">Nome</Label>
                <Input
                  id="badge-name"
                  value={badgeForm.name}
                  onChange={(e) => setBadgeForm({ ...badgeForm, name: e.target.value })}
                  placeholder="Nome do badge"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="badge-description">Descrição</Label>
              <Input
                id="badge-description"
                value={badgeForm.description}
                onChange={(e) => setBadgeForm({ ...badgeForm, description: e.target.value })}
                placeholder="Descrição do badge"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={badgeForm.category} onValueChange={(v) => setBadgeForm({ ...badgeForm, category: v as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {badgeCategories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Raridade</Label>
                <Select value={badgeForm.rarity} onValueChange={(v) => setBadgeForm({ ...badgeForm, rarity: v as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {badgeRarities.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="badge-criteria-type">Tipo de Critério</Label>
                <Input
                  id="badge-criteria-type"
                  value={badgeForm.criteria_type}
                  onChange={(e) => setBadgeForm({ ...badgeForm, criteria_type: e.target.value })}
                  placeholder="sales_count"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="badge-criteria-value">Valor do Critério</Label>
                <Input
                  id="badge-criteria-value"
                  type="number"
                  min="1"
                  value={badgeForm.criteria_value}
                  onChange={(e) => setBadgeForm({ ...badgeForm, criteria_value: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="badge-xp">XP Bônus</Label>
              <Input
                id="badge-xp"
                type="number"
                min="0"
                value={badgeForm.xp_bonus}
                onChange={(e) => setBadgeForm({ ...badgeForm, xp_bonus: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="badge-active"
                checked={badgeForm.is_active}
                onCheckedChange={(checked) => setBadgeForm({ ...badgeForm, is_active: checked })}
              />
              <Label htmlFor="badge-active">Badge ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBadgeDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveBadge} disabled={savingBadge || !badgeForm.name}>
              {savingBadge ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={challengeDialogOpen} onOpenChange={setChallengeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingChallenge ? 'Editar Desafio' : 'Novo Desafio'}</DialogTitle>
            <DialogDescription>
              {editingChallenge ? 'Atualize as informações do desafio' : 'Preencha as informações do novo desafio'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="challenge-icon">Ícone (Emoji)</Label>
                <Input
                  id="challenge-icon"
                  value={challengeForm.icon}
                  onChange={(e) => setChallengeForm({ ...challengeForm, icon: e.target.value })}
                  placeholder="🎯"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="challenge-name">Nome</Label>
                <Input
                  id="challenge-name"
                  value={challengeForm.name}
                  onChange={(e) => setChallengeForm({ ...challengeForm, name: e.target.value })}
                  placeholder="Nome do desafio"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="challenge-description">Descrição</Label>
              <Input
                id="challenge-description"
                value={challengeForm.description}
                onChange={(e) => setChallengeForm({ ...challengeForm, description: e.target.value })}
                placeholder="Descrição do desafio"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={challengeForm.type} onValueChange={(v) => setChallengeForm({ ...challengeForm, type: v as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {challengeTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select value={challengeForm.frequency} onValueChange={(v) => setChallengeForm({ ...challengeForm, frequency: v as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">Única vez</SelectItem>
                    <SelectItem value="recurring">Recorrente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="challenge-criteria-type">Tipo de Critério</Label>
                <Input
                  id="challenge-criteria-type"
                  value={challengeForm.criteria_type}
                  onChange={(e) => setChallengeForm({ ...challengeForm, criteria_type: e.target.value })}
                  placeholder="sales_count"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="challenge-criteria-value">Valor do Critério</Label>
                <Input
                  id="challenge-criteria-value"
                  type="number"
                  min="1"
                  value={challengeForm.criteria_value}
                  onChange={(e) => setChallengeForm({ ...challengeForm, criteria_value: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="challenge-xp">XP Recompensa</Label>
              <Input
                id="challenge-xp"
                type="number"
                min="0"
                value={challengeForm.xp_reward}
                onChange={(e) => setChallengeForm({ ...challengeForm, xp_reward: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="challenge-active"
                checked={challengeForm.is_active}
                onCheckedChange={(checked) => setChallengeForm({ ...challengeForm, is_active: checked })}
              />
              <Label htmlFor="challenge-active">Desafio ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChallengeDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveChallenge} disabled={savingChallenge || !challengeForm.name}>
              {savingChallenge ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rewardDialogOpen} onOpenChange={setRewardDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingReward ? 'Editar Prêmio' : 'Novo Prêmio'}</DialogTitle>
            <DialogDescription>
              {editingReward ? 'Atualize as informações do prêmio' : 'Preencha as informações do novo prêmio'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reward-name">Nome</Label>
              <Input
                id="reward-name"
                value={rewardForm.name}
                onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                placeholder="Nome do prêmio"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reward-description">Descrição</Label>
              <Input
                id="reward-description"
                value={rewardForm.description}
                onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
                placeholder="Descrição do prêmio"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={rewardForm.type} onValueChange={(v) => setRewardForm({ ...rewardForm, type: v as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rewardTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="reward-has-stock"
                checked={rewardForm.has_stock}
                onCheckedChange={(checked) => setRewardForm({ ...rewardForm, has_stock: checked })}
              />
              <Label htmlFor="reward-has-stock">Controlar estoque</Label>
            </div>
            {rewardForm.has_stock && (
              <div className="space-y-2">
                <Label htmlFor="reward-stock">Quantidade em Estoque</Label>
                <Input
                  id="reward-stock"
                  type="number"
                  min="0"
                  value={rewardForm.stock_quantity}
                  onChange={(e) => setRewardForm({ ...rewardForm, stock_quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch
                id="reward-active"
                checked={rewardForm.is_active}
                onCheckedChange={(checked) => setRewardForm({ ...rewardForm, is_active: checked })}
              />
              <Label htmlFor="reward-active">Prêmio ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRewardDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveReward} disabled={savingReward || !rewardForm.name}>
              {savingReward ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
