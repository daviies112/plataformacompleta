import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { authenticateConfig } from '../middleware/configAuth';
import { credentialsStorage, encrypt, decrypt, saveCredentialsToFile } from '../lib/credentialsManager';
import { clearSupabaseClientCache, testDynamicSupabaseConnection, invalidateConnectionTestCache } from '../lib/multiTenantSupabase';
import { db } from '../db';
import { pluggyConfig, supabaseConfig, n8nConfig, evolutionApiConfig, hms100msConfig, totalExpressConfig, bigdatacorpConfig } from '../../shared/db-schema.js';
import { eq } from 'drizzle-orm';
import { getSupabaseCredentials, getSupabaseCredentialsStrict, getPluggyCredentials, getN8nCredentials, getEvolutionApiCredentials } from '../lib/credentialsDb';
import { resetAllPollerStates } from '../lib/stateReset';
import { invalidateClienteCache } from '../lib/clienteSupabase';
import { clearSupabaseClientCache as clearFormularioSupabaseCache } from '../formularios/utils/supabaseClient';
import { syncAdminCredentialsToOwner } from '../lib/masterSyncService';
import { invalidateLeadsCache } from './leadsPipelineRoutes';
import { clearLocalContractsCache } from './assinatura';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Clear all credentials and cache for testing with new credentials
router.delete('/clear-all', authenticateToken, async (req, res) => {
  try {
    const clientId = req.user!.clientId;
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      console.error('❌ [SECURITY] Tentativa de limpar credenciais sem tenantId - bloqueado');
      return res.status(401).json({
        success: false,
        error: 'Tenant ID ausente - isolamento de credenciais comprometido'
      });
    }

    console.log(`🧹 [CREDENTIALS] Limpando todas as credenciais e cache para tenant ${tenantId}`);

    const cleared: { credentials: string[]; cache: string[]; database: string[]; files: string[] } = {
      credentials: [],
      cache: [],
      database: [],
      files: []
    };

    // 1. Clear in-memory credentials for this client
    if (credentialsStorage.has(clientId)) {
      const clientCreds = credentialsStorage.get(clientId);
      if (clientCreds) {
        const types = Array.from(clientCreds.keys());
        credentialsStorage.delete(clientId);
        cleared.credentials.push(...types);
        console.log(`🗑️ [CREDENTIALS] Credenciais em memória limpas: ${types.join(', ')}`);
      }
    }

    // 2. Save updated credentials file (without this client's credentials)
    saveCredentialsToFile();
    console.log(`💾 [CREDENTIALS] Arquivo credentials.json atualizado`);

    // 3. Delete from database tables for this tenant
    try {
      await db.delete(supabaseConfig)
        .where(eq(supabaseConfig.tenantId, tenantId))
        .execute();
      cleared.database.push('supabaseConfig');
      console.log(`🗑️ [DB] supabaseConfig deletado para tenant ${tenantId}`);
    } catch (dbErr) {
      console.warn('⚠️ [DB] Erro ao deletar supabaseConfig:', dbErr);
    }

    try {
      await db.delete(pluggyConfig)
        .where(eq(pluggyConfig.tenantId, tenantId))
        .execute();
      cleared.database.push('pluggyConfig');
      console.log(`🗑️ [DB] pluggyConfig deletado para tenant ${tenantId}`);
    } catch (dbErr) {
      console.warn('⚠️ [DB] Erro ao deletar pluggyConfig:', dbErr);
    }

    try {
      await db.delete(n8nConfig)
        .where(eq(n8nConfig.tenantId, tenantId))
        .execute();
      cleared.database.push('n8nConfig');
      console.log(`🗑️ [DB] n8nConfig deletado para tenant ${tenantId}`);
    } catch (dbErr) {
      console.warn('⚠️ [DB] Erro ao deletar n8nConfig:', dbErr);
    }

    try {
      await db.delete(evolutionApiConfig)
        .where(eq(evolutionApiConfig.tenantId, tenantId))
        .execute();
      cleared.database.push('evolutionApiConfig');
      console.log(`🗑️ [DB] evolutionApiConfig deletado para tenant ${tenantId}`);
    } catch (dbErr) {
      console.warn('⚠️ [DB] Erro ao deletar evolutionApiConfig:', dbErr);
    }

    try {
      await db.delete(hms100msConfig)
        .where(eq(hms100msConfig.tenantId, tenantId))
        .execute();
      cleared.database.push('hms100msConfig');
      console.log(`🗑️ [DB] hms100msConfig deletado para tenant ${tenantId}`);
    } catch (dbErr) {
      console.warn('⚠️ [DB] Erro ao deletar hms100msConfig:', dbErr);
    }

    try {
      await db.delete(totalExpressConfig)
        .where(eq(totalExpressConfig.tenantId, tenantId))
        .execute();
      cleared.database.push('totalExpressConfig');
      console.log(`🗑️ [DB] totalExpressConfig deletado para tenant ${tenantId}`);
    } catch (dbErr) {
      console.warn('⚠️ [DB] Erro ao deletar totalExpressConfig:', dbErr);
    }

    try {
      await db.delete(bigdatacorpConfig)
        .where(eq(bigdatacorpConfig.tenantId, tenantId))
        .execute();
      cleared.database.push('bigdatacorpConfig');
      console.log(`🗑️ [DB] bigdatacorpConfig deletado para tenant ${tenantId}`);
    } catch (dbErr) {
      console.warn('⚠️ [DB] Erro ao deletar bigdatacorpConfig:', dbErr);
    }

    // 4. Reset poller states
    resetAllPollerStates();
    cleared.cache.push('pollerStates');
    console.log(`🔄 [CACHE] Estados de polling resetados`);

    // 5. Clear all Supabase client caches
    clearSupabaseClientCache(clientId);
    cleared.cache.push('supabaseClientCache');
    
    invalidateClienteCache();
    cleared.cache.push('clienteCache');
    
    clearFormularioSupabaseCache();
    cleared.cache.push('formularioSupabaseCache');
    
    invalidateConnectionTestCache(clientId);
    invalidateConnectionTestCache(tenantId);
    cleared.cache.push('connectionTestCache');
    
    invalidateLeadsCache(tenantId);
    cleared.cache.push('leadsCache');
    
    console.log(`🗑️ [CACHE] Todos os caches Supabase invalidados`);

    // 6. Delete local config files (NOT credentials.json structure, NOT contracts, NOT audit)
    const dataDir = path.join(process.cwd(), 'data');
    
    // Delete supabase-config.json
    const supabaseConfigPath = path.join(dataDir, 'supabase-config.json');
    if (fs.existsSync(supabaseConfigPath)) {
      fs.unlinkSync(supabaseConfigPath);
      cleared.files.push('supabase-config.json');
      console.log(`🗑️ [FILE] supabase-config.json deletado`);
    }
    
    // Delete cpf_auto_check_processed.json
    const cpfAutoCheckPath = path.join(dataDir, 'cpf_auto_check_processed.json');
    if (fs.existsSync(cpfAutoCheckPath)) {
      fs.unlinkSync(cpfAutoCheckPath);
      cleared.files.push('cpf_auto_check_processed.json');
      console.log(`🗑️ [FILE] cpf_auto_check_processed.json deletado`);
    }

    // Delete all local cache files for complete reset
    const cacheFilesToDelete = [
      'assinatura_contracts.json',
      'assinatura_contracts.json.bak',
      `assinatura_global_config_${tenantId}.json`,
      'assinatura_global_config.json',
      'automation_state.json',
      'cpf_compliance_poller_state.json',
      'cpf_processed_ids.json',
      'form_submission_poller_state.json',
      'credentials.json',
      'supabase-config.json.bak',
      'leads_cache.json',
      'form_mappings_cache.json'
    ];

    for (const fileName of cacheFilesToDelete) {
      const filePath = path.join(dataDir, fileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          cleared.files.push(fileName);
          console.log(`🗑️ [FILE] ${fileName} deletado`);
        } catch (err) {
          console.warn(`⚠️ [FILE] Erro ao deletar ${fileName}:`, err);
        }
      }
    }

    // 7. Clear in-memory contract cache
    try {
      clearLocalContractsCache();
      cleared.cache.push('assinatura_contracts_memory');
    } catch (err) {
      console.warn('⚠️ [CACHE] Erro ao limpar cache de contratos em memória:', err);
    }

    console.log(`✅ [CREDENTIALS] Reset total completo para tenant ${tenantId}`);

    res.json({
      success: true,
      cleared,
      message: 'Todas as credenciais e cache foram limpos com sucesso'
    });

  } catch (error) {
    console.error('❌ [CREDENTIALS] Erro ao limpar credenciais:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor ao limpar credenciais'
    });
  }
});

