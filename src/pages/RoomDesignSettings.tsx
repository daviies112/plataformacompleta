import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Save,
  Palette,
  Video,
  LogOut,
  Eye,
  Monitor,
  Smartphone,
  ArrowLeft,
  RefreshCw,
  Image,
  Upload,
  X,
} from "lucide-react";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { RoomDesignConfig, DEFAULT_ROOM_DESIGN_CONFIG } from "@/types/reuniao";
import { MeetingHeader } from "@/components/MeetingHeader";

const COLOR_PRESETS = [
  {
    name: "Escuro Padrão",
    colors: {
      background: "#0f172a",
      controlsBackground: "#18181b",
      controlsText: "#ffffff",
      primaryButton: "#3b82f6",
      dangerButton: "#ef4444",
      avatarBackground: "#3b82f6",
      avatarText: "#ffffff",
      participantNameBackground: "rgba(0, 0, 0, 0.6)",
      participantNameText: "#ffffff",
    },
  },
  {
    name: "Azul Profissional",
    colors: {
      background: "#1e3a5f",
      controlsBackground: "#0f2744",
      controlsText: "#ffffff",
      primaryButton: "#2563eb",
      dangerButton: "#dc2626",
      avatarBackground: "#2563eb",
      avatarText: "#ffffff",
      participantNameBackground: "rgba(0, 0, 0, 0.7)",
      participantNameText: "#ffffff",
    },
  },
  {
    name: "Verde Natureza",
    colors: {
      background: "#1a2e1a",
      controlsBackground: "#0f1f0f",
      controlsText: "#ffffff",
      primaryButton: "#22c55e",
      dangerButton: "#ef4444",
      avatarBackground: "#22c55e",
      avatarText: "#ffffff",
      participantNameBackground: "rgba(0, 0, 0, 0.6)",
      participantNameText: "#ffffff",
    },
  },
];

function ColorInput(props: { label: string; value: string; onChange: (value: string) => void }) {
  const { label, value, onChange } = props;
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value.startsWith("rgba") ? "#000000" : value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-zinc-600"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-32 h-8 text-xs bg-zinc-700 border-zinc-600"
        />
      </div>
    </div>
  );
}

