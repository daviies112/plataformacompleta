import { DesignConfig } from "../../types/form";
import { ColorPicker } from "./ColorPicker";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Slider } from "../ui/slider";
import { Upload, X, Sparkles, Shuffle } from "lucide-react";
import { api } from "../../lib/api";
import { useToast } from "../../hooks/use-toast";
import { useState, useEffect } from "react";
import { extractColorsFromImage, generateColorVariations } from "@/lib/colorExtractor";

interface DesignCustomizerProps {
  design: DesignConfig;
  onChange: (design: DesignConfig) => void;
}

const fontFamilies = [
  "Inter",
  "Poppins",
  "Roboto",
  "Playfair Display",
  "Montserrat",
  "Open Sans",
  "Lato",
  "Raleway"
];

const textSizes = [
  { value: "xs", label: "Extra Pequeno" },
  { value: "sm", label: "Pequeno" },
  { value: "base", label: "Normal" },
  { value: "lg", label: "Grande" },
  { value: "xl", label: "Extra Grande" },
  { value: "2xl", label: "2XL" },
  { value: "3xl", label: "3XL" },
  { value: "4xl", label: "4XL" }
];

const spacingOptions = [
  { value: "compact", label: "Compacto" },
  { value: "comfortable", label: "Confortável" },
  { value: "spacious", label: "Espaçoso" }
];

const logoAlignOptions = [
  { value: "left", label: "Esquerda" },
  { value: "center", label: "Centro" },
  { value: "right", label: "Direita" }
];