// Salvar credenciais
router.put('/:integrationType', authenticateToken, async (req, res) => {
  try {
    const { integrationType } = req.params;
    const clientId = req.user!.clientId;
    const tenantId = req.user!.tenantId;
    const credentials = req.body;

    // 🔐 SECURITY: Validar que tenantId existe para isolamento de credenciais
    if (!tenantId) {
      console.error('❌ [SECURITY] Tentativa de salvar credenciais sem tenantId - bloqueado');
      return res.status(401).json({
        success: false,
        error: 'Tenant ID ausente - isolamento de credenciais comprometido'
      });
    }

    console.log(`🔐 [CREDENTIALS] Salvando credenciais ${integrationType} para tenant ${tenantId}`);

    // Validar o tipo de integração
    const validTypes = ['supabase', 'google_meet', 'whatsapp', 'evolution_api', 'n8n', 'pluggy'];
    if (!validTypes.includes(integrationType)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de integração inválido'
      });
    }

    // Validar credenciais baseado no tipo
    const validationResult = validateCredentials(integrationType, credentials);
    if (!validationResult.valid) {
      return res.status(400).json({
        success: false,
        error: validationResult.error
      });
    }

    // Criptografar as credenciais
    const encryptedCredentials = encrypt(JSON.stringify(credentials));

    // Salvar no armazenamento em memória (para compatibilidade)
    if (!credentialsStorage.has(clientId)) {
      credentialsStorage.set(clientId, new Map());
    }
    credentialsStorage.get(clientId)!.set(integrationType, encryptedCredentials);

    // Persistir as credenciais no arquivo (para compatibilidade)
    saveCredentialsToFile();

    // Salvar também no banco de dados PostgreSQL com isolamento por tenantId
    try {
      if (integrationType === 'pluggy') {
        // 🔐 Deletar configuração anterior APENAS deste tenant
        await db.delete(pluggyConfig)
          .where(eq(pluggyConfig.tenantId, tenantId))
          .execute();
        // Inserir nova configuração COM tenantId
        await db.insert(pluggyConfig).values({
          tenantId,
          clientId: credentials.client_id,
          clientSecret: credentials.client_secret
        }).execute();
        console.log(`✅ Configuração do Pluggy salva no banco (tenant: ${tenantId})`);
      } else if (integrationType === 'supabase') {
        // 🔐 Deletar configuração anterior APENAS deste tenant
        await db.delete(supabaseConfig)
          .where(eq(supabaseConfig.tenantId, tenantId))
          .execute();
        // 🔐 Criptografar cada campo individualmente (igual Evolution API)
        const encryptedUrl = encrypt(credentials.url);
        const encryptedAnonKey = encrypt(credentials.anon_key);
        // Inserir nova configuração COM tenantId
        await db.insert(supabaseConfig).values({
          tenantId,
          supabaseUrl: encryptedUrl,
          supabaseAnonKey: encryptedAnonKey,
          supabaseBucket: credentials.bucket || 'receipts'
        }).execute();
        // 🚀 PERFORMANCE: Invalidar TODOS os caches do Supabase, incluindo cache de teste de conexão
        clearSupabaseClientCache(clientId);
        invalidateClienteCache();
        clearFormularioSupabaseCache();
        invalidateConnectionTestCache(clientId);
        invalidateConnectionTestCache(tenantId);
        // 🔐 CRITICAL: Invalidar cache de leads do Kanban para forçar refetch do novo Supabase
        invalidateLeadsCache(tenantId);
        console.log(`🗑️ [CACHE] Cache de leads invalidado para tenant: ${tenantId}`);
        // 🔄 IMPORTANTE: Resetar estados dos pollers para sincronizar do zero
        // Isso garante que em uma nova instalação, todos os dados sejam sincronizados
        resetAllPollerStates();
        console.log(`✅ Configuração do Supabase salva no banco (tenant: ${tenantId})`);
        console.log(`🔄 Estados de polling resetados - sincronização completa será executada`);
        
        // 🔄 SINCRONIZAR para Supabase Owner (para revendedoras herdarem)
        // Usa o userId do admin como admin_id na tabela admin_supabase_credentials
        const adminId = req.user!.userId;
        if (adminId) {
          const synced = await syncAdminCredentialsToOwner(adminId, {
            supabase_url: credentials.url,
            supabase_anon_key: credentials.anon_key,
            supabase_service_role_key: credentials.service_role_key || undefined,
            project_name: credentials.project_name || tenantId
          });
          if (synced) {
            console.log(`🔄 [SYNC] Credenciais sincronizadas para Supabase Owner (admin: ${adminId})`);
          } else {
            console.warn(`⚠️ [SYNC] Falha ao sincronizar credenciais para Supabase Owner (admin: ${adminId})`);
          }
        }
      } else if (integrationType === 'n8n') {
        // 🔐 Deletar configuração anterior APENAS deste tenant
        await db.delete(n8nConfig)
          .where(eq(n8nConfig.tenantId, tenantId))
          .execute();
        // Inserir nova configuração COM tenantId
        await db.insert(n8nConfig).values({
          tenantId,
          webhookUrl: credentials.webhook_url
        }).execute();
        console.log(`✅ Configuração do N8N salva no banco (tenant: ${tenantId})`);
      } else if (integrationType === 'evolution_api') {
        // 🔐 Deletar configuração anterior APENAS deste tenant
        await db.delete(evolutionApiConfig)
          .where(eq(evolutionApiConfig.tenantId, tenantId))
          .execute();
        // Criptografar cada campo individualmente
        const encryptedApiUrl = encrypt(credentials.api_url);
        const encryptedApiKey = encrypt(credentials.api_key);
        // Inserir nova configuração COM tenantId
        await db.insert(evolutionApiConfig).values({
          tenantId,
          apiUrl: encryptedApiUrl,
          apiKey: encryptedApiKey, 
          instance: credentials.instance || 'nexus-whatsapp'
        }).execute();
        console.log(`✅ Configuração da Evolution API salva no banco (tenant: ${tenantId})`);
      }
    } catch (dbError) {
      console.error('Erro ao salvar no banco de dados:', dbError);
      // Continua mesmo se falhar o salvamento no banco (tem fallback para arquivo)
    }

    res.json({
      success: true,
      message: 'Credenciais salvas com sucesso'
    });

  } catch (error) {
    console.error('Erro ao salvar credenciais:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Recuperar credenciais
router.get('/:integrationType', authenticateToken, async (req, res) => {
  try {
    const { integrationType } = req.params;
    const clientId = req.user!.clientId;
    const tenantId = req.user!.tenantId;

    // 🔐 SECURITY: Validar que tenantId existe para isolamento de credenciais
    if (!tenantId) {
      console.error('❌ [SECURITY] Tentativa de recuperar credenciais sem tenantId - bloqueado');
      return res.status(401).json({
        success: false,
        error: 'Tenant ID ausente - isolamento de credenciais comprometido'
      });
    }

    console.log(`🔐 [CREDENTIALS] Recuperando credenciais ${integrationType} para tenant ${tenantId}`);

    // Primeiro tenta buscar da memória
    const clientCredentials = credentialsStorage.get(clientId);
    if (clientCredentials && clientCredentials.has(integrationType)) {
      const encryptedCredentials = clientCredentials.get(integrationType)!;
      const decryptedCredentials = JSON.parse(decrypt(encryptedCredentials));
      
      return res.json({
        success: true,
        credentials: decryptedCredentials
      });
    }

    // Se não encontrou na memória, busca do banco de dados COM tenantId
    // 🔐 ADMIN PLATFORM: Usar versão STRICT sem fallbacks para garantir isolamento
    let dbCredentials = null;
    
    if (integrationType === 'supabase') {
      // 🔐 CRITICAL: Usar getSupabaseCredentialsStrict para isolamento de tenant
      // Isso garante que admin novo veja credenciais ZERADAS (não de outro tenant)
      const supabaseCreds = await getSupabaseCredentialsStrict(tenantId);
      if (supabaseCreds) {
        dbCredentials = {
          url: supabaseCreds.url,
          anon_key: supabaseCreds.anonKey,
          bucket: supabaseCreds.bucket
        };
        
        // Salva na memória para próximas requisições
        const encryptedCreds = encrypt(JSON.stringify(dbCredentials));
        if (!credentialsStorage.has(clientId)) {
          credentialsStorage.set(clientId, new Map());
        }
        credentialsStorage.get(clientId)!.set(integrationType, encryptedCreds);
      }
    } else if (integrationType === 'pluggy') {
      const pluggyCreds = await getPluggyCredentials(tenantId);
      if (pluggyCreds) {
        dbCredentials = {
          client_id: pluggyCreds.clientId,
          client_secret: pluggyCreds.clientSecret
        };
        
        // Salva na memória para próximas requisições
        const encryptedCreds = encrypt(JSON.stringify(dbCredentials));
        if (!credentialsStorage.has(clientId)) {
          credentialsStorage.set(clientId, new Map());
        }
        credentialsStorage.get(clientId)!.set(integrationType, encryptedCreds);
      }
    } else if (integrationType === 'n8n') {
      const n8nCreds = await getN8nCredentials(tenantId);
      if (n8nCreds) {
        dbCredentials = {
          webhook_url: n8nCreds.webhookUrl
        };
        
        // Salva na memória para próximas requisições
        const encryptedCreds = encrypt(JSON.stringify(dbCredentials));
        if (!credentialsStorage.has(clientId)) {
          credentialsStorage.set(clientId, new Map());
        }
        credentialsStorage.get(clientId)!.set(integrationType, encryptedCreds);
      }
    } else if (integrationType === 'evolution_api') {
      const evolutionCreds = await getEvolutionApiCredentials(tenantId);
      if (evolutionCreds) {
        dbCredentials = {
          api_url: evolutionCreds.apiUrl,
          api_key: evolutionCreds.apiKey,
          instance: evolutionCreds.instance
        };
        
        // Salva na memória para próximas requisições
        const encryptedCreds = encrypt(JSON.stringify(dbCredentials));
        if (!credentialsStorage.has(clientId)) {
          credentialsStorage.set(clientId, new Map());
        }
        credentialsStorage.get(clientId)!.set(integrationType, encryptedCreds);
      }
    }

    if (dbCredentials) {
      return res.json({
        success: true,
        credentials: dbCredentials
      });
    }

    // Se não encontrou nem na memória nem no banco
    return res.status(404).json({
      success: false,
      error: 'Credenciais não encontradas'
    });

  } catch (error) {
    console.error('Erro ao recuperar credenciais:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Listar status de todas as credenciais
router.get('/', authenticateToken, async (req, res) => {
  try {
    const clientId = req.user!.clientId;
    const tenantId = req.user!.tenantId;
    const clientCredentials = credentialsStorage.get(clientId);

    // 🔐 SECURITY: Validar que tenantId existe para isolamento de credenciais
    if (!tenantId) {
      console.error('❌ [SECURITY] Tentativa de listar credenciais sem tenantId - bloqueado');
      return res.status(401).json({
        success: false,
        error: 'Tenant ID ausente - isolamento de credenciais comprometido'
      });
    }

    console.log(`🔐 [CREDENTIALS] Listando status de credenciais para tenant ${tenantId}`);

    // 🔐 ADMIN PLATFORM: Usar versão STRICT para Supabase (sem fallbacks)
    // Isso garante que admin novo veja status "não configurado" (não de outro tenant)
    const supabaseCreds = await getSupabaseCredentialsStrict(tenantId);
    const pluggyCreds = await getPluggyCredentials(tenantId);
    const n8nCreds = await getN8nCredentials(tenantId);

    const status = {
      supabase_configured: (clientCredentials?.has('supabase') || !!supabaseCreds),
      google_meet: clientCredentials?.has('google_meet') || false,
      whatsapp: clientCredentials?.has('whatsapp') || false,
      evolution_api: clientCredentials?.has('evolution_api') || false,
      n8n_configured: (clientCredentials?.has('n8n') || !!n8nCreds),
      pluggy_configured: (clientCredentials?.has('pluggy') || !!pluggyCreds)
    };

    res.json({
      success: true,
      credentials: status
    });

  } catch (error) {
    console.error('Erro ao listar credenciais:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Testar conexão de uma integração específica
router.post('/test/:integrationType', authenticateConfig, async (req, res) => {
  try {
    const { integrationType } = req.params;
    const clientId = req.user!.clientId;

    // Validar o tipo de integração
    const validTypes = ['supabase', 'google_meet', 'whatsapp', 'evolution_api', 'n8n', 'pluggy', 'redis', 'sentry', 'resend', 'cloudflare', 'better_stack'];
    if (!validTypes.includes(integrationType)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de integração inválido'
      });
    }

    // ✅ CORREÇÃO: Se credenciais foram enviadas no body, usar elas ao invés de buscar do banco
    let credentials;
    const bodyHasCredentials = req.body && Object.keys(req.body).length > 0;
    
    if (bodyHasCredentials && integrationType === 'supabase') {
      // Usar credenciais do body para Supabase (permite testar antes de salvar)
      credentials = {
        url: req.body.supabaseUrl,
        anonKey: req.body.supabaseAnonKey,
      };
      console.log('[TEST SUPABASE] Usando credenciais do body para teste');
    } else if (bodyHasCredentials && integrationType === 'pluggy') {
      credentials = {
        clientId: req.body.clientId,
        clientSecret: req.body.clientSecret,
      };
    } else if (bodyHasCredentials && integrationType === 'evolution_api') {
      // Usar credenciais do body para Evolution API
      credentials = {
        apiUrl: req.body.apiUrl,
        apiKey: req.body.apiKey,
        instance: req.body.instance || 'nexus-whatsapp'
      };
    } else {
      // Buscar credenciais salvas no banco/storage
      console.log(`[TEST ${integrationType.toUpperCase()}] Buscando credenciais do banco/storage`);

    // For optimization services, get directly from database
    if (['redis', 'sentry', 'resend', 'cloudflare', 'better_stack'].includes(integrationType)) {
      // Import credential getters
      const { 
        getRedisCredentials, 
        getSentryCredentials, 
        getResendCredentials, 
        getCloudflareCredentials, 
        getBetterStackCredentials 
      } = await import('../lib/credentialsDb');
      
      // Get credentials based on type
      if (integrationType === 'redis') {
        credentials = await getRedisCredentials();
      } else if (integrationType === 'sentry') {
        credentials = await getSentryCredentials();
      } else if (integrationType === 'resend') {
        credentials = await getResendCredentials();
      } else if (integrationType === 'cloudflare') {
        credentials = await getCloudflareCredentials();
      } else if (integrationType === 'better_stack') {
        credentials = await getBetterStackCredentials();
      }
      
      if (!credentials) {
        return res.status(404).json({
          success: false,
          error: 'Credenciais não encontradas. Configure a integração primeiro.'
        });
      }
    } else {
      // For legacy services, check credentialsStorage
      const clientCredentials = credentialsStorage.get(clientId);
      if (!clientCredentials || !clientCredentials.has(integrationType)) {
        return res.status(404).json({
          success: false,
          error: 'Credenciais não encontradas. Configure a integração primeiro.'
        });
      }
      
      const encryptedCredentials = clientCredentials.get(integrationType)!;
      credentials = JSON.parse(decrypt(encryptedCredentials));
    }
    } // Fecha o else que busca do banco

    // Testar conexão baseado no tipo
    const testResult = await testConnection(integrationType, credentials, clientId);
    
    if (testResult.success) {
      res.json({
        success: true,
        message: testResult.message || 'Conexão testada com sucesso',
        data: testResult.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: testResult.error || 'Falha no teste de conexão'
      });
    }

  } catch (error) {
    console.error('Erro ao testar conexão:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// 🚀 PERFORMANCE: Fast connection test endpoint with 5-second timeout and caching
router.post('/test-fast/:integrationType', authenticateConfig, async (req, res) => {
  const startTime = Date.now();
  try {
    const { integrationType } = req.params;
    
    if (integrationType !== 'supabase') {
      return res.status(400).json({
        success: false,
        error: 'Fast test only supported for Supabase'
      });
    }
    
    const { supabaseUrl, supabaseAnonKey } = req.body;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(400).json({
        success: false,
        error: 'URL e chave do Supabase são necessários'
      });
    }
    
    console.log(`⚡ [FAST-TEST] Starting fast Supabase connection test...`);
    
    // Import Supabase client
    const { createClient } = await import('@supabase/supabase-js');
    
    // Create client with minimal options
    const testClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    
    // 🚀 PERFORMANCE: Use AbortController for 5-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      // Simple query just to test connectivity
      const queryPromise = testClient
        .from('forms')
        .select('id', { count: 'exact', head: true });
      
      // Race with timeout
      const result = await Promise.race([
        queryPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout after 5 seconds')), 5000)
        )
      ]) as any;
      
      clearTimeout(timeoutId);
      
      const elapsed = Date.now() - startTime;
      
      // Check for errors
      if (result.error && !result.error.message.includes('relation') && !result.error.message.includes('does not exist')) {
        console.log(`❌ [FAST-TEST] Failed in ${elapsed}ms:`, result.error.message);
        return res.json({
          success: false,
          error: `Erro na conexão: ${result.error.message}`,
          elapsed
        });
      }
      
      console.log(`✅ [FAST-TEST] Connection successful in ${elapsed}ms`);
      return res.json({
        success: true,
        message: 'Conexão com Supabase estabelecida com sucesso!',
        elapsed,
        data: { url: supabaseUrl }
      });
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;
      
      if (error.message.includes('timeout')) {
        console.log(`⏱️ [FAST-TEST] Timeout after ${elapsed}ms`);
        return res.json({
          success: false,
          error: 'Conexão lenta - timeout após 5 segundos. Verifique as credenciais ou tente novamente.',
          elapsed
        });
      }
      
      console.log(`❌ [FAST-TEST] Error after ${elapsed}ms:`, error.message);
      return res.json({
        success: false,
        error: error.message,
        elapsed
      });
    }
    
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ [FAST-TEST] Server error after ${elapsed}ms:`, error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      elapsed
    });
  }
});

// Função para testar conexões baseado no tipo
async function testConnection(type: string, credentials: any, clientId: string): Promise<{ success: boolean; message?: string; error?: string; data?: any }> {
  switch (type) {
    case 'supabase':
      try {
        // ✅ Testar diretamente com as credenciais fornecidas (permite testar antes de salvar)
        const { createClient } = await import('@supabase/supabase-js');
        
        // CORREÇÃO: Aceitar tanto anonKey quanto supabaseAnonKey
        const supabaseUrl = credentials.url || credentials.supabaseUrl;
        const supabaseKey = credentials.anonKey || credentials.supabaseAnonKey;
        
        if (!supabaseUrl || !supabaseKey) {
          return {
            success: false,
            error: 'URL e chave do Supabase são necessários'
          };
        }
        
        // Criar cliente temporário para teste com credenciais normalizadas
        const testClient = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false }
        });
        
        // Testar conexão tentando consultar uma tabela
        const { data, error } = await testClient
          .from('forms')
          .select('id', { count: 'exact', head: true })
          .limit(1);
        
        // Se erro não for de tabela inexistente, retornar erro
        if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
          console.error('[TEST SUPABASE] Connection failed:', error);
          return {
            success: false,
            error: `Erro na conexão: ${error.message}`
          };
        }
        
        // Conexão bem-sucedida
        console.log('[TEST SUPABASE] Connection successful!');
        return { 
          success: true, 
          message: 'Conexão com Supabase estabelecida com sucesso!',
          data: { url: supabaseUrl }
        };
      } catch (error) {
        return { 
          success: false, 
          error: `Erro na conexão Supabase: ${error.message}` 
        };
      }

    case 'google_calendar':
      try {
        // Verificar se credenciais básicas estão presentes
        if (!credentials.client_id || !credentials.client_secret) {
          return {
            success: false,
            error: 'Client ID e Client Secret são obrigatórios'
          };
        }

        // Se não houver refresh_token, retornar sucesso parcial
        if (!credentials.refresh_token) {
          return {
            success: true,
            message: 'Credenciais do Google Calendar configuradas. Complete a autenticação OAuth para obter o refresh token.',
            data: { 
              configured: true, 
              hasRefreshToken: false,
              needsOAuth: true
            }
          };
        }

        // Se houver refresh_token, testar conexão real com Google Calendar API
        const { google } = await import('googleapis');
        
        const oauth2Client = new google.auth.OAuth2(
          credentials.client_id,
          credentials.client_secret,
          'urn:ietf:wg:oauth:2.0:oob'
        );

        oauth2Client.setCredentials({
          refresh_token: credentials.refresh_token
        });

        // Testar acesso ao Google Calendar
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        const calendarList = await calendar.calendarList.list();
        
        return { 
          success: true, 
          message: 'Conexão com Google Calendar estabelecida com sucesso!',
          data: { 
            configured: true,
            hasRefreshToken: true,
            calendars: calendarList.data.items?.length || 0 
          }
        };
      } catch (error) {
        return { 
          success: false, 
          error: `Erro na conexão Google Calendar: ${error.message}` 
        };
      }

    case 'google_meet':
      try {
        // Lazy load googleapis
        const { google } = await import('googleapis');
        
        // Configurar cliente OAuth2 para Google Meet
        const oauth2Client = new google.auth.OAuth2(
          credentials.client_id,
          credentials.client_secret,
          'urn:ietf:wg:oauth:2.0:oob'
        );

        if (credentials.refresh_token) {
          oauth2Client.setCredentials({
            refresh_token: credentials.refresh_token
          });
        }

        // Testar acesso básico - verificar se as credenciais são válidas
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        
        return { 
          success: true, 
          message: 'Conexão com Google Meet estabelecida com sucesso!',
          data: { user: userInfo.data.email }
        };
      } catch (error) {
        return { 
          success: false, 
          error: `Erro na conexão Google Meet: ${error.message}` 
        };
      }

    case 'whatsapp':
      try {
        // Simular teste de conexão WhatsApp
        // Aqui você implementaria a lógica específica da sua API de WhatsApp
        return { 
          success: true, 
          message: 'Configuração WhatsApp salva. Teste real depende da implementação da API.',
          data: { phone: credentials.phone_number }
        };
      } catch (error) {
        return { 
          success: false, 
          error: `Erro na conexão WhatsApp: ${error.message}` 
        };
      }

    case 'evolution_api':
      try {
        // Normalizar credenciais - aceitar tanto camelCase quanto snake_case
        const apiUrl = credentials.apiUrl ?? credentials.api_url;
        const apiKey = credentials.apiKey ?? credentials.api_key;
        const instance = credentials.instance || 'nexus-whatsapp';
        
        // Validar que temos as credenciais necessárias ANTES de fazer qualquer requisição
        if (!apiUrl || !apiKey || !instance) {
          return {
            success: false,
            error: 'URL da API, API Key e nome da instância são obrigatórios para Evolution API'
          };
        }
        
        // Validar que credenciais não são strings vazias
        if (apiUrl.trim() === '' || apiKey.trim() === '' || instance.trim() === '') {
          return {
            success: false,
            error: 'Credenciais da Evolution API não podem ser vazias'
          };
        }
        
        // Normalize URL by removing trailing slash
        const baseUrl = apiUrl.replace(/\/+$/, '');
        
        // Step 1: Check if instance exists
        const fetchResponse = await fetch(`${baseUrl}/instance/fetchInstances`, {
          method: 'GET',
          headers: {
            'apiKey': apiKey,
            'Content-Type': 'application/json'
          }
        });

        if (fetchResponse.ok) {
          const instances = await fetchResponse.json();
          
          // Find our specific instance
          const instanceData = Array.isArray(instances) 
            ? instances.find((i: any) => i.name === instance)
            : instances;
          
          if (instanceData) {
            // Instance exists!
            const connectionStatus = instanceData.connectionStatus || 'close';
            return { 
              success: true, 
              message: `Conexão com Evolution API estabelecida! Instância "${instance}" encontrada com status: ${connectionStatus}`,
              data: { 
                instance: instance,
                status: connectionStatus,
                profileName: instanceData.profileName || 'N/A',
                exists: true
              }
            };
          } else {
            // Instance doesn't exist - List available instances
            console.log(`⚠️ [Evolution API] Instância "${instance}" não encontrada`);
            
            // Get list of available instances
            const availableInstances = Array.isArray(instances) 
              ? instances.map((i: any) => ({
                  name: i.name,
                  status: i.connectionStatus || 'close',
                  profileName: i.profileName || 'N/A'
                }))
              : [];
            
            if (availableInstances.length > 0) {
              return {
                success: false,
                error: `Instância "${instance}" não encontrada. Instâncias disponíveis: ${availableInstances.map(i => `"${i.name}" (${i.status})`).join(', ')}. Use o nome de uma instância existente ou crie uma nova instância manualmente no painel Evolution API.`,
                data: {
                  availableInstances
                }
              };
            } else {
              return {
                success: false,
                error: `Instância "${instance}" não encontrada e nenhuma instância está disponível. Crie uma instância manualmente no painel Evolution API em: ${baseUrl}`
              };
            }
          }
        } else {
          const errorText = await fetchResponse.text();
          return { 
            success: false, 
            error: `Evolution API retornou status ${fetchResponse.status}: ${errorText}` 
          };
        }
      } catch (error: any) {
        // Melhorar mensagem de erro para problemas de conectividade
        let errorMessage = error.message || 'Erro desconhecido';
        
        // Detectar erros de timeout/conexão
        if (error.code === 'UND_ERR_CONNECT_TIMEOUT' || errorMessage.includes('Connect Timeout')) {
          errorMessage = `Tempo limite de conexão esgotado. O servidor Evolution API (${credentials.apiUrl || credentials.api_url}) não respondeu. Verifique se o servidor está online e acessível.`;
        } else if (error.code === 'ECONNREFUSED' || errorMessage.includes('ECONNREFUSED')) {
          errorMessage = `Conexão recusada. O servidor Evolution API não está aceitando conexões. Verifique se o serviço está em execução.`;
        } else if (error.code === 'ENOTFOUND' || errorMessage.includes('ENOTFOUND')) {
          errorMessage = `Servidor não encontrado. O endereço "${credentials.apiUrl || credentials.api_url}" não pode ser resolvido. Verifique a URL.`;
        } else if (errorMessage.includes('fetch failed')) {
          errorMessage = `Falha na requisição. O servidor Evolution API não está acessível. Verifique se o servidor está online e se o endereço está correto.`;
        }
        
        return { 
          success: false, 
          error: errorMessage
        };
      }

    case 'n8n':
      try {
        // Testar conexão com N8N
        const response = await fetch(`${credentials.api_url}/rest/active`, {
          method: 'GET',
          headers: {
            'X-N8N-API-KEY': credentials.api_key,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          return { 
            success: true, 
            message: 'Conexão com N8N estabelecida com sucesso!',
            data: { status: 'active', workflows: data?.length || 0 }
          };
        } else {
          return { 
            success: false, 
            error: `N8N API retornou status ${response.status}` 
          };
        }
      } catch (error) {
        return { 
          success: false, 
          error: `Erro na conexão N8N: ${error.message}` 
        };
      }

    case 'pluggy':
      try {
        // Testar autenticação Pluggy via API Key
        const response = await fetch('https://api.pluggy.ai/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            clientId: credentials.client_id,
            clientSecret: credentials.client_secret
          })
        });

        if (response.ok) {
          const data = await response.json();
          return { 
            success: true, 
            message: 'Credenciais do Pluggy validadas com sucesso!',
            data: { authenticated: true }
          };
        } else {
          const errorData = await response.json().catch(() => ({}));
          return { 
            success: false, 
            error: `Pluggy API retornou status ${response.status}: ${errorData.message || 'Credenciais inválidas'}` 
          };
        }
      } catch (error) {
        return { 
          success: false, 
          error: `Erro na conexão Pluggy: ${error.message}` 
        };
      }

    case 'redis':
      try {
        const { getRedisCredentials } = await import('../lib/credentialsDb');
        const redisCredentials = await getRedisCredentials();
        
        if (!redisCredentials) {
          return { success: false, error: 'Credenciais do Redis não encontradas' };
        }
        
        // Test Redis connection by trying to ping
        const Redis = (await import('ioredis')).default;
        
        // Configure Redis with TLS support (required for Upstash)
        const redisConfig: any = {
          connectTimeout: 10000,
          maxRetriesPerRequest: 3,
          retryStrategy: (times: number) => {
            if (times > 3) return null;
            return Math.min(times * 100, 2000);
          },
          reconnectOnError: () => false,
        };
        
        // Enable TLS if URL uses rediss:// or standard redis:// with Upstash
        const isSecure = redisCredentials.url.startsWith('rediss://') || 
                        redisCredentials.url.includes('upstash.io');
        
        if (isSecure) {
          redisConfig.tls = {
            rejectUnauthorized: true
          };
        }
        
        // Create Redis client with URL (password is in the URL)
        const redis = new Redis(redisCredentials.url, redisConfig);
        
        // Test connection with timeout
        const pingPromise = redis.ping();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout na conexão')), 10000)
        );
        
        await Promise.race([pingPromise, timeoutPromise]);
        
        // Clean disconnect
        await redis.quit();
        
        return { 
          success: true, 
          message: 'Conexão com Redis estabelecida com sucesso!',
          data: { 
            url: redisCredentials.url.replace(/:[^:]*@/, ':***@'),
            tls: isSecure
          }
        };
      } catch (error) {
        // CORREÇÃO: Tratar erro específico de limite excedido do Upstash
        const errorMessage = error.message || String(error);
        
        if (errorMessage.includes('max requests limit exceeded')) {
          return { 
            success: false, 
            error: '❌ LIMITE DO REDIS EXCEDIDO! Sua conta Upstash atingiu 500.000 comandos/mês. ' +
                   'Aguarde o próximo mês ou faça upgrade para continuar usando Redis. ' +
                   'A aplicação funcionará normalmente com cache em memória até lá.'
          };
        }
        
        if (errorMessage.includes('Timeout')) {
          return { 
            success: false, 
            error: 'Timeout na conexão com Redis. Verifique se a URL está correta e se o serviço está disponível.'
          };
        }
        
        return { 
          success: false, 
          error: `Erro na conexão Redis: ${errorMessage}` 
        };
      }

    case 'sentry':
      try {
        const { getSentryCredentials } = await import('../lib/credentialsDb');
        const sentryCredentials = await getSentryCredentials();
        
        if (!sentryCredentials || !sentryCredentials.dsn) {
          return { success: false, error: 'Credenciais do Sentry não encontradas' };
        }
        
        // Test Sentry by sending a test event
        const Sentry = await import('@sentry/node');
        Sentry.init({
          dsn: sentryCredentials.dsn,
          environment: 'test',
          beforeSend: () => null // Don't actually send events during test
        });
        
        return { 
          success: true, 
          message: 'DSN do Sentry validado com sucesso!',
          data: { environment: sentryCredentials.environment || 'production' }
        };
      } catch (error) {
        return { 
          success: false, 
          error: `Erro na validação Sentry: ${error.message}` 
        };
      }

    case 'resend':
      try {
        const { getResendCredentials } = await import('../lib/credentialsDb');
        const resendCredentials = await getResendCredentials();
        
        if (!resendCredentials || !resendCredentials.apiKey) {
          return { success: false, error: 'Credenciais do Resend não encontradas' };
        }
        
        // Test Resend API by verifying the API key
        const response = await fetch('https://api.resend.com/emails', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${resendCredentials.apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok || response.status === 200) {
          return { 
            success: true, 
            message: 'API Key do Resend validada com sucesso!',
            data: { fromEmail: resendCredentials.fromEmail }
          };
        } else {
          return { 
            success: false, 
            error: `Resend API retornou status ${response.status}` 
          };
        }
      } catch (error) {
        return { 
          success: false, 
          error: `Erro na conexão Resend: ${error.message}` 
        };
      }

    case 'cloudflare':
      try {
        const { getCloudflareCredentials } = await import('../lib/credentialsDb');
        const cloudflareCredentials = await getCloudflareCredentials();
        
        if (!cloudflareCredentials || !cloudflareCredentials.zoneId || !cloudflareCredentials.apiToken) {
          return { success: false, error: 'Credenciais do Cloudflare não encontradas' };
        }
        
        console.log('🔍 Testando Cloudflare com Zone ID:', cloudflareCredentials.zoneId.substring(0, 8) + '...');
        console.log('🔑 Comprimento do token:', cloudflareCredentials.apiToken.length);
        console.log('🔑 Token inicia com:', cloudflareCredentials.apiToken.substring(0, 10) + '...');
        
        // Test Cloudflare API by getting zone info
        const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${cloudflareCredentials.zoneId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${cloudflareCredentials.apiToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        console.log('📄 Resposta da API Cloudflare:', JSON.stringify(data).substring(0, 200));
        
        if (response.ok && data.success) {
          return { 
            success: true, 
            message: 'Conexão com Cloudflare estabelecida com sucesso!',
            data: { zoneName: data.result?.name || 'N/A', zoneStatus: data.result?.status || 'N/A' }
          };
        } else {
          const errorMsg = data.errors?.[0]?.message || `Status ${response.status}`;
          console.error('❌ Erro Cloudflare:', errorMsg);
          return { 
            success: false, 
            error: `Cloudflare API: ${errorMsg}` 
          };
        }
      } catch (error) {
        console.error('❌ Exceção ao testar Cloudflare:', error);
        return { 
          success: false, 
          error: `Erro na conexão Cloudflare: ${error.message}` 
        };
      }

    case 'better_stack':
      try {
        const { getBetterStackCredentials } = await import('../lib/credentialsDb');
        const betterStackCredentials = await getBetterStackCredentials();
        
        if (!betterStackCredentials || !betterStackCredentials.sourceToken) {
          return { success: false, error: 'Credenciais do Better Stack não encontradas' };
        }
        
        // Test Better Stack by sending a test log to the ingesting host
        // Better Stack uses Bearer token authentication per documentation
        const sourceToken = betterStackCredentials.sourceToken.trim();
        const ingestingHost = betterStackCredentials.ingestingHost || 'in.logs.betterstack.com';
        const url = `https://${ingestingHost}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sourceToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: 'Test connection from ExecutiveAI Pro',
            level: 'info',
            dt: new Date().toISOString()
          })
        });
        
        // Better Stack returns 202 on success
        if (response.ok || response.status === 200 || response.status === 202) {
          return { 
            success: true, 
            message: 'Conexão com Better Stack estabelecida com sucesso!',
            data: { status: 'connected' }
          };
        } else {
          const errorText = await response.text().catch(() => 'Unknown error');
          return { 
            success: false, 
            error: `Better Stack API retornou status ${response.status}: ${errorText}` 
          };
        }
      } catch (error) {
        return { 
          success: false, 
          error: `Erro na conexão Better Stack: ${error.message}` 
        };
      }

    default:
      return { 
        success: false, 
        error: 'Tipo de integração não suportado para teste' 
      };
  }
}

// Função para validar credenciais baseado no tipo
function validateCredentials(type: string, credentials: any): { valid: boolean; error?: string } {
  switch (type) {
    case 'supabase':
      if (!credentials.url || !credentials.anon_key) {
        return { valid: false, error: 'URL e chave anônima são obrigatórias para Supabase' };
      }
      if (!credentials.url.startsWith('https://') || !credentials.url.includes('.supabase.co')) {
        return { valid: false, error: 'URL do Supabase deve ser válida' };
      }
      break;

    case 'google_calendar':
    case 'google_meet':
      if (!credentials.client_id || !credentials.client_secret) {
        return { valid: false, error: 'Client ID e Client Secret são obrigatórios para Google' };
      }
      break;

    case 'whatsapp':
      if (!credentials.phone_number || !credentials.api_key) {
        return { valid: false, error: 'Número de telefone e API Key são obrigatórios para WhatsApp' };
      }
      break;

    case 'evolution_api':
      if (!credentials.api_url || !credentials.api_key) {
        return { valid: false, error: 'URL da API e API Key são obrigatórias para Evolution API' };
      }
      break;

    case 'pluggy':
      if (!credentials.client_id || !credentials.client_secret) {
        return { valid: false, error: 'Client ID e Client Secret são obrigatórios para Pluggy' };
      }
      break;
  }

  return { valid: true };
}

export { router as credentialsRoutes };