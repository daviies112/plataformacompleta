import type { Express } from "express";
import express from "express";
import { calculateMonthlyProjections, calculateHybridInvoices } from "../lib/billing-service";
import { pool } from "../db";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { cachedTransactions, cachedInvoices, cacheMetadata, pluggyConfig, attachments, transactionAttachments, supabaseConfig, n8nConfig, files } from "../../shared/db-schema";
import multer from 'multer';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';
import { encrypt, decrypt } from '../lib/credentialsManager';
import { authenticateConfig } from '../middleware/configAuth';
import { authenticateToken } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';
import { fetchSupabaseFiles } from '../helpers/supabaseFiles';
import { cacheBillingData, invalidateBillingCache } from '../lib/cacheStrategies';

async function obterPluggyApiKey(clientId: string, clientSecret: string): Promise<string> {
  const authResponse = await fetch("https://api.pluggy.ai/auth", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clientId,
      clientSecret,
    }),
  });

  if (!authResponse.ok) {
    const errorData = await authResponse.json();
    console.error("Erro na autenticação Pluggy:", errorData);
    throw new Error("Falha na autenticação com Pluggy");
  }

  const { apiKey } = await authResponse.json();

  if (!apiKey) {
    console.error("⚠️ API Key não encontrado na resposta do Pluggy /auth");
    throw new Error("API Key não retornado pelo Pluggy");
  }

  console.log(`✅ Pluggy API Key obtido com sucesso (${apiKey.substring(0, 20)}...)`);
  return apiKey;
}

async function getPluggyApiKey(req?: any, tenantId?: string): Promise<string> {
  // PRIORIDADE 1: Banco de dados (configurações salvas pelo usuário)
  try {
    if (tenantId) {
      const configFromDb = await db.select().from(pluggyConfig)
        .where(eq(pluggyConfig.tenantId, tenantId))
        .limit(1);
      if (configFromDb[0]) {
        console.log(`🔑 Usando credenciais do banco de dados para tenant ${tenantId}`);
        // Descriptografar as credenciais antes de usar
        const decryptedClientId = decrypt(configFromDb[0].clientId);
        const decryptedClientSecret = decrypt(configFromDb[0].clientSecret);
        return obterPluggyApiKey(decryptedClientId, decryptedClientSecret);
      }
    }
  } catch (error) {
    console.log("⚠️ Tabela pluggy_config não existe ou erro ao consultar, usando fallback");
  }

  // PRIORIDADE 2: Replit Secrets (fallback)
  const clientIdFromEnv = process.env.PLUGGY_CLIENT_ID;
  const clientSecretFromEnv = process.env.PLUGGY_CLIENT_SECRET;

  if (clientIdFromEnv && clientSecretFromEnv) {
    console.log("🔑 Usando credenciais dos Secrets do Replit (fallback)");
    return obterPluggyApiKey(clientIdFromEnv, clientSecretFromEnv);
  }

  // PRIORIDADE 3: Headers da requisição (fallback)
  const clientIdFromHeaders = req?.headers?.["x-pluggy-client-id"];
  const clientSecretFromHeaders = req?.headers?.["x-pluggy-client-secret"];

  if (clientIdFromHeaders && clientSecretFromHeaders) {
    console.log("🔑 Usando credenciais dos Headers da requisição (fallback)");
    return obterPluggyApiKey(clientIdFromHeaders, clientSecretFromHeaders);
  }

  throw new Error("Credenciais do Pluggy não configuradas");
}

