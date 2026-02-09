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
  FileText
} from "lucide-react";
import { usePrinter } from "@/hooks/usePrinter";
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
  const [labelSize, setLabelSize] = useState<string>("60x40");
  const [printFormat, setPrintFormat] = useState<PrintFormat>("pdf");
  const [barcodeType, setBarcodeType] = useState<BarcodeType>("CODE128");
  const [dpi, setDpi] = useState<number>(203);
  const [enabledFields, setEnabledFields] = useState<PrinterEnabledFields>(DEFAULT_ENABLED_FIELDS);
  const [editingConfigId, setEditingConfigId] = useState<number | null>(null);
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(true);
  const [autoSuggestions, setAutoSuggestions] = useState<AutoSuggestion[]>([]);

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
    const labelSizeValue = `${config.labelWidthMm}x${config.labelHeightMm}`;
    setLabelSize(labelSizeValue);
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
    setLabelSize("60x40");
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
    const selectedSize = LABEL_SIZES.find(s => s.value === labelSize);
    const width = selectedSize?.widthMm || 60;
    const height = selectedSize?.heightMm || 40;
    const scale = Math.min(200 / width, 120 / height, 3);
    
    return {
      width: `${width * scale}px`,
      height: `${height * scale}px`,
      maxWidth: '200px',
      maxHeight: '120px',
    };
  };

  return (
    <div className="flex-1 overflow-auto bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Settings className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Configuração de Etiquetas</h1>
              <p className="text-sm text-muted-foreground">Configure tamanhos, códigos de barras e campos das etiquetas</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-detect"
                checked={autoDetectEnabled}
                onCheckedChange={setAutoDetectEnabled}
              />
              <Label htmlFor="auto-detect" className="text-sm flex items-center gap-1">
                <Zap className="w-4 h-4" />
                Auto-otimização
              </Label>
            </div>
            <Badge variant="outline" className="gap-1">
              <FileText className="w-3 h-3" />
              Impressão via PDF
            </Badge>
          </div>
        </div>

        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-300">Impressão Universal via PDF</p>
                <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                  Funciona com qualquer impressora (térmica, laser, jato de tinta, AirPrint, Bluetooth).
                  Não requer instalação de software adicional.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {autoSuggestions.length > 0 && autoDetectEnabled && (
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-blue-700 dark:text-blue-300 flex items-center gap-2 text-base">
                <Zap className="w-5 h-5" />
                Otimizações Detectadas Automaticamente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-4">
                {autoSuggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-blue-600 dark:text-blue-300">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{suggestion.reason}</span>
                  </li>
                ))}
              </ul>
              <Button 
                onClick={applyAllSuggestions}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Zap className="w-4 h-4 mr-2" />
                Aplicar Todas as Otimizações
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {allConfigs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Printer className="w-5 h-5" />
                      Configurações Salvas
                    </span>
                    <Button variant="outline" size="sm" onClick={handleNewConfig} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Nova
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {allConfigs.map((config) => (
                      <div 
                        key={config.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          editingConfigId === config.id 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:bg-muted/50 cursor-pointer'
                        }`}
                        onClick={() => loadConfigToForm(config)}
                      >
                        <div className="flex items-center gap-3">
                          <Printer className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{config.printerName}</span>
                              {config.isDefault && (
                                <Badge variant="secondary" className="text-xs">
                                  <Star className="w-3 h-3 mr-1 fill-current" />
                                  Padrão
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {config.labelWidthMm}x{config.labelHeightMm}mm | {config.printFormat.toUpperCase()} | {config.barcodeType} | {config.dpi} DPI
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!config.isDefault && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetDefault(config.id);
                              }}
                              title="Definir como padrão"
                            >
                              <Star className="w-4 h-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteConfig(config.id);
                            }}
                            className="text-destructive hover:text-destructive"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="w-5 h-5" />
                  {editingConfigId ? "Editar Configuração" : "Nova Configuração"}
                </CardTitle>
                <CardDescription>
                  {editingConfigId 
                    ? "Edite as configurações selecionadas" 
                    : "Configure uma nova configuração de etiqueta"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="printerName">Nome da Configuração *</Label>
                    <Input
                      id="printerName"
                      placeholder="Ex: Etiqueta Padrão, Joias Pequenas..."
                      value={printerName}
                      onChange={(e) => setPrinterName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="printerModel">Modelo de Impressora</Label>
                    <Input
                      id="printerModel"
                      placeholder="Ex: Zebra GC420d, Argox..."
                      value={printerModel}
                      onChange={(e) => setPrinterModel(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="printerType">Tipo de Impressora</Label>
                    <Select 
                      value={printerType} 
                      onValueChange={setPrinterType}
                    >
                      <SelectTrigger id="printerType">
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

                  <div className="space-y-2">
                    <Label htmlFor="printFormat">Formato de Impressão *</Label>
                    <Select 
                      value={printFormat} 
                      onValueChange={(value) => setPrintFormat(value as PrintFormat)}
                    >
                      <SelectTrigger id="printFormat">
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Configuração da Etiqueta
                </CardTitle>
                <CardDescription>
                  Configure o tamanho e formato da etiqueta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="labelSize">Tamanho *</Label>
                    <Select 
                      value={labelSize} 
                      onValueChange={setLabelSize}
                    >
                      <SelectTrigger id="labelSize">
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

                  <div className="space-y-2">
                    <Label htmlFor="barcodeType">Código de Barras *</Label>
                    <Select 
                      value={barcodeType} 
                      onValueChange={(value) => setBarcodeType(value as BarcodeType)}
                    >
                      <SelectTrigger id="barcodeType">
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

                  <div className="space-y-2">
                    <Label htmlFor="dpi">DPI da Impressora</Label>
                    <Select 
                      value={String(dpi)} 
                      onValueChange={(value) => setDpi(Number(value))}
                    >
                      <SelectTrigger id="dpi">
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="w-5 h-5" />
                  Campos da Etiqueta
                </CardTitle>
                <CardDescription>
                  Selecione quais campos devem aparecer na etiqueta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="field-description"
                      checked={enabledFields.description}
                      onCheckedChange={(checked) => updateEnabledField('description', checked as boolean)}
                    />
                    <label htmlFor="field-description" className="text-sm font-medium leading-none cursor-pointer">
                      Descrição
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="field-barcode"
                      checked={enabledFields.barcode}
                      onCheckedChange={(checked) => updateEnabledField('barcode', checked as boolean)}
                    />
                    <label htmlFor="field-barcode" className="text-sm font-medium leading-none cursor-pointer flex items-center gap-1">
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
                    <label htmlFor="field-price" className="text-sm font-medium leading-none cursor-pointer">
                      Preço
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="field-qrcode"
                      checked={enabledFields.qrcode}
                      onCheckedChange={(checked) => updateEnabledField('qrcode', checked as boolean)}
                    />
                    <label htmlFor="field-qrcode" className="text-sm font-medium leading-none cursor-pointer flex items-center gap-1">
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
                    <label htmlFor="field-reference" className="text-sm font-medium leading-none cursor-pointer">
                      Referência
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="field-supplier"
                      checked={enabledFields.supplier}
                      onCheckedChange={(checked) => updateEnabledField('supplier', checked as boolean)}
                    />
                    <label htmlFor="field-supplier" className="text-sm font-medium leading-none cursor-pointer">
                      Fornecedor
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="field-weight"
                      checked={enabledFields.weight}
                      onCheckedChange={(checked) => updateEnabledField('weight', checked as boolean)}
                    />
                    <label htmlFor="field-weight" className="text-sm font-medium leading-none cursor-pointer">
                      Peso
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="field-number"
                      checked={enabledFields.number}
                      onCheckedChange={(checked) => updateEnabledField('number', checked as boolean)}
                    />
                    <label htmlFor="field-number" className="text-sm font-medium leading-none cursor-pointer">
                      Número/Tamanho
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="field-wholesale"
                      checked={enabledFields.wholesalePrice}
                      onCheckedChange={(checked) => updateEnabledField('wholesalePrice', checked as boolean)}
                    />
                    <label htmlFor="field-wholesale" className="text-sm font-medium leading-none cursor-pointer">
                      Preço Atacado
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="field-retail"
                      checked={enabledFields.retailPrice}
                      onCheckedChange={(checked) => updateEnabledField('retailPrice', checked as boolean)}
                    />
                    <label htmlFor="field-retail" className="text-sm font-medium leading-none cursor-pointer">
                      Preço Varejo
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="field-goldPlating"
                      checked={enabledFields.goldPlatingMillesimal}
                      onCheckedChange={(checked) => updateEnabledField('goldPlatingMillesimal', checked as boolean)}
                    />
                    <label htmlFor="field-goldPlating" className="text-sm font-medium leading-none cursor-pointer">
                      Milésimos
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="field-nfe"
                      checked={enabledFields.nfeData}
                      onCheckedChange={(checked) => updateEnabledField('nfeData', checked as boolean)}
                    />
                    <label htmlFor="field-nfe" className="text-sm font-medium leading-none cursor-pointer">
                      Dados NF-e
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              {editingConfigId && (
                <Button variant="outline" onClick={handleNewConfig}>
                  Cancelar
                </Button>
              )}
              <Button 
                onClick={handleSave} 
                size="lg"
                disabled={isLoading || !printerName.trim()}
                className="gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <CheckCircle2 className="w-4 h-4" />
                {editingConfigId ? "Atualizar" : "Salvar Configuração"}
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Eye className="w-5 h-5" />
                  Preview da Etiqueta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div 
                    className="bg-white border-2 border-dashed border-gray-300 rounded shadow-sm p-2 flex flex-col items-center justify-center relative"
                    style={getLabelPreviewStyle()}
                  >
                    {enabledFields.description && (
                      <p className="text-[8px] font-semibold text-gray-800 text-center truncate w-full">
                        Descrição do Produto
                      </p>
                    )}
                    
                    {enabledFields.barcode && (
                      <div className="flex items-center justify-center w-full my-1">
                        <Barcode className="w-full h-6 text-gray-600" />
                      </div>
                    )}
                    
                    {enabledFields.price && (
                      <p className="text-[10px] font-bold text-gray-900">
                        R$ 99,90
                      </p>
                    )}

                    {enabledFields.reference && (
                      <p className="text-[6px] text-gray-500">
                        Ref: ABC123
                      </p>
                    )}

                    {enabledFields.qrcode && (
                      <div className="absolute top-1 right-1">
                        <QrCode className="w-4 h-4 text-gray-600" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <Badge variant="outline">
                    {LABEL_SIZES.find(s => s.value === labelSize)?.label || labelSize}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings className="w-5 h-5" />
                  Resumo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Configuração:</span>
                  <span className="font-medium truncate max-w-[120px]">{printerName || 'Não nomeada'}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tamanho:</span>
                  <span className="font-medium">{LABEL_SIZES.find(s => s.value === labelSize)?.label || labelSize}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Formato:</span>
                  <span className="font-medium">{printFormat.toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Código:</span>
                  <span className="font-medium">{barcodeType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">DPI:</span>
                  <span className="font-medium">{dpi}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Campos ativos:</span>
                  <span className="font-medium">{Object.values(enabledFields).filter(Boolean).length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
