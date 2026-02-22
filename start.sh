#!/bin/bash

# ============================================================================
# VERIFICAÇÃO DE SECRETS ESSENCIAIS - ECONOMIZE CRÉDITOS!
# ============================================================================
# Este script verifica TODOS os secrets necessários DE UMA VEZ
# para economizar créditos em novas importações do GitHub
#
# LISTA COMPLETA DE SECRETS OBRIGATÓRIOS:
# ─────────────────────────────────────────────────────────────
# AUTENTICAÇÃO:
#   - JWT_SECRET: Chave para tokens JWT (autenticação)
#
# SUPABASE MASTER (Cache global de consultas CPF):
#   - SUPABASE_MASTER_URL: URL do projeto Supabase Master
#   - SUPABASE_MASTER_SERVICE_ROLE_KEY: Service Role Key do Supabase
#
# BIGDATACORP (Consulta de CPF):
#   - TOKEN_ID: ID do token da BigDataCorp
#   - CHAVE_TOKEN: Chave de acesso da BigDataCorp
#
# OPCIONAIS (melhoram performance):
#   - REDIS_URL: URL do Redis para cache
#   - REDIS_TOKEN: Token do Redis
# ─────────────────────────────────────────────────────────────

MISSING_SECRETS=()
MISSING_OPTIONAL=()

# ============================================================================
# VERIFICAR SECRETS - NÃO SOBRESCREVER SE JÁ EXISTEM
# ============================================================================

# JWT_SECRET - Auto-generate if not set (OK para auto-gerar)
if [ -z "$JWT_SECRET" ]; then
  export JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "dev-jwt-secret-$(date +%s)")
  echo "⚠️  JWT_SECRET auto-gerado para desenvolvimento"
fi

# SUPABASE MASTER - VERIFICAR (não sobrescrever)
if [ -z "$SUPABASE_MASTER_URL" ]; then
  MISSING_SECRETS+=("SUPABASE_MASTER_URL")
fi

if [ -z "$SUPABASE_MASTER_SERVICE_ROLE_KEY" ]; then
  MISSING_SECRETS+=("SUPABASE_MASTER_SERVICE_ROLE_KEY")
fi

# BIGDATACORP - VERIFICAR (não sobrescrever)
if [ -z "$TOKEN_ID" ]; then
  MISSING_SECRETS+=("TOKEN_ID")
fi

if [ -z "$CHAVE_TOKEN" ]; then
  MISSING_SECRETS+=("CHAVE_TOKEN")
fi

# ============================================================================
# OPTIONAL SECRETS
# ============================================================================

if [ -z "$REDIS_URL" ]; then
  MISSING_OPTIONAL+=("REDIS_URL")
fi

# MOSTRAR STATUS DE SECRETS FALTANDO
if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
  echo ""
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║  ⚠️  SECRETS FALTANDO - FUNCIONALIDADES LIMITADAS             ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""
  for secret in "${MISSING_SECRETS[@]}"; do
    echo "  ❌ $secret"
  done
  echo ""
  echo "💡 Configure na aba Secrets para habilitar consulta de CPF"
  echo ""
fi

# ============================================================================
# User credentials - must be set via environment variables in Replit Secrets
# These are required for the initial admin user
if [ -z "$CLIENT_LOGIN_EMAIL" ]; then
  export CLIENT_LOGIN_EMAIL="admin@example.com"
fi

if [ -z "$CLIENT_LOGIN_PASSWORD_HASH" ]; then
  # Generate a secure random password hash on first run
  # Default password will be displayed in console on first startup
  echo "⚠️  WARNING: No CLIENT_LOGIN_PASSWORD_HASH set in Replit Secrets"
  echo "   The application will generate a secure password on first startup"
  echo "   Check the server logs for the generated credentials"
fi

if [ -z "$CLIENT_USER_NAME" ]; then
  export CLIENT_USER_NAME="Admin User"
fi

if [ -z "$CLIENT_COMPANY_NAME" ]; then
  export CLIENT_COMPANY_NAME="My Company"
fi

if [ -z "$CLIENT_PLAN_TYPE" ]; then
  export CLIENT_PLAN_TYPE="pro"
fi

# SESSION_SECRET is auto-configured by Replit, but verify it exists
if [ -z "$SESSION_SECRET" ]; then
  echo "⚠️  WARNING: SESSION_SECRET not set, using auto-generated value"
  export SESSION_SECRET="${SESSION_SECRET:-$(openssl rand -base64 32)}"
fi

