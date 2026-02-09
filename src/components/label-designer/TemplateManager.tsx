import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Save, FolderOpen, Trash2, Plus, Download, Tag, Package } from 'lucide-react';
import { LabelTemplate } from './types';

interface TemplateManagerProps {
  onLoad: (template: LabelTemplate) => void;
  onSave: () => { designData: any; widthMm: number; heightMm: number };
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  onLoad,
  onSave,
}) => {
  const [templates, setTemplates] = useState<LabelTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: '',
    tags: '',
  });

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/label-designer/templates');
      if (response.data.success) {
        setTemplates(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDefaults = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/label-designer/templates/seed-defaults', { force: true });
      if (response.data.success) {
        if (response.data.skipped) {
          toast.info(response.data.message);
        } else {
          toast.success(`${response.data.count} templates padrão importados!`);
          fetchTemplates();
        }
      }
    } catch (error: any) {
      console.error('Error seeding default templates:', error);
      toast.error(error.response?.data?.error || 'Erro ao importar templates padrão');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSaveTemplate = async () => {
    if (!newTemplate.name.trim()) {
      toast.error('Por favor, digite um nome para o template');
      return;
    }

    try {
      const { designData, widthMm, heightMm } = onSave();
      
      const templateData = {
        name: newTemplate.name.trim(),
        description: newTemplate.description.trim() || undefined,
        category: newTemplate.category.trim() || undefined,
        tags: newTemplate.tags ? newTemplate.tags.split(',').map(t => t.trim()) : undefined,
        widthMm,
        heightMm,
        designData,
      };

      const response = await axios.post('/api/label-designer/templates', templateData);
      
      if (response.data.success) {
        toast.success('Template salvo com sucesso!');
        setSaveDialogOpen(false);
        setNewTemplate({ name: '', description: '', category: '', tags: '' });
        fetchTemplates();
      }
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar template');
    }
  };

  const handleLoadTemplate = async (templateId: number) => {
    try {
      const response = await axios.get(`/api/label-designer/templates/${templateId}`);
      if (response.data.success) {
        onLoad(response.data.data);
        toast.success('Template carregado com sucesso!');
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('Erro ao carregar template');
    }
  };

  const handleDeleteTemplate = async (templateId: number, templateName: string) => {
    if (!confirm(`Deseja realmente deletar o template "${templateName}"?`)) {
      return;
    }

    try {
      const response = await axios.delete(`/api/label-designer/templates/${templateId}`);
      if (response.data.success) {
        toast.success('Template deletado com sucesso!');
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Erro ao deletar template');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-sm">Templates</CardTitle>
            <CardDescription className="text-xs">Gerenciar templates salvos</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleSeedDefaults}
              disabled={loading}
              title="Importar templates padrão para etiquetas de bijuterias"
            >
              <Download className="w-4 h-4 mr-1" />
              Padrões
            </Button>
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="default">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Salvar Template</DialogTitle>
                  <DialogDescription>
                    Salve o design atual como um template reutilizável
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Etiqueta Brinco Pequena"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Input
                      id="description"
                      value={newTemplate.description}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Ex: Template para brincos pequenos"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Categoria</Label>
                    <Input
                      id="category"
                      value={newTemplate.category}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="Ex: semijoias"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                    <Input
                      id="tags"
                      value={newTemplate.tags}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="Ex: brinco, pequeno, dourado"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveTemplate}>Salvar Template</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          {loading ? (
            <p className="text-sm text-gray-500">Carregando templates...</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum template salvo ainda</p>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{template.name}</h4>
                    {template.description && (
                      <p className="text-xs text-gray-500">{template.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {template.widthMm}mm × {template.heightMm}mm
                      {template.category && ` • ${template.category}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLoadTemplate(template.id!)}
                    >
                      <FolderOpen className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteTemplate(template.id!, template.name)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
