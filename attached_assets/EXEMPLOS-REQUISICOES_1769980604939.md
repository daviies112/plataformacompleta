# 🧪 EXEMPLOS DE REQUISIÇÕES - Testando a API

## 📌 Configuração Inicial

```bash
# Definir variáveis
export API_URL="http://localhost:3000"
export EVOLUTION_URL="http://localhost:8080"
export EVOLUTION_KEY="sua-api-key-aqui"
export INSTANCE_NAME="teste-$(date +%s)"
```

---

## 1️⃣ HEALTH CHECK

### Backend (seu servidor)

```bash
curl -X GET ${API_URL}/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-01T12:00:00.000Z",
  "activeInstances": 0,
  "qrCodesStored": 0
}
```

### Evolution API

```bash
curl -X GET ${EVOLUTION_URL} \
  -H "apikey: ${EVOLUTION_KEY}"
```

---

## 2️⃣ CRIAR INSTÂNCIA

```bash
curl -X POST ${API_URL}/api/instance/create \
  -H "Content-Type: application/json" \
  -d "{
    \"instanceName\": \"${INSTANCE_NAME}\",
    \"clientName\": \"Cliente Teste\"
  }"
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Instância criada com sucesso",
  "instance": "teste-1738425600",
  "webhookUrl": "https://abc123.ngrok.io/api/webhook/evolution",
  "data": {
    "instance": {
      "instanceName": "teste-1738425600",
      "status": "created"
    }
  }
}
```

**O que acontece:**
1. Backend chama Evolution API para criar instância
2. Backend configura webhook automaticamente
3. Evolution API começa a gerar QR Code
4. Evolution API enviará webhook para seu servidor

---

## 3️⃣ BUSCAR QR CODE

```bash
curl -X GET ${API_URL}/api/qrcode/${INSTANCE_NAME}
```

**Resposta quando QR Code está disponível:**
```json
{
  "success": true,
  "status": "ready",
  "data": {
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "instance": "teste-1738425600",
    "timestamp": "2026-02-01T12:00:00.000Z",
    "expiresAt": "2026-02-01T12:01:00.000Z",
    "timeRemaining": 58
  }
}
```

**Resposta quando aguardando:**
```json
{
  "success": false,
  "status": "not_found",
  "message": "QR Code não disponível. Aguardando geração...",
  "instance": "teste-1738425600"
}
```

**Resposta quando expirado:**
```json
{
  "success": false,
  "status": "expired",
  "message": "QR Code expirado. Gerando novo...",
  "instance": "teste-1738425600"
}
```

---

## 4️⃣ VERIFICAR STATUS DA CONEXÃO

```bash
curl -X GET ${API_URL}/api/status/${INSTANCE_NAME}
```

**Respostas possíveis:**
```json
// Conectado
{
  "success": true,
  "status": "open",
  "data": {
    "state": "open"
  }
}

// Desconectado
{
  "success": true,
  "status": "close",
  "data": {
    "state": "close"
  }
}

// Conectando
{
  "success": true,
  "status": "connecting",
  "data": {
    "state": "connecting"
  }
}
```

---

## 5️⃣ LISTAR TODAS AS INSTÂNCIAS

```bash
curl -X GET ${API_URL}/api/instances
```

**Resposta:**
```json
{
  "success": true,
  "instances": [
    {
      "instance": {
        "instanceName": "teste-1738425600",
        "status": "open"
      }
    },
    {
      "instance": {
        "instanceName": "cliente-123",
        "status": "close"
      }
    }
  ]
}
```

---

## 6️⃣ REINICIAR INSTÂNCIA (gerar novo QR Code)

```bash
curl -X POST ${API_URL}/api/instance/${INSTANCE_NAME}/restart
```

**Resposta:**
```json
{
  "success": true,
  "message": "Instância reiniciada. Novo QR Code será gerado.",
  "data": {
    "restart": {
      "instanceName": "teste-1738425600",
      "status": "restarting"
    }
  }
}
```

---

## 7️⃣ DELETAR INSTÂNCIA

```bash
curl -X DELETE ${API_URL}/api/instance/${INSTANCE_NAME}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Instância deletada com sucesso"
}
```

---

## 8️⃣ SIMULAR WEBHOOK (para testes)

### Webhook de QR Code Atualizado

```bash
curl -X POST ${API_URL}/api/webhook/evolution \
  -H "Content-Type: application/json" \
  -d '{
    "event": "qrcode.updated",
    "instance": "teste-123",
    "data": {
      "qrcode": {
        "pairingCode": null,
        "code": "2@abc123",
        "base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
      }
    }
  }'
```

### Webhook de Conexão Estabelecida

```bash
curl -X POST ${API_URL}/api/webhook/evolution \
  -H "Content-Type: application/json" \
  -d '{
    "event": "connection.update",
    "instance": "teste-123",
    "data": {
      "state": "open"
    }
  }'
```

