@echo off
echo ========================================
echo REINICIANDO SERVIDOR COM CACHE LIMPO
echo ========================================
echo.

echo [1/4] Parando processos Node existentes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/4] Limpando cache do Vite...
if exist ".vite" rmdir /s /q ".vite"
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite"

echo [3/4] Limpando cache do navegador (instruções)...
echo.
echo IMPORTANTE: Após o servidor iniciar, pressione Ctrl+Shift+R no navegador
echo para forçar reload sem cache!
echo.

echo [4/4] Iniciando servidor...
npm run dev
