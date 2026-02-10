// ========================================
// COMPONENTE REACT - QR Code WhatsApp
// ========================================

import React, { useState, useEffect, useCallback } from 'react';
import './QRCodeDisplay.css';

const QRCodeDisplay = ({ instanceName }) => {
  const [qrCode, setQrCode] = useState(null);
  const [status, setStatus] = useState('loading'); // loading, ready, waiting, connected, error, expired
  const [error, setError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [connectionStatus, setConnectionStatus] = useState(null);

  // Constantes
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
  const POLLING_INTERVAL = 3000; // 3 segundos

  // ========================================
  // FUNÇÕES DE API
  // ========================================

  /**
   * Buscar QR Code do backend
   */
  const fetchQRCode = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/qrcode/${instanceName}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setQrCode(data.data.qrCode);
        setTimeRemaining(data.data.timeRemaining);
        setStatus('ready');
        setError(null);
      } else if (response.status === 410) {
        // QR Code expirado
        setStatus('expired');
        setQrCode(null);
      } else {
        setStatus('waiting');
        setQrCode(null);
      }
    } catch (err) {
      console.error('Erro ao buscar QR Code:', err);
      setError(err.message);
      setStatus('error');
    }
  }, [instanceName, API_BASE_URL]);

  /**
   * Verificar status de conexão
   */
  const checkConnectionStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/status/${instanceName}`);
      const data = await response.json();

      if (data.success) {
        setConnectionStatus(data.status);
        
        if (data.status === 'open') {
          setStatus('connected');
          setQrCode(null);
        }
      }
    } catch (err) {
      console.error('Erro ao verificar status:', err);
    }
  }, [instanceName, API_BASE_URL]);

  /**
   * Criar nova instância
   */
  const createInstance = async () => {
    setStatus('loading');
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceName: instanceName,
          clientName: instanceName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('Instância criada com sucesso');
        setStatus('waiting');
      } else {
        throw new Error(data.error || 'Erro ao criar instância');
      }
    } catch (err) {
      console.error('Erro ao criar instância:', err);
      setError(err.message);
      setStatus('error');
    }
  };

  /**
   * Reiniciar instância (gerar novo QR Code)
   */
  const restartInstance = async () => {
    setStatus('loading');
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/instance/${instanceName}/restart`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        console.log('Instância reiniciada');
        setStatus('waiting');
        setQrCode(null);
      } else {
        throw new Error(data.error || 'Erro ao reiniciar instância');
      }
    } catch (err) {
      console.error('Erro ao reiniciar instância:', err);
      setError(err.message);
      setStatus('error');
    }
  };

  // ========================================
  // EFFECTS
  // ========================================

  /**
   * Polling para buscar QR Code e status
   */
  useEffect(() => {
    // Busca inicial
    fetchQRCode();
    checkConnectionStatus();

    // Configurar polling
    const pollingInterval = setInterval(() => {
      if (status !== 'connected') {
        fetchQRCode();
        checkConnectionStatus();
      }
    }, POLLING_INTERVAL);

    // Cleanup
    return () => {
      clearInterval(pollingInterval);
    };
  }, [fetchQRCode, checkConnectionStatus, status]);

  /**
   * Countdown do timer
   */
  useEffect(() => {
    if (status === 'ready' && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setStatus('expired');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [status, timeRemaining]);

  // ========================================
  // RENDERIZAÇÃO
  // ========================================

  /**
   * Formatar tempo restante
   */
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Loading state
   */
  if (status === 'loading') {
    return (
      <div className="qr-container">
        <div className="qr-loading">
          <div className="spinner"></div>
          <h3>Iniciando conexão...</h3>
          <p>Por favor, aguarde...</p>
        </div>
      </div>
    );
  }

  /**
   * Error state
   */
  if (status === 'error') {
    return (
      <div className="qr-container">
        <div className="qr-error">
          <div className="error-icon">❌</div>
          <h3>Erro ao gerar QR Code</h3>
          <p className="error-message">{error}</p>
          <button onClick={createInstance} className="btn-retry">
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  /**
   * Waiting state
   */
  if (status === 'waiting') {
    return (
      <div className="qr-container">
        <div className="qr-waiting">
          <div className="spinner"></div>
          <h3>Gerando QR Code...</h3>
          <p>Aguardando resposta da Evolution API...</p>
          <div className="status-indicator">
            <span className="status-dot pulse"></span>
            <span>Conectando ao WhatsApp</span>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Expired state
   */
  if (status === 'expired') {
    return (
      <div className="qr-container">
        <div className="qr-expired">
          <div className="expired-icon">⏱️</div>
          <h3>QR Code Expirado</h3>
          <p>O QR Code expirou após 60 segundos.</p>
          <button onClick={restartInstance} className="btn-refresh">
            🔄 Gerar Novo QR Code
          </button>
        </div>
      </div>
    );
  }

  /**
   * Connected state
   */
  if (status === 'connected') {
    return (
      <div className="qr-container">
        <div className="qr-success">
          <div className="success-icon">✅</div>
          <h3>WhatsApp Conectado!</h3>
          <p>Sua conexão foi estabelecida com sucesso.</p>
          <div className="connection-info">
            <div className="info-item">
              <span className="label">Instância:</span>
              <span className="value">{instanceName}</span>
            </div>
            <div className="info-item">
              <span className="label">Status:</span>
              <span className="value status-active">Ativo</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Ready state - Exibindo QR Code
   */
  return (
    <div className="qr-container">
      <div className="qr-header">
        <div className="whatsapp-logo">
          <svg viewBox="0 0 48 48" width="48" height="48">
            <path fill="#25D366" d="M4.868 43.303l2.694-9.835C5.9 30.59 5.026 27.324 5.027 23.979C5.032 13.514 13.548 5 24.014 5c5.079.002 9.845 1.979 13.43 5.566 3.584 3.588 5.558 8.356 5.556 13.428-.004 10.465-8.522 18.98-18.986 18.98-.001 0 0 0 0 0h-.008c-3.177-.001-6.3-.798-9.073-2.311l-9.865 2.589z"/>
            <path fill="#FFFFFF" d="M24.014 7c-9.372 0-16.99 7.616-16.994 16.986 0 3.137.847 6.2 2.458 8.876l-2.597 9.487 9.71-2.546c2.59 1.414 5.516 2.161 8.423 2.161h.008c9.372 0 16.99-7.616 16.994-16.986.002-4.543-1.765-8.812-4.974-12.022C34.832 8.747 30.562 6.98 26.019 6.978c-.002 0 .001 0-.005 0z"/>
          </svg>
        </div>
        <h3>Conecte seu WhatsApp</h3>
        <p>Escaneie o QR Code abaixo com seu celular</p>
      </div>

      <div className="qr-timer">
        <div className="timer-circle">
          <span className="timer-text">{formatTime(timeRemaining)}</span>
        </div>
        <p className="timer-label">Tempo restante</p>
      </div>

      <div className="qr-image-wrapper">
        {qrCode ? (
          <img 
            src={qrCode} 
            alt="QR Code WhatsApp" 
            className="qr-image"
          />
        ) : (
          <div className="qr-placeholder">
            <div className="spinner"></div>
          </div>
        )}
      </div>

      <div className="qr-instructions">
        <h4>📱 Como conectar:</h4>
        <ol>
          <li>Abra o <strong>WhatsApp</strong> no seu celular</li>
          <li>Toque em <strong>Configurações</strong> → <strong>Aparelhos conectados</strong></li>
          <li>Toque em <strong>"Conectar um aparelho"</strong></li>
          <li>Aponte a câmera para este QR Code</li>
        </ol>
      </div>

      <div className="qr-footer">
        <button onClick={restartInstance} className="btn-secondary">
          🔄 Gerar Novo QR Code
        </button>
      </div>
    </div>
  );
};

export default QRCodeDisplay;
