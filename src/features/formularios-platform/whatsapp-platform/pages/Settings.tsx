import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Save, TestTube, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { configManager, EvolutionConfigWhatsapp } from "../lib/config";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QRCodeDisplay } from "../components/QRCodeDisplay";
import { LabelManager } from "../components/LabelManager";

const Settings = () => {
  const [, setLocation] = useLocation();
  const [config, setConfig] = useState<EvolutionConfigWhatsapp>({
    apiUrlWhatsapp: "",
    apiKeyWhatsapp: "",
    instanceWhatsapp: "",
  });
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; connected: boolean; state: string; message: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const savedConfig = configManager.getConfig();
    if (savedConfig) {
      setConfig(savedConfig);
    }
  }, []);

  const handleInputChange = (field: keyof EvolutionConfigWhatsapp, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setTestResult(null);
  };

  const handleSave = () => {
    if (!config.apiUrlWhatsapp || !config.apiKeyWhatsapp || !config.instanceWhatsapp) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Validar formato da URL
    try {
      new URL(config.apiUrlWhatsapp);
    } catch {
      toast.error("URL da API inválida", {
        description: "Insira uma URL válida (ex: https://evolution.seudominio.com)"
      });
      return;
    }

    // Salvar configuração
    configManager.setConfig(config);
    console.log('Configurações salvas:', {
      apiUrlWhatsapp: config.apiUrlWhatsapp,
      instanceWhatsapp: config.instanceWhatsapp,
      hasApiKey: !!config.apiKeyWhatsapp
    });

    // Verificar se salvou corretamente
    const savedConfig = configManager.getConfig();
    if (savedConfig && 
        savedConfig.apiUrlWhatsapp === config.apiUrlWhatsapp && 
        savedConfig.apiKeyWhatsapp === config.apiKeyWhatsapp && 
        savedConfig.instanceWhatsapp === config.instanceWhatsapp) {
      setHasChanges(false);
      toast.success("Configurações salvas com sucesso!", {
        description: "As credenciais foram armazenadas localmente",
      });
    } else {
      toast.error("Erro ao salvar configurações", {
        description: "Tente novamente"
      });
    }
  };

  const handleTestConnection = async () => {
    if (!config.apiUrlWhatsapp || !config.apiKeyWhatsapp || !config.instanceWhatsapp) {
      toast.error("Preencha todos os campos antes de testar");
      return;
    }

    // Validar formato da URL antes de testar
    try {
      new URL(config.apiUrlWhatsapp);
    } catch {
      toast.error("URL da API inválida", {
        description: "Insira uma URL válida antes de testar"
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      console.log('Iniciando teste de conexão...');
      const result = await configManager.testConnection(config);
      setTestResult(result);

      if (result.success && result.connected) {
        toast.success("✅ Conexão perfeita!", {
          description: result.message,
          duration: 5000,
        });
      } else if (result.success && !result.connected) {
        toast.warning("⚠️ API configurada, mas WhatsApp desconectado", {
          description: result.message,
          duration: 8000,
        });
      } else {
        toast.error("❌ Falha na conexão", {
          description: result.message,
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Erro no teste de conexão:', error);
      setTestResult({
        success: false,
        connected: false,
        state: 'error',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      toast.error("Erro ao testar conexão", {
        description: error instanceof Error ? error.message : "Erro desconhecido"
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleClear = () => {
    if (window.confirm("Tem certeza que deseja limpar todas as configurações?")) {
      configManager.clearConfig();
      setConfig({
        apiUrlWhatsapp: "",
        apiKeyWhatsapp: "",
        instanceWhatsapp: "",
      });
      setHasChanges(false);
      setTestResult(null);
      toast.info("Configurações limpas");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/whatsapp")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Configurações</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie suas credenciais da Evolution API
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Status da Configuração
                {configManager.isConfigured() ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                )}
              </CardTitle>
              <CardDescription>
                {configManager.isConfigured()
                  ? "Credenciais configuradas no sistema"
                  : "Configure as credenciais para começar"}
              </CardDescription>
            </CardHeader>
            {testResult && testResult.success && (
              <CardContent>
                <div className="p-4 rounded-lg border bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    {testResult.connected ? (
                      <>
                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="font-semibold text-green-600">WhatsApp Conectado</span>
                      </>
                    ) : (
                      <>
                        <div className="h-2 w-2 bg-yellow-500 rounded-full" />
                        <span className="font-semibold text-yellow-600">WhatsApp Desconectado</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {testResult.connected 
                      ? "Pronto para enviar e receber mensagens" 
                      : "Conecte no Evolution API Manager para enviar mensagens"}
                  </p>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Configuration Form */}
          <Card>
            <CardHeader>
              <CardTitle>Credenciais da Evolution API</CardTitle>
              <CardDescription>
                Insira suas credenciais para conectar com a Evolution API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* API URL */}
              <div className="space-y-2">
                <Label htmlFor="apiUrlWhatsapp">
                  URL da API <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="apiUrlWhatsapp"
                  type="url"
                  placeholder="https://seu-servidor-evolution.com"
                  value={config.apiUrlWhatsapp}
                  onChange={(e) => handleInputChange("apiUrlWhatsapp", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  URL base do servidor Evolution API
                </p>
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <Label htmlFor="apiKeyWhatsapp">
                  API Key <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="apiKeyWhatsapp"
                  type="password"
                  placeholder="sua_chave_api_aqui"
                  value={config.apiKeyWhatsapp}
                  onChange={(e) => handleInputChange("apiKeyWhatsapp", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Chave de autenticação da API
                </p>
              </div>

              {/* Instance */}
              <div className="space-y-2">
                <Label htmlFor="instanceWhatsapp">
                  Nome da Instância <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="instanceWhatsapp"
                  type="text"
                  placeholder="nome_da_sua_instancia"
                  value={config.instanceWhatsapp}
                  onChange={(e) => handleInputChange("instanceWhatsapp", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Nome da instância do WhatsApp configurada
                </p>
              </div>

              {/* Test Result */}
              {testResult !== null && (
                <Alert variant={testResult.success && testResult.connected ? "default" : testResult.success ? "default" : "destructive"}>
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 font-semibold">
                        {testResult.success && testResult.connected ? (
                          <><CheckCircle2 className="h-4 w-4 text-green-500" /> Status da Conexão</>
                        ) : testResult.success ? (
                          <><CheckCircle2 className="h-4 w-4 text-yellow-500" /> Status da Conexão</>
                        ) : (
                          <><XCircle className="h-4 w-4" /> Erro na Conexão</>
                        )}
                      </div>
                      <p className={testResult.success && testResult.connected ? "text-green-600" : testResult.success ? "text-yellow-600" : ""}>{testResult.message}</p>
                      {testResult.success && !testResult.connected && (
                        <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                          <p className="font-medium mb-2">💡 O que isso significa?</p>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                            <li>Suas credenciais estão corretas ✅</li>
                            <li>A API Evolution está acessível ✅</li>
                            <li>Mas o WhatsApp está desconectado ⚠️</li>
                          </ul>
                          <p className="mt-3 font-medium">📲 Para enviar mensagens:</p>
                          <p className="text-muted-foreground">Acesse o Evolution API Manager e conecte a instância "{config.instanceWhatsapp}" escaneando o QR Code do WhatsApp.</p>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  Salvar Configurações
                </Button>

                <Button
                  onClick={handleTestConnection}
                  disabled={isTesting || !config.apiUrlWhatsapp || !config.apiKeyWhatsapp || !config.instanceWhatsapp}
                  variant="secondary"
                  className="gap-2"
                >
                  <TestTube className="h-4 w-4" />
                  {isTesting ? "Testando..." : "Testar Conexão"}
                </Button>

                <Button
                  onClick={handleClear}
                  disabled={!configManager.isConfigured()}
                  variant="destructive"
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Limpar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">📝 Como obter as credenciais?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <strong className="text-foreground">URL da API:</strong>
                <p className="text-muted-foreground mt-1">
                  Endereço do servidor onde a Evolution API está instalada (ex:
                  http://103.199.187.145:8080)
                </p>
              </div>
              <div>
                <strong className="text-foreground">API Key:</strong>
                <p className="text-muted-foreground mt-1">
                  ⚠️ Esta é a chave <strong>GLOBAL</strong> do servidor Evolution API, não a específica da instância.
                </p>
                <p className="text-muted-foreground mt-1">
                  Procure pela variável <code className="bg-muted px-1 py-0.5 rounded">AUTHENTICATION_API_KEY</code> nas 
                  configurações do servidor Evolution (geralmente no arquivo .env do servidor).
                </p>
              </div>
              <div>
                <strong className="text-foreground">Nome da Instância:</strong>
                <p className="text-muted-foreground mt-1">
                  Nome da instância criada para seu número do WhatsApp (ex: nexus intelligence)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Label Manager */}
          <LabelManager />

          {/* QR Code Section */}
          {configManager.isConfigured() && (
            <div className="mt-8">
              <QRCodeDisplay />
            </div>
          )}

          {/* Security Notice */}
          <Alert>
            <AlertDescription className="text-xs">
              🔒 <strong>Segurança:</strong> As credenciais são armazenadas
              localmente no seu navegador e no servidor. Para uso em produção, recomendamos
              usar variáveis de ambiente para gerenciamento seguro de secrets.
            </AlertDescription>
          </Alert>
        </div>
      </main>
    </div>
  );
};

export default Settings;
