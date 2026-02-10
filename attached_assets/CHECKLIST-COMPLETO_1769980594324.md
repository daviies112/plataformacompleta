# ✅ CHECKLIST COMPLETO - Implementação QR Code Evolution API

## 📋 PRÉ-REQUISITOS

### Você PRECISA ter:

- [ ] Evolution API instalada e rodando (Docker ou VPS)
- [ ] URL da Evolution API (ex: https://evolution.seudominio.com)
- [ ] API Key Global da Evolution API
- [ ] Servidor Node.js para backend (ou já ter um backend existente)
- [ ] URL pública HTTPS para receber webhooks (obrigatório)
- [ ] Conhecimento básico de Node.js e React

### Se não tiver Evolution API instalada:

```bash
# Opção 1: Docker (mais fácil)
git clone https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api
docker-compose up -d

# Opção 2: Manual
# Siga: https://doc.evolution-api.com/v2/en/install/docker
```

---

## 🔧 PASSO 1: Configurar Evolution API

### 1.1 Verificar se Evolution está rodando

```bash
# Teste se está acessível
curl http://localhost:8080

# Ou no navegador
http://localhost:8080
```

### 1.2 Obter/Criar API Key Global

A API Key está no arquivo `.env` da Evolution API:

```bash
# Entre no container (se usando Docker)
docker exec -it evolution_api bash

# Ou veja o .env
cat .env | grep AUTHENTICATION_API_KEY
```

Exemplo de `.env` da Evolution API:
```env
AUTHENTICATION_API_KEY=sua-api-key-global-super-secreta
SERVER_URL=https://evolution.seudominio.com
```

### 1.3 Testar API Key

```bash
curl -X GET http://localhost:8080/instance/fetchInstances \
  -H "apikey: SUA_API_KEY_AQUI"
```

Se retornar JSON com lista vazia `[]` = **funcionou!**

---

## 🌐 PASSO 2: Configurar Webhook (CRÍTICO!)

### 2.1 Entender o problema

**IMPORTANTE:** Webhooks precisam de URL PÚBLICA acessível pela Evolution API.

❌ **NÃO FUNCIONA:**
- `http://localhost:3000`
- `http://192.168.1.10:3000`
- URLs privadas/internas

✅ **FUNCIONA:**
- `https://suaplataforma.com/api/webhook/evolution`
- URLs públicas com HTTPS

### 2.2 Opções para desenvolvimento local

#### Opção A: ngrok (Recomendado para testes)

```bash
# 1. Instalar ngrok
# https://ngrok.com/download

# 2. Executar
ngrok http 3000

# 3. Copiar URL HTTPS
# Exemplo: https://abc123.ngrok.io
```

#### Opção B: LocalTunnel

```bash
npm install -g localtunnel
lt --port 3000
```

#### Opção C: Serveo

```bash
ssh -R 80:localhost:3000 serveo.net
```

### 2.3 Para produção

Você PRECISA de:
- Domínio próprio (ex: suaplataforma.com)
- Certificado SSL (Let's Encrypt grátis)
- Servidor acessível publicamente

---

## 💻 PASSO 3: Backend

### 3.1 Criar projeto Node.js

```bash
mkdir evolution-backend
cd evolution-backend
npm init -y
```

### 3.2 Instalar dependências

```bash
npm install express cors axios dotenv
npm install --save-dev nodemon
```

### 3.3 Criar arquivo .env

Crie arquivo `.env` na raiz do projeto:

```env
# Evolution API
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=sua-api-key-aqui

# Seu servidor (URL pública)
WEBHOOK_BASE_URL=https://abc123.ngrok.io

# Porta do servidor
PORT=3000
```

### 3.4 Copiar backend-server.js

Copie o arquivo `backend-server.js` que forneci para a raiz do projeto.

### 3.5 Adicionar script no package.json

```json
{
  "scripts": {
    "start": "node backend-server.js",
    "dev": "nodemon backend-server.js"
  }
}
```

### 3.6 Testar backend

```bash
# Terminal 1: Iniciar backend
npm run dev

# Terminal 2: Testar health
curl http://localhost:3000/health

# Deve retornar:
# {"status":"ok","timestamp":"...","activeInstances":0,"qrCodesStored":0}
```

---

## 🎨 PASSO 4: Frontend React

### 4.1 Estrutura de pastas

```
seu-projeto-react/
├── src/
│   ├── components/
│   │   ├── QRCodeDisplay.jsx      ← Copiar aqui
│   │   └── QRCodeDisplay.css      ← Copiar aqui
│   ├── App.js
│   └── index.js
├── .env.local                      ← Criar aqui
└── package.json
```

### 4.2 Criar .env.local

```env
REACT_APP_API_URL=http://localhost:3000
```

### 4.3 Integrar no seu App

```jsx
// App.js
import React, { useState } from 'react';
import QRCodeDisplay from './components/QRCodeDisplay';
import './components/QRCodeDisplay.css';

function App() {
  const [instanceName] = useState('cliente-' + Date.now());

  return (
    <div className="App">
      <h1>Conectar WhatsApp</h1>
      <QRCodeDisplay instanceName={instanceName} />
    </div>
  );
}

export default App;
```

### 4.4 Iniciar React

```bash
npm start
```

---

## 🧪 PASSO 5: Testar Tudo

### 5.1 Testar criação de instância

```bash
curl -X POST http://localhost:3000/api/instance/create \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "teste123",
    "clientName": "Cliente Teste"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Instância criada com sucesso",
  "instance": "teste123",
  "webhookUrl": "https://abc123.ngrok.io/api/webhook/evolution"
}
```

### 5.2 Verificar logs do backend

No terminal do backend, você deve ver:
```
🔧 Criando instância: teste123
✅ Instância criada: teste123
✅ Webhook configurado para: teste123
📍 Webhook URL: https://abc123.ngrok.io/api/webhook/evolution
```

### 5.3 Aguardar QR Code

Em poucos segundos, você deve ver no backend:
```
📥 Webhook recebido
Event: qrcode.updated
Instance: teste123
📱 QR Code atualizado!
✅ QR Code armazenado para instância: teste123
```

### 5.4 Buscar QR Code

```bash
curl http://localhost:3000/api/qrcode/teste123
```

**Resposta esperada:**
```json
{
  "success": true,
  "status": "ready",
  "data": {
    "qrCode": "data:image/png;base64,iVBORw0KG...",
    "instance": "teste123",
    "timestamp": "2026-02-01T...",
    "expiresAt": "2026-02-01T...",
    "timeRemaining": 58
  }
}
```

### 5.5 Testar no navegador

1. Abra: `http://localhost:3000` (React)
2. Você deve ver o QR Code
3. Timer de 60 segundos
4. Escaneie com WhatsApp

---

## 🚨 TROUBLESHOOTING

### Problema 1: Backend não inicia

**Erro:** `Cannot find module 'express'`

**Solução:**
```bash
npm install
```

### Problema 2: QR Code não aparece

**Verificar:**

1. Backend está rodando?
```bash
curl http://localhost:3000/health
```

2. Evolution API está acessível?
```bash
curl http://localhost:8080
```

3. Webhook está funcionando?
```bash
# Ver logs do backend
# Deve aparecer "Webhook recebido"
```

4. URL do webhook está correta?
```bash
# No .env do backend
WEBHOOK_BASE_URL=https://SUA-URL-PUBLICA
```

### Problema 3: Webhook não recebe eventos

**Causas comuns:**

1. **URL não é pública:**
   - Use ngrok, localtunnel, ou serveo
   - Teste se a URL está acessível de fora:
     ```bash
     curl https://abc123.ngrok.io/health
     ```

2. **Evolution API não consegue acessar:**
   - Evolution e seu backend na mesma rede?
   - Firewall bloqueando?
   - HTTPS configurado?

3. **Webhook não configurado:**
   ```bash
   # Verificar webhook da instância
   curl http://localhost:8080/webhook/find/teste123 \
     -H "apikey: SUA_API_KEY"
   ```

### Problema 4: CORS Error no frontend

**Erro no console:** `Access-Control-Allow-Origin`

**Solução:** Já está no código! Mas verifique:

```javascript
// backend-server.js
app.use(cors()); // ← Deve estar presente
```

### Problema 5: QR Code expira muito rápido

**Normal!** QR Codes do WhatsApp expiram em 60 segundos.

**Solução:** Implementado no código!
- Auto-refresh
- Timer visual
- Botão para gerar novo

---

## 📊 VERIFICAÇÕES FINAIS

### Backend está funcionando?

- [ ] Servidor inicia sem erros
- [ ] `/health` retorna status ok
- [ ] Consegue criar instância
- [ ] Recebe webhooks
- [ ] Armazena QR Codes

### Frontend está funcionando?

- [ ] Componente renderiza
- [ ] Faz polling no backend
- [ ] Exibe QR Code
- [ ] Timer funciona
- [ ] Estados visuais funcionam

### Integração está funcionando?

- [ ] Evolution API acessível
- [ ] API Key válida
- [ ] Webhook configurado
- [ ] URL pública funciona
- [ ] QR Code chega do webhook

---

## 🎯 FLUXO COMPLETO DE TESTE

```bash
# 1. Iniciar Evolution API (se local)
docker-compose up -d

# 2. Expor porta local (desenvolvimento)
ngrok http 3000
# Copiar URL: https://abc123.ngrok.io

# 3. Atualizar .env
WEBHOOK_BASE_URL=https://abc123.ngrok.io

# 4. Iniciar backend
npm run dev

# 5. Em outro terminal, iniciar React
cd seu-projeto-react
npm start

# 6. Abrir navegador
http://localhost:3000

# 7. Criar instância via API (ou deixar o componente fazer)
curl -X POST http://localhost:3000/api/instance/create \
  -H "Content-Type: application/json" \
  -d '{"instanceName": "teste123"}'

# 8. Observar logs do backend
# Deve aparecer: "QR Code atualizado"

# 9. Ver QR Code no navegador
# Deve aparecer em poucos segundos

# 10. Escanear com WhatsApp
# Abrir WhatsApp > Configurações > Aparelhos conectados > Conectar

# 11. Verificar conexão
# Interface deve mostrar "WhatsApp Conectado!"
```

---

## ⚠️ IMPORTANTES AVISOS

### Para Desenvolvimento

✅ **Pode usar:**
- HTTP (localhost)
- ngrok/localtunnel
- API Key em .env

### Para Produção

🚨 **OBRIGATÓRIO:**
- HTTPS (certificado SSL)
- Domínio próprio
- Servidor seguro
- Rate limiting
- Autenticação JWT
- Logs profissionais
- Monitoramento
- Backup de instâncias

---

## 📚 O QUE FALTA?

### Não incluído (você precisa adicionar):

1. **Autenticação de usuários**
   - JWT tokens
   - Login/logout
   - Sessões

2. **Persistência de dados**
   - Redis para QR Codes
   - MongoDB/PostgreSQL para instâncias
   - Histórico de conversas

3. **Interface completa**
   - Dashboard
   - Lista de conversas
   - Envio de mensagens
   - Templates

4. **Funcionalidades avançadas**
   - Múltiplos atendentes
   - Chatbot integrado
   - Analytics
   - Relatórios

5. **Infraestrutura**
   - Docker compose completo
   - CI/CD
   - Testes automatizados
   - Documentação API

### Recursos fornecidos:

✅ **Backend básico** - Recebe webhooks e serve QR Code
✅ **Frontend básico** - Exibe QR Code e estados
✅ **Integração Evolution API** - Cria instâncias e configura webhooks
✅ **Documentação** - Guias e troubleshooting

---

## 🎓 PRÓXIMOS PASSOS

Depois de conseguir exibir o QR Code, você vai querer:

1. **Receber mensagens**
2. **Enviar mensagens**
3. **Listar conversas**
4. **Upload de mídias**
5. **Dashboard administrativo**

Para isso, você precisa:
- Continuar estudando a documentação da Evolution API
- Implementar mais endpoints
- Criar banco de dados
- Desenvolver interface completa

---

## 💬 AINDA TEM DÚVIDAS?

### Perguntas frequentes:

**P: Funciona em produção?**
R: Este código é base. Para produção, adicione segurança, logs, monitoramento.

**P: Preciso de Redis?**
R: Para poucos usuários, não. Para produção, sim.

**P: Funciona com múltiplos clientes?**
R: Sim, cada cliente tem sua própria instância (instanceName único).

**P: E se o servidor reiniciar?**
R: QR Codes em memória se perdem. Use Redis/MongoDB.

**P: Quanto custa hospedar?**
R: Evolution API: VPS ~$5-10/mês. Backend: ~$5/mês. Total: ~$10-15/mês.

---

## ✅ CHECKLIST FINAL

Antes de considerar "pronto":

- [ ] Evolution API instalada e funcionando
- [ ] Backend rodando e recebendo webhooks
- [ ] Frontend exibindo QR Code
- [ ] Consegue escanear e conectar
- [ ] Logs mostrando eventos
- [ ] Entendeu o fluxo completo
- [ ] Testou criar múltiplas instâncias
- [ ] Testou reconexão
- [ ] Leu toda a documentação
- [ ] Sabe onde buscar ajuda

---

**Criado em:** 01/02/2026
**Última atualização:** 01/02/2026
**Status:** Código de exemplo educacional
