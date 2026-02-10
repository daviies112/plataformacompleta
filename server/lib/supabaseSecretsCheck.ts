/**
 * 🔐 SUPABASE SECRETS CHECK
 * 
 * Verifica se as credenciais do Supabase estão configuradas.
 * Prioridade: 1) Banco de dados, 2) Secrets
 * Se não estiverem, cria arquivo de alerta para o usuário.
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

const log = (message: string) => {
  console.log(`[SUPABASE-CHECK] ${message}`);
};

interface SecretsCheckResult {
  configured: boolean;
  url?: string;
  source?: string;
  missingSecrets: string[];
}

/**
 * Verifica se as credenciais do Supabase estão configuradas
 * 
 * SYSTEM-LEVEL: Verifica apenas environment variables (não DB)
 */
export async function checkSupabaseSecrets(): Promise<SecretsCheckResult> {
  // SYSTEM-LEVEL: Verificar apenas Secrets do Replit (REACT_APP_ tem prioridade)
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  
  const missingSecrets: string[] = [];
  
  if (!supabaseUrl) {
    missingSecrets.push('REACT_APP_SUPABASE_URL');
  }
  
  if (!supabaseAnonKey) {
    missingSecrets.push('REACT_APP_SUPABASE_ANON_KEY');
  }
  
  if (missingSecrets.length > 0) {
    log('⚠️  Credenciais não encontradas nos Secrets');
    return {
      configured: false,
      missingSecrets
    };
  }
  
  log('✅ Credenciais encontradas nos SECRETS (system-level)');
  return {
    configured: true,
    url: supabaseUrl,
    source: 'secrets',
    missingSecrets: []
  };
}

/**
 * Cria arquivo de alerta quando as credenciais não estão configuradas
 */
export function createSupabaseSetupAlert(missingSecrets: string[]): void {
  const alertContent = `# ⚠️ CONFIGURAÇÃO DO SUPABASE NECESSÁRIA

## 🚨 Ação Requerida

Para que a plataforma Nexus Intelligence funcione completamente, você precisa configurar as credenciais do Supabase.

**IMPORTANTE:** O sistema busca credenciais em 2 lugares (por ordem de prioridade):
1. **Banco de dados** (tabela \`supabase_config\`) ← RECOMENDADO
2. **Replit Secrets** (fallback)

### Opção 1: Configurar no Banco de Dados (RECOMENDADO)

Configure através da interface da aplicação em **/settings** ou diretamente no banco:

\`\`\`sql
INSERT INTO supabase_config (supabase_url, supabase_anon_key)
VALUES ('sua-url-aqui', 'sua-chave-aqui');
\`\`\`

### Opção 2: Configurar via Replit Secrets (Fallback)

Secrets faltando:
${missingSecrets.map(secret => `- \`${secret}\``).join('\n')}

---

## 📋 Passo a Passo para Configurar

### 1. Obter as Credenciais do Supabase

1. Acesse [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto (ou crie um novo)
3. Vá em **Settings** > **API**
4. Copie:
   - **Project URL** → Use para \`REACT_APP_SUPABASE_URL\`
   - **anon/public key** → Use para \`REACT_APP_SUPABASE_ANON_KEY\`

### 2. Configurar no Replit

1. No Replit, clique no ícone de **🔒 Secrets** (cadeado) na barra lateral esquerda
2. Adicione os seguintes secrets:

**Secret 1:**
\`\`\`
Key: REACT_APP_SUPABASE_URL
Value: https://seu-projeto.supabase.co
\`\`\`

**Secret 2:**
\`\`\`
Key: REACT_APP_SUPABASE_ANON_KEY
Value: sua-chave-anon-aqui
\`\`\`

3. Clique em **Save** para cada secret

### 3. Reiniciar o Servidor

Após configurar os secrets, reinicie o workflow \`dev-server\` para que as mudanças tenham efeito.

**O sistema irá detectar automaticamente e conectar nas 12 tabelas do Supabase!**

---

## 📊 O Que Será Conectado Automaticamente

Quando você configurar os secrets, o sistema irá:

✅ **Workspace (3 tabelas):**
- workspace_pages
- workspace_databases  
- workspace_boards

✅ **Formulários (2 tabelas):**
- forms
- form_submissions

✅ **Produto (5 tabelas):**
- products
- suppliers
- resellers
- categories
- print_queue

✅ **Faturamento (1 tabela):**
- files

✅ **Dashboard (1 tabela):**
- clientes_completos

**Total: 12 tabelas conectadas automaticamente!**

---

## 📚 Documentação Adicional

- \`SUPABASE_AUTO_SETUP.md\` - Guia do sistema automático
- \`SUPABASE_TABLES_MAPPING.md\` - Detalhes de cada tabela
- \`supabase-complete-schema.sql\` - Scripts SQL para criar as tabelas
- \`CONFIGURACAO_SUPABASE_COMPLETA.md\` - Guia completo em português

---

## 🎯 Resultado Esperado

Após configurar, você verá no console do servidor:

\`\`\`
╔════════════════════════════════════════╗
║  📊 SUPABASE AUTO-CONNECT - RESUMO   ║
╚════════════════════════════════════════╝
🌐 URL: https://seu-projeto.supabase.co
📊 Tabelas conectadas: 12/12

✅ Workspace: 3/3 tabelas
✅ Formulários: 2/2 tabelas
✅ Produto: 5/5 tabelas
✅ Faturamento: 1/1 tabelas
✅ Dashboard: 1/1 tabelas
\`\`\`

---

**💡 Dica:** Este arquivo será removido automaticamente assim que você configurar os secrets!
`;

  const alertPath = join(process.cwd(), 'SUPABASE_SETUP_REQUIRED.md');
  
  try {
    writeFileSync(alertPath, alertContent, 'utf-8');
    log(`⚠️  Arquivo de alerta criado: SUPABASE_SETUP_REQUIRED.md`);
    log(`📝 Abra o arquivo para ver as instruções de configuração`);
  } catch (error: any) {
    log(`❌ Erro ao criar arquivo de alerta: ${error.message}`);
  }
}

/**
 * Remove o arquivo de alerta se os secrets estiverem configurados
 */
export function removeSupabaseSetupAlert(): void {
  const alertPath = join(process.cwd(), 'SUPABASE_SETUP_REQUIRED.md');
  
  try {
    const fs = require('fs');
    if (fs.existsSync(alertPath)) {
      fs.unlinkSync(alertPath);
      log(`✅ Arquivo de alerta removido - Supabase configurado!`);
    }
  } catch (error: any) {
    // Ignorar erros - arquivo pode não existir
  }
}