export const DesignCustomizer = ({ design, onChange }: DesignCustomizerProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [extractingColors, setExtractingColors] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null); // Preview local da logo
  const [colorVariations, setColorVariations] = useState<Array<{
    primary: string;
    secondary: string;
    background: string;
    text: string;
    name: string;
  }>>([]);

  // Prevenir crash se design.colors estiver indefinido
  // Cores padrão do sistema
  const defaultColors = {
    titleColor: "hsl(222, 47%, 11%)",
    textColor: "hsl(222, 47%, 11%)",
    pageBackground: "linear-gradient(135deg, hsl(0, 0%, 100%), hsl(210, 40%, 96%))",
    containerBackground: "hsl(0, 0%, 100%)",
    buttonColor: "hsl(221, 83%, 53%)",
    buttonTextColor: "hsl(0, 0%, 100%)",
    progressBarColor: "hsl(221, 83%, 53%)",
    inputBackground: "hsl(210, 40%, 96%)",
    inputTextColor: "hsl(222, 47%, 11%)",
    borderColor: "hsl(214, 32%, 91%)"
  };

  // Prevenir crash e garantir defaults
  const safeDesign = {
    ...design,
    colors: {
      ...defaultColors,
      ...(design?.colors || {})
    },
    typography: {
      fontFamily: "Inter",
      titleSize: "2xl",
      textSize: "base",
      ...(design?.typography || {})
    },
    spacing: design?.spacing || "comfortable"
  };

  // 🔍 MONITORAMENTO: Logar o estado atual do design recebido
  useEffect(() => {
    console.log('🎨 [DesignCustomizer] Design Recebido:', design);
    console.log('🛡️ [DesignCustomizer] Design Seguro (com defaults):', safeDesign);
  }, [design]);

  // 🛠️ HELPER: Corrigir URLs do localhost automaticamente
  const fixLogoUrl = (url: string | null) => {
    if (!url) return null;
    if (typeof url !== 'string') return url;

    // Se a URL contém localhost ou 127.0.0.1, extrair apenas o path
    if (url.includes('localhost:') || url.includes('127.0.0.1:')) {
      const parts = url.split('/uploads/');
      if (parts.length > 1) {
        return '/uploads/' + parts[1];
      }
    }

    // Se a URL contém qualquer protocolo (http:// ou https://), extrair apenas o path
    if (url.includes('://')) {
      const match = url.match(/\/uploads\/logos\/[^"'\s]+/);
      if (match) {
        return match[0];
      }
    }

    return url;
  };

  // Função auxiliar para logar mudanças
  const handleChange = (newDesign: any) => {
    console.log('✏️ [DesignCustomizer] Enviando alteração:', newDesign);
    onChange(newDesign);
  };

  useEffect(() => {
    if (safeDesign.logo && safeDesign.extractedColors && safeDesign.extractedColors.length > 0) {
      const variations = generateColorVariations(safeDesign.extractedColors);
      setColorVariations(variations);
    } else {
      setColorVariations([]);
    }
  }, [safeDesign.extractedColors, safeDesign.logo]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma imagem válida",
        variant: "destructive"
      });
      return;
    }

    // First, extract colors from the File object (before uploading)
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;

      // Salvar preview local IMEDIATAMENTE para exibir a logo
      setLogoPreview(dataUrl);

      // Extract colors from base64 dataUrl (works locally in browser)
      setExtractingColors(true);
      try {
        const colors = await extractColorsFromImage(dataUrl, 5);

        toast({
          title: "Cores extraídas!",
          description: `${colors.length} cores encontradas. Fazendo upload da logo...`
        });

        // Now upload the logo to server
        setUploading(true);
        try {
          const logoUrl = await api.uploadLogo(file);

          // Update design with both logo URL and extracted colors
          handleChange({
            ...safeDesign,
            logo: logoUrl,
            extractedColors: colors,
            logoSize: safeDesign.logoSize || 64
          });

          toast({
            title: "Sucesso!",
            description: "Logo enviada e cores aplicadas. Veja as sugestões abaixo.",
            duration: 5000
          });
        } catch (uploadError) {
          console.error('Error uploading logo:', uploadError);
          toast({
            title: "Erro",
            description: "Erro ao fazer upload da logo",
            variant: "destructive"
          });
        } finally {
          setUploading(false);
        }
      } catch (colorError) {
        console.error('Error extracting colors:', colorError);
        toast({
          title: "Aviso",
          description: "Não foi possível extrair cores. Tentando fazer upload...",
          variant: "default"
        });

        // Even if color extraction fails, still upload the logo
        setUploading(true);
        try {
          const logoUrl = await api.uploadLogo(file);
          handleChange({ ...safeDesign, logo: logoUrl, logoSize: safeDesign.logoSize || 64 });

          toast({
            title: "Logo enviada",
            description: "Logo carregada, mas cores não foram extraídas automaticamente"
          });
        } catch (uploadError) {
          console.error('Error uploading logo:', uploadError);
          toast({
            title: "Erro",
            description: "Erro ao fazer upload da logo",
            variant: "destructive"
          });
        } finally {
          setUploading(false);
        }
      } finally {
        setExtractingColors(false);
      }
    };

    reader.onerror = () => {
      toast({
        title: "Erro",
        description: "Erro ao ler o arquivo",
        variant: "destructive"
      });
    };

    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    handleChange({ ...safeDesign, logo: null, extractedColors: undefined, logoSize: undefined });
    setColorVariations([]);
  };

  const handleColorChange = (key: keyof typeof design.colors, value: string) => {
    // 🔍 DEBUG: Log color change attempt
    console.log(`🎨 [DesignCustomizer] Alterando cor: ${key} -> ${value}`);

    const newDesign = {
      ...design,
      colors: {
        ...design.colors,
        [key]: value,
        // Sync containerBackground with secondary for legacy compatibility
        ...(key === 'containerBackground' ? { secondary: value } : {}),
        ...(key === 'secondary' ? { containerBackground: value } : {})
      }
    };

    console.log('🎨 [DesignCustomizer] Novo Estado do Design:', newDesign.colors);
    onChange(newDesign);
  };

  const applyColorVariation = (variation: typeof colorVariations[0]) => {
    handleChange({
      ...safeDesign,
      colors: {
        titleColor: variation.text,
        textColor: variation.text,
        pageBackground: variation.background,
        containerBackground: variation.secondary,
        buttonColor: variation.primary,
        buttonTextColor: variation.background,
        progressBarColor: variation.primary,
        borderColor: `${variation.primary}30`,
        // Mantendo deprecated por segurança
        primary: variation.primary,
        secondary: variation.secondary,
        background: variation.background,
        text: variation.text,
        button: variation.primary,
        buttonText: variation.background
      }
    });

    toast({
      title: "Paleta aplicada!",
      description: `${variation.name} aplicada com sucesso`,
      duration: 2000
    });
  };

  return (
    <Card className="p-6 space-y-6 bg-card border-border">
      <div>
        <h3 className="text-lg font-semibold mb-4">Personalização Visual</h3>

        {/* Logo Upload */}
        <div className="space-y-2 mb-6">
          <Label>Logo</Label>
          {safeDesign.logo ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="relative rounded-lg border border-border overflow-hidden"
                  style={{
                    background: 'repeating-conic-gradient(#e5e5e5 0% 25%, #f5f5f5 0% 50%) 50% / 16px 16px',
                    minWidth: '64px',
                    minHeight: '64px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px'
                  }}
                >
                  <img
                    src={logoPreview || fixLogoUrl(safeDesign.logo) || ''}
                    alt="Logo"
                    style={{ height: `${safeDesign.logoSize || 64}px`, maxWidth: '200px' }}
                    className="object-contain"
                    onError={(e) => {
                      console.error('Logo failed to load:', logoPreview || safeDesign.logo);
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                    onLoad={(e) => {
                      (e.target as HTMLImageElement).style.display = 'block';
                    }}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={removeLogo}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Logo Size Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Tamanho da Logo</Label>
                  <span className="text-sm text-muted-foreground">{safeDesign.logoSize || 64}px</span>
                </div>
                <Slider
                  value={[safeDesign.logoSize || 64]}
                  onValueChange={(values) => handleChange({ ...safeDesign, logoSize: values[0] })}
                  min={32}
                  max={200}
                  step={4}
                  className="w-full"
                />
              </div>

              {/* Logo Alignment */}
              <div>
                <Label>Alinhamento da Logo</Label>
                <Select
                  value={safeDesign.logoAlign || "left"}
                  onValueChange={(value: any) => handleChange({ ...safeDesign, logoAlign: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {logoAlignOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Extracted Colors */}
              {extractingColors && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  Extraindo cores da logo...
                </div>
              )}

              {safeDesign.extractedColors && safeDesign.extractedColors.length > 0 && (
                <div className="space-y-3 p-4 bg-secondary/20 rounded-lg border border-border">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-semibold">Cores Extraídas da Logo</Label>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {safeDesign.extractedColors.map((color, index) => (
                      <div
                        key={index}
                        className="w-10 h-10 rounded-md border-2 border-border shadow-sm"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Color Variations */}
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
                    {colorVariations.map((variation, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        onClick={() => applyColorVariation(variation)}
                        className="h-auto flex-col items-start p-3 hover:border-primary"
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
          ) : (
            <div>
              <input
                type="file"
                id="logo-upload"
                className="hidden"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploading}
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('logo-upload')?.click()}
                disabled={uploading}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {uploading ? "Enviando..." : "Fazer Upload da Logo"}
              </Button>
            </div>
          )}
        </div>

        {/* Colors */}
        <div className="space-y-4 mb-6">
          <h4 className="font-medium">Cores</h4>
          <div className="grid grid-cols-2 gap-4">
            <ColorPicker
              label="Cor do Título"
              color={safeDesign.colors.titleColor || safeDesign.colors.primary || "hsl(222, 47%, 11%)"}
              onChange={(color) => handleChange({
                ...safeDesign,
                colors: {
                  ...safeDesign.colors,
                  titleColor: color,
                  primary: color
                }
              })}
            />
            <ColorPicker
              label="Cor do Texto"
              color={safeDesign.colors.textColor || safeDesign.colors.text || "hsl(222, 47%, 11%)"}
              onChange={(color) => handleChange({
                ...safeDesign,
                colors: {
                  ...safeDesign.colors,
                  textColor: color,
                  text: color
                }
              })}
            />
            <ColorPicker
              label="Cor do Fundo"
              color={safeDesign.colors.pageBackground || safeDesign.colors.background || "hsl(0, 0%, 100%)"}
              onChange={(color) => handleChange({
                ...safeDesign,
                colors: {
                  ...safeDesign.colors,
                  pageBackground: color,
                  background: color
                }
              })}
            />
            <ColorPicker
              label="Cor do Container"
              color={safeDesign.colors.containerBackground || safeDesign.colors.secondary || "hsl(210, 40%, 96%)"}
              onChange={(color) => handleChange({
                ...safeDesign,
                colors: {
                  ...safeDesign.colors,
                  containerBackground: color,
                  secondary: color
                }
              })}
            />
            <ColorPicker
              label="Cor do Botão"
              color={safeDesign.colors.buttonColor || safeDesign.colors.button || "hsl(221, 83%, 53%)"}
              onChange={(color) => handleChange({
                ...safeDesign,
                colors: {
                  ...safeDesign.colors,
                  buttonColor: color,
                  button: color
                }
              })}
            />
            <ColorPicker
              label="Cor do Texto do Botão"
              color={safeDesign.colors.buttonTextColor || safeDesign.colors.buttonText || "hsl(0, 0%, 100%)"}
              onChange={(color) => handleChange({
                ...safeDesign,
                colors: {
                  ...safeDesign.colors,
                  buttonTextColor: color,
                  buttonText: color
                }
              })}
            />
            <ColorPicker
              label="Cor da Barra de Progresso"
              color={safeDesign.colors.progressBarColor || safeDesign.colors.progressBar || safeDesign.colors.primary || "hsl(221, 83%, 53%)"}
              onChange={(color) => handleChange({
                ...safeDesign,
                colors: {
                  ...safeDesign.colors,
                  progressBarColor: color,
                  progressBar: color
                }
              })}
            />
            <ColorPicker
              label="Cor da Borda"
              color={safeDesign.colors.borderColor || "hsl(214, 32%, 91%)"}
              onChange={(color) => handleChange({
                ...safeDesign,
                colors: {
                  ...safeDesign.colors,
                  borderColor: color
                }
              })}
            />
            <ColorPicker
              label="Cor do Input"
              color={safeDesign.colors.inputBackground || safeDesign.colors.secondary || "hsl(210, 40%, 96%)"}
              onChange={(color) => handleChange({
                ...safeDesign,
                colors: {
                  ...safeDesign.colors,
                  inputBackground: color
                }
              })}
            />
            <ColorPicker
              label="Cor do Texto do Input"
              color={safeDesign.colors.inputTextColor || safeDesign.colors.textColor || "hsl(222, 47%, 11%)"}
              onChange={(color) => handleChange({
                ...safeDesign,
                colors: {
                  ...safeDesign.colors,
                  inputTextColor: color
                }
              })}
            />
          </div>
        </div>

        {/* Typography */}
        <div className="space-y-4 mb-6">
          <h4 className="font-medium">Tipografia</h4>
          <div className="space-y-3">
            <div>
              <Label>Fonte</Label>
              <Select
                value={safeDesign.typography.fontFamily}
                onValueChange={(value) => handleChange({
                  ...safeDesign,
                  typography: { ...safeDesign.typography, fontFamily: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontFamilies.map(font => (
                    <SelectItem key={font} value={font}>
                      <span style={{ fontFamily: font }}>{font}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tamanho do Título</Label>
              <Select
                value={safeDesign.typography.titleSize}
                onValueChange={(value) => handleChange({
                  ...safeDesign,
                  typography: { ...safeDesign.typography, titleSize: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {textSizes.map(size => (
                    <SelectItem key={size.value} value={size.value}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tamanho do Texto</Label>
              <Select
                value={safeDesign.typography.textSize}
                onValueChange={(value) => handleChange({
                  ...safeDesign,
                  typography: { ...safeDesign.typography, textSize: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {textSizes.map(size => (
                    <SelectItem key={size.value} value={size.value}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Spacing */}
        <div className="space-y-2">
          <Label>Espaçamento</Label>
          <Select
            value={safeDesign.spacing}
            onValueChange={(value: any) => handleChange({ ...safeDesign, spacing: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {spacingOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
};
