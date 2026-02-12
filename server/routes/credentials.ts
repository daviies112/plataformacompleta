import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { authenticateConfig } from '../middleware/configAuth';
import { credentialsStorage, encrypt, decrypt, saveCredentialsToFile } from '../lib/credentialsManager';
import { clearSupabaseClientCache, testDynamicSupabaseConnection, invalidateConnectionTestCache } from '../lib/multiTenantSupabase';
import { db } from '../db';
import { pluggyConfig, supabaseConfig, n8nConfig, evolutionApiConfig, hms100msConfig, totalExpressConfig, bigdatacorpConfig, googleCalendarConfig, forms, leads, formSubmissions, formTenantMapping } from '../../shared/db-schema.js';
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

    const validTypes = ['supabase', 'google_meet', 'google_calendar', 'whatsapp', 'evolution_api', 'n8n', 'pluggy', 'bigdatacorp', 'hms_100ms', 'total_express'];
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
        await db.insert(supabaseConfig).values({ tenantId, supabaseUrl: encrypt(credentials.url), supabaseAnonKey: encrypt(credentials.anon_key), supabaseBucket: credentials.bucket || '' }).execute();
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
      } else if (integrationType === 'google_calendar') {
        await db.delete(googleCalendarConfig).where(eq(googleCalendarConfig.tenantId, tenantId)).execute();
        await db.insert(googleCalendarConfig).values({
          tenantId,
          clientId: credentials.client_id,
          clientSecret: credentials.client_secret,
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
    } else if (integrationType === 'google_calendar') {
      const config = await db.select().from(googleCalendarConfig).where(eq(googleCalendarConfig.tenantId, tenantId)).limit(1);
      if (config[0]) dbCredentials = { client_id: config[0].clientId, client_secret: config[0].clientSecret };
    }

    if (dbCredentials) {
      const encrypted = encrypt(JSON.stringify(dbCredentials));
      if (!credentialsStorage.has(clientId)) credentialsStorage.set(clientId, new Map());
      credentialsStorage.get(clientId)!.set(integrationType, encrypted);
      return res.json({ success: true, credentials: dbCredentials });
    }

    // Retornar null em vez de 404 para evitar erros no console do frontend
    return res.json({ success: true, credentials: null });
  } catch (error) {
    console.error('Erro ao buscar credenciais:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// ---------------------------------------------------------------
// HELPER: Fluxo completo de conexão Evolution API
// ---------------------------------------------------------------
async function getEvolutionQRCode(
  baseUrl: string,
  apiKey: string,
  instanceName: string
): Promise<{
  success: boolean;
  status: 'already_connected' | 'qrcode_generated' | 'error';
  qrcode?: string;
  pairingCode?: string;
  message?: string;
  error?: string;
}> {
  const headers = {
    'apikey': apiKey,
    'Content-Type': 'application/json',
  };

  // ── PASSO 1: Verificar se a instância existe ──────────────────
  console.log(`🔍 [EVOLUTION] Buscando instâncias em: ${baseUrl}/instance/fetchInstances`);
  let instanceExists = false;
  try {
    const listRes = await fetch(`${baseUrl}/instance/fetchInstances`, { headers });
    if (listRes.ok) {
      const listData = await listRes.json();
      // A resposta pode ser um array ou um objeto com array
      const instances: any[] = Array.isArray(listData) ? listData : (listData.data ?? []);
      instanceExists = instances.some(
        (i: any) => (i.instance?.instanceName ?? i.name ?? i.instanceName) === instanceName
      );
      console.log(`📋 [EVOLUTION] Instância "${instanceName}" existe: ${instanceExists}`);
    } else {
      console.warn(`⚠️ [EVOLUTION] Não foi possível listar instâncias (${listRes.status}). Continuando...`);
    }
  } catch (e: any) {
    console.warn(`⚠️ [EVOLUTION] Erro ao listar instâncias: ${e.message}. Continuando...`);
  }

  // ── PASSO 2: Criar instância se não existir ───────────────────
  if (!instanceExists) {
    console.log(`🆕 [EVOLUTION] Criando instância: ${instanceName}`);
    try {
      const createRes = await fetch(`${baseUrl}/instance/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        }),
      });
      const createData = await createRes.json();
      console.log(`✅ [EVOLUTION] Instância criada:`, JSON.stringify(createData).slice(0, 200));

      // Se já veio o QR Code junto com a criação, aproveitar
      const qrOnCreate =
        createData?.qrcode?.base64 ??
        createData?.base64 ??
        createData?.qrCode ??
        createData?.code;
      if (qrOnCreate) {
        console.log(`🎉 [EVOLUTION] QR Code obtido direto na criação!`);
        return {
          success: true,
          status: 'qrcode_generated',
          qrcode: qrOnCreate,
          pairingCode: createData?.pairingCode,
          message: 'QR Code gerado com sucesso',
        };
      }
    } catch (e: any) {
      console.error(`❌ [EVOLUTION] Erro ao criar instância: ${e.message}`);
      return { success: false, status: 'error', error: `Falha ao criar instância: ${e.message}` };
    }
  }

  // ── PASSO 3: Verificar estado da conexão ──────────────────────
  console.log(`📡 [EVOLUTION] Verificando estado: ${baseUrl}/instance/connectionState/${instanceName}`);
  try {
    const stateRes = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, { headers });
    if (stateRes.ok) {
      const stateData = await stateRes.json();
      const state: string =
        stateData?.instance?.state ??
        stateData?.state ??
        stateData?.connectionStatus ??
        '';
      console.log(`🔌 [EVOLUTION] Estado atual da instância: "${state}"`);

      if (state === 'open') {
        console.log(`✅ [EVOLUTION] Instância já está conectada! Retornando sucesso.`);
        return {
          success: true,
          status: 'already_connected',
          message: 'WhatsApp já está conectado!',
        };
      }
    } else {
      console.warn(`⚠️ [EVOLUTION] Não foi possível checar estado (${stateRes.status}). Tentando conectar mesmo assim...`);
    }
  } catch (e: any) {
    console.warn(`⚠️ [EVOLUTION] Erro ao checar estado: ${e.message}. Tentando conectar...`);
  }

  // ── PASSO 4: Solicitar QR Code ────────────────────────────────
  console.log(`📲 [EVOLUTION] Solicitando QR Code: ${baseUrl}/instance/connect/${instanceName}`);
  try {
    const connectRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, { headers });
    if (!connectRes.ok) {
      const errText = await connectRes.text();
      console.error(`❌ [EVOLUTION] Erro ao conectar (${connectRes.status}): ${errText}`);
      return {
        success: false,
        status: 'error',
        error: `Evolution API retornou ${connectRes.status}: ${errText}`,
      };
    }
    const connectData = await connectRes.json();
    console.log(`🎉 [EVOLUTION] Resposta de conexão:`, JSON.stringify(connectData).slice(0, 200));

    // Normalizar campos do QR Code (a Evolution muda entre versões)
    const qrcode =
      connectData?.base64 ??
      connectData?.qrcode?.base64 ??
      connectData?.qrCode?.base64 ??
      connectData?.code ??
      connectData?.qrcode?.code ??
      null;

    if (!qrcode) {
      console.warn(`⚠️ [EVOLUTION] QR Code não encontrado na resposta:`, connectData);
      return {
        success: false,
        status: 'error',
        error: 'QR Code não encontrado na resposta da Evolution API',
      };
    }

    return {
      success: true,
      status: 'qrcode_generated',
      qrcode,
      pairingCode: connectData?.pairingCode ?? connectData?.code,
      message: 'QR Code gerado com sucesso',
    };
  } catch (e: any) {
    console.error(`❌ [EVOLUTION] Fetch error ao conectar: ${e.message}`);
    return { success: false, status: 'error', error: e.message };
  }
}

// ---------------------------------------------------------------
// ENDPOINT: POST /api/credentials/evolution-api/qrcode
// ---------------------------------------------------------------
router.post('/evolution-api/qrcode', authenticateToken, async (req: any, res) => {
  try {
    const { getEvolutionApiCredentials } = await import('../lib/credentialsDb');
    const credentials = await getEvolutionApiCredentials(req.user!.tenantId);

    if (!credentials?.apiUrl || !credentials?.apiKey) {
      return res.status(404).json({ success: false, error: 'Evolution API não configurada. Insira a URL e a API Key.' });
    }

    const { instance = 'nexus-whatsapp' } = req.body;
    const baseUrl = credentials.apiUrl.replace(/\/+$/, '');

    const result = await getEvolutionQRCode(baseUrl, credentials.apiKey, instance);

    if (!result.success) {
      return res.status(500).json(result);
    }

    return res.json({
      success: true,
      alreadyConnected: result.status === 'already_connected',
      qrcode: result.qrcode ?? null,
      pairingCode: result.pairingCode ?? null,
      instance,
      message: result.message,
    });
  } catch (error: any) {
    console.error('❌ [EVOLUTION] Erro inesperado no endpoint de QR Code:', error);
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

// 🚀 Generic Credentials Test Endpoint
router.post('/test/:integrationType', authenticateToken, async (req, res) => {
  try {
    const { integrationType } = req.params;
    const credentials = req.body;

    console.log(`🧪 [CREDENTIALS] Testing connection for ${integrationType}`);

    if (integrationType === 'evolution_api') {
      const { apiUrl, apiKey, instance } = req.body as any;

      if (!apiUrl || !apiKey) {
        return res.status(400).json({ success: false, error: 'URL da API e API Key são obrigatórios' });
      }

      const baseUrl = (apiUrl as string).replace(/\/+$/, '');
      const instanceName: string = instance || 'nexus-whatsapp';

      console.log(`🧪 [EVOLUTION] Testando conexão - URL: ${baseUrl} | Instância: ${instanceName}`);

      // Tenta verificar estado primeiro (prova que a URL e a key estão corretas)
      try {
        const stateRes = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
          method: 'GET',
          headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10000), // 10s timeout
        });

        if (stateRes.ok) {
          const data = await stateRes.json();
          const state = data?.instance?.state ?? data?.state ?? data?.connectionStatus ?? 'desconhecido';
          return res.json({
            success: true,
            message: `Conexão com Evolution API OK! Estado: ${state}`,
            data,
          });
        }

        // 404 na instância não significa que a API está errada — pode ser instância inexistente
        if (stateRes.status === 404) {
          // Verificar se a API em si responde (endpoint público)
          const pingRes = await fetch(`${baseUrl}/instance/fetchInstances`, {
            headers: { 'apikey': apiKey },
            signal: AbortSignal.timeout(10000),
          }).catch(() => null);

          if (pingRes?.ok) {
            return res.json({
              success: true,
              message: `API conectada! Instância "${instanceName}" ainda não existe (será criada ao gerar QR Code).`,
            });
          }
        }

        const errText = await stateRes.text().catch(() => stateRes.statusText);
        console.error(`❌ [EVOLUTION] Erro no teste (${stateRes.status}): ${errText}`);
        return res.status(400).json({
          success: false,
          error: `Erro ao conectar na Evolution API: ${stateRes.status} ${stateRes.statusText}`,
          details: errText,
        });

      } catch (fetchError: any) {
        console.error(`❌ [EVOLUTION] Fetch error no teste:`, fetchError);

        // Mensagem amigável por tipo de erro
        let friendlyError = 'Não foi possível conectar ao servidor Evolution API.';
        if (fetchError.name === 'TimeoutError') {
          friendlyError = 'Timeout: o servidor não respondeu em 10 segundos. Verifique se a URL está correta e o servidor está online.';
        } else if (fetchError.cause?.code === 'ECONNREFUSED') {
          friendlyError = 'Conexão recusada. Verifique se o servidor Evolution API está rodando na porta correta.';
        } else if (fetchError.cause?.code === 'ENOTFOUND') {
          friendlyError = 'Host não encontrado. Verifique se a URL da API está correta.';
        }

        return res.status(500).json({
          success: false,
          error: friendlyError,
          details: fetchError.message,
        });
      }
    }

    // Default handler for other types or mocks
    // Google, Pluggy, etc can be implemented here as needed

    return res.json({
      success: true,
      message: `Teste para ${integrationType} recebido com sucesso (Simulação)`
    });

  } catch (error: any) {
    console.error(`❌ [CREDENTIALS] Test error:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// List configured credentials status
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const clientId = req.user!.clientId;
    const clientCredentials = credentialsStorage.get(clientId);

    // Check which credentials are configured (in memory or DB)
    const status: Record<string, boolean> = {
      supabase: false,
      google_calendar: false,
      whatsapp: false,
      evolution_api: false,
      pluggy: false,
      n8n: false
    };

    // Check memory
    if (clientCredentials) {
      if (clientCredentials.has('supabase')) status.supabase = true;
      if (clientCredentials.has('google_calendar') || clientCredentials.has('google_meet')) status.google_calendar = true;
      if (clientCredentials.has('whatsapp')) status.whatsapp = true;
      if (clientCredentials.has('evolution_api')) status.evolution_api = true;
      if (clientCredentials.has('pluggy')) status.pluggy = true;
      if (clientCredentials.has('n8n')) status.n8n = true;
    }

    // Check DB for missing ones (fallback)
    // This is a simplified check, ideally we should query DB if not in memory
    // For now, we return what's in memory or empty to force re-fetch if needed

    res.json(status);
  } catch (error) {
    console.error('Erro ao listar status de credenciais:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

export { router as credentialsRoutes };
