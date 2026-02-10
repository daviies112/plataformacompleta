/**
 * Initialize integration configurations in database from environment variables
 * Uses UPSERT to always sync with Replit Secrets
 * 
 * CONFIGURATION MODE:
 * When no database is connected (Supabase not configured yet),
 * this module gracefully skips all database operations.
 * The app will run in "configuration mode" until Supabase is set up.
 */

import { db, isDatabaseConnected } from '../db';
import { sentryConfig, betterStackConfig, redisConfig, appSettings, supabaseConfig } from '../../shared/db-schema';
import { sql } from 'drizzle-orm';
import { encrypt } from './credentialsManager';

export async function initializeIntegrations() {
  if (!isDatabaseConnected()) {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ⏳ AGUARDANDO CONFIGURAÇÃO DO SUPABASE                        ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📝 Sincronização de integrações ignorada (banco não configurado)');
    console.log('🔧 Configure o Supabase em /configuracoes para habilitar');
    console.log('');
    return true;
  }

  try {
    await db!.execute(sql`SELECT 1`);
  } catch (testError) {
    const errorMessage = (testError as Error).message || '';
    const errorCause = (testError as any)?.cause?.message || '';
    if (errorMessage.includes('ENOTFOUND') || errorCause.includes('ENOTFOUND') || 
        errorMessage.includes('Failed query')) {
      console.log('');
      console.log('╔════════════════════════════════════════════════════════════════╗');
      console.log('║  ⚠️  DATABASE_URL INVÁLIDA                                     ║');
      console.log('╚════════════════════════════════════════════════════════════════╝');
      console.log('');
      console.log('📝 O hostname do DATABASE_URL não é válido');
      console.log('🔧 Corrija a Connection String do Supabase PostgreSQL:');
      console.log('   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres');
      console.log('');
      console.log('📌 Passos:');
      console.log('   1. No Supabase Dashboard, vá em Settings → Database');
      console.log('   2. Copie a "Connection String" (URI)');
      console.log('   3. Atualize DATABASE_URL no Replit Secrets');
      console.log('   4. Reinicie o servidor');
      console.log('');
      return true;
    }
    throw testError;
  }

  console.log('🔧 Synchronizing integration configurations with Secrets...');

  try {
    let syncedCount = 0;
    
    if (process.env.SENTRY_DSN) {
      await db!.execute(sql`
        INSERT INTO sentry_config (id, dsn, environment, traces_sample_rate, created_at, updated_at)
        VALUES (1, ${process.env.SENTRY_DSN}, ${process.env.NODE_ENV || 'production'}, '0.1', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          dsn = EXCLUDED.dsn,
          environment = EXCLUDED.environment,
          traces_sample_rate = COALESCE(EXCLUDED.traces_sample_rate, sentry_config.traces_sample_rate),
          updated_at = NOW()
      `);
      console.log('✅ Sentry configuration synced');
      syncedCount++;
    } else {
      console.log('⚠️  SENTRY_DSN not found - skipping Sentry sync');
    }

    if (process.env.BETTER_STACK_SOURCE_TOKEN) {
      await db!.execute(sql`
        INSERT INTO better_stack_config (id, source_token, ingesting_host, created_at, updated_at)
        VALUES (1, ${process.env.BETTER_STACK_SOURCE_TOKEN}, ${process.env.BETTER_STACK_URL || 'in.logs.betterstack.com'}, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          source_token = EXCLUDED.source_token,
          ingesting_host = EXCLUDED.ingesting_host,
          updated_at = NOW()
      `);
      console.log('✅ Better Stack configuration synced');
      syncedCount++;
    } else {
      console.log('⚠️  BETTER_STACK_SOURCE_TOKEN not found - skipping Better Stack sync');
    }

    if (process.env.REDIS_URL) {
      await db!.execute(sql`
        INSERT INTO redis_config (id, redis_url, redis_token, created_at, updated_at)
        VALUES (1, ${process.env.REDIS_URL}, ${process.env.REDIS_TOKEN || null}, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          redis_url = EXCLUDED.redis_url,
          redis_token = COALESCE(EXCLUDED.redis_token, redis_config.redis_token),
          updated_at = NOW()
      `);
      console.log('✅ Redis configuration synced');
      syncedCount++;
    } else {
      console.log('⚠️  REDIS_URL not found - skipping Redis sync');
    }

    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://')) {
      const existingSettings = await db!.select().from(appSettings).limit(1);
      
      if (existingSettings.length > 0) {
        await db!.update(appSettings)
          .set({
            supabaseUrl: supabaseUrl,
            supabaseAnonKey: supabaseAnonKey,
            updatedAt: new Date(),
          })
          .where(sql`id = ${existingSettings[0].id}`);
      } else {
        await db!.insert(appSettings).values({
          supabaseUrl: supabaseUrl,
          supabaseAnonKey: supabaseAnonKey,
        });
      }
      console.log('✅ App Settings (Supabase plaintext) synced');
      
      const encryptedUrl = encrypt(supabaseUrl);
      const encryptedKey = encrypt(supabaseAnonKey);
      
      await db!.execute(sql`
        INSERT INTO supabase_config (id, tenant_id, supabase_url, supabase_anon_key, supabase_bucket, created_at, updated_at)
        VALUES (1, 'system', ${encryptedUrl}, ${encryptedKey}, 'receipts', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          supabase_url = EXCLUDED.supabase_url,
          supabase_anon_key = EXCLUDED.supabase_anon_key,
          updated_at = NOW()
      `);
      console.log('✅ Supabase Config (encrypted with tenant_id=system) synced');
      
      syncedCount++;
    } else {
      console.log('⚠️  Supabase credentials not found - skipping Supabase sync');
    }
    
    if (process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY) {
      const encryptedApiUrl = encrypt(process.env.EVOLUTION_API_URL);
      const encryptedApiKey = encrypt(process.env.EVOLUTION_API_KEY);
      const instance = process.env.EVOLUTION_INSTANCE || 'nexus-whatsapp';
      
      await db!.execute(sql`
        INSERT INTO evolution_api_config (id, tenant_id, api_url, api_key, instance, created_at, updated_at)
        VALUES (1, 'system', ${encryptedApiUrl}, ${encryptedApiKey}, ${instance}, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          api_url = EXCLUDED.api_url,
          api_key = EXCLUDED.api_key,
          instance = EXCLUDED.instance,
          updated_at = NOW()
      `);
      console.log('✅ Evolution API Config (encrypted with tenant_id=system) synced');
      
      syncedCount++;
    } else {
      console.log('⚠️  Evolution API credentials not found - skipping Evolution sync');
    }

    if (syncedCount === 0) {
      console.log('⚠️  No integrations configured - all secrets missing');
    } else {
      console.log(`🎉 Integration sync complete (${syncedCount} services synced)`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error synchronizing integrations:', error);
    return false;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  initializeIntegrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
