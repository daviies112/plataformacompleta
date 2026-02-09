import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { BankAccountFormData, BRAZILIAN_BANKS, PIX_KEY_TYPES, ACCOUNT_TYPES } from '@/hooks/useBankAccounts';

interface BankAccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: BankAccountFormData) => Promise<void>;
  initialData?: Partial<BankAccountFormData>;
  isEditing?: boolean;
  saving?: boolean;
}

export function BankAccountForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEditing = false,
  saving = false,
}: BankAccountFormProps) {
  const [formData, setFormData] = useState<BankAccountFormData>({
    bank_name: initialData?.bank_name || '',
    bank_code: initialData?.bank_code || '',
    agency: initialData?.agency || '',
    account_number: initialData?.account_number || '',
    account_type: initialData?.account_type || 'corrente',
    holder_name: initialData?.holder_name || '',
    holder_document: initialData?.holder_document || '',
    pix_key: initialData?.pix_key || '',
    pix_key_type: initialData?.pix_key_type || '',
    is_primary: initialData?.is_primary || false,
  });

  const handleBankChange = (value: string) => {
    const bank = BRAZILIAN_BANKS.find(b => b.code === value);
    setFormData(prev => ({
      ...prev,
      bank_code: value,
      bank_name: bank?.name || '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
    onOpenChange(false);
  };

  const formatDocument = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Conta Bancária' : 'Adicionar Conta Bancária'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Atualize os dados da sua conta bancária para receber os saques.'
              : 'Adicione uma conta bancária para receber seus saques.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="bank">Banco</Label>
              <Select 
                value={formData.bank_code || ''} 
                onValueChange={handleBankChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o banco" />
                </SelectTrigger>
                <SelectContent>
                  {BRAZILIAN_BANKS.map(bank => (
                    <SelectItem key={bank.code} value={bank.code}>
                      {bank.code !== '000' ? `${bank.code} - ${bank.name}` : bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="agency">Agência</Label>
                <Input
                  id="agency"
                  value={formData.agency}
                  onChange={(e) => setFormData(prev => ({ ...prev, agency: e.target.value }))}
                  placeholder="0001"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="account_number">Conta</Label>
                <Input
                  id="account_number"
                  value={formData.account_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, account_number: e.target.value }))}
                  placeholder="12345-6"
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="account_type">Tipo de Conta</Label>
              <Select 
                value={formData.account_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, account_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="holder_name">Nome do Titular</Label>
              <Input
                id="holder_name"
                value={formData.holder_name}
                onChange={(e) => setFormData(prev => ({ ...prev, holder_name: e.target.value }))}
                placeholder="Nome completo"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="holder_document">CPF/CNPJ do Titular</Label>
              <Input
                id="holder_document"
                value={formData.holder_document}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  holder_document: formatDocument(e.target.value) 
                }))}
                placeholder="000.000.000-00"
                maxLength={18}
                required
              />
            </div>

            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium mb-3">Chave PIX (opcional)</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="pix_key_type">Tipo de Chave</Label>
                  <Select 
                    value={formData.pix_key_type || ''} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, pix_key_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {PIX_KEY_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pix_key">Chave PIX</Label>
                  <Input
                    id="pix_key"
                    value={formData.pix_key || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, pix_key: e.target.value }))}
                    placeholder="Sua chave PIX"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="is_primary"
                checked={formData.is_primary}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_primary: checked }))}
              />
              <Label htmlFor="is_primary">Definir como conta principal</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Salvar Alterações' : 'Adicionar Conta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
