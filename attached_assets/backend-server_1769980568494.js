// ========================================
// SERVIDOR BACKEND - Evolution API QR Code
// ========================================

const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ========================================
// CONFIGURAÇÕES
// ========================================

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL; // URL pública do seu servidor

// Store em memória (em produção use Redis ou MongoDB)
const qrCodeStore = new Map();
const instanceStatusStore = new Map();

// ========================================
// WEBHOOK - Receber eventos da Evolution API
// ========================================

app.post('/api/webhook/evolution', (req, res) => {
  const { event, instance, data } = req.body;
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📥 Webhook recebido`);
  console.log(`Event: ${event}`);
  console.log(`Instance: ${instance}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Processar evento QRCODE_UPDATED
  if (event === 'qrcode.updated') {
    console.log('📱 QR Code atualizado!');
    
    const qrCodeData = {
      base64: data.qrcode.base64,
      code: data.qrcode.code,
      timestamp: new Date().toISOString(),
      instance: instance,
      expiresAt: new Date(Date.now() + 60000).toISOString() // Expira em 60s
    };
    
    qrCodeStore.set(instance, qrCodeData);
    instanceStatusStore.set(instance, 'qr_ready');
    
    console.log(`✅ QR Code armazenado para instância: ${instance}`);
    console.log(`⏰ Expira em: ${qrCodeData.expiresAt}`);
  }
  
  // Processar evento CONNECTION_UPDATE
  if (event === 'connection.update') {
    console.log(`🔄 Atualização de conexão: ${data.state}`);
    
    instanceStatusStore.set(instance, data.state);
    
    // Limpar QR Code quando conectado
    if (data.state === 'open') {
      qrCodeStore.delete(instance);
      console.log(`🎉 WhatsApp conectado com sucesso! Instância: ${instance}`);
    }
    
    if (data.state === 'close') {
      qrCodeStore.delete(instance);
      console.log(`❌ WhatsApp desconectado. Instância: ${instance}`);
    }
  }
  
  // Processar evento MESSAGES_UPSERT (mensagem recebida)
  if (event === 'messages.upsert') {
    console.log('💬 Nova mensagem recebida');
  }
  
  res.status(200).json({ 
    success: true, 
    message: 'Webhook processado com sucesso' 
  });
});

// ========================================
// ENDPOINTS - API REST
// ========================================

/**
 * GET /api/qrcode/:instanceName
 * Retorna o QR Code de uma instância
 */
app.get('/api/qrcode/:instanceName', (req, res) => {
  const { instanceName } = req.params;
  const qrData = qrCodeStore.get(instanceName);
  const status = instanceStatusStore.get(instanceName);
  
  if (!qrData) {
    return res.status(404).json({ 
      success: false,
      status: status || 'not_found',
      message: 'QR Code não disponível. Aguardando geração...',
      instance: instanceName
    });
  }
  
  // Verificar se QR Code expirou
  const now = new Date();
  const expiresAt = new Date(qrData.expiresAt);
  
  if (now > expiresAt) {
    qrCodeStore.delete(instanceName);
    return res.status(410).json({
      success: false,
      status: 'expired',
      message: 'QR Code expirado. Gerando novo...',
      instance: instanceName
    });
  }
  
  res.json({
    success: true,
    status: 'ready',
    data: {
      qrCode: qrData.base64,
      instance: instanceName,
      timestamp: qrData.timestamp,
      expiresAt: qrData.expiresAt,
      timeRemaining: Math.floor((expiresAt - now) / 1000) // segundos
    }
  });
});

/**
 * GET /api/status/:instanceName
 * Retorna o status de conexão de uma instância
 */
