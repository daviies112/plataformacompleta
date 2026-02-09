import { useState, useEffect } from 'react';
import { PremiumCard } from '@/platforms/shared/premium/PremiumCard';
import { PremiumButton } from '@/platforms/shared/premium/PremiumButton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QrCode, RefreshCw, LogOut, Trash2, CheckCircle, XCircle, Smartphone, Settings, MessageCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

interface QRCodeData {
  base64: string;
  code: string;
}

interface StatusData {
  state: string;
  instance: string;
}

const WhatsAppPage = () => {
  const navigate = useNavigate();
  const [qrCode, setQrCode] = useState<QRCodeData | null>(null);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchQRCode = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch('/api/evolution/qrcode');
      const data = await response.json();
      
      if (data.success) {
        setQrCode(data.qrcode);
        setSuccess('QR Code gerado com sucesso! Escaneie com seu WhatsApp.');
      } else {
        setError(data.error || 'Erro ao obter QR code');
      }
    } catch (err) {
      setError('Erro ao conectar com a API. Verifique as configurações.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/evolution/status');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.status);
      }
    } catch (err) {
      console.error('Erro ao obter status:', err);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch('/api/evolution/logout', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Desconectado com sucesso!');
        setQrCode(null);
        fetchStatus();
      } else {
        setError(data.error || 'Erro ao desconectar');
      }
    } catch (err) {
      setError('Erro ao desconectar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja deletar a instância? Isso removerá todas as configurações.')) {
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch('/api/evolution/delete', { method: 'DELETE' });
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Instância deletada com sucesso!');
        setQrCode(null);
        setStatus(null);
      } else {
        setError(data.error || 'Erro ao deletar instância');
      }
    } catch (err) {
      setError('Erro ao deletar instância');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const isConnected = status?.state === 'open';

  return (
    <div className="relative z-10 container mx-auto pt-0 pb-4 sm:pb-6 lg:pb-8 space-y-6 lg:space-y-8 animate-fade-in px-4 sm:px-6 lg:px-8">
      
      <div className="space-y-4">
        <div className="flex items-start gap-4 lg:gap-3">
          <div className="p-3 lg:p-2.5 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
            <MessageCircle className="h-8 w-8 lg:h-6 lg:w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl lg:text-2xl font-black text-foreground tracking-tight bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
              WhatsApp Integration
            </h1>
            <p className="text-xl lg:text-sm text-muted-foreground/80 mt-2 lg:mt-1">
              Conecte sua conta WhatsApp com Evolution API
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 max-w-5xl">
        <PremiumCard variant="elevated" padding="lg">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isConnected ? (
                  <div className="p-2 rounded-lg bg-emerald-500/20">
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-red-500/20">
                    <XCircle className="w-6 h-6 text-red-400" />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-foreground">Status da Conexão</h3>
                  <p className="text-sm text-muted-foreground">
                    {status?.instance || 'Verificando...'}
                  </p>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse shadow-lg ${isConnected ? 'shadow-emerald-500/50' : 'shadow-red-500/50'}`} />
            </div>
            
            <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-foreground">
                  {isConnected ? '✅ Conectado' : '❌ Desconectado'}
                </span>
                {status && (
                  <span className="text-sm text-muted-foreground">
                    • Estado: <span className="font-medium">{status.state}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </PremiumCard>

        <PremiumCard variant="elevated" padding="lg">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
                <QrCode className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">QR Code para Conexão</h3>
                <p className="text-sm text-muted-foreground">
                  Escaneie o QR code com o WhatsApp do seu celular
                </p>
              </div>
            </div>

            {error && (
              <Alert className="border-red-500/50 bg-red-500/10">
                <AlertDescription className="text-red-400">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-4 h-4" />
                    {error}
                  </div>
                  {error.includes('não configurado') && (
                    <PremiumButton
                      onClick={() => navigate('/configuracoes')}
                      variant="secondary"
                      size="sm"
                      className="mt-2"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Configurar Evolution API
                    </PremiumButton>
                  )}
                </AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="border-emerald-500/50 bg-emerald-500/10">
                <AlertDescription className="text-emerald-400 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {success}
                </AlertDescription>
              </Alert>
            )}

            {!isConnected && (
              <div className="flex flex-col items-center gap-6 py-8">
                {loading ? (
                  <Skeleton className="w-64 h-64 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl" />
                ) : qrCode ? (
                  <div className="p-4 rounded-2xl bg-white shadow-2xl">
                    <img 
                      src={qrCode.base64} 
                      alt="QR Code WhatsApp"
                      className="w-64 h-64"
                    />
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="p-8 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 mb-4">
                      <QrCode className="w-24 h-24 mx-auto text-primary/40" />
                    </div>
                    <p className="text-base text-muted-foreground">
                      Clique no botão abaixo para gerar o QR Code
                    </p>
                  </div>
                )}

                <PremiumButton 
                  onClick={fetchQRCode}
                  disabled={loading}
                  variant="primary"
                  size="lg"
                  isLoading={loading}
                  className="w-full max-w-sm"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  {loading ? 'Gerando...' : 'Gerar QR Code'}
                </PremiumButton>

                <PremiumCard variant="outlined" padding="md" className="max-w-md w-full">
                  <div className="space-y-3">
                    <p className="font-semibold text-foreground flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-primary" />
                      📱 Como conectar:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Abra o WhatsApp no seu celular</li>
                      <li>Toque em Menu (⋮) → Aparelhos conectados</li>
                      <li>Toque em "Conectar um aparelho"</li>
                      <li>Aponte seu telefone para esta tela para capturar o código</li>
                    </ol>
                  </div>
                </PremiumCard>
              </div>
            )}

            {isConnected && (
              <div className="flex flex-col items-center gap-6 py-8">
                <div className="p-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 border border-emerald-500/30">
                  <CheckCircle className="w-24 h-24 text-emerald-400" />
                </div>
                <div className="text-center">
                  <h4 className="text-2xl font-bold text-foreground mb-2">
                    WhatsApp Conectado!
                  </h4>
                  <p className="text-base text-muted-foreground">
                    Sua instância está ativa e pronta para uso
                  </p>
                </div>
              </div>
            )}
          </div>
        </PremiumCard>

        <PremiumCard variant="elevated" padding="lg">
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-foreground mb-1">Ações</h3>
              <p className="text-sm text-muted-foreground">
                Gerenciar conexão WhatsApp
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <PremiumButton
                onClick={handleLogout}
                disabled={loading || !isConnected}
                variant="secondary"
                size="md"
                isLoading={loading && !error}
                className="flex-1"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Desconectar
              </PremiumButton>
              
              <PremiumButton
                onClick={handleDelete}
                disabled={loading}
                variant="danger"
                size="md"
                isLoading={loading && !error}
                className="flex-1"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Deletar Instância
              </PremiumButton>
            </div>
          </div>
        </PremiumCard>

        <PremiumCard variant="outlined" padding="lg">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/10">
                <Settings className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-foreground">⚙️ Configuração</h3>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-semibold text-foreground min-w-fit">Evolution API:</span>
                <span className="text-muted-foreground">Usando credenciais configuradas em Secrets</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-foreground min-w-fit">Instância:</span>
                <span className="text-muted-foreground font-mono">{status?.instance || 'nexus-whatsapp'}</span>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-blue-400">
                    💡 Para alterar a URL ou API Key, vá para Configurações
                  </p>
                  <PremiumButton
                    onClick={() => navigate('/configuracoes')}
                    variant="ghost"
                    size="sm"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Abrir Configurações
                  </PremiumButton>
                </div>
              </div>
            </div>
          </div>
        </PremiumCard>
      </div>
    </div>
  );
};

export default WhatsAppPage;
