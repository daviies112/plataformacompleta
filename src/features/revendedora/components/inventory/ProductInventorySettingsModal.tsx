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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Settings, Save, Loader2, HelpCircle } from 'lucide-react';

interface Product {
  id: string;
  description: string | null;
  lead_time_days?: number | null;
  freight_cost_per_unit?: number | null;
  supplier_name?: string | null;
  min_order_quantity?: number | null;
  safety_stock_days?: number | null;
  review_period_days?: number | null;
}

interface ProductInventorySettingsModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProduct: Product) => void;
}

interface FormField {
  id: keyof typeof tooltips;
  label: string;
  type: 'number' | 'text' | 'currency';
  value: string | number;
  placeholder?: string;
}

const tooltips = {
  lead_time_days: 'Tempo desde o pedido até a chegada do produto',
  freight_cost_per_unit: 'Custo de transporte por unidade do produto',
  supplier_name: 'Nome do fornecedor responsável pelo produto',
  min_order_quantity: 'Quantidade mínima para realizar um pedido ao fornecedor',
  safety_stock_days: 'Dias extras de estoque para emergências',
  review_period_days: 'Intervalo entre revisões de estoque',
};

export function ProductInventorySettingsModal({
  product,
  isOpen,
  onClose,
  onSave,
}: ProductInventorySettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    lead_time_days: 0,
    freight_cost_per_unit: 0,
    supplier_name: '',
    min_order_quantity: 1,
    safety_stock_days: 7,
    review_period_days: 7,
  });

  useEffect(() => {
    if (product) {
      setFormData({
        lead_time_days: product.lead_time_days ?? 0,
        freight_cost_per_unit: product.freight_cost_per_unit ?? 0,
        supplier_name: product.supplier_name ?? '',
        min_order_quantity: product.min_order_quantity ?? 1,
        safety_stock_days: product.safety_stock_days ?? 7,
        review_period_days: product.review_period_days ?? 7,
      });
    }
  }, [product]);

  const handleSave = async () => {
    if (!product || !supabase) return;

    setLoading(true);
    try {
      const updateData = {
        lead_time_days: formData.lead_time_days,
        freight_cost_per_unit: formData.freight_cost_per_unit,
        supplier_name: formData.supplier_name,
        min_order_quantity: formData.min_order_quantity,
        safety_stock_days: formData.safety_stock_days,
        review_period_days: formData.review_period_days,
      };

      const { error } = await supabase
        .from('products')
        .update(updateData as any)
        .eq('id', product.id);

      if (error) {
        if (error.code === '42703' || error.message?.includes('column')) {
          console.warn('[ProductInventorySettingsModal] Inventory columns not available in database. Please run the migration in docs/supabase-inventory-forecasting.sql');
          toast.error('Campos de inventário não disponíveis. Execute a migração do banco de dados primeiro.');
          setLoading(false);
          return;
        }
        throw error;
      }

      toast.success('Configurações de inventário atualizadas com sucesso!');
      
      const updatedProduct: Product = {
        ...product,
        lead_time_days: formData.lead_time_days,
        freight_cost_per_unit: formData.freight_cost_per_unit,
        supplier_name: formData.supplier_name,
        min_order_quantity: formData.min_order_quantity,
        safety_stock_days: formData.safety_stock_days,
        review_period_days: formData.review_period_days,
      };
      
      onSave(updatedProduct);
      onClose();
    } catch (error: any) {
      console.error('[ProductInventorySettingsModal] Error saving:', error);
      toast.error('Erro ao salvar configurações: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const renderFieldWithTooltip = (
    fieldId: keyof typeof tooltips,
    label: string,
    type: 'number' | 'text' | 'currency',
    value: string | number,
    placeholder?: string
  ) => {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={fieldId}>{label}</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-foreground">
                  <HelpCircle className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">{tooltips[fieldId]}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          id={fieldId}
          type={type === 'currency' ? 'number' : type}
          step={type === 'currency' ? '0.01' : type === 'number' ? '1' : undefined}
          min={type === 'number' || type === 'currency' ? '0' : undefined}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            const val = type === 'text' 
              ? e.target.value 
              : type === 'currency'
                ? parseFloat(e.target.value) || 0
                : parseInt(e.target.value) || 0;
            handleInputChange(fieldId, val);
          }}
        />
      </div>
    );
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações de Inventário
          </DialogTitle>
          <DialogDescription>
            Configure os parâmetros de inventário para: <strong>{product.description}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            {renderFieldWithTooltip(
              'lead_time_days',
              'Tempo de entrega (dias)',
              'number',
              formData.lead_time_days,
              '0'
            )}
            {renderFieldWithTooltip(
              'review_period_days',
              'Período de revisão (dias)',
              'number',
              formData.review_period_days,
              '7'
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {renderFieldWithTooltip(
              'freight_cost_per_unit',
              'Custo de frete por unidade (R$)',
              'currency',
              formData.freight_cost_per_unit,
              '0.00'
            )}
            {renderFieldWithTooltip(
              'min_order_quantity',
              'Quantidade mínima de pedido',
              'number',
              formData.min_order_quantity,
              '1'
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {renderFieldWithTooltip(
              'safety_stock_days',
              'Dias de estoque de segurança',
              'number',
              formData.safety_stock_days,
              '7'
            )}
            <div className="col-span-1">
              {renderFieldWithTooltip(
                'supplier_name',
                'Nome do fornecedor',
                'text',
                formData.supplier_name,
                'Nome do fornecedor'
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
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
