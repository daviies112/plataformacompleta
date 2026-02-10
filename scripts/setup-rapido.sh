#!/bin/bash

# ============================================================================
# SETUP RÁPIDO - ExecutiveAI Pro
# ============================================================================
# Execute este script UMA VEZ após importar do GitHub
# Faz toda a configuração automática em um só comando
#
# USO: bash scripts/setup-rapido.sh
# ============================================================================

set -e  # Para ao primeiro erro

echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║  🚀 SETUP RÁPIDO - ExecutiveAI Pro                                ║"
echo "║  Este script configura todo o ambiente automaticamente            ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Função para mostrar progresso
progress() {
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔹 $1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ============================================================================
# PASSO 1: CRIAR DIRETÓRIOS NECESSÁRIOS
# ============================================================================
progress "Passo 1/5: Criando diretórios..."

mkdir -p public/uploads/logos
mkdir -p exports
mkdir -p .local/state

echo "   ✅ Diretórios criados"

# ============================================================================
# PASSO 2: INSTALAR DEPENDÊNCIAS
# ============================================================================
progress "Passo 2/5: Instalando dependências (pode demorar 2-3 min)..."

if [ -d "node_modules" ]; then
  echo "   ℹ️  node_modules existe, verificando..."
  npm install --prefer-offline 2>/dev/null || npm install
else
  npm install
fi

echo "   ✅ Dependências instaladas"

# ============================================================================
# PASSO 3: VERIFICAR BANCO DE DADOS
# ============================================================================
progress "Passo 3/5: Configurando banco de dados..."

if [ -z "$DATABASE_URL" ]; then
  echo "   ⚠️  DATABASE_URL não configurado!"
  echo ""
  echo "   👉 AÇÃO NECESSÁRIA:"
  echo "   1. Clique na aba 'Database' no painel lateral do Replit"
  echo "   2. Crie um novo banco PostgreSQL"
  echo "   3. Execute este script novamente"
  echo ""
  echo "   OU continue sem banco (funcionalidades limitadas)"
else
  echo "   ✅ DATABASE_URL encontrado"
  echo "   📊 Sincronizando schema do banco..."
  npm run db:push 2>/dev/null || echo "   ⚠️ Tabelas já existem ou erro - verifique logs"
  echo "   ✅ Banco de dados configurado"
fi

# ============================================================================
# PASSO 4: VERIFICAR SECRETS
# ============================================================================
progress "Passo 4/5: Verificando secrets..."

echo ""
echo "   🔐 SECRETS OBRIGATÓRIOS:"

if [ -z "$JWT_SECRET" ]; then
  echo "   ❌ JWT_SECRET - NÃO CONFIGURADO (será auto-gerado)"
else
  echo "   ✅ JWT_SECRET - Configurado"
fi

echo ""
echo "   📋 SECRETS OPCIONAIS (configure para funcionalidades extras):"

# Supabase
if [ -n "$REACT_APP_SUPABASE_URL" ] && [ -n "$REACT_APP_SUPABASE_ANON_KEY" ]; then
  echo "   ✅ Supabase - Configurado"
else
  echo "   ⚪ Supabase - Não configurado (formulários externos desativados)"
fi

# BigDataCorp
if [ -n "$TOKEN_ID" ] && [ -n "$CHAVE_TOKEN" ]; then
  echo "   ✅ BigDataCorp - Configurado"
else
  echo "   ⚪ BigDataCorp - Não configurado (consulta CPF desativada)"
fi

# Redis
if [ -n "$REDIS_URL" ]; then
  echo "   ✅ Redis - Configurado"
else
  echo "   ⚪ Redis - Não configurado (usando cache em memória)"
fi

# ============================================================================
# PASSO 5: RESUMO FINAL
# ============================================================================
progress "Passo 5/5: Setup concluído!"

echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║  ✅ SETUP CONCLUÍDO COM SUCESSO!                                  ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📝 PRÓXIMO PASSO:"
echo "   Clique no botão 'Run' ou execute: npm run dev"
echo ""
echo "🔑 CREDENCIAIS PADRÃO:"
echo "   Email: admin@example.com"
echo "   Senha: (gerada automaticamente - veja os logs do servidor)"
echo ""
echo "📚 DOCUMENTAÇÃO:"
echo "   - README.md: Visão geral do projeto"
echo "   - GUIA_EXPORT_OTIMIZADO.md: Como exportar economizando créditos"
echo "   - PRESERVACAO_COMPLETA_ESTADO.md: Configurações detalhadas"
echo ""
