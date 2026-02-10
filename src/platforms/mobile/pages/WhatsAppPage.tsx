import { useState, useEffect } from 'react';
import { MobileCard, MobileButton } from '@/platforms/mobile/components/premium';
import { toast } from 'sonner';
import { 
  QrCode, 
  RefreshCw, 
  LogOut, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Smartphone,
  Zap,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QRCodeData {
  base64: string;
  code: string;
}

interface StatusData {
  state: string;
  instance: string;
}

const hapticFeedback = (intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
  if ('vibrate' in navigator) {
    const patterns = {
      light: 10,
      medium: 20,
      heavy: 30
    };
    navigator.vibrate(patterns[intensity]);
  }
};

const WhatsAppPage = () => {
  const [qrCode, setQrCode] = useState<QRCodeData | null>(null);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchQRCode = async () => {
    setLoading(true);
    hapticFeedback('light');
    
    try {
      const response = await fetch('/api/evolution/qrcode');
      const data = await response.json();
      
      if (data.success) {
        setQrCode(data.qrcode);
        hapticFeedback('heavy');
        toast.success('QR Code gerado com sucesso!', {
          description: 'Escaneie com seu WhatsApp',
          className: 'bg-white/[0.03] backdrop-blur-xl backdrop-saturate-180 border-white/10',
        });
      } else {
        hapticFeedback('medium');
        toast.error('Erro ao gerar QR Code', {
          description: data.error || 'Verifique as configurações',
          className: 'bg-red-500/10 backdrop-blur-xl border-red-500/20',
        });
      }
    } catch (err) {
      hapticFeedback('medium');
      toast.error('Erro de conexão', {
        description: 'Verifique a API Evolution',
        className: 'bg-red-500/10 backdrop-blur-xl border-red-500/20',
      });
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
    hapticFeedback('medium');
    
    try {
      const response = await fetch('/api/evolution/logout', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        hapticFeedback('heavy');
        toast.success('Desconectado com sucesso!', {
          className: 'bg-white/[0.03] backdrop-blur-xl backdrop-saturate-180 border-white/10',
        });
        setQrCode(null);
        fetchStatus();
      } else {
        hapticFeedback('medium');
        toast.error('Erro ao desconectar', {
          description: data.error,
          className: 'bg-red-500/10 backdrop-blur-xl border-red-500/20',
        });
      }
    } catch (err) {
      toast.error('Erro ao desconectar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    hapticFeedback('heavy');
    
    const confirmed = window.confirm(
      'Tem certeza que deseja deletar a instância? Isso removerá todas as configurações.'
    );
    
    if (!confirmed) return;
    
    setLoading(true);
    hapticFeedback('medium');
    
    try {
      const response = await fetch('/api/evolution/delete', { method: 'DELETE' });
      const data = await response.json();
      
      if (data.success) {
        hapticFeedback('heavy');
        toast.success('Instância deletada com sucesso!', {
          className: 'bg-white/[0.03] backdrop-blur-xl backdrop-saturate-180 border-white/10',
        });
        setQrCode(null);
        setStatus(null);
      } else {
        hapticFeedback('medium');
        toast.error('Erro ao deletar instância', {
          description: data.error,
          className: 'bg-red-500/10 backdrop-blur-xl border-red-500/20',
        });
      }
    } catch (err) {
      toast.error('Erro ao deletar instância');
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background/98 to-muted/5 pb-32">
      <div className="container mx-auto px-4 pt-6 space-y-6">
        
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                WhatsApp
              </h1>
              <p className="text-sm text-muted-foreground">
                Evolution API Integration
              </p>
            </div>
          </div>
        </div>

        <MobileCard variant="elevated" padding="md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-3 h-3 rounded-full animate-pulse',
                  isConnected ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]'
                )} />
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {isConnected ? 'Conectado' : 'Desconectado'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {status?.instance || 'Verificando...'}
                  </div>
                </div>
              </div>
              <div className={cn(
                'px-3 py-1.5 rounded-full flex items-center gap-2',
                isConnected 
                  ? 'bg-green-500/10 border border-green-500/20' 
                  : 'bg-red-500/10 border border-red-500/20'
              )}>
                {isConnected ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <span className={cn(
                  'text-xs font-semibold',
                  isConnected ? 'text-green-400' : 'text-red-400'
                )}>
                  {status?.state || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </MobileCard>

        {!isConnected && (
          <MobileCard variant="elevated" padding="lg">
            <div className="flex flex-col items-center gap-6 py-4">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                <QrCode className="w-10 h-10 text-primary" />
              </div>
              
              <div className="text-center">
                <h2 className="text-xl font-bold text-foreground mb-2">
                  Conectar WhatsApp
                </h2>
                <p className="text-sm text-muted-foreground">
                  Escaneie o QR Code para conectar sua conta
                </p>
              </div>

              {qrCode ? (
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary via-primary/70 to-primary rounded-2xl blur-sm opacity-30" />
                  <div className="relative bg-white p-4 rounded-2xl shadow-xl">
                    <img 
                      src={qrCode.base64} 
                      alt="QR Code WhatsApp"
                      className="w-64 h-64"
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-green-500/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-green-500/40 animate-pulse">
                    <Zap className="w-6 h-6 text-green-400" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="w-64 h-64 rounded-2xl bg-white/[0.03] border-2 border-dashed border-white/10 flex items-center justify-center">
                    <QrCode className="w-24 h-24 text-muted-foreground/30" />
                  </div>
                </div>
              )}

              <MobileButton
                variant="primary"
                onClick={fetchQRCode}
                isLoading={loading}
                className="w-full"
              >
                <RefreshCw className={cn('w-5 h-5 mr-2', loading && 'animate-spin')} />
                {loading ? 'Gerando...' : qrCode ? 'Atualizar QR Code' : 'Gerar QR Code'}
              </MobileButton>
            </div>
          </MobileCard>
        )}

        {isConnected && (
          <MobileCard variant="elevated" padding="lg">
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full" />
                <div className="relative w-24 h-24 rounded-full bg-green-500/10 border-4 border-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-green-400" />
                </div>
              </div>
              
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  WhatsApp Conectado!
                </h2>
                <p className="text-sm text-muted-foreground">
                  Sua instância está ativa e pronta para uso
                </p>
              </div>

              <div className="w-full p-4 rounded-xl bg-green-500/[0.05] border border-green-500/20">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-green-400">
                      Conexão Ativa
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Você pode enviar e receber mensagens normalmente
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </MobileCard>
        )}

        <MobileCard variant="default" padding="sm">
          <div className="p-4 space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
              <Info className="w-4 h-4 text-primary" />
              Como Conectar
            </div>
            <ol className="space-y-2 text-sm text-muted-foreground pl-6">
              <li className="relative before:content-['1.'] before:absolute before:-left-6 before:font-bold before:text-primary">
                Abra o WhatsApp no seu celular
              </li>
              <li className="relative before:content-['2.'] before:absolute before:-left-6 before:font-bold before:text-primary">
                Toque em Menu (⋮) → Aparelhos conectados
              </li>
              <li className="relative before:content-['3.'] before:absolute before:-left-6 before:font-bold before:text-primary">
                Toque em "Conectar um aparelho"
              </li>
              <li className="relative before:content-['4.'] before:absolute before:-left-6 before:font-bold before:text-primary">
                Aponte seu telefone para escanear o QR Code
              </li>
            </ol>
          </div>
        </MobileCard>

        {isConnected && (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-muted-foreground px-1">
              Ações
            </div>
            
            <MobileButton
              variant="secondary"
              onClick={handleLogout}
              isLoading={loading}
              className="w-full"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Desconectar WhatsApp
            </MobileButton>
            
            <MobileButton
              variant="danger"
              onClick={handleDelete}
              isLoading={loading}
              className="w-full"
            >
              <Trash2 className="w-5 h-5 mr-2" />
              Deletar Instância
            </MobileButton>
          </div>
        )}

        <MobileCard variant="default" padding="md">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Zap className="w-4 h-4 text-primary" />
              Configuração
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between items-center">
                <span>Evolution API</span>
                <span className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary font-medium">
                  Configurado
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Instância</span>
                <span className="text-foreground font-medium">
                  {status?.instance || 'nexus-whatsapp'}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-white/5">
              <p className="text-xs text-muted-foreground">
                Para alterar configurações, acesse Settings → Evolution API
              </p>
            </div>
          </div>
        </MobileCard>

        <div className="h-24" />
      </div>
    </div>
  );
};

export default WhatsAppPage;
