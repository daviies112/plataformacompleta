import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import * as fabricModule from 'fabric';
import { Card } from '@/components/ui/card';

const fabric = (fabricModule as any).fabric || fabricModule;
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CanvasEditor } from './CanvasEditor';
import { Toolbar } from './Toolbar';
import { PropertiesPanel } from './PropertiesPanel';
import { TemplateManager } from './TemplateManager';
import { ExportPanel } from './ExportPanel';
import { CanvasEditorRef, LabelTemplate } from './types';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

interface ProductData {
  description?: string;
  barcode?: string;
  price?: string;
  reference?: string;
  category?: string;
  color?: string;
  number?: string;
  image?: string;
}

export const LabelDesigner: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [widthMm, setWidthMm] = useState(60);
  const [heightMm, setHeightMm] = useState(40);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [canvasKey, setCanvasKey] = useState(0);
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [hasLoadedProduct, setHasLoadedProduct] = useState(false);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  
  const canvasEditorRef = useRef<CanvasEditorRef>(null);

  useEffect(() => {
    const productParam = searchParams.get('product');
    if (productParam) {
      try {
        const decoded = JSON.parse(decodeURIComponent(productParam));
        setProductData(decoded);
        console.log('[LabelDesigner] Product data loaded from URL:', decoded);
      } catch (e) {
        console.error('Erro ao decodificar dados do produto:', e);
      }
    }
  }, [searchParams]);

  const handleCanvasReady = useCallback(() => {
    console.log('[LabelDesigner] Canvas is ready');
    setIsCanvasReady(true);
  }, []);

  useEffect(() => {
    console.log('[LabelDesigner] useEffect check:', {
      hasProductData: !!productData,
      isCanvasReady,
      hasEditorRef: !!canvasEditorRef.current,
      hasLoadedProduct
    });
    
    if (productData && isCanvasReady && !hasLoadedProduct) {
      const loadProductIntoCanvas = () => {
        const editor = canvasEditorRef.current;
        if (!editor) {
          console.error('[LabelDesigner] Editor ref still null, retrying in 100ms...');
          setTimeout(loadProductIntoCanvas, 100);
          return;
        }
        
        console.log('[LabelDesigner] Loading product data into canvas:', productData);
        
        try {
          if (productData.description) {
            console.log('[LabelDesigner] Adding description:', productData.description);
            editor.addTextWithContent(productData.description, { x: 5, y: 3, fontSize: 12, fontWeight: 'bold' });
          }
          
          if (productData.price) {
            const formattedPrice = typeof productData.price === 'number' 
              ? `R$ ${productData.price.toFixed(2).replace('.', ',')}` 
              : `R$ ${productData.price}`;
            console.log('[LabelDesigner] Adding price:', formattedPrice);
            editor.addTextWithContent(formattedPrice, { x: 5, y: 15, fontSize: 14, fontWeight: 'bold' });
          }
          
          if (productData.reference) {
            console.log('[LabelDesigner] Adding reference:', productData.reference);
            editor.addTextWithContent(`Ref: ${productData.reference}`, { x: 5, y: 27, fontSize: 10 });
          }
          
          if (productData.barcode) {
            console.log('[LabelDesigner] Adding barcode:', productData.barcode);
            editor.addBarcode(productData.barcode);
          }
          
          toast.success('Etiqueta carregada com dados do produto!');
          setHasLoadedProduct(true);
        } catch (error) {
          console.error('[LabelDesigner] Error loading product data:', error);
          toast.error('Erro ao carregar dados do produto na etiqueta');
        }
      };
      
      setTimeout(loadProductIntoCanvas, 150);
    }
  }, [productData, isCanvasReady, hasLoadedProduct]);

  const handleSelectionChange = useCallback((object: fabric.Object | null) => {
    setSelectedObject(object);
  }, []);

  const handleCanvasChange = useCallback(() => {
    // Canvas changed - could trigger auto-save or other actions
  }, []);

  const handleSizeChange = () => {
    setIsCanvasReady(false);
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-4">
            {productData && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/produto')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Designer de Etiquetas</h1>
              <p className="text-gray-600 mt-2">
                {productData 
                  ? `Editando etiqueta para: ${productData.description || 'Produto'}` 
                  : 'Crie etiquetas personalizadas com editor visual completo'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Canvas Settings & Toolbar */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-4">Configurações do Canvas</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="width" className="text-xs">Largura (mm)</Label>
                  <Input
                    id="width"
                    type="number"
                    min="10"
                    max="500"
                    value={widthMm}
                    onChange={(e) => setWidthMm(parseInt(e.target.value) || 60)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="height" className="text-xs">Altura (mm)</Label>
                  <Input
                    id="height"
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
              </div>
            </Card>

            <Toolbar
              onAddText={() => canvasEditorRef.current?.addText()}
              onAddImage={(file) => canvasEditorRef.current?.addImage(file)}
              onAddBarcode={() => canvasEditorRef.current?.addBarcode()}
              onAddQRCode={() => canvasEditorRef.current?.addQRCode()}
              onDeleteSelected={() => canvasEditorRef.current?.deleteSelected()}
            />

            <PropertiesPanel
              selectedObject={selectedObject}
              onUpdate={handleCanvasChange}
            />
          </div>

          {/* Center - Canvas */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="mb-4">
                <h3 className="font-semibold text-sm text-gray-700">
                  Canvas de Edição ({widthMm}mm × {heightMm}mm)
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Arraste, redimensione e personalize os elementos
                </p>
              </div>
              
              <CanvasEditor
                key={canvasKey}
                ref={canvasEditorRef}
                widthMm={widthMm}
                heightMm={heightMm}
                onSelectionChange={handleSelectionChange}
                onCanvasChange={handleCanvasChange}
                onReady={handleCanvasReady}
              />

              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (canvasEditorRef.current) {
                      canvasEditorRef.current.clearCanvas();
                      toast.success('Canvas limpo');
                    }
                  }}
                >
                  Limpar Canvas
                </Button>
                <div className="flex-1" />
                <div className="text-xs text-gray-500 flex items-center">
                  Elementos: {canvasEditorRef.current?.canvas?.getObjects().length || 0}
                </div>
              </div>
            </Card>
          </div>

          {/* Right Sidebar - Templates & Export */}
          <div className="lg:col-span-1 space-y-4">
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

        {/* Info Footer */}
        <Card className="mt-6 p-4">
          <div className="text-xs text-gray-600 space-y-1">
            <p><strong>Dicas de uso:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Clique e arraste elementos para movê-los</li>
              <li>Use as alças para redimensionar elementos</li>
              <li>Selecione um elemento para editar suas propriedades no painel esquerdo</li>
              <li>Salve seus designs como templates para reutilizar depois</li>
              <li>Exporte para PDF para impressão tradicional ou ZPL para impressoras Zebra</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LabelDesigner;
