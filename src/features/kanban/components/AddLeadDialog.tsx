import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AddLeadDialogProps {
  onAdd: (lead: {
    name: string;
    phone: string;
    email: string;
    value: number;
    contactDate: string;
    status: string;
  }) => void;
  columns: { id: string; title: string }[];
}

export default function AddLeadDialog({ onAdd, columns }: AddLeadDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    value: '',
    contactDate: new Date().toISOString().split('T')[0],
    status: columns[0]?.id || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      value: parseFloat(formData.value) || 0,
      contactDate: formData.contactDate,
      status: formData.status,
    });
    setFormData({
      name: '',
      phone: '',
      email: '',
      value: '',
      contactDate: new Date().toISOString().split('T')[0],
      status: columns[0]?.id || '',
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-lead">
          <Plus className="w-4 h-4 mr-2" />
          Novo Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="dialog-add-lead">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: João Silva"
              required
              data-testid="input-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(11) 98765-4321"
              required
              data-testid="input-phone"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="joao@email.com"
              required
              data-testid="input-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Valor Potencial (R$)</Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              placeholder="5000.00"
              required
              data-testid="input-value"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactDate">Data de Contato</Label>
            <Input
              id="contactDate"
              type="date"
              value={formData.contactDate}
              onChange={(e) => setFormData({ ...formData, contactDate: e.target.value })}
              required
              data-testid="input-contact-date"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status Inicial</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger id="status" data-testid="select-status">
                <SelectValue placeholder="Selecione um status" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col.id} value={col.id}>
                    {col.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              data-testid="button-cancel"
            >
              Cancelar
            </Button>
            <Button type="submit" data-testid="button-submit">
              Adicionar Lead
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
