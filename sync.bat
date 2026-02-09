@echo off
set VPS_IP=103.199.187.145
echo [1/2] Enviando arquivos para o Preview...
scp -r ./* root@%VPS_IP%:/var/www/plataforma-preview/
echo [2/2] Reiniciando serviço no VPS...
ssh root@%VPS_IP% "pm2 restart plataforma-preview"
echo.
echo ==========================================
echo PRONTO! Preview atualizado.
echo Acesse: http://%VPS_IP%:5001
echo ==========================================
pause
