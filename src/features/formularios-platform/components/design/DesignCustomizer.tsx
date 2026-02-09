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
  const [colorVariations, setColorVariations] = useState<Array<{
    primary: string;
    secondary: string;
    background: string;
    text: string;
    name: string;
  }>>([]);

  useEffect(() => {
    if (design.logo && design.extractedColors && design.extractedColors.length > 0) {
      const variations = generateColorVariations(design.extractedColors);
      setColorVariations(variations);
    } else {
      setColorVariations([]);
    }
  }, [design.extractedColors]);

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

    setUploading(true);
    try {
      const logoUrl = await api.uploadLogo(file);
      onChange({ ...design, logo: logoUrl, logoSize: design.logoSize || 64 });
      
      toast({
        title: "Sucesso!",
        description: "Logo enviada com sucesso. Extraindo cores..."
      });

      setExtractingColors(true);
      try {
        const colors = await extractColorsFromImage(logoUrl, 5);
        onChange({ 
          ...design, 
          logo: logoUrl, 
          extractedColors: colors,
          logoSize: design.logoSize || 64
        });
        
        toast({
          title: "Cores extraídas!",
          description: `${colors.length} cores encontradas na logo. Veja as sugestões abaixo.`,
          duration: 5000
        });
      } catch (colorError) {
        console.error('Error extracting colors:', colorError);
        toast({
          title: "Aviso",
          description: "Logo carregada, mas não foi possível extrair cores automaticamente",
          variant: "default"
        });
      } finally {
        setExtractingColors(false);
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Erro",
        description: "Erro ao fazer upload da logo",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = () => {
    onChange({ ...design, logo: null, extractedColors: undefined, logoSize: undefined });
    setColorVariations([]);
  };

  const applyColorVariation = (variation: typeof colorVariations[0]) => {
    onChange({
      ...design,
      colors: {
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
          {design.logo ? (
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
                    src={design.logo} 
                    alt="Logo" 
                    style={{ height: `${design.logoSize || 64}px`, maxWidth: '200px' }}
                    className="object-contain" 
                    onError={(e) => {
                      console.error('Logo failed to load:', design.logo);
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
                  <span className="text-sm text-muted-foreground">{design.logoSize || 64}px</span>
                </div>
                <Slider
                  value={[design.logoSize || 64]}
                  onValueChange={(values) => onChange({ ...design, logoSize: values[0] })}
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
                  value={design.logoAlign || "left"}
                  onValueChange={(value: any) => onChange({ ...design, logoAlign: value })}
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

              {design.extractedColors && design.extractedColors.length > 0 && (
                <div className="space-y-3 p-4 bg-secondary/20 rounded-lg border border-border">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-semibold">Cores Extraídas da Logo</Label>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {design.extractedColors.map((color, index) => (
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
              label="Cor Primária"
              color={design.colors.primary}
              onChange={(color) => onChange({
                ...design,
                colors: { ...design.colors, primary: color }
              })}
            />
            <ColorPicker
              label="Cor Secundária"
              color={design.colors.secondary}
              onChange={(color) => onChange({
                ...design,
                colors: { ...design.colors, secondary: color }
              })}
            />
            <ColorPicker
              label="Cor de Fundo"
              color={design.colors.background}
              onChange={(color) => onChange({
                ...design,
                colors: { ...design.colors, background: color }
              })}
            />
            <ColorPicker
              label="Cor do Texto"
              color={design.colors.text}
              onChange={(color) => onChange({
                ...design,
                colors: { ...design.colors, text: color }
              })}
            />
            <ColorPicker
              label="Cor do Botão"
              color={design.colors.button}
              onChange={(color) => onChange({
                ...design,
                colors: { ...design.colors, button: color }
              })}
            />
            <ColorPicker
              label="Cor do Texto do Botão"
              color={design.colors.buttonText}
              onChange={(color) => onChange({
                ...design,
                colors: { ...design.colors, buttonText: color }
              })}
            />
            <ColorPicker
              label="Cor da Barra de Progresso"
              color={design.colors.progressBar || design.colors.primary}
              onChange={(color) => onChange({
                ...design,
                colors: { ...design.colors, progressBar: color }
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
                value={design.typography.fontFamily}
                onValueChange={(value) => onChange({
                  ...design,
                  typography: { ...design.typography, fontFamily: value }
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
                value={design.typography.titleSize}
                onValueChange={(value) => onChange({
                  ...design,
                  typography: { ...design.typography, titleSize: value }
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
                value={design.typography.textSize}
                onValueChange={(value) => onChange({
                  ...design,
                  typography: { ...design.typography, textSize: value }
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
            value={design.spacing}
            onValueChange={(value: any) => onChange({ ...design, spacing: value })}
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
