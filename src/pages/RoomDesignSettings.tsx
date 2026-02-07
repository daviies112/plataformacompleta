import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Sparkles,
  Shuffle,
} from "lucide-react";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { RoomDesignConfig, DEFAULT_ROOM_DESIGN_CONFIG } from "@/types/reuniao";
import { MeetingHeader } from "@/components/MeetingHeader";
import { getSupabaseClient } from "@/lib/supabase";
import { extractColorsFromImage, generateColorVariations, hslToHex } from "@/lib/colorExtractor";

const LOGO_ALIGN_OPTIONS = [
  { value: "left", label: "Esquerda" },
  { value: "center", label: "Centro" },
  { value: "right", label: "Direita" },
];

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
  const [extractingColors, setExtractingColors] = useState(false);
  const [colorVariations, setColorVariations] = useState<Array<{
    primary: string;
    secondary: string;
    background: string;
    text: string;
    name: string;
    button: string;
    buttonText: string;
  }>>([]);

  const { data: designData, isLoading, refetch } = useQuery({
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

  const saveMutation = useMutation({
    mutationFn: async (newConfig: RoomDesignConfig) => {
      console.log('[Design] Salvando configurações...');
      
      // Chamada para a API local que agora gerencia o sync com Supabase de forma segura no backend
      const response = await api.patch("/api/reunioes/room-design", { roomDesignConfig: newConfig });
      
      // Opcional: Tentativa de salvamento direto se o backend falhar ou para redundância
      // Removido para evitar conflitos de tenantId e focar na rota segura do backend
      
      return response.data;
    },
    onSuccess: () => {
      toast({ title: "Configurações salvas!", description: "As personalizações foram aplicadas com sucesso no Supabase." });
      queryClient.invalidateQueries({ queryKey: ["/api/reunioes/room-design"] });
    },
    onError: (err: any) => {
      console.error('[Design] Erro ao salvar:', err);
      toast({ variant: "destructive", title: "Erro ao salvar", description: err.response?.data?.message || "Não foi possível sincronizar com o Supabase." });
    },
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

  // Regenerate color variations when extractedColors changes
  useEffect(() => {
    if (config.branding.logo && config.branding.extractedColors && config.branding.extractedColors.length > 0) {
      const variations = generateColorVariations(config.branding.extractedColors);
      setColorVariations(variations);
    } else {
      setColorVariations([]);
    }
  }, [config.branding.extractedColors, config.branding.logo]);

  // Supabase Realtime Subscription para Design
  useEffect(() => {
    let channel: any;

    const setupRealtime = async () => {
      try {
        const supabase = await getSupabaseClient();
        if (!supabase) return;

        console.log("[Design] Configurando Realtime para 'hms_100ms_config'...");
        
        channel = supabase
          .channel('design-config-changes')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'hms_100ms_config'
            },
            async (payload: any) => {
              console.log('[Design] Mudança detectada no Supabase:', payload.new?.id);
              queryClient.invalidateQueries({ queryKey: ["/api/reunioes/room-design"] });
              refetch();
            }
          )
          .subscribe();
      } catch (err) {
        console.error("[Design] Erro ao configurar realtime:", err);
      }
    };

    setupRealtime();

    return () => {
      if (channel) channel.unsubscribe();
    };
  }, [queryClient, refetch]);

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

    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Por favor, selecione uma imagem válida",
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);

      const response = await api.post("/api/upload/logo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.url) {
        const logoUrl = response.data.url;
        setConfig((prev) => ({
          ...prev,
          branding: {
            ...prev.branding,
            logo: logoUrl,
            logoSize: prev.branding.logoSize || 60,
          },
        }));
        toast({ title: "Logo enviado!", description: "Extraindo cores da logo..." });

        setExtractingColors(true);
        try {
          // Garantir URL absoluta para extração de cores
          const absoluteUrl = logoUrl.startsWith('http') 
            ? logoUrl 
            : `${window.location.origin}${logoUrl}`;
          
          console.log('[ColorExtract] Starting extraction from:', absoluteUrl);
          const colors = await extractColorsFromImage(absoluteUrl, 5);
          console.log('[ColorExtract] Colors extracted:', colors);
          
          if (colors && colors.length > 0) {
            setConfig((prev) => ({
              ...prev,
              branding: {
                ...prev.branding,
                logo: logoUrl,
                extractedColors: colors,
                logoSize: prev.branding.logoSize || 60,
              },
            }));
            toast({
              title: "Cores extraídas!",
              description: `${colors.length} cores encontradas na logo. Veja as sugestões de paleta.`,
              duration: 5000,
            });
          } else {
            console.warn('[ColorExtract] No colors extracted');
            toast({
              title: "Aviso",
              description: "Logo carregada, mas não foram encontradas cores significativas",
            });
          }
        } catch (colorError) {
          console.error("[ColorExtract] Error extracting colors:", colorError);
          toast({
            title: "Aviso",
            description: "Logo carregada, mas não foi possível extrair cores automaticamente",
          });
        } finally {
          setExtractingColors(false);
        }
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
    setConfig((prev) => ({
      ...prev,
      branding: {
        ...prev.branding,
        logo: null,
        extractedColors: undefined,
      },
    }));
    setColorVariations([]);
  };

  const applyColorVariation = (variation: typeof colorVariations[0]) => {
    // Converter HSL para HEX para compatibilidade com inputs de cor
    const toHex = (color: string): string => {
      if (color.startsWith('hsl')) {
        return hslToHex(color);
      }
      return color;
    };
    
    const hexPrimary = toHex(variation.primary);
    const hexSecondary = toHex(variation.secondary);
    const hexBackground = toHex(variation.background);
    const hexText = toHex(variation.text);
    const hexButton = variation.button ? toHex(variation.button) : hexPrimary;
    const hexButtonText = variation.buttonText ? toHex(variation.buttonText) : hexText;
    
    setConfig((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        background: hexBackground,
        primaryButton: hexPrimary,
        controlsBackground: hexSecondary,
        controlsText: hexText,
        avatarBackground: hexPrimary,
        avatarText: hexButtonText,
        buttonTextColor: hexButtonText,
        dangerButton: prev.colors.dangerButton || "#ef4444",
        participantNameBackground: `rgba(0, 0, 0, 0.6)`,
        participantNameText: hexText,
      },
    }));
    toast({
      title: "Paleta aplicada!",
      description: `${variation.name} aplicada com sucesso`,
      duration: 2000,
    });
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
                      data-testid="input-logo-upload"
                    />
                    {!config.branding.logo ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                        data-testid="button-upload-logo"
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
                      <div className="space-y-4">
                        <div className="relative p-4 bg-muted rounded-lg">
                          <div
                            className="flex items-center"
                            style={{
                              justifyContent:
                                config.branding.logoPosition === "center"
                                  ? "center"
                                  : config.branding.logoPosition === "right"
                                  ? "flex-end"
                                  : "flex-start",
                            }}
                          >
                            <img
                              src={config.branding.logo}
                              alt="Logo"
                              className="object-contain"
                              style={{ height: `${config.branding.logoSize || 60}px`, maxWidth: "200px" }}
                              data-testid="img-logo-preview"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={handleRemoveLogo}
                            data-testid="button-remove-logo"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label>Tamanho da Logo</Label>
                            <span className="text-sm text-muted-foreground">{config.branding.logoSize || 60}px</span>
                          </div>
                          <Slider
                            value={[config.branding.logoSize || 60]}
                            onValueChange={(values) => updateConfig("branding.logoSize", values[0])}
                            min={32}
                            max={200}
                            step={4}
                            className="w-full"
                            data-testid="slider-logo-size"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Posição da Logo</Label>
                          <Select
                            value={config.branding.logoPosition || "left"}
                            onValueChange={(value: "left" | "center" | "right") => updateConfig("branding.logoPosition", value)}
                          >
                            <SelectTrigger data-testid="select-logo-position">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LOGO_ALIGN_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {extractingColors && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Sparkles className="h-4 w-4 animate-pulse" />
                            Extraindo cores da logo...
                          </div>
                        )}

                        {config.branding.extractedColors && config.branding.extractedColors.length > 0 && (
                          <div className="space-y-3 p-4 bg-secondary/20 rounded-lg border border-border">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-primary" />
                              <Label className="text-sm font-semibold">Cores Extraídas da Logo</Label>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              {config.branding.extractedColors.map((color, index) => (
                                <div
                                  key={index}
                                  className="w-10 h-10 rounded-md border-2 border-border shadow-sm cursor-pointer hover:scale-110 transition-transform"
                                  style={{ backgroundColor: color }}
                                  title={color}
                                  data-testid={`color-extracted-${index}`}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {colorVariations.length > 0 && (
                          <div className="space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                            <div className="flex items-center gap-2">
                              <Shuffle className="h-4 w-4 text-primary" />
                              <Label className="text-sm font-semibold">Sugestões de Paleta</Label>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Clique para aplicar uma paleta de cores baseada na sua logo
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {colorVariations.slice(0, 6).map((variation, index) => (
                                <Button
                                  key={index}
                                  variant="outline"
                                  onClick={() => applyColorVariation(variation)}
                                  className="h-auto flex-col items-start p-3 hover:border-primary"
                                  data-testid={`button-palette-${index}`}
                                >
                                  <span className="text-xs font-medium mb-2">{variation.name}</span>
                                  <div className="flex gap-1 w-full">
                                    <div
                                      className="w-6 h-6 rounded-sm border"
                                      style={{ backgroundColor: variation.primary }}
                                      title="Primária"
                                    />
                                    <div
                                      className="w-6 h-6 rounded-sm border"
                                      style={{ backgroundColor: variation.secondary }}
                                      title="Secundária"
                                    />
                                    <div
                                      className="w-6 h-6 rounded-sm border"
                                      style={{ backgroundColor: variation.background }}
                                      title="Fundo"
                                    />
                                    <div
                                      className="w-6 h-6 rounded-sm border"
                                      style={{ backgroundColor: variation.text }}
                                      title="Texto"
                                    />
                                  </div>
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Nome da Empresa</Label>
                    <Input
                      value={config.branding.companyName || ""}
                      onChange={(e) => updateConfig("branding.companyName", e.target.value)}
                      placeholder="Nome da sua empresa"
                      data-testid="input-company-name"
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
                      data-testid="switch-show-company-name"
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
                      data-testid="switch-show-logo-lobby"
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
                      data-testid="switch-show-logo-meeting"
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
                      label="Cor do Texto do Botão"
                      value={config.colors.buttonTextColor || '#ffffff'}
                      onChange={(v) => updateConfig("colors.buttonTextColor", v)}
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

            <TabsContent value="end">
              <Card>
                <CardHeader>
                  <CardTitle>Tela de Encerramento</CardTitle>
                  <CardDescription>Configure o que o usuário vê após sair da reunião</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Título de Despedida</Label>
                    <Input
                      value={config.endScreen.title || ""}
                      onChange={(e) => updateConfig("endScreen.title", e.target.value)}
                      placeholder="Você saiu da reunião"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Texto do Botão de Retorno</Label>
                    <Input
                      value={config.endScreen.buttonText || ""}
                      onChange={(e) => updateConfig("endScreen.buttonText", e.target.value)}
                      placeholder="Voltar ao Início"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-end gap-3 mt-6">
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Restaurar Padrão
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar Alterações
            </Button>
          </div>
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

              <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-2 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                <div
                  className={`relative border rounded-lg overflow-hidden bg-black transition-all duration-300 shadow-2xl ${
                    devicePreview === "mobile" ? "w-[240px] aspect-[9/16]" : "w-full max-w-full aspect-video"
                  }`}
                  style={{ backgroundColor: config.colors.background }}
                >
                  {/* Lobby Preview */}
                  {previewMode === "lobby" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white space-y-6">
                      {config.branding.logo && config.branding.showLogoInLobby !== false && (
                        <div 
                          className="flex items-center gap-2 w-full"
                          style={{
                            justifyContent: config.branding.logoPosition === "left" 
                              ? "flex-start" 
                              : config.branding.logoPosition === "right" 
                              ? "flex-end" 
                              : "center"
                          }}
                        >
                          <img 
                            src={config.branding.logo} 
                            alt="Logo" 
                            className="object-contain"
                            style={{ 
                              height: `${(config.branding.logoSize || 60) * 0.5}px`,
                              maxWidth: "150px"
                            }}
                          />
                          {config.branding.showCompanyName && (
                            <span className="font-bold text-sm">{config.branding.companyName}</span>
                          )}
                        </div>
                      )}
                      <div className="w-full max-w-[200px] aspect-video bg-zinc-800 rounded-lg flex items-center justify-center">
                        <Video className="h-8 w-8 text-zinc-600" />
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="text-base font-bold leading-tight">{config.lobby.title || "Pronto para participar?"}</h3>
                      </div>
                      <button
                        style={{ backgroundColor: config.colors.primaryButton, color: config.colors.buttonTextColor || '#ffffff', padding: '8px 16px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
                        className="w-full max-w-xs"
                      >
                        {config.lobby.buttonText || "Participar agora"}
                      </button>
                    </div>
                  )}

                  {/* Meeting Preview */}
                  {previewMode === "meeting" && (
                    <div className="absolute inset-0 flex flex-col text-white">
                      <header className="p-4 flex items-center justify-between">
                        {config.branding.logo && config.branding.showLogoInMeeting !== false && (
                          <div 
                            className="flex items-center gap-2"
                            style={{
                              justifyContent: config.branding.logoPosition === "left" 
                                ? "flex-start" 
                                : config.branding.logoPosition === "right" 
                                ? "flex-end" 
                                : "center"
                            }}
                          >
                            <img 
                              src={config.branding.logo} 
                              alt="Logo" 
                              className="object-contain"
                              style={{ 
                                height: `${(config.branding.logoSize || 60) * 0.4}px`,
                                maxWidth: "100px"
                              }}
                            />
                            {config.branding.showCompanyName && (
                              <span className="text-sm font-bold">{config.branding.companyName}</span>
                            )}
                          </div>
                        )}
                        {config.meeting.showParticipantCount !== false && (
                          <div className="bg-black/50 px-2 py-1 rounded text-xs flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            <span>01</span>
                          </div>
                        )}
                      </header>

                      <div className="flex-1 p-2 flex items-center justify-center min-h-0">
                        <div className="w-full max-w-[200px] aspect-video bg-zinc-800 rounded-lg flex items-center justify-center relative">
                          <div
                            className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px]"
                            style={{ backgroundColor: config.colors.participantNameBackground, color: config.colors.participantNameText }}
                          >
                            Você
                          </div>
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                            style={{ backgroundColor: config.colors.avatarBackground, color: config.colors.avatarText }}
                          >
                            V
                          </div>
                        </div>
                      </div>

                      <footer
                        className="p-2 flex items-center justify-center gap-1.5"
                        style={{ backgroundColor: config.colors.controlsBackground }}
                      >
                        <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border-zinc-700 bg-zinc-800 text-white">
                          <Video className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border-zinc-700 bg-zinc-800 text-white">
                          <Palette className="h-4 w-4" />
                        </Button>
                        {config.meeting.enableScreenShare !== false && (
                          <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border-zinc-700 bg-zinc-800 text-white">
                            <Monitor className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          style={{ backgroundColor: config.colors.dangerButton }}
                          className="h-8 w-8 rounded-full border-none hover:opacity-90 text-white"
                        >
                          <LogOut className="h-4 w-4" />
                        </Button>
                      </footer>
                    </div>
                  )}

                  {/* End Screen Preview */}
                  {previewMode === "end" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white space-y-6">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: config.colors.controlsBackground }}
                      >
                        <LogOut className="h-8 w-8" />
                      </div>
                      <div className="text-center space-y-1">
                        <h3 className="text-base font-bold">{config.endScreen.title || "Você saiu da reunião"}</h3>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full max-w-xs border-zinc-700 hover:bg-zinc-800 text-white"
                      >
                        {config.endScreen.buttonText || "Voltar ao Início"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
