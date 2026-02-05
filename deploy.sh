#!/bin/bash
echo "🚀 Iniciando Atualização..."
git pull
echo "📦 Instalando dependências..."
npm install
echo "🏗️ Construindo o projeto (Build)..."
npm run build
echo "🔄 Reiniciando plataforma no PM2..."
pm2 restart plataforma --update-env
echo "✅ Atualizado com sucesso!"
