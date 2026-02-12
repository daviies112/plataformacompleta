# ============================================================================
# SCRIPT DE INICIALIZACAO PARA WINDOWS (PowerShell)
# ============================================================================
# Este script substitui o start.sh para rodar nativamente no Windows
# sem depender de WSL/Bash, evitando conflitos de plataforma com esbuild

Write-Host "WARNING: JWT_SECRET auto-gerado para desenvolvimento" -ForegroundColor Yellow

# Verificar secrets faltando
$missingSecrets = @()

if (-not $env:SUPABASE_MASTER_URL) { $missingSecrets += "SUPABASE_MASTER_URL" }
if (-not $env:SUPABASE_MASTER_SERVICE_ROLE_KEY) { $missingSecrets += "SUPABASE_MASTER_SERVICE_ROLE_KEY" }
if (-not $env:TOKEN_ID) { $missingSecrets += "TOKEN_ID" }
if (-not $env:CHAVE_TOKEN) { $missingSecrets += "CHAVE_TOKEN" }

if ($missingSecrets.Count -gt 0) {
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Yellow
    Write-Host "  WARNING: SECRETS FALTANDO - FUNCIONALIDADES LIMITADAS" -ForegroundColor Yellow
    Write-Host "================================================================" -ForegroundColor Yellow
    Write-Host ""
    foreach ($secret in $missingSecrets) {
        Write-Host "  [X] $secret" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Configure na aba Secrets para habilitar consulta de CPF" -ForegroundColor Cyan
    Write-Host ""
}

# Warnings adicionais
if (-not $env:CLIENT_LOGIN_PASSWORD_HASH) {
    Write-Host "WARNING: No CLIENT_LOGIN_PASSWORD_HASH set in Replit Secrets" -ForegroundColor Yellow
    Write-Host "   The application will generate a secure password on first startup" -ForegroundColor Gray
    Write-Host "   Check the server logs for the generated credentials" -ForegroundColor Gray
}

if (-not $env:SESSION_SECRET) {
    Write-Host "WARNING: SESSION_SECRET not set, using auto-generated value" -ForegroundColor Yellow
}

# Resumo de configuracao
Write-Host ""
Write-Host "================================================================" -ForegroundColor Yellow
Write-Host "  WARNING: ALGUMAS CREDENCIAIS ESTAO FALTANDO" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Seguranca & Autenticacao:" -ForegroundColor Cyan
if ($env:JWT_SECRET) {
    Write-Host "   [OK] JWT_SECRET: Configurado" -ForegroundColor Green
} else {
    Write-Host "   [X] JWT_SECRET: NAO CONFIGURADO" -ForegroundColor Red
}

Write-Host ""
Write-Host "Consulta de CPF (BigDataCorp):" -ForegroundColor Cyan
if ($env:TOKEN_ID) {
    Write-Host "   [OK] TOKEN_ID: Configurado" -ForegroundColor Green
} else {
    Write-Host "   [X] TOKEN_ID: NAO CONFIGURADO" -ForegroundColor Red
}
if ($env:CHAVE_TOKEN) {
    Write-Host "   [OK] CHAVE_TOKEN: Configurado" -ForegroundColor Green
} else {
    Write-Host "   [X] CHAVE_TOKEN: NAO CONFIGURADO" -ForegroundColor Red
}

Write-Host ""
Write-Host "Supabase Master (Cache de Consultas):" -ForegroundColor Cyan
if ($env:SUPABASE_MASTER_URL) {
    Write-Host "   [OK] SUPABASE_MASTER_URL: Configurado" -ForegroundColor Green
} else {
    Write-Host "   [X] SUPABASE_MASTER_URL: NAO CONFIGURADO" -ForegroundColor Red
}
if ($env:SUPABASE_MASTER_SERVICE_ROLE_KEY) {
    Write-Host "   [OK] SUPABASE_MASTER_SERVICE_ROLE_KEY: Configurado" -ForegroundColor Green
} else {
    Write-Host "   [X] SUPABASE_MASTER_SERVICE_ROLE_KEY: NAO CONFIGURADO" -ForegroundColor Red
}

Write-Host ""
Write-Host "Opcional - Redis nao configurado (usando cache em memoria)" -ForegroundColor Gray
Write-Host ""

# Iniciar servidor
Write-Host "Iniciando servidor integrado (Express + Vite) na porta 5000..." -ForegroundColor Green
Write-Host ""

if (-not $env:DATABASE_URL) {
    Write-Host "WARNING: DATABASE_URL nao configurado - use o painel Database do Replit" -ForegroundColor Yellow
    Write-Host ""
}

# Configurar variaveis de ambiente
$env:PORT = "5000"
$env:NODE_ENV = "development"

# Usuario configurado
$clientEmail = if ($env:CLIENT_LOGIN_EMAIL) { $env:CLIENT_LOGIN_EMAIL } else { "admin@example.com" }
Write-Host "User configured: $clientEmail" -ForegroundColor Cyan
Write-Host ""

# Iniciar o servidor com tsx (TypeScript executor)
# Usando npx para garantir que o tsx seja encontrado
if (Get-Command "npx" -ErrorAction SilentlyContinue) {
    Write-Host "Starting with npx..."
    npx -y tsx server/index.ts
} else {
    Write-Host "npx not found, trying node_modules directly..."
    if (Test-Path "node_modules/.bin/tsx.cmd") {
        & "node_modules/.bin/tsx.cmd" server/index.ts
    } else {
        Write-Error "Could not find npx or tsx. Please install dependencies with 'npm install'."
    }
}
