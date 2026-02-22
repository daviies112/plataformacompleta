import { useState, useEffect, useCallback } from "react";
import { Button } from "@/features/produto/components/ui/button";
import { Input } from "@/features/produto/components/ui/input";
import { Label } from "@/features/produto/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/features/produto/components/ui/select";
import { Checkbox } from "@/features/produto/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/features/produto/components/ui/card";
import { Separator } from "@/features/produto/components/ui/separator";
import { Badge } from "@/features/produto/components/ui/badge";
import { Switch } from "@/features/produto/components/ui/switch";
import { toast } from "sonner";
import {
  Settings,
  Printer,
  Plus,
  Trash2,
  Star,
  Loader2,
  CheckCircle2,
  Zap,
  Eye,
  Barcode,
  QrCode,
  Type,
  Tag,
  FileText,
  ClipboardList,
  Image
} from "lucide-react";
import { usePrinter } from "@/hooks/usePrinter";
import { PrintQueueList } from "@/features/produto/components/PrintQueue/PrintQueueList";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/features/produto/components/ui/tabs";
import {
  LABEL_SIZES,
  BARCODE_TYPES,
  PRINT_FORMATS,
  PRINTER_TYPES,
  DEFAULT_ENABLED_FIELDS,
  type PrinterConfig as PrinterConfigType,
  type CreatePrinterConfig,
  type PrinterEnabledFields,
  type PrintFormat,
  type BarcodeType,
} from "@/features/produto/types/printer.types";

interface PrinterConfigProps {
  settings?: any;
  onUpdateSettings?: (settings: any) => void;
}

interface AutoSuggestion {
  field: string;
  currentValue: string;
  suggestedValue: string;
  reason: string;
}

