import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wifi, WifiOff, QrCode, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EvolutionConnection {
  id: string;
  company_id: string;
  instance_name: string;
  api_url: string;
  api_key: string;
  phone_number?: string;
  status: 'connected' | 'disconnected' | 'connecting';
  qr_code_url?: string;
  connected_at?: string;
}

export default function EvolutionConfig() {
  const [connection, setConnection] = useState<EvolutionConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    api_url: '',
    api_key: '',
    instance_name: ''
  });

  useEffect(() => {
    fetchCompanyAndConnection();
  }, []);

  const fetchCompanyAndConnection = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data: companies } = await supabase
        .from('companies')
        .select('id')
        .limit(1)
        .single();

      if (companies?.id) {
        setCompanyId(companies.id);
        
        const response = await fetch(`/api/evolution/connection?companyId=${companies.id}`);
        const data = await response.json();
        
        if (data.success && data.connection) {
          setConnection(data.connection);
          setFormData({
            api_url: data.connection.api_url || '',
            api_key: data.connection.api_key || '',
            instance_name: data.connection.instance_name || ''
          });
        }
      }
    } catch (err: any) {
      console.error('Error fetching connection:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!companyId || !formData.api_url || !formData.api_key || !formData.instance_name) {
      toast.error('Preencha todos os campos');
      return;
    }

    setConnecting(true);

    try {
      const response = await fetch('/api/evolution/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          api_url: formData.api_url,
          api_key: formData.api_key,
          instance_name: formData.instance_name
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Conexão iniciada! Escaneie o QR code com seu WhatsApp.');
        
        setConnection({
          id: data.connection_id || '',
          company_id: companyId,
          instance_name: formData.instance_name,
          api_url: formData.api_url,
          api_key: formData.api_key,
          status: 'connecting',
          qr_code_url: data.qr_code
        });

        startStatusPolling();
      } else {
        toast.error(data.error || 'Erro ao conectar');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao conectar');
    } finally {
      setConnecting(false);
    }
  };

  const checkStatus = async () => {
    if (!connection?.instance_name || !companyId) return;

    setCheckingStatus(true);

    try {
      const response = await fetch(
        `/api/evolution/status/${connection.instance_name}?companyId=${companyId}`
      );
      const data = await response.json();

      if (data.status === 'connected') {
        setConnection(prev => prev ? {
          ...prev,
          status: 'connected',
          phone_number: data.phone_number,
          connected_at: new Date().toISOString(),
          qr_code_url: undefined
        } : null);
        toast.success('WhatsApp conectado com sucesso!');
      } else if (data.status === 'disconnected') {
        setConnection(prev => prev ? {
          ...prev,
          status: 'disconnected',
          qr_code_url: undefined
        } : null);
      }
    } catch (err: any) {
      console.error('Error checking status:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const startStatusPolling = () => {
    let attempts = 0;
    const maxAttempts = 60;
    
    const poll = setInterval(async () => {
      attempts++;
      
      if (attempts > maxAttempts) {
        clearInterval(poll);
        toast.error('Tempo esgotado. Tente novamente.');
        return;
      }

      try {
        const response = await fetch(
          `/api/evolution/status/${formData.instance_name}?companyId=${companyId}`
        );
        const data = await response.json();

        if (data.status === 'connected') {
          clearInterval(poll);
          setConnection(prev => prev ? {
            ...prev,
            status: 'connected',
            phone_number: data.phone_number,
            connected_at: new Date().toISOString(),
            qr_code_url: undefined
          } : null);
          toast.success('WhatsApp conectado com sucesso!');
        }
      } catch (err) {
        console.log('Polling status...');
      }
    }, 5000);
  };

  const handleDisconnect = async () => {
    if (!connection) return;

    try {
      if (supabase) {
        await supabase
          .from('evolution_connections')
          .update({
            status: 'disconnected',
            disconnected_at: new Date().toISOString()
          } as any)
          .eq('id', connection.id);
      }

      setConnection(prev => prev ? { ...prev, status: 'disconnected' } : null);
      toast.success('Conexão encerrada');
    } catch (err: any) {
      toast.error('Erro ao desconectar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!supabase) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolution API - WhatsApp</CardTitle>
          <CardDescription>
            Configure as credenciais do Supabase primeiro para habilitar esta funcionalidade.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Evolution API - WhatsApp</h1>
        <p className="text-muted-foreground mt-1">
          Configure a integração com WhatsApp para chat em tempo real com revendedores.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Configuração da Conexão
            </CardTitle>
            <CardDescription>
              Insira as credenciais da sua Evolution API para conectar o WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api_url">URL da API</Label>
              <Input
                id="api_url"
                placeholder="https://api.evolution-api.com"
                value={formData.api_url}
                onChange={(e) => setFormData(prev => ({ ...prev, api_url: e.target.value }))}
                disabled={connection?.status === 'connected'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_key">API Key</Label>
              <Input
                id="api_key"
                type="password"
                placeholder="Sua chave de API"
                value={formData.api_key}
                onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                disabled={connection?.status === 'connected'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instance_name">Nome da Instância</Label>
              <Input
                id="instance_name"
                placeholder="minha-empresa-whatsapp"
                value={formData.instance_name}
                onChange={(e) => setFormData(prev => ({ ...prev, instance_name: e.target.value }))}
                disabled={connection?.status === 'connected'}
              />
            </div>

            <div className="flex gap-2 pt-4">
              {connection?.status === 'connected' ? (
                <Button 
                  variant="destructive" 
                  onClick={handleDisconnect}
                  className="w-full"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Desconectar
                </Button>
              ) : (
                <Button 
                  onClick={handleConnect} 
                  disabled={connecting || !formData.api_url || !formData.api_key || !formData.instance_name}
                  className="w-full"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <Wifi className="h-4 w-4 mr-2" />
                      Conectar WhatsApp
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {connection?.status === 'connected' ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : connection?.status === 'connecting' ? (
                <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-muted-foreground" />
              )}
              Status da Conexão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <Badge 
                variant={connection?.status === 'connected' ? 'default' : 'secondary'}
                className={
                  connection?.status === 'connected' ? 'bg-green-500' :
                  connection?.status === 'connecting' ? 'bg-yellow-500' :
                  'bg-gray-500'
                }
              >
                {connection?.status === 'connected' ? 'Conectado' :
                 connection?.status === 'connecting' ? 'Aguardando QR Code' :
                 'Desconectado'}
              </Badge>
            </div>

            {connection?.phone_number && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Número:</span>
                <span className="text-sm text-muted-foreground">{connection.phone_number}</span>
              </div>
            )}

            {connection?.connected_at && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Conectado em:</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(connection.connected_at).toLocaleString('pt-BR')}
                </span>
              </div>
            )}

            {connection?.status === 'connecting' && connection?.qr_code_url && (
              <div className="mt-4 p-4 bg-white rounded-lg flex flex-col items-center">
                <p className="text-sm font-medium text-gray-900 mb-3">
                  Escaneie o QR Code com seu WhatsApp:
                </p>
                <img 
                  src={connection.qr_code_url} 
                  alt="QR Code" 
                  className="w-48 h-48 object-contain"
                />
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Abra o WhatsApp {'>'} Configurações {'>'} Dispositivos Conectados {'>'} Conectar Dispositivo
                </p>
              </div>
            )}

            {connection?.status === 'connecting' && (
              <Button 
                variant="outline" 
                onClick={checkStatus}
                disabled={checkingStatus}
                className="w-full"
              >
                {checkingStatus ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Verificar Status
                  </>
                )}
              </Button>
            )}

            {connection?.status === 'connected' && (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm text-green-700">
                  WhatsApp conectado e pronto para uso!
                </span>
              </div>
            )}

            {!connection && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <WifiOff className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Nenhuma conexão configurada. Preencha os campos ao lado para conectar.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Como funciona</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Obtenha suas credenciais da Evolution API (URL, API Key)</li>
            <li>Escolha um nome único para sua instância (ex: minha-empresa-whatsapp)</li>
            <li>Clique em "Conectar WhatsApp" para gerar o QR Code</li>
            <li>Escaneie o QR Code com seu WhatsApp Business</li>
            <li>Aguarde a confirmação da conexão</li>
            <li>Pronto! As mensagens dos revendedores serão enviadas para seu WhatsApp</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
