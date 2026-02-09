import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ColorPicker } from "@/components/design/ColorPicker";

interface WhatsappLabel {
  id: string;
  nome: string;
  cor: string;
  formStatus: string;
  qualificationStatus: string | null;
  ordem: number;
  ativo: boolean;
}

const formStatusOptions = [
  { value: 'not_sent', label: 'Não enviado' },
  { value: 'sent', label: 'Enviado' },
  { value: 'opened', label: 'Aberto' },
  { value: 'incomplete', label: 'Incompleto' },
  { value: 'completed', label: 'Concluído' },
  { value: 'cpf_approved', label: 'CPF Aprovado' },
  { value: 'cpf_rejected', label: 'CPF Reprovado' },
  { value: 'meeting_pending', label: 'Reunião Pendente' },
  { value: 'meeting_completed', label: 'Reunião Concluída' },
  { value: 'consultor', label: 'Consultor' },
];

const qualificationStatusOptions = [
  { value: 'null', label: 'Qualquer' },
  { value: 'pending', label: 'Pendente' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'rejected', label: 'Reprovado' },
];

export function LabelManager() {
  const [labels, setLabels] = useState<WhatsappLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLabel, setEditingLabel] = useState<WhatsappLabel | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadLabels();
  }, []);

  const loadLabels = async () => {
    try {
      const response = await fetch('/api/whatsapp/labels');
      const data = await response.json();
      setLabels(data);
    } catch (error) {
      console.error('Erro ao carregar etiquetas:', error);
      toast.error('Erro ao carregar etiquetas');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (label: WhatsappLabel) => {
    setEditingLabel({ ...label });
    setIsCreating(false);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingLabel({
      id: '',
      nome: '',
      cor: 'hsl(0, 70%, 50%)',
      formStatus: 'not_sent',
      qualificationStatus: null,
      ordem: labels.length + 1,
      ativo: true,
    });
    setIsCreating(true);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingLabel) return;

    if (!editingLabel.nome.trim()) {
      toast.error('Nome da etiqueta é obrigatório');
      return;
    }

    try {
      const labelData = {
        ...editingLabel,
        qualificationStatus: editingLabel.qualificationStatus === 'null' ? null : editingLabel.qualificationStatus,
      };

      if (isCreating) {
        const response = await fetch('/api/whatsapp/labels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(labelData),
        });
        
        if (response.ok) {
          toast.success('Etiqueta criada com sucesso');
          loadLabels();
          setIsDialogOpen(false);
        } else {
          throw new Error('Erro ao criar etiqueta');
        }
      } else {
        const response = await fetch(`/api/whatsapp/labels/${editingLabel.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(labelData),
        });
        
        if (response.ok) {
          toast.success('Etiqueta atualizada com sucesso');
          loadLabels();
          setIsDialogOpen(false);
        } else {
          throw new Error('Erro ao atualizar etiqueta');
        }
      }
    } catch (error) {
      console.error('Erro ao salvar etiqueta:', error);
      toast.error('Erro ao salvar etiqueta');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta etiqueta?')) return;

    try {
      const response = await fetch(`/api/whatsapp/labels/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast.success('Etiqueta removida com sucesso');
        loadLabels();
      } else {
        throw new Error('Erro ao deletar etiqueta');
      }
    } catch (error) {
      console.error('Erro ao deletar etiqueta:', error);
      toast.error('Erro ao deletar etiqueta');
    }
  };

  const handleReset = async () => {
    if (!confirm('Tem certeza que deseja resetar para as etiquetas padrão? Todas as etiquetas personalizadas serão removidas.')) return;

    try {
      const response = await fetch('/api/whatsapp/labels/reset', {
        method: 'POST',
      });
      
      if (response.ok) {
        toast.success('Etiquetas resetadas para padrão');
        loadLabels();
      } else {
        throw new Error('Erro ao resetar etiquetas');
      }
    } catch (error) {
      console.error('Erro ao resetar etiquetas:', error);
      toast.error('Erro ao resetar etiquetas');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Etiquetas Personalizadas</CardTitle>
              <CardDescription>
                Gerencie as etiquetas para organizar suas conversas
              </CardDescription>
            </div>
            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Resetar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando etiquetas...</p>
          ) : (
            <>
              {labels.map((label) => (
                <div
                  key={label.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: label.cor }}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{label.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {label.cor}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleEdit(label)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(label.id)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                onClick={handleCreate}
                variant="outline"
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Adicionar Nova Etiqueta
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isCreating ? 'Criar Nova Etiqueta' : 'Editar Etiqueta'}
            </DialogTitle>
            <DialogDescription>
              Configure o nome, cor e status da etiqueta
            </DialogDescription>
          </DialogHeader>

          {editingLabel && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Etiqueta</Label>
                <Input
                  id="nome"
                  value={editingLabel.nome}
                  onChange={(e) =>
                    setEditingLabel({ ...editingLabel, nome: e.target.value })
                  }
                  placeholder="Ex: Aprovado, Pendente..."
                />
              </div>

              <ColorPicker
                label="Cor da Etiqueta"
                color={editingLabel.cor}
                onChange={(cor) => setEditingLabel({ ...editingLabel, cor })}
              />

              <div className="space-y-2">
                <Label htmlFor="formStatus">Status do Formulário</Label>
                <Select
                  value={editingLabel.formStatus}
                  onValueChange={(value) =>
                    setEditingLabel({ ...editingLabel, formStatus: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qualificationStatus">Status de Qualificação</Label>
                <Select
                  value={editingLabel.qualificationStatus || 'null'}
                  onValueChange={(value) =>
                    setEditingLabel({
                      ...editingLabel,
                      qualificationStatus: value === 'null' ? null : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {qualificationStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  "Qualquer" aplica para todos os status de qualificação
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {isCreating ? 'Criar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
