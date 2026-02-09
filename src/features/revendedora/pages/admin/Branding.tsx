import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Palette, Save, Sparkles, Shuffle, X } from "lucide-react";
import { useAdminSupabase } from "@/features/revendedora/contexts/AdminSupabaseContext";
import { useBranding } from "@/features/revendedora/contexts/CompanyContext";
import { extractColorsFromImage, generateColorVariations, hslToHex } from "@/lib/colorExtractor";
import { PlatformPreview } from "@/features/revendedora/components/PlatformPreview";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ColorVariation {
  name: string;
  primary: string;
  secondary: string;
  background: string;
  text: string;
  button: string;
  buttonText: string;
}

interface CompanyData {
  id: string;
  primary_color: string;
  secondary_color: string;
  logo_url?: string;
  logo_size?: string;
  color_palette?: string[];
  background_color?: string;
  sidebar_background?: string;
  button_color?: string;
  button_text_color?: string;
  text_color?: string;
  heading_color?: string;
}

function ensureHex(color: string): string {
  if (color.startsWith('#')) return color;
  if (color.startsWith('hsl')) return hslToHex(color);
  return color;
}

export default function Branding() {
  const { client: supabase, loading: supabaseLoading, configured } = useAdminSupabase();
  const { refetch: refetchBranding } = useBranding();
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [headingColor, setHeadingColor] = useState("#1a1a2e");
  const [textColor, setTextColor] = useState("#333333");
  const [buttonColor, setButtonColor] = useState("#9b87f5");
  const [buttonTextColor, setButtonTextColor] = useState("#ffffff");
  const [sidebarColor, setSidebarColor] = useState("#1a1a1a");

  const [logoUrl, setLogoUrl] = useState("");
  const [logoSize, setLogoSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [colorPalette, setColorPalette] = useState<string[]>([]);
  const [colorVariations, setColorVariations] = useState<ColorVariation[]>([]);
  const [extractingColors, setExtractingColors] = useState(false);

  const fetchCompany = async () => {
    if (!supabase || !configured) {
      console.log('[Branding] Supabase not configured or not ready');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('companies' as any)
        .select('id, company_name, primary_color, secondary_color, logo_url, logo_size, color_palette, background_color, sidebar_background, button_color, button_text_color, text_color, heading_color')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[Branding] Error fetching company:', error);
        toast.error(`Erro ao buscar empresa: ${error.message}`);
        return;
      }

      if (data) {
        const d = data as any as CompanyData;
        setCompany(d);
        setBackgroundColor(d.background_color || "#ffffff");
        setHeadingColor(d.heading_color || "#1a1a2e");
        setTextColor(d.text_color || "#333333");
        setButtonColor(d.button_color || "#9b87f5");
        setButtonTextColor(d.button_text_color || "#ffffff");
        setSidebarColor(d.sidebar_background || "#1a1a1a");
        setLogoUrl(d.logo_url || "");
        setLogoSize((d.logo_size as 'small' | 'medium' | 'large') || "medium");
        setColorPalette(d.color_palette || []);
        console.log('[Branding] Company loaded:', d.id);
      } else {
        console.log('[Branding] No company found, creating one...');
        const { data: newCompany, error: createError } = await supabase
          .from('companies' as any)
          .insert({
            company_name: 'Minha Empresa',
            primary_color: "#9b87f5",
            secondary_color: "#1a1a1a",
            background_color: "#ffffff",
            heading_color: "#1a1a2e",
            text_color: "#333333",
            button_color: "#9b87f5",
            button_text_color: "#ffffff",
            sidebar_background: "#1a1a1a",
            sidebar_text: "#ffffff",
            accent_color: "#9b87f5",
            selected_item_color: "#9b87f5",
          })
          .select('id, company_name, primary_color, secondary_color, logo_url, logo_size, color_palette, background_color, sidebar_background, button_color, button_text_color, text_color, heading_color')
          .single();

        if (createError) {
          console.error('[Branding] Error creating company:', createError);
          toast.error(`Erro ao criar empresa: ${createError.message}`);
          return;
        }

        if (newCompany) {
          const d = newCompany as any as CompanyData;
          setCompany(d);
          toast.success("Empresa criada com sucesso!");
        }
      }
    } catch (err: any) {
      console.error('[Branding] Unexpected error:', err);
      toast.error(`Erro inesperado: ${err.message}`);
    }
  };

  useEffect(() => {
    if (!supabaseLoading && configured && supabase) {
      fetchCompany();
    }
  }, [supabaseLoading, configured, supabase]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione uma imagem válida.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setLogoUrl(dataUrl);

      setExtractingColors(true);
      try {
        const colors = await extractColorsFromImage(dataUrl, 5);
        setColorPalette(colors.map(c => ensureHex(c)));
        const variations = generateColorVariations(colors);
        setColorVariations(variations);
        toast.success(`${colors.length} cores extraídas! Escolha uma variação abaixo.`);
      } catch (err) {
        console.error('Error extracting colors:', err);
        toast.info("Logo carregada, mas não foi possível extrair cores.");
      } finally {
        setExtractingColors(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const applyVariation = (variation: ColorVariation) => {
    setBackgroundColor(ensureHex(variation.background));
    setHeadingColor(ensureHex(variation.primary));
    setTextColor(ensureHex(variation.text));
    setButtonColor(ensureHex(variation.button));
    setButtonTextColor(ensureHex(variation.buttonText));
    setSidebarColor(ensureHex(variation.secondary));
    toast.success(`"${variation.name}" aplicada com sucesso.`);
  };

  const removeLogo = () => {
    setLogoUrl("");
    setColorVariations([]);
    setColorPalette([]);
  };

  const handleSave = async () => {
    if (!supabase || !configured) {
      toast.error("Supabase não configurado. Verifique as credenciais nas Configurações.");
      return;
    }

    setIsSaving(true);
    try {
      let finalLogoUrl = logoUrl;

      if (logoUrl && logoUrl.startsWith('data:')) {
        try {
          const blob = await fetch(logoUrl).then(r => r.blob());
          const fileExt = 'png';
          const fileName = `logo-${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('company-logos')
            .upload(fileName, blob, { cacheControl: '3600', upsert: true });

          if (uploadError) {
            console.warn('[Branding] Logo upload failed (storage may not be configured):', uploadError.message);
            finalLogoUrl = logoUrl;
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('company-logos')
              .getPublicUrl(fileName);
            finalLogoUrl = publicUrl;
          }
        } catch (uploadErr: any) {
          console.warn('[Branding] Logo upload skipped:', uploadErr.message);
        }
      }

      const saveData = {
        company_name: 'Minha Empresa',
        background_color: backgroundColor,
        heading_color: headingColor,
        text_color: textColor,
        button_color: buttonColor,
        button_text_color: buttonTextColor,
        sidebar_background: sidebarColor,
        sidebar_text: '#ffffff',
        selected_item_color: buttonColor,
        accent_color: buttonColor,
        primary_color: buttonColor,
        secondary_color: sidebarColor,
        logo_url: finalLogoUrl || null,
        logo_size: logoSize,
        color_palette: colorPalette,
        branding_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('[Branding] Saving branding data:', JSON.stringify(saveData, null, 2));

      if (company) {
        const { data: updateResult, error: updateError } = await supabase
          .from('companies' as any)
          .update(saveData)
          .eq('id', company.id)
          .select();

        if (updateError) {
          console.error('[Branding] Update error:', updateError);
          toast.error(`Erro ao salvar configurações: ${updateError.message}`);
          return;
        }
        console.log('[Branding] Update successful, result:', updateResult);
      } else {
        const { data: newCompany, error: insertError } = await supabase
          .from('companies' as any)
          .insert(saveData)
          .select('id')
          .single();

        if (insertError) {
          console.error('[Branding] Insert error:', insertError);
          toast.error(`Erro ao criar empresa: ${insertError.message}`);
          return;
        }

        if (newCompany) {
          console.log('[Branding] Insert successful, new company:', newCompany);
          setCompany(newCompany as any);
        }
      }

      await fetchCompany();
      toast.success("Personalização salva com sucesso!", {
        description: "As alterações foram aplicadas à plataforma"
      });

      try {
        console.log('[Branding] Triggering global branding refetch...');
        await refetchBranding();
        console.log('[Branding] Global branding refetch completed successfully');
      } catch (refetchErr) {
        console.warn('[Branding] Branding refetch warning (non-critical):', refetchErr);
      }
    } catch (error: any) {
      console.error('[Branding] Save error:', error);
      toast.error(`Erro ao salvar personalização: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const logoSizeMap = { small: 48, medium: 80, large: 120 };

  const colorFields = [
    { label: 'Cor de Fundo', value: backgroundColor, setter: setBackgroundColor, id: 'background' },
    { label: 'Cor dos Títulos', value: headingColor, setter: setHeadingColor, id: 'heading' },
    { label: 'Cor do Texto', value: textColor, setter: setTextColor, id: 'text' },
    { label: 'Cor do Botão', value: buttonColor, setter: setButtonColor, id: 'button' },
    { label: 'Cor do Texto do Botão', value: buttonTextColor, setter: setButtonTextColor, id: 'button-text' },
    { label: 'Cor da Barra Lateral', value: sidebarColor, setter: setSidebarColor, id: 'sidebar' },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Palette className="w-5 h-5" />
            Design da Plataforma
          </h1>
          <p className="text-sm text-muted-foreground">Configure cores e logo para personalizar login, plataforma e loja</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          data-testid="button-save-config"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>

      <div className="flex-1 min-h-0 p-4">
        <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border">
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full flex items-center justify-center p-4">
              <PlatformPreview
                backgroundColor={backgroundColor}
                headingColor={headingColor}
                textColor={textColor}
                buttonColor={buttonColor}
                buttonTextColor={buttonTextColor}
                sidebarColor={sidebarColor}
                logoUrl={logoUrl}
                logoSize={logoSize}
                companyName={company?.company_name}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

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
                                {[variation.primary, variation.secondary, variation.background, variation.text, variation.button, variation.buttonText].map((color, ci) => (
                                  <div
                                    key={ci}
                                    className="w-5 h-5 rounded-md border"
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
                    {colorFields.map(({ label, value, setter, id }) => (
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
              </div>
            </ScrollArea>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
