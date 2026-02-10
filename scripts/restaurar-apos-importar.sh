#!/bin/bash

# ============================================================================
# SCRIPT DE RESTAURAÇÃO APÓS IMPORTAR DO GITHUB
# ============================================================================
# Este script restaura o projeto após importação do GitHub
# Instala dependências e configura o ambiente
#
# IMPORTANTE: Execute APÓS importar do GitHub para o Replit
# ============================================================================

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  🔄 RESTAURAÇÃO PÓS-IMPORTAÇÃO                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# 1. Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
  echo "📦 Instalando dependências (isso pode levar alguns minutos)..."
  npm install
  if [ $? -eq 0 ]; then
    echo "   ✅ Dependências instaladas com sucesso!"
  else
    echo "   ❌ Erro ao instalar dependências"
    exit 1
  fi
else
  echo "   ℹ️  node_modules já existe"
fi

# 2. Verificar DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo ""
  echo "⚠️  DATABASE_URL não configurado!"
  echo "   Use o painel Database do Replit para criar um banco PostgreSQL"
  echo ""
fi

# 3. Executar migrações do banco
if [ -n "$DATABASE_URL" ]; then
  echo "🗄️  Executando migrações do banco de dados..."
  npm run db:push
  if [ $? -eq 0 ]; then
    echo "   ✅ Migrações executadas com sucesso!"
  else
    echo "   ⚠️  Erro nas migrações - verifique os logs"
  fi
fi

# 4. Verificar secrets obrigatórios
echo ""
echo "🔐 Verificando secrets..."

MISSING_SECRETS=()

if [ -z "$JWT_SECRET" ]; then
  MISSING_SECRETS+=("JWT_SECRET")
fi

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
  echo ""
  echo "⚠️  SECRETS FALTANDO:"
  for secret in "${MISSING_SECRETS[@]}"; do
    echo "   ❌ $secret"
  done
  echo ""
  echo "📝 Configure os secrets na aba 'Secrets' do Replit antes de iniciar"
else
  echo "   ✅ Todos os secrets obrigatórios configurados"
fi

# 5. Secrets opcionais
echo ""
echo "📋 Secrets opcionais (configure se necessário):"
echo "   - REACT_APP_SUPABASE_URL (para formulários externos)"
echo "   - REACT_APP_SUPABASE_ANON_KEY (para formulários externos)"
echo "   - TOKEN_ID (para consultas BigDataCorp)"
echo "   - CHAVE_TOKEN (para consultas BigDataCorp)"
echo "   - SUPABASE_MASTER_URL (para cache global CPF)"
echo "   - SUPABASE_MASTER_SERVICE_ROLE_KEY (para cache global CPF)"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ RESTAURAÇÃO CONCLUÍDA!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📝 PRÓXIMO PASSO:"
echo "   npm run dev"
echo ""
echo "🔑 Login padrão: admin@example.com (senha gerada nos logs)"
echo ""
