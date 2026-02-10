import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Save,
  Palette,
  Video,
  LogOut,
  Settings,
  Eye,
  Monitor,
  Smartphone,
  ArrowLeft,
  Mic,
  VideoIcon,
  MonitorUp,
  Smile,
  Hand,
  MessageSquare,
  Users,
  RefreshCw,
  Image,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Upload,
  X,
} from "lucide-react";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { RoomDesignConfig, DEFAULT_ROOM_DESIGN_CONFIG } from "@/types/reuniao";

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
  {
    name: "Roxo Elegante",
    colors: {
      background: "#2e1a4a",
      controlsBackground: "#1a0f2e",
      controlsText: "#ffffff",
      primaryButton: "#8b5cf6",
      dangerButton: "#ef4444",
      avatarBackground: "#8b5cf6",
      avatarText: "#ffffff",
      participantNameBackground: "rgba(0, 0, 0, 0.6)",
      participantNameText: "#ffffff",
    },
  },
  {
    name: "Cinza Neutro",
    colors: {
      background: "#27272a",
      controlsBackground: "#18181b",
      controlsText: "#ffffff",
      primaryButton: "#71717a",
      dangerButton: "#ef4444",
      avatarBackground: "#71717a",
      avatarText: "#ffffff",
      participantNameBackground: "rgba(0, 0, 0, 0.6)",
      participantNameText: "#ffffff",
    },
  },
];

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
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