app.get('/api/status/:instanceName', async (req, res) => {
  const { instanceName } = req.params;
  
  try {
    const response = await axios.get(
      `${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`,
      {
        headers: { 'apikey': EVOLUTION_API_KEY }
      }
    );
    
    res.json({
      success: true,
      status: response.data.state,
      data: response.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/instance/create
 * Cria uma nova instância e configura webhook
 */
app.post('/api/instance/create', async (req, res) => {
  const { instanceName, clientName } = req.body;
  
  if (!instanceName) {
    return res.status(400).json({
      success: false,
      error: 'instanceName é obrigatório'
    });
  }
  
  try {
    console.log(`🔧 Criando instância: ${instanceName}`);
    
    // 1. Criar instância
    const createResponse = await axios.post(
      `${EVOLUTION_API_URL}/instance/create`,
      {
        instanceName: instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        number: clientName || instanceName
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        }
      }
    );
    
    console.log(`✅ Instância criada: ${instanceName}`);
    
    // 2. Configurar webhook
    const webhookUrl = `${WEBHOOK_BASE_URL}/api/webhook/evolution`;
    
    await axios.post(
      `${EVOLUTION_API_URL}/webhook/set/${instanceName}`,
      {
        url: webhookUrl,
        webhook_by_events: true,
        webhook_base64: true,
        events: [
          'QRCODE_UPDATED',
          'CONNECTION_UPDATE',
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE'
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        }
      }
    );
    
    console.log(`✅ Webhook configurado para: ${instanceName}`);
    console.log(`📍 Webhook URL: ${webhookUrl}`);
    
    instanceStatusStore.set(instanceName, 'created');
    
    res.json({
      success: true,
      message: 'Instância criada com sucesso',
      instance: instanceName,
      webhookUrl: webhookUrl,
      data: createResponse.data
    });
    
  } catch (error) {
    console.error(`❌ Erro ao criar instância: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data
    });
  }
});

/**
 * DELETE /api/instance/:instanceName
 * Deleta uma instância
 */
app.delete('/api/instance/:instanceName', async (req, res) => {
  const { instanceName } = req.params;
  
  try {
    await axios.delete(
      `${EVOLUTION_API_URL}/instance/delete/${instanceName}`,
      {
        headers: { 'apikey': EVOLUTION_API_KEY }
      }
    );
    
    // Limpar stores
    qrCodeStore.delete(instanceName);
    instanceStatusStore.delete(instanceName);
    
    res.json({
      success: true,
      message: 'Instância deletada com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/instance/:instanceName/restart
 * Reinicia uma instância (gera novo QR Code)
 */
app.post('/api/instance/:instanceName/restart', async (req, res) => {
  const { instanceName } = req.params;
  
  try {
    const response = await axios.put(
      `${EVOLUTION_API_URL}/instance/restart/${instanceName}`,
      {},
      {
        headers: { 'apikey': EVOLUTION_API_KEY }
      }
    );
    
    // Limpar QR Code antigo
    qrCodeStore.delete(instanceName);
    instanceStatusStore.set(instanceName, 'restarting');
    
    res.json({
      success: true,
      message: 'Instância reiniciada. Novo QR Code será gerado.',
      data: response.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/instances
 * Lista todas as instâncias
 */
app.get('/api/instances', async (req, res) => {
  try {
    const response = await axios.get(
      `${EVOLUTION_API_URL}/instance/fetchInstances`,
      {
        headers: { 'apikey': EVOLUTION_API_KEY }
      }
    );
    
    res.json({
      success: true,
      instances: response.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================
// HEALTH CHECK
// ========================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    activeInstances: instanceStatusStore.size,
    qrCodesStored: qrCodeStore.size
  });
});

// ========================================
// INICIAR SERVIDOR
// ========================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Servidor Evolution QR Code iniciado!');
  console.log(`📍 Porta: ${PORT}`);
  console.log(`🔗 Evolution API: ${EVOLUTION_API_URL}`);
  console.log(`📡 Webhook URL: ${WEBHOOK_BASE_URL}/api/webhook/evolution`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

// Tratamento de erros
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error);
});
