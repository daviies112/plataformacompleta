import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/features/produto/components/ui/dialog";
import { Button } from "@/features/produto/components/ui/button";
import { Input } from "@/features/produto/components/ui/input";
import { Label } from "@/features/produto/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/features/produto/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/features/produto/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/produto/components/ui/card";
import { toast } from "sonner";
import { 
  Printer, 
  FileBox, 
  Barcode, 
  Loader2,
  Eye,
  Tag,
  Palette,
  Type,
  Image,
  QrCode,
  Trash2,
  Edit3,
  RefreshCw
} from "lucide-react";
import { usePrinter } from "@/hooks/usePrinter";
import type { Product, PrinterSettings } from "@/features/produto/pages/ProdutoPage";
import type { BarcodeType, PrinterEnabledFields } from "@/features/produto/types/printer.types";
import { LABEL_SIZES, BARCODE_TYPES, DEFAULT_ENABLED_FIELDS } from "@/features/produto/types/printer.types";
import { CanvasEditor } from "@/components/label-designer/CanvasEditor";
import { PropertiesPanel } from "@/components/label-designer/PropertiesPanel";
import { TemplateManager } from "@/components/label-designer/TemplateManager";
import { ExportPanel } from "@/components/label-designer/ExportPanel";
import { CanvasEditorRef, LabelTemplate } from "@/components/label-designer/types";
import { generateSmartLayout, SmartLayout } from "@/components/label-designer/smartLabelLayout";
import * as fabricModule from 'fabric';
import axios from 'axios';

const fabric = (fabricModule as any).fabric || fabricModule;

interface LabelConfigDialogProps {
  product: Product;
  printerSettings?: PrinterSettings;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LabelConfigDialog = ({ 
  product, 
  printerSettings, 
  open, 
  onOpenChange 
}: LabelConfigDialogProps) => {
  const [quantity, setQuantity] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);
  const [selectedLabelSize, setSelectedLabelSize] = useState<string>("");
  const [selectedBarcodeType, setSelectedBarcodeType] = useState<BarcodeType>("CODE128");
  const [enabledFields, setEnabledFields] = useState<PrinterEnabledFields>(DEFAULT_ENABLED_FIELDS);
  const [activeTab, setActiveTab] = useState("print");
  
  const [widthMm, setWidthMm] = useState(60);
  const [heightMm, setHeightMm] = useState(40);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [canvasKey, setCanvasKey] = useState(0);
  const [hasLoadedProduct, setHasLoadedProduct] = useState(false);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [currentLayout, setCurrentLayout] = useState<SmartLayout | null>(null);
  
