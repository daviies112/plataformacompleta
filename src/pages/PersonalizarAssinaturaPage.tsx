import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { AssinaturaNav } from '@/components/assinatura/AssinaturaNav';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, Palette, Save, Sparkles, Shuffle, X, Camera, FileText, CheckCircle2, Shield, Smartphone, Plus, Trash2, Eye } from 'lucide-react';
import { extractColorsFromImage, generateColorVariations, hslToHex } from '@/lib/colorExtractor';

interface ContractClause {
  title: string;
  content: string;
}

interface ColorVariation {
  name: string;
  primary: string;
  secondary: string;
  background: string;
  text: string;
  button: string;
  buttonText: string;
}

function clausesToHtml(title: string, clauses: ContractClause[]): string {
  if (!title && clauses.length === 0) return '';
  let html = '';
  if (title) html += `<h2 style="text-align:center;margin-bottom:24px;font-size:18px;font-weight:bold;">${title}</h2>`;
  clauses.forEach((clause, i) => {
    if (clause.title || clause.content) {
      html += `<div style="margin-bottom:16px;">`;
      if (clause.title) html += `<h3 style="font-size:14px;font-weight:bold;margin-bottom:6px;">${i + 1}. ${clause.title}</h3>`;
      if (clause.content) html += `<p style="font-size:13px;line-height:1.6;">${clause.content.replace(/\n/g, '<br/>')}</p>`;
      html += `</div>`;
    }
  });
  return html;
}

function htmlToClauses(html: string): { title: string; clauses: ContractClause[] } {
  if (!html) return { title: '', clauses: [] };
  const titleMatch = html.match(/<h2[^>]*>(.*?)<\/h2>/);
  const contractTitle = titleMatch ? titleMatch[1] : '';
  const clauseRegex = /<div[^>]*>\s*(?:<h3[^>]*>\d+\.\s*(.*?)<\/h3>)?\s*(?:<p[^>]*>(.*?)<\/p>)?\s*<\/div>/gs;
  const clauses: ContractClause[] = [];
  let match;
  while ((match = clauseRegex.exec(html)) !== null) {
    const t = match[1] || '';
    const c = (match[2] || '').replace(/<br\s*\/?>/g, '\n');
    if (t || c) clauses.push({ title: t, content: c });
  }
  if (clauses.length === 0 && html && !titleMatch) {
    clauses.push({ title: '', content: html.replace(/<[^>]*>/g, '') });
  }
  return { title: contractTitle, clauses };
}

function ensureHex(color: string): string {
  if (color.startsWith('#')) return color;
  if (color.startsWith('hsl')) return hslToHex(color);
  return color;
}

