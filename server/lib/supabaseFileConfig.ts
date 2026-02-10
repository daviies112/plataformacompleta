/**
 * File-based Supabase Configuration System
 * 
 * This module provides a way to store and retrieve Supabase credentials
 * without requiring a local PostgreSQL database. Credentials are stored
 * in a local JSON file and can be configured via the UI.
 * 
 * FLOW:
 * 1. App starts without any database
 * 2. Frontend loads and shows configuration screen
 * 3. User enters Supabase credentials via /configuracoes
 * 4. Credentials are saved to data/supabase-config.json
 * 5. App uses these credentials to connect to Supabase PostgreSQL
 */

import fs from 'fs';
import path from 'path';

const CONFIG_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(CONFIG_DIR, 'supabase-config.json');

export interface SupabaseFileConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string;
  databaseUrl?: string;
  configuredAt: string;
  configuredBy: string;
}

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function getSupabaseFileConfig(): SupabaseFileConfig | null {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return null;
    }
    const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn('⚠️  Error reading Supabase config file:', error);
    return null;
  }
}

export function saveSupabaseFileConfig(config: Partial<SupabaseFileConfig>): boolean {
  try {
    ensureConfigDir();
    
    const existingConfig = getSupabaseFileConfig() || {};
    const newConfig: SupabaseFileConfig = {
      ...existingConfig,
      ...config,
      configuredAt: new Date().toISOString(),
      configuredBy: 'ui',
    } as SupabaseFileConfig;
    
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2));
    console.log('✅ Supabase config saved to file');
    return true;
  } catch (error) {
    console.error('❌ Error saving Supabase config file:', error);
    return false;
  }
}

export function deleteSupabaseFileConfig(): boolean {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
      console.log('✅ Supabase config file deleted');
    }
    return true;
  } catch (error) {
    console.error('❌ Error deleting Supabase config file:', error);
    return false;
  }
}

export function isSupabaseConfigured(): boolean {
  const envConfigured = !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);
  const fileConfig = getSupabaseFileConfig();
  const fileConfigured = !!(fileConfig?.supabaseUrl && fileConfig?.supabaseAnonKey);
  
  return envConfigured || fileConfigured;
}

export function getEffectiveSupabaseConfig(): { url: string; anonKey: string; serviceRoleKey?: string; databaseUrl?: string } | null {
  const envUrl = (process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const envKey = (process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  const envServiceKey = (process.env.REACT_APP_SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const envDbUrl = process.env.DATABASE_URL;
  
  if (envUrl && (envKey || envServiceKey)) {
    // Se temos service role mas não anon key, usamos service role para ambos no fallback
    return {
      url: envUrl,
      anonKey: envKey || envServiceKey,
      serviceRoleKey: envServiceKey,
      databaseUrl: envDbUrl,
    };
  }

  // Fallback para secrets do Replit que podem estar sem o prefixo REACT_APP_
  const directEnvUrl = (process.env.SUPABASE_URL || '').trim();
  const directEnvServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (directEnvUrl && directEnvServiceKey) {
    return {
      url: directEnvUrl,
      anonKey: directEnvServiceKey,
      serviceRoleKey: directEnvServiceKey,
      databaseUrl: envDbUrl,
    };
  }
  
  const fileConfig = getSupabaseFileConfig();
  if (fileConfig?.supabaseUrl && fileConfig?.supabaseAnonKey) {
    return {
      url: fileConfig.supabaseUrl,
      anonKey: fileConfig.supabaseAnonKey,
      serviceRoleKey: fileConfig.supabaseServiceRoleKey,
      databaseUrl: fileConfig.databaseUrl,
    };
  }
  
  return null;
}

export function getDatabaseUrl(): string | null {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  const fileConfig = getSupabaseFileConfig();
  if (fileConfig?.databaseUrl) {
    return fileConfig.databaseUrl;
  }
  
  return null;
}
