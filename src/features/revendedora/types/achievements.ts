import { GamificationBadge } from './gamification';

export interface AchievementWithProgress extends GamificationBadge {
  currentProgress: number;
  targetValue: number;
  progressPercent: number;
  isEarned: boolean;
  earnedAt?: string | null;
  tier: number;
  nextTierBadge?: GamificationBadge | null;
}

export interface AchievementCategory {
  key: string;
  label: string;
  icon: string;
  description: string;
  color: string;
}

export const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = [
  {
    key: 'sales',
    label: 'Vendas',
    icon: '🛍️',
    description: 'Conquistas relacionadas ao número de vendas',
    color: 'from-green-500 to-emerald-600',
  },
  {
    key: 'amount',
    label: 'Faturamento',
    icon: '💰',
    description: 'Conquistas relacionadas ao valor total vendido',
    color: 'from-yellow-500 to-amber-600',
  },
  {
    key: 'streak',
    label: 'Sequência',
    icon: '🔥',
    description: 'Conquistas de dias consecutivos vendendo',
    color: 'from-orange-500 to-red-600',
  },
  {
    key: 'customers',
    label: 'Clientes',
    icon: '👥',
    description: 'Conquistas relacionadas a novos clientes',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    key: 'products',
    label: 'Produtos',
    icon: '💎',
    description: 'Conquistas por tipo de produto vendido',
    color: 'from-purple-500 to-pink-600',
  },
  {
    key: 'ranking',
    label: 'Ranking',
    icon: '🏆',
    description: 'Conquistas de posições no ranking',
    color: 'from-cyan-500 to-blue-600',
  },
  {
    key: 'special',
    label: 'Especiais',
    icon: '⭐',
    description: 'Conquistas especiais e eventos',
    color: 'from-pink-500 to-rose-600',
  },
];

export const JEWELRY_PRODUCTS = [
  { key: 'colar', label: 'Colares', icon: '📿', plural: 'colares' },
  { key: 'brinco', label: 'Brincos', icon: '💠', plural: 'brincos' },
  { key: 'anel', label: 'Anéis', icon: '💍', plural: 'anéis' },
  { key: 'pulseira', label: 'Pulseiras', icon: '⌚', plural: 'pulseiras' },
  { key: 'pingente', label: 'Pingentes', icon: '🔮', plural: 'pingentes' },
  { key: 'corrente', label: 'Correntes', icon: '⛓️', plural: 'correntes' },
  { key: 'conjunto', label: 'Conjuntos', icon: '👑', plural: 'conjuntos' },
];

export const ACHIEVEMENT_TIERS = [
  { tier: 1, multiplier: 1, label: 'Bronze', color: '#CD7F32' },
  { tier: 2, multiplier: 10, label: 'Prata', color: '#C0C0C0' },
  { tier: 3, multiplier: 50, label: 'Ouro', color: '#FFD700' },
  { tier: 4, multiplier: 100, label: 'Platina', color: '#E5E4E2' },
  { tier: 5, multiplier: 500, label: 'Diamante', color: '#B9F2FF' },
  { tier: 6, multiplier: 1000, label: 'Lenda', color: '#FF6B6B' },
];
