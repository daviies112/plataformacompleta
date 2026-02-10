/**
 * Supabase File-Based Configuration Routes
 * 
 * These routes allow configuring Supabase credentials via the UI
 * without requiring a database connection. Credentials are stored
 * in a local JSON file (data/supabase-config.json).
 * 
 * This enables the app to start in "configuration mode" and show
 * a preview while waiting for Supabase credentials.
 */

import express from 'express';
import {
  getSupabaseFileConfig,
  saveSupabaseFileConfig,
  isSupabaseConfigured,
  getEffectiveSupabaseConfig,
  SupabaseFileConfig
} from '../lib/supabaseFileConfig';
import { resetAllPollerStates } from '../lib/stateReset';
import { runFullMigration, checkTablesExist } from '../lib/supabaseMigration';

const router = express.Router();

/**
 * GET /api/config/supabase-setup
 * Check if Supabase is configured (works without database)
 */
router.get('/supabase-setup', async (req, res) => {
  try {
    const configured = isSupabaseConfigured();
    const effectiveConfig = getEffectiveSupabaseConfig();

    res.json({
      configured,
      source: effectiveConfig ? (process.env.REACT_APP_SUPABASE_URL ? 'environment' : 'file') : null,
      urlMasked: effectiveConfig?.url ? maskUrl(effectiveConfig.url) : null,
      hasDatabaseUrl: !!effectiveConfig?.databaseUrl,
    });
  } catch (error) {
    res.status(500).json({
      configured: false,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /api/config/supabase-setup
 * Save Supabase credentials to file (works without database)
 */
router.post('/supabase-setup', async (req, res) => {
  try {
    const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey, databaseUrl } = req.body;

    if (!supabaseUrl) {
      return res.status(400).json({
        success: false,
        error: 'supabaseUrl é obrigatório',
      });
    }

    if (!supabaseAnonKey) {
      return res.status(400).json({
        success: false,
        error: 'supabaseAnonKey é obrigatório',
      });
    }

    if (!supabaseUrl.includes('supabase.co')) {
      return res.status(400).json({
        success: false,
        error: 'URL inválida. Deve ser uma URL do Supabase (ex: https://xxx.supabase.co)',
      });
    }

    if (databaseUrl && !databaseUrl.startsWith('postgres')) {
      return res.status(400).json({
        success: false,
        error: 'DATABASE_URL inválida. Deve começar com postgresql:// ou postgres://',
      });
    }

    const config: Partial<SupabaseFileConfig> = {
      supabaseUrl,
      supabaseAnonKey,
    };

    if (supabaseServiceRoleKey) {
      config.supabaseServiceRoleKey = supabaseServiceRoleKey;
    }

    if (databaseUrl) {
      config.databaseUrl = databaseUrl;
    }

    const saved = saveSupabaseFileConfig(config);

    if (saved) {
      // 🔐 Sincronizar credenciais com o banco de dados local para persistência
      try {
        const { db, pool } = await import('../db');
        const { supabaseConfig } = await import('../../shared/db-schema');
        const { eq } = await import('drizzle-orm');
        const { encrypt } = await import('../lib/credentialsManager');

        // Garantir tabelas
        try {
          if (pool) {
            await pool.query(`
              CREATE TABLE IF NOT EXISTS supabase_config (
                id SERIAL PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                supabase_url TEXT NOT NULL,
                supabase_anon_key TEXT NOT NULL,
                supabase_bucket TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
              );
            `);
          }
        } catch (e: any) {
          console.error('❌ [CONFIG] Erro ao criar/verificar tabela supabase_config:', e.message);
        }

        // 🔐 MULTI-TENANT: Usar o tenantId real da sessão se disponível
        const tenantId = req.user?.userId || 'system';
        console.log(`🔐 [CONFIG] Sincronizando credenciais para tenant: ${tenantId}`);

        // No Replit, as credenciais salvas via UI não devem ser criptografadas 
        // para manter compatibilidade com o leitor legado do arquivo
        const encryptedUrl = supabaseUrl;
        const encryptedAnonKey = supabaseAnonKey;

        // Limpar cache antes de salvar para garantir que a próxima leitura pegue o novo valor
        const { invalidateCredentialsCache } = await import('../lib/publicCache');
        invalidateCredentialsCache(tenantId);
        invalidateCredentialsCache('system'); // Também invalida o sistema caso haja confusão

        // 🛠️ GARANTIR QUE ESTAMOS USANDO O POOL CORRETO E SQL BRUTO PARA EVITAR ERROS DE SCHEMA
        if (pool) {
          console.log(`💾 [CONFIG] Executando INSERT/UPDATE via SQL bruto para ${tenantId}`);
          // Primeiro, garantir a restrição UNIQUE para ON CONFLICT funcionar
          try {
            await pool.query(`
              DO $$ 
              BEGIN 
                  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supabase_config_tenant_id_key') THEN
                      ALTER TABLE supabase_config ADD CONSTRAINT supabase_config_tenant_id_key UNIQUE (tenant_id);
                  END IF;
              END $$;
            `);
          } catch (e: any) {
            console.warn('⚠️ [CONFIG] Erro ao garantir UNIQUE constraint:', e.message);
          }

          const sqlResult = await pool.query(`
            INSERT INTO supabase_config (tenant_id, supabase_url, supabase_anon_key, supabase_bucket, updated_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (tenant_id) 
            DO UPDATE SET 
              supabase_url = EXCLUDED.supabase_url,
              supabase_anon_key = EXCLUDED.supabase_anon_key,
              updated_at = NOW()
            RETURNING id;
          `, [tenantId, encryptedUrl, encryptedAnonKey, 'receipts']);

          console.log(`✅ [CONFIG] Resultado SQL:`, sqlResult.rows[0]);
        } else {
          // Fallback para Drizzle se pool não disponível (improvável)
          const existing = await db.select().from(supabaseConfig).where(eq(supabaseConfig.tenantId, tenantId)).limit(1);
          if (existing.length > 0) {
            await db.update(supabaseConfig).set({
              supabaseUrl: encryptedUrl,
              supabaseAnonKey: encryptedAnonKey,
              supabaseBucket: 'receipts',
              updatedAt: new Date()
            }).where(eq(supabaseConfig.tenantId, tenantId));
          } else {
            await db.insert(supabaseConfig).values({
              tenantId,
              supabaseUrl: encryptedUrl,
              supabaseAnonKey: encryptedAnonKey,
              supabaseBucket: 'receipts'
            });
          }
        }
        console.log(`✅ [CONFIG] Credenciais sincronizadas com sucesso no banco local para ${tenantId}`);
      } catch (dbSyncError: any) {
        console.warn('⚠️ Could not sync credentials to database:', dbSyncError.message);
      }

      // ========================================================================
      // 🚀 AUTO-CRIAÇÃO DE TABELAS
      // ========================================================================
      let migrationResult = null;
      try {
        console.log('🚀 [AUTO-MIGRATION] Iniciando auto-criação de tabelas...');

        // Usar service role key se disponível, senão usar anon key
        const keyToUse = supabaseServiceRoleKey || supabaseAnonKey;

        migrationResult = await runFullMigration(supabaseUrl, keyToUse);

        if (migrationResult.success) {
          console.log(`✅ [AUTO-MIGRATION] ${migrationResult.tablesCreated} tabelas criadas/verificadas`);
          console.log(`📊 [AUTO-MIGRATION] Método usado: ${migrationResult.method}`);
        } else {
          console.warn('⚠️ [AUTO-MIGRATION] Migração falhou, mas credenciais foram salvas');
          console.warn('   Erros:', migrationResult.errors);
        }
      } catch (migrationError: any) {
        console.error('❌ [AUTO-MIGRATION] Erro na migração:', migrationError.message);
        // Não bloquear o salvamento das credenciais se a migração falhar
      }

      console.log('✅ Supabase credentials saved to file');
      console.log(`   URL: ${maskUrl(supabaseUrl)}`);
      console.log(`   Database URL: ${databaseUrl ? 'configured' : 'not configured'}`);

      resetAllPollerStates();
      console.log('🔄 Estados de polling resetados - sincronização completa será executada após reiniciar');

      res.json({
        success: true,
        message: 'Credenciais do Supabase salvas com sucesso. Reinicie o servidor para aplicar.',
        nextSteps: [
          'Credenciais salvas em data/supabase-config.json',
          'Estados de polling resetados para sincronização completa',
          'Reinicie o servidor para conectar ao banco de dados',
          'Após reiniciar, acesse /configuracoes para verificar a conexão',
        ],
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Erro ao salvar credenciais. Verifique os logs do servidor.',
      });
    }
  } catch (error) {
    console.error('Error saving Supabase config:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/config/supabase-setup/test
 * Test Supabase connection
 */
router.get('/supabase-setup/test', async (req, res) => {
  try {
    const config = getEffectiveSupabaseConfig();

    if (!config) {
      return res.json({
        success: false,
        error: 'Supabase não configurado',
      });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(config.url, config.anonKey);

    const { data, error } = await supabase.from('workspace_pages').select('id').limit(1);

    if (error && !error.message.includes('does not exist')) {
      return res.json({
        success: false,
        error: `Erro de conexão: ${error.message}`,
      });
    }

    res.json({
      success: true,
      message: 'Conexão com Supabase estabelecida com sucesso',
      url: maskUrl(config.url),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

function maskUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.host;
    if (host.includes('supabase.co')) {
      const projectRef = host.split('.')[0];
      return `https://${projectRef.substring(0, 8)}...supabase.co`;
    }
    return `${parsed.protocol}//${host.substring(0, 8)}...`;
  } catch {
    return url.substring(0, 25) + '...';
  }
}

export default router;
