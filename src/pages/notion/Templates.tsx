import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Templates = () => {
  const templates = [
    {
      id: '1',
      title: 'Kanban Quadro Modelo',
      category: 'Gerenciamento',
      color: 'from-cyan-500 to-blue-500',
    },
    {
      id: '2',
      title: 'Central de Organização da Equipe',
      category: 'Equipe',
      color: 'from-pink-500 to-rose-500',
    },
    {
      id: '3',
      title: 'Sistema de Produtividade Pessoal',
      category: 'Pessoal',
      color: 'from-amber-500 to-orange-500',
    },
  ];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Templates mais populares</h1>
          <p className="text-muted-foreground">
            Comece a produzir mais rapidamente com um template da comunidade do Trello
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              data-testid={`template-card-${template.id}`}
            >
              <CardHeader className={`h-32 bg-gradient-to-br ${template.color} relative`}>
                <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded text-xs font-semibold">
                  TEMPLATE
                </div>
                <CardTitle className="text-white text-lg">{template.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">{template.category}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5" />
            <h2 className="text-2xl font-bold">Jira</h2>
          </div>
          <p className="text-muted-foreground mb-6">
            Comece com um template e deixe que o Jira cuide do resto com fluxos de trabalho personalizáveis
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="h-24 bg-gradient-to-br from-blue-600 to-blue-800">
                <CardTitle className="text-white text-sm">Gerenciamento de projetos</CardTitle>
              </CardHeader>
            </Card>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="h-24 bg-gradient-to-br from-blue-600 to-blue-800">
                <CardTitle className="text-white text-sm">Scrum</CardTitle>
              </CardHeader>
            </Card>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="h-24 bg-gradient-to-br from-blue-600 to-blue-800">
                <CardTitle className="text-white text-sm">Monitoramento de bugs</CardTitle>
              </CardHeader>
            </Card>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="h-24 bg-gradient-to-br from-blue-600 to-blue-800">
                <CardTitle className="text-white text-sm">Processo de web design</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Templates;