export function setupBillingRoutes(app: Express) {

  // ===== ENDPOINTS DE CONFIGURAÇÃO DO PLUGGY =====

  app.get("/api/config/pluggy", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const configFromDb = await db.select().from(pluggyConfig)
        .where(eq(pluggyConfig.tenantId, tenantId))
        .limit(1);

      if (configFromDb[0]) {
        return res.json({
          configured: true,
          createdAt: configFromDb[0].createdAt,
          updatedAt: configFromDb[0].updatedAt,
        });
      }

      return res.json({
        configured: false,
      });
    } catch (error) {
      console.log("⚠️ Tabela pluggy_config não existe, retornando configured: false");
      return res.json({
        configured: false,
      });
    }
  });

  app.post("/api/config/pluggy", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      const { clientId, clientSecret } = req.body;
      const tenantId = req.user!.tenantId;

      if (!clientId || !clientSecret) {
        return res.status(400).json({
          error: "clientId e clientSecret são obrigatórios",
        });
      }

      // Criptografar as credenciais antes de salvar
      const encryptedClientId = encrypt(clientId);
      const encryptedClientSecret = encrypt(clientSecret);

      const existingConfig = await db.select().from(pluggyConfig)
        .where(eq(pluggyConfig.tenantId, tenantId))
        .limit(1);

      if (existingConfig[0]) {
        await db
          .update(pluggyConfig)
          .set({
            clientId: encryptedClientId,
            clientSecret: encryptedClientSecret,
            updatedAt: new Date(),
          })
          .where(and(
            eq(pluggyConfig.id, existingConfig[0].id),
            eq(pluggyConfig.tenantId, tenantId)
          ));

        console.log(`✅ Configuração do Pluggy atualizada para tenant ${tenantId}`);
        return res.json({
          success: true,
          message: "Credenciais atualizadas com sucesso",
        });
      } else {
        await db.insert(pluggyConfig).values({
          tenantId,
          clientId: encryptedClientId,
          clientSecret: encryptedClientSecret,
        });

        console.log(`✅ Configuração do Pluggy salva para tenant ${tenantId}`);
        return res.json({
          success: true,
          message: "Credenciais salvas com sucesso",
        });
      }
    } catch (error) {
      console.error("Erro ao salvar configuração do Pluggy:", error);
      return res.status(500).json({
        error: "Erro ao salvar configuração",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // ===== ENDPOINTS DE CONFIGURAÇÃO DO SUPABASE STORAGE =====
  // RENOMEADO: /api/config/supabase/storage (evita conflito com config.ts)

  app.get("/api/config/supabase/storage", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const configFromDb = await db.select().from(supabaseConfig)
        .where(eq(supabaseConfig.tenantId, tenantId))
        .limit(1);

      if (configFromDb[0]) {
        return res.json({
          configured: true,
          bucket: configFromDb[0].supabaseBucket,
          createdAt: configFromDb[0].createdAt,
          updatedAt: configFromDb[0].updatedAt,
        });
      }

      return res.json({
        configured: false,
      });
    } catch (error) {
      console.error("Erro ao buscar configuração do Supabase Storage:", error);
      return res.status(500).json({
        error: "Erro ao buscar configuração",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // Endpoint para retornar credenciais descriptografadas do Supabase (para exibir na UI)
  // PROTEGIDO por authenticateConfig para evitar exposição de credenciais
  app.get("/api/config/supabase/credentials", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const configFromDb = await db.select().from(supabaseConfig)
        .where(eq(supabaseConfig.tenantId, tenantId))
        .limit(1);

      if (configFromDb[0]) {
        // Descriptografar as credenciais
        const decryptedUrl = decrypt(configFromDb[0].supabaseUrl);
        const decryptedKey = decrypt(configFromDb[0].supabaseAnonKey);

        return res.json({
          success: true,
          credentials: {
            url: decryptedUrl,
            anon_key: decryptedKey,
            bucket: configFromDb[0].supabaseBucket
          }
        });
      }

      return res.status(404).json({
        success: false,
        error: "Credenciais não encontradas"
      });
    } catch (error) {
      console.error("Erro ao buscar credenciais do Supabase:", error);
      return res.status(500).json({
        success: false,
        error: "Erro ao buscar credenciais",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  app.post("/api/config/supabase", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      const { supabaseUrl, supabaseAnonKey, supabaseBucket } = req.body;
      const tenantId = req.user!.tenantId;

      if (!supabaseUrl || !supabaseAnonKey) {
        return res.status(400).json({
          error: "supabaseUrl e supabaseAnonKey são obrigatórios",
        });
      }

      // Criptografar as credenciais antes de salvar
      const encryptedUrl = encrypt(supabaseUrl);
      const encryptedKey = encrypt(supabaseAnonKey);

      const existingConfig = await db.select().from(supabaseConfig)
        .where(eq(supabaseConfig.tenantId, tenantId))
        .limit(1);

      if (existingConfig[0]) {
        await db
          .update(supabaseConfig)
          .set({
            supabaseUrl: encryptedUrl,
            supabaseAnonKey: encryptedKey,
            supabaseBucket: supabaseBucket || 'receipts',
            updatedAt: new Date(),
          })
          .where(and(
            eq(supabaseConfig.id, existingConfig[0].id),
            eq(supabaseConfig.tenantId, tenantId)
          ));

        console.log(`✅ Configuração do Supabase atualizada para tenant ${tenantId}`);
        return res.json({
          success: true,
          message: "Configuração do Supabase atualizada com sucesso",
        });
      } else {
        await db.insert(supabaseConfig).values({
          tenantId,
          supabaseUrl: encryptedUrl,
          supabaseAnonKey: encryptedKey,
          supabaseBucket: supabaseBucket || 'receipts',
        });

        console.log(`✅ Configuração do Supabase salva para tenant ${tenantId}`);
        return res.json({
          success: true,
          message: "Configuração do Supabase salva com sucesso",
        });
      }
    } catch (error) {
      console.error("Erro ao salvar configuração do Supabase:", error);
      return res.status(500).json({
        error: "Erro ao salvar configuração",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // ===== ENDPOINTS DE CONFIGURAÇÃO DO N8N =====

  app.get("/api/config/n8n", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const configFromDb = await db.select().from(n8nConfig)
        .where(eq(n8nConfig.tenantId, tenantId))
        .limit(1);

      if (configFromDb[0]) {
        return res.json({
          configured: true,
          createdAt: configFromDb[0].createdAt,
          updatedAt: configFromDb[0].updatedAt,
        });
      }

      return res.json({
        configured: false,
      });
    } catch (error) {
      console.error("Erro ao buscar configuração do N8N:", error);
      return res.status(500).json({
        error: "Erro ao buscar configuração",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  app.post("/api/config/n8n", authenticateConfig, async (req: AuthRequest, res) => {
    try {
      const { webhookUrl } = req.body;
      const tenantId = req.user!.tenantId;

      if (!webhookUrl) {
        return res.status(400).json({
          error: "webhookUrl é obrigatório",
        });
      }

      // Criptografar a URL do webhook antes de salvar
      const encryptedUrl = encrypt(webhookUrl);

      const existingConfig = await db.select().from(n8nConfig)
        .where(eq(n8nConfig.tenantId, tenantId))
        .limit(1);

      if (existingConfig[0]) {
        await db
          .update(n8nConfig)
          .set({
            webhookUrl: encryptedUrl,
            updatedAt: new Date(),
          })
          .where(and(
            eq(n8nConfig.id, existingConfig[0].id),
            eq(n8nConfig.tenantId, tenantId)
          ));

        console.log(`✅ Configuração do N8N atualizada para tenant ${tenantId}`);
        return res.json({
          success: true,
          message: "URL do webhook atualizada com sucesso",
        });
      } else {
        await db.insert(n8nConfig).values({
          tenantId,
          webhookUrl: encryptedUrl,
        });

        console.log(`✅ Configuração do N8N salva para tenant ${tenantId}`);
        return res.json({
          success: true,
          message: "URL do webhook salva com sucesso",
        });
      }
    } catch (error) {
      console.error("Erro ao salvar configuração do N8N:", error);
      return res.status(500).json({
        error: "Erro ao salvar configuração",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // ===== ENDPOINTS DE SUPABASE FILES =====

  app.get("/api/supabase/files", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const clientId = req.user!.clientId;

      // Cache Supabase file indexes with compression (15 min TTL)
      const files = await cacheBillingData(
        clientId,
        'files',
        async () => {
          console.log('🔄 Cache MISS for Supabase files, fetching...');
          const result = await fetchSupabaseFiles(clientId);

          if (!result.success) {
            throw new Error(result.error || 'Erro ao buscar arquivos do Supabase');
          }

          console.log(`✅ ${result.data.length} arquivo(s) do Supabase retornados`);
          return result.data;
        },
        { compress: true, ttl: 900 }
      ).catch(async (error) => {
        console.error('❌ Cache error for Supabase files, using fallback:', error);

        // Graceful degradation - fetch without cache
        const result = await fetchSupabaseFiles(clientId);

        if (!result.success) {
          throw new Error(result.error || 'Erro ao buscar arquivos do Supabase');
        }

        return result.data;
      });

      return res.json(files);
    } catch (error) {
      console.error("Erro ao buscar arquivos do Supabase:", error);
      return res.status(500).json({
        error: "Erro ao buscar arquivos",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        data: []
      });
    }
  });

  // ===== ENDPOINTS DE PERSISTÊNCIA DE ITEMS =====
  // ⚠️ ⚠️ ⚠️ CRÍTICO - ESTES ENDPOINTS SÃO FUNDAMENTAIS ⚠️ ⚠️ ⚠️
  // NÃO MODIFICAR SEM LER: PROBLEMA_PLUGGY_RESOLVIDO.md
  // Pluggy removeu GET /items, agora salvamos localmente no PostgreSQL

  // POST /api/items - Salvar item no banco
  // ⚠️ CRÍTICO: Este endpoint é chamado pelo frontend após cada conexão bem-sucedida
  app.post("/api/items", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id, connectorId, connectorName, status, executionStatus } = req.body;
      const tenantId = req.user!.tenantId;

      if (!tenantId) {
        return res.status(401).json({
          error: "Não autorizado: tenantId não encontrado",
        });
      }

      if (!id || !connectorId || !connectorName || !status || !executionStatus) {
        return res.status(400).json({
          error: "Todos os campos são obrigatórios: id, connectorId, connectorName, status, executionStatus",
        });
      }

      const checkResult = await pool.query(
        'SELECT id FROM pluggy_items WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      if (checkResult.rows.length > 0) {
        const updateResult = await pool.query(
          'UPDATE pluggy_items SET connector_id = $1, connector_name = $2, status = $3, execution_status = $4, updated_at = NOW() WHERE id = $5 AND tenant_id = $6 RETURNING *',
          [connectorId, connectorName, status, executionStatus, id, tenantId]
        );

        console.log(`✅ Item ${id.substring(0, 8)}... atualizado no banco para tenant ${tenantId}`);
        return res.json(updateResult.rows[0]);
      } else {
        const insertResult = await pool.query(
          'INSERT INTO pluggy_items (id, connector_id, connector_name, status, execution_status, tenant_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
          [id, connectorId, connectorName, status, executionStatus, tenantId]
        );

        console.log(`✅ Item ${id.substring(0, 8)}... salvo no banco para tenant ${tenantId}`);
        return res.json(insertResult.rows[0]);
      }
    } catch (error) {
      console.error("Erro ao salvar item no banco:", error);
      return res.status(500).json({
        error: "Erro ao salvar item",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // GET /api/items - Listar items do banco
  app.get("/api/items", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const clientId = req.user!.clientId;
      const tenantId = req.user!.tenantId;

      if (!tenantId) {
        return res.status(401).json({
          error: "Não autorizado: tenantId não encontrado",
        });
      }

      const items = await cacheBillingData(
        clientId,
        'items',
        async () => {
          const result = await pool.query('SELECT * FROM pluggy_items WHERE tenant_id = $1', [tenantId]);
          console.log(`📋 ${result.rows.length} item(s) carregado(s) do banco para tenant ${tenantId}`);
          return result.rows;
        },
        { compress: false }
      ).catch(async (error) => {
        console.error('Cache error for items, using fallback:', error);
        const result = await pool.query('SELECT * FROM pluggy_items WHERE tenant_id = $1', [tenantId]);
        return result.rows;
      });

      return res.json(items);
    } catch (error) {
      console.error("Erro ao listar items do banco:", error);
      return res.status(500).json({
        error: "Erro ao listar items",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // GET /api/pluggy/all-items - Buscar items do banco de dados local
  // ⚠️ CRÍTICO: Este endpoint substitui o GET /items do Pluggy que foi removido
  // IMPORTANTE: Pluggy removeu o endpoint GET /items por questões de segurança
  // Agora precisamos guardar os itemIds no banco quando são criados via widget
  app.get("/api/pluggy/all-items", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const clientId = req.user!.clientId;
      const tenantId = req.user!.tenantId;

      if (!tenantId) {
        return res.status(401).json({
          error: "Não autorizado: tenantId não encontrado",
        });
      }

      const itemsWithDetails = await cacheBillingData(
        clientId,
        'items',
        async () => {
          console.log(`🔍 Buscando items do banco de dados local para tenant ${tenantId}...`);

          // Buscar todos os items salvos no banco filtrados por tenantId
          const dbResult = await pool.query('SELECT * FROM pluggy_items WHERE tenant_id = $1 ORDER BY created_at DESC', [tenantId]);
          const items = dbResult.rows;

          console.log(`📦 ${items.length} item(s) encontrado(s) no banco de dados para tenant ${tenantId}`);

          // Para cada item, buscar dados atualizados do Pluggy
          const apiKey = await getPluggyApiKey(req, tenantId);
          const itemsWithDetailsData = [];

          for (const dbItem of items) {
            try {
              // Buscar dados atualizados do item específico via GET /items/{id}
              const itemResponse = await fetch(`https://api.pluggy.ai/items/${dbItem.id}`, {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  "X-API-KEY": apiKey,
                },
              });

              if (itemResponse.ok) {
                const itemData = await itemResponse.json();
                itemsWithDetailsData.push(itemData);
                console.log(`✅ Item ${dbItem.id.substring(0, 8)}... atualizado da API Pluggy`);
              } else {
                // Se falhar, usar dados do banco
                console.log(`⚠️ Não foi possível atualizar item ${dbItem.id.substring(0, 8)}..., usando dados do banco`);
                itemsWithDetailsData.push({
                  id: dbItem.id,
                  connector: {
                    id: dbItem.connector_id,
                    name: dbItem.connector_name,
                  },
                  status: dbItem.status,
                  executionStatus: dbItem.execution_status,
                  createdAt: dbItem.created_at,
                  updatedAt: dbItem.updated_at,
                });
              }
            } catch (error) {
              console.error(`Erro ao buscar item ${dbItem.id}:`, error);
              // Usar dados do banco se houver erro
              itemsWithDetailsData.push({
                id: dbItem.id,
                connector: {
                  id: dbItem.connector_id,
                  name: dbItem.connector_name,
                },
                status: dbItem.status,
                executionStatus: dbItem.execution_status,
                createdAt: dbItem.created_at,
                updatedAt: dbItem.updated_at,
              });
            }
          }

          return itemsWithDetailsData;
        },
        { compress: false, identifier: 'all' }
      ).catch(async (error) => {
        console.error('Cache error for pluggy items, using fallback:', error);
        const dbResult = await pool.query('SELECT * FROM pluggy_items WHERE tenant_id = $1 ORDER BY created_at DESC', [tenantId]);
        return dbResult.rows.map((dbItem: any) => ({
          id: dbItem.id,
          connector: {
            id: dbItem.connector_id,
            name: dbItem.connector_name,
          },
          status: dbItem.status,
          executionStatus: dbItem.execution_status,
          createdAt: dbItem.created_at,
          updatedAt: dbItem.updated_at,
        }));
      });

      return res.json(itemsWithDetails);
    } catch (error) {
      console.error("Erro no endpoint /api/pluggy/all-items:", error);
      return res.status(500).json({
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // POST /api/pluggy/import-item - Importar um item existente do Pluggy para o banco
  // Use este endpoint para items criados no dashboard do Pluggy
  app.post("/api/pluggy/import-item", async (req, res) => {
    try {
      const { itemId } = req.body;

      if (!itemId) {
        return res.status(400).json({
          error: "itemId é obrigatório",
        });
      }

      console.log(`🔄 Importando item ${itemId.substring(0, 8)}... do Pluggy...`);

      const apiKey = await getPluggyApiKey(req);

      // Buscar dados do item no Pluggy
      const itemResponse = await fetch(`https://api.pluggy.ai/items/${itemId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
      });

      if (!itemResponse.ok) {
        const errorData = await itemResponse.json();
        console.error("Erro ao buscar item do Pluggy:", errorData);
        return res.status(itemResponse.status).json({
          error: "Falha ao buscar item do Pluggy",
          details: errorData,
        });
      }

      const item = await itemResponse.json();

      // Verificar se já existe no banco
      const checkResult = await pool.query(
        'SELECT id FROM pluggy_items WHERE id = $1',
        [item.id]
      );

      if (checkResult.rows.length > 0) {
        // Atualizar item existente
        await pool.query(
          'UPDATE pluggy_items SET connector_id = $1, connector_name = $2, status = $3, execution_status = $4, updated_at = NOW() WHERE id = $5',
          [item.connector.id, item.connector.name, item.status, item.executionStatus, item.id]
        );
        console.log(`✅ Item ${item.id.substring(0, 8)}... atualizado`);
        return res.json({
          success: true,
          message: "Item atualizado com sucesso",
          item: item,
        });
      } else {
        // Inserir novo item
        await pool.query(
          'INSERT INTO pluggy_items (id, connector_id, connector_name, status, execution_status) VALUES ($1, $2, $3, $4, $5)',
          [item.id, item.connector.id, item.connector.name, item.status, item.executionStatus]
        );
        console.log(`✅ Item ${item.id.substring(0, 8)}... importado com sucesso`);
        return res.json({
          success: true,
          message: "Item importado com sucesso",
          item: item,
        });
      }
    } catch (error) {
      console.error("Erro ao importar item:", error);
      return res.status(500).json({
        error: "Erro ao importar item",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // POST /api/sync-items - Sincronizar items do banco de dados com Pluggy
  // ⚠️ CRÍTICO: Sincroniza APENAS items já salvos no banco (não lista da API)
  // IMPORTANTE: Agora sincroniza items JÁ SALVOS no banco (não tenta listar todos da API)
  app.post("/api/sync-items", async (req, res) => {
    try {
      console.log("🔄 Iniciando sincronização de items do banco → Pluggy API...");

      const apiKey = await getPluggyApiKey(req);

      // 1. Buscar items do banco de dados
      let dbItems = [];
      try {
        const dbResult = await pool.query('SELECT * FROM pluggy_items');
        dbItems = dbResult.rows;
        console.log(`💾 ${dbItems.length} item(s) no banco de dados`);
      } catch (dbError) {
        console.log("⚠️ Tabela pluggy_items não existe ainda. Retornando lista vazia.");
        return res.json({
          success: true,
          message: "Banco de dados não configurado. Tabelas serão criadas automaticamente ao adicionar items.",
          pluggyItems: 0,
          dbItems: 0,
          updated: 0,
          items: [],
        });
      }

      if (dbItems.length === 0) {
        return res.json({
          success: true,
          message: "Nenhum item para sincronizar. Use /api/pluggy/import-item para adicionar items.",
          pluggyItems: 0,
          dbItems: 0,
          updated: 0,
          items: [],
        });
      }

      // 2. Atualizar dados de cada item do Pluggy
      let updatedCount = 0;
      let errorCount = 0;

      for (const dbItem of dbItems) {
        try {
          // Buscar dados atualizados do item no Pluggy
          const itemResponse = await fetch(`https://api.pluggy.ai/items/${dbItem.id}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "X-API-KEY": apiKey,
            },
          });

          if (itemResponse.ok) {
            const item = await itemResponse.json();

            // Atualizar item no banco
            await pool.query(
              'UPDATE pluggy_items SET connector_id = $1, connector_name = $2, status = $3, execution_status = $4, updated_at = NOW() WHERE id = $5',
              [item.connector.id, item.connector.name, item.status, item.executionStatus, item.id]
            );
            updatedCount++;
            console.log(`✅ Item ${dbItem.id.substring(0, 8)}... sincronizado`);
          } else {
            errorCount++;
            console.log(`⚠️ Erro ao sincronizar item ${dbItem.id.substring(0, 8)}...`);
          }
        } catch (error) {
          errorCount++;
          console.error(`Erro ao sincronizar item ${dbItem.id}:`, error);
        }
      }

      // 3. Retornar resultado da sincronização
      const finalResult = await pool.query('SELECT * FROM pluggy_items');

      console.log(`✨ Sincronização completa: ${updatedCount} atualizados, ${errorCount} erros, ${finalResult.rows.length} total no banco`);

      return res.json({
        success: true,
        pluggyItems: dbItems.length,
        dbItems: finalResult.rows.length,
        updated: updatedCount,
        errors: errorCount,
        items: finalResult.rows,
      });
    } catch (error) {
      console.error("Erro ao sincronizar items:", error);
      return res.status(500).json({
        error: "Erro ao sincronizar items",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // ===== FIM DOS ENDPOINTS DE PERSISTÊNCIA =====

  // Endpoint de teste para verificar credenciais do Pluggy
  app.get("/api/pluggy/test-credentials", async (req, res) => {
    try {
      // Usar getPluggyApiKey que busca do banco primeiro (prioridade correta)
      const apiKey = await getPluggyApiKey(req);

      // Verificar se conseguiu obter a API Key
      const testResponse = await fetch("https://api.pluggy.ai/items", {
        method: "GET",
        headers: {
          "X-API-KEY": apiKey,
        },
      });

      if (!testResponse.ok) {
        const errorData = await testResponse.json();
        return res.status(testResponse.status).json({
          success: false,
          message: "Falha na autenticação com Pluggy",
          statusCode: testResponse.status,
          error: errorData,
          source: "Credenciais do banco de dados ou Secrets"
        });
      }

      return res.json({
        success: true,
        message: "✅ Credenciais válidas! Autenticação bem-sucedida com Pluggy",
        authenticated: true,
        source: "Banco de dados (Configurações) ou Replit Secrets"
      });
    } catch (error) {
      console.error("Erro ao testar credenciais:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao testar credenciais",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Endpoint de debug completo - testa auth + busca items
  app.get("/api/pluggy/debug-full", async (req, res) => {
    try {
      const clientId = process.env.PLUGGY_CLIENT_ID;
      const clientSecret = process.env.PLUGGY_CLIENT_SECRET;

      console.log("\n=== DEBUG PLUGGY - INÍCIO ===");
      console.log("1. Credenciais encontradas:", {
        clientIdPresent: !!clientId,
        clientSecretPresent: !!clientSecret,
        clientId: clientId?.substring(0, 10) + "...",
      });

      // Passo 1: Autenticar
      const authResponse = await fetch("https://api.pluggy.ai/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId,
          clientSecret,
        }),
      });

      const authData = await authResponse.json();
      console.log("2. Resposta /auth:", {
        status: authResponse.status,
        ok: authResponse.ok,
        hasApiKey: !!authData.apiKey,
        apiKeyPreview: authData.apiKey?.substring(0, 20) + "...",
      });

      if (!authResponse.ok) {
        return res.json({
          step: "auth",
          success: false,
          status: authResponse.status,
          data: authData,
        });
      }

      const apiKey = authData.apiKey;

      // Passo 2: Buscar items
      const itemsResponse = await fetch("https://api.pluggy.ai/items", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
      });

      const itemsData = await itemsResponse.json();
      console.log("3. Resposta /items:", {
        status: itemsResponse.status,
        ok: itemsResponse.ok,
        data: itemsData,
      });
      console.log("=== DEBUG PLUGGY - FIM ===\n");

      return res.json({
        auth: {
          success: authResponse.ok,
          status: authResponse.status,
          hasApiKey: !!apiKey,
        },
        items: {
          success: itemsResponse.ok,
          status: itemsResponse.status,
          count: itemsData.results?.length || 0,
          data: itemsData,
        },
      });
    } catch (error) {
      console.error("Erro no debug:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // Criar item no Pluggy (substitui o widget)
  app.post("/api/pluggy/create-item", async (req, res) => {
    try {
      const { connectorId, cpf } = req.body;

      if (!connectorId || !cpf) {
        return res.status(400).json({
          error: "connectorId e cpf são obrigatórios",
        });
      }

      const apiKey = await getPluggyApiKey(req);

      // Criar item no Pluggy
      const createItemResponse = await fetch("https://api.pluggy.ai/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
        body: JSON.stringify({
          connectorId: Number(connectorId),
          parameters: {
            cpf: cpf.replace(/\D/g, ""), // Remove formatação
          },
          clientUserId: `user-${Date.now()}`,
        }),
      });

      if (!createItemResponse.ok) {
        const errorData = await createItemResponse.json();
        console.error("Erro ao criar item no Pluggy:", errorData);
        return res.status(createItemResponse.status).json({
          error: "Falha ao criar conexão bancária",
          details: errorData,
        });
      }

      const itemData = await createItemResponse.json();
      return res.json(itemData);
    } catch (error) {
      console.error("Erro no endpoint /api/pluggy/create-item:", error);
      return res.status(500).json({
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // Obter status do item (para polling)
  app.get("/api/pluggy/item/:itemId", async (req, res) => {
    try {
      const { itemId } = req.params;

      if (!itemId) {
        return res.status(400).json({
          error: "itemId é obrigatório",
        });
      }

      const apiKey = await getPluggyApiKey(req);

      // Buscar item no Pluggy
      const itemResponse = await fetch(`https://api.pluggy.ai/items/${itemId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
      });

      if (!itemResponse.ok) {
        const errorData = await itemResponse.json();
        console.error("Erro ao buscar item no Pluggy:", errorData);
        return res.status(itemResponse.status).json({
          error: "Falha ao buscar status da conexão",
          details: errorData,
        });
      }

      const itemData = await itemResponse.json();
      return res.json(itemData);
    } catch (error) {
      console.error("Erro no endpoint /api/pluggy/item/:itemId:", error);
      return res.status(500).json({
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // Listar todos os items do usuário
  app.get("/api/pluggy/items", async (req, res) => {
    try {
      const apiKey = await getPluggyApiKey(req);

      const itemsResponse = await fetch("https://api.pluggy.ai/items", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
      });

      if (!itemsResponse.ok) {
        const errorData = await itemsResponse.json();
        console.error("Erro ao buscar items:", errorData);
        return res.status(itemsResponse.status).json({
          error: "Falha ao buscar items",
          details: errorData,
        });
      }

      const itemsData = await itemsResponse.json();
      return res.json(itemsData);
    } catch (error) {
      console.error("Erro no endpoint /api/pluggy/items:", error);
      return res.status(500).json({
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // [LEGACY] Endpoint antigo para compatibilidade (caso necessário)
  app.get("/api/pluggy/connect-token", async (req, res) => {
    try {
      const apiKey = await getPluggyApiKey(req);

      // Gerar Connect Token com clientUserId fixo para manter items associados
      // IMPORTANTE: Especificar TODOS os produtos para buscar todas as modalidades (cartão, débito, conta, etc.)
      const connectTokenResponse = await fetch("https://api.pluggy.ai/connect_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
        body: JSON.stringify({
          clientUserId: "demo-user-1",
          products: [
            "ACCOUNTS",           // Contas correntes e poupança
            "CREDIT_CARDS",       // Cartões de crédito
            "TRANSACTIONS",       // Transações
            "INVESTMENTS",        // Investimentos
            "IDENTITY",           // Dados de identidade
            "PAYMENT_DATA",       // Dados de pagamento
            "LOANS",              // Empréstimos
            "BROKERAGE"           // Corretagem
          ],
        }),
      });

      if (!connectTokenResponse.ok) {
        const errorData = await connectTokenResponse.json();
        console.error("Erro ao gerar Connect Token:", errorData);
        return res.status(connectTokenResponse.status).json({
          error: "Falha ao gerar Connect Token",
          details: errorData,
        });
      }

      const { accessToken } = await connectTokenResponse.json();
      return res.json({ accessToken });
    } catch (error) {
      console.error("Erro no endpoint /api/pluggy/connect-token:", error);
      return res.status(500).json({
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // Buscar accounts de um item
  app.get("/api/pluggy/items/:itemId/accounts", async (req, res) => {
    try {
      const { itemId } = req.params;

      if (!itemId) {
        return res.status(400).json({
          error: "itemId é obrigatório",
        });
      }

      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      const apiKey = await getPluggyApiKey(req);

      const accountsResponse = await fetch(`https://api.pluggy.ai/accounts?itemId=${itemId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
      });

      if (!accountsResponse.ok) {
        const errorData = await accountsResponse.json();
        console.error("Erro ao buscar accounts:", errorData);
        return res.status(accountsResponse.status).json({
          error: "Falha ao buscar contas",
          details: errorData,
        });
      }

      const accountsData = await accountsResponse.json();

      // LOG DETALHADO para debug
      console.log(`\n🔍 DEBUG - Contas retornadas pela API Pluggy para itemId ${itemId}:`);
      console.log(`   Total de contas: ${accountsData.results?.length || 0}`);
      if (accountsData.results) {
        accountsData.results.forEach((acc: any, index: number) => {
          console.log(`   Conta ${index + 1}:`, {
            id: acc.id?.substring(0, 8) + '...',
            name: acc.name,
            type: acc.type,
            balance: acc.balance,
            creditCardBrand: acc.creditCardBrand || 'N/A'
          });
        });
      }
      console.log('\n');

      return res.json(accountsData);
    } catch (error) {
      console.error("Erro no endpoint /api/pluggy/items/:itemId/accounts:", error);
      return res.status(500).json({
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // Buscar transações de uma account
  app.get("/api/pluggy/transactions", async (req, res) => {
    try {
      const { accountId, from, to, page, pageSize } = req.query;

      if (!accountId) {
        return res.status(400).json({
          error: "accountId é obrigatório",
        });
      }

      const apiKey = await getPluggyApiKey(req);

      // Construir URL com parâmetros
      let url = `https://api.pluggy.ai/transactions?accountId=${accountId}`;
      if (from) url += `&from=${from}`;
      if (to) url += `&to=${to}`;
      if (page) url += `&page=${page}`;
      if (pageSize) url += `&pageSize=${pageSize}`;

      const transactionsResponse = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
      });

      if (!transactionsResponse.ok) {
        const errorData = await transactionsResponse.json();
        console.error("Erro ao buscar transações:", errorData);
        return res.status(transactionsResponse.status).json({
          error: "Falha ao buscar transações",
          details: errorData,
        });
      }

      const transactionsData = await transactionsResponse.json();
      return res.json(transactionsData);
    } catch (error) {
      console.error("Erro no endpoint /api/pluggy/transactions:", error);
      return res.status(500).json({
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // ==========================================
  // ENDPOINT ISOLADO: GET /api/pluggy/transactions/:itemId
  // Busca transações SOMENTE do banco específico com cache Redis
  // ==========================================
  app.get("/api/pluggy/transactions/:itemId", authenticateToken, async (req: AuthRequest, res) => {
    const { itemId } = req.params;

    try {
      console.log(`\n📥 Requisição de transações para itemId: ${itemId}`);

      const clientId = req.user!.clientId;

      const allTransactions = await cacheBillingData(
        clientId,
        'transactions',
        async () => {
          console.log(`🔄 Cache MISS para ${itemId.substring(0, 8)}..., buscando do Pluggy...`);

          const apiKey = await getPluggyApiKey(req);

          // Buscar contas deste item
          const accountsResponse = await fetch(
            `https://api.pluggy.ai/accounts?itemId=${itemId}`,
            {
              headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': apiKey,
              }
            }
          );

          if (!accountsResponse.ok) {
            throw new Error(`Pluggy API error: ${accountsResponse.status}`);
          }

          const accountsData = await accountsResponse.json();
          const accounts = accountsData.results || [];
          console.log(`📊 ${accounts.length} contas encontradas para ${itemId.substring(0, 8)}...`);

          // Buscar transações de TODAS as contas deste item
          const allTransactionsData: any[] = [];

          for (const account of accounts) {
            try {
              console.log(`   Buscando transações da conta ${account.name}...`);

              let page = 1;
              let totalPages = 1;

              while (page <= totalPages) {
                const transResponse = await fetch(
                  `https://api.pluggy.ai/transactions?accountId=${account.id}&page=${page}&pageSize=500`,
                  {
                    headers: {
                      'Content-Type': 'application/json',
                      'X-API-KEY': apiKey,
                    }
                  }
                );

                if (transResponse.ok) {
                  const transData = await transResponse.json();
                  const transactions = transData.results || [];
                  totalPages = transData.totalPages || 1;

                  // Adiciona informações da conta em cada transação
                  const enrichedTransactions = transactions.map((t: any) => ({
                    ...t,
                    accountId: account.id,
                    accountName: account.name,
                    accountType: account.type,
                    bankItemId: itemId,
                    fetchedAt: new Date().toISOString()
                  }));

                  allTransactionsData.push(...enrichedTransactions);
                  console.log(`      ✅ Página ${page}/${totalPages}: ${transactions.length} transações coletadas`);
                  page++;
                } else {
                  break;
                }
              }
            } catch (error) {
              console.error(`      ❌ Erro ao buscar transações da conta ${account.id}:`, error);
            }
          }

          console.log(`✅ Total: ${allTransactionsData.length} transações coletadas para ${itemId.substring(0, 8)}...`);
          return allTransactionsData;
        },
        { compress: false, ttl: 900, identifier: itemId }
      ).catch(async (error) => {
        console.error('Cache wrapper error for transactions, using fallback:', error);

        // Fallback: execute query directly without cache
        const apiKey = await getPluggyApiKey(req);
        const accountsResponse = await fetch(
          `https://api.pluggy.ai/accounts?itemId=${itemId}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-API-KEY': apiKey,
            }
          }
        );

        if (!accountsResponse.ok) {
          throw new Error(`Pluggy API error: ${accountsResponse.status}`);
        }

        const accountsData = await accountsResponse.json();
        const accounts = accountsData.results || [];
        const fallbackTransactions: any[] = [];

        for (const account of accounts) {
          try {
            let page = 1;
            let totalPages = 1;

            while (page <= totalPages) {
              const transResponse = await fetch(
                `https://api.pluggy.ai/transactions?accountId=${account.id}&page=${page}&pageSize=500`,
                {
                  headers: {
                    'Content-Type': 'application/json',
                    'X-API-KEY': apiKey,
                  }
                }
              );

              if (transResponse.ok) {
                const transData = await transResponse.json();
                const transactions = transData.results || [];
                totalPages = transData.totalPages || 1;

                const enrichedTransactions = transactions.map((t: any) => ({
                  ...t,
                  accountId: account.id,
                  accountName: account.name,
                  accountType: account.type,
                  bankItemId: itemId,
                  fetchedAt: new Date().toISOString()
                }));

                fallbackTransactions.push(...enrichedTransactions);
                page++;
              } else {
                break;
              }
            }
          } catch (error) {
            console.error(`Erro ao buscar transações da conta ${account.id}:`, error);
          }
        }

        return fallbackTransactions;
      });

      res.json(allTransactions);

    } catch (error) {
      console.error(`❌ Erro ao buscar transações para ${itemId}:`, error);
      res.status(500).json({
        error: 'Erro ao buscar transações',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        itemId
      });
    }
  });

  // Buscar bills (faturas) de uma conta de cartão de crédito
  app.get("/api/pluggy/bills", async (req, res) => {
    try {
      const { accountId } = req.query;

      if (!accountId) {
        return res.status(400).json({
          error: "accountId é obrigatório",
        });
      }

      const apiKey = await getPluggyApiKey(req);

      const billsResponse = await fetch(`https://api.pluggy.ai/bills?accountId=${accountId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
      });

      if (!billsResponse.ok) {
        const errorData = await billsResponse.json();
        console.error("Erro ao buscar bills:", errorData);
        return res.status(billsResponse.status).json({
          error: "Falha ao buscar faturas",
          details: errorData,
        });
      }

      const billsData = await billsResponse.json();
      return res.json(billsData);
    } catch (error) {
      console.error("Erro no endpoint /api/pluggy/bills:", error);
      return res.status(500).json({
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  app.get("/api/pluggy/monthly-projections", async (req, res) => {
    try {
      const { accountId } = req.query;

      if (!accountId) {
        return res.status(400).json({
          error: "accountId é obrigatório",
        });
      }

      const apiKey = await getPluggyApiKey(req);

      let allTransactions: any[] = [];
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const transactionsResponse = await fetch(
          `https://api.pluggy.ai/transactions?accountId=${accountId}&page=${page}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "X-API-KEY": apiKey,
            },
          }
        );

        if (!transactionsResponse.ok) {
          const errorData = await transactionsResponse.json();
          console.error("Erro ao buscar transações:", errorData);
          return res.status(transactionsResponse.status).json({
            error: "Falha ao buscar transações",
            details: errorData,
          });
        }

        const data = await transactionsResponse.json();
        allTransactions = allTransactions.concat(data.results || []);
        totalPages = data.totalPages || 1;
        page++;
      }

      const accountResponse = await fetch(`https://api.pluggy.ai/accounts/${accountId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
      });

      if (!accountResponse.ok) {
        const errorData = await accountResponse.json();
        console.error("Erro ao buscar account:", errorData);
        return res.status(accountResponse.status).json({
          error: "Falha ao buscar conta",
          details: errorData,
        });
      }

      const accountData = await accountResponse.json();

      const transactionsWithAccountType = allTransactions.map(t => ({
        ...t,
        accountType: accountData.type,
        accountId: accountData.id,
      }));

      const projections = calculateMonthlyProjections(transactionsWithAccountType);

      return res.json(projections);
    } catch (error) {
      console.error("Erro no endpoint /api/pluggy/monthly-projections:", error);
      return res.status(500).json({
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // ETAPA 2: Endpoint Híbrido - Bills do Pluggy + Cálculo para mês atual
  app.get("/api/pluggy/faturas-hibridas/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;

      if (!accountId) {
        return res.status(400).json({
          error: "accountId é obrigatório",
        });
      }

      const apiKey = await getPluggyApiKey(req);

      console.log('🎯 Iniciando busca de faturas híbridas...');

      // 1. Buscar transações com paginação corrigida (ETAPA 1)
      const transacoes = await buscarTodasTransacoesPaginadas(apiKey, accountId);

      // 2. Buscar bills (faturas fechadas) do Pluggy
      const bills = await buscarFaturasCartao(apiKey, accountId);

      // 3. Buscar tipo da conta
      const accountResponse = await fetch(`https://api.pluggy.ai/accounts/${accountId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
      });

      if (!accountResponse.ok) {
        const errorData = await accountResponse.json();
        console.error("Erro ao buscar account:", errorData);
        return res.status(accountResponse.status).json({
          error: "Falha ao buscar conta",
          details: errorData,
        });
      }

      const accountData = await accountResponse.json();

      // 4. Adicionar accountType nas transações
      const transacoesComTipo = transacoes.map(t => ({
        ...t,
        accountType: accountData.type,
        accountId: accountData.id,
      }));

      // 5. Calcular faturas híbridas
      const faturasHibridas = calculateHybridInvoices(transacoesComTipo, bills);

      console.log(`✅ Faturas híbridas calculadas: ${faturasHibridas.length} meses`);

      const resposta = {
        success: true,
        faturas: faturasHibridas,
        metodo: 'Bills do Pluggy (meses fechados) + Cálculo (mês atual)',
        totalTransacoes: transacoes.length,
        totalBills: bills.length,
      };

      console.log(`📤 Enviando resposta HTTP com ${faturasHibridas.length} faturas...`);

      res.json(resposta);

      console.log(`✅ Resposta enviada com sucesso`);
    } catch (error) {
      console.error("Erro no endpoint /api/pluggy/faturas-hibridas:", error);
      return res.status(500).json({
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  // ==========================================
  // ENDPOINTS DE DEBUG - CACHE (refatorado para Redis)
  // ==========================================

  // POST /api/pluggy/clear-cache/:itemId - Limpar cache Redis de um banco específico ou todos
  app.post("/api/pluggy/clear-cache/:itemId", async (req, res) => {
    const { itemId } = req.params;
    const clientId = 'default';

    try {
      if (itemId === 'all') {
        // Limpa cache de TODOS os bancos usando Redis
        await invalidateBillingCache(clientId, 'transactions');
        console.log(`🧹 Cache Redis limpo para todas as transações`);
        res.json({
          success: true,
          message: `Cache Redis limpo para todas as transações`
        });
      } else {
        // Limpa cache de um banco específico usando Redis
        await invalidateBillingCache(clientId, 'transactions', itemId);
        console.log(`🧹 Cache Redis limpo para ${itemId.substring(0, 8)}...`);
        res.json({
          success: true,
          message: `Cache Redis limpo para ${itemId.substring(0, 8)}...`
        });
      }
    } catch (error) {
      console.error('❌ Erro ao limpar cache Redis:', error);
      res.status(500).json({
        error: 'Erro ao limpar cache',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // GET /api/pluggy/cache-status - DEPRECATED (Map-based cache removido)
  // Este endpoint foi desabilitado após migração para Redis cache
  // Para monitorar o cache Redis, use ferramentas de monitoramento do Redis diretamente
  /*
  app.get("/api/pluggy/cache-status", (req, res) => {
    res.status(410).json({
      success: false,
      error: 'Endpoint deprecated',
      message: 'Cache migrado para Redis. Use ferramentas de monitoramento do Redis para status do cache.'
    });
  });
  */

  // ===== FUNÇÕES DE CACHE =====

  // Verificar se o cache é válido (menos de 1 hora)
  async function verificarCacheValido(itemId: string, tenantId: string): Promise<boolean> {
    try {
      const metadata = await db
        .select()
        .from(cacheMetadata)
        .where(and(eq(cacheMetadata.itemId, itemId), eq(cacheMetadata.tenantId, tenantId)))
        .limit(1);

      if (metadata.length === 0) {
        console.log(`📭 Nenhum cache encontrado para item ${itemId.substring(0, 8)}... e tenant ${tenantId}`);
        return false;
      }

      const lastSync = new Date(metadata[0].lastSync);
      const agora = new Date();
      const diferencaHoras = (agora.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

      const valido = diferencaHoras < 1;

      if (valido) {
        console.log(`✅ Cache válido (${Math.round(diferencaHoras * 60)} minutos atrás)`);
      } else {
        console.log(`⏰ Cache expirado (${Math.round(diferencaHoras * 60)} minutos atrás)`);
      }

      return valido;
    } catch (error) {
      console.error('❌ Erro ao verificar cache:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  // Buscar dados do cache
  async function buscarDoCache(itemId: string, apiKey?: string, tenantId?: string) {
    try {
      console.log(`🔍 Buscando dados do cache para item ${itemId.substring(0, 8)}...`);

      const [metadata, transacoes, faturas] = await Promise.all([
        db.select().from(cacheMetadata).where(eq(cacheMetadata.itemId, itemId)).limit(1),
        tenantId
          ? db.select().from(cachedTransactions).where(and(eq(cachedTransactions.itemId, itemId), eq(cachedTransactions.tenantId, tenantId)))
          : db.select().from(cachedTransactions).where(eq(cachedTransactions.itemId, itemId)),
        tenantId
          ? db.select().from(cachedInvoices).where(and(eq(cachedInvoices.itemId, itemId), eq(cachedInvoices.tenantId, tenantId)))
          : db.select().from(cachedInvoices).where(eq(cachedInvoices.itemId, itemId))
      ]);

      if (metadata.length === 0) {
        return null;
      }

      console.log(`📊 Cache encontrado: ${transacoes.length} transações, ${faturas.length} faturas`);

      // Buscar contas da API (rápido, não precisa cache)
      let contas: any[] = [];
      if (apiKey) {
        try {
          contas = await buscarTodasContas(apiKey, itemId);
        } catch (err) {
          console.warn('⚠️ Erro ao buscar contas, continuando com cache:', err);
        }
      }

      return {
        sucesso: true,
        contas,
        transacoes: transacoes.map(t => t.rawData),
        faturasCartao: faturas.map(f => f.rawData),
        estatisticas: metadata[0].rawStats || {
          totalContas: contas.length,
          totalTransacoes: transacoes.length,
          totalFaturas: faturas.length,
        },
        fromCache: true
      };
    } catch (error) {
      console.error('❌ Erro ao buscar do cache:', error instanceof Error ? error.message : error);
      return null;
    }
  }

  // Limpar cache antigo
  async function limparCacheAntigo(itemId: string) {
    try {
      await Promise.all([
        db.delete(cachedTransactions).where(eq(cachedTransactions.itemId, itemId)),
        db.delete(cachedInvoices).where(eq(cachedInvoices.itemId, itemId)),
        db.delete(cacheMetadata).where(eq(cacheMetadata.itemId, itemId))
      ]);
      console.log('🗑️ Cache antigo limpo');
    } catch (error) {
      console.error('❌ Erro ao limpar cache:', error instanceof Error ? error.message : error);
    }
  }

  // Salvar dados no cache
  async function salvarNoCache(itemId: string, dados: any) {
    try {
      console.log(`💾 Salvando ${dados.transacoes.length} transações e ${dados.faturasCartao.length} faturas no cache...`);

      await limparCacheAntigo(itemId);

      // Deduplicar transações por ID antes de salvar
      const transacoesUnicas = new Map();
      dados.transacoes.forEach((t: any) => {
        if (!transacoesUnicas.has(t.id)) {
          transacoesUnicas.set(t.id, t);
        }
      });

      const transacoesParaSalvar = Array.from(transacoesUnicas.values()).map((t: any) => ({
        id: t.id,
        itemId: itemId,
        accountId: t.accountId,
        description: t.description,
        amount: String(t.amount),
        date: t.date,
        type: t.type,
        category: t.category,
        categoryId: t.categoryId,
        merchant: t.merchant,
        creditCardMetadata: t.creditCardMetadata,
        balance: t.balance ? String(t.balance) : null,
        operationCategory: t.operationCategory,
        source: 'transaction',
        billId: null,
        rawData: t
      }));

      // Deduplicar faturas por ID antes de salvar
      const faturasUnicas = new Map();
      dados.faturasCartao.forEach((f: any) => {
        if (!faturasUnicas.has(f.id)) {
          faturasUnicas.set(f.id, f);
        }
      });

      const faturasParaSalvar = Array.from(faturasUnicas.values()).map((f: any) => ({
        id: f.id,
        itemId: itemId,
        accountId: f.accountId || '',
        dueDate: f.dueDate,
        totalAmount: f.totalAmount ? String(f.totalAmount) : null,
        lineItemsCount: f.items?.length || 0,
        rawData: f
      }));

      // NOVO: Extrair lineItems das faturas e salvar como transações
      const transacoesDasFaturas: any[] = [];
      let totalLineItems = 0;

      dados.faturasCartao.forEach((fatura: any) => {
        // Verificar possíveis estruturas de lineItems
        const items = fatura.items || fatura.lineItems || fatura.transactions || [];

        items.forEach((item: any, index: number) => {
          // Gerar ID único para o lineItem baseado na fatura
          const lineItemId = `${fatura.id}-item-${index}`;

          // Evitar duplicação com transações normais
          if (!transacoesUnicas.has(lineItemId) && !transacoesUnicas.has(item.id)) {
            const transacao = {
              id: item.id || lineItemId,
              itemId: itemId,
              accountId: fatura.accountId || '',
              description: item.description || item.desc || item.name || 'Transação da fatura',
              amount: String(item.amount || item.value || 0),
              date: item.date || item.postDate || fatura.dueDate || new Date().toISOString(),
              type: 'DEBIT',
              category: item.category || item.categoryName || null,
              categoryId: item.categoryId || null,
              merchant: item.merchant || null,
              creditCardMetadata: null,
              balance: null,
              operationCategory: null,
              source: 'bill_lineitem',
              billId: fatura.id,
              rawData: item
            };

            transacoesDasFaturas.push(transacao);
            transacoesUnicas.set(transacao.id, transacao);
            totalLineItems++;
          }
        });
      });

      console.log(`📋 Extraídos ${totalLineItems} lineItems das faturas para salvar como transações`);

      const metadataParaSalvar = {
        itemId: itemId,
        lastSync: new Date(),
        totalAccounts: dados.estatisticas.totalContas,
        totalTransactions: dados.estatisticas.totalTransacoes + totalLineItems,
        totalInvoices: dados.estatisticas.totalFaturas,
        periodStart: dados.estatisticas.periodo?.inicio,
        periodEnd: dados.estatisticas.periodo?.fim,
        rawStats: {
          ...dados.estatisticas,
          lineItemsExtractedFromBills: totalLineItems
        }
      };

      // Salvar todas as transações (normais + lineItems das faturas)
      const todasTransacoes = [...transacoesParaSalvar, ...transacoesDasFaturas];
      if (todasTransacoes.length > 0) {
        await db.insert(cachedTransactions).values(todasTransacoes);
      }

      if (faturasParaSalvar.length > 0) {
        await db.insert(cachedInvoices).values(faturasParaSalvar);
      }

      await db.insert(cacheMetadata).values(metadataParaSalvar);

      console.log(`✅ Dados salvos no cache com sucesso! Total: ${todasTransacoes.length} transações (${transacoesParaSalvar.length} normais + ${totalLineItems} de faturas)`);
    } catch (error) {
      console.error('❌ Erro ao salvar no cache:', error instanceof Error ? error.message : error);
    }
  }

  // ===== FUNÇÕES AUXILIARES PARA COLETA COMPLETA DE DADOS =====

  // Sincronizar item forçadamente
  async function sincronizarItem(itemId: string, apiKey: string, aguardarSegundos = 10) {
    console.log('🔄 Iniciando sincronização forçada...');

    try {
      const response = await fetch(`https://api.pluggy.ai/items/${itemId}/sync`, {
        method: 'POST',
        headers: { 'X-API-KEY': apiKey }
      });

      if (!response.ok) {
        console.log(`⚠️ Sincronização retornou status ${response.status}`);
      }

      console.log(`⏳ Aguardando ${aguardarSegundos} segundos para processar...`);
      await new Promise(resolve => setTimeout(resolve, aguardarSegundos * 1000));

      // Verificar status
      const statusResponse = await fetch(`https://api.pluggy.ai/items/${itemId}`, {
        headers: { 'X-API-KEY': apiKey }
      });

      if (statusResponse.ok) {
        const item = await statusResponse.json();
        console.log(`✅ Status: ${item.status}, Última atualização: ${item.lastUpdatedAt}`);
        return item;
      }

      return null;
    } catch (error) {
      console.error('❌ Erro ao sincronizar:', error instanceof Error ? error.message : error);
      return null;
    }
  }

  // Buscar todas transações com paginação completa
  // CORREÇÃO ETAPA 1: Trata erro de HTML retornado pela API (página 9+)
  async function buscarTodasTransacoesPaginadas(apiKey: string, accountId?: string, itemId?: string, mesesAtras = 12) {
    let todasTransacoes: any[] = [];
    let pagina = 1;
    let falhasConsecutivas = 0;
    const MAX_FALHAS = 3;
    const MAX_PAGINAS = 20; // Limite de segurança

    const hoje = new Date();
    const dataInicio = new Date();
    dataInicio.setMonth(hoje.getMonth() - mesesAtras);
    const from = dataInicio.toISOString().split('T')[0];
    const to = hoje.toISOString().split('T')[0];

    console.log(`📅 Buscando transações de ${from} até ${to}`);

    while (falhasConsecutivas < MAX_FALHAS && pagina <= MAX_PAGINAS) {
      try {
        let url = `https://api.pluggy.ai/transactions?page=${pagina}&pageSize=500&from=${from}&to=${to}`;
        if (accountId) url += `&accountId=${accountId}`;
        if (itemId) url += `&itemId=${itemId}`;

        console.log(`📄 Buscando página ${pagina}...`);

        const response = await fetch(url, {
          headers: { 'X-API-KEY': apiKey }
        });

        if (!response.ok) {
          console.log(`⚠️ Página ${pagina} retornou status ${response.status}`);
          falhasConsecutivas++;

          // Tentar próxima página (pode ser só essa que falhou)
          if (pagina < MAX_PAGINAS) {
            pagina++;
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          } else {
            break;
          }
        }

        // CRÍTICO: Verificar se resposta é HTML (erro comum da API Pluggy)
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error(`⚠️ Página ${pagina} retornou ${contentType || 'tipo desconhecido'}, pulando...`);
          falhasConsecutivas++;

          // Tentar próxima página antes de desistir
          if (pagina < MAX_PAGINAS) {
            pagina++;
            await new Promise(resolve => setTimeout(resolve, 2000)); // Delay maior antes de retry
            continue;
          } else {
            break;
          }
        }

        const data = await response.json();

        if (data.results && data.results.length > 0) {
          todasTransacoes = [...todasTransacoes, ...data.results];
          console.log(`✅ Página ${pagina}: ${data.results.length} transações`);

          // Reset falhas consecutivas em sucesso
          falhasConsecutivas = 0;

          if (data.results.length < 500) {
            console.log(`✅ Fim das transações na página ${pagina}`);
            break;
          } else {
            pagina++;
            await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
          }
        } else {
          console.log(`✅ Fim das transações na página ${pagina}`);
          break;
        }
      } catch (error) {
        console.error(`❌ Erro na página ${pagina}:`, error instanceof Error ? error.message : error);
        falhasConsecutivas++;

        // Tentar próxima página antes de desistir
        if (falhasConsecutivas < MAX_FALHAS && pagina < MAX_PAGINAS) {
          pagina++;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    console.log(`✅ TOTAL: ${todasTransacoes.length} transações carregadas`);
    return todasTransacoes;
  }

  // Buscar faturas de cartão de crédito
  // CORREÇÃO: Usar endpoint correto /bills (não /credit-card-invoices)
  async function buscarFaturasCartao(apiKey: string, accountId: string) {
    console.log('💳 Buscando faturas (bills) de cartão de crédito...');

    let todasFaturas: any[] = [];
    let pagina = 1;
    let temMaisPaginas = true;

    while (temMaisPaginas) {
      try {
        // CORREÇÃO: Usar endpoint /bills ao invés de /credit-card-invoices
        const url = `https://api.pluggy.ai/bills?accountId=${accountId}&page=${pagina}&pageSize=100`;

        const response = await fetch(url, {
          headers: { 'X-API-KEY': apiKey }
        });

        if (!response.ok) {
          if (response.status === 404) {
            console.log('⚠️ Conta não possui faturas ou não é cartão de crédito');
          }
          break;
        }

        const data = await response.json();

        if (data.results && data.results.length > 0) {
          console.log(`📄 Página ${pagina}: ${data.results.length} faturas (bills)`);

          // Adicionar faturas diretamente (bills já vêm completos)
          todasFaturas.push(...data.results);

          if (data.results.length < 100) {
            temMaisPaginas = false;
          } else {
            pagina++;
          }
        } else {
          temMaisPaginas = false;
        }
      } catch (error) {
        console.error('❌ Erro ao buscar faturas:', error instanceof Error ? error.message : error);
        temMaisPaginas = false;
      }
    }

    console.log(`✅ TOTAL: ${todasFaturas.length} faturas (bills) coletadas`);
    return todasFaturas;
  }

  // Buscar todas as contas
  async function buscarTodasContas(apiKey: string, itemId: string) {
    console.log('🏦 Buscando todas as contas do item...');

    try {
      const response = await fetch(`https://api.pluggy.ai/accounts?itemId=${itemId}`, {
        headers: { 'X-API-KEY': apiKey }
      });

      if (!response.ok) {
        console.error(`❌ Erro ao buscar contas: status ${response.status}`);
        return [];
      }

      const data = await response.json();
      const contas = data.results || [];

      console.log(`✅ ${contas.length} conta(s) encontrada(s):`);
      contas.forEach((conta: any) => {
        console.log(`  - ${conta.name} (${conta.type}) - ${conta.number}`);
      });

      return contas;
    } catch (error) {
      console.error('❌ Erro ao buscar contas:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  // Função principal - Coletar dados completos
  async function coletarDadosCompletos(itemId: string, apiKey: string) {
    console.log('\n🚀 ===== INICIANDO COLETA COMPLETA =====\n');

    const resultado = {
      sucesso: false,
      contas: [] as any[],
      transacoes: [] as any[],
      faturasCartao: [] as any[],
      estatisticas: {} as any,
      erros: [] as string[]
    };

    try {
      // 1. SINCRONIZAR DADOS
      console.log('ETAPA 1: Sincronização');
      await sincronizarItem(itemId, apiKey, 10);

      // 2. BUSCAR CONTAS
      console.log('\nETAPA 2: Buscando contas');
      resultado.contas = await buscarTodasContas(apiKey, itemId);

      if (resultado.contas.length === 0) {
        throw new Error('Nenhuma conta encontrada');
      }

      // 3. BUSCAR TRANSAÇÕES DE CADA CONTA
      console.log('\nETAPA 3: Buscando transações por conta');

      for (const conta of resultado.contas) {
        console.log(`\n📊 Processando: ${conta.name}`);

        // Transações normais
        const transacoesConta = await buscarTodasTransacoesPaginadas(apiKey, conta.id, undefined, 12);
        resultado.transacoes = [...resultado.transacoes, ...transacoesConta];

        // Se for cartão de crédito, buscar faturas
        if (conta.type === 'CREDIT' || conta.subtype === 'CREDIT_CARD') {
          console.log(`💳 Conta é cartão de crédito, buscando faturas...`);
          const faturas = await buscarFaturasCartao(apiKey, conta.id);
          resultado.faturasCartao = [...resultado.faturasCartao, ...faturas];
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 4. BUSCAR TRANSAÇÕES GERAIS DO ITEM (backup)
      console.log('\nETAPA 4: Buscando transações gerais do item');
      const transacoesGerais = await buscarTodasTransacoesPaginadas(apiKey, undefined, itemId, 12);

      // Adicionar apenas transações que não existem
      const idsExistentes = new Set(resultado.transacoes.map(t => t.id));
      const novasTransacoes = transacoesGerais.filter(t => !idsExistentes.has(t.id));

      if (novasTransacoes.length > 0) {
        console.log(`➕ Adicionando ${novasTransacoes.length} transações extras`);
        resultado.transacoes = [...resultado.transacoes, ...novasTransacoes];
      }

      // 5. ESTATÍSTICAS
      resultado.estatisticas = {
        totalContas: resultado.contas.length,
        totalTransacoes: resultado.transacoes.length,
        totalFaturas: resultado.faturasCartao.length,
        contasCartao: resultado.contas.filter(c => c.type === 'CREDIT').length,
        periodo: {
          inicio: resultado.transacoes.length > 0
            ? new Date(Math.min(...resultado.transacoes.map(t => new Date(t.date).getTime()))).toISOString().split('T')[0]
            : null,
          fim: resultado.transacoes.length > 0
            ? new Date(Math.max(...resultado.transacoes.map(t => new Date(t.date).getTime()))).toISOString().split('T')[0]
            : null
        }
      };

      resultado.sucesso = true;

      console.log('\n✅ ===== COLETA CONCLUÍDA =====');
      console.log(`📊 Contas: ${resultado.estatisticas.totalContas}`);
      console.log(`💰 Transações: ${resultado.estatisticas.totalTransacoes}`);
      console.log(`💳 Faturas: ${resultado.estatisticas.totalFaturas}`);
      console.log(`📅 Período: ${resultado.estatisticas.periodo.inicio} até ${resultado.estatisticas.periodo.fim}`);

    } catch (error) {
      console.error('\n❌ ERRO FATAL:', error instanceof Error ? error.message : error);
      resultado.erros.push(error instanceof Error ? error.message : 'Erro desconhecido');
    }

    return resultado;
  }

  // ===== ENDPOINT PRINCIPAL - DADOS COMPLETOS =====

  app.get("/api/pluggy/dados-completos/:itemId", authenticateToken, async (req: AuthRequest, res) => {
    const { itemId } = req.params;
    const forceRefresh = req.query.forceRefresh === 'true';
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        error: "Não autorizado: tenantId não encontrado",
      });
    }

    if (!itemId) {
      return res.status(400).json({
        error: 'ItemId é obrigatório'
      });
    }

    console.log(`\n🔍 Requisição recebida para buscar dados completos do item: ${itemId} (tenant: ${tenantId})`);
    if (forceRefresh) {
      console.log('🔄 Forçando refresh do cache');
    }

    try {
      const apiKey = await getPluggyApiKey(req, tenantId);

      // 1. Verificar se tem cache válido (a menos que force refresh)
      if (!forceRefresh) {
        const cacheValido = await verificarCacheValido(itemId, tenantId);

        if (cacheValido) {
          const dadosCache = await buscarDoCache(itemId, apiKey, tenantId);

          if (dadosCache) {
            console.log('✅ Retornando dados do cache');
            return res.json({
              success: true,
              message: 'Dados do cache (atualizados há menos de 1 hora)',
              dados: {
                contas: dadosCache.contas,
                transacoes: dadosCache.transacoes,
                faturas: dadosCache.faturasCartao,
                estatisticas: dadosCache.estatisticas
              },
              fromCache: true
            });
          }
        }
      }

      // 2. Cache inválido ou não existe - buscar da API
      console.log('📡 Buscando dados da API Pluggy...');
      const dados = await coletarDadosCompletos(itemId, apiKey);

      if (!dados.sucesso) {
        return res.status(500).json({
          error: 'Falha na coleta de dados',
          detalhes: dados.erros
        });
      }

      // 3. Salvar no cache
      await salvarNoCache(itemId, dados);

      // 4. Retornar dados
      res.json({
        success: true,
        message: 'Dados coletados com sucesso da API',
        dados: {
          contas: dados.contas,
          transacoes: dados.transacoes,
          faturas: dados.faturasCartao,
          estatisticas: dados.estatisticas
        },
        fromCache: false
      });

    } catch (error) {
      console.error('❌ Erro no endpoint /api/pluggy/dados-completos:', error);
      res.status(500).json({
        error: 'Erro interno no servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // ENDPOINT PARA VALIDAR TOKEN
  app.get("/api/pluggy/validar-token", async (req, res) => {
    try {
      const apiKey = await getPluggyApiKey(req);

      const response = await fetch('https://api.pluggy.ai/items', {
        headers: { 'X-API-KEY': apiKey }
      });

      if (response.ok) {
        res.json({ valido: true, mensagem: 'Token válido' });
      } else {
        res.json({ valido: false, mensagem: 'Token inválido ou expirado' });
      }

    } catch (error) {
      res.status(500).json({
        valido: false,
        mensagem: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // ENDPOINT DE STREAMING COM PROGRESSO (Server-Sent Events)
  app.get("/api/pluggy/dados-completos-stream/:itemId", authenticateToken, async (req: AuthRequest, res) => {
    const { itemId } = req.params;
    const forceRefresh = req.query.forceRefresh === 'true';
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        error: "Não autorizado: tenantId não encontrado",
      });
    }

    if (!itemId) {
      return res.status(400).json({ error: 'ItemId é obrigatório' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const enviarProgresso = (tipo: string, mensagem: string, dados?: any) => {
      const evento = {
        tipo,
        mensagem,
        timestamp: new Date().toISOString(),
        ...dados
      };
      res.write(`data: ${JSON.stringify(evento)}\n\n`);
    };

    try {
      enviarProgresso('inicio', `Iniciando coleta para item ${itemId.substring(0, 8)}... (tenant: ${tenantId})`);

      const apiKey = await getPluggyApiKey(req, tenantId);

      // Verificar cache
      if (!forceRefresh) {
        enviarProgresso('etapa', 'Verificando cache...', { etapa: 'cache' });
        const cacheValido = await verificarCacheValido(itemId, tenantId);

        if (cacheValido) {
          enviarProgresso('etapa', 'Cache válido encontrado!', { etapa: 'cache' });
          const dadosCache = await buscarDoCache(itemId, apiKey, tenantId);

          if (dadosCache) {
            enviarProgresso('sucesso', 'Dados carregados do cache', {
              totalTransacoes: dadosCache.transacoes.length,
              totalFaturas: dadosCache.faturasCartao.length,
              fromCache: true,
              progresso: 100
            });

            res.write(`data: ${JSON.stringify({ tipo: 'completo', dados: dadosCache })}\n\n`);
            return res.end();
          }
        }
      }

      // Buscar da API
      enviarProgresso('etapa', 'Cache não encontrado, buscando da API...', { etapa: 'api' });

      // ETAPA 1: Sincronização
      enviarProgresso('etapa', 'Sincronizando dados do banco...', { etapa: 'sync', progresso: 20 });
      await sincronizarItem(itemId, apiKey, 10);

      // ETAPA 2: Contas
      enviarProgresso('etapa', 'Buscando contas...', { etapa: 'contas', progresso: 40 });
      const contas = await buscarTodasContas(apiKey, itemId);

      enviarProgresso('sucesso', `${contas.length} conta(s) encontrada(s)`, {
        totalContas: contas.length
      });

      // ETAPA 3: Transações
      enviarProgresso('etapa', 'Buscando transações...', { etapa: 'transacoes', progresso: 60 });
      let todasTransacoes: any[] = [];

      for (let i = 0; i < contas.length; i++) {
        const conta = contas[i];
        enviarProgresso('info', `Processando conta ${i + 1}/${contas.length}: ${conta.name}`);

        const transacoesConta = await buscarTodasTransacoesPaginadas(apiKey, conta.id, undefined, 12);
        todasTransacoes = [...todasTransacoes, ...transacoesConta];

        if (conta.type === 'CREDIT' || conta.subtype === 'CREDIT_CARD') {
          enviarProgresso('info', 'Buscando faturas de cartão...');
        }
      }

      // ETAPA 4: Transações gerais
      enviarProgresso('etapa', 'Buscando transações gerais...', { etapa: 'transacoes-gerais', progresso: 80 });
      const transacoesGerais = await buscarTodasTransacoesPaginadas(apiKey, undefined, itemId, 12);

      const idsExistentes = new Set(todasTransacoes.map(t => t.id));
      const novasTransacoes = transacoesGerais.filter(t => !idsExistentes.has(t.id));
      todasTransacoes = [...todasTransacoes, ...novasTransacoes];

      // ETAPA 5: Faturas
      enviarProgresso('etapa', 'Buscando faturas de cartão...', { etapa: 'faturas', progresso: 90 });
      let todasFaturas: any[] = [];

      for (const conta of contas) {
        if (conta.type === 'CREDIT' || conta.subtype === 'CREDIT_CARD') {
          const faturas = await buscarFaturasCartao(apiKey, conta.id);
          todasFaturas = [...todasFaturas, ...faturas];
        }
      }

      const resultado = {
        sucesso: true,
        contas,
        transacoes: todasTransacoes,
        faturasCartao: todasFaturas,
        estatisticas: {
          totalContas: contas.length,
          totalTransacoes: todasTransacoes.length,
          totalFaturas: todasFaturas.length,
          periodo: {
            inicio: todasTransacoes.length > 0
              ? new Date(Math.min(...todasTransacoes.map(t => new Date(t.date).getTime()))).toISOString().split('T')[0]
              : null,
            fim: todasTransacoes.length > 0
              ? new Date(Math.max(...todasTransacoes.map(t => new Date(t.date).getTime()))).toISOString().split('T')[0]
              : null
          }
        }
      };

      // Salvar no cache
      enviarProgresso('etapa', 'Salvando no cache...', { progresso: 95 });
      await salvarNoCache(itemId, resultado);

      // Enviar resultado final
      enviarProgresso('sucesso', 'Coleta completa!', {
        totalTransacoes: todasTransacoes.length,
        totalFaturas: todasFaturas.length,
        fromCache: false,
        progresso: 100
      });

      res.write(`data: ${JSON.stringify({ tipo: 'completo', dados: resultado })}\n\n`);
      res.end();

    } catch (error) {
      const mensagemErro = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ Erro no streaming:', mensagemErro);
      enviarProgresso('erro', mensagemErro);
      res.write(`event: error\ndata: ${JSON.stringify({ tipo: 'erro', mensagem: mensagemErro })}\n\n`);
      res.end();
    }
  });

  // ===== CONFIGURAÇÃO DO MULTER PARA UPLOAD =====
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${nanoid(10)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  });

  const upload = multer({
    storage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
      const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Tipo de arquivo não permitido. Use: JPEG, PNG, WebP ou PDF'));
      }
    },
  });

  // Endpoint para servir arquivos uploadados
  app.use('/uploads', express.static(uploadsDir));

  // ===== ENDPOINTS DE ATTACHMENTS (ANEXOS/FOTOS) =====

  // POST /api/attachments/upload - Upload de arquivo
  app.post("/api/attachments/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const { category, amount, date, description, type } = req.body;

      // Gerar URL pública HTTP para o arquivo (necessário para n8n)
      const domain = process.env.APP_DOMAIN || process.env.REPLIT_DOMAINS?.split(',')[0] || process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
      const protocol = domain.includes('localhost') ? 'http' : 'https';
      const publicUrl = `${protocol}://${domain}/uploads/${req.file.filename}`;

      // Também salvar base64 como backup
      const fileBuffer = fs.readFileSync(req.file.path);
      const fileUrlBase64 = `data:${req.file.mimetype};base64,${fileBuffer.toString('base64')}`;

      const [attachment] = await db.insert(attachments).values({
        fileName: req.file.originalname,
        fileUrl: fileUrlBase64, // Base64 para compatibilidade
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        type: type || 'receipt',
        category: category || null,
        amount: amount ? amount.toString() : null,
        date: date || new Date().toISOString().split('T')[0],
        description: description || req.file.originalname,
        status: 'active',
      }).returning();

      // Salvar também na tabela "files" para compatibilidade
      const [fileRecord] = await db.insert(files).values({
        fileName: req.file.originalname,
        fileUrl: publicUrl, // URL HTTP pública para n8n
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        category: category || null,
        amount: amount ? amount.toString() : null,
        date: date || new Date().toISOString().split('T')[0],
        description: description || req.file.originalname,
        storageType: 'disk',
        n8nProcessed: 'pending',
        status: 'active',
      }).returning();

      console.log(`✅ Anexo ${attachment.id} e arquivo ${fileRecord.id} salvos: ${req.file.originalname} (${req.file.size} bytes)`);

      // DUAL-WRITE: Salvar também no Supabase (se configurado)
      try {
        const { getSupabaseClient } = await import('../supabase-client');
        const supabaseClient = await getSupabaseClient();

        if (supabaseClient) {
          const supabaseFileData = {
            id: fileRecord.id,
            user_id: 'default_user',
            file_name: req.file.originalname,
            file_url: publicUrl,
            file_size: req.file.size,
            mime_type: req.file.mimetype,
            type: type || 'receipt',
            category: category || null,
            amount: amount || null,
            date: date || new Date().toISOString().split('T')[0],
            description: description || req.file.originalname,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const { error: supabaseError } = await supabaseClient
            .from('files')
            .insert(supabaseFileData);

          if (supabaseError) {
            console.warn('⚠️ Erro ao salvar no Supabase:', supabaseError.message);
          } else {
            console.log(`✅ Arquivo também salvo no Supabase: ${fileRecord.id}`);
          }
        } else {
          console.log('ℹ️ Supabase não configurado, arquivo salvo apenas localmente');
        }
      } catch (supabaseWriteError) {
        console.warn('⚠️ Erro ao tentar salvar no Supabase:', supabaseWriteError);
        // Não falhar o upload se Supabase falhar
      }

      // Enviar para n8n webhook para processamento
      try {
        // PRIORIDADE 1: Banco de dados (configurações salvas pelo usuário)
        let n8nWebhookUrl: string | null = null;
        const tenantId = (req as AuthRequest).user?.tenantId || '1';
        const n8nConfigFromDb = await db.select().from(n8nConfig)
          .where(eq(n8nConfig.tenantId, tenantId))
          .limit(1);

        if (n8nConfigFromDb[0]) {
          n8nWebhookUrl = decrypt(n8nConfigFromDb[0].webhookUrl);
          console.log(`🔑 Usando webhook N8N do banco de dados para tenant ${tenantId}`);
        } else if (process.env.N8N_WEBHOOK_URL) {
          // PRIORIDADE 2: Variável de ambiente (fallback)
          n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
          console.log("🔑 Usando webhook N8N da variável de ambiente (fallback)");
        }

        if (!n8nWebhookUrl) {
          console.warn('⚠️ N8N_WEBHOOK_URL não configurada, pulando envio para n8n');
          return res.json({
            success: true,
            attachment: attachment,
            file: fileRecord,
            publicUrl: publicUrl,
            n8n: { status: 'skipped', reason: 'webhook_url_not_configured' }
          });
        }

        const n8nPayload = {
          fileId: fileRecord.id,
          attachmentId: attachment.id,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          category: category || null,
          amount: amount ? parseFloat(amount) : null,
          date: date || new Date().toISOString().split('T')[0],
          description: description || req.file.originalname,
          image_url: publicUrl, // ✅ URL HTTP pública para n8n baixar a imagem
          timestamp: new Date().toISOString(),
        };

        console.log(`🔄 Enviando para n8n webhook: ${n8nWebhookUrl}`);
        console.log(`📦 Payload:`, n8nPayload);

        const n8nResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(n8nPayload),
        });

        if (n8nResponse.ok) {
          const n8nData = await n8nResponse.json();
          console.log(`✅ n8n webhook processado com sucesso:`, n8nData);

          // Atualizar registro com dados do n8n
          await db
            .update(files)
            .set({
              n8nProcessed: 'success',
              n8nData: n8nData,
              updatedAt: new Date(),
            })
            .where(eq(files.id, fileRecord.id));
        } else {
          console.error(`❌ n8n webhook falhou com status ${n8nResponse.status}`);
          await db
            .update(files)
            .set({
              n8nProcessed: 'failed',
              updatedAt: new Date(),
            })
            .where(eq(files.id, fileRecord.id));
        }
      } catch (n8nError) {
        console.error('❌ Erro ao enviar para n8n:', n8nError);
        // Não falhar o upload mesmo se n8n falhar
        await db
          .update(files)
          .set({
            n8nProcessed: 'error',
            updatedAt: new Date(),
          })
          .where(eq(files.id, fileRecord.id));
      }

      // Invalidate billing cache after successful upload
      await invalidateBillingCache('default', 'attachments');

      res.json({
        success: true,
        attachment,
        file: fileRecord,
      });
    } catch (error) {
      console.error('❌ Erro no upload:', error);
      res.status(500).json({
        error: 'Erro ao fazer upload',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // POST /api/files/manual - Adicionar entrada manual (sem arquivo físico)
  app.post("/api/files/manual", async (req, res) => {
    try {
      const { category, amount, date, dueDate, description, url } = req.body;

      if (!category || !amount || !date || !description) {
        return res.status(400).json({
          error: 'Todos os campos são obrigatórios: category, amount, date, description'
        });
      }

      // Criar identificador único para entrada manual
      const manualId = `manual_${Date.now()}_${nanoid(8)}`;
      const fileName = `Entrada Manual - ${category} - ${description}`;

      // Usar URL fornecido ou URL padrão para entrada manual
      const fileUrl = url && url.trim() !== '' ? url : 'manual://entry';

      // Salvar na tabela "files" com tipo manual
      const [fileRecord] = await db.insert(files).values({
        fileName: fileName,
        fileUrl: fileUrl,
        fileSize: 0,
        mimeType: 'application/manual',
        category: category,
        amount: amount.toString(),
        date: date,
        dueDate: dueDate || null,
        description: description,
        storageType: 'manual',
        n8nProcessed: 'not_applicable', // Não precisa processar entrada manual
        status: 'active',
      }).returning();

      // Salvar também na tabela "attachments" para compatibilidade
      const [attachment] = await db.insert(attachments).values({
        fileName: fileName,
        fileUrl: fileUrl,
        fileSize: 0,
        mimeType: 'application/manual',
        type: 'manual',
        category: category,
        amount: amount.toString(),
        date: date,
        description: description,
        status: 'active',
      }).returning();

      console.log(`✅ Entrada manual criada: ${fileName} - R$ ${amount}`);

      // DUAL-WRITE: Salvar também no Supabase (se configurado)
      try {
        const { getSupabaseClient } = await import('../supabase-client');
        const supabaseClient = await getSupabaseClient();

        if (supabaseClient) {
          const supabaseFileData = {
            id: fileRecord.id,
            user_id: 'default_user',
            file_name: fileName,
            file_url: fileUrl,
            file_size: 0,
            mime_type: 'application/manual',
            type: 'manual',
            category: category,
            amount: amount.toString(),
            date: date,
            due_date: dueDate || null,
            description: description,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const { error: supabaseError } = await supabaseClient
            .from('files')
            .insert(supabaseFileData);

          if (supabaseError) {
            console.warn('⚠️ Erro ao salvar entrada manual no Supabase:', supabaseError.message);
          } else {
            console.log(`✅ Entrada manual também salva no Supabase: ${fileRecord.id}`);
          }
        }
      } catch (supabaseWriteError) {
        console.warn('⚠️ Erro ao tentar salvar entrada manual no Supabase:', supabaseWriteError);
      }

      res.json({
        success: true,
        file: fileRecord,
        attachment: attachment,
        message: 'Entrada manual salva com sucesso'
      });
    } catch (error) {
      console.error('❌ Erro ao salvar entrada manual:', error);
      res.status(500).json({
        error: 'Erro ao salvar entrada manual',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // GET /api/attachments - Listar todos os anexos
  app.get("/api/attachments", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const clientId = req.user!.clientId;
      const tenantId = req.session?.tenantId || req.user!.tenantId || '1';
      const allAttachments = await cacheBillingData(
        clientId,
        'attachments',
        async () => {
          const data = await db
            .select()
            .from(attachments)
            .where(and(eq(attachments.status, 'active'), eq(attachments.tenantId, tenantId)))
            .orderBy(attachments.createdAt);
          return data;
        },
        { compress: false }
      ).catch(async (error) => {
        console.error('Cache error for attachments, using fallback:', error);
        const data = await db
          .select()
          .from(attachments)
          .where(and(eq(attachments.status, 'active'), eq(attachments.tenantId, tenantId)))
          .orderBy(attachments.createdAt);
        return data;
      });

      res.json(allAttachments);
    } catch (error) {
      console.error('❌ Erro ao listar anexos:', error);
      res.status(500).json({
        error: 'Erro ao listar anexos',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // GET /api/files - Listar todos os files (com dados do n8n)
  app.get("/api/files", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const clientId = req.user!.clientId;
      const allFiles = await cacheBillingData(
        clientId,
        'attachments',
        async () => {
          // Tentar buscar do Supabase primeiro (se configurado)
          try {
            const { getSupabaseClient } = await import('../supabase-client');
            const supabaseClient = await getSupabaseClient();

            if (supabaseClient) {
              console.log('🔍 Buscando arquivos do Supabase...');
              const { data: supabaseFiles, error: supabaseError } = await supabaseClient
                .from('files')
                .select('*')
                .order('created_at', { ascending: false });

              if (supabaseError) {
                console.warn('⚠️ Erro ao buscar do Supabase:', supabaseError.message);
              } else if (supabaseFiles && supabaseFiles.length > 0) {
                console.log(`📁 ${supabaseFiles.length} arquivo(s) encontrado(s) no Supabase`);

                // Mapear campos do Supabase para o formato esperado pelo frontend
                const mappedFiles = supabaseFiles.map((file: any) => ({
                  id: file.id,
                  userId: file.user_id,
                  fileName: file.file_name,
                  fileUrl: file.file_url,
                  fileSize: file.file_size,
                  mimeType: file.mime_type,
                  category: file.category,
                  amount: file.amount,
                  date: file.date,
                  description: file.description,
                  n8nProcessed: file.n8n_processed,
                  n8nData: file.n8n_data,
                  storageType: file.storage_type || 'supabase',
                  supabasePath: file.supabase_path,
                  status: file.status || 'active',
                  createdAt: file.created_at,
                  updatedAt: file.updated_at,
                }));

                return mappedFiles;
              }
            }
          } catch (supabaseError) {
            console.log('⚠️ Supabase não configurado ou erro ao acessar, usando PostgreSQL local');
          }

          // Fallback: buscar do PostgreSQL local
          // 🔐 MULTI-TENANT: Usar tenantId da sessão ou autenticação
          const tenantId = req.session?.tenantId || req.user!.tenantId;
          if (!tenantId) {
            throw new Error('TenantId não encontrado - sessão inválida');
          }

          const localFiles = await db
            .select()
            .from(files)
            .where(and(eq(files.status, 'active'), eq(files.tenantId, tenantId)))
            .orderBy(files.createdAt);

          console.log(`📁 ${localFiles.length} arquivo(s) encontrado(s) na tabela files (PostgreSQL local) - tenant: ${tenantId}`);
          return localFiles;
        },
        { compress: false, identifier: 'all' }
      ).catch(async (error) => {
        console.error('Cache error for files, using fallback:', error);
        // 🔐 MULTI-TENANT: Usar tenantId da sessão ou autenticação
        const tenantId = req.session?.tenantId || req.user!.tenantId;
        if (!tenantId) {
          throw new Error('TenantId não encontrado - sessão inválida');
        }

        const localFiles = await db
          .select()
          .from(files)
          .where(and(eq(files.status, 'active'), eq(files.tenantId, tenantId)))
          .orderBy(files.createdAt);
        return localFiles;
      });

      res.json(allFiles);
    } catch (error) {
      console.error('❌ Erro ao listar files:', error);
      res.status(500).json({
        error: 'Erro ao listar files',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // GET /api/files/:id - Buscar file específico
  app.get("/api/files/:id", async (req, res) => {
    try {
      const { id } = req.params;
      // 🔐 MULTI-TENANT: Usar tenantId da sessão
      const tenantId = req.session?.tenantId;

      if (!tenantId) {
        return res.status(401).json({
          error: 'Sessão inválida - faça login novamente',
          redirect: '/login'
        });
      }

      const [file] = await db
        .select()
        .from(files)
        .where(and(eq(files.id, id), eq(files.tenantId, tenantId)))
        .limit(1);

      if (!file) {
        return res.status(404).json({ error: 'Arquivo não encontrado' });
      }

      res.json(file);
    } catch (error) {
      console.error('❌ Erro ao buscar file:', error);
      res.status(500).json({
        error: 'Erro ao buscar file',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // GET /api/attachments/:id - Buscar anexo específico
  app.get("/api/attachments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      // 🔐 MULTI-TENANT: Usar tenantId da sessão
      const tenantId = req.session?.tenantId;

      if (!tenantId) {
        return res.status(401).json({
          error: 'Sessão inválida - faça login novamente',
          redirect: '/login'
        });
      }

      const [attachment] = await db
        .select()
        .from(attachments)
        .where(and(eq(attachments.id, id), eq(attachments.tenantId, tenantId)))
        .limit(1);

      if (!attachment) {
        return res.status(404).json({ error: 'Anexo não encontrado' });
      }

      res.json(attachment);
    } catch (error) {
      console.error('❌ Erro ao buscar anexo:', error);
      res.status(500).json({
        error: 'Erro ao buscar anexo',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // DELETE /api/attachments/:id - Deletar anexo (soft delete)
  app.delete("/api/attachments/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const [deleted] = await db
        .update(attachments)
        .set({
          status: 'deleted',
          updatedAt: new Date()
        })
        .where(eq(attachments.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ error: 'Anexo não encontrado' });
      }

      console.log(`✅ Anexo ${id} deletado (soft delete)`);

      // Invalidate billing cache after successful deletion
      await invalidateBillingCache('default', 'attachments', id);

      res.json({
        success: true,
        message: 'Anexo deletado com sucesso'
      });
    } catch (error) {
      console.error('❌ Erro ao deletar anexo:', error);
      res.status(500).json({
        error: 'Erro ao deletar anexo',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // PUT /api/attachments/:id - Atualizar metadados do anexo
  app.put("/api/attachments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { category, amount, date, description, type } = req.body;

      const [updated] = await db
        .update(attachments)
        .set({
          category,
          amount: amount ? amount.toString() : null,
          date,
          description,
          type,
          updatedAt: new Date(),
        })
        .where(eq(attachments.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: 'Anexo não encontrado' });
      }

      console.log(`✅ Anexo ${id} atualizado`);

      // Invalidate billing cache after successful update
      await invalidateBillingCache('default', 'attachments', id);

      res.json({
        success: true,
        attachment: updated,
      });
    } catch (error) {
      console.error('❌ Erro ao atualizar anexo:', error);
      res.status(500).json({
        error: 'Erro ao atualizar anexo',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
}
