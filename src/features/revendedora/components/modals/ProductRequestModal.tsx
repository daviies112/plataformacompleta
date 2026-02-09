import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, Loader2, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { resellerFetch } from '@/features/revendedora/lib/resellerAuth';

interface ProductRequestModalProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
  resellerId: string;
}

export function ProductRequestModal({
  product,
  isOpen,
  onClose,
  resellerId
}: ProductRequestModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  if (!product) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleSubmitRequest = async () => {
    if (quantity < 1) {
      toast.error('A quantidade deve ser pelo menos 1');
      return;
    }

    setProcessing(true);
    try {
      const response = await resellerFetch('/api/reseller/product-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          quantity: quantity,
          notes: notes.trim() || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar solicitação');
      }

      toast.success('Solicitação enviada com sucesso! A empresa será notificada.');
      handleClose();
    } catch (error: any) {
      console.error('Erro ao enviar solicitação:', error);
      toast.error(error.message || 'Erro ao enviar solicitação');
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setQuantity(1);
    setNotes('');
    onClose();
  };

  const productImage = product.image || product.image_url;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Solicitar Produto</DialogTitle>
          <DialogDescription>
            Preencha os dados para solicitar este produto à empresa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-4 p-4 bg-muted rounded-lg">
            <div className="w-24 h-24 rounded-lg bg-background flex items-center justify-center overflow-hidden flex-shrink-0 border">
              {productImage ? (
                <img
                  src={productImage}
                  alt={product.description}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{product.description}</h3>
              {product.reference && (
                <p className="text-sm text-muted-foreground">REF: {product.reference}</p>
              )}
              {product.category && (
                <Badge variant="secondary" className="mt-1">
                  {product.category}
                </Badge>
              )}
              <p className="text-lg font-bold text-primary mt-2">
                {formatCurrency(product.price || 0)}
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade desejada</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={processing}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Adicione observações sobre a solicitação..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={processing}
                className="resize-none"
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={processing}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmitRequest}
            disabled={processing}
            className="flex-1"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Solicitar Produto
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
