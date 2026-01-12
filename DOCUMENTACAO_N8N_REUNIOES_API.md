# Documentacao Completa: Integracao N8N para Criacao de Reunioes

## Sumario

1. [Visao Geral](#1-visao-geral)
2. [Arquitetura do Sistema](#2-arquitetura-do-sistema)
3. [Banco de Dados](#3-banco-de-dados)
4. [Endpoints da API](#4-endpoints-da-api)
5. [Fluxo de Autenticacao](#5-fluxo-de-autenticacao)
6. [Configuracao na Plataforma](#6-configuracao-na-plataforma)
7. [Configuracao no N8N](#7-configuracao-no-n8n)
8. [Exemplos de Requisicoes](#8-exemplos-de-requisicoes)
9. [Codigo Fonte Relevante](#9-codigo-fonte-relevante)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Visao Geral

### O que e esta integracao?

Esta integracao permite que o **N8N** (ou qualquer sistema de automacao) **crie reunioes na plataforma** automaticamente. 

**Diferenca importante:**
- **N8N existente (Processamento de Documentos)**: A plataforma ENVIA dados para o N8N via webhook
- **Esta nova integracao (Automacao de Reunioes)**: O N8N CRIA reunioes na plataforma via API

### Beneficios

1. **Automacao completa**: Crie reunioes automaticamente a partir de gatilhos no N8N
2. **Branding automatico**: As reunioes herdam cores, logo e design do tenant automaticamente
3. **Seguranca**: Cada tenant tem sua propria API Key criptografada
4. **Compatibilidade**: Suporte para chave global (legacy) e chave por tenant (recomendado)

---

## 2. Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                           N8N                                    │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Gatilho    │───>│ HTTP Request │───>│   Processar  │      │
│  │  (Webhook,   │    │  POST para   │    │   Resposta   │      │
│  │  Schedule)   │    │  /api/n8n/   │    │   (linkRe-   │      │
│  │              │    │  reunioes    │    │   uniao)     │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Header: X-N8N-API-Key
                              │ Body: { titulo, nome, email... }
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PLATAFORMA                                  │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Middleware  │───>│   Validar    │───>│   Carregar   │      │
│  │  Autentica-  │    │   API Key    │    │   Config     │      │
│  │  cao N8N     │    │   do Tenant  │    │   do Tenant  │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                  │               │
│                                                  ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Salvar     │<───│   Criar      │<───│   Criar Sala │      │
│  │   Reuniao    │    │   Tokens     │    │   no 100ms   │      │
│  │   no Banco   │    │   100ms      │    │              │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────┐                                               │
│  │   Retornar   │ { meetingId, linkReuniao, linkPublico, ... } │
│  │   Resposta   │                                               │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Banco de Dados

### Tabela: hms100msConfig

A API Key do N8N e armazenada na mesma tabela das credenciais do 100ms.

```sql
-- Schema da tabela (Drizzle ORM)
-- Arquivo: shared/db-schema.ts

export const hms100msConfig = pgTable("hms_100ms_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: text("tenant_id").notNull().unique(),
  
  -- Credenciais do 100ms (criptografadas)
  appAccessKey: text("app_access_key"),
  appSecret: text("app_secret"),
  managementToken: text("management_token"),
  templateId: text("template_id"),
  apiBaseUrl: text("api_base_url").default("https://api.100ms.live/v2"),
  
  -- Configuracao de design da sala
  roomDesignConfig: jsonb("room_design_config"),
  
  -- *** CAMPOS NOVOS PARA N8N ***
  n8nApiKey: text("n8n_api_key"),           -- API Key criptografada
  n8nApiKeyCreatedAt: timestamp("n8n_api_key_created_at"),  -- Data de criacao
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Como a API Key e armazenada

1. **Geracao**: Chave de 64 caracteres hexadecimais com prefixo `n8n_`
2. **Criptografia**: Usando AES-256-CBC antes de salvar no banco
3. **Formato**: `n8n_` + 64 caracteres hex = ~68 caracteres total

```javascript
// Exemplo de API Key gerada:
"n8n_a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"
```

---

## 4. Endpoints da API

### 4.1. Gerar API Key

**Endpoint:** `POST /api/n8n/api-key/generate`

**Autenticacao:** Bearer Token (usuario logado na plataforma)

**Descricao:** Gera uma nova API Key para o tenant do usuario. Se ja existir uma, substitui pela nova.

**Headers:**
```
Authorization: Bearer <token_jwt_do_usuario>
Content-Type: application/json
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "API Key gerada com sucesso",
  "apiKey": "n8n_a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
  "createdAt": "2026-01-12T19:45:00.000Z",
  "warning": "Guarde esta chave em local seguro. Ela nao sera mostrada novamente."
}
```

**Erros possiveis:**
- `400`: Configuracao 100ms nao encontrada
- `401`: Usuario nao autenticado

---

### 4.2. Revogar API Key

**Endpoint:** `DELETE /api/n8n/api-key`

**Autenticacao:** Bearer Token (usuario logado na plataforma)

**Descricao:** Remove a API Key do tenant, invalidando todas as chamadas futuras do N8N.

**Headers:**
```
Authorization: Bearer <token_jwt_do_usuario>
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "API Key revogada com sucesso"
}
```

---

### 4.3. Verificar Status da API Key

**Endpoint:** `GET /api/n8n/api-key/status`

**Autenticacao:** Bearer Token (usuario logado na plataforma)

**Descricao:** Verifica se o tenant tem uma API Key configurada.

**Headers:**
```
Authorization: Bearer <token_jwt_do_usuario>
```

**Resposta de Sucesso (200):**
```json
{
  "hasApiKey": true,
  "hasConfig": true,
  "createdAt": "2026-01-12T19:45:00.000Z"
}
```

**Resposta quando nao configurado:**
```json
{
  "hasApiKey": false,
  "hasConfig": false,
  "message": "Configure primeiro as credenciais do 100ms"
}
```

---

### 4.4. Criar Reuniao (usado pelo N8N)

**Endpoint:** `POST /api/n8n/reunioes`

**Autenticacao:** API Key do Tenant (header X-N8N-API-Key)

**Descricao:** Cria uma nova reuniao no 100ms e salva no banco de dados.

**Headers:**
```
X-N8N-API-Key: n8n_sua_api_key_aqui
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "titulo": "Reuniao com Cliente",
  "nome": "Joao Silva",
  "email": "joao@email.com",
  "telefone": "+5511999999999",
  "dataInicio": "2026-01-15T14:00:00.000Z",
  "duracao": 60,
  "roomDesignConfig": null
}
```

**Campos do Body:**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| titulo | string | Sim | Titulo da reuniao |
| nome | string | Nao | Nome do participante principal |
| email | string | Nao | Email do participante (deve ser email valido) |
| telefone | string | Nao | Telefone do participante |
| dataInicio | string (ISO 8601) | Nao | Data/hora de inicio (se nao informado, usa agora) |
| duracao | number | Nao | Duracao em minutos (15-480, padrao: 60) |
| roomDesignConfig | object | Nao | Override de design (se nao informado, usa config do tenant) |

**Resposta de Sucesso (201):**
```json
{
  "success": true,
  "message": "Reuniao criada com sucesso",
  "data": {
    "meetingId": "550e8400-e29b-41d4-a716-446655440000",
    "roomId100ms": "room_abc123",
    "titulo": "Reuniao com Cliente",
    "linkReuniao": "https://seu-dominio.replit.app/reuniao/550e8400-e29b-41d4-a716-446655440000",
    "linkPublico": "https://seu-dominio.replit.app/reuniao-publica/550e8400-e29b-41d4-a716-446655440000",
    "dataInicio": "2026-01-15T14:00:00.000Z",
    "dataFim": "2026-01-15T15:00:00.000Z",
    "duracao": 60,
    "status": "agendada",
    "hostToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tenantId": "tenant_123",
    "hasCustomDesign": true,
    "createdAt": "2026-01-12T19:50:00.000Z"
  }
}
```

**Erros possiveis:**
- `400`: Dados invalidos ou credenciais 100ms nao configuradas
- `401`: API Key nao fornecida ou invalida
- `500`: Erro ao criar sala no 100ms

---

### 4.5. Buscar Reuniao

**Endpoint:** `GET /api/n8n/reunioes/:id`

**Autenticacao:** API Key do Tenant (header X-N8N-API-Key)

**Descricao:** Busca os detalhes de uma reuniao existente.

**Headers:**
```
X-N8N-API-Key: n8n_sua_api_key_aqui
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "tenantId": "tenant_123",
    "titulo": "Reuniao com Cliente",
    "nome": "Joao Silva",
    "email": "joao@email.com",
    "telefone": "+5511999999999",
    "dataInicio": "2026-01-15T14:00:00.000Z",
    "dataFim": "2026-01-15T15:00:00.000Z",
    "duracao": 60,
    "status": "agendada",
    "roomId100ms": "room_abc123",
    "linkReuniao": "https://...",
    "metadata": {
      "source": "n8n",
      "createdVia": "n8n-api",
      "roomDesignConfig": { ... }
    }
  }
}
```

---

### 4.6. Health Check

**Endpoint:** `GET /api/n8n/health`

**Autenticacao:** Nenhuma

**Descricao:** Verifica se a API esta funcionando.

**Resposta:**
```json
{
  "status": "ok",
  "message": "N8N API endpoint esta funcionando",
  "timestamp": "2026-01-12T19:50:00.000Z",
  "authMethods": {
    "tenantApiKey": "Recomendado - API Key gerada por tenant em /configuracoes",
    "globalApiKey": "Legacy - Usa N8N_API_KEY do ambiente (requer tenantId no body)"
  },
  "endpoints": {
    "createMeeting": "POST /api/n8n/reunioes",
    "getMeeting": "GET /api/n8n/reunioes/:id",
    "generateApiKey": "POST /api/n8n/api-key/generate (autenticado)",
    "revokeApiKey": "DELETE /api/n8n/api-key (autenticado)",
    "checkApiKeyStatus": "GET /api/n8n/api-key/status (autenticado)",
    "health": "GET /api/n8n/health",
    "schema": "GET /api/n8n/schema"
  }
}
```

---

### 4.7. Schema (Documentacao)

**Endpoint:** `GET /api/n8n/schema`

**Autenticacao:** Nenhuma

**Descricao:** Retorna a documentacao completa dos endpoints em formato JSON.

---

## 5. Fluxo de Autenticacao

### Como funciona a autenticacao por API Key

```
┌─────────────────────────────────────────────────────────────────┐
│                     REQUISICAO DO N8N                           │
│                                                                  │
│   Header: X-N8N-API-Key: n8n_a1b2c3d4e5f6...                   │
│   Body: { "titulo": "Reuniao", ... }                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               MIDDLEWARE: authenticateN8NByTenantKey            │
│                                                                  │
│   1. Extrai API Key do header X-N8N-API-Key                     │
│   2. Se nao tem header, retorna 401                             │
│   3. Busca TODOS os tenants na tabela hms100msConfig            │
│   4. Para cada tenant:                                          │
│      - Descriptografa n8nApiKey do banco                        │
│      - Compara com a API Key recebida                           │
│   5. Se encontrar match: req.tenantConfig = configDoTenant      │
│   6. Se nao encontrar: tenta chave global N8N_API_KEY (legacy)  │
│   7. Se nenhuma funcionar: retorna 401                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ROTA: POST /api/n8n/reunioes                 │
│                                                                  │
│   - req.tenantConfig ja contem as credenciais do tenant         │
│   - Usa appAccessKey e appSecret para criar sala no 100ms       │
│   - Usa roomDesignConfig para aplicar branding automatico       │
│   - Salva reuniao no banco com tenantId correto                 │
└─────────────────────────────────────────────────────────────────┘
```

### Compatibilidade com chave global (Legacy)

Para manter compatibilidade com implementacoes anteriores:

1. Se a API Key do tenant NAO corresponder a nenhum tenant
2. E existir a variavel de ambiente `N8N_API_KEY`
3. E a API Key recebida for igual a `N8N_API_KEY`
4. Entao:
   - Se existe apenas 1 tenant: usa esse tenant automaticamente
   - Se existem multiplos tenants: exige `tenantId` no body da requisicao

---

## 6. Configuracao na Plataforma

### Passo a Passo

#### 1. Fazer Login na Plataforma

Acesse a plataforma e faca login com suas credenciais.

#### 2. Ir para Configuracoes

Clique no icone de engrenagem ou no menu "Configuracoes".

#### 3. Configurar Credenciais do 100ms (Pre-requisito)

Antes de gerar a API Key do N8N, voce DEVE configurar as credenciais do 100ms:

1. Abra a secao "Integracao com Reuniao (100ms)"
2. Preencha:
   - **App Access Key**: Obtido no dashboard.100ms.live
   - **App Secret**: Obtido no dashboard.100ms.live
   - **Template ID**: ID do template de sala
3. Clique em "Testar Conexao 100ms"
4. Se o teste passar, clique em "Salvar Configuracao"

#### 4. Gerar API Key do N8N

1. Abra a secao "Automacao de Reunioes (N8N)"
2. Clique no botao "Gerar API Key"
3. **IMPORTANTE**: Copie a API Key imediatamente!
4. A chave so e mostrada UMA vez
5. Guarde em local seguro (gerenciador de senhas, cofre, etc.)

#### 5. Usar a API Key no N8N

Configure o N8N com a API Key gerada (veja secao 7).

---

## 7. Configuracao no N8N

### Passo a Passo Detalhado

#### 1. Criar novo Workflow no N8N

Acesse seu N8N e crie um novo workflow.

#### 2. Adicionar Trigger (Gatilho)

Escolha o gatilho que vai iniciar a criacao da reuniao:

- **Webhook**: Para receber dados externos
- **Schedule**: Para criar reunioes em horarios especificos
- **Form Trigger**: Para criar reunioes a partir de formularios
- **Qualquer outro**: De acordo com sua necessidade

#### 3. Adicionar no "HTTP Request"

Adicione um no "HTTP Request" apos o trigger.

**Configuracao do no HTTP Request:**

```
Method: POST
URL: https://SEU-DOMINIO.replit.app/api/n8n/reunioes
```

> **IMPORTANTE**: Substitua `SEU-DOMINIO.replit.app` pelo dominio real da sua plataforma!

#### 4. Configurar Headers

Na aba "Headers", adicione:

| Header Name | Header Value |
|-------------|--------------|
| X-N8N-API-Key | n8n_SUA_API_KEY_AQUI |
| Content-Type | application/json |

> **IMPORTANTE**: Substitua `n8n_SUA_API_KEY_AQUI` pela API Key que voce copiou na plataforma!

#### 5. Configurar Body

Na aba "Body":
- **Body Content Type**: JSON
- **Specify Body**: Using Fields Below (ou JSON se preferir)

**Opcao 1: Usando Fields Below**

Adicione os campos:

| Name | Value |
|------|-------|
| titulo | {{ $json.titulo }} ou "Reuniao Automatica" |
| nome | {{ $json.nome }} ou "Participante" |
| email | {{ $json.email }} (opcional) |
| telefone | {{ $json.telefone }} (opcional) |
| dataInicio | {{ $json.dataInicio }} (opcional, formato ISO 8601) |
| duracao | 60 (numero em minutos) |

**Opcao 2: Usando JSON direto**

```json
{
  "titulo": "{{ $json.titulo }}",
  "nome": "{{ $json.nome }}",
  "email": "{{ $json.email }}",
  "telefone": "{{ $json.telefone }}",
  "duracao": 60
}
```

#### 6. Configurar Resposta

Apos o HTTP Request, adicione nos para processar a resposta:

- **Set**: Para extrair dados da resposta
- **IF**: Para verificar se foi sucesso
- **Send Email**: Para enviar o link da reuniao por email
- etc.

**Dados importantes da resposta:**

```javascript
// Acessar link da reuniao
{{ $json.data.linkReuniao }}

// Acessar link publico (para convidados externos)
{{ $json.data.linkPublico }}

// Acessar ID da reuniao
{{ $json.data.meetingId }}

// Acessar token do host
{{ $json.data.hostToken }}
```

---

### Exemplo Completo de Workflow N8N

```
┌─────────────────┐
│    Webhook      │  Recebe dados: { nome, email, titulo }
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  HTTP Request   │  POST /api/n8n/reunioes
│                 │  Header: X-N8N-API-Key
│                 │  Body: { titulo, nome, email }
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│       IF        │  Se $json.success == true
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│ True  │ │ False │
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│ Send  │ │ Send  │
│ Email │ │ Error │
│ Link  │ │ Alert │
└───────┘ └───────┘
```

---

## 8. Exemplos de Requisicoes

### Exemplo 1: Criar reuniao simples

**Request:**
```bash
curl -X POST https://seu-dominio.replit.app/api/n8n/reunioes \
  -H "Content-Type: application/json" \
  -H "X-N8N-API-Key: n8n_a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456" \
  -d '{
    "titulo": "Reuniao com Cliente",
    "nome": "Joao Silva"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Reuniao criada com sucesso",
  "data": {
    "meetingId": "550e8400-e29b-41d4-a716-446655440000",
    "roomId100ms": "room_abc123",
    "titulo": "Reuniao com Cliente",
    "linkReuniao": "https://seu-dominio.replit.app/reuniao/550e8400-e29b-41d4-a716-446655440000",
    "linkPublico": "https://seu-dominio.replit.app/reuniao-publica/550e8400-e29b-41d4-a716-446655440000",
    "dataInicio": "2026-01-12T20:00:00.000Z",
    "dataFim": "2026-01-12T21:00:00.000Z",
    "duracao": 60,
    "status": "agendada",
    "hostToken": "eyJ...",
    "tenantId": "tenant_123",
    "hasCustomDesign": true,
    "createdAt": "2026-01-12T19:50:00.000Z"
  }
}
```

### Exemplo 2: Criar reuniao agendada com todos os campos

**Request:**
```bash
curl -X POST https://seu-dominio.replit.app/api/n8n/reunioes \
  -H "Content-Type: application/json" \
  -H "X-N8N-API-Key: n8n_a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456" \
  -d '{
    "titulo": "Apresentacao do Produto XYZ",
    "nome": "Maria Santos",
    "email": "maria@empresa.com",
    "telefone": "+5511988887777",
    "dataInicio": "2026-01-20T10:00:00.000Z",
    "duracao": 45
  }'
```

### Exemplo 3: Verificar health da API

**Request:**
```bash
curl https://seu-dominio.replit.app/api/n8n/health
```

**Response:**
```json
{
  "status": "ok",
  "message": "N8N API endpoint esta funcionando",
  "timestamp": "2026-01-12T19:50:00.000Z"
}
```

---

## 9. Codigo Fonte Relevante

### Arquivo: server/routes/n8n.ts

Este e o arquivo principal que contem toda a logica da API.

```typescript
// Localizacao: server/routes/n8n.ts

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { reunioes, hms100msConfig } from '../../shared/db-schema';
import { eq } from 'drizzle-orm';
import { decrypt, encrypt } from '../lib/credentialsManager';
import { criarSala, gerarTokenParticipante } from '../services/meetings/hms100ms';
import { z } from 'zod';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth';

const n8nRouter = Router();

// Funcao para gerar API Key segura
function generateApiKey(): string {
    return `n8n_${crypto.randomBytes(32).toString('hex')}`;
}

// Middleware de autenticacao por API Key do tenant
async function authenticateN8NByTenantKey(req: Request, res: Response, next: any) {
    const apiKey = req.headers['x-n8n-api-key'] as string;

    if (!apiKey) {
        return res.status(401).json({ 
            error: 'API Key nao fornecida',
            message: 'Inclua o header X-N8N-API-Key na requisicao'
        });
    }

    try {
        // Busca todos os tenants
        const configs = await db.select().from(hms100msConfig);
        
        // Procura qual tenant tem essa API Key
        let matchedConfig = null;
        for (const config of configs) {
            if (config.n8nApiKey) {
                const decryptedKey = decrypt(config.n8nApiKey);
                if (decryptedKey === apiKey) {
                    matchedConfig = config;
                    break;
                }
            }
        }

        if (!matchedConfig) {
            // Fallback para chave global (legacy)
            const masterKey = process.env.N8N_API_KEY;
            if (masterKey && apiKey === masterKey) {
                (req as any).n8nAuthType = 'global';
                return next();
            }

            return res.status(401).json({ 
                error: 'API Key invalida'
            });
        }

        // Armazena config do tenant no request
        (req as any).tenantConfig = matchedConfig;
        (req as any).n8nAuthType = 'tenant';
        next();
    } catch (error: any) {
        res.status(500).json({ error: 'Erro interno' });
    }
}

// Endpoint para gerar API Key (usuario logado)
n8nRouter.post('/api-key/generate', authenticateToken, async (req, res) => {
    const user = (req as any).user;
    const tenantId = user.tenantId;

    // Busca config existente
    const [existingConfig] = await db.select().from(hms100msConfig)
        .where(eq(hms100msConfig.tenantId, tenantId))
        .limit(1);

    if (!existingConfig) {
        return res.status(400).json({ 
            error: 'Configure primeiro as credenciais do 100ms'
        });
    }

    // Gera e criptografa nova API Key
    const newApiKey = generateApiKey();
    const encryptedKey = encrypt(newApiKey);

    // Salva no banco
    await db.update(hms100msConfig)
        .set({ 
            n8nApiKey: encryptedKey,
            n8nApiKeyCreatedAt: new Date(),
            updatedAt: new Date()
        })
        .where(eq(hms100msConfig.tenantId, tenantId));

    res.json({
        success: true,
        apiKey: newApiKey,  // Retorna a chave NAO criptografada
        warning: 'Guarde esta chave. Ela nao sera mostrada novamente.'
    });
});

// Endpoint para criar reuniao (chamado pelo N8N)
n8nRouter.post('/reunioes', authenticateN8NByTenantKey, async (req, res) => {
    const data = req.body;
    const config = (req as any).tenantConfig;
    const tenantId = config.tenantId;

    // Descriptografa credenciais do 100ms
    const appAccessKey = decrypt(config.appAccessKey);
    const appSecret = decrypt(config.appSecret);

    // Cria sala no 100ms
    const sala = await criarSala(
        data.titulo,
        config.templateId || '',
        appAccessKey,
        appSecret
    );

    // Salva reuniao no banco
    const [newMeeting] = await db.insert(reunioes).values({
        tenantId,
        titulo: data.titulo,
        nome: data.nome || 'Participante',
        email: data.email || '',
        roomId100ms: sala.id,
        // ... outros campos
    }).returning();

    // Retorna dados da reuniao
    res.status(201).json({
        success: true,
        data: {
            meetingId: newMeeting.id,
            linkReuniao: `https://dominio/reuniao/${newMeeting.id}`,
            linkPublico: `https://dominio/reuniao-publica/${newMeeting.id}`,
            // ... outros dados
        }
    });
});

export default n8nRouter;
```

### Arquivo: shared/db-schema.ts (trecho relevante)

```typescript
// Campos adicionados para N8N
export const hms100msConfig = pgTable("hms_100ms_config", {
  // ... outros campos ...
  
  // Campos para integracao N8N
  n8nApiKey: text("n8n_api_key"),
  n8nApiKeyCreatedAt: timestamp("n8n_api_key_created_at"),
});
```

### Arquivo: src/pages/SettingsPage.tsx (trecho relevante)

```typescript
// Estados para gerenciar API Key
const [generatedN8nApiKey, setGeneratedN8nApiKey] = useState<string | null>(null);
const [showN8nApiKey, setShowN8nApiKey] = useState(false);
const [copiedN8nApiKey, setCopiedN8nApiKey] = useState(false);

// Query para verificar status
const { data: n8nMeetingApiStatus } = useQuery({
  queryKey: ['/api/n8n/api-key/status'],
  // ...
});

// Mutation para gerar API Key
const generateN8nMeetingApiKeyMutation = useMutation({
  mutationFn: async () => {
    const response = await fetch('/api/n8n/api-key/generate', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
    });
    return response.json();
  },
  onSuccess: (data) => {
    setGeneratedN8nApiKey(data.apiKey);
    // ...
  },
});

// UI da secao (CollapsibleSection)
<CollapsibleSection
  id="n8nMeetingApi"
  title="Automacao de Reunioes (N8N)"
  description="Gere API Key para o N8N criar reunioes"
  icon={Link2}
>
  {/* Status da API Key */}
  {/* Botao Gerar/Regenerar */}
  {/* Campo para copiar a chave */}
  {/* Instrucoes de uso */}
</CollapsibleSection>
```

---

## 10. Troubleshooting

### Erro: "API Key nao fornecida"

**Causa:** O header `X-N8N-API-Key` nao esta sendo enviado.

**Solucao:**
1. No N8N, va para a aba "Headers" do no HTTP Request
2. Adicione o header `X-N8N-API-Key` com sua API Key

### Erro: "API Key invalida"

**Causa:** A API Key esta incorreta ou foi revogada.

**Solucao:**
1. Verifique se copiou a API Key corretamente
2. Gere uma nova API Key na plataforma se necessario

### Erro: "Configuracao do 100ms nao encontrada"

**Causa:** As credenciais do 100ms nao estao configuradas para o tenant.

**Solucao:**
1. Va para Configuracoes na plataforma
2. Configure as credenciais do 100ms primeiro
3. Depois gere a API Key do N8N

### Erro: "Credenciais do 100ms invalidas"

**Causa:** As credenciais do 100ms estao incorretas ou expiraram.

**Solucao:**
1. Verifique suas credenciais no dashboard.100ms.live
2. Atualize na plataforma e teste a conexao

### A reuniao foi criada mas nao aparece no calendario

**Causa:** A reuniao foi criada corretamente, mas pode nao estar sincronizada.

**Solucao:**
1. Verifique no banco de dados se a reuniao existe
2. Recarregue a pagina do calendario

### O link da reuniao nao funciona

**Causa:** O dominio na resposta pode estar incorreto.

**Solucao:**
1. Verifique se a variavel REPLIT_DOMAINS esta configurada
2. Use o campo `linkPublico` para convidados externos

---

## Glossario

- **Tenant**: Uma organizacao/empresa que usa a plataforma
- **API Key**: Chave de autenticacao para acessar a API
- **100ms**: Servico de videoconferencia usado pela plataforma
- **N8N**: Ferramenta de automacao de workflows
- **Bearer Token**: Token JWT usado para autenticar usuarios logados
- **Branding**: Cores, logo e design personalizados do tenant

---

## Contato e Suporte

Para duvidas ou problemas:
1. Verifique esta documentacao
2. Consulte os logs do servidor
3. Teste os endpoints usando o endpoint `/api/n8n/health`
4. Verifique o esquema da API em `/api/n8n/schema`

---

*Documentacao criada em: 12 de Janeiro de 2026*
*Versao: 1.0*
