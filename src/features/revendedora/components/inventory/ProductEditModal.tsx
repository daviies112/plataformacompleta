import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Bell, Package, AlertTriangle, Save, Loader2, Upload, Wand2, Image as ImageIcon, ArrowRight, Check, X } from 'lucide-react';
import { photoService } from '@/features/photos/services/photoService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Product {
  id: string;
  description: string | null;
  reference: string | null;
  image: string | null;
  barcode: string | null;
  category: string | null;
  price: number | null;
  stock: number | null;
  low_stock_threshold?: number | null;
  notify_low_stock?: boolean;
}

interface ProductEditModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function ProductEditModal({ product, open, onOpenChange, onSaved }: ProductEditModalProps) {
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    description: '',
    reference: '',
    barcode: '',
    category: '',
    price: 0,
    stock: 0,
    image: '',
    low_stock_threshold: 5,
    notify_low_stock: true
  });

  // AI Enhancement State
  const [enhancing, setEnhancing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("edit");

  useEffect(() => {
    if (product) {
      setFormData({
        description: product.description || '',
        reference: product.reference || '',
        barcode: product.barcode || '',
        category: product.category || '',
        price: product.price || 0,
        stock: product.stock || 0,
        image: product.image || '',
        low_stock_threshold: product.low_stock_threshold ?? 5,
        notify_low_stock: product.notify_low_stock ?? true
      });
      setPreviewUrl(product.image || null);
      setOriginalImage(product.image || null);
      setEnhancedImage(null);
      setUploadFile(null);
      setActiveTab("edit");
    }
  }, [product, open]);

  // Clean up subscription on unmount or when dialog closes
  useEffect(() => {
    let subscription: any;

    if (requestId && open) {
      const subscribe = async () => {
        subscription = await photoService.subscribeToRequest('imagens_gratis', requestId, (payload) => {
          if (payload.status === 'concluido' && payload.foto_melhorada_url) {
            setEnhancedImage(payload.foto_melhorada_url);
            setEnhancing(false);
            toast.success('Foto melhorada com sucesso!');
          } else if (payload.status === 'erro') {
            setEnhancing(false);
            toast.error('Erro ao melhorar foto: ' + (payload.erro_mensagem || 'Erro desconhecido'));
          }
        });
      };
      subscribe();
    }

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [requestId, open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setOriginalImage(objectUrl);

      // Update form data immediately for preview, but real upload happens on save or enhance
      setFormData(prev => ({ ...prev, image: objectUrl }));
      setEnhancedImage(null); // Reset enhanced image on new upload
    }
  };

  const handleEnhancePhoto = async () => {
    if (!uploadFile && !formData.image) {
      toast.error("Selecione uma imagem primeiro.");
      return;
    }

    setEnhancing(true);
    try {
      // 1. Get User
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Você precisa estar logado.");
        setEnhancing(false);
        return;
      }

      let imageUrl = formData.image;

      // 2. Upload image if it's a new local file
      if (uploadFile) {
        toast.info("Enviando imagem...");
        imageUrl = await photoService.uploadImage(uploadFile, 'fotos_servico_gratis', user.id);
        // Update form with the remote URL immediately so we don't upload again
        setFormData(prev => ({ ...prev, image: imageUrl }));
        setOriginalImage(imageUrl);
      } else if (!imageUrl.startsWith('http')) {
        // Should not happen if logic is correct, but safe guard
        toast.error("URL de imagem inválida para processamento.");
        setEnhancing(false);
        return;
      }

      // 3. Create Enhancement Request
      toast.info("Iniciando melhoria com IA...");
      const request = await photoService.createFreeRequest(
        user.id,
        imageUrl,
        formData.description || "Produto"
      );

      setRequestId(request.id);
      // Now we wait for the subscription to pick up the result

    } catch (error: any) {
      console.error("Enhance error:", error);
      toast.error("Erro ao iniciar melhoria: " + error.message);
      setEnhancing(false);
    }
  };

  const handleUseEnhanced = () => {
    if (enhancedImage) {
      setFormData(prev => ({ ...prev, image: enhancedImage }));
      setPreviewUrl(enhancedImage);
      toast.success("Foto melhorada selecionada!");
    }
  };

  const handleSave = async () => {
    if (!product || !supabase) return;

    setLoading(true);
    try {
      // If there is a file that hasn't been uploaded/enhanced yet, upload it now
      let finalImageUrl = formData.image;
      if (uploadFile && !enhancing && (!enhancedImage || formData.image !== enhancedImage) && !formData.image.startsWith('http')) {
        // It's a blob URL, upload it
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          finalImageUrl = await photoService.uploadImage(uploadFile, 'produtos', user.id);
        }
      }

      const { error } = await supabase
        .from('products')
        .update({
          description: formData.description,
          reference: formData.reference,
          barcode: formData.barcode,
          category: formData.category,
          price: formData.price,
          stock: formData.stock,
          image: finalImageUrl,
          low_stock_threshold: formData.low_stock_threshold,
          notify_low_stock: formData.notify_low_stock
        } as any)
        .eq('id', product.id);

      if (error) {
        // Fallback for missing columns (legacy support)
        if (error.code === '42703' || error.message?.includes('column')) {
          console.warn('[ProductEditModal] Columns missing, saving basic info');
          await supabase.from('products').update({
            description: formData.description,
            reference: formData.reference,
            barcode: formData.barcode,
            category: formData.category,
            price: formData.price,
            stock: formData.stock,
            image: finalImageUrl
          }).eq('id', product.id);
        } else {
          throw error;
        }
      }

      toast.success('Produto atualizado com sucesso!');
      onOpenChange(false);
      onSaved?.();
    } catch (error: any) {
      console.error('[ProductEditModal] Error saving:', error);
      toast.error('Erro ao salvar produto: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const isLowStock = formData.stock <= formData.low_stock_threshold;
  const isOutOfStock = formData.stock === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Editar Produto
          </DialogTitle>
          <DialogDescription>
            Configure as informações do produto, foto e alertas de estoque.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit">Detalhes</TabsTrigger>
            <TabsTrigger value="photo">Foto & IA</TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Nome do produto"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference">Referência</Label>
                <Input
                  id="reference"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="REF-001"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="barcode">Código de Barras</Label>
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="7891234567890"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Acessórios"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preço (R$)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Estoque Atual</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                  />
                  {isOutOfStock && (
                    <Badge variant="destructive">Esgotado</Badge>
                  )}
                  {isLowStock && !isOutOfStock && (
                    <Badge variant="secondary" className="bg-orange-200 text-orange-800">
                      Baixo
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <h4 className="font-semibold">Configuração de Alertas</h4>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                <div className="space-y-1">
                  <Label htmlFor="notify_low_stock" className="text-base font-medium">
                    Notificar quando estoque estiver baixo
                  </Label>
                </div>
                <Switch
                  id="notify_low_stock"
                  checked={formData.notify_low_stock}
                  onCheckedChange={(checked) => setFormData({ ...formData, notify_low_stock: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="low_stock_threshold" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Limite mínimo de estoque
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="low_stock_threshold"
                    type="number"
                    min="1"
                    className="w-24"
                    value={formData.low_stock_threshold}
                    onChange={(e) => setFormData({
                      ...formData,
                      low_stock_threshold: Math.max(1, parseInt(e.target.value) || 5)
                    })}
                  />
                  <span className="text-sm text-muted-foreground">
                    peças
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="photo" className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Side: Upload and Current/Original */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Foto Atual / Original</Label>

                <div
                  className={`
                        aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden bg-muted/30
                        ${previewUrl ? 'border-primary/50' : 'border-muted-foreground/25 hover:bg-muted/50'}
                      `}
                  onClick={() => document.getElementById('modal-image-upload')?.click()}
                >
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center p-4">
                      <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Clique para enviar foto</p>
                    </div>
                  )}

                  {/* Hidden Input */}
                  <Input
                    id="modal-image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                <Button
                  onClick={handleEnhancePhoto}
                  disabled={enhancing || !previewUrl}
                  className="w-full gap-2"
                  variant="default" // Changed from outline to default to highlight feature
                >
                  {enhancing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Melhorando...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Melhorar com IA (Grátis)
                    </>
                  )}
                </Button>
              </div>

              {/* Right Side: Enhanced Result */}
              <div className="space-y-4">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-purple-500" />
                  Resultado IA
                </Label>

                <div className="aspect-square border rounded-lg bg-muted/10 flex items-center justify-center relative overflow-hidden">
                  {activeTab === 'photo' && enhancing ? (
                    <div className="text-center p-6 space-y-4">
                      <div className="relative mx-auto w-16 h-16">
                        <div className="absolute inset-0 rounded-full border-4 border-purple-100"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-purple-500 border-t-transparent animate-spin"></div>
                        <Wand2 className="absolute inset-0 m-auto text-purple-500 w-6 h-6 animate-pulse" />
                      </div>
                      <p className="text-sm text-muted-foreground animate-pulse">
                        Processando sua imagem...<br />Isso leva alguns segundos.
                      </p>
                    </div>
                  ) : enhancedImage ? (
                    <img src={enhancedImage} alt="Enhanced" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center p-6 text-muted-foreground">
                      <ImageIcon className="mx-auto h-12 w-12 opacity-20 mb-3" />
                      <p className="text-sm">O resultado da melhoria aparecerá aqui.</p>
                    </div>
                  )}
                </div>

                {enhancedImage && (
                  <Button
                    onClick={handleUseEnhanced}
                    variant="secondary"
                    className="w-full gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200"
                  >
                    <Check className="w-4 h-4" />
                    Usar Foto Melhorada
                  </Button>
                )}
              </div>
            </div>

            {enhancedImage && (
              <div className="bg-blue-50 p-3 rounded-md border border-blue-100 text-sm text-blue-700 flex gap-2 items-start mt-4">
                <ArrowRight className="w-4 h-4 mt-0.5 shrink-0" />
                <p>
                  Compare as duas versões. Se gostar do resultado da IA, clique em <strong>"Usar Foto Melhorada"</strong> e depois em <strong>"Salvar Alterações"</strong> para confirmar.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading || enhancing}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || enhancing}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
