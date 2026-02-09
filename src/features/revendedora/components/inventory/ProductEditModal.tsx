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
import { Bell, Package, AlertTriangle, Save, Loader2 } from 'lucide-react';

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
  const [formData, setFormData] = useState({
    description: '',
    reference: '',
    barcode: '',
    category: '',
    price: 0,
    stock: 0,
    low_stock_threshold: 5,
    notify_low_stock: true
  });

  useEffect(() => {
    if (product) {
      setFormData({
        description: product.description || '',
        reference: product.reference || '',
        barcode: product.barcode || '',
        category: product.category || '',
        price: product.price || 0,
        stock: product.stock || 0,
        low_stock_threshold: product.low_stock_threshold ?? 5,
        notify_low_stock: product.notify_low_stock ?? true
      });
    }
  }, [product]);

  const handleSave = async () => {
    if (!product || !supabase) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({
          description: formData.description,
          reference: formData.reference,
          barcode: formData.barcode,
          category: formData.category,
          price: formData.price,
          stock: formData.stock,
          low_stock_threshold: formData.low_stock_threshold,
          notify_low_stock: formData.notify_low_stock
        } as any)
        .eq('id', product.id);

      if (error) {
        if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('low_stock_threshold')) {
          console.warn('[ProductEditModal] Stock alert columns not available, saving without them');
          const { error: fallbackError } = await supabase
            .from('products')
            .update({
              description: formData.description,
              reference: formData.reference,
              barcode: formData.barcode,
              category: formData.category,
              price: formData.price,
              stock: formData.stock
            })
            .eq('id', product.id);

          if (fallbackError) throw fallbackError;
          
          toast.success('Produto atualizado! (Alertas de estoque requerem migração do banco de dados)');
          onOpenChange(false);
          onSaved?.();
          return;
        }
        throw error;
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Editar Produto
          </DialogTitle>
          <DialogDescription>
            Configure as informações do produto e alertas de estoque
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
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
                <p className="text-sm text-muted-foreground">
                  Receba alertas quando o produto atingir o limite mínimo
                </p>
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
                  max="999"
                  className="w-24"
                  value={formData.low_stock_threshold}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    low_stock_threshold: Math.max(1, parseInt(e.target.value) || 5)
                  })}
                />
                <span className="text-sm text-muted-foreground">
                  peças (notificação será enviada quando atingir este número)
                </span>
              </div>
              {formData.notify_low_stock && formData.stock <= formData.low_stock_threshold && (
                <p className="text-sm text-orange-600 flex items-center gap-1 mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  O estoque atual ({formData.stock}) está abaixo do limite configurado ({formData.low_stock_threshold})
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
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