export const PrinterConfig = ({ settings, onUpdateSettings }: PrinterConfigProps) => {
  const {
    defaultConfig,
    allConfigs,
    isLoading,
    error,
    createConfig,
    updateConfig,
    deleteConfig,
    setDefaultConfig,
    fetchConfigs,
  } = usePrinter();

  const [printerName, setPrinterName] = useState<string>("");
  const [printerModel, setPrinterModel] = useState<string>("");
  const [printerType, setPrinterType] = useState<string>("thermal");
  const [labelSize, setLabelSize] = useState<string>("90MMX12MM");
  const [printFormat, setPrintFormat] = useState<PrintFormat>("pdf");
  const [barcodeType, setBarcodeType] = useState<BarcodeType>("CODE128");
  const [dpi, setDpi] = useState<number>(203);
  const [enabledFields, setEnabledFields] = useState<PrinterEnabledFields>(DEFAULT_ENABLED_FIELDS);
  const [editingConfigId, setEditingConfigId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'label' | 'fields'>('config');
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(true);
  const [autoSuggestions, setAutoSuggestions] = useState<AutoSuggestion[]>([]);

  // Logo & Design Customization State
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [logoWidth, setLogoWidth] = useState<number>(30);
  const [logoHeight, setLogoHeight] = useState<number>(10);
  const [logoX, setLogoX] = useState<number>(0);
  const [logoY, setLogoY] = useState<number>(0);
  const [logoOpacity, setLogoOpacity] = useState<number>(1);
  const [showLogo, setShowLogo] = useState<boolean>(false);

  // Font Sizes
  const [titleFontSize, setTitleFontSize] = useState<number>(9); // Default 9px/pt
  const [priceFontSize, setPriceFontSize] = useState<number>(12); // Default 12px/pt
  const [codeFontSize, setCodeFontSize] = useState<number>(8); // Default 8px/pt

  useEffect(() => {
    // Load logo config from localStorage
    const savedLogoConfig = localStorage.getItem('printer_logo_config');
    if (savedLogoConfig) {
      const config = JSON.parse(savedLogoConfig);
      setLogoBase64(config.logoBase64 || null);
      setLogoWidth(config.logoWidth || 30);
      setLogoHeight(config.logoHeight || 10);
      setLogoX(config.logoX || 0);
      setLogoY(config.logoY || 0);
      setLogoOpacity(config.logoOpacity ?? 1);
      setShowLogo(config.showLogo ?? false);

      // Load font sizes
      if (config.titleFontSize) setTitleFontSize(config.titleFontSize);
      if (config.priceFontSize) setPriceFontSize(config.priceFontSize);
      if (config.codeFontSize) setCodeFontSize(config.codeFontSize);
    }
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) { // 500KB limit
        toast.error("A imagem é muito grande. Use uma imagem menor que 500KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoBase64(reader.result as string);
        setShowLogo(true);
        saveLogoConfig({ logoBase64: reader.result as string, showLogo: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoBase64(null);
    setShowLogo(false);
    saveLogoConfig({ logoBase64: null, showLogo: false });
  };

  const saveLogoConfig = (updates: any) => {
    const currentConfig = {
      logoBase64,
      logoWidth,
      logoHeight,
      logoX,
      logoY,
      logoOpacity,
      showLogo,
      titleFontSize,
      priceFontSize,
      codeFontSize,
      ...updates
    };
    localStorage.setItem('printer_logo_config', JSON.stringify(currentConfig));
  };

  useEffect(() => {
    if (defaultConfig) {
      loadConfigToForm(defaultConfig);
    }
  }, [defaultConfig]);

  useEffect(() => {
    if (autoDetectEnabled && labelSize) {
      detectOptimalSettings();
    }
  }, [labelSize, printerType, autoDetectEnabled]);

  const detectOptimalSettings = useCallback(() => {
    const suggestions: AutoSuggestion[] = [];
    const selectedSize = LABEL_SIZES.find(s => s.value === labelSize);

    if (!selectedSize) return;

    const { widthMm, heightMm } = selectedSize;
    const isSmallLabel = widthMm <= 35 || heightMm <= 20;
    const isVerySmallLabel = widthMm <= 28 || heightMm <= 15;

    let optimalDpi = 203;
    if (widthMm <= 30) {
      optimalDpi = 300;
    } else if (widthMm >= 80) {
      optimalDpi = 203;
    }

    if (dpi !== optimalDpi) {
      suggestions.push({
        field: 'dpi',
        currentValue: String(dpi),
        suggestedValue: String(optimalDpi),
        reason: `DPI ${optimalDpi} é ideal para etiquetas de ${widthMm}x${heightMm}mm`
      });
    }

    if (isVerySmallLabel && enabledFields.qrcode) {
      suggestions.push({
        field: 'qrcode',
        currentValue: 'habilitado',
        suggestedValue: 'desabilitado',
        reason: 'QR Code pode ficar ilegível em etiquetas muito pequenas'
      });
    }

    if (isSmallLabel && (enabledFields.supplier || enabledFields.weight)) {
      suggestions.push({
        field: 'campos_extras',
        currentValue: 'muitos campos',
        suggestedValue: 'campos essenciais',
        reason: 'Etiquetas pequenas funcionam melhor com menos campos'
      });
    }

    if (printerType === 'thermal' && printFormat !== 'zpl' && printFormat !== 'epl' && printFormat !== 'pdf') {
      suggestions.push({
        field: 'printFormat',
        currentValue: printFormat,
        suggestedValue: 'pdf',
        reason: 'PDF é o formato mais universal para impressão'
      });
    }

    setAutoSuggestions(suggestions);
  }, [labelSize, dpi, enabledFields, printerType, printFormat]);

  const applyAllSuggestions = () => {
    autoSuggestions.forEach(suggestion => {
      switch (suggestion.field) {
        case 'dpi':
          setDpi(Number(suggestion.suggestedValue));
          break;
        case 'qrcode':
          setEnabledFields(prev => ({ ...prev, qrcode: false }));
          break;
        case 'campos_extras':
          setEnabledFields(prev => ({
            ...prev,
            supplier: false,
            weight: false,
            wholesalePrice: false,
            goldPlatingMillesimal: false
          }));
          break;
        case 'printFormat':
          setPrintFormat(suggestion.suggestedValue as PrintFormat);
          break;
      }
    });
    toast.success("Otimizações aplicadas ao formulário - clique em Salvar para persistir", {
      description: "As alterações foram aplicadas localmente. Salve para confirmar."
    });
    setAutoSuggestions([]);
  };

  const loadConfigToForm = (config: PrinterConfigType) => {
    setPrinterName(config.printerName);
    setPrinterModel(config.printerModel || "");
    setPrinterType(config.printerType || "thermal");
    // Tenta encontrar um tamanho Jueri correspondente ou usa o customizado
    const sizeMatch = LABEL_SIZES.find(s => s.widthMm === Number(config.labelWidthMm) && s.heightMm === Number(config.labelHeightMm));
    setLabelSize(sizeMatch ? sizeMatch.value : `${config.labelWidthMm}x${config.labelHeightMm}`);

    setPrintFormat(config.printFormat);
    setBarcodeType(config.barcodeType);
    setDpi(config.dpi);
    setEnabledFields({ ...DEFAULT_ENABLED_FIELDS, ...config.enabledFields });
    setEditingConfigId(config.id);
  };

  const getLabelDimensions = (sizeValue: string) => {
    const size = LABEL_SIZES.find(s => s.value === sizeValue);
    if (size) {
      return { widthMm: size.widthMm, heightMm: size.heightMm };
    }
    const [width, height] = sizeValue.split("x").map(Number);
    return { widthMm: width || 60, heightMm: height || 40 };
  };

  const handleSave = async () => {
    if (!printerName.trim()) {
      toast.error("Digite um nome para a configuração");
      return;
    }

    const { widthMm, heightMm } = getLabelDimensions(labelSize);

    const configData: CreatePrinterConfig = {
      printerName: printerName.trim(),
      printerModel: printerModel || undefined,
      printerType,
      connectionType: "browser",
      labelWidthMm: String(widthMm),
      labelHeightMm: String(heightMm),
      printFormat,
      dpi,
      barcodeType,
      enabledFields,
      isDefault: allConfigs.length === 0,
      isActive: true,
    };

    let result;
    if (editingConfigId) {
      result = await updateConfig({ id: editingConfigId, ...configData });
      if (result) {
        toast.success("Configuração atualizada com sucesso!");
      }
    } else {
      result = await createConfig(configData);
      if (result) {
        toast.success("Configuração salva com sucesso!");
        setEditingConfigId(result.id);
      }
    }

    if (!result && error) {
      toast.error(error);
    }

    if (onUpdateSettings) {
      onUpdateSettings({
        printerModel: printerModel,
        printerName: printerName,
        barcodeType,
        labelSize,
        enabledFields,
      });
    }
  };

  const handleNewConfig = () => {
    setEditingConfigId(null);
    setPrinterName("");
    setPrinterModel("");
    setPrinterType("thermal");
    setLabelSize("90MMX12MM");
    setPrintFormat("pdf");
    setBarcodeType("CODE128");
    setDpi(203);
    setEnabledFields(DEFAULT_ENABLED_FIELDS);
  };

  const handleDeleteConfig = async (id: number) => {
    const success = await deleteConfig(id);
    if (success) {
      toast.success("Configuração excluída");
      if (editingConfigId === id) {
        handleNewConfig();
      }
    } else if (error) {
      toast.error(error);
    }
  };

  const handleSetDefault = async (id: number) => {
    const success = await setDefaultConfig(id);
    if (success) {
      toast.success("Configuração definida como padrão");
      await fetchConfigs();
    } else if (error) {
      toast.error(error);
    }
  };

  const updateEnabledField = (field: keyof PrinterEnabledFields, value: boolean) => {
    setEnabledFields(prev => ({ ...prev, [field]: value }));
  };



  const getLabelPreviewStyle = () => {
    // Escala menor para o preview lateral na nova proporção
    const selectedSize = LABEL_SIZES.find(s => s.value === labelSize);
    const width = selectedSize?.widthMm || 60;
    const height = selectedSize?.heightMm || 40;
    // Ajuste de escala para o novo layout onde a coluna da direita é maior
    const scale = Math.min(300 / width, 200 / height, 4);

    return {
      width: `${width * scale}px`,
      height: `${height * scale}px`,
      // Permitir que cresça mais
      maxWidth: '100%',
      maxHeight: '400px',
    };
  };

  return (
    <div className="flex-1 overflow-auto bg-background p-6">
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: Settings & Inputs (Smaller: 1/3) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Header Section */}
          <div className="flex flex-col gap-4 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Settings className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Configuração de Etiquetas</h1>
                <p className="text-sm text-muted-foreground">Personalize suas etiquetas</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-md">
                <Switch
                  id="auto-detect"
                  checked={autoDetectEnabled}
                  onCheckedChange={setAutoDetectEnabled}
                />
                <Label htmlFor="auto-detect" className="text-xs flex items-center gap-1 cursor-pointer">
                  <Zap className="w-3 h-3" />
                  Auto-otimização
                </Label>
              </div>
              <Badge variant="outline" className="gap-1 h-8">
                <FileText className="w-3 h-3" />
                PDF Universal
              </Badge>
            </div>
          </div>

          {/* Tab Navigation using Shadcn Tabs */}
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/50">
              <TabsTrigger value="config" className="flex flex-col py-2 gap-1 data-[state=active]:bg-background">
                <Printer className="w-4 h-4" />
                <span className="text-[10px] sm:text-xs">Nova Config.</span>
              </TabsTrigger>
              <TabsTrigger value="label" className="flex flex-col py-2 gap-1 data-[state=active]:bg-background">
                <Tag className="w-4 h-4" />
                <span className="text-[10px] sm:text-xs">Etiqueta</span>
              </TabsTrigger>
              <TabsTrigger value="fields" className="flex flex-col py-2 gap-1 data-[state=active]:bg-background">
                <Type className="w-4 h-4" />
                <span className="text-[10px] sm:text-xs">Campos</span>
              </TabsTrigger>
              <TabsTrigger value="logo" className="flex flex-col py-2 gap-1 data-[state=active]:bg-background">
                <div className="relative">
                  <Image className="w-4 h-4" />
                  {showLogo && <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />}
                </div>
                <span className="text-[10px] sm:text-xs">Design</span>
              </TabsTrigger>

            </TabsList>

            <div className="mt-6">
              <TabsContent value="config" className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                {/* Info Card (Always Visible in Config Tab) */}
                <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm text-green-800 dark:text-green-300">Impressão Universal</p>
                        <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                          Compatível com todas as impressoras via PDF.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Auto Suggestions */}
                {autoSuggestions.length > 0 && autoDetectEnabled && (
                  <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
                    <CardHeader className="pb-3 pt-4">
                      <CardTitle className="text-blue-700 dark:text-blue-300 flex items-center gap-2 text-sm">
                        <Zap className="w-4 h-4" />
                        Sugestões
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <ul className="space-y-2 mb-3">
                        {autoSuggestions.map((suggestion, index) => (
                          <li key={index} className="flex items-start gap-2 text-xs text-blue-600 dark:text-blue-300">
                            <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{suggestion.reason}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        onClick={applyAllSuggestions}
                        size="sm"
                        variant="outline"
                        className="w-full text-xs border-blue-200 text-blue-700 hover:bg-blue-100"
                      >
                        Aplicar Sugestões
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Saved Configs List */}
                {allConfigs.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Printer className="w-4 h-4" />
                          Salvas
                        </span>
                        <Button variant="ghost" size="icon" onClick={handleNewConfig} title="Nova Configuração">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                        {allConfigs.map((config) => (
                          <div
                            key={config.id}
                            className={`flex items-center justify-between p-2 rounded-md border text-sm transition-colors ${editingConfigId === config.id
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-muted/50 cursor-pointer'
                              }`}
                            onClick={() => loadConfigToForm(config)}
                          >
                            <div className="flex flex-col overflow-hidden">
                              <span className="font-medium truncate">{config.printerName}</span>
                              <span className="text-[10px] text-muted-foreground">{config.labelWidthMm}x{config.labelHeightMm}mm</span>
                            </div>
                            <div className="flex items-center">
                              {!config.isDefault && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSetDefault(config.id);
                                  }}
                                >
                                  <Star className="w-3 h-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteConfig(config.id);
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* New/Edit Config Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Printer className="w-4 h-4" />
                      {editingConfigId ? "Editar" : "Nova"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="printerName" className="text-xs">Nome *</Label>
                        <Input
                          id="printerName"
                          placeholder="Ex: Padrão..."
                          value={printerName}
                          onChange={(e) => setPrinterName(e.target.value)}
                          className="h-8"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="printerModel" className="text-xs">Modelo</Label>
                        <Input
                          id="printerModel"
                          placeholder="Ex: Zebra..."
                          value={printerModel}
                          onChange={(e) => setPrinterModel(e.target.value)}
                          className="h-8"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="printerType" className="text-xs">Tipo</Label>
                        <Select
                          value={printerType}
                          onValueChange={setPrinterType}
                        >
                          <SelectTrigger id="printerType" className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRINTER_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="printFormat" className="text-xs">Formato *</Label>
                        <Select
                          value={printFormat}
                          onValueChange={(value) => setPrintFormat(value as PrintFormat)}
                        >
                          <SelectTrigger id="printFormat" className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRINT_FORMATS.map(format => (
                              <SelectItem key={format.value} value={format.value}>
                                {format.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="label" className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Dimensões
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="labelSize" className="text-xs">Tamanho *</Label>
                        <Select
                          value={labelSize}
                          onValueChange={setLabelSize}
                        >
                          <SelectTrigger id="labelSize" className="h-8">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {LABEL_SIZES.map(size => (
                              <SelectItem key={size.value} value={size.value}>
                                {size.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="barcodeType" className="text-xs">Código de Barras *</Label>
                        <Select
                          value={barcodeType}
                          onValueChange={(value) => setBarcodeType(value as BarcodeType)}
                        >
                          <SelectTrigger id="barcodeType" className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BARCODE_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="dpi" className="text-xs">DPI</Label>
                        <Select
                          value={String(dpi)}
                          onValueChange={(value) => setDpi(Number(value))}
                        >
                          <SelectTrigger id="dpi" className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="152">152 DPI</SelectItem>
                            <SelectItem value="203">203 DPI (padrão)</SelectItem>
                            <SelectItem value="300">300 DPI</SelectItem>
                            <SelectItem value="600">600 DPI</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="fields" className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Type className="w-4 h-4" />
                      Campos Visíveis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="field-description"
                          checked={enabledFields.description}
                          onCheckedChange={(checked) => updateEnabledField('description', checked as boolean)}
                        />
                        <label htmlFor="field-description" className="text-sm cursor-pointer">Descrição</label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="field-barcode"
                          checked={enabledFields.barcode}
                          onCheckedChange={(checked) => updateEnabledField('barcode', checked as boolean)}
                        />
                        <label htmlFor="field-barcode" className="text-sm cursor-pointer flex items-center gap-1">
                          <Barcode className="w-3 h-3" />
                          Código de Barras
                        </label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="field-price"
                          checked={enabledFields.price}
                          onCheckedChange={(checked) => updateEnabledField('price', checked as boolean)}
                        />
                        <label htmlFor="field-price" className="text-sm cursor-pointer">Preço</label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="field-qrcode"
                          checked={enabledFields.qrcode}
                          onCheckedChange={(checked) => updateEnabledField('qrcode', checked as boolean)}
                        />
                        <label htmlFor="field-qrcode" className="text-sm cursor-pointer flex items-center gap-1">
                          <QrCode className="w-3 h-3" />
                          QR Code
                        </label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="field-reference"
                          checked={enabledFields.reference}
                          onCheckedChange={(checked) => updateEnabledField('reference', checked as boolean)}
                        />
                        <label htmlFor="field-reference" className="text-sm cursor-pointer">Referência</label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="field-supplier"
                          checked={enabledFields.supplier}
                          onCheckedChange={(checked) => updateEnabledField('supplier', checked as boolean)}
                        />
                        <label htmlFor="field-supplier" className="text-sm cursor-pointer">Fornecedor</label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="field-weight"
                          checked={enabledFields.weight}
                          onCheckedChange={(checked) => updateEnabledField('weight', checked as boolean)}
                        />
                        <label htmlFor="field-weight" className="text-sm cursor-pointer">Peso</label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="field-number"
                          checked={enabledFields.number}
                          onCheckedChange={(checked) => updateEnabledField('number', checked as boolean)}
                        />
                        <label htmlFor="field-number" className="text-sm cursor-pointer">Número/Tamanho</label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="field-wholesale"
                          checked={enabledFields.wholesalePrice}
                          onCheckedChange={(checked) => updateEnabledField('wholesalePrice', checked as boolean)}
                        />
                        <label htmlFor="field-wholesale" className="text-sm cursor-pointer">Preço Atacado</label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="field-retail"
                          checked={enabledFields.retailPrice}
                          onCheckedChange={(checked) => updateEnabledField('retailPrice', checked as boolean)}
                        />
                        <label htmlFor="field-retail" className="text-sm cursor-pointer">Preço Varejo</label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="field-goldPlating"
                          checked={enabledFields.goldPlatingMillesimal}
                          onCheckedChange={(checked) => updateEnabledField('goldPlatingMillesimal', checked as boolean)}
                        />
                        <label htmlFor="field-goldPlating" className="text-sm cursor-pointer">Milésimos</label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="field-nfe"
                          checked={enabledFields.nfeData}
                          onCheckedChange={(checked) => updateEnabledField('nfeData', checked as boolean)}
                        />
                        <label htmlFor="field-nfe" className="text-sm cursor-pointer">Dados NF-e</label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="logo" className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      Design & Personalização
                    </CardTitle>
                    <CardDescription>
                      Personalize logo e tamanhos de texto.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center gap-4">
                      {logoBase64 ? (
                        <div className="relative group border rounded-md p-1 bg-white">
                          <img src={logoBase64} alt="Logo" className="h-16 w-16 object-contain" />
                          <button
                            onClick={removeLogo}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="h-16 w-16 bg-muted rounded-md flex items-center justify-center border border-dashed">
                          <Image className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}

                      <div className="flex-1 space-y-2">
                        <Label htmlFor="logo-upload" className="cursor-pointer">
                          <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                            <Plus className="w-4 h-4" />
                            {logoBase64 ? "Trocar Imagem" : "Carregar Imagem"}
                          </div>
                          <Input
                            id="logo-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoUpload}
                          />
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Recomendado: PNG transparente, máx 500KB.
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="show-logo"
                          checked={showLogo}
                          onCheckedChange={(checked) => {
                            setShowLogo(checked);
                            saveLogoConfig({ showLogo: checked });
                          }}
                          disabled={!logoBase64}
                        />
                        <Label htmlFor="show-logo">Exibir Logo</Label>
                      </div>
                    </div>

                    {logoBase64 && showLogo && (
                      <div className="space-y-4 pt-4 border-t">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">Largura (mm)</Label>
                            <Input
                              type="number"
                              value={logoWidth}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setLogoWidth(val);
                                saveLogoConfig({ logoWidth: val });
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Altura (mm)</Label>
                            <Input
                              type="number"
                              value={logoHeight}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setLogoHeight(val);
                                saveLogoConfig({ logoHeight: val });
                              }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">Posição X (mm)</Label>
                            <Input
                              type="number"
                              value={logoX}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setLogoX(val);
                                saveLogoConfig({ logoX: val });
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Posição Y (mm)</Label>
                            <Input
                              type="number"
                              value={logoY}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setLogoY(val);
                                saveLogoConfig({ logoY: val });
                              }}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Opacidade (%)</Label>
                          <div className="flex items-center gap-4">
                            <Input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={logoOpacity}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setLogoOpacity(val);
                                saveLogoConfig({ logoOpacity: val });
                              }}
                              className="flex-1"
                            />
                            <span className="w-12 text-right text-xs">
                              {Math.round(logoOpacity * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Type className="w-4 h-4" />
                      Tamanhos de Fonte
                    </CardTitle>
                    <CardDescription>
                      Ajuste o tamanho dos textos na etiqueta.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Título (pt)</Label>
                        <Input
                          type="number"
                          value={titleFontSize}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setTitleFontSize(val);
                            saveLogoConfig({ titleFontSize: val });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Preço (pt)</Label>
                        <Input
                          type="number"
                          value={priceFontSize}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setPriceFontSize(val);
                            saveLogoConfig({ priceFontSize: val });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Código (pt)</Label>
                        <Input
                          type="number"
                          value={codeFontSize}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setCodeFontSize(val);
                            saveLogoConfig({ codeFontSize: val });
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

            </div>
          </Tabs>


          <div className="flex justify-end gap-3 pt-4 border-t">
            {editingConfigId && (
              <Button variant="outline" onClick={handleNewConfig} size="sm">
                Cancelar
              </Button>
            )}
            <Button
              onClick={handleSave}
              size="sm"
              disabled={isLoading || !printerName.trim()}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
              <CheckCircle2 className="w-4 h-4" />
              {editingConfigId ? "Atualizar" : "Salvar"}
            </Button>
          </div>
        </div>

        {/* RIGHT COLUMN: Preview & Summary (Larger: 2/3) */}
        <div className="lg:col-span-2">
          <div className="sticky top-6 space-y-6">
            <Card className="shadow-lg border-2 border-primary/20 h-full">
              <CardHeader className="bg-muted/50 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Eye className="w-5 h-5 text-primary" />
                  Preview da Etiqueta
                </CardTitle>
                <CardDescription>
                  {printerName ? printerName : "Configuração atual"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-8 pb-8 min-h-[400px] flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900/50">
                <div className="flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 shadow-sm w-full max-w-2xl">
                  <div
                    className="flex flex-col items-center justify-center relative shadow-md overflow-hidden transition-all duration-300 bg-white"
                    style={getLabelPreviewStyle()}
                  >
                    {/* Logo Overlay */}
                    {showLogo && logoBase64 && (
                      <img
                        src={logoBase64}
                        alt="Logo"
                        style={{
                          position: 'absolute',
                          left: `${(logoX / (getLabelDimensions(labelSize).widthMm || 1)) * 100}%`,
                          top: `${(logoY / (getLabelDimensions(labelSize).heightMm || 1)) * 100}%`,
                          width: `${(logoWidth / (getLabelDimensions(labelSize).widthMm || 1)) * 100}%`,
                          height: `${(logoHeight / (getLabelDimensions(labelSize).heightMm || 1)) * 100}%`,
                          opacity: logoOpacity,
                          objectFit: 'contain',
                          zIndex: 10,
                          pointerEvents: 'none'
                        }}
                      />
                    )}

                    {(labelSize.includes('92MM') || labelSize.includes('90MM')) ? (
                      // Layout Gravata / Borboleta
                      <div className="flex w-full h-full items-center justify-between px-1 bg-white ring-1 ring-gray-200">
                        <div className="w-[45%] h-full flex items-center justify-center relative">
                          {enabledFields.barcode && (
                            <div className="w-full flex justify-center transform -rotate-90 origin-center">
                              <Barcode className="h-full w-full max-h-[80%] text-gray-800" />
                            </div>
                          )}
                          {enabledFields.qrcode && (
                            <div className="absolute bottom-1 right-1">
                              <QrCode className="w-[20%] h-[20%] text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="w-[10%] h-[80%] border-r-2 border-dashed border-gray-300 mx-auto"></div>
                        <div className="w-[45%] h-full flex flex-col justify-center items-center text-center p-1">
                          {enabledFields.price && <span className="font-bold text-gray-900 leading-none" style={{ fontSize: `${priceFontSize}pt` }}>R$ 1.299</span>}
                          {enabledFields.description && <span className="uppercase leading-tight mt-1 truncate max-w-full text-gray-700 font-medium" style={{ fontSize: `${titleFontSize}pt` }}>Anel Ouro 18k</span>}
                          {enabledFields.reference && <span className="text-gray-500 mt-0.5" style={{ fontSize: `${codeFontSize}pt` }}>REF: 12345</span>}
                        </div>
                      </div>
                    ) : (
                      // Layout Padrão Genérico
                      <div className="flex flex-col items-center justify-center w-full h-full bg-white p-2 ring-1 ring-gray-200">
                        {enabledFields.description && (
                          <p className="font-bold text-gray-800 text-center truncate w-full mb-1" style={{ fontSize: `${titleFontSize}pt` }}>
                            Descrição do Produto
                          </p>
                        )}

                        {enabledFields.barcode && (
                          <div className="flex items-center justify-center w-full my-1 flex-1">
                            <Barcode className="w-full h-full max-h-[60%] text-gray-800" />
                          </div>
                        )}

                        {enabledFields.price && (
                          <p className="font-bold text-gray-900 mt-auto" style={{ fontSize: `${priceFontSize}pt` }}>
                            R$ 99,90
                          </p>
                        )}

                        {enabledFields.reference && (
                          <p className="text-gray-500 mt-0.5" style={{ fontSize: `${codeFontSize}pt` }}>
                            Ref: ABC123
                          </p>
                        )}

                        {enabledFields.qrcode && (
                          <div className="absolute top-1 right-1">
                            <QrCode className="w-[15%] h-[15%] text-gray-600" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 flex gap-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Tamanho</span>
                    <Badge variant="secondary">
                      {LABEL_SIZES.find(s => s.value === labelSize)?.label || labelSize}
                    </Badge>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Formato</span>
                    <Badge variant="secondary">
                      {printFormat.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">DPI</span>
                    <Badge variant="secondary">
                      {dpi} DPI
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
