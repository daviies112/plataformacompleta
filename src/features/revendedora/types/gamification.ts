export interface GamificationLevel {
  id: string;
  company_id: string | null;
  level: number;
  name: string;
  xp_required: number;
  badge_icon: string | null;
  color: string;
  reward_enabled: boolean;
  reward_type: string | null;
  reward_value: any;
  created_at: string;
  updated_at: string;
}

export interface GamificationBadge {
  id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  icon: string;
  category: 'sales' | 'streak' | 'customers' | 'referrals' | 'ranking' | 'special' | 'colares' | 'brincos' | 'aneis' | 'pulseiras';
  criteria_type: string;
  criteria_value: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xp_bonus: number;
  reward_enabled: boolean;
  reward_type: string | null;
  reward_value: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResellerBadge {
  id: string;
  reseller_id: string;
  badge_id: string;
  earned_at: string;
  badge?: GamificationBadge;
}

export interface GamificationLeague {
  id: string;
  company_id: string | null;
  name: string;
  tier: number;
  icon: string;
  color: string;
  max_members: number;
  promotion_slots: number;
  demotion_slots: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GamificationChallenge {
  id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  icon: string | null;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  frequency: 'one_time' | 'recurring';
  criteria_type: string;
  criteria_value: number;
  xp_reward: number;
  reward_enabled: boolean;
  reward_type: string | null;
  reward_value: any;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResellerChallenge {
  id: string;
  reseller_id: string;
  challenge_id: string;
  progress: number;
  is_completed: boolean;
  completed_at: string | null;
  period_start: string;
  period_end: string;
  started_at: string;
  challenge?: GamificationChallenge;
}

export interface GamificationReward {
  id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  type: 'discount' | 'product' | 'voucher' | 'gift' | 'access' | 'other';
  value: any;
  image_url: string | null;
  has_stock: boolean;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResellerReward {
  id: string;
  reseller_id: string;
  reward_id: string;
  status: 'available' | 'redeemed' | 'approved' | 'delivered' | 'cancelled';
  source: string;
  source_id: string | null;
  earned_at: string;
  redeemed_at: string | null;
  delivered_at: string | null;
  reward?: GamificationReward;
}

export interface GamificationActivity {
  id: string;
  reseller_id: string;
  type: 'badge_earned' | 'level_up' | 'challenge_completed' | 'streak_milestone' | 'ranking_position' | 'sale_milestone' | 'referral' | 'reward_earned';
  title: string;
  description: string | null;
  icon: string | null;
  metadata: any;
  created_at: string;
}

export interface GamificationConfig {
  id: string;
  company_id: string | null;
  gamification_enabled: boolean;
  rewards_enabled: boolean;
  leagues_enabled: boolean;
  challenges_enabled: boolean;
  badges_enabled: boolean;
  xp_per_sale: number;
  xp_new_customer_bonus: number;
  streak_bonus_7_days: number;
  streak_bonus_30_days: number;
  level_rewards: any;
  ranking_rewards: any;
  badge_rewards: any;
  created_at: string;
  updated_at: string;
}

export interface ResellerGamificationData {
  id: string;
  nome: string | null;
  email: string | null;
  avatar_url: string | null;
  xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  league_id: string | null;
  league_points: number;
  total_sales_amount: number;
  total_orders: number;
  total_customers: number;
  league?: GamificationLeague;
}

export interface RankingEntry {
  position: number;
  reseller: ResellerGamificationData;
  xp_period: number;
  sales_period: number;
}

export interface GamificationStats {
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  badgesEarned: number;
  totalBadges: number;
  challengesCompleted: number;
  activeChallenges: number;
  weeklyRank: number | null;
  monthlyRank: number | null;
  leagueName: string | null;
  leagueIcon: string | null;
  leaguePosition: number | null;
}
