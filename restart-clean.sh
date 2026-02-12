#!/bin/bash
echo "========================================="
echo "PARANDO SERVIDOR E REINICIANDO LIMPO"
echo "========================================="
echo ""

# Parar todos os processos Node
echo "[1/5] Parando processos Node..."
taskkill //F //IM node.exe 2>/dev/null || true
sleep 2

# Limpar cache do Vite
echo "[2/5] Limpando cache do Vite..."
rm -rf .vite 2>/dev/null || true
rm -rf node_modules/.vite 2>/dev/null || true

# Limpar cache do navegador (instruções)
echo "[3/5] IMPORTANTE: Após o servidor iniciar..."
echo "         Pressione Ctrl+Shift+Delete no navegador"
echo "         Limpe 'Imagens e arquivos em cache'"
echo "         OU simplesmente Ctrl+Shift+R na página"
echo ""

echo "[4/5] Aguardando 3 segundos..."
sleep 3

echo "[5/5] Iniciando servidor..."
npm run dev
