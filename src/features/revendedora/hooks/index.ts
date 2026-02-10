// ============================================================================
// REVENDEDORA HOOKS - COMPLETE EXPORT
// ============================================================================

// Core Hooks
export { useCommissionConfig } from './useCommissionConfig';
export { useNotifications } from './useNotifications';
export { useProductAnalytics } from './useProductAnalytics';
export { useResellerAnalytics } from './useResellerAnalytics';
export { useResellerAlerts, DROP_THRESHOLD } from './useResellerAlerts';
export { useResellerProfile, usePublicResellerProfile } from './useResellerProfile';

// Financial Hooks
export { useBankAccounts, BRAZILIAN_BANKS, PIX_KEY_TYPES, ACCOUNT_TYPES } from './useBankAccounts';
export { useFinancialSummary } from './useFinancialSummary';
export { useWithdrawals, WITHDRAWAL_STATUS } from './useWithdrawals';

// Inventory & Analytics
export { useInventoryForecasting } from './useInventoryForecasting';

// Communication
export { useChat } from './useChat';

// Branding
export { useBranding, applyBrandingColors } from './useBranding';
export { useCompanyBranding } from './useCompanyBranding';

// Achievements
export { useResellerStats, useAchievementsWithProgress } from './useAchievements';

// Gamification - Named exports
export {
  useGamificationProfile,
  useResellerBadges,
  useAvailableBadges,
  useResellerChallenges,
  useRankings,
  useLeagues,
  useGamificationConfig,
  useGamificationActivities,
  useGamificationStats,
  calculateXpForLevel,
  calculateXpProgress,
} from './useGamification';

// UI Hooks
export { useToast } from './use-toast';
export { useIsMobile } from './use-mobile';

// Utility Hooks - Placeholder implementations
export const useAnalytics = () => {
  return {
    data: null,
    loading: false,
    error: null,
  };
};

export const useImageUpload = () => {
  return {
    uploadImage: async (file: File, options: { bucket: string; folder?: string; maxSizeMB?: number }) => {
      return 'https://via.placeholder.com/300';
    },
    deleteImage: async (url: string, bucket: string) => {
      return true;
    },
    uploading: false,
    progress: 0,
    error: null,
  };
};

// Alias for useAchievementsWithProgress (backward compatibility)
export { useAchievementsWithProgress as useAchievements } from './useAchievements';
