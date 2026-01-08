# Documentação Completa: Correção do Supabase Master

**Data:** 08 de Janeiro de 2026  
**Versão:** 1.0  
**Status:** ✅ Resolvido

---

## Sumário

1. [Visão Geral do Problema](#1-visão-geral-do-problema)
2. [Arquitetura do Sistema](#2-arquitetura-do-sistema)
3. [Diagnóstico Detalhado](#3-diagnóstico-detalhado)
4. [Solução Implementada](#4-solução-implementada)
5. [Configuração de Credenciais](#5-configuração-de-credenciais)
6. [Fluxo de Fallback](#6-fluxo-de-fallback)
7. [Arquivos Modificados](#7-arquivos-modificados)
8. [Como Verificar se Está Funcionando](#8-como-verificar-se-está-funcionando)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Visão Geral do Problema

### Sintoma
O histórico de consultas CPF (`/api/compliance/history`) estava retornando array vazio `[]`, mesmo havendo mais de 100 registros no Supabase Cliente.

### Causa Raiz
A chave API armazenada no banco de dados PostgreSQL local pertencia a um **projeto Supabase diferente** do que a URL configurada:

| Campo | Valor Armazenado | Problema |
|-------|------------------|----------|
| URL | `https://axrvyrpefpntacuibyds.supabase.co` | ✅ Correto |
| API Key | JWT com `ref: uniewwcpalbctkahdyxv` | ❌ Projeto antigo/inexistente |

Isso resultava em erro de autenticação "Invalid API key" ao tentar conectar ao Supabase Master.

---

## 2. Arquitetura do Sistema

### Dois Supabase Distintos

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE MASTER                               │
│  Projeto: axrvyrpefpntacuibyds                                  │
│  Tabela: datacorp_checks                                        │
│  Propósito: Cache de consultas BigDataCorp (compartilhado)      │
│  Credenciais: Armazenadas em supabase_master_config             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Fallback se vazio/erro
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE CLIENTE                              │
│  Projeto: axrvyrpefpntacuibyds (mesmo projeto neste caso)       │
│  Tabela: cpf_compliance_results                                 │
│  Propósito: Resultados de validação CPF do tenant               │
│  Credenciais: Armazenadas em supabase_config                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Fallback se vazio/erro
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL LOCAL                              │
│  Database: Replit PostgreSQL                                    │
│  Tabela: cpf_compliance_checks                                  │
│  Propósito: Fallback local para dados de compliance             │
└─────────────────────────────────────────────────────────────────┘
```

### Tabelas de Configuração

```sql
-- Configuração do Supabase MASTER (cache global)
CREATE TABLE supabase_master_config (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  supabase_master_url TEXT NOT NULL,           -- Criptografado
  supabase_master_service_role_key TEXT NOT NULL, -- Criptografado
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Configuração do Supabase CLIENTE (por tenant)
CREATE TABLE supabase_config (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  supabase_url TEXT NOT NULL,                  -- Criptografado
  supabase_anon_key TEXT NOT NULL,             -- Criptografado
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 3. Diagnóstico Detalhado

### 3.1 Verificação das Credenciais Armazenadas

```sql
SELECT tenant_id, supabase_master_url, supabase_master_service_role_key 
FROM supabase_master_config;
```

**Resultado:** Valores criptografados no formato `iv:authTag:encrypted`

### 3.2 Decriptografia para Análise

Usando o algoritmo AES-256-GCM com a chave de desenvolvimento:

```javascript
const crypto = require('crypto');
const ENCRYPTION_KEY = Buffer.from('dev-key-only-32-bytes-long-12345', 'utf8').subarray(0, 32);

function decrypt(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### 3.3 Análise do JWT Antigo (Incorreto)

```javascript
// Decodificando o JWT antigo
const payload = {
  "iss": "supabase",
  "ref": "uniewwcpalbctkahdyxv",  // ❌ PROJETO ERRADO!
  "role": "anon",                 // ❌ Deveria ser service_role idealmente
  "iat": 1763068002,
  "exp": 2078644002
}
```

**Problema identificado:**
- O `ref` (reference) do JWT apontava para `uniewwcpalbctkahdyxv`
- A URL configurada era para `axrvyrpefpntacuibyds`
- Resultado: Autenticação falhava com "Invalid API key"

---

## 4. Solução Implementada

### 4.1 Geração de Novas Credenciais Criptografadas

```javascript
const crypto = require('crypto');
const ENCRYPTION_KEY = Buffer.from('dev-key-only-32-bytes-long-12345', 'utf8').subarray(0, 32);

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

// Credenciais corretas do projeto axrvyrpefpntacuibyds
const correctUrl = 'https://axrvyrpefpntacuibyds.supabase.co';
const correctKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4cnZ5cnBlZnBudGFjdWlieWRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NTI0MDUsImV4cCI6MjA3MjEyODQwNX0.gxBncGJuDEajfo25UTgPHarg9x48i0esVv7Bqp1Piqc';

const encryptedUrl = encrypt(correctUrl);
const encryptedKey = encrypt(correctKey);
```

### 4.2 Atualização no Banco de Dados

```sql
UPDATE supabase_master_config 
SET 
  supabase_master_url = '<encrypted_url>',
  supabase_master_service_role_key = '<encrypted_key>',
  updated_at = NOW() 
WHERE tenant_id = 'dev-daviemericko_gmail_com';
```

### 4.3 Melhoria no Fallback (compliance.ts)

**Antes:** O sistema só fazia fallback quando havia ERRO na consulta.

**Depois:** O sistema também faz fallback quando a tabela está VAZIA.

```typescript
// server/routes/compliance.ts - Linha 302-307
// Se Master não tem dados, buscar também do Cliente
if (checks.length === 0) {
  console.log('[CPF History] Master sem dados, buscando do Supabase Cliente...');
  throw new Error('Master vazio - tentando Cliente');
}
```

---

## 5. Configuração de Credenciais

### 5.1 Onde Obter as Credenciais do Supabase

1. Acesse: https://supabase.com/dashboard
2. Selecione o projeto `axrvyrpefpntacuibyds`
3. Vá em **Settings** → **API**
4. Copie:
   - **Project URL**: `https://axrvyrpefpntacuibyds.supabase.co`
   - **anon/public key**: JWT para operações públicas
   - **service_role key**: JWT para operações administrativas

### 5.2 Estrutura do JWT do Supabase

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
.
{
  "iss": "supabase",
  "ref": "axrvyrpefpntacuibyds",  // ← Deve corresponder ao projeto na URL
  "role": "anon",                 // ou "service_role"
  "iat": 1756552405,
  "exp": 2072128405
}
```

### 5.3 Validação de Credenciais

Para verificar se a chave pertence ao projeto correto:

```javascript
// Decodificar JWT (sem verificar assinatura)
const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const parts = jwt.split('.');
const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
console.log('Projeto:', payload.ref);  // Deve ser axrvyrpefpntacuibyds
console.log('Role:', payload.role);    // anon ou service_role
```

---

## 6. Fluxo de Fallback

### Diagrama de Decisão

```
GET /api/compliance/history
           │
           ▼
┌──────────────────────────┐
│ Supabase Master          │
│ configurado?             │
└──────────────────────────┘
           │
     ┌─────┴─────┐
     │ SIM      │ NÃO
     ▼           ▼
┌────────────┐  ┌────────────────────┐
│ Consultar  │  │ Ir para PostgreSQL │
│ datacorp_  │  │ local              │
│ checks     │  └────────────────────┘
└────────────┘
     │
     ▼
┌──────────────────────────┐
│ Retornou dados?          │
└──────────────────────────┘
     │
┌────┴────┐
│ SIM    │ NÃO (0 registros ou erro)
▼         ▼
┌────┐  ┌─────────────────────────────┐
│ OK │  │ Tentar Supabase CLIENTE     │
│    │  │ (cpf_compliance_results)    │
└────┘  └─────────────────────────────┘
                    │
                    ▼
          ┌──────────────────────────┐
          │ Retornou dados?          │
          └──────────────────────────┘
                    │
           ┌───────┴───────┐
           │ SIM          │ NÃO
           ▼               ▼
        ┌────┐    ┌────────────────────┐
        │ OK │    │ Tentar PostgreSQL  │
        │    │    │ local              │
        └────┘    └────────────────────┘
```

### Código do Fallback

```typescript
// 1. Tentar Supabase Master
try {
  const { data } = await supabaseMaster
    .from('datacorp_checks')
    .select('*')
    .order('consulted_at', { ascending: false })
    .limit(limit);
  
  if (data && data.length > 0) {
    return data;  // Sucesso no Master
  }
  throw new Error('Master vazio');
} catch (err) {
  // 2. Fallback para Supabase Cliente
  try {
    const { data } = await supabaseCliente
      .from('cpf_compliance_results')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (data && data.length > 0) {
      return mapToStandardFormat(data);  // Sucesso no Cliente
    }
    throw new Error('Cliente vazio');
  } catch (clienteErr) {
    // 3. Fallback para PostgreSQL local
    return await db.select().from(cpfComplianceChecks).limit(limit);
  }
}
```

---

## 7. Arquivos Modificados

### 7.1 server/routes/compliance.ts

**Localização:** Linhas 302-307

**Mudança:** Adicionado fallback quando Master retorna 0 registros

```typescript
// Se Master não tem dados, buscar também do Cliente
if (checks.length === 0) {
  console.log('[CPF History] Master sem dados, buscando do Supabase Cliente...');
  throw new Error('Master vazio - tentando Cliente');
}
```

### 7.2 Banco de Dados (supabase_master_config)

**Mudança:** Credenciais atualizadas via SQL

```sql
UPDATE supabase_master_config 
SET 
  supabase_master_url = '14da4248a110f4a698bd2636cd36af06:9ffa98e50f7b65b209b2b56371e332cd:71dc0108835fcca80cd4b4c225c3b98e1f4662b5874227c7bc896401cb03d3e48826e1eb32041126',
  supabase_master_service_role_key = 'd6ddf693814a5427468a5caa0a4b1977:d28ccb20706b419bbb58a6607eca4492:9006062bfc2bc0ea6bf25841577949d9cedbf29b61bbe347e6030152aaab8d1d16aaa77e099bf5bd168f00ffd194f64e5039c20ef69b07748ad111722187e9c56cfb459310c6156ab5ee30d8caedf6252be70421fcfb0aea8998a2cadcd1c8c8d31198026f3621163d529484b2b3806c2032a5c1180ca05fcbd1cf102f6a1d6a4c64c659c0ffd716e67a61c29811aad1c7905ce423e3665213574463333ad576609b474675776e46c1335e84c0a218e4b6c85b8c67ccd93ef9f3250cbdb0b4a28098cd0aaea4b41285ca91aa5116a911',
  updated_at = NOW() 
WHERE tenant_id = 'dev-daviemericko_gmail_com';
```

---

## 8. Como Verificar se Está Funcionando

### 8.1 Teste via API

```bash
curl -s "http://localhost:5000/api/compliance/history?limit=5"
```

**Resposta esperada:**
```json
[
  {
    "id": "775d4605-62c1-426f-af6a-d2a82f609aaa",
    "cpfEncrypted": "728.419.826-53",
    "personName": "ANGELA MARIA LUIZ",
    "status": "approved",
    "source": "supabase_cliente"
  },
  ...
]
```

### 8.2 Verificar Logs do Servidor

```
[CPF History] Sistema single-admin: Buscando TODOS os registros do Supabase Master
[CPF History] Registros encontrados no Supabase Master: 0
[CPF History] Master sem dados, buscando do Supabase Cliente...
[CPF History] Fallback para Supabase Cliente... Master vazio - tentando Cliente
[CPF History] Registros encontrados no Supabase Cliente: 5
[CPF History] Retornando 5 registros formatados
```

### 8.3 Verificar Conexão Master

```
✅ Supabase Master: Usando credenciais de dev-daviemericko_gmail_com
✅ Supabase MESTRE conectado (fonte: database)
```

---

## 9. Troubleshooting

### Problema: "Invalid API key"

**Causa:** A chave JWT não pertence ao projeto da URL

**Solução:**
1. Obtenha a chave correta do dashboard do Supabase
2. Verifique que o `ref` no JWT corresponde ao projeto na URL
3. Atualize as credenciais criptografadas no banco

### Problema: Histórico retorna vazio

**Causa:** Tabela `datacorp_checks` vazia e fallback não ativado

**Solução:**
1. Verificar se a tabela `cpf_compliance_results` tem dados
2. Confirmar que o fallback está implementado em `compliance.ts`

### Problema: Erro de decriptografia

**Causa:** Chave de criptografia diferente ou formato inválido

**Solução:**
1. Verificar formato: `iv:authTag:encrypted` (3 partes separadas por `:`)
2. Confirmar que `ENCRYPTION_KEY` é consistente
3. Recriptografar as credenciais se necessário

### Problema: Timeout na conexão

**Causa:** Supabase pode estar lento ou inacessível

**Solução:**
1. Verificar status do Supabase em https://status.supabase.com
2. O sistema fará fallback automático para o próximo nível

---

## Apêndice: Mapeamento de Campos

### cpf_compliance_results → formato padrão

| Campo Supabase Cliente | Campo Retornado | Notas |
|------------------------|-----------------|-------|
| `id` | `id` | UUID |
| `cpf_hash` | `cpfHash` | Hash do CPF |
| `cpf_encrypted` ou `cpf` | `cpfEncrypted` | CPF mascarado |
| `nome` | `personName` | **Importante: usa `nome` (PT-BR)** |
| `status` | `status` | approved/rejected/pending |
| `risk_score` ou `score` | `riskScore` | 0-100 |
| `created_at` | `consultedAt` | Data da consulta |
| `payload` ou `result_data` | `payload` | Dados brutos |

---

**Documento criado em:** 08/01/2026  
**Última atualização:** 08/01/2026  
**Autor:** ExecutiveAI Pro System
