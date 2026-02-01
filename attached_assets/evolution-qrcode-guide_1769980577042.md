# Guia Completo: Exibindo QR Code da Evolution API

## 📋 Sumário
1. [Entendendo o Fluxo](#entendendo-o-fluxo)
2. [Configuração de Webhook](#configuração-de-webhook)
3. [Código Backend (Node.js/Express)](#código-backend)
4. [Código Frontend (React)](#código-frontend)
5. [Alternativa: Polling HTTP](#alternativa-polling-http)
6. [Troubleshooting](#troubleshooting)

---

## 🔄 Entendendo o Fluxo

A Evolution API fornece o QR Code através de **2 métodos principais**:

### Método 1: Webhook (RECOMENDADO)
- Configurar webhook para receber evento `QRCODE_UPDATED`
- QR Code vem em **base64** automaticamente
- Mais eficiente e em tempo real

### Método 2: Endpoint HTTP
- Fazer requisição GET para `/instance/connect/{instanceName}`
- Polling manual para verificar atualizações
- Menos eficiente, mas mais simples

---

## ⚙️ Configuração de Webhook

### Passo 1: Configurar Webhook na Instância

**Endpoint:** `POST {baseUrl}/webhook/set/{instanceName}`

```json
{
  "url": "https://sua-plataforma.com/api/webhook/evolution",
  "webhook_by_events": true,
  "webhook_base64": true,
  "events": [
    "QRCODE_UPDATED",
    "CONNECTION_UPDATE",
    "MESSAGES_UPSERT"
  ]
}
```

**Headers:**
```
Content-Type: application/json
apikey: SUA_API_KEY_EVOLUTION
```

### Passo 2: Estrutura do Payload QRCODE_UPDATED

Quando um QR Code é gerado/atualizado, você receberá:

```json
{
  "event": "qrcode.updated",
  "instance": "nome-da-instancia",
  "data": {
    "qrcode": {
      "pairingCode": null,
      "code": "2@xxxxxxxxxxxxxxxxxxx",
      "base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAYAAAB5fY51..."
    }
  },
  "server_url": "https://evolution-api.com",
  "apikey": "sua-api-key"
}
```

---

## 💻 Código Backend

### Node.js/Express - Recebendo Webhook

```javascript
// server.js
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Store QR codes temporariamente (em produção use Redis ou DB)
const qrCodeStore = new Map();

// Endpoint para receber webhook da Evolution API
app.post('/api/webhook/evolution', (req, res) => {
  const { event, instance, data } = req.body;
  
  console.log(`Webhook recebido: ${event} para instância: ${instance}`);
  
  if (event === 'qrcode.updated') {
    const qrCodeData = {
      base64: data.qrcode.base64,
      code: data.qrcode.code,
      timestamp: new Date().toISOString(),
      instance: instance
    };
    
    // Armazena o QR Code
    qrCodeStore.set(instance, qrCodeData);
    
    // Emitir via WebSocket para clientes conectados (opcional)
    // io.to(instance).emit('qrcode-updated', qrCodeData);
    
    console.log(`QR Code atualizado para ${instance}`);
  }
  
  if (event === 'connection.update') {
    console.log(`Status de conexão: ${data.state}`);
    
    // Limpar QR Code quando conectado
    if (data.state === 'open') {
      qrCodeStore.delete(instance);
      // io.to(instance).emit('connection-success');
    }
  }
  
  res.status(200).json({ success: true });
});

// Endpoint para cliente buscar QR Code
app.get('/api/qrcode/:instanceName', (req, res) => {
  const { instanceName } = req.params;
  const qrData = qrCodeStore.get(instanceName);
  
  if (!qrData) {
    return res.status(404).json({ 
      error: 'QR Code não encontrado',
      message: 'Aguardando geração do QR Code...' 
    });
  }
  
  res.json(qrData);
});

// Criar instância na Evolution API
app.post('/api/instance/create', async (req, res) => {
  const { instanceName, webhookUrl } = req.body;
  
  try {
    const response = await fetch(`${process.env.EVOLUTION_API_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        instanceName: instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      })
    });
    
    const data = await response.json();
    
    // Configurar webhook
    await fetch(`${process.env.EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        url: webhookUrl,
        webhook_by_events: true,
        webhook_base64: true,
        events: ['QRCODE_UPDATED', 'CONNECTION_UPDATE', 'MESSAGES_UPSERT']
      })
    });
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
```

### Variáveis de Ambiente (.env)

```env
EVOLUTION_API_URL=https://sua-evolution-api.com
EVOLUTION_API_KEY=sua-api-key-global
WEBHOOK_URL=https://sua-plataforma.com/api/webhook/evolution
PORT=3000
```

---

## 🎨 Código Frontend

### React - Componente de QR Code

```jsx
// QRCodeDisplay.jsx
import React, { useState, useEffect } from 'react';

const QRCodeDisplay = ({ instanceName }) => {
  const [qrCode, setQrCode] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    let polling = null;
    
    // Função para buscar QR Code
    const fetchQRCode = async () => {
      try {
        const response = await fetch(`/api/qrcode/${instanceName}`);
        const data = await response.json();
        
        if (response.ok) {
          setQrCode(data.base64);
          setStatus('ready');
        } else {
          setStatus('waiting');
        }
      } catch (err) {
        setError(err.message);
        setStatus('error');
      }
    };
    
    // Polling a cada 3 segundos
    fetchQRCode();
    polling = setInterval(fetchQRCode, 3000);
    
    // Cleanup
    return () => {
      if (polling) clearInterval(polling);
    };
  }, [instanceName]);

  // Renderização condicional
  if (status === 'loading') {
    return (
      <div className="qr-loading">
        <div className="spinner"></div>
        <p>Gerando QR Code...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="qr-error">
        <p>❌ Erro: {error}</p>
      </div>
    );
  }

  if (status === 'waiting') {
    return (
      <div className="qr-waiting">
        <p>⏳ Aguardando QR Code...</p>
      </div>
    );
  }

  return (
    <div className="qr-container">
      <div className="qr-header">
        <h3>📱 Conecte seu WhatsApp</h3>
        <p>Escaneie o QR Code com seu WhatsApp</p>
      </div>
      
      <div className="qr-image">
        {qrCode && (
          <img 
            src={qrCode} 
            alt="QR Code WhatsApp" 
            style={{ maxWidth: '400px', height: 'auto' }}
          />
        )}
      </div>
      
      <div className="qr-instructions">
        <ol>
          <li>Abra o WhatsApp no seu celular</li>
          <li>Toque em Configurações → Aparelhos conectados</li>
          <li>Toque em "Conectar um aparelho"</li>
          <li>Aponte a câmera para este QR Code</li>
        </ol>
      </div>
    </div>
  );
};

export default QRCodeDisplay;
```

### CSS para o Componente

```css
/* QRCodeDisplay.css */
.qr-container {
  max-width: 500px;
  margin: 2rem auto;
  padding: 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.qr-header {
  text-align: center;
  margin-bottom: 2rem;
}

.qr-header h3 {
  font-size: 1.5rem;
  color: #128C7E;
  margin-bottom: 0.5rem;
}

.qr-header p {
  color: #666;
}

.qr-image {
  display: flex;
  justify-content: center;
  margin: 2rem 0;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 8px;
}

.qr-image img {
  border: 3px solid #128C7E;
  border-radius: 8px;
}

.qr-instructions {
  background: #E8F5E9;
  padding: 1.5rem;
  border-radius: 8px;
  border-left: 4px solid #128C7E;
}

.qr-instructions ol {
  margin: 0;
  padding-left: 1.5rem;
}

.qr-instructions li {
  margin: 0.5rem 0;
  color: #333;
}

.qr-loading, .qr-waiting, .qr-error {
  text-align: center;
  padding: 3rem;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #128C7E;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

### Uso do Componente

```jsx
// App.jsx
import React from 'react';
import QRCodeDisplay from './QRCodeDisplay';
import './QRCodeDisplay.css';

function App() {
  return (
    <div className="App">
      <QRCodeDisplay instanceName="minha-instancia" />
    </div>
  );
}

export default App;
```

---

## 🔄 Alternativa: Polling HTTP

Se você preferir não usar webhook, pode fazer polling direto:

```javascript
// Método alternativo - Polling direto na Evolution API
const fetchQRCodeDirect = async (instanceName) => {
  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/instance/connect/${instanceName}`,
      {
        headers: {
          'apikey': EVOLUTION_API_KEY
        }
      }
    );
    
    const data = await response.json();
    
    if (data.base64) {
      return data.base64;
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao buscar QR Code:', error);
    return null;
  }
};

// Usar no componente com polling
useEffect(() => {
  const interval = setInterval(async () => {
    const qr = await fetchQRCodeDirect(instanceName);
    if (qr) {
      setQrCode(qr);
    }
  }, 5000); // A cada 5 segundos
  
  return () => clearInterval(interval);
}, [instanceName]);
```

---

## 🔧 Troubleshooting

### Problema: QR Code não aparece

**Soluções:**
1. Verificar se webhook está configurado corretamente
2. Confirmar que `webhook_base64: true` está setado
3. Verificar logs da Evolution API
4. Testar endpoint de webhook com ferramentas como Postman

### Problema: QR Code expira muito rápido

**Solução:**
- QR Codes do WhatsApp expiram em ~60 segundos
- Implementar auto-refresh no frontend
- Mostrar timer de expiração para o usuário

### Problema: Webhook não recebe dados

**Checklist:**
1. URL do webhook está acessível publicamente?
2. Firewall/CORS está bloqueando?
3. Certificado SSL válido (HTTPS obrigatório)?
4. Verificar logs do servidor

### Logs úteis da Evolution API

```bash
# Ver logs do container
docker logs -f evolution_api

# Filtrar eventos de QR Code
docker logs evolution_api 2>&1 | grep -i "qrcode"
```

---

## 🚀 Deploy em Produção

### Usando ngrok para testes (desenvolvimento)

```bash
# Expor localhost para internet
ngrok http 3000

# Usar URL do ngrok como webhook
# Exemplo: https://abc123.ngrok.io/api/webhook/evolution
```

### Produção com HTTPS

Seu webhook **DEVE** estar em HTTPS. Use:
- Let's Encrypt (gratuito)
- Cloudflare
- Nginx com SSL

---

## 📚 Recursos Adicionais

- [Documentação Evolution API v2](https://doc.evolution-api.com/v2/en/get-started/introduction)
- [Webhook Events](https://doc.evolution-api.com/v2/en/configuration/webhooks)
- [GitHub Evolution API](https://github.com/EvolutionAPI/evolution-api)

---

## 💡 Exemplo Completo - Fluxo Ponta a Ponta

```javascript
// 1. Cliente solicita conexão
POST /api/instance/create
{
  "instanceName": "cliente123",
  "webhookUrl": "https://sua-plataforma.com/api/webhook/evolution"
}

// 2. Backend cria instância e configura webhook
// 3. Evolution API gera QR Code e envia para webhook
// 4. Backend recebe webhook QRCODE_UPDATED
// 5. Frontend faz polling em /api/qrcode/cliente123
// 6. Mostra QR Code para usuário
// 7. Usuário escaneia
// 8. Webhook recebe CONNECTION_UPDATE (state: open)
// 9. Frontend redireciona para dashboard
```

---

**Criado em:** 01/02/2026  
**Versão Evolution API:** v2.x  
**Autor:** Assistente Claude