function RoomPreview({
  config,
  previewMode,
}: {
  config: RoomDesignConfig;
  previewMode: "lobby" | "meeting" | "end";
}) {
  const logoPosition = config.branding.logoPosition || "left";
  const logoSize = config.branding.logoSize || 40;
  
  const getLogoJustify = () => {
    switch (logoPosition) {
      case "center": return "justify-center";
      case "right": return "justify-end";
      default: return "justify-start";
    }
  };

  if (previewMode === "lobby") {
    return (
      <div
        className="rounded-lg overflow-hidden"
        style={{
          backgroundColor: config.colors.background,
          backgroundImage: config.lobby.backgroundImage
            ? `url(${config.lobby.backgroundImage})`
            : undefined,
          backgroundSize: "cover",
        }}
      >
        {config.branding.showLogoInLobby !== false && config.branding.logo && (
          <div 
            className={`flex items-center gap-2 p-3 ${getLogoJustify()}`}
            style={{ backgroundColor: config.colors.controlsBackground }}
          >
            <img 
              src={config.branding.logo} 
              alt="" 
              style={{ height: logoSize * 0.6 }}
              className="object-contain"
            />
            {config.branding.showCompanyName && (
              <span
                className="text-sm font-medium"
                style={{ color: config.colors.controlsText }}
              >
                {config.branding.companyName || "Empresa"}
              </span>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 p-4 min-h-[250px]">
          <div
            className="rounded-lg flex items-center justify-center aspect-video"
            style={{ backgroundColor: config.colors.controlsBackground }}
          >
            <div
              className="h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold"
              style={{
                backgroundColor: config.colors.avatarBackground,
                color: config.colors.avatarText,
              }}
            >
              J
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <h3
              className="font-semibold mb-2"
              style={{ color: config.colors.controlsText }}
            >
              {config.lobby.title || "Pronto para participar?"}
            </h3>
            <Button
              className="w-full mt-2"
              style={{
                backgroundColor: config.colors.primaryButton,
                color: "#ffffff",
              }}
            >
              {config.lobby.buttonText || "Participar agora"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (previewMode === "meeting") {
    const showLogo = config.branding.showLogoInMeeting !== false && config.branding.logo;
    
    return (
      <div
        className="rounded-lg overflow-hidden flex flex-col min-h-[300px]"
        style={{ backgroundColor: config.colors.background }}
      >
        <div
          className="h-12 flex items-center px-3 border-b"
          style={{
            backgroundColor: config.colors.controlsBackground,
            borderColor: `${config.colors.controlsText}20`,
            justifyContent: logoPosition === "center" ? "center" : logoPosition === "right" ? "flex-end" : "space-between",
          }}
        >
          {logoPosition === "left" && (
            <div className="flex items-center gap-2">
              {showLogo && (
                <img 
                  src={config.branding.logo!} 
                  alt="" 
                  style={{ height: logoSize * 0.5 }}
                  className="object-contain"
                />
              )}
              {config.branding.showCompanyName && (
                <span
                  className="text-sm font-medium"
                  style={{ color: config.colors.controlsText }}
                >
                  {config.branding.companyName || "Empresa"}
                </span>
              )}
            </div>
          )}
          
          {logoPosition === "center" && showLogo && (
            <div className="flex items-center gap-2">
              <img 
                src={config.branding.logo!} 
                alt="" 
                style={{ height: logoSize * 0.5 }}
                className="object-contain"
              />
              {config.branding.showCompanyName && (
                <span
                  className="text-sm font-medium"
                  style={{ color: config.colors.controlsText }}
                >
                  {config.branding.companyName || "Empresa"}
                </span>
              )}
            </div>
          )}
          
          {logoPosition === "right" && showLogo && (
            <div className="flex items-center gap-2">
              {config.branding.showCompanyName && (
                <span
                  className="text-sm font-medium"
                  style={{ color: config.colors.controlsText }}
                >
                  {config.branding.companyName || "Empresa"}
                </span>
              )}
              <img 
                src={config.branding.logo!} 
                alt="" 
                style={{ height: logoSize * 0.5 }}
                className="object-contain"
              />
            </div>
          )}
          
          {logoPosition === "left" && config.meeting.showParticipantCount && (
            <div
              className="flex items-center gap-1 text-xs"
              style={{ color: `${config.colors.controlsText}80` }}
            >
              <Users className="h-3 w-3" />
              <span>2</span>
            </div>
          )}
        </div>

        <div className="flex-1 grid grid-cols-2 gap-2 p-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="rounded-lg flex items-center justify-center aspect-video relative"
              style={{ backgroundColor: `${config.colors.background}cc` }}
            >
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center text-xl font-bold"
                style={{
                  backgroundColor: config.colors.avatarBackground,
                  color: config.colors.avatarText,
                }}
              >
                {i === 1 ? "J" : "M"}
              </div>
              <div
                className="absolute bottom-2 left-2 px-2 py-1 rounded text-xs"
                style={{
                  backgroundColor: config.colors.participantNameBackground,
                  color: config.colors.participantNameText,
                }}
              >
                {i === 1 ? "João (Você)" : "Maria"}
              </div>
            </div>
          ))}
        </div>

        <div
          className="h-14 flex items-center justify-center gap-2 border-t"
          style={{
            backgroundColor: config.colors.controlsBackground,
            borderColor: `${config.colors.controlsText}20`,
          }}
        >
          <Button
            size="icon"
            className="rounded-full h-10 w-10"
            style={{ backgroundColor: config.colors.controlsBackground }}
          >
            <Mic className="h-4 w-4" style={{ color: config.colors.controlsText }} />
          </Button>
          <Button
            size="icon"
            className="rounded-full h-10 w-10"
            style={{ backgroundColor: config.colors.controlsBackground }}
          >
            <VideoIcon className="h-4 w-4" style={{ color: config.colors.controlsText }} />
          </Button>
          {config.meeting.enableScreenShare && (
            <Button
              size="icon"
              className="rounded-full h-10 w-10"
              style={{ backgroundColor: config.colors.controlsBackground }}
            >
              <MonitorUp className="h-4 w-4" style={{ color: config.colors.controlsText }} />
            </Button>
          )}
          {config.meeting.enableReactions && (
            <Button
              size="icon"
              className="rounded-full h-10 w-10"
              style={{ backgroundColor: config.colors.controlsBackground }}
            >
              <Smile className="h-4 w-4" style={{ color: config.colors.controlsText }} />
            </Button>
          )}
          {config.meeting.enableRaiseHand && (
            <Button
              size="icon"
              className="rounded-full h-10 w-10"
              style={{ backgroundColor: config.colors.controlsBackground }}
            >
              <Hand className="h-4 w-4" style={{ color: config.colors.controlsText }} />
            </Button>
          )}
          <Button
            size="icon"
            className="rounded-full h-10 w-10 ml-2"
            style={{ backgroundColor: config.colors.dangerButton }}
          >
            <LogOut className="h-4 w-4 text-white" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg flex items-center justify-center min-h-[300px] p-8"
      style={{ backgroundColor: config.colors.background }}
    >
      <div
        className="text-center p-6 rounded-lg max-w-sm"
        style={{ backgroundColor: config.colors.controlsBackground }}
      >
        <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
          <Video className="h-6 w-6 text-green-500" />
        </div>
        <h3
          className="font-semibold mb-2"
          style={{ color: config.colors.controlsText }}
        >
          {config.endScreen.title || "Reunião Encerrada"}
        </h3>
        <p
          className="text-sm mb-4"
          style={{ color: `${config.colors.controlsText}99` }}
        >
          {config.endScreen.message || "Obrigado por participar!"}
        </p>
        <Button
          className="w-full"
          style={{ backgroundColor: config.colors.primaryButton }}
        >
          Fechar
        </Button>
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

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["/api/tenant"],
    queryFn: async () => {
      const response = await api.get("/api/tenant");
      return response.data;
    },
  });

  useEffect(() => {
    if (tenant?.roomDesignConfig) {
      setConfig(tenant.roomDesignConfig);
    } else if (tenant) {
      setConfig({
        ...DEFAULT_ROOM_DESIGN_CONFIG,
        branding: {
          ...DEFAULT_ROOM_DESIGN_CONFIG.branding,
          logo: tenant.logoUrl,
          companyName: tenant.nome,
        },
      });
    }
  }, [tenant]);

  const saveMutation = useMutation({
    mutationFn: async (newConfig: RoomDesignConfig) => {
      const response = await api.patch("/api/tenant/room-design", { roomDesignConfig: newConfig });
      return response.data;
    },
    onSuccess: () => {
      toast({ title: "Configurações salvas!", description: "As personalizações foram aplicadas." });
      queryClient.invalidateQueries({ queryKey: ["/api/tenant"] });
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
    setConfig({
      ...DEFAULT_ROOM_DESIGN_CONFIG,
      branding: {
        ...DEFAULT_ROOM_DESIGN_CONFIG.branding,
        logo: tenant?.logoUrl,
        companyName: tenant?.nome,
      },
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await api.post('/api/upload/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.url) {
        updateConfig("branding.logo", response.data.url);
        toast({ title: "Logo enviado!", description: "O logo foi carregado com sucesso." });
      }
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Erro", 
        description: error.response?.data?.message || "Não foi possível enviar o logo." 
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
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
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/configuracoes")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Design da Sala de Reunião</h1>
              <p className="text-sm text-muted-foreground">
                Personalize a experiência de videoconferência dos seus clientes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Restaurar Padrão
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Alterações
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-6 px-4">
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <Tabs defaultValue="branding" className="space-y-4">
              <TabsList className="grid grid-cols-5 w-full">
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
                <TabsTrigger value="end" className="gap-2">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Fim</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="branding">
                <Card>
                  <CardHeader>
                    <CardTitle>Logo da Empresa</CardTitle>
                    <CardDescription>
                      Configure o logo que aparecerá nas páginas de lobby e reunião
                    </CardDescription>
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
                              <p className="text-xs text-muted-foreground">
                                JPG, PNG, GIF, SVG ou WebP (máx. 5MB)
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="relative p-4 bg-muted rounded-lg">
                          <div className="flex items-center justify-center">
                            <img 
                              src={config.branding.logo} 
                              alt="Logo da empresa" 
                              style={{ height: config.branding.logoSize || 40 }}
                              className="max-w-full object-contain"
                            />
                          </div>
                          <div className="flex gap-2 mt-4 justify-center">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploading}
                            >
                              {isUploading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Upload className="h-4 w-4 mr-2" />
                              )}
                              Trocar
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleRemoveLogo}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Remover
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>Tamanho do Logo</Label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="20"
                          max="80"
                          value={config.branding.logoSize || 40}
                          onChange={(e) => updateConfig("branding.logoSize", parseInt(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-sm text-muted-foreground w-16">
                          {config.branding.logoSize || 40}px
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Posição do Logo</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={config.branding.logoPosition === "left" ? "default" : "outline"}
                          className="flex-1"
                          onClick={() => updateConfig("branding.logoPosition", "left")}
                        >
                          <AlignLeft className="h-4 w-4 mr-2" />
                          Esquerda
                        </Button>
                        <Button
                          type="button"
                          variant={config.branding.logoPosition === "center" ? "default" : "outline"}
                          className="flex-1"
                          onClick={() => updateConfig("branding.logoPosition", "center")}
                        >
                          <AlignCenter className="h-4 w-4 mr-2" />
                          Centro
                        </Button>
                        <Button
                          type="button"
                          variant={config.branding.logoPosition === "right" ? "default" : "outline"}
                          className="flex-1"
                          onClick={() => updateConfig("branding.logoPosition", "right")}
                        >
                          <AlignRight className="h-4 w-4 mr-2" />
                          Direita
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <Label className="text-sm font-medium">Onde exibir o logo</Label>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Mostrar no Lobby</Label>
                          <p className="text-xs text-muted-foreground">
                            Exibir logo na tela de espera
                          </p>
                        </div>
                        <Switch
                          checked={config.branding.showLogoInLobby !== false}
                          onCheckedChange={(v) => updateConfig("branding.showLogoInLobby", v)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Mostrar na Reunião</Label>
                          <p className="text-xs text-muted-foreground">
                            Exibir logo durante a videoconferência
                          </p>
                        </div>
                        <Switch
                          checked={config.branding.showLogoInMeeting !== false}
                          onCheckedChange={(v) => updateConfig("branding.showLogoInMeeting", v)}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>Nome da Empresa</Label>
                      <Input
                        value={config.branding.companyName || ""}
                        onChange={(e) => updateConfig("branding.companyName", e.target.value)}
                        placeholder="Nome da sua empresa"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Mostrar Nome da Empresa</Label>
                        <p className="text-xs text-muted-foreground">
                          Exibir nome ao lado do logo
                        </p>
                      </div>
                      <Switch
                        checked={config.branding.showCompanyName !== false}
                        onCheckedChange={(v) => updateConfig("branding.showCompanyName", v)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="colors">
                <Card>
                  <CardHeader>
                    <CardTitle>Esquema de Cores</CardTitle>
                    <CardDescription>
                      Personalize as cores da sua sala de reunião
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label className="text-sm font-medium mb-3 block">Temas Predefinidos</Label>
                      <div className="grid grid-cols-5 gap-2">
                        {COLOR_PRESETS.map((preset) => (
                          <Button
                            key={preset.name}
                            variant="outline"
                            className="h-12 p-0 overflow-hidden"
                            onClick={() => applyPreset(preset)}
                            title={preset.name}
                          >
                            <div className="w-full h-full flex">
                              <div
                                className="flex-1"
                                style={{ backgroundColor: preset.colors.background }}
                              />
                              <div
                                className="flex-1"
                                style={{ backgroundColor: preset.colors.primaryButton }}
                              />
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <ColorInput
                        label="Fundo"
                        value={config.colors.background}
                        onChange={(v) => updateConfig("colors.background", v)}
                      />
                      <ColorInput
                        label="Fundo dos Controles"
                        value={config.colors.controlsBackground}
                        onChange={(v) => updateConfig("colors.controlsBackground", v)}
                      />
                      <ColorInput
                        label="Texto dos Controles"
                        value={config.colors.controlsText}
                        onChange={(v) => updateConfig("colors.controlsText", v)}
                      />
                      <ColorInput
                        label="Botão Principal"
                        value={config.colors.primaryButton}
                        onChange={(v) => updateConfig("colors.primaryButton", v)}
                      />
                      <ColorInput
                        label="Botão de Perigo"
                        value={config.colors.dangerButton}
                        onChange={(v) => updateConfig("colors.dangerButton", v)}
                      />
                      <ColorInput
                        label="Avatar (Fundo)"
                        value={config.colors.avatarBackground}
                        onChange={(v) => updateConfig("colors.avatarBackground", v)}
                      />
                      <ColorInput
                        label="Avatar (Texto)"
                        value={config.colors.avatarText}
                        onChange={(v) => updateConfig("colors.avatarText", v)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="lobby">
                <Card>
                  <CardHeader>
                    <CardTitle>Configurações do Lobby</CardTitle>
                    <CardDescription>
                      Personalize a tela de espera antes de entrar na reunião
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>Título</Label>
                      <Input
                        value={config.lobby.title || ""}
                        onChange={(e) => updateConfig("lobby.title", e.target.value)}
                        placeholder="Pronto para participar?"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Subtítulo</Label>
                      <Input
                        value={config.lobby.subtitle || ""}
                        onChange={(e) => updateConfig("lobby.subtitle", e.target.value)}
                        placeholder="Opcional"
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

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Preview da Câmera</Label>
                          <p className="text-xs text-muted-foreground">
                            Mostrar preview do vídeo antes de entrar
                          </p>
                        </div>
                        <Switch
                          checked={config.lobby.showCameraPreview !== false}
                          onCheckedChange={(v) => updateConfig("lobby.showCameraPreview", v)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Seletores de Dispositivos</Label>
                          <p className="text-xs text-muted-foreground">
                            Permitir escolher microfone, câmera e alto-falante
                          </p>
                        </div>
                        <Switch
                          checked={config.lobby.showDeviceSelectors !== false}
                          onCheckedChange={(v) => updateConfig("lobby.showDeviceSelectors", v)}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>Imagem de Fundo (URL)</Label>
                      <Input
                        value={config.lobby.backgroundImage || ""}
                        onChange={(e) => updateConfig("lobby.backgroundImage", e.target.value || null)}
                        placeholder="https://exemplo.com/imagem.jpg"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="meeting">
                <Card>
                  <CardHeader>
                    <CardTitle>Configurações da Reunião</CardTitle>
                    <CardDescription>
                      Personalize a experiência durante a reunião
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Contador de Participantes</Label>
                        </div>
                        <Switch
                          checked={config.meeting.showParticipantCount !== false}
                          onCheckedChange={(v) => updateConfig("meeting.showParticipantCount", v)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Código da Reunião</Label>
                        </div>
                        <Switch
                          checked={config.meeting.showMeetingCode !== false}
                          onCheckedChange={(v) => updateConfig("meeting.showMeetingCode", v)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Indicador de Gravação</Label>
                        </div>
                        <Switch
                          checked={config.meeting.showRecordingIndicator !== false}
                          onCheckedChange={(v) => updateConfig("meeting.showRecordingIndicator", v)}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <Label className="text-sm font-medium">Funcionalidades</Label>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Smile className="h-4 w-4" />
                          <Label>Reações com Emojis</Label>
                        </div>
                        <Switch
                          checked={config.meeting.enableReactions !== false}
                          onCheckedChange={(v) => updateConfig("meeting.enableReactions", v)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Hand className="h-4 w-4" />
                          <Label>Levantar Mão</Label>
                        </div>
                        <Switch
                          checked={config.meeting.enableRaiseHand !== false}
                          onCheckedChange={(v) => updateConfig("meeting.enableRaiseHand", v)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MonitorUp className="h-4 w-4" />
                          <Label>Compartilhar Tela</Label>
                        </div>
                        <Switch
                          checked={config.meeting.enableScreenShare !== false}
                          onCheckedChange={(v) => updateConfig("meeting.enableScreenShare", v)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          <Label>Chat</Label>
                        </div>
                        <Switch
                          checked={config.meeting.enableChat !== false}
                          onCheckedChange={(v) => updateConfig("meeting.enableChat", v)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="end">
                <Card>
                  <CardHeader>
                    <CardTitle>Tela de Encerramento</CardTitle>
                    <CardDescription>
                      Personalize a tela mostrada quando a reunião termina
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>Título</Label>
                      <Input
                        value={config.endScreen.title || ""}
                        onChange={(e) => updateConfig("endScreen.title", e.target.value)}
                        placeholder="Reunião Encerrada"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Mensagem</Label>
                      <Input
                        value={config.endScreen.message || ""}
                        onChange={(e) => updateConfig("endScreen.message", e.target.value)}
                        placeholder="Obrigado por participar!"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Coletar Feedback</Label>
                        <p className="text-xs text-muted-foreground">
                          Perguntar se a experiência foi boa ou ruim
                        </p>
                      </div>
                      <Switch
                        checked={config.endScreen.showFeedback}
                        onCheckedChange={(v) => updateConfig("endScreen.showFeedback", v)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>URL de Redirecionamento (opcional)</Label>
                      <Input
                        value={config.endScreen.redirectUrl || ""}
                        onChange={(e) => updateConfig("endScreen.redirectUrl", e.target.value || null)}
                        placeholder="https://seu-site.com/obrigado"
                      />
                      <p className="text-xs text-muted-foreground">
                        Se preenchido, o usuário será redirecionado ao clicar no botão
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:sticky lg:top-6 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
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
                <div className="flex gap-2 mb-4">
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
                      ? "mx-auto w-[280px] border-4 border-zinc-800 rounded-3xl overflow-hidden"
                      : ""
                  }
                >
                  <RoomPreview config={config} previewMode={previewMode} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
