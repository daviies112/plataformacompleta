@echo off
setlocal EnableDelayedExpansion

echo ========================================================
echo   INICIANDO SERVIDOR EM MODO WINDOWS NATIVO
echo   (Evitando WSL/Bash para corrigir erro de esbuild)
echo ========================================================
echo.

REM --- 1. CONFIGURAÇÃO DE AMBIENTE ---
echo [1/5] Configurando variaveis de ambiente...

if not defined JWT_SECRET (
    set "JWT_SECRET=dev-secret-windows-%RANDOM%-%TIME%"
    echo    - JWT_SECRET temporario gerado.
)

if not defined CLIENT_LOGIN_EMAIL set "CLIENT_LOGIN_EMAIL=admin@example.com"
if not defined CLIENT_USER_NAME set "CLIENT_USER_NAME=Admin User"
if not defined CLIENT_COMPANY_NAME set "CLIENT_COMPANY_NAME=My Company"
if not defined CLIENT_PLAN_TYPE set "CLIENT_PLAN_TYPE=pro"
if not defined SESSION_SECRET set "SESSION_SECRET=dev-session-%RANDOM%"
if not defined PORT set "PORT=5000"
set "NODE_ENV=development"

REM --- 2. VERIFICAÇÃO DE BANCO DE DADOS ---
echo.
echo [2/5] Verificando Migracoes de Banco de Dados...
if defined DATABASE_URL (
    echo    - DATABASE_URL encontrada. Rodando migracoes...
    call npm run db:push
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo    [AVISO] Falha ao conectar no banco ou rodar migracoes.
        echo    O servidor pode falhar se as tabelas nao existirem.
        echo    Verifique se o banco esta acessivel.
        echo.
    ) else (
        echo    - Migracoes concluidas ou banco atualizado.
    )
) else (
    echo    [AVISO] DATABASE_URL nao definida. Pulando migracoes.
)

REM --- 3. LIMPEZA DE CACHE ---
echo.
echo [3/5] Garantindo que o cache esteja limpo...
if exist ".vite" rmdir /s /q ".vite" 2>nul
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite" 2>nul

REM --- 4. INICIANDO SERVIDOR ---
echo.
echo [4/5] Iniciando servidor (TSX)...
echo    - Porta: %PORT%
echo    - Usuario: %CLIENT_LOGIN_EMAIL%
echo.
echo ========================================================
echo   SERVIDOR INICIANDO - AGUARDE...
echo ========================================================
echo.

REM Executa diretamente o node/tsx, ignorando o bash/sh
call npx -y tsx server/index.ts

endlocal