# ============================================================================
# MOSTRAR STATUS DE TODAS AS INTEGRAÇÕES
# ============================================================================
echo ""
if [ ${#MISSING_SECRETS[@]} -eq 0 ]; then
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║  ✅ TODAS AS CREDENCIAIS CONFIGURADAS!                        ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
else
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║  ⚠️  ALGUMAS CREDENCIAIS ESTÃO FALTANDO                       ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
fi
echo ""
echo "🔐 Segurança & Autenticação:"
echo "   ✅ JWT_SECRET: Configurado"
echo ""
echo "🔍 Consulta de CPF (BigDataCorp):"
if [ -n "$TOKEN_ID" ]; then
  echo "   ✅ TOKEN_ID: Configurado"
else
  echo "   ❌ TOKEN_ID: NÃO CONFIGURADO"
fi
if [ -n "$CHAVE_TOKEN" ]; then
  echo "   ✅ CHAVE_TOKEN: Configurado"
else
  echo "   ❌ CHAVE_TOKEN: NÃO CONFIGURADO"
fi
echo ""
echo "📊 Supabase Master (Cache de Consultas):"
if [ -n "$SUPABASE_MASTER_URL" ]; then
  echo "   ✅ SUPABASE_MASTER_URL: $SUPABASE_MASTER_URL"
else
  echo "   ❌ SUPABASE_MASTER_URL: NÃO CONFIGURADO"
fi
if [ -n "$SUPABASE_MASTER_SERVICE_ROLE_KEY" ]; then
  echo "   ✅ SUPABASE_MASTER_SERVICE_ROLE_KEY: Configurado"
else
  echo "   ❌ SUPABASE_MASTER_SERVICE_ROLE_KEY: NÃO CONFIGURADO"
fi
echo ""
if [ -n "$REDIS_URL" ]; then
  echo "🚀 Cache Redis (Performance):"
  echo "   ✅ REDIS_URL: Configurado"
  echo ""
else
  echo "💡 Opcional - Redis não configurado (usando cache em memória)"
  echo ""
fi
echo "🚀 Iniciando servidor integrado (Express + Vite) na porta 5000..."
echo ""

# ============================================================================
# AUTO-RUN MIGRATIONS IF DATABASE EXISTS BUT TABLES DON'T
# ============================================================================
if [ -n "$DATABASE_URL" ]; then
  echo "🔍 Verificando tabelas do banco de dados..."
  
  # Check if psql is available
  if ! command -v psql &> /dev/null; then
    echo "⚠️  psql não disponível - pulando verificação de tabelas"
    echo "   Execute 'npm run db:push' manualmente se necessário"
  else
    # Query table count, capture both output and exit code
    TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>&1)
    PSQL_EXIT_CODE=$?
    
    if [ $PSQL_EXIT_CODE -ne 0 ]; then
      echo "⚠️  Não foi possível conectar ao banco de dados"
      echo "   Execute 'npm run db:push' manualmente se necessário"
    else
      TABLE_COUNT=$(echo "$TABLE_COUNT" | tr -d ' ')
      
      if [ "$TABLE_COUNT" = "0" ]; then
        echo ""
        echo "╔════════════════════════════════════════════════════════════════╗"
        echo "║  📦 PRIMEIRA EXECUÇÃO - CRIANDO TABELAS DO BANCO DE DADOS     ║"
        echo "╚════════════════════════════════════════════════════════════════╝"
        echo ""
        echo "Executando migrações automaticamente..."
        npm run db:push
        
        if [ $? -eq 0 ]; then
          echo ""
          echo "✅ Tabelas criadas com sucesso!"
          echo ""
        else
          echo ""
          echo "╔════════════════════════════════════════════════════════════════╗"
          echo "║  ❌ ERRO CRÍTICO: Falha ao criar tabelas do banco de dados    ║"
          echo "╚════════════════════════════════════════════════════════════════╝"
          echo ""
          echo "O servidor não pode iniciar sem as tabelas do banco de dados."
          echo ""
          echo "Tente executar manualmente:"
          echo "  npm run db:push"
          echo ""
          echo "Se o problema persistir, verifique:"
          echo "  1. Se DATABASE_URL está configurado corretamente"
          echo "  2. Se o banco de dados PostgreSQL foi criado no Replit"
          echo "  3. Os logs acima para detalhes do erro"
          echo ""
          exit 1
        fi
      else
        echo "✅ Banco de dados ok ($TABLE_COUNT tabelas encontradas)"
      fi
    fi
  fi
else
  echo "⚠️  DATABASE_URL não configurado - use o painel Database do Replit"
fi
echo ""

# Start the integrated server (includes Vite middleware + Express backend)
echo "👤 User configured: $CLIENT_LOGIN_EMAIL"
PORT=${PORT:-5000} NODE_ENV=development npx -y tsx server/index.ts
