import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

function getSupabaseConfig() {
  try {
    const savedConfig = localStorage.getItem('supabase_config');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      if (config.url && config.anonKey) {
        return { url: config.url, key: config.anonKey };
      }
    }
  } catch (error) {
    console.error('Error loading Supabase config from localStorage:', error);
  }
  
  return {
    url: import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
    key: import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'
  };
}

function createSupabaseClient() {
  const config = getSupabaseConfig();
  return createClient(config.url, config.key, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  });
}

export const getSupabase = () => {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient();
  }
  return supabaseInstance;
};

export const resetSupabase = () => {
  supabaseInstance = null;
};

export const supabase = getSupabase();
