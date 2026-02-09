import { useEffect, useState } from "react";
import { FormTemplate } from "../../types/form";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { api } from "../../lib/api";
import { useToast } from "../../hooks/use-toast";
import { Sparkles } from "lucide-react";

interface TemplateSelectorProps {
  onSelectTemplate: (template: FormTemplate) => void;
}

export const TemplateSelector = ({ onSelectTemplate }: TemplateSelectorProps) => {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await api.getTemplates();
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando templates...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Templates Prontos</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card
            key={template.id}
            className="p-6 cursor-pointer transition-all hover:shadow-lg border-2 hover:border-primary"
            onClick={() => onSelectTemplate(template)}
          >
            <div className="space-y-3">
              <div
                className="h-32 rounded-lg border-2 flex items-center justify-center"
                style={{
                  backgroundColor: template.designConfig.colors.background,
                  borderColor: template.designConfig.colors.primary
                }}
              >
                <div
                  className="text-center space-y-2 p-4"
                  style={{
                    fontFamily: template.designConfig.typography.fontFamily,
                    color: template.designConfig.colors.text
                  }}
                >
                  <div
                    className="font-bold"
                    style={{ color: template.designConfig.colors.primary }}
                  >
                    Preview
                  </div>
                  <div className="text-sm">Template Design</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-foreground">{template.name}</h4>
                {template.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {template.description}
                  </p>
                )}
              </div>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTemplate(template);
                }}
              >
                Usar Template
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
