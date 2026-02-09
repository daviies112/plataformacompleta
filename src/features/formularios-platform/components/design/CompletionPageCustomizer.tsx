import { useState } from "react";
import { CompletionPageConfig } from "../../types/form";
import { ColorPicker } from "./ColorPicker";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { CheckCircle2, Award, Link as LinkIcon, Palette, Type, Upload, X, Image } from "lucide-react";
import { api } from "../../lib/api";
import { useToast } from "../../hooks/use-toast";

interface CompletionPageCustomizerProps {
  config: CompletionPageConfig;
  onChange: (config: CompletionPageConfig) => void;
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

export const CompletionPageCustomizer = ({
  config,
  onChange,
}: CompletionPageCustomizerProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const updateConfig = (updates: Partial<CompletionPageConfig>) => {
    onChange({ ...config, ...updates });
  };

  const updateDesign = (updates: Partial<NonNullable<CompletionPageConfig['design']>>) => {
    const currentDesign = config.design || {
      colors: {
        primary: "hsl(221, 83%, 53%)",
        secondary: "hsl(210, 40%, 96%)",
        background: "hsl(0, 0%, 100%)",
        text: "hsl(222, 47%, 11%)",
        successIcon: "hsl(142, 71%, 45%)",
        failureIcon: "hsl(0, 84%, 60%)"
      },
      typography: {
        fontFamily: "Inter",
        titleSize: "3xl",
        textSize: "base"
      },
      spacing: "comfortable"
    };
    
    onChange({ 
      ...config, 
      design: { ...currentDesign, ...updates } 
    });
  };

  const updateColors = (colorUpdates: Partial<NonNullable<CompletionPageConfig['design']>['colors']>) => {
    const currentDesign = config.design || {
      colors: {
        primary: "hsl(221, 83%, 53%)",
        secondary: "hsl(210, 40%, 96%)",
        background: "hsl(0, 0%, 100%)",
        text: "hsl(222, 47%, 11%)",
        successIcon: "hsl(142, 71%, 45%)",
        failureIcon: "hsl(0, 84%, 60%)"
      },
      typography: {
        fontFamily: "Inter",
        titleSize: "3xl",
        textSize: "base"
      },
      spacing: "comfortable"
    };
    
    updateDesign({
      colors: { ...currentDesign.colors, ...colorUpdates }
    });
  };

  const updateTypography = (typoUpdates: Partial<NonNullable<CompletionPageConfig['design']>['typography']>) => {
    const currentDesign = config.design || {
      colors: {
        primary: "hsl(221, 83%, 53%)",
        secondary: "hsl(210, 40%, 96%)",
        background: "hsl(0, 0%, 100%)",
        text: "hsl(222, 47%, 11%)",
        successIcon: "hsl(142, 71%, 45%)",
        failureIcon: "hsl(0, 84%, 60%)"
      },
      typography: {
        fontFamily: "Inter",
        titleSize: "3xl",
        textSize: "base"
      },
      spacing: "comfortable"
    };
    
    updateDesign({
      typography: { ...currentDesign.typography, ...typoUpdates }
    });
  };

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
      updateDesign({ logo: logoUrl });
      
      toast({
        title: "Sucesso!",
        description: "Logo enviada com sucesso"
      });
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
    updateDesign({ logo: null });
  };

  const design = config.design || {
    colors: {
      primary: "hsl(221, 83%, 53%)",
      secondary: "hsl(210, 40%, 96%)",
      background: "hsl(0, 0%, 100%)",
      text: "hsl(222, 47%, 11%)",
      successIcon: "hsl(142, 71%, 45%)",
      failureIcon: "hsl(0, 84%, 60%)"
    },
    typography: {
      fontFamily: "Inter",
      titleSize: "3xl",
      textSize: "base"
    },
    logo: null,
    logoAlign: "left",
    spacing: "comfortable"
  };

