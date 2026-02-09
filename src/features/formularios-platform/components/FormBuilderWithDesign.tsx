import { useState } from "react";
import { FormElement, DesignConfig, FormTemplate, ScoreTier, CompletionPageConfig, extractQuestions } from "../types/form";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Plus, Palette, Layout, Eye, Target, Trash2, Save } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { DesignCustomizer } from "./design/DesignCustomizer";
import { TemplateSelector } from "./design/TemplateSelector";
import { DragDropEditor } from "./design/DragDropEditor";
import { ElementToolbar } from "./ElementToolbar";
import { api } from "../lib/api";
import { useToast } from "../hooks/use-toast";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";

interface FormBuilderWithDesignProps {
  title: string;
  description: string;
  elements: FormElement[];
  passingScore: number;
  scoreTiers?: ScoreTier[];
  designConfig: DesignConfig;
  completionPageConfig?: CompletionPageConfig;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onElementsChange: (elements: FormElement[]) => void;
  onPassingScoreChange: (score: number) => void;
  onScoreTiersChange?: (tiers: ScoreTier[]) => void;
  onDesignChange: (design: DesignConfig) => void;
  onCompletionPageChange?: (config: CompletionPageConfig) => void;
  onSave?: () => void;
  isSaving?: boolean;
  onSaveAsTemplate?: () => void;
  activePageId?: string | null;
  onActivePageChange?: (pageId: string) => void;
}

