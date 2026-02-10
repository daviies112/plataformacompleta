# 🔧 TROUBLESHOOTING - Guia de Solução de Problemas

## 🎯 Diagnóstico Rápido

### Use este diagrama para identificar o problema:

```
┌─────────────────────────────────────────────┐
│ Backend não inicia?                         │
├─────────────────────────────────────────────┤
│ ├─ Porta 3000 já em uso                     │
│ │  └─ Solução: Mude PORT no .env            │
│ ├─ Dependências faltando                    │
│ │  └─ Solução: npm install                  │
│ └─ .env não configurado                     │
│    └─ Solução: Crie .env com as variáveis   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Backend inicia mas webhook não funciona?    │
├─────────────────────────────────────────────┤
│ ├─ URL não é pública                        │
│ │  └─ Solução: Use ngrok                    │
│ ├─ Evolution não alcança URL                │
│ │  └─ Solução: Verifique firewall           │
│ └─ Webhook não configurado                  │
│    └─ Solução: Verificar POST webhook/set   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ QR Code não aparece no frontend?            │
├─────────────────────────────────────────────┤
│ ├─ Backend não está rodando                 │
│ │  └─ Solução: npm run dev                  │
│ ├─ URL do backend errada                    │
│ │  └─ Solução: Verificar REACT_APP_API_URL  │
│ ├─ CORS bloqueando                          │
│ │  └─ Solução: Verificar app.use(cors())    │
│ └─ Instância não criada                     │
│    └─ Solução: Criar via POST /instance     │
└─────────────────────────────────────────────┘
```

---

## 🔍 PROBLEMA 1: Backend não inicia

### Sintomas:
```bash
$ npm run dev
Error: Cannot find module 'express'
```

### Solução:
```bash
# 1. Verificar se está no diretório correto
pwd

# 2. Instalar dependências
npm install

# 3. Verificar se node_modules foi criado
ls -la | grep node_modules

# 4. Tentar novamente
npm run dev
```

### Ainda não funciona?

```bash
# Limpar cache do npm
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Verificar versão do Node (deve ser >= 16)
node --version
```

---

## 🔍 PROBLEMA 2: Porta 3000 já está em uso

### Sintomas:
```bash
Error: listen EADDRINUSE: address already in use :::3000
```

### Solução A: Usar outra porta

```bash
# Editar .env
PORT=3001

# Ou diretamente
PORT=3001 npm run dev
```

### Solução B: Matar processo na porta 3000

```bash
# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## 🔍 PROBLEMA 3: Evolution API não está acessível

### Sintomas:
```bash
curl http://localhost:8080
curl: (7) Failed to connect to localhost port 8080
```

### Diagnóstico:
```bash
# 1. Verificar se Evolution está rodando (Docker)
docker ps | grep evolution

# 2. Verificar logs
docker logs evolution_api

# 3. Verificar porta exposta
docker port evolution_api
```

### Soluções:

#### Se não está rodando:
```bash
# Iniciar Evolution API
docker-compose up -d

# Verificar se subiu
docker ps
```

#### Se porta está diferente:
```bash
# Descobrir porta correta
docker port evolution_api

# Atualizar .env
EVOLUTION_API_URL=http://localhost:PORTA_CORRETA
```

#### Se não tem Docker instalado:
```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Ou seguir: https://docs.docker.com/get-docker/
```

---

## 🔍 PROBLEMA 4: API Key inválida

### Sintomas:
```json
{
  "error": "Unauthorized",
  "message": "Invalid API key"
}
```

### Solução:

```bash
# 1. Encontrar API Key da Evolution
docker exec -it evolution_api cat .env | grep AUTHENTICATION_API_KEY

# 2. Copiar a key
AUTHENTICATION_API_KEY=B6D711FCDE4D4FD5936544120E713976

# 3. Atualizar seu .env
EVOLUTION_API_KEY=B6D711FCDE4D4FD5936544120E713976

# 4. Reiniciar backend
# Ctrl+C e depois
npm run dev
```

### Testar API Key:
```bash
curl http://localhost:8080/instance/fetchInstances \
  -H "apikey: SUA_API_KEY"
```

---

## 🔍 PROBLEMA 5: Webhook não recebe eventos

### Sintomas:
- Backend criou instância
- Mas nunca aparece log "Webhook recebido"
- QR Code nunca aparece

### Diagnóstico completo:

```bash
# 1. Verificar se backend está rodando
curl http://localhost:3000/health