  const canvasEditorRef = useRef<CanvasEditorRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    defaultConfig,
    fetchDefaultConfig,
    fetchConfigs,
    updateConfig,
  } = usePrinter();

  const updatePreview = useCallback(() => {
    if (canvasEditorRef.current?.canvas) {
      try {
        const dataUrl = canvasEditorRef.current.canvas.toDataURL({ format: 'png' });
        setPreviewDataUrl(dataUrl);
        setIsLoadingPreview(false);
      } catch (error) {
        console.error('[LabelConfigDialog] Error updating preview:', error);
        setIsLoadingPreview(false);
      }
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchDefaultConfig();
      fetchConfigs();
      setHasLoadedProduct(false);
      setIsCanvasReady(false);
      setPreviewDataUrl(null);
      setIsLoadingPreview(true);
      
      const layout = generateSmartLayout(
        { widthMm, heightMm },
        product
      );
      setCurrentLayout(layout);
    }
  }, [open, product]);

  useEffect(() => {
    if (defaultConfig) {
      const labelSizeValue = `${defaultConfig.labelWidthMm}x${defaultConfig.labelHeightMm}`;
      setSelectedLabelSize(labelSizeValue);
      setSelectedBarcodeType(defaultConfig.barcodeType as BarcodeType);
      setEnabledFields({ ...DEFAULT_ENABLED_FIELDS, ...defaultConfig.enabledFields });
      setWidthMm(parseInt(defaultConfig.labelWidthMm) || 60);
      setHeightMm(parseInt(defaultConfig.labelHeightMm) || 40);
    }
  }, [defaultConfig]);

  const handleCanvasReady = useCallback(() => {
    setIsCanvasReady(true);
  }, []);

  const loadProductWithSmartLayout = useCallback(async () => {
    const editor = canvasEditorRef.current;
    if (!editor) {
      setTimeout(loadProductWithSmartLayout, 50);
      return;
    }
    
    try {
      const layout = generateSmartLayout(
        { widthMm, heightMm },
        product
      );
      setCurrentLayout(layout);
      
      await editor.loadSmartLayout(layout);
      
      setHasLoadedProduct(true);
      requestAnimationFrame(() => {
        updatePreview();
      });
    } catch (error) {
      console.error('[LabelConfigDialog] Error loading smart layout:', error);
      toast.error('Erro ao carregar layout da etiqueta');
      setIsLoadingPreview(false);
    }
  }, [product, widthMm, heightMm, updatePreview]);

  useEffect(() => {
    if (open && isCanvasReady && !hasLoadedProduct && product) {
      loadProductWithSmartLayout();
    }
  }, [open, isCanvasReady, hasLoadedProduct, product, loadProductWithSmartLayout]);

  const handleSelectionChange = useCallback((object: fabric.Object | null) => {
    setSelectedObject(object);
  }, []);

  const handleCanvasChange = useCallback(() => {
    requestAnimationFrame(() => {
      updatePreview();
    });
  }, [updatePreview]);

  const handleReloadLayout = useCallback(async () => {
    setIsLoadingPreview(true);
    setHasLoadedProduct(false);
    setCanvasKey(prev => prev + 1);
    toast.success('Layout recarregado com sucesso');
  }, []);

  const handleSizeChange = () => {
    setIsCanvasReady(false);
    setHasLoadedProduct(false);
    setIsLoadingPreview(true);
    setCanvasKey(prev => prev + 1);
    toast.success('Tamanho do canvas atualizado');
  };

  const handleLoadTemplate = (template: LabelTemplate) => {
    if (!canvasEditorRef.current) return;

    setWidthMm(template.widthMm);
    setHeightMm(template.heightMm);
    setIsCanvasReady(false);
    setHasLoadedProduct(true);
    
    setTimeout(() => {
      if (canvasEditorRef.current && template.designData) {
        canvasEditorRef.current.loadDesignData(template.designData);
        toast.success(`Template "${template.name}" carregado!`);
        requestAnimationFrame(updatePreview);
      }
    }, 100);
    
    setCanvasKey(prev => prev + 1);
  };

  const handleSaveTemplate = () => {
    if (!canvasEditorRef.current) {
      return { designData: null, widthMm: 0, heightMm: 0 };
    }

    const designData = canvasEditorRef.current.getDesignData();
    return { designData, widthMm, heightMm };
  };

  const getElements = () => {
    if (!canvasEditorRef.current) return [];
    return canvasEditorRef.current.getElements();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione uma imagem válida');
        return;
      }
      canvasEditorRef.current?.addImage(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      requestAnimationFrame(updatePreview);
    }
  };

  const handlePrintPDF = async () => {
    setIsPrinting(true);
    try {
      const elements = canvasEditorRef.current?.getElements() || [];
      
      if (elements.length === 0) {
        toast.error('Nenhum elemento na etiqueta para imprimir');
        setIsPrinting(false);
        return;
      }

      const response = await axios.post(
        '/api/label-designer/generate-pdf',
        { widthMm, heightMm, elements },
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');

      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
        toast.success('PDF aberto para impressão!');
        toast.info(`Dica: Imprima ${quantity} cópia(s) nas configurações da impressora`);
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = `etiqueta-${widthMm}x${heightMm}mm.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.info('Pop-up bloqueado. PDF baixado - abra e imprima manualmente.');
      }
    } catch (error: any) {
      console.error('Error printing PDF:', error);
      toast.error(error.response?.data?.error || 'Erro ao gerar PDF para impressão');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleLabelSizeChange = async (value: string) => {
    setSelectedLabelSize(value);
    const selectedSize = LABEL_SIZES.find(s => s.value === value);
    
    if (selectedSize) {
      setWidthMm(selectedSize.widthMm);
      setHeightMm(selectedSize.heightMm);
      setIsCanvasReady(false);
      setHasLoadedProduct(false);
      setIsLoadingPreview(true);
      setCanvasKey(prev => prev + 1);
    }
    
    if (selectedSize && defaultConfig?.id && updateConfig) {
      try {
        await updateConfig({
          id: defaultConfig.id,
          labelWidthMm: String(selectedSize.widthMm),
          labelHeightMm: String(selectedSize.heightMm),
        });
        toast.success(`Tamanho alterado para ${selectedSize.label}`);
        await fetchDefaultConfig();
      } catch (err) {
        console.error('Error updating label size:', err);
      }
    }
  };

  const handleBarcodeTypeChange = async (value: BarcodeType) => {
    setSelectedBarcodeType(value);
    
    if (defaultConfig?.id && updateConfig) {
      try {
        await updateConfig({
          id: defaultConfig.id,
          barcodeType: value,
        });
        toast.success(`Tipo de código alterado para ${value}`);
        await fetchDefaultConfig();
      } catch (err) {
        console.error('Error updating barcode type:', err);
      }
    }
  };

  const getLabelPreviewStyle = () => {
    const size = LABEL_SIZES.find(s => s.value === selectedLabelSize);
    const width = size?.widthMm || widthMm || 60;
    const height = size?.heightMm || heightMm || 40;
    const scale = Math.min(280 / width, 180 / height, 4);
    
    return {
      width: `${width * scale}px`,
      height: `${height * scale}px`,
      maxWidth: '280px',
      maxHeight: '180px',
    };
  };

  const getLayoutInfo = () => {
    const area = widthMm * heightMm;
    if (area < 400) return { type: 'Compacto', desc: 'Nome + Preço' };
    if (area < 900) return { type: 'Básico', desc: 'Nome, Preço, Ref, Código' };
    if (area < 2000) return { type: 'Padrão', desc: 'Com logo e notas' };
    return { type: 'Completo', desc: 'Todos os elementos' };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${activeTab === 'design' ? 'max-w-[95vw] h-[90vh]' : 'max-w-2xl max-h-[90vh]'} overflow-hidden flex flex-col`}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Configurar Etiqueta
          </DialogTitle>
          <DialogDescription>
            Configure e imprima a etiqueta para: {product.description}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
            <TabsTrigger value="print" className="gap-2">
              <Printer className="w-4 h-4" />
              Impressão Rápida
            </TabsTrigger>
            <TabsTrigger value="design" className="gap-2">
              <Palette className="w-4 h-4" />
              Designer Visual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="print" className="space-y-4 mt-4 overflow-y-auto flex-1">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 font-medium mb-1">
                ✅ Impressão Universal via PDF
              </p>
              <p className="text-xs text-green-700">
                Funciona com qualquer impressora (térmica, laser, jato de tinta, AirPrint, Bluetooth). 
                Não requer instalação de software adicional.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileBox className="w-4 h-4" />
                    Tamanho da Etiqueta
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedLabelSize} onValueChange={handleLabelSizeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tamanho" />
                    </SelectTrigger>
                    <SelectContent>
                      {LABEL_SIZES.map((size) => (
                        <SelectItem key={size.value} value={size.value}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">
                    Layout {getLayoutInfo().type}: {getLayoutInfo().desc}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Barcode className="w-4 h-4" />
                    Tipo de Código
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedBarcodeType} onValueChange={handleBarcodeTypeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {BARCODE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Pré-visualização da Etiqueta
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReloadLayout}
                    className="h-7 px-2"
                    title="Recarregar layout inteligente"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center">
                  <div 
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 flex items-center justify-center overflow-hidden"
                    style={getLabelPreviewStyle()}
                  >
                    {previewDataUrl && !isLoadingPreview ? (
                      <img 
                        src={previewDataUrl} 
                        alt="Preview da etiqueta" 
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-400 p-4">
                        <Loader2 className="w-6 h-6 animate-spin mb-2" />
                        <p className="text-xs text-center">Gerando layout...</p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Tamanho: {widthMm}mm × {heightMm}mm
                  </p>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="mt-1 text-blue-600 gap-1"
                    onClick={() => setActiveTab('design')}
                  >
                    <Edit3 className="w-3 h-3" />
                    Personalizar no Designer Visual
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <Label htmlFor="quantity">Quantidade:</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  max={100}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handlePrintPDF} 
                  disabled={isPrinting || isLoadingPreview}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  {isPrinting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Printer className="w-4 h-4" />
                  )}
                  Imprimir {quantity > 1 ? `(${quantity})` : ''}
                </Button>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs font-medium text-gray-700 mb-2">
                Configurações recomendadas de impressão:
              </p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Tamanho do papel: {widthMm}x{heightMm}mm</li>
                <li>• Escala: 100% (Tamanho real)</li>
                <li>• Margens: Nenhuma</li>
                <li>• Orientação: {widthMm > heightMm ? 'Paisagem' : 'Retrato'}</li>
                {quantity > 1 && <li>• Cópias: {quantity}</li>}
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="design" className="mt-4 flex-1 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
              <div className="lg:col-span-1 space-y-4 overflow-y-auto">
                <Card className="p-4">
                  <h3 className="font-semibold text-sm mb-4">Configurações do Canvas</h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="canvasWidth" className="text-xs">Largura (mm)</Label>
                      <Input
                        id="canvasWidth"
                        type="number"
                        min="10"
                        max="500"
                        value={widthMm}
                        onChange={(e) => setWidthMm(parseInt(e.target.value) || 60)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="canvasHeight" className="text-xs">Altura (mm)</Label>
                      <Input
                        id="canvasHeight"
                        type="number"
                        min="10"
                        max="500"
                        value={heightMm}
                        onChange={(e) => setHeightMm(parseInt(e.target.value) || 40)}
                        className="mt-1"
                      />
                    </div>
                    <Button onClick={handleSizeChange} className="w-full" size="sm">
                      Aplicar Tamanho
                    </Button>
                    <Button 
                      onClick={handleReloadLayout} 
                      variant="outline" 
                      className="w-full" 
                      size="sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-2" />
                      Recarregar Layout Inteligente
                    </Button>
                  </div>
                </Card>

                <div className="flex flex-wrap gap-2 p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm border">
                  <h3 className="w-full text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Adicionar Elementos</h3>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      canvasEditorRef.current?.addText();
                      requestAnimationFrame(updatePreview);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Type className="w-4 h-4" />
                    Texto
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2"
                  >
                    <Image className="w-4 h-4" />
                    Imagem
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      canvasEditorRef.current?.addBarcode();
                      requestAnimationFrame(updatePreview);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Barcode className="w-4 h-4" />
                    Código de Barras
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      canvasEditorRef.current?.addQRCode();
                      requestAnimationFrame(updatePreview);
                    }}
                    className="flex items-center gap-2"
                  >
                    <QrCode className="w-4 h-4" />
                    QR Code
                  </Button>

                  <div className="border-l mx-2" />

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      canvasEditorRef.current?.deleteSelected();
                      requestAnimationFrame(updatePreview);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Deletar
                  </Button>
                </div>

                <PropertiesPanel
                  selectedObject={selectedObject}
                  onUpdate={() => {
                    handleCanvasChange();
                  }}
                />
              </div>

              <div className="lg:col-span-2 flex flex-col">
                <Card className="p-4 flex-1 flex flex-col">
                  <div className="mb-4">
                    <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                      Canvas de Edição ({widthMm}mm × {heightMm}mm)
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Arraste, redimensione e personalize os elementos - Layout 100% personalizável
                    </p>
                  </div>
                  
                  <div className="flex-1 flex items-center justify-center overflow-auto">
                    <CanvasEditor
                      key={canvasKey}
                      ref={canvasEditorRef}
                      widthMm={widthMm}
                      heightMm={heightMm}
                      onSelectionChange={handleSelectionChange}
                      onCanvasChange={handleCanvasChange}
                      onReady={handleCanvasReady}
                    />
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (canvasEditorRef.current) {
                          canvasEditorRef.current.clearCanvas();
                          setPreviewDataUrl(null);
                          toast.success('Canvas limpo');
                        }
                      }}
                    >
                      Limpar Canvas
                    </Button>
                    <div className="flex-1" />
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={handlePrintPDF}
                      disabled={isPrinting}
                    >
                      {isPrinting ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Printer className="w-4 h-4 mr-2" />
                      )}
                      Imprimir
                    </Button>
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-1 space-y-4 overflow-y-auto">
                <TemplateManager
                  onLoad={handleLoadTemplate}
                  onSave={handleSaveTemplate}
                />

                <ExportPanel
                  getElements={getElements}
                  widthMm={widthMm}
                  heightMm={heightMm}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