export const FormBuilderWithDesign = ({ 
  title,
  description,
  elements,
  passingScore,
  scoreTiers = [],
  designConfig,
  completionPageConfig,
  onTitleChange,
  onDescriptionChange,
  onElementsChange,
  onPassingScoreChange,
  onScoreTiersChange,
  onDesignChange,
  onCompletionPageChange,
  onSave,
  isSaving = false,
  onSaveAsTemplate,
  activePageId,
  onActivePageChange
}: FormBuilderWithDesignProps) => {
  const { toast } = useToast();
  const [useTiers, setUseTiers] = useState(scoreTiers.length > 0);

  const addScoreTier = () => {
    const newTier: ScoreTier = {
      id: Date.now().toString(),
      label: '',
      minScore: 0,
      maxScore: 0,
      description: '',
      qualifies: false
    };
    onScoreTiersChange?.([...scoreTiers, newTier]);
  };

  const updateScoreTier = (id: string, updates: Partial<ScoreTier>) => {
    onScoreTiersChange?.(
      scoreTiers.map(tier => tier.id === id ? { ...tier, ...updates } : tier)
    );
  };

  const deleteScoreTier = (id: string) => {
    onScoreTiersChange?.(scoreTiers.filter(tier => tier.id !== id));
  };

  const handleUseTiersChange = (checked: boolean) => {
    setUseTiers(checked);
    if (!checked) {
      onScoreTiersChange?.([]);
    } else if (scoreTiers.length === 0) {
      // Criar tiers padrão
      const defaultTiers: ScoreTier[] = [
        {
          id: '1',
          label: 'Ótimo',
          minScore: 350,
          maxScore: 400,
          description: 'Lead altamente qualificado',
          qualifies: true
        },
        {
          id: '2',
          label: 'Bom',
          minScore: 300,
          maxScore: 349,
          description: 'Lead qualificado',
          qualifies: true
        },
        {
          id: '3',
          label: 'Médio',
          minScore: 250,
          maxScore: 299,
          description: 'Lead com potencial',
          qualifies: true
        },
        {
          id: '4',
          label: 'Não Qualificado',
          minScore: 0,
          maxScore: 249,
          description: 'Não qualifica para reunião',
          qualifies: false
        }
      ];
      onScoreTiersChange?.(defaultTiers);
    }
  };

  const addElement = (newElement: FormElement) => {
    onElementsChange([...elements, newElement]);
  };

  const updateElement = (id: string, updated: FormElement) => {
    onElementsChange(elements.map(el => el.id === id ? updated : el));
  };

  const deleteElement = (id: string) => {
    onElementsChange(elements.filter(el => el.id !== id));
  };

  const handleSelectTemplate = (template: FormTemplate) => {
    onDesignChange(template.designConfig);
    if (template.elements && template.elements.length > 0) {
      onElementsChange(template.elements);
    } else if (template.questions && template.questions.length > 0) {
      // Backward compatibility: convert old questions to elements
      const migratedElements = template.questions.map(q => ({
        type: 'question' as const,
        id: q.id,
        text: q.text,
        questionType: q.type,
        options: q.options,
        points: q.points,
        elementTypeVersion: 1
      }));
      onElementsChange(migratedElements);
    }
    toast({
      title: "Template aplicado!",
      description: `Template "${template.name}" foi aplicado com sucesso`
    });
  };

  const saveAsTemplate = async () => {
    try {
      const templateData: any = {
        name: title,
        description: description,
        designConfig: designConfig,
        elements: elements,
        questions: extractQuestions(elements),
        isDefault: false
      };

      // Adicionar score tiers se estiverem configurados
      if (scoreTiers.length > 0) {
        templateData.scoreTiers = scoreTiers;
      }

      await api.createTemplate(templateData);

      toast({
        title: "Sucesso!",
        description: "Template salvo com sucesso"
      });
      
      if (onSaveAsTemplate) {
        onSaveAsTemplate();
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o template",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-8 bg-gradient-to-br from-card to-card/80 border-border shadow-[var(--shadow-luxury)]">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Título do Formulário
            </label>
            <Input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="text-lg font-semibold bg-background border-border"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Descrição
            </label>
            <Textarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className="bg-background border-border resize-none"
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="use-tiers" className="text-sm font-medium">
                  Sistema de Qualificação de Leads
                </Label>
                <p className="text-xs text-muted-foreground">
                  Configure múltiplos níveis de pontuação para qualificar leads
                </p>
              </div>
              <Switch
                id="use-tiers"
                checked={useTiers}
                onCheckedChange={handleUseTiersChange}
              />
            </div>

            {!useTiers ? (
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Pontuação Mínima para Aprovação
                </label>
                <Input
                  type="number"
                  value={passingScore}
                  onChange={(e) => onPassingScoreChange(parseInt(e.target.value) || 0)}
                  className="w-32 bg-background border-border"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">Níveis de Qualificação</h3>
                  <Button onClick={addScoreTier} size="sm" variant="outline" className="gap-2">
                    <Plus className="h-3 w-3" />
                    Adicionar Nível
                  </Button>
                </div>

                <div className="space-y-3">
                  {scoreTiers.map((tier) => (
                    <Card key={tier.id} className="p-4 bg-background border-border">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <Input
                            placeholder="Nome do nível (ex: Ótimo)"
                            value={tier.label}
                            onChange={(e) => updateScoreTier(tier.id, { label: e.target.value })}
                            className="flex-1 bg-background border-border"
                          />
                          <Button
                            onClick={() => deleteScoreTier(tier.id)}
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                              Pontuação Mínima
                            </label>
                            <Input
                              type="number"
                              value={tier.minScore}
                              onChange={(e) => updateScoreTier(tier.id, { minScore: parseInt(e.target.value) || 0 })}
                              className="bg-background border-border"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                              Pontuação Máxima
                            </label>
                            <Input
                              type="number"
                              value={tier.maxScore}
                              onChange={(e) => updateScoreTier(tier.id, { maxScore: parseInt(e.target.value) || 0 })}
                              className="bg-background border-border"
                            />
                          </div>
                        </div>

                        <Input
                          placeholder="Descrição (ex: Lead altamente qualificado)"
                          value={tier.description}
                          onChange={(e) => updateScoreTier(tier.id, { description: e.target.value })}
                          className="bg-background border-border"
                        />

                        <div className="flex items-center gap-2">
                          <Switch
                            id={`qualifies-${tier.id}`}
                            checked={tier.qualifies}
                            onCheckedChange={(checked) => updateScoreTier(tier.id, { qualifies: checked })}
                          />
                          <Label htmlFor={`qualifies-${tier.id}`} className="text-sm">
                            Qualifica para reunião
                          </Label>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Tabs defaultValue="questions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="questions" className="gap-2">
            <Layout className="h-4 w-4" />
            Perguntas
          </TabsTrigger>
          <TabsTrigger value="design" className="gap-2">
            <Palette className="h-4 w-4" />
            Design
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <Eye className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-4 mt-6">
          <DragDropEditor
            elements={elements}
            onReorder={onElementsChange}
            onUpdate={updateElement}
            onDelete={deleteElement}
            activePageId={activePageId}
            onActivePageChange={onActivePageChange}
          />
          
          <div className="flex justify-center">
            <ElementToolbar onAddElement={addElement} />
          </div>
        </TabsContent>

        <TabsContent value="design" className="mt-6">
          <DesignCustomizer
            design={designConfig}
            onChange={onDesignChange}
          />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <TemplateSelector onSelectTemplate={handleSelectTemplate} />
        </TabsContent>
      </Tabs>

      <div className="flex gap-3">
        {onSave && (
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="gap-2 bg-gradient-to-r from-primary to-primary-glow hover:shadow-glow"
            size="lg"
          >
            <Save className="h-5 w-5" />
            {isSaving ? "Salvando..." : "Salvar Formulário"}
          </Button>
        )}
        <Button
          onClick={saveAsTemplate}
          variant="outline"
          className="gap-2"
        >
          Salvar como Template
        </Button>
      </div>
    </div>
  );
};
