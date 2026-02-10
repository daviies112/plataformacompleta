#!/bin/bash
echo "🚀 Configurando novo projeto após importação..."
echo ""

# Install dependencies
echo "📦 Instalando dependências..."
npm install --legacy-peer-deps 2>&1 | tail -5
echo "✓ Dependências instaladas"

echo ""
echo "🗄️  Configurando banco de dados..."
npm run db:push

echo ""
echo "✅ Projeto importado com sucesso!"
echo "💡 Próximo: npm run dev"
