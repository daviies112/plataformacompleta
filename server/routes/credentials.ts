import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { authenticateConfig } from '../middleware/configAuth';
import { credentialsStorage, encrypt, decrypt, saveCredentialsToFile } from '../lib/credentialsManager';
import { clearSupabaseClientCache, testDynamicSupabaseConnection, invalidateConnectionTestCache } from '../lib/multiTenantSupabase';
import { db } from '../db';
import { pluggyConfig, supabaseConfig, n8nConfig, evolutionApiConfig, hms100msConfig, totalExpressConfig, bigdatacorpConfig, forms, leads, formSubmissions, formTenantMapping } from '../../shared/db-schema.js';
import { eq } from 'drizzle-orm';
import { getSupabaseCredentials, getSupabaseCredentialsStrict, getPluggyCredentials, getN8nCredentials, getEvolutionApiCredentials } from '../lib/credentialsDb';
import { resetAllPollerStates } from '../lib/stateReset';
import { invalidateClienteCache } from '../lib/clienteSupabase';
import { clearSupabaseClientCache as clearFormularioSupabaseCache } from '../formularios/utils/supabaseClient';
import { syncAdminCredentialsToOwner } from '../lib/masterSyncService';
import { invalidateLeadsCache } from './leadsPipelineRoutes';
import { clearLocalContractsCache } from './assinatura';
import { supabaseOwner, SUPABASE_CONFIGURED } from '../config/supabaseOwner';
import { invalidateCredentialsCache } from '../lib/publicCache';
import fs from 'fs';
import path from 'path';