const PersonalizarAssinaturaPage = () => {
  const { toast } = useToast();

  const [logoUrl, setLogoUrl] = useState('');
  const [logoSize, setLogoSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [titleColor, setTitleColor] = useState('#1a1a2e');
  const [textColor, setTextColor] = useState('#333333');
  const [buttonColor, setButtonColor] = useState('#22c55e');
  const [buttonTextColor, setButtonTextColor] = useState('#ffffff');
  const [iconColor, setIconColor] = useState('#2c3e50');
  const [contractHtml, setContractHtml] = useState('');
  const [contractTitle, setContractTitle] = useState('');
  const [clauses, setClauses] = useState<ContractClause[]>([]);
  const [appStoreUrl, setAppStoreUrl] = useState('');
  const [googlePlayUrl, setGooglePlayUrl] = useState('');
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [colorVariations, setColorVariations] = useState<ColorVariation[]>([]);
  const [extractingColors, setExtractingColors] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [appDialogOpen, setAppDialogOpen] = useState(false);

  const { data: globalConfig } = useQuery<any>({
    queryKey: ['/api/assinatura/global-config'],
  });

  useEffect(() => {
    if (globalConfig) {
      if (globalConfig.logo_url) setLogoUrl(globalConfig.logo_url);
      if (globalConfig.logo_size) setLogoSize(globalConfig.logo_size);
      if (globalConfig.background_color || globalConfig.verification_background_color) 
        setBackgroundColor(globalConfig.background_color || globalConfig.verification_background_color);
      if (globalConfig.title_color || globalConfig.primary_color) 
        setTitleColor(globalConfig.title_color || globalConfig.primary_color);
      if (globalConfig.text_color) setTextColor(globalConfig.text_color);
      if (globalConfig.button_color || globalConfig.verification_primary_color || globalConfig.primary_color) 
        setButtonColor(globalConfig.button_color || globalConfig.verification_primary_color || globalConfig.primary_color);
      if (globalConfig.button_text_color) setButtonTextColor(globalConfig.button_text_color);
      if (globalConfig.icon_color) setIconColor(globalConfig.icon_color);
      if (globalConfig.contract_html) {
        setContractHtml(globalConfig.contract_html);
        const parsed = htmlToClauses(globalConfig.contract_html);
        setContractTitle(parsed.title);
        setClauses(parsed.clauses.length > 0 ? parsed.clauses : []);
      }
      if (globalConfig.app_store_url) setAppStoreUrl(globalConfig.app_store_url);
      if (globalConfig.google_play_url) setGooglePlayUrl(globalConfig.google_play_url);
    }
  }, [globalConfig]);

  const saveConfigMutation = useMutation({
    mutationFn: async (configData: Record<string, unknown>) => {
      const response = await apiRequest('PUT', '/api/assinatura/global-config', configData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assinatura/global-config'] });
      toast({
        title: 'Configurações salvas',
        description: 'As personalizações foram salvas com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    }
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma imagem válida.',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setLogoUrl(dataUrl);

      setExtractingColors(true);
      try {
        const colors = await extractColorsFromImage(dataUrl, 5);
        setExtractedColors(colors);
        const variations = generateColorVariations(colors);
        setColorVariations(variations);
        toast({
          title: 'Cores extraídas!',
          description: `${colors.length} cores encontradas. Escolha uma variação abaixo.`,
        });
      } catch (err) {
        console.error('Error extracting colors:', err);
        toast({
          title: 'Aviso',
          description: 'Logo carregada, mas não foi possível extrair cores.',
        });
      } finally {
        setExtractingColors(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const applyVariation = (variation: ColorVariation) => {
    setBackgroundColor(ensureHex(variation.background));
    setTitleColor(ensureHex(variation.primary));
    setTextColor(ensureHex(variation.text));
    setButtonColor(ensureHex(variation.primary));
    setButtonTextColor(ensureHex(variation.buttonText));
    setIconColor(ensureHex(variation.secondary));
    toast({
      title: 'Variação aplicada',
      description: `"${variation.name}" foi aplicada com sucesso.`,
    });
  };

  const handleSaveConfig = () => {
    saveConfigMutation.mutate({
      logo_url: logoUrl,
      logo_size: logoSize,
      background_color: backgroundColor,
      title_color: titleColor,
      text_color: textColor,
      button_color: buttonColor,
      button_text_color: buttonTextColor,
      icon_color: iconColor,
      contract_html: contractHtml,
      app_store_url: appStoreUrl,
      google_play_url: googlePlayUrl,
      primary_color: titleColor,
      verification_primary_color: buttonColor,
      verification_text_color: textColor,
      verification_background_color: backgroundColor,
    });
  };

  const addClause = () => {
    setClauses([...clauses, { title: '', content: '' }]);
  };

  const removeClause = (index: number) => {
    setClauses(clauses.filter((_, i) => i !== index));
  };

  const updateClause = (index: number, field: 'title' | 'content', value: string) => {
    const updated = [...clauses];
    updated[index] = { ...updated[index], [field]: value };
    setClauses(updated);
  };

  const contractPreviewHtml = useMemo(() => clausesToHtml(contractTitle, clauses), [contractTitle, clauses]);

  const handleSaveContract = () => {
    const html = clausesToHtml(contractTitle, clauses);
    setContractHtml(html);
    saveConfigMutation.mutate({
      logo_url: logoUrl,
      logo_size: logoSize,
      background_color: backgroundColor,
      title_color: titleColor,
      text_color: textColor,
      button_color: buttonColor,
      button_text_color: buttonTextColor,
      icon_color: iconColor,
      contract_html: html,
      app_store_url: appStoreUrl,
      google_play_url: googlePlayUrl,
      primary_color: titleColor,
      verification_primary_color: buttonColor,
      verification_text_color: textColor,
      verification_background_color: backgroundColor,
    });
    setContractDialogOpen(false);
  };

  const removeLogo = () => {
    setLogoUrl('');
    setExtractedColors([]);
    setColorVariations([]);
  };

  const logoSizeMap = { small: 48, medium: 80, large: 120 };

  return (
    <div className="flex flex-col h-full">
      <AssinaturaNav />

      <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <Palette className="w-5 h-5" />
              Design
            </h1>
            <p className="text-sm text-muted-foreground">Configure cores, logo e textos do fluxo de assinatura</p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Button
              variant={contractHtml ? 'default' : 'outline'}
              size="sm"
              onClick={() => setContractDialogOpen(true)}
              data-testid="button-open-contract-dialog"
            >
              <FileText className="w-4 h-4 mr-1" />
              Personalizar Contrato
            </Button>
            <Button
              variant={appStoreUrl || googlePlayUrl ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAppDialogOpen(true)}
              data-testid="button-open-app-dialog"
            >
              <Smartphone className="w-4 h-4 mr-1" />
              App
            </Button>
          </div>
        </div>
        <Button
          onClick={handleSaveConfig}
          disabled={saveConfigMutation.isPending}
          data-testid="button-save-config"
        >
          <Save className="w-4 h-4 mr-2" />
          {saveConfigMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>

      <div className="flex-1 min-h-0 p-4">
        <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border">
          <ResizablePanel defaultSize={50} minSize={30}>
            <ScrollArea className="h-full">
              <div className="p-6 space-y-8">

                <section>
                  <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <Upload className="w-5 h-5" />
                    Logo da Empresa
                  </h2>

                  {logoUrl ? (
                    <div className="space-y-4">
                      <div className="relative inline-block">
                        <img
                          src={logoUrl}
                          alt="Logo"
                          style={{ height: logoSizeMap[logoSize], objectFit: 'contain' }}
                          className="rounded-md border"
                          data-testid="img-logo-preview"
                        />
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={removeLogo}
                          data-testid="button-remove-logo"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Tamanho:</label>
                        {(['small', 'medium', 'large'] as const).map((size) => (
                          <Button
                            key={size}
                            variant={logoSize === size ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setLogoSize(size)}
                            data-testid={`button-logo-size-${size}`}
                          >
                            {size === 'small' ? 'P' : size === 'medium' ? 'M' : 'G'}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover-elevate transition-all">
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Clique para enviar logo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                        data-testid="input-logo-upload"
                      />
                    </label>
                  )}

                  {extractingColors && (
                    <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                      <Sparkles className="w-4 h-4 animate-spin" />
                      Extraindo cores da logo...
                    </div>
                  )}

                  {colorVariations.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                        <Shuffle className="w-4 h-4" />
                        Variações de Cores
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {colorVariations.map((variation, index) => (
                          <Card
                            key={index}
                            className="cursor-pointer hover-elevate transition-all"
                            onClick={() => applyVariation(variation)}
                            data-testid={`card-variation-${index}`}
                          >
                            <CardContent className="p-3">
                              <p className="text-xs font-medium mb-2">{variation.name}</p>
                              <div className="flex gap-1">
                                {[variation.primary, variation.secondary, variation.background, variation.text].map((color, ci) => (
                                  <div
                                    key={ci}
                                    className="w-6 h-6 rounded-md border"
                                    style={{ backgroundColor: ensureHex(color) }}
                                  />
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                <section>
                  <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <Palette className="w-5 h-5" />
                    Paleta de Cores
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Cor de Fundo', value: backgroundColor, setter: setBackgroundColor, id: 'background' },
                      { label: 'Cor do Título', value: titleColor, setter: setTitleColor, id: 'title' },
                      { label: 'Cor do Texto', value: textColor, setter: setTextColor, id: 'text' },
                      { label: 'Cor do Botão', value: buttonColor, setter: setButtonColor, id: 'button' },
                      { label: 'Cor do Texto do Botão', value: buttonTextColor, setter: setButtonTextColor, id: 'button-text' },
                      { label: 'Cor dos Ícones', value: iconColor, setter: setIconColor, id: 'icon' },
                    ].map(({ label, value, setter, id }) => (
                      <div key={id} className="space-y-1">
                        <label className="text-sm font-medium">{label}</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={value}
                            onChange={(e) => setter(e.target.value)}
                            className="w-9 h-9 rounded-md cursor-pointer border-0 p-0"
                            data-testid={`input-color-${id}`}
                          />
                          <span className="text-xs font-mono text-muted-foreground">{value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <Button
                  onClick={handleSaveConfig}
                  disabled={saveConfigMutation.isPending}
                  className="w-full"
                  data-testid="button-save-config-bottom"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveConfigMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </div>
            </ScrollArea>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={50} minSize={30}>
            <ScrollArea className="h-full">
              <div className="p-6 flex items-start justify-center">
                <div className="w-[320px]">
                  <p className="text-sm font-medium text-muted-foreground mb-3 text-center">Pré-visualização</p>
                  <div className="rounded-[2rem] border-4 border-foreground/20 overflow-hidden shadow-xl">
                    <div className="bg-foreground/20 h-6 flex items-center justify-center">
                      <div className="w-16 h-3 rounded-full bg-foreground/30" />
                    </div>

                    <div style={{ backgroundColor, minHeight: 480, fontFamily: 'Arial, sans-serif' }}>
                      <div className="p-6 flex flex-col items-center text-center space-y-5">
                        {logoUrl && (
                          <img
                            src={logoUrl}
                            alt="Logo"
                            style={{ height: logoSizeMap[logoSize], objectFit: 'contain' }}
                            className="mx-auto"
                            data-testid="preview-logo"
                          />
                        )}

                        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: buttonColor }}>
                          <Shield className="w-8 h-8" style={{ color: buttonTextColor }} />
                        </div>

                        <h2 className="text-xl font-bold" style={{ color: titleColor }} data-testid="preview-title">
                          Verificação de Identidade
                        </h2>

                        <p className="text-sm leading-relaxed" style={{ color: textColor }} data-testid="preview-text">
                          Processo seguro e rápido para confirmar sua identidade através de reconhecimento facial.
                        </p>

                        <div className="w-full space-y-3 pt-2">
                          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: `${buttonColor}10` }}>
                            <Camera className="w-5 h-5 flex-shrink-0" style={{ color: iconColor }} />
                            <span className="text-sm text-left" style={{ color: textColor }}>Tire uma selfie rápida</span>
                          </div>
                          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: `${buttonColor}10` }}>
                            <FileText className="w-5 h-5 flex-shrink-0" style={{ color: iconColor }} />
                            <span className="text-sm text-left" style={{ color: textColor }}>Fotografe seu documento</span>
                          </div>
                          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: `${buttonColor}10` }}>
                            <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: iconColor }} />
                            <span className="text-sm text-left" style={{ color: textColor }}>Verificação automática</span>
                          </div>
                        </div>

                        <button
                          className="w-full py-3 rounded-lg font-semibold text-sm transition-all mt-4"
                          style={{ backgroundColor: buttonColor, color: buttonTextColor }}
                          data-testid="preview-button"
                        >
                          Iniciar Verificação
                        </button>

                        <p className="text-xs flex items-center gap-1 pt-2" style={{ color: `${textColor}99` }}>
                          <Shield className="w-3 h-3" style={{ color: iconColor }} />
                          Suas informações são processadas de forma segura
                        </p>

                        {contractHtml && (
                          <div className="w-full mt-4 pt-4 border-t" style={{ borderColor: `${textColor}20` }}>
                            <p className="text-xs font-medium mb-2" style={{ color: titleColor }}>Contrato</p>
                            <div
                              className="text-xs text-left leading-relaxed max-h-24 overflow-hidden"
                              style={{ color: textColor }}
                              dangerouslySetInnerHTML={{ __html: contractHtml.substring(0, 300) + (contractHtml.length > 300 ? '...' : '') }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <Dialog open={contractDialogOpen} onOpenChange={setContractDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Personalizar Contrato
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setContractDialogOpen(false)} data-testid="button-contract-cancel">
                  Fechar
                </Button>
                <Button size="sm" onClick={handleSaveContract} disabled={saveConfigMutation.isPending} data-testid="button-contract-save">
                  <Save className="w-4 h-4 mr-1" />
                  Salvar Contrato
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 flex">
            <div className="w-1/2 border-r overflow-y-auto p-6 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Informações do Contrato
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="contractTitle">Título do Contrato</Label>
                    <Input
                      id="contractTitle"
                      value={contractTitle}
                      onChange={(e) => setContractTitle(e.target.value)}
                      placeholder="Contrato de Prestação de Serviços"
                      data-testid="input-contract-title"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                  <CardTitle className="text-base">Cláusulas do Contrato</CardTitle>
                  <Button variant="outline" size="sm" onClick={addClause} data-testid="button-add-clause">
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {clauses.length === 0 ? (
                    <p className="text-muted-foreground text-center py-6 text-sm">
                      Nenhuma cláusula adicionada. Clique em "Adicionar" para começar.
                    </p>
                  ) : (
                    clauses.map((clause, index) => (
                      <div key={index} className="p-4 border rounded-lg space-y-3" data-testid={`clause-${index}`}>
                        <div className="flex items-center justify-between">
                          <Label className="font-semibold text-sm">Cláusula {index + 1}</Label>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeClause(index)}
                            className="text-destructive"
                            data-testid={`button-remove-clause-${index}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <Input
                          placeholder="Título da cláusula"
                          value={clause.title}
                          onChange={(e) => updateClause(index, 'title', e.target.value)}
                          data-testid={`input-clause-title-${index}`}
                        />
                        <Textarea
                          placeholder="Conteúdo da cláusula"
                          value={clause.content}
                          onChange={(e) => updateClause(index, 'content', e.target.value)}
                          rows={3}
                          data-testid={`input-clause-content-${index}`}
                        />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="w-1/2 overflow-y-auto p-6 bg-muted/30">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Pré-visualização do Contrato</span>
              </div>
              <div className="bg-background rounded-lg border shadow-sm p-8 min-h-[400px]">
                {contractPreviewHtml ? (
                  <div
                    className="prose prose-sm max-w-none"
                    style={{ color: textColor }}
                    dangerouslySetInnerHTML={{ __html: contractPreviewHtml }}
                    data-testid="preview-contract-html"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-sm">
                    <FileText className="w-12 h-12 mb-3 opacity-30" />
                    <p>Adicione um título e cláusulas para ver a pré-visualização</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={appDialogOpen} onOpenChange={setAppDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              URLs do Aplicativo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Apple Store URL</label>
              <input
                type="url"
                value={appStoreUrl}
                onChange={(e) => setAppStoreUrl(e.target.value)}
                placeholder="https://apps.apple.com/app/..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                data-testid="input-app-store-url"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Google Play URL</label>
              <input
                type="url"
                value={googlePlayUrl}
                onChange={(e) => setGooglePlayUrl(e.target.value)}
                placeholder="https://play.google.com/store/apps/..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                data-testid="input-google-play-url"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAppDialogOpen(false)} data-testid="button-app-cancel">
              Fechar
            </Button>
            <Button onClick={() => { handleSaveConfig(); setAppDialogOpen(false); }} data-testid="button-app-save">
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PersonalizarAssinaturaPage;
