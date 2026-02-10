import { useState } from 'react';
import { Bell, Send, Check, X, Loader2, Mail, MessageCircle, Smartphone } from 'lucide-react';
import { PremiumButton } from '@/platforms/shared/premium/PremiumButton';
import { PremiumCard } from '@/platforms/shared/premium/PremiumCard';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  success: boolean;
  channels: {
    push?: { success: boolean; sent?: number; error?: string };
    email?: { success: boolean; messageId?: string; error?: string };
    whatsapp?: { success: boolean; messageId?: string; error?: string };
  };
}

export default function NotificationTestPage() {
  const { toast } = useToast();
  const [testing, setTesting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, TestResult>>({});

  const testNotification = async (type: string, label: string) => {
    setTesting(type);
    
    try {
      const response = await fetch('/api/notifications/unified/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar notificação de teste');
      }

      const result = await response.json();
      setResults(prev => ({ ...prev, [type]: result }));

      // Mostrar resultado
      if (result.success) {
        toast({
          title: "✅ Notificação Enviada!",
          description: `${label} enviado com sucesso`,
        });
      } else {
        toast({
          title: "⚠️ Falha Parcial",
          description: "Algumas notificações não foram enviadas",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao testar notificação:', error);
      toast({
        title: "❌ Erro",
        description: "Falha ao enviar notificação de teste",
        variant: "destructive"
      });
    } finally {
      setTesting(null);
    }
  };

  const testCustom = async (channels: { push?: boolean; email?: boolean; whatsapp?: boolean }) => {
    setTesting('custom');
    
    try {
      const response = await fetch('/api/notifications/unified/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channels }),
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar notificação de teste');
      }

      const result = await response.json();
      setResults(prev => ({ ...prev, custom: result }));

      if (result.success) {
        toast({
          title: "✅ Notificação Enviada!",
          description: "Teste personalizado concluído",
        });
      }
    } catch (error) {
      console.error('Erro ao testar notificação:', error);
      toast({
        title: "❌ Erro",
        description: "Falha ao enviar notificação de teste",
        variant: "destructive"
      });
    } finally {
      setTesting(null);
    }
  };

  const renderChannelStatus = (channel: any) => {
    if (!channel) return <span className="text-muted-foreground">Não enviado</span>;
    
    if (channel.success) {
      return (
        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <Check className="w-4 h-4" />
          Enviado
          {channel.sent && <span className="text-xs">({channel.sent})</span>}
        </span>
      );
    }
    
    return (
      <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
        <X className="w-4 h-4" />
        Falhou
        {channel.error && <span className="text-xs">({channel.error})</span>}
      </span>
    );
  };

  const testTypes = [
    {
      id: 'calendar',
      label: 'Evento de Calendário',
      icon: '📅',
      description: 'Simula notificação de evento próximo'
    },
    {
      id: 'pluggy',
      label: 'Transação Bancária',
      icon: '💰',
      description: 'Simula notificação de nova transação'
    },
    {
      id: 'dashboard',
      label: 'Alerta de Métrica',
      icon: '📊',
      description: 'Simula alerta de métrica do dashboard'
    },
    {
      id: 'client',
      label: 'Atualização de Cliente',
      icon: '👤',
      description: 'Simula notificação de cliente'
    },
    {
      id: 'system',
      label: 'Alerta do Sistema',
      icon: '⚠️',
      description: 'Simula alerta crítico do sistema'
    }
  ];

  return (
    <div className="container mx-auto px-4 pt-0 pb-4 sm:pb-6 lg:pb-8 space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4 lg:gap-3">
        <div className="p-3 lg:p-2.5 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 shrink-0">
          <Bell className="h-8 w-8 lg:h-6 lg:w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-4xl lg:text-2xl font-black bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
            Teste de Notificações
          </h1>
          <p className="text-xl lg:text-sm text-muted-foreground/80 mt-2 lg:mt-1">
            Teste notificações em todos os canais (Push, Email, WhatsApp)
          </p>
        </div>
      </div>

      {/* Testes por Tipo */}
      <PremiumCard variant="gradient" padding="lg">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Send className="w-6 h-6" />
          Testes por Tipo
        </h2>
        <p className="text-muted-foreground mb-6">
          Teste diferentes tipos de notificações. Cada teste enviará por todos os canais configurados.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {testTypes.map((test) => (
            <div key={test.id} className="space-y-3">
              <PremiumCard variant="outlined" padding="md">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl">{test.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold">{test.label}</h3>
                    <p className="text-sm text-muted-foreground">{test.description}</p>
                  </div>
                </div>

                <PremiumButton
                  onClick={() => testNotification(test.id, test.label)}
                  isLoading={testing === test.id}
                  disabled={testing !== null}
                  className="w-full"
                  variant="secondary"
                >
                  {testing === test.id ? 'Enviando...' : 'Testar'}
                </PremiumButton>

                {results[test.id] && (
                  <div className="mt-3 pt-3 border-t border-border space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Smartphone className="w-4 h-4" />
                        Push:
                      </span>
                      {renderChannelStatus(results[test.id].channels.push)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        Email:
                      </span>
                      {renderChannelStatus(results[test.id].channels.email)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp:
                      </span>
                      {renderChannelStatus(results[test.id].channels.whatsapp)}
                    </div>
                  </div>
                )}
              </PremiumCard>
            </div>
          ))}
        </div>
      </PremiumCard>

      {/* Testes por Canal */}
      <PremiumCard variant="gradient" padding="lg">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Smartphone className="w-6 h-6" />
          Testes por Canal
        </h2>
        <p className="text-muted-foreground mb-6">
          Teste canais individuais para verificar se cada um está funcionando corretamente.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Push Only */}
          <PremiumCard variant="outlined" padding="md">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Apenas Push</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Testa notificação push no navegador
              </p>
              <PremiumButton
                onClick={() => testCustom({ push: true, email: false, whatsapp: false })}
                isLoading={testing === 'custom'}
                disabled={testing !== null}
                className="w-full"
                variant="secondary"
              >
                Testar Push
              </PremiumButton>
            </div>
          </PremiumCard>

          {/* Email Only */}
          <PremiumCard variant="outlined" padding="md">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Apenas Email</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Testa envio de email
              </p>
              <PremiumButton
                onClick={() => testCustom({ push: false, email: true, whatsapp: false })}
                isLoading={testing === 'custom'}
                disabled={testing !== null}
                className="w-full"
                variant="secondary"
              >
                Testar Email
              </PremiumButton>
            </div>
          </PremiumCard>

          {/* WhatsApp Only */}
          <PremiumCard variant="outlined" padding="md">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Apenas WhatsApp</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Testa envio via WhatsApp
              </p>
              <PremiumButton
                onClick={() => testCustom({ push: false, email: false, whatsapp: true })}
                isLoading={testing === 'custom'}
                disabled={testing !== null}
                className="w-full"
                variant="secondary"
              >
                Testar WhatsApp
              </PremiumButton>
            </div>
          </PremiumCard>
        </div>

        {results.custom && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold mb-3">Resultado do Teste Personalizado:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Push:</span>
                {renderChannelStatus(results.custom.channels.push)}
              </div>
              <div className="flex items-center justify-between">
                <span>Email:</span>
                {renderChannelStatus(results.custom.channels.email)}
              </div>
              <div className="flex items-center justify-between">
                <span>WhatsApp:</span>
                {renderChannelStatus(results.custom.channels.whatsapp)}
              </div>
            </div>
          </div>
        )}
      </PremiumCard>

      {/* Instruções */}
      <PremiumCard variant="outlined" padding="md">
        <h3 className="font-semibold mb-3">📋 Instruções para Testes</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p><strong>Desktop:</strong> Permita notificações quando solicitado. Teste em Chrome, Firefox e Edge.</p>
          <p><strong>Mobile:</strong> Instale o app (botão "Instalar App") e permita notificações. Teste em Android e iOS.</p>
          <p><strong>Email:</strong> Verifique sua caixa de entrada e spam.</p>
          <p><strong>WhatsApp:</strong> Certifique-se de que o Evolution API está configurado.</p>
        </div>
      </PremiumCard>
    </div>
  );
}
