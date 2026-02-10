import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Wallet, DollarSign, Check, Loader2, Link as LinkIcon, Share2, MessageCircle, Copy, Package } from 'lucide-react';
import { toast } from 'sonner';
import { PaymentService } from '@/services/PaymentService';
import { SplitService } from '@/services/SplitService';
import { useNavigate } from 'react-router-dom';
import { useCommissionConfig } from '@/hooks/useCommissionConfig';

interface SellProductModalProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
  resellerId: string;
  companyId: string;
}

type PaymentMethod = 'pix' | 'cartao' | 'dinheiro' | 'link' | null;

export function SellProductModal({
  product,
  isOpen,
  onClose,
  resellerId,
  companyId
}: SellProductModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [processing, setProcessing] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const navigate = useNavigate();
  const { config, getCurrentCommission, monthlyVolume, loading: configLoading } = useCommissionConfig(resellerId);

  const generatePaymentLink = () => {
    const baseUrl = window.location.origin;
    const productLink = `${baseUrl}/produto/${product.id}?reseller=${resellerId}`;
    return productLink;
  };

  const generateShareMessage = () => {
    const price = SplitService.formatCurrency(product.price);
    return `🛍️ *${product.description}*\n\n💰 Preço: ${price}\n📦 Ref: ${product.reference || 'N/A'}\n\n✅ Compre agora pelo link:\n${generatePaymentLink()}`;
  };

  const handleShareWhatsApp = () => {
    const message = encodeURIComponent(generateShareMessage());
    const whatsappUrl = `https://wa.me/?text=${message}`;
    window.open(whatsappUrl, '_blank');
    toast.success('Link aberto no WhatsApp!');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatePaymentLink());
      toast.success('Link copiado para a área de transferência!');
    } catch (error) {
      toast.error('Erro ao copiar link');
    }
  };

  const handleNativeShare = async () => {
    const shareData = {
      title: product.description,
      text: generateShareMessage(),
      url: generatePaymentLink(),
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success('Compartilhado com sucesso!');
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          toast.error('Erro ao compartilhar');
        }
      }
    } else {
      handleCopyLink();
    }
  };

  if (!product) return null;

  const { resellerPercentage, companyPercentage, tierName } = getCurrentCommission();
  const split = SplitService.calculateSplit(product.price, resellerPercentage);
  const isDynamic = config.use_dynamic_tiers;

  const handleConfirmSale = async () => {
    if (!paymentMethod || paymentMethod === 'link') {
      toast.error('Selecione uma forma de pagamento');
      return;
    }

    if (product.stock <= 0) {
      toast.error('Produto sem estoque disponível');
      return;
    }

    setProcessing(true);
    try {
      const response = await PaymentService.createSale({
        productId: product.id,
        resellerId: resellerId || '00000000-0000-0000-0000-000000000000',
        companyId: companyId || product.company_id || '00000000-0000-0000-0000-000000000000',
        paymentMethod: paymentMethod as 'pix' | 'cartao' | 'dinheiro',
        customerName: 'Cliente',
        customerEmail: 'cliente@example.com'
      });

      if (response.success) {
        // Para dinheiro, apenas confirmar
        if (paymentMethod === 'dinheiro') {
          toast.success(response.message);
          onClose();
          window.location.reload();
        }
        
        // Para PIX, redirecionar para página de QR Code
        else if (paymentMethod === 'pix' && response.pix) {
          onClose();
          navigate(`/reseller/payment/pix/${response.saleId}`);
        }
        
        // Para cartão, redirecionar para página de pagamento com Pagar.me
        else if (paymentMethod === 'cartao' && response.clientSecret) {
          onClose();
          navigate(`/reseller/payment/card/${response.saleId}`, {
            state: { 
              clientSecret: response.clientSecret,
              amount: response.split?.total || product.price,
              productName: product.description
            }
          });
        }
      }
    } catch (error: any) {
      console.error('Erro ao processar venda:', error);
      toast.error(error.message || 'Erro ao processar venda');
    } finally {
      setProcessing(false);
    }
  };

  const paymentOptions = [
    {
      id: 'pix',
      name: 'PIX',
      description: 'Pagamento instantâneo',
      icon: DollarSign,
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      id: 'cartao',
      name: 'Cartão',
      description: 'Crédito ou débito',
      icon: CreditCard,
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      id: 'dinheiro',
      name: 'Dinheiro',
      description: 'Pagamento em espécie',
      icon: Wallet,
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      id: 'link',
      name: 'Link de Pagamento',
      description: 'Compartilhe via WhatsApp ou redes sociais',
      icon: LinkIcon,
      color: 'bg-orange-500 hover:bg-orange-600'
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Vender Produto</DialogTitle>
          <DialogDescription>
            Selecione a forma de pagamento para completar a venda
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Produto */}
          <div className="flex gap-4 p-4 bg-muted rounded-lg">
            {product.image_url && (
              <img
                src={product.image_url}
                alt={product.description}
                className="w-20 h-20 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <h3 className="font-semibold">{product.description}</h3>
              <p className="text-sm text-muted-foreground">REF: {product.reference}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-lg font-bold text-primary">
                  {SplitService.formatCurrency(product.price)}
                </span>
                <Badge variant={product.stock > 0 ? "default" : "destructive"}>
                  Estoque: {product.stock} un.
                </Badge>
              </div>
            </div>
          </div>

          {/* Split Info */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm">
                Divisão Automática (Split {resellerPercentage}/{companyPercentage})
              </h4>
              {isDynamic && (
                <Badge variant="secondary" className="text-xs">
                  {tierName}
                </Badge>
              )}
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Você recebe ({resellerPercentage}%):</span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {SplitService.formatCurrency(split.resellerAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Empresa recebe ({companyPercentage}%):</span>
                <span className="font-semibold">
                  {SplitService.formatCurrency(split.companyAmount)}
                </span>
              </div>
            </div>
            {isDynamic && (
              <p className="text-xs text-muted-foreground mt-2">
                Sua faixa: {tierName} (vendas do mês: {SplitService.formatCurrency(monthlyVolume)})
              </p>
            )}
          </div>

          <Separator />

          {/* Formas de Pagamento */}
          <div className="space-y-3">
            <h4 className="font-semibold">Forma de Pagamento</h4>
            <div className="grid gap-3">
              {paymentOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = paymentMethod === option.id;
                
                return (
                  <button
                    key={option.id}
                    onClick={() => setPaymentMethod(option.id as PaymentMethod)}
                    disabled={processing}
                    className={`
                      relative flex items-center gap-4 p-4 rounded-lg border-2 transition-all
                      ${isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                      }
                      ${processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <div className={`p-3 rounded-lg text-white ${option.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold">{option.name}</div>
                      <div className="text-sm text-muted-foreground">{option.description}</div>
                    </div>
                    {isSelected && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Opções de Compartilhamento - Aparece quando Link de Pagamento é selecionado */}
          {paymentMethod === 'link' && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-semibold">Compartilhar Link de Pagamento</h4>
                
                {/* Preview do Produto para Compartilhamento */}
                <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="flex gap-4">
                    <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-orange-300">
                      {(product.image || product.image_url) ? (
                        <img 
                          src={product.image || product.image_url} 
                          alt={product.description} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-10 h-10 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-lg truncate">{product.description}</h5>
                      <p className="text-sm text-muted-foreground">REF: {product.reference || 'N/A'}</p>
                      <p className="text-xl font-bold text-primary mt-2">
                        {SplitService.formatCurrency(product.price)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Botões de Compartilhamento */}
                <div className="grid grid-cols-1 gap-3">
                  <Button
                    onClick={handleShareWhatsApp}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Enviar pelo WhatsApp
                  </Button>
                  
                  <Button
                    onClick={handleNativeShare}
                    variant="outline"
                    className="w-full"
                  >
                    <Share2 className="mr-2 h-5 w-5" />
                    Compartilhar em qualquer lugar
                  </Button>
                  
                  <Button
                    onClick={handleCopyLink}
                    variant="secondary"
                    className="w-full"
                  >
                    <Copy className="mr-2 h-5 w-5" />
                    Copiar Link
                  </Button>
                </div>

                {/* Link gerado */}
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Link de pagamento:</p>
                  <p className="text-sm font-mono break-all text-primary">
                    {generatePaymentLink()}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Ações - Esconde quando Link de Pagamento é selecionado */}
        {paymentMethod !== 'link' && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={processing}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmSale}
              disabled={!paymentMethod || processing || product.stock <= 0}
              className="flex-1"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                'Confirmar Venda'
              )}
            </Button>
          </div>
        )}

        {/* Botão Fechar quando Link de Pagamento é selecionado */}
        {paymentMethod === 'link' && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full"
            >
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