# 2. Verificar se URL do webhook está correta
echo $WEBHOOK_BASE_URL

# 3. Testar se URL é acessível de FORA
curl https://abc123.ngrok.io/health
```

### Problema: URL não é pública

#### Sintomas:
```bash
WEBHOOK_BASE_URL=http://localhost:3000
```

#### Solução:

```bash
# 1. Instalar ngrok
# https://ngrok.com/download

# 2. Executar
ngrok http 3000

# 3. Copiar URL HTTPS
# Exemplo: https://abc123.ngrok.io

# 4. Atualizar .env
WEBHOOK_BASE_URL=https://abc123.ngrok.io

# 5. Reiniciar backend
```

### Problema: Evolution não consegue acessar webhook

#### Verificar conectividade:

```bash
# Da máquina da Evolution, testar:
curl https://sua-url-webhook.com/health

# Se falhar:
# - Firewall bloqueando?
# - HTTPS configurado?
# - DNS resolvendo?
```

---

## 🔍 PROBLEMA 6: QR Code não aparece no frontend

### Sintomas:
- Frontend carrega
- Mostra "Aguardando QR Code..."
- Nunca aparece o QR Code

### Checklist:

```bash
# 1. Backend está rodando?
curl http://localhost:3000/health
# ✅ Deve retornar JSON

# 2. Instância foi criada?
curl http://localhost:3000/api/instances
# ✅ Deve listar sua instância

# 3. QR Code foi recebido?
curl http://localhost:3000/api/qrcode/SUA_INSTANCIA
# ✅ Deve retornar base64

# 4. Frontend está configurado?
cat .env.local | grep REACT_APP_API_URL
# ✅ Deve apontar para seu backend
```

### Problema: CORS Error

#### Sintomas no console:
```
Access to fetch at 'http://localhost:3000' from origin 'http://localhost:3001' 
has been blocked by CORS policy
```

#### Solução:

```javascript
// backend-server.js
// Verificar se tem esta linha:
app.use(cors());

// Se precisar de configuração específica:
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
```

---

## 🔍 PROBLEMA 7: QR Code expira muito rápido

### Sintomas:
- QR Code aparece
- Depois de poucos segundos desaparece
- Mensagem "QR Code expirado"

### Isso é NORMAL! 

QR Codes do WhatsApp expiram em **60 segundos** por segurança.

### Soluções implementadas no código:

1. **Timer visual** - Mostra tempo restante
2. **Auto-refresh** - Polling a cada 3 segundos
3. **Botão refresh** - Gerar novo QR Code manualmente

### Se quiser aumentar intervalo de verificação:

```javascript
// QRCodeDisplay.jsx
const POLLING_INTERVAL = 5000; // 5 segundos ao invés de 3
```

---

## 🔍 PROBLEMA 8: Frontend não compila

### Sintomas:
```bash
Module not found: Can't resolve './components/QRCodeDisplay'
```

### Solução:

```bash
# 1. Verificar estrutura de pastas
ls -la src/components/

# Deve ter:
# - QRCodeDisplay.jsx
# - QRCodeDisplay.css

# 2. Verificar import no App.js
# Deve ser:
import QRCodeDisplay from './components/QRCodeDisplay';
import './components/QRCodeDisplay.css';
```

### Sintomas:
```bash
Unexpected token '<'
```

### Solução:
```bash
# Arquivo .jsx com sintaxe errada
# Copie novamente o arquivo fornecido
```

---

## 🔍 PROBLEMA 9: Múltiplas instâncias conflitando

### Sintomas:
- Cria instância "teste-123"
- QR Code aparece de outra instância
- Conexões cruzadas

### Causa:
Nome de instância duplicado

### Solução:

```javascript
// Use timestamp para garantir unicidade
const instanceName = `cliente-${Date.now()}`;

