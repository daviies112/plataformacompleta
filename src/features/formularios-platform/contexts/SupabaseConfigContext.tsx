import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

interface SupabaseConfigContextType {
  config: SupabaseConfig | null;
  saveConfig: (config: SupabaseConfig) => void;
  clearConfig: () => void;
  isConfigured: boolean;
}

const SupabaseConfigContext = createContext<SupabaseConfigContextType | undefined>(undefined);

const STORAGE_KEY = 'supabase_config';

export function SupabaseConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SupabaseConfig | null>(null);

  useEffect(() => {
    const savedConfig = localStorage.getItem(STORAGE_KEY);
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (error) {
        console.error('Error loading Supabase config:', error);
      }
    }
  }, []);

  const saveConfig = (newConfig: SupabaseConfig) => {
    setConfig(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
  };

  const clearConfig = () => {
    setConfig(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const isConfigured = config !== null && config.url !== '' && config.anonKey !== '';

  return (
    <SupabaseConfigContext.Provider value={{ config, saveConfig, clearConfig, isConfigured }}>
      {children}
    </SupabaseConfigContext.Provider>
  );
}

export function useSupabaseConfig() {
  const context = useContext(SupabaseConfigContext);
  if (context === undefined) {
    throw new Error('useSupabaseConfig must be used within a SupabaseConfigProvider');
  }
  return context;
}
