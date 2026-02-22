#!/bin/bash

# Script para rodar migrations no Supabase
# Usa connection string do PostgreSQL do Supabase

echo "🚀 Rodando migrations das tabelas Store no Supabase..."
echo ""

# Extrair credenciais do .env
SUPABASE_URL=$(grep "SUPABASE_OWNER_URL=" /var/www/plataformacompleta/.env | cut -d '=' -f2)

# Construir connection string do Supabase
# Formato: postgres://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
PROJECT_REF=$(echo $SUPABASE_URL | sed 's/https:\/\///' | sed 's/.supabase.co//')

echo "📍 Supabase Project: $PROJECT_REF"
echo ""

# Para Supabase hospedado, a senha geralmente precisa ser configurada
# Vamos tentar via API REST do Supabase

SUPABASE_SERVICE_KEY=$(grep "SUPABASE_OWNER_SERVICE_KEY=" /var/www/plataformacompleta/.env | cut -d '=' -f2)

echo "📝 Verificando se tabelas já existem..."
echo ""

# Função para executar query no Supabase via REST API
function run_query() {
  local query=$1
  curl -s -X POST \
    "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"${query}\"}"
}

# Verificar tabelas
for table in store_banners store_benefits store_campaigns store_mosaics store_videos; do
  RESULT=$(curl -s -X HEAD \
    "${SUPABASE_URL}/rest/v1/${table}" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    -w "%{http_code}")

  if [[ $RESULT == "200" ]]; then
    echo "✅ $table: JÁ EXISTE"
  else
    echo "❌ $table: NÃO EXISTE"
  fi
done

echo ""
echo "⚠️  NOTA: Para executar migrations SQL completas no Supabase, use:"
echo "   1. Supabase Studio → SQL Editor → Execute o SQL manualmente"
echo "   2. Ou use: psql -h db.${PROJECT_REF}.supabase.co -U postgres -d postgres -f <arquivo.sql>"
echo ""