### Webhook de Desconexão

```bash
curl -X POST ${API_URL}/api/webhook/evolution \
  -H "Content-Type: application/json" \
  -d '{
    "event": "connection.update",
    "instance": "teste-123",
    "data": {
      "state": "close"
    }
  }'
```

---

## 9️⃣ TESTAR DIRETAMENTE NA EVOLUTION API

### Criar instância diretamente

```bash
curl -X POST ${EVOLUTION_URL}/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: ${EVOLUTION_KEY}" \
  -d "{
    \"instanceName\": \"teste-direto\",
    \"qrcode\": true,
    \"integration\": \"WHATSAPP-BAILEYS\"
  }"
```

### Configurar webhook diretamente

```bash
curl -X POST ${EVOLUTION_URL}/webhook/set/teste-direto \
  -H "Content-Type: application/json" \
  -H "apikey: ${EVOLUTION_KEY}" \
  -d '{
    "url": "https://sua-url-publica.com/api/webhook/evolution",
    "webhook_by_events": true,
    "webhook_base64": true,
    "events": ["QRCODE_UPDATED", "CONNECTION_UPDATE"]
  }'
```

### Buscar webhook configurado

```bash
curl -X GET ${EVOLUTION_URL}/webhook/find/teste-direto \
  -H "apikey: ${EVOLUTION_KEY}"
```

### Buscar estado da conexão

```bash
curl -X GET ${EVOLUTION_URL}/instance/connectionState/teste-direto \
  -H "apikey: ${EVOLUTION_KEY}"
```

### Buscar QR Code diretamente

```bash
curl -X GET ${EVOLUTION_URL}/instance/connect/teste-direto \
  -H "apikey: ${EVOLUTION_KEY}"
```

### Logout/Desconectar

```bash
curl -X DELETE ${EVOLUTION_URL}/instance/logout/teste-direto \
  -H "apikey: ${EVOLUTION_KEY}"
```

### Deletar instância

```bash
curl -X DELETE ${EVOLUTION_URL}/instance/delete/teste-direto \
  -H "apikey: ${EVOLUTION_KEY}"
```

---

## 🔟 SCRIPTS COMPLETOS DE TESTE

### Script 1: Teste Básico

```bash
#!/bin/bash

echo "==================================="
echo "TESTE BÁSICO - QR CODE"
echo "==================================="

# Variáveis
API_URL="http://localhost:3000"
INSTANCE="teste-$(date +%s)"

echo ""
echo "1. Verificando saúde do servidor..."
curl -s ${API_URL}/health | jq '.'

echo ""
echo "2. Criando instância: ${INSTANCE}"
curl -s -X POST ${API_URL}/api/instance/create \
  -H "Content-Type: application/json" \
  -d "{\"instanceName\": \"${INSTANCE}\"}" | jq '.'

echo ""
echo "3. Aguardando 5 segundos para QR Code ser gerado..."
sleep 5

echo ""
echo "4. Buscando QR Code..."
curl -s ${API_URL}/api/qrcode/${INSTANCE} | jq '.'

echo ""
echo "5. Verificando status..."
curl -s ${API_URL}/api/status/${INSTANCE} | jq '.'

echo ""
echo "==================================="
echo "TESTE CONCLUÍDO"
echo "Instância criada: ${INSTANCE}"
echo "==================================="
```

### Script 2: Teste de Polling

```bash
#!/bin/bash

API_URL="http://localhost:3000"
INSTANCE=$1

if [ -z "$INSTANCE" ]; then
  echo "Uso: $0 <nome-da-instancia>"
  exit 1
fi

echo "Fazendo polling do QR Code para: ${INSTANCE}"
echo "Pressione Ctrl+C para sair"
echo ""

while true; do
  clear
  echo "========================================="
  echo "Polling QR Code - $(date '+%H:%M:%S')"
  echo "========================================="
  echo ""
  
  RESPONSE=$(curl -s ${API_URL}/api/qrcode/${INSTANCE})
  echo $RESPONSE | jq '.'
  
  STATUS=$(echo $RESPONSE | jq -r '.status')
  
  if [ "$STATUS" = "ready" ]; then
    echo ""
    echo "✅ QR Code disponível!"
    TIME_REMAINING=$(echo $RESPONSE | jq -r '.data.timeRemaining')
    echo "⏰ Tempo restante: ${TIME_REMAINING}s"
  elif [ "$STATUS" = "expired" ]; then
    echo ""
    echo "⏱️  QR Code expirado!"
  else
    echo ""
    echo "⏳ Aguardando QR Code..."
  fi
  
  sleep 3
done
```

### Script 3: Teste Completo com Cleanup

