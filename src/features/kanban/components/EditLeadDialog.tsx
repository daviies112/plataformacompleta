import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Lead } from './LeadCard';

interface EditLeadDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (lead: Lead) => void;
}

export default function EditLeadDialog({ lead, open, onOpenChange, onSave }: EditLeadDialogProps) {
  const [formData, setFormData] = useState<Lead | null>(null);

  useEffect(() => {
    if (lead) {
      setFormData(lead);
    }
  }, [lead]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      onSave(formData);
      onOpenChange(false);
    }
  };

  if (!formData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-edit-lead">
        <DialogHeader>
          <DialogTitle>Editar Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome Completo</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: João Silva"
              required
              data-testid="input-edit-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-phone">Telefone</Label>
            <Input
              id="edit-phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(11) 98765-4321"
              required
              data-testid="input-edit-phone"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="joao@email.com"
              required
              data-testid="input-edit-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-value">Valor Potencial (R$)</Label>
            <Input
              id="edit-value"
              type="number"
              step="0.01"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })}
              placeholder="5000.00"
              required
              data-testid="input-edit-value"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-contactDate">Data de Contato</Label>
            <Input
              id="edit-contactDate"
              type="date"
              value={formData.contactDate}
              onChange={(e) => setFormData({ ...formData, contactDate: e.target.value })}
              required
              data-testid="input-edit-contact-date"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-edit-cancel"
            >
              Cancelar
            </Button>
            <Button type="submit" data-testid="button-edit-save">
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
