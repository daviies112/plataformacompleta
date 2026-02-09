import { useState } from 'react';
import type { DatabaseField } from '@/types/notion';
import type { StoreDatabase } from '@/stores/notionStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Copy, ExternalLink, Settings, Send, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface FormViewProps {
  database: StoreDatabase;
  onUpdate: (updates: Partial<StoreDatabase>) => void;
  onAddRow: (values: Record<string, any>) => void;
  isLocked: boolean;
}

export const FormView = ({ database, onUpdate, onAddRow, isLocked }: FormViewProps) => {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const formSettings = database.formSettings || {
    enabled: true,
    successMessage: 'Obrigado! Sua resposta foi registrada.',
    allowMultiple: true,
  };

  const publicUrl = formSettings.publicUrl || `${window.location.origin}/form/${database.id}`;

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const values: Record<string, any> = {};
    database.fields.forEach(field => {
      values[field.id] = formValues[field.id] ?? (field.type === 'checkbox' ? false : '');
    });
    
    onAddRow(values);
    setFormValues({});
    setSubmitted(true);
    
    setTimeout(() => setSubmitted(false), 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const renderField = (field: StoreDatabase['fields'][0]) => {
    const value = formValues[field.id] ?? (field.type === 'checkbox' ? false : '');

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>{field.name}</Label>
            {field.name.length > 50 ? (
              <Textarea
                id={field.id}
                value={value}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                placeholder={`Digite ${field.name.toLowerCase()}`}
                className="min-h-[100px]"
              />
            ) : (
              <Input
                id={field.id}
                type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'url' ? 'url' : 'text'}
                value={value}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                placeholder={`Digite ${field.name.toLowerCase()}`}
              />
            )}
          </div>
        );

      case 'number':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>{field.name}</Label>
            <Input
              id={field.id}
              type="number"
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={`Digite ${field.name.toLowerCase()}`}
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>{field.name}</Label>
            <Select value={value} onValueChange={(val) => handleFieldChange(field.id, val)}>
              <SelectTrigger id={field.id}>
                <SelectValue placeholder={`Selecione ${field.name.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map(option => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>{field.name}</Label>
            <Input
              id={field.id}
              type="datetime-local"
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
            />
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={value}
              onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
            />
            <Label htmlFor={field.id} className="cursor-pointer">
              {field.name}
            </Label>
          </div>
        );

      default:
        return null;
    }
  };

  if (!formSettings.enabled) {
    return (
      <div className="p-8 text-center">
        <Send className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground mb-4">O formulário está desabilitado</p>
        <Button onClick={() => setShowSettings(true)}>
          <Settings className="h-4 w-4 mr-2" />
          Configurar Formulário
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-muted/30 rounded-lg p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Send className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Formulário Público</h3>
            <p className="text-xs text-muted-foreground">Compartilhe para coletar respostas</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(publicUrl)}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copiar Link
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(publicUrl, '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          {!isLocked && (
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configurações do Formulário</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Formulário Ativo</Label>
                      <p className="text-xs text-muted-foreground">Permitir envio de respostas</p>
                    </div>
                    <Switch
                      checked={formSettings.enabled}
                      onCheckedChange={(checked) => 
                        onUpdate({ formSettings: { ...formSettings, enabled: checked } })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mensagem de Sucesso</Label>
                    <Textarea
                      value={formSettings.successMessage}
                      onChange={(e) => 
                        onUpdate({ formSettings: { ...formSettings, successMessage: e.target.value } })
                      }
                      placeholder="Mensagem exibida após o envio"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Múltiplas Respostas</Label>
                      <p className="text-xs text-muted-foreground">Permitir várias respostas da mesma pessoa</p>
                    </div>
                    <Switch
                      checked={formSettings.allowMultiple}
                      onCheckedChange={(checked) => 
                        onUpdate({ formSettings: { ...formSettings, allowMultiple: checked } })
                      }
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {submitted ? (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-8 text-center">
          <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-600 dark:text-green-400" />
          <h3 className="text-lg font-semibold mb-2 text-green-900 dark:text-green-100">
            {formSettings.successMessage}
          </h3>
          {formSettings.allowMultiple && (
            <Button
              variant="outline"
              onClick={() => setSubmitted(false)}
              className="mt-4"
            >
              Enviar outra resposta
            </Button>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-background border border-border rounded-lg p-6 space-y-4">
            <div className="mb-4">
              <h2 className="text-2xl font-bold">{database.title}</h2>
              {database.description && (
                <p className="text-sm text-muted-foreground mt-2">{database.description}</p>
              )}
            </div>

            {database.fields.map(field => renderField(field))}
          </div>

          <Button type="submit" className="w-full" size="lg">
            <Send className="h-4 w-4 mr-2" />
            Enviar Resposta
          </Button>
        </form>
      )}

      <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
        <p className="text-xs text-muted-foreground">
          💡 As respostas enviadas serão adicionadas automaticamente como novas linhas no database
        </p>
      </div>
    </div>
  );
};