```bash
#!/bin/bash

set -e

API_URL="http://localhost:3000"
INSTANCE="teste-completo-$(date +%s)"

# Função de cleanup
cleanup() {
  echo ""
  echo "Limpando instância..."
  curl -s -X DELETE ${API_URL}/api/instance/${INSTANCE}
  echo "✅ Limpeza concluída"
  exit 0
}

trap cleanup EXIT INT TERM

echo "==================================="
echo "TESTE COMPLETO COM CLEANUP"
echo "==================================="

echo ""
echo "1. Health check..."
curl -s ${API_URL}/health | jq '.'

echo ""
echo "2. Criando instância: ${INSTANCE}"
CREATE_RESPONSE=$(curl -s -X POST ${API_URL}/api/instance/create \
  -H "Content-Type: application/json" \
  -d "{\"instanceName\": \"${INSTANCE}\"}")
echo $CREATE_RESPONSE | jq '.'

if [ $(echo $CREATE_RESPONSE | jq -r '.success') != "true" ]; then
  echo "❌ Falha ao criar instância"
  exit 1
fi

echo ""
echo "3. Aguardando QR Code (max 30s)..."
ATTEMPTS=0
MAX_ATTEMPTS=10

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
  ATTEMPTS=$((ATTEMPTS + 1))
  echo "Tentativa $ATTEMPTS/$MAX_ATTEMPTS..."
  
  QR_RESPONSE=$(curl -s ${API_URL}/api/qrcode/${INSTANCE})
  STATUS=$(echo $QR_RESPONSE | jq -r '.status')
  
  if [ "$STATUS" = "ready" ]; then
    echo "✅ QR Code obtido!"
    echo $QR_RESPONSE | jq '.data | {instance, timestamp, timeRemaining}'
    break
  fi
  
  sleep 3
done

if [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; then
  echo "❌ Timeout aguardando QR Code"
  exit 1
fi

echo ""
echo "4. Verificando status de conexão..."
curl -s ${API_URL}/api/status/${INSTANCE} | jq '.'

echo ""
echo "5. Listando todas as instâncias..."
curl -s ${API_URL}/api/instances | jq '.instances | length'

echo ""
echo "==================================="
echo "✅ TESTE CONCLUÍDO COM SUCESSO"
echo "==================================="

# Cleanup será executado automaticamente
```

---

## 📊 POSTMAN COLLECTION

### Importar no Postman

Crie um arquivo `evolution-qrcode.postman_collection.json`:

```json
{
  "info": {
    "name": "Evolution QR Code API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "api_url",
      "value": "http://localhost:3000",
      "type": "string"
    },
    {
      "key": "instance_name",
      "value": "teste-123",
      "type": "string"
    }
  ],
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{api_url}}/health",
          "host": ["{{api_url}}"],
          "path": ["health"]
        }
      }
    },
    {
      "name": "Criar Instância",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"instanceName\": \"{{instance_name}}\",\n  \"clientName\": \"Cliente Teste\"\n}"
        },
        "url": {
          "raw": "{{api_url}}/api/instance/create",
          "host": ["{{api_url}}"],
          "path": ["api", "instance", "create"]
        }
      }
    },
    {
      "name": "Buscar QR Code",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{api_url}}/api/qrcode/{{instance_name}}",
          "host": ["{{api_url}}"],
          "path": ["api", "qrcode", "{{instance_name}}"]
        }
      }
    },
    {
      "name": "Status Conexão",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{api_url}}/api/status/{{instance_name}}",
          "host": ["{{api_url}}"],
          "path": ["api", "status", "{{instance_name}}"]
        }
      }
    },
    {
      "name": "Listar Instâncias",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{api_url}}/api/instances",
          "host": ["{{api_url}}"],
          "path": ["api", "instances"]
        }
      }
    },
    {
      "name": "Reiniciar Instância",
      "request": {
        "method": "POST",
        "header": [],
        "url": {
          "raw": "{{api_url}}/api/instance/{{instance_name}}/restart",
          "host": ["{{api_url}}"],
          "path": ["api", "instance", "{{instance_name}}", "restart"]
        }
      }
    },
    {
      "name": "Deletar Instância",
      "request": {
        "method": "DELETE",
        "header": [],
        "url": {
          "raw": "{{api_url}}/api/instance/{{instance_name}}",
          "host": ["{{api_url}}"],
          "path": ["api", "instance", "{{instance_name}}"]
        }
      }
    }
  ]
}
```

---

## 🎯 RESUMO DOS ENDPOINTS

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/health` | Verificar saúde do servidor |
| POST | `/api/instance/create` | Criar nova instância |
| GET | `/api/qrcode/:name` | Buscar QR Code |
| GET | `/api/status/:name` | Status de conexão |
| GET | `/api/instances` | Listar instâncias |
| POST | `/api/instance/:name/restart` | Reiniciar instância |
| DELETE | `/api/instance/:name` | Deletar instância |
| POST | `/api/webhook/evolution` | Receber webhooks (Evolution API) |

---

Salve estes exemplos e use para testar sua implementação! 🚀