const router = express.Router();

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

    case 'hms_100ms':
      if (!credentials.app_access_key || !credentials.app_secret) {
        return { valid: false, error: 'App Access Key e App Secret são obrigatórios' };
      }
      break;

    case 'total_express':
      if (!credentials.user || !credentials.password || !credentials.reid) {
        return { valid: false, error: 'Usuário, Senha e REID são obrigatórios' };
      }
      break;
  }

  return { valid: true };
}

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
    } catch (dbErr) {
      console.warn('⚠️ [DB] Erro ao deletar supabaseConfig:', dbErr);
    }

    try {
      await db.delete(pluggyConfig)
        .where(eq(pluggyConfig.tenantId, tenantId))
        .execute();
      cleared.database.push('pluggyConfig');
    } catch (dbErr) {
      console.warn('⚠️ [DB] Erro ao deletar pluggyConfig:', dbErr);
    }

    try {
      await db.delete(n8nConfig)
        .where(eq(n8nConfig.tenantId, tenantId))
        .execute();
      cleared.database.push('n8nConfig');
    } catch (dbErr) {
      console.warn('⚠️ [DB] Erro ao deletar n8nConfig:', dbErr);
    }

    try {
      await db.delete(evolutionApiConfig)
        .where(eq(evolutionApiConfig.tenantId, tenantId))
        .execute();
      cleared.database.push('evolutionApiConfig');
    } catch (dbErr) {
      console.warn('⚠️ [DB] Erro ao deletar evolutionApiConfig:', dbErr);
    }

    try {
      await db.delete(hms100msConfig)
        .where(eq(hms100msConfig.tenantId, tenantId))
        .execute();
      cleared.database.push('hms100msConfig');
    } catch (dbErr) {
      console.warn('⚠️ [DB] Erro ao deletar hms100msConfig:', dbErr);
    }

    try {
      await db.delete(totalExpressConfig)
        .where(eq(totalExpressConfig.tenantId, tenantId))
        .execute();
      cleared.database.push('totalExpressConfig');
    } catch (dbErr) {
      console.warn('⚠️ [DB] Erro ao deletar totalExpressConfig:', dbErr);
    }

    try {
      await db.delete(bigdatacorpConfig)
        .where(eq(bigdatacorpConfig.tenantId, tenantId))
        .execute();
      cleared.database.push('bigdatacorpConfig');
    } catch (dbErr) {
      console.warn('⚠️ [DB] Erro ao deletar bigdatacorpConfig:', dbErr);
    }

    // 4. Reset poller states
    resetAllPollerStates();
    cleared.cache.push('pollerStates');

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

    invalidateCredentialsCache(tenantId);
    cleared.cache.push('publicCredentialsCache');

    // 6. Delete local config files
    const dataDir = path.join(process.cwd(), 'data');
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
      'supabase-config.json',
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

    // 8. Delete local PostgreSQL data
    try {
      await db.delete(formSubmissions).where(eq(formSubmissions.tenantId, tenantId)).execute();
      cleared.database.push('formSubmissions');
      await db.delete(formTenantMapping).where(eq(formTenantMapping.tenantId, tenantId)).execute();
      cleared.database.push('formTenantMapping');
      await db.delete(forms).where(eq(forms.tenantId, tenantId)).execute();
      cleared.database.push('forms');
      await db.delete(leads).where(eq(leads.tenantId, tenantId)).execute();
      cleared.database.push('leads');
    } catch (dbErr) {
      console.warn('⚠️ [DB] Erro ao deletar dados locais:', dbErr);
    }

    res.json({ success: true, cleared });
  } catch (error) {
    console.error('❌ [CREDENTIALS] Erro ao limpar credenciais:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// Salvar credenciais
router.put('/:integrationType', authenticateToken, async (req, res) => {
  try {
    const { integrationType } = req.params;
    const clientId = req.user!.clientId;
    const tenantId = req.user!.tenantId;
    const credentials = req.body;

    if (!tenantId) return res.status(401).json({ success: false, error: 'Tenant ID ausente' });

    const validTypes = ['supabase', 'google_meet', 'whatsapp', 'evolution_api', 'n8n', 'pluggy', 'bigdatacorp', 'hms_100ms', 'total_express'];
    if (!validTypes.includes(integrationType)) return res.status(400).json({ success: false, error: 'Tipo inválido' });

    const validationResult = validateCredentials(integrationType, credentials);
    if (!validationResult.valid) return res.status(400).json({ success: false, error: validationResult.error });

    const encryptedCredentials = encrypt(JSON.stringify(credentials));
    if (!credentialsStorage.has(clientId)) credentialsStorage.set(clientId, new Map());
    credentialsStorage.get(clientId)!.set(integrationType, encryptedCredentials);
    saveCredentialsToFile();

    try {
      if (integrationType === 'pluggy') {
        await db.delete(pluggyConfig).where(eq(pluggyConfig.tenantId, tenantId)).execute();
        await db.insert(pluggyConfig).values({ tenantId, clientId: credentials.client_id, clientSecret: credentials.client_secret }).execute();
      } else if (integrationType === 'supabase') {
        await db.delete(supabaseConfig).where(eq(supabaseConfig.tenantId, tenantId)).execute();
        await db.insert(supabaseConfig).values({ tenantId, supabaseUrl: encrypt(credentials.url), supabaseAnonKey: encrypt(credentials.anon_key), bucket: credentials.bucket || '' }).execute();
        syncAdminCredentialsToOwner(req.user!.userId || tenantId, {
          supabase_url: credentials.url,
          supabase_anon_key: credentials.anon_key,
          supabase_service_role_key: credentials.service_role_key || undefined,
          project_name: tenantId
        });
      } else if (integrationType === 'n8n') {
        await db.delete(n8nConfig).where(eq(n8nConfig.tenantId, tenantId)).execute();
        await db.insert(n8nConfig).values({ tenantId, webhookUrl: encrypt(credentials.webhook_url) }).execute();
      } else if (integrationType === 'evolution_api') {
        await db.delete(evolutionApiConfig).where(eq(evolutionApiConfig.tenantId, tenantId)).execute();
        await db.insert(evolutionApiConfig).values({
          tenantId,
          apiUrl: encrypt(credentials.api_url),
          apiKey: encrypt(credentials.api_key),
          instance: credentials.instance || 'nexus-whatsapp'
        }).execute();
      } else if (integrationType === 'bigdatacorp') {
        await db.delete(bigdatacorpConfig).where(eq(bigdatacorpConfig.tenantId, tenantId)).execute();
        await db.insert(bigdatacorpConfig).values({ tenantId, tokenId: encrypt(credentials.token_id), chaveToken: encrypt(credentials.chave_token) }).execute();
      } else if (integrationType === 'hms_100ms') {
        await db.delete(hms100msConfig).where(eq(hms100msConfig.tenantId, tenantId)).execute();
        await db.insert(hms100msConfig).values({
          tenantId,
          appAccessKey: credentials.app_access_key,
          appSecret: credentials.app_secret,
          managementToken: credentials.management_token,
          templateId: credentials.template_id,
          apiBaseUrl: credentials.api_base_url || 'https://api.100ms.live/v2'
        }).execute();
      } else if (integrationType === 'total_express') {
        await db.delete(totalExpressConfig).where(eq(totalExpressConfig.tenantId, tenantId)).execute();
        await db.insert(totalExpressConfig).values({
          tenantId,
          user: credentials.user,
          password: credentials.password,
          reid: credentials.reid,
          service: credentials.service || 'EXP',
          testMode: credentials.test_mode !== undefined ? credentials.test_mode : true
        }).execute();
      }
    } catch (dbError) {
      console.error('Erro ao salvar no banco:', dbError);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao salvar credenciais:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// Recuperar credenciais
router.get('/:integrationType', authenticateToken, async (req, res) => {
  try {
    const { integrationType } = req.params;
    const clientId = req.user!.clientId;
    const tenantId = req.user!.tenantId;

    if (!tenantId) return res.status(401).json({ success: false, error: 'Tenant ID ausente' });

    const clientCredentials = credentialsStorage.get(clientId);
    if (clientCredentials && clientCredentials.has(integrationType)) {
      return res.json({ success: true, credentials: JSON.parse(decrypt(clientCredentials.get(integrationType)!)) });
    }

    let dbCredentials = null;
    if (integrationType === 'supabase') {
      const creds = await getSupabaseCredentialsStrict(tenantId);
      if (creds) dbCredentials = { url: creds.url, anon_key: creds.anonKey, bucket: creds.bucket };
    } else if (integrationType === 'pluggy') {
      const creds = await getPluggyCredentials(tenantId);
      if (creds) dbCredentials = { client_id: creds.clientId, client_secret: creds.clientSecret };
    } else if (integrationType === 'n8n') {
      const creds = await getN8nCredentials(tenantId);
      if (creds) dbCredentials = { webhook_url: creds.webhookUrl };
    } else if (integrationType === 'evolution_api') {
      const creds = await getEvolutionApiCredentials(tenantId);
      if (creds) dbCredentials = { api_url: decrypt(creds.apiUrl), api_key: decrypt(creds.apiKey), instance: creds.instance };
    } else if (integrationType === 'bigdatacorp') {
      const config = await db!.query.bigdatacorpConfig.findFirst({ where: eq(bigdatacorpConfig.tenantId, tenantId) });
      if (config) dbCredentials = { token_id: decrypt(config.tokenId), chave_token: decrypt(config.chaveToken) };
    } else if (integrationType === 'hms_100ms') {
      const config = await db!.query.hms100msConfig.findFirst({ where: eq(hms100msConfig.tenantId, tenantId) });
      if (config) dbCredentials = { 
        app_access_key: config.appAccessKey, 
        app_secret: config.appSecret, 
        management_token: config.managementToken, 
        template_id: config.templateId,
        api_base_url: config.apiBaseUrl
      };
    } else if (integrationType === 'total_express') {
      const config = await db!.query.totalExpressConfig.findFirst({ where: eq(totalExpressConfig.tenantId, tenantId) });
      if (config) dbCredentials = { user: config.user, password: config.password, reid: config.reid, service: config.service, test_mode: config.testMode };
    }

    if (dbCredentials) {
      const encrypted = encrypt(JSON.stringify(dbCredentials));
      if (!credentialsStorage.has(clientId)) credentialsStorage.set(clientId, new Map());
      credentialsStorage.get(clientId)!.set(integrationType, encrypted);
      return res.json({ success: true, credentials: dbCredentials });
    }

    res.status(404).json({ success: false, error: 'Não encontrado' });
  } catch (error) {
    console.error('Erro ao buscar credenciais:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// Evolution API QR Code
router.post('/evolution-api/qrcode', authenticateToken, async (req, res) => {
  try {
    const { getEvolutionApiCredentials } = await import('../lib/credentialsDb');
    const credentials = await getEvolutionApiCredentials(req.user!.tenantId);
    if (!credentials || !credentials.apiUrl || !credentials.apiKey) return res.status(404).json({ success: false, error: 'Não configurado' });

    const { instance = 'nexus-whatsapp' } = req.body;
    const baseUrl = credentials.apiUrl.replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/instance/connect/${instance}`, {
      headers: { 'apiKey': credentials.apiKey, 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      const data = await response.json();
      res.json({ success: true, qrcode: data.base64 || data.qrcode?.base64 || data.code, pairingCode: data.code || data.pairingCode, instance });
    } else {
      res.status(response.status).json({ success: false, error: 'Erro ao gerar QR Code' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Evolution API Status
router.get('/evolution-api/status/:instance', authenticateToken, async (req, res) => {
  try {
    const { getEvolutionApiCredentials } = await import('../lib/credentialsDb');
    const credentials = await getEvolutionApiCredentials(req.user!.tenantId);
    if (!credentials || !credentials.apiUrl || !credentials.apiKey) return res.status(404).json({ success: false, error: 'Não configurado' });

    const { instance } = req.params;
    const baseUrl = credentials.apiUrl.replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/instance/connectionState/${instance}`, {
      headers: { 'apiKey': credentials.apiKey, 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      const data = await response.json();
      const state = data.state || data.instance?.state || 'unknown';
      res.json({ success: true, state, connected: state === 'open', instance, profileName: data.profileName || data.instance?.profileName });
    } else {
      res.status(response.status).json({ success: false, error: 'Erro ao verificar status' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export { router as credentialsRoutes };