export default function RoomDesignSettings() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [config, setConfig] = useState<RoomDesignConfig>(DEFAULT_ROOM_DESIGN_CONFIG);
  const [previewMode, setPreviewMode] = useState<"lobby" | "meeting" | "end">("meeting");
  const [devicePreview, setDevicePreview] = useState<"desktop" | "mobile">("desktop");
  const [isUploading, setIsUploading] = useState(false);

  const { data: designData, isLoading } = useQuery({
    queryKey: ["/api/reunioes/room-design"],
    queryFn: async () => {
      try {
        const response = await api.get("/api/reunioes/room-design");
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 401) {
          return { roomDesignConfig: null };
        }
        throw error;
      }
    },
    staleTime: 0,
    refetchOnMount: "always" as const,
  });

  useEffect(() => {
    if (designData?.roomDesignConfig) {
      const serverConfig = designData.roomDesignConfig;
      const mergedConfig: RoomDesignConfig = {
        branding: { ...DEFAULT_ROOM_DESIGN_CONFIG.branding, ...serverConfig.branding },
        colors: { ...DEFAULT_ROOM_DESIGN_CONFIG.colors, ...serverConfig.colors },
        lobby: { ...DEFAULT_ROOM_DESIGN_CONFIG.lobby, ...serverConfig.lobby },
        meeting: { ...DEFAULT_ROOM_DESIGN_CONFIG.meeting, ...serverConfig.meeting },
        endScreen: { ...DEFAULT_ROOM_DESIGN_CONFIG.endScreen, ...serverConfig.endScreen },
      };
      setConfig(mergedConfig);
    } else if (designData !== undefined) {
      setConfig(DEFAULT_ROOM_DESIGN_CONFIG);
    }
  }, [designData]);

  const saveMutation = useMutation({
    mutationFn: async (newConfig: RoomDesignConfig) => {
      const response = await api.patch("/api/reunioes/room-design", { roomDesignConfig: newConfig });
      return response.data;
    },
    onSuccess: () => {
      toast({ title: "Configurações salvas!", description: "As personalizações foram aplicadas com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["/api/reunioes/room-design"] });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar as configurações." });
    },
  });

  const updateConfig = (path: string, value: any) => {
    setConfig((prev) => {
      const newConfig = { ...prev };
      const keys = path.split(".");
      let current: any = newConfig;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  const applyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setConfig((prev) => ({
      ...prev,
      colors: { ...preset.colors },
    }));
  };

  const handleSave = () => {
    saveMutation.mutate(config);
  };

  const handleReset = () => {
    setConfig(DEFAULT_ROOM_DESIGN_CONFIG);
    toast({ title: "Configurações restauradas", description: "O design foi restaurado para o padrão." });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);

      const response = await api.post("/api/upload/logo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.url) {
        updateConfig("branding.logo", response.data.url);
        toast({ title: "Logo enviado!", description: "O logo foi carregado com sucesso." });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.response?.data?.message || "Não foi possível enviar o logo.",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = () => {
    updateConfig("branding.logo", null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MeetingHeader title="Design" description="Personalize o visual das suas salas de reunião." />

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <Tabs defaultValue="branding" className="space-y-4">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="branding" className="gap-2">
                <Image className="h-4 w-4" />
                <span className="hidden sm:inline">Marca</span>
              </TabsTrigger>
              <TabsTrigger value="colors" className="gap-2">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Cores</span>
              </TabsTrigger>
              <TabsTrigger value="lobby" className="gap-2">
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Lobby</span>
              </TabsTrigger>
              <TabsTrigger value="meeting" className="gap-2">
                <Video className="h-4 w-4" />
                <span className="hidden sm:inline">Reunião</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="branding">
              <Card>
                <CardHeader>
                  <CardTitle>Logo da Empresa</CardTitle>
                  <CardDescription>Configure o logo que aparecerá nas páginas de lobby e reunião</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label>Logo da Empresa</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/svg+xml,image/webp"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    {!config.branding.logo ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                      >
                        {isUploading ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Enviando...</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="h-8 w-8 text-muted-foreground" />
                            <p className="text-sm font-medium">Clique para enviar o logo</p>
                            <p className="text-xs text-muted-foreground">JPG, PNG, GIF, SVG ou WebP (máx. 5MB)</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="relative p-4 bg-muted rounded-lg">
                        <div className="flex items-center justify-center">
                          <img src={config.branding.logo} alt="Logo" className="max-h-20 object-contain" />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={handleRemoveLogo}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Nome da Empresa</Label>
                    <Input
                      value={config.branding.companyName || ""}
                      onChange={(e) => updateConfig("branding.companyName", e.target.value)}
                      placeholder="Nome da sua empresa"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Exibir nome da empresa</Label>
                      <p className="text-xs text-muted-foreground">Mostrar ao lado do logo</p>
                    </div>
                    <Switch
                      checked={config.branding.showCompanyName || false}
                      onCheckedChange={(checked) => updateConfig("branding.showCompanyName", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Logo no lobby</Label>
                      <p className="text-xs text-muted-foreground">Exibir antes de entrar</p>
                    </div>
                    <Switch
                      checked={config.branding.showLogoInLobby !== false}
                      onCheckedChange={(checked) => updateConfig("branding.showLogoInLobby", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Logo na reunião</Label>
                      <p className="text-xs text-muted-foreground">Exibir durante a chamada</p>
                    </div>
                    <Switch
                      checked={config.branding.showLogoInMeeting !== false}
                      onCheckedChange={(checked) => updateConfig("branding.showLogoInMeeting", checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="colors">
              <Card>
                <CardHeader>
                  <CardTitle>Paleta de Cores</CardTitle>
                  <CardDescription>Personalize as cores da interface</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Temas Predefinidos</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {COLOR_PRESETS.map((preset) => (
                        <Button
                          key={preset.name}
                          variant="outline"
                          className="flex flex-col h-auto py-3"
                          onClick={() => applyPreset(preset)}
                        >
                          <div
                            className="w-8 h-8 rounded-full mb-2"
                            style={{ backgroundColor: preset.colors.primaryButton }}
                          />
                          <span className="text-xs">{preset.name}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Cores Personalizadas</Label>
                    <ColorInput
                      label="Fundo"
                      value={config.colors.background}
                      onChange={(v) => updateConfig("colors.background", v)}
                    />
                    <ColorInput
                      label="Controles"
                      value={config.colors.controlsBackground}
                      onChange={(v) => updateConfig("colors.controlsBackground", v)}
                    />
                    <ColorInput
                      label="Texto"
                      value={config.colors.controlsText}
                      onChange={(v) => updateConfig("colors.controlsText", v)}
                    />
                    <ColorInput
                      label="Botão Principal"
                      value={config.colors.primaryButton}
                      onChange={(v) => updateConfig("colors.primaryButton", v)}
                    />
                    <ColorInput
                      label="Botão Perigo"
                      value={config.colors.dangerButton}
                      onChange={(v) => updateConfig("colors.dangerButton", v)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="lobby">
              <Card>
                <CardHeader>
                  <CardTitle>Tela de Lobby</CardTitle>
                  <CardDescription>Configure a tela de espera antes de entrar na reunião</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input
                      value={config.lobby.title || ""}
                      onChange={(e) => updateConfig("lobby.title", e.target.value)}
                      placeholder="Pronto para participar?"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Texto do Botão</Label>
                    <Input
                      value={config.lobby.buttonText || ""}
                      onChange={(e) => updateConfig("lobby.buttonText", e.target.value)}
                      placeholder="Participar agora"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="meeting">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações da Reunião</CardTitle>
                  <CardDescription>Configure os controles disponíveis na reunião</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Compartilhar tela</Label>
                      <p className="text-xs text-muted-foreground">Permitir compartilhamento de tela</p>
                    </div>
                    <Switch
                      checked={config.meeting.enableScreenShare !== false}
                      onCheckedChange={(checked) => updateConfig("meeting.enableScreenShare", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Reações</Label>
                      <p className="text-xs text-muted-foreground">Permitir reações durante a chamada</p>
                    </div>
                    <Switch
                      checked={config.meeting.enableReactions !== false}
                      onCheckedChange={(checked) => updateConfig("meeting.enableReactions", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Levantar a mão</Label>
                      <p className="text-xs text-muted-foreground">Permitir levantar a mão</p>
                    </div>
                    <Switch
                      checked={config.meeting.enableRaiseHand !== false}
                      onCheckedChange={(checked) => updateConfig("meeting.enableRaiseHand", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Contagem de participantes</Label>
                      <p className="text-xs text-muted-foreground">Mostrar número de participantes</p>
                    </div>
                    <Switch
                      checked={config.meeting.showParticipantCount !== false}
                      onCheckedChange={(checked) => updateConfig("meeting.showParticipantCount", checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:sticky lg:top-6 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Preview</CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant={devicePreview === "desktop" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setDevicePreview("desktop")}
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={devicePreview === "mobile" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setDevicePreview("mobile")}
                  >
                    <Smartphone className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-2 mb-4 flex-wrap">
                <Button
                  variant={previewMode === "lobby" ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setPreviewMode("lobby")}
                >
                  Lobby
                </Button>
                <Button
                  variant={previewMode === "meeting" ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setPreviewMode("meeting")}
                >
                  Reunião
                </Button>
                <Button
                  variant={previewMode === "end" ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setPreviewMode("end")}
                >
                  Fim
                </Button>
              </div>

              <div
                className={
                  devicePreview === "mobile"
                    ? "mx-auto w-[280px] border-4 border-zinc-800 rounded-3xl overflow-hidden shadow-2xl"
                    : "shadow-lg border border-zinc-800 rounded-xl overflow-hidden"
                }
              >
                <div
                  className="relative min-h-[400px] flex flex-col transition-all duration-300"
                  style={{ backgroundColor: config.colors.background }}
                >
                  {/* Branding Header in Preview */}
                  {(previewMode === "lobby" && config.branding.showLogoInLobby !== false) ||
                  (previewMode === "meeting" && config.branding.showLogoInMeeting !== false) ? (
                    <div className="p-4 flex items-center gap-3">
                      {config.branding.logo && (
                        <img
                          src={config.branding.logo}
                          alt="Logo"
                          className="h-8 w-auto object-contain"
                        />
                      )}
                      {config.branding.showCompanyName && (
                        <span className="font-bold" style={{ color: config.colors.controlsText }}>
                          {config.branding.companyName || "Sua Empresa"}
                        </span>
                      )}
                    </div>
                  ) : null}

                  {/* Preview Content based on mode */}
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    {previewMode === "lobby" && (
                      <div className="space-y-6 w-full max-w-sm animate-in fade-in zoom-in duration-300">
                        <div className="space-y-2">
                          <h2
                            className="text-2xl font-bold"
                            style={{ color: config.colors.controlsText }}
                          >
                            {config.lobby.title || "Pronto para participar?"}
                          </h2>
                          <p className="text-sm opacity-70" style={{ color: config.colors.controlsText }}>
                            A reunião ainda não começou.
                          </p>
                        </div>
                        <div
                          className="aspect-video bg-zinc-800 rounded-lg flex items-center justify-center border-2 border-dashed border-zinc-700"
                        >
                          <Video className="h-12 w-12 text-zinc-600" />
                        </div>
                        <Button
                          className="w-full h-12 text-lg font-semibold"
                          style={{
                            backgroundColor: config.colors.primaryButton,
                            color: "#ffffff",
                          }}
                        >
                          {config.lobby.buttonText || "Participar agora"}
                        </Button>
                      </div>
                    )}

                    {previewMode === "meeting" && (
                      <div className="w-full h-full flex flex-col animate-in fade-in duration-300">
                        {/* Participants Grid Simulation */}
                        <div className="flex-1 grid grid-cols-2 gap-2 p-2">
                          {[1, 2].map((i) => (
                            <div
                              key={i}
                              className="relative aspect-video bg-zinc-900 rounded-lg flex items-center justify-center overflow-hidden border border-zinc-800"
                            >
                              <div
                                className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
                                style={{
                                  backgroundColor: config.colors.avatarBackground || config.colors.primaryButton,
                                  color: config.colors.avatarText || "#ffffff",
                                }}
                              >
                                {i === 1 ? "VC" : "JD"}
                              </div>
                              <div
                                className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] font-medium"
                                style={{
                                  backgroundColor: config.colors.participantNameBackground || "rgba(0,0,0,0.6)",
                                  color: config.colors.participantNameText || "#ffffff",
                                }}
                              >
                                {i === 1 ? "Você" : "João Silva"}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Controls Bar Simulation */}
                        <div
                          className="mt-auto p-3 flex items-center justify-center gap-3 border-t"
                          style={{
                            backgroundColor: config.colors.controlsBackground,
                            borderColor: "rgba(255,255,255,0.1)",
                          }}
                        >
                          <div className="flex gap-2">
                            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center">
                              <Video className="h-4 w-4" style={{ color: config.colors.controlsText }} />
                            </div>
                            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center">
                              <Monitor className="h-4 w-4" style={{ color: config.colors.controlsText }} />
                            </div>
                          </div>
                          
                          <div className="h-10 px-4 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: config.colors.dangerButton, color: "#ffffff" }}>
                            Sair
                          </div>

                          <div className="flex gap-2">
                            {config.meeting.enableScreenShare && (
                              <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center opacity-50">
                                <Monitor className="h-4 w-4" style={{ color: config.colors.controlsText }} />
                              </div>
                            )}
                            {config.meeting.enableReactions && (
                              <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center opacity-50 text-xs" style={{ color: config.colors.controlsText }}>
                                😊
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {previewMode === "end" && (
                      <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                        <div
                          className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
                          style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                        >
                          <LogOut className="h-10 w-10" style={{ color: config.colors.controlsText }} />
                        </div>
                        <div className="space-y-2">
                          <h2
                            className="text-2xl font-bold"
                            style={{ color: config.colors.controlsText }}
                          >
                            {config.endScreen.title || "Você saiu da reunião"}
                          </h2>
                          <p className="text-sm opacity-70" style={{ color: config.colors.controlsText }}>
                            Obrigado por participar.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          className="h-10"
                          style={{
                            borderColor: config.colors.primaryButton,
                            color: config.colors.primaryButton,
                          }}
                        >
                          Voltar ao Início
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
