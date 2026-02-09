#!/bin/bash
echo "🧹 Limpando projeto para exportação..."
echo ""

# Remove node_modules
if [ -d "node_modules" ]; then
  echo "Removendo node_modules (1.1GB)..."
  rm -rf node_modules
  echo "✓ node_modules removido"
else
  echo "✓ node_modules já não existe"
fi

# Remove dist/build
if [ -d "dist" ]; then
  rm -rf dist
  echo "✓ dist removido"
fi

# Remove logs
find . -name "*.log" -type f -delete 2>/dev/null
echo "✓ Logs removidos"

# Remove cache
rm -rf .next 2>/dev/null
rm -rf .turbo 2>/dev/null
rm -rf .cache 2>/dev/null || true
echo "✓ Cache removido"

echo ""
echo "📊 Tamanho final do projeto:"
du -sh . | awk '{print "   " $0}'

echo ""
echo "✅ Projeto limpo e pronto para export!"
echo "💡 Agora faça: git add . && git commit -m 'Otimizado para export'"