// Ou UUID
import { v4 as uuidv4 } from 'uuid';
const instanceName = `cliente-${uuidv4()}`;
```

---

## 🔍 PROBLEMA 10: Logs não aparecem

### Sintomas:
- Backend rodando
- Mas não aparece nenhum log
- Difícil debugar

### Solução:

```javascript
// backend-server.js
// Adicionar mais logs:

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 Servidor iniciado!');
console.log(`📍 Porta: ${PORT}`);
console.log(`🔗 Evolution: ${EVOLUTION_API_URL}`);
console.log(`📡 Webhook: ${WEBHOOK_BASE_URL}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Adicionar logs em cada endpoint:
app.post('/api/instance/create', async (req, res) => {
  console.log('📝 Requisição recebida em /api/instance/create');
  console.log('Body:', req.body);
  // ...
});
```

---

## 🛠️ FERRAMENTAS DE DEBUG

### 1. Ver logs do Evolution API

```bash
# Docker
docker logs -f evolution_api

# Filtrar apenas QR Code
docker logs evolution_api 2>&1 | grep -i "qrcode"

# Filtrar webhooks
docker logs evolution_api 2>&1 | grep -i "webhook"
```

### 2. Testar webhook manualmente

```bash
# Simular webhook da Evolution
curl -X POST http://localhost:3000/api/webhook/evolution \
  -H "Content-Type: application/json" \
  -d '{
    "event": "qrcode.updated",
    "instance": "teste",
    "data": {
      "qrcode": {
        "code": "2@test",
        "base64": "data:image/png;base64,iVBORw0KG..."
      }
    }
  }'
```

### 3. Verificar payloads dos webhooks

```bash
# Usar RequestBin ou similar
# 1. Ir em https://requestbin.com
# 2. Criar novo bin
# 3. Usar URL como webhook temporário
# 4. Ver payloads que chegam
```

### 4. Debug do Node.js

```bash
# Iniciar com debug
node --inspect backend-server.js

# Abrir Chrome DevTools
chrome://inspect
```

### 5. Monitor de requests no frontend

```javascript
// QRCodeDisplay.jsx
const fetchQRCode = useCallback(async () => {
  console.log('🔍 Buscando QR Code para:', instanceName);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/qrcode/${instanceName}`);
    const data = await response.json();
    
    console.log('📥 Resposta:', data);
    // ...
  } catch (err) {
    console.error('❌ Erro:', err);
  }
}, [instanceName]);
```

---

## 📊 CHECKLIST DE VERIFICAÇÃO

### Antes de pedir ajuda, verifique:

- [ ] Evolution API está rodando e acessível
- [ ] API Key está correta
- [ ] Backend inicia sem erros
- [ ] Porta não está em uso
- [ ] .env está configurado corretamente
- [ ] Webhook URL é pública (ngrok/etc)
- [ ] CORS está habilitado
- [ ] Dependências instaladas (npm install)
- [ ] Versão do Node >= 16
- [ ] Logs aparecem no terminal
- [ ] Frontend compila sem erros
- [ ] Console do navegador sem erros

---

## 🆘 COMANDOS DE EMERGÊNCIA

### Reset completo do backend:

```bash
# Parar tudo
pkill -f "node backend-server.js"

# Limpar
rm -rf node_modules package-lock.json

# Reinstalar
npm install

# Reiniciar
npm run dev
```

### Reset completo do frontend:

```bash
# Limpar cache
rm -rf node_modules package-lock.json

# Reinstalar
npm install

# Reiniciar
npm start
```

### Reset Evolution API:

```bash
# Parar
docker-compose down

# Limpar volumes (CUIDADO: apaga dados)
docker-compose down -v

# Recriar
docker-compose up -d
```

---

## 📞 ONDE BUSCAR AJUDA

### Documentação oficial:
- Evolution API: https://doc.evolution-api.com/
- GitHub Issues: https://github.com/EvolutionAPI/evolution-api/issues

### Comunidade:
- Discord da Evolution API
- Stack Overflow (tag: evolution-api)
- Telegram/WhatsApp grupos de desenvolvedores

### Informações para incluir ao pedir ajuda:

1. **Sistema operacional** (Windows/Linux/Mac)
2. **Versão do Node.js** (`node --version`)
3. **Logs completos** do erro
4. **Código relevante** (sem API keys!)
5. **O que já tentou**

---

## ✅ TESTES FINAIS

Depois de resolver problemas, execute:

```bash
# 1. Health check
curl http://localhost:3000/health

# 2. Criar instância
curl -X POST http://localhost:3000/api/instance/create \
  -H "Content-Type: application/json" \
  -d '{"instanceName": "teste-final"}'

# 3. Aguardar 5 segundos
sleep 5

# 4. Buscar QR Code
curl http://localhost:3000/api/qrcode/teste-final

# 5. Se vir base64 = SUCESSO! 🎉
```

---

**Lembre-se:** A maioria dos problemas é por:
1. Webhook não público (use ngrok!)
2. API Key incorreta
3. Evolution API não rodando
4. CORS não configurado

Resolva estes 4 e 90% dos problemas desaparecem! 💪
