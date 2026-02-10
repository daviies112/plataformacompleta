#!/bin/bash

# ============================================================================
# SCRIPT DE LIMPEZA ANTES DE EXPORTAR PARA GITHUB
# ============================================================================
# Este script remove arquivos desnecessários para reduzir o tamanho do projeto
# de ~800MB para ~40MB, economizando 95% dos créditos na importação
#
# IMPORTANTE: Execute ANTES de fazer git push para GitHub
# ============================================================================

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  🧹 LIMPEZA PRÉ-EXPORTAÇÃO - ECONOMIZE 95% DE CRÉDITOS!       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Tamanho inicial
INITIAL_SIZE=$(du -sh . 2>/dev/null | cut -f1)
echo "📊 Tamanho inicial: $INITIAL_SIZE"
echo ""

# 1. Remover node_modules (maior economia)
if [ -d "node_modules" ]; then
  echo "🗑️  Removendo node_modules..."
  rm -rf node_modules
  echo "   ✅ node_modules removido (~700-900MB economizados)"
else
  echo "   ℹ️  node_modules não existe"
fi

# 2. Remover package-lock.json (será regenerado)
if [ -f "package-lock.json" ]; then
  echo "🗑️  Removendo package-lock.json..."
  rm -f package-lock.json
  echo "   ✅ package-lock.json removido"
fi

# 3. Remover dist/build (será regenerado no build)
if [ -d "dist" ]; then
  echo "🗑️  Removendo dist/..."
  rm -rf dist
  echo "   ✅ dist removido"
fi

# 4. Remover .vite cache
if [ -d ".vite" ]; then
  echo "🗑️  Removendo .vite cache..."
  rm -rf .vite
  echo "   ✅ .vite removido"
fi

# 5. Remover logs temporários
echo "🗑️  Removendo arquivos temporários..."
rm -rf /tmp/logs 2>/dev/null
rm -f *.log 2>/dev/null
rm -rf .cache 2>/dev/null
# NÃO remover a pasta data/ pois contém configurações essenciais
# rm -rf data/ 2>/dev/null 
echo "   ✅ Arquivos temporários removidos (Configurações em data/ preservadas)"

# 6. Remover backups .git antigos (se existirem)
if [ -d ".git.bak" ]; then
  rm -rf .git.bak
  echo "   ✅ .git.bak removido"
fi

# Tamanho final
FINAL_SIZE=$(du -sh . 2>/dev/null | cut -f1)

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ LIMPEZA CONCLUÍDA!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📊 Tamanho inicial: $INITIAL_SIZE"
echo "📊 Tamanho final:   $FINAL_SIZE"
echo ""
echo "📝 PRÓXIMOS PASSOS:"
echo "   1. git add ."
echo "   2. git commit -m 'Otimizado para export'"
echo "   3. git push origin main"
echo ""
echo "⚠️  IMPORTANTE: Após importar no novo Replit, execute:"
echo "   bash scripts/restaurar-apos-importar.sh"
echo ""
