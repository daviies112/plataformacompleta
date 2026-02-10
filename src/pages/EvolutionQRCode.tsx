import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QrCode, RefreshCw, LogOut, Trash2, CheckCircle, XCircle, Smartphone } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { BottomNav } from '@/components/mobile/BottomNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface QRCodeData {
  base64: string;
  code: string;
}

interface StatusData {
  state: string;
  instance: string;
}

const EvolutionQRCode = () => {
  const isMobile = useIsMobile();
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
    const interval = setInterval(fetchStatus, 5000); // Atualiza status a cada 5 segundos
    return () => clearInterval(interval);
  }, []);

  const isConnected = status?.state === 'open';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-gray-900 to-[#0a0a0a]">
      {isMobile && (
        <div className="px-4 pb-2">
          <h1 className="text-2xl font-bold text-white">WhatsApp</h1>
        </div>
      )}
      
      <div className={cn(
        "max-w-4xl mx-auto space-y-4 md:space-y-6 pb-24 md:pb-6",
        isMobile ? "px-4 py-4" : "p-6"
      )}>
        {!isMobile && (
          <div className="flex items-center gap-3 mb-8">
            <Smartphone className="w-8 h-8 text-[#ffdf80]" />
            <h1 className="text-3xl font-bold text-white">WhatsApp - Evolution API</h1>
          </div>
        )}

        {/* Status Card */}
        <Card className="glass-card bg-gray-800/50 border-primary/20 backdrop-blur-sm">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-white text-base md:text-lg">
              {isConnected ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              Status da Conexão
            </CardTitle>
            <CardDescription className="text-gray-400 text-sm">
              {status?.instance || 'Verificando...'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              <span className="text-white font-medium text-sm md:text-base">
                {isConnected ? 'Conectado' : 'Desconectado'}
              </span>
              {status && (
                <span className="text-xs md:text-sm text-gray-400">
                  Estado: {status.state}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* QR Code Card */}
        <Card className="glass-card bg-gray-800/50 border-primary/20 backdrop-blur-sm">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-white text-base md:text-lg">
              <QrCode className="w-5 h-5 text-[#ffdf80]" />
              QR Code para Conexão
            </CardTitle>
            <CardDescription className="text-gray-400 text-sm">
              Escaneie o QR code com o WhatsApp do seu celular
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 md:p-6 pt-0">
            {error && (
              <Alert className="bg-red-900/20 border-red-500">
                <AlertDescription className="text-red-400">{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="bg-green-900/20 border-green-500">
                <AlertDescription className="text-green-400">{success}</AlertDescription>
              </Alert>
            )}

            {!isConnected && (
              <div className="flex flex-col items-center gap-4 py-4 md:py-8">
                {loading ? (
                  <Skeleton className="w-48 h-48 md:w-64 md:h-64 bg-gray-700" />
                ) : qrCode ? (
                  <div className="bg-white p-3 md:p-4 rounded-lg">
                    <img 
                      src={qrCode.base64} 
                      alt="QR Code WhatsApp"
                      className="w-48 h-48 md:w-64 md:h-64"
                    />
                  </div>
                ) : (
                  <div className="text-center text-gray-400 px-4">
                    <QrCode className="w-16 h-16 md:w-24 md:h-24 mx-auto mb-4 opacity-50" />
                    <p className="text-sm md:text-base">Clique no botão abaixo para gerar o QR Code</p>
                  </div>
                )}

                <Button 
                  onClick={fetchQRCode}
                  disabled={loading}
                  className="bg-[#ffdf80] hover:bg-[#f5d570] text-[#0a0a0a] font-semibold h-12 min-h-[48px] w-full md:w-auto px-8 touch-manipulation active:scale-95 transition-transform"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Gerando...' : 'Gerar QR Code'}
                </Button>

                <div className="mt-2 md:mt-4 p-3 md:p-4 bg-gray-700/50 backdrop-blur-sm rounded-lg text-xs md:text-sm text-gray-300 max-w-md w-full">
                  <p className="font-semibold mb-2">📱 Como conectar:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs md:text-sm">
                    <li>Abra o WhatsApp no seu celular</li>
                    <li>Toque em Menu (⋮) → Aparelhos conectados</li>
                    <li>Toque em "Conectar um aparelho"</li>
                    <li>Aponte seu telefone para esta tela para capturar o código</li>
                  </ol>
                </div>
              </div>
            )}

            {isConnected && (
              <div className="flex flex-col items-center gap-4 py-4 md:py-8">
                <CheckCircle className="w-16 h-16 md:w-24 md:h-24 text-green-500" />
                <p className="text-lg md:text-xl font-semibold text-white">WhatsApp Conectado!</p>
                <p className="text-sm md:text-base text-gray-400 text-center">Sua instância está ativa e pronta para uso</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card className="glass-card bg-gray-800/50 border-primary/20 backdrop-blur-sm">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-white text-base md:text-lg">Ações</CardTitle>
            <CardDescription className="text-gray-400 text-sm">
              Gerenciar conexão WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="flex flex-col md:flex-row gap-3">
              <Button
                onClick={handleLogout}
                disabled={loading || !isConnected}
                variant="outline"
                className="border-gray-600 hover:bg-gray-700 text-white h-12 min-h-[48px] w-full md:w-auto touch-manipulation active:scale-95 transition-transform"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Desconectar
              </Button>
              
              <Button
                onClick={handleDelete}
                disabled={loading}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 h-12 min-h-[48px] w-full md:w-auto touch-manipulation active:scale-95 transition-transform"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Deletar Instância
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="glass-card bg-gray-800/50 border-primary/20 backdrop-blur-sm">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-white text-base md:text-lg">⚙️ Configuração</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-400 text-xs md:text-sm space-y-2 p-4 md:p-6 pt-0">
            <p>
              <strong className="text-white">Evolution API:</strong> Usando credenciais configuradas em Secrets
            </p>
            <p>
              <strong className="text-white">Instância:</strong> {status?.instance || 'nexus-whatsapp'}
            </p>
            <p className="mt-4 text-xs text-gray-500">
              Para alterar a URL ou API Key, configure em Settings → Evolution API
            </p>
          </CardContent>
        </Card>
      </div>
      
      {isMobile && <BottomNav />}
    </div>
  );
};

export default EvolutionQRCode;