  return (
    <div className="space-y-4 max-h-[calc(100vh-20rem)] overflow-y-auto pr-2">
      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="content" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Conteúdo
          </TabsTrigger>
          <TabsTrigger value="advanced" className="gap-2">
            <LinkIcon className="h-4 w-4" />
            Avançado
          </TabsTrigger>
        </TabsList>

          <TabsContent value="content" className="space-y-4 mt-4">
            <Card className="p-6 bg-gradient-to-br from-card to-card/80 border-border shadow-md">
              <div className="space-y-1 mb-4">
                <h3 className="text-lg font-semibold">Textos Principais</h3>
                <p className="text-sm text-muted-foreground">
                  Configure os textos exibidos na página de conclusão
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="completion-title">Título da Página</Label>
                  <Input
                    id="completion-title"
                    value={config.title}
                    onChange={(e) => updateConfig({ title: e.target.value })}
                    placeholder="Obrigado!"
                    className="bg-background border-border"
                  />
                </div>

                <div>
                  <Label htmlFor="completion-subtitle">Subtítulo (Opcional)</Label>
                  <Input
                    id="completion-subtitle"
                    value={config.subtitle || ""}
                    onChange={(e) => updateConfig({ subtitle: e.target.value })}
                    placeholder="Sua resposta foi registrada"
                    className="bg-background border-border"
                  />
                </div>

                <div>
                  <Label htmlFor="success-message">Mensagem de Sucesso</Label>
                  <Textarea
                    id="success-message"
                    value={config.successMessage}
                    onChange={(e) => updateConfig({ successMessage: e.target.value })}
                    placeholder="Mensagem para candidatos qualificados"
                    className="bg-background border-border resize-none"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="failure-message">Mensagem de Não Qualificado</Label>
                  <Textarea
                    id="failure-message"
                    value={config.failureMessage}
                    onChange={(e) => updateConfig({ failureMessage: e.target.value })}
                    placeholder="Mensagem para candidatos não qualificados"
                    className="bg-background border-border resize-none"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="additional-thank-you">Texto Adicional de Agradecimento (Opcional)</Label>
                  <Textarea
                    id="additional-thank-you"
                    value={config.additionalThankYouText || ""}
                    onChange={(e) => updateConfig({ additionalThankYouText: e.target.value })}
                    placeholder="Adicione um texto extra de agradecimento ou informações complementares"
                    className="bg-background border-border resize-none"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Este texto aparecerá após a mensagem principal de sucesso/falha
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-card to-card/80 border-border shadow-md">
              <div className="space-y-1 mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Elementos Visuais
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-score">Exibir Pontuação</Label>
                    <p className="text-xs text-muted-foreground">
                      Mostra a pontuação total obtida
                    </p>
                  </div>
                  <Switch
                    id="show-score"
                    checked={config.showScore}
                    onCheckedChange={(checked) => updateConfig({ showScore: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-tier">Exibir Nível/Badge</Label>
                    <p className="text-xs text-muted-foreground">
                      Mostra o badge do nível de qualificação
                    </p>
                  </div>
                  <Switch
                    id="show-tier"
                    checked={config.showTierBadge}
                    onCheckedChange={(checked) => updateConfig({ showTierBadge: checked })}
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-4">
            <Card className="p-6 bg-gradient-to-br from-card to-card/80 border-border shadow-md">
              <div className="space-y-1 mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Image className="h-5 w-5 text-primary" />
                  Logo
                </h3>
              </div>

              <div className="space-y-4">
                {design.logo ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <img src={design.logo} alt="Logo" className="h-16 object-contain" />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={removeLogo}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div>
                      <Label>Alinhamento da Logo</Label>
                      <Select
                        value={design.logoAlign || "left"}
                        onValueChange={(value: any) => updateDesign({ logoAlign: value })}
                      >
                        <SelectTrigger className="bg-background border-border">
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
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      id="completion-logo-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploading}
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('completion-logo-upload')?.click()}
                      disabled={uploading}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {uploading ? "Enviando..." : "Fazer Upload da Logo"}
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-card to-card/80 border-border shadow-md">
              <div className="space-y-1 mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  Cores
                </h3>
                <p className="text-sm text-muted-foreground">
                  Personalize as cores da página final
                </p>
              </div>

              <div className="space-y-4">
                <ColorPicker
                  label="Cor Principal"
                  color={design.colors.primary}
                  onChange={(color) => updateColors({ primary: color })}
                />
                <ColorPicker
                  label="Cor Secundária (Fundos)"
                  color={design.colors.secondary}
                  onChange={(color) => updateColors({ secondary: color })}
                />
                <ColorPicker
                  label="Cor de Fundo"
                  color={design.colors.background}
                  onChange={(color) => updateColors({ background: color })}
                />
                <ColorPicker
                  label="Cor do Texto"
                  color={design.colors.text}
                  onChange={(color) => updateColors({ text: color })}
                />
                <ColorPicker
                  label="Ícone de Sucesso"
                  color={design.colors.successIcon}
                  onChange={(color) => updateColors({ successIcon: color })}
                />
                <ColorPicker
                  label="Ícone de Falha"
                  color={design.colors.failureIcon}
                  onChange={(color) => updateColors({ failureIcon: color })}
                />
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-card to-card/80 border-border shadow-md">
              <div className="space-y-1 mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Type className="h-5 w-5 text-primary" />
                  Tipografia
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Fonte</Label>
                  <Select
                    value={design.typography.fontFamily}
                    onValueChange={(value) => updateTypography({ fontFamily: value })}
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontFamilies.map((font) => (
                        <SelectItem key={font} value={font}>
                          {font}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tamanho do Título</Label>
                  <Select
                    value={design.typography.titleSize}
                    onValueChange={(value) => updateTypography({ titleSize: value })}
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {textSizes.map((size) => (
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
                    onValueChange={(value) => updateTypography({ textSize: value })}
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {textSizes.map((size) => (
                        <SelectItem key={size.value} value={size.value}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-card to-card/80 border-border shadow-md">
              <div className="space-y-1 mb-4">
                <h3 className="text-lg font-semibold">Espaçamento</h3>
              </div>

              <div>
                <Label>Espaçamento entre elementos</Label>
                <Select
                  value={design.spacing}
                  onValueChange={(value: any) => updateDesign({ spacing: value })}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {spacingOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-card to-card/80 border-border shadow-md">
              <div className="space-y-1 mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-primary" />
                  Chamada para Ação (CTA)
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="cta-text">Texto do Botão (Opcional)</Label>
                  <Input
                    id="cta-text"
                    value={config.ctaText || ""}
                    onChange={(e) => updateConfig({ ctaText: e.target.value })}
                    placeholder="Agendar Reunião"
                    className="bg-background border-border"
                  />
                </div>

                <div>
                  <Label htmlFor="cta-url">URL do Botão (Opcional)</Label>
                  <Input
                    id="cta-url"
                    value={config.ctaUrl || ""}
                    onChange={(e) => updateConfig({ ctaUrl: e.target.value })}
                    placeholder="https://seusite.com/agendar"
                    className="bg-background border-border"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-card to-card/80 border-border shadow-md">
              <div className="space-y-1 mb-4">
                <h3 className="text-lg font-semibold">Conteúdo Adicional</h3>
                <p className="text-sm text-muted-foreground">
                  HTML ou texto adicional para exibir na página
                </p>
              </div>

              <div>
                <Label htmlFor="custom-content">Conteúdo Personalizado (Opcional)</Label>
                <Textarea
                  id="custom-content"
                  value={config.customContent || ""}
                  onChange={(e) => updateConfig({ customContent: e.target.value })}
                  placeholder="Adicione informações extras, HTML ou texto..."
                  className="bg-background border-border resize-none font-mono text-sm"
                  rows={5}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Suporta HTML básico. Será exibido abaixo da mensagem principal.
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
};
