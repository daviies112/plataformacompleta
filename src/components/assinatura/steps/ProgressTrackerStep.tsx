import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Check } from 'lucide-react';

interface ProgressTrackerStepProps {
  progressTitle: string;
  onProgressTitleChange: (value: string) => void;
  progressSubtitle: string;
  onProgressSubtitleChange: (value: string) => void;
  progressStep1Title: string;
  onProgressStep1TitleChange: (value: string) => void;
  progressStep1Description: string;
  onProgressStep1DescriptionChange: (value: string) => void;
  progressStep2Title: string;
  onProgressStep2TitleChange: (value: string) => void;
  progressStep2Description: string;
  onProgressStep2DescriptionChange: (value: string) => void;
  progressStep3Title: string;
  onProgressStep3TitleChange: (value: string) => void;
  progressStep3Description: string;
  onProgressStep3DescriptionChange: (value: string) => void;
  progressButtonText: string;
  onProgressButtonTextChange: (value: string) => void;
  progressCardColor: string;
  onProgressCardColorChange: (value: string) => void;
  progressButtonColor: string;
  onProgressButtonColorChange: (value: string) => void;
  progressTextColor: string;
  onProgressTextColorChange: (value: string) => void;
  progressFontFamily: string;
  onProgressFontFamilyChange: (value: string) => void;
  progressFontSize: string;
  onProgressFontSizeChange: (value: string) => void;
}

export const ProgressTrackerStep = ({
  progressTitle,
  onProgressTitleChange,
  progressSubtitle,
  onProgressSubtitleChange,
  progressStep1Title,
  onProgressStep1TitleChange,
  progressStep1Description,
  onProgressStep1DescriptionChange,
  progressStep2Title,
  onProgressStep2TitleChange,
  progressStep2Description,
  onProgressStep2DescriptionChange,
  progressStep3Title,
  onProgressStep3TitleChange,
  progressStep3Description,
  onProgressStep3DescriptionChange,
  progressButtonText,
  onProgressButtonTextChange,
  progressCardColor,
  onProgressCardColorChange,
  progressButtonColor,
  onProgressButtonColorChange,
  progressTextColor,
  onProgressTextColorChange,
  progressFontFamily,
  onProgressFontFamilyChange,
  progressFontSize,
  onProgressFontSizeChange,
}: ProgressTrackerStepProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Título e Descrição</CardTitle>
            <CardDescription>Personalize o texto principal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="progressTitle">Título Principal</Label>
              <Input
                id="progressTitle"
                value={progressTitle}
                onChange={(e) => onProgressTitleChange(e.target.value)}
                placeholder="Ex: Assinatura Digital"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="progressSubtitle">Subtítulo/Descrição</Label>
              <Textarea
                id="progressSubtitle"
                value={progressSubtitle}
                onChange={(e) => onProgressSubtitleChange(e.target.value)}
                placeholder="Ex: Conclua os passos abaixo..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Passo 1: Reconhecimento Facial</CardTitle>
            <CardDescription>Customize o texto do primeiro passo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="progressStep1Title">Título do Passo 1</Label>
              <Input
                id="progressStep1Title"
                value={progressStep1Title}
                onChange={(e) => onProgressStep1TitleChange(e.target.value)}
                placeholder="Ex: 1. Reconhecimento Facial"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="progressStep1Description">Descrição do Passo 1</Label>
              <Textarea
                id="progressStep1Description"
                value={progressStep1Description}
                onChange={(e) => onProgressStep1DescriptionChange(e.target.value)}
                placeholder="Ex: Tire uma selfie para validar sua identidade..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Passo 2: Assinatura do Contrato</CardTitle>
            <CardDescription>Customize o texto do segundo passo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="progressStep2Title">Título do Passo 2</Label>
              <Input
                id="progressStep2Title"
                value={progressStep2Title}
                onChange={(e) => onProgressStep2TitleChange(e.target.value)}
                placeholder="Ex: 2. Assinar Contrato"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="progressStep2Description">Descrição do Passo 2</Label>
              <Textarea
                id="progressStep2Description"
                value={progressStep2Description}
                onChange={(e) => onProgressStep2DescriptionChange(e.target.value)}
                placeholder="Ex: Assine digitalmente o contrato..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Passo 3: Baixar Aplicativo</CardTitle>
            <CardDescription>Customize o texto do terceiro passo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="progressStep3Title">Título do Passo 3</Label>
              <Input
                id="progressStep3Title"
                value={progressStep3Title}
                onChange={(e) => onProgressStep3TitleChange(e.target.value)}
                placeholder="Ex: 3. Baixar Aplicativo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="progressStep3Description">Descrição do Passo 3</Label>
              <Textarea
                id="progressStep3Description"
                value={progressStep3Description}
                onChange={(e) => onProgressStep3DescriptionChange(e.target.value)}
                placeholder="Ex: Baixe o app oficial..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Botão e Fontes</CardTitle>
            <CardDescription>Customize o texto do botão e tipografia</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="progressButtonText">Texto do Botão</Label>
              <Input
                id="progressButtonText"
                value={progressButtonText}
                onChange={(e) => onProgressButtonTextChange(e.target.value)}
                placeholder="Ex: Complete os passos acima"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="progressFontFamily">Família de Fonte</Label>
              <select
                id="progressFontFamily"
                value={progressFontFamily}
                onChange={(e) => onProgressFontFamilyChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="Arial, sans-serif">Arial</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="'Courier New', monospace">Courier New</option>
                <option value="'Times New Roman', serif">Times New Roman</option>
                <option value="Verdana, sans-serif">Verdana</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="progressFontSize">Tamanho da Fonte</Label>
              <Input
                id="progressFontSize"
                value={progressFontSize}
                onChange={(e) => onProgressFontSizeChange(e.target.value)}
                placeholder="Ex: 16px"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cores Personalizadas</CardTitle>
            <CardDescription>Escolha as cores do rastreador</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="progressCardColor">Cor do Card/Fundo</Label>
              <div className="flex gap-2">
                <Input
                  id="progressCardColor"
                  type="color"
                  value={progressCardColor}
                  onChange={(e) => onProgressCardColorChange(e.target.value)}
                  className="h-10 w-20"
                />
                <Input
                  value={progressCardColor}
                  onChange={(e) => onProgressCardColorChange(e.target.value)}
                  placeholder="#dbeafe"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="progressButtonColor">Cor do Botão/Indicadores</Label>
              <div className="flex gap-2">
                <Input
                  id="progressButtonColor"
                  type="color"
                  value={progressButtonColor}
                  onChange={(e) => onProgressButtonColorChange(e.target.value)}
                  className="h-10 w-20"
                />
                <Input
                  value={progressButtonColor}
                  onChange={(e) => onProgressButtonColorChange(e.target.value)}
                  placeholder="#22c55e"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="progressTextColor">Cor do Texto</Label>
              <div className="flex gap-2">
                <Input
                  id="progressTextColor"
                  type="color"
                  value={progressTextColor}
                  onChange={(e) => onProgressTextColorChange(e.target.value)}
                  className="h-10 w-20"
                />
                <Input
                  value={progressTextColor}
                  onChange={(e) => onProgressTextColorChange(e.target.value)}
                  placeholder="#1e40af"
                  className="flex-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="sticky top-6 h-fit">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview para Cliente</CardTitle>
            <CardDescription>Visualização em tempo real</CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              style={{ 
                backgroundColor: progressCardColor,
                fontFamily: progressFontFamily,
                padding: '24px',
                borderRadius: '8px',
                gap: '16px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <h2 
                style={{ 
                  color: progressTextColor,
                  fontSize: '20px',
                  fontWeight: 'bold',
                  margin: '0 0 1rem 0',
                  padding: 0
                }}
              >
                {progressTitle}
              </h2>
              <p 
                style={{ 
                  color: progressTextColor,
                  fontSize: progressFontSize,
                  margin: 0,
                  padding: 0
                }}
              >
                {progressSubtitle}
              </p>

              <div style={{ gap: '12px', display: 'flex', flexDirection: 'column' }}>
                {[
                  { num: 1, title: progressStep1Title, desc: progressStep1Description },
                  { num: 2, title: progressStep2Title, desc: progressStep2Description },
                  { num: 3, title: progressStep3Title, desc: progressStep3Description },
                ].map((step) => (
                  <div 
                    key={step.num}
                    style={{ 
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '16px',
                      padding: '16px',
                      borderRadius: '8px',
                      borderColor: progressButtonColor,
                      borderWidth: '2px',
                      borderStyle: 'solid',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    <div className="flex-shrink-0 mt-1">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: progressButtonColor }}
                      >
                        {step.num}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p 
                        style={{ 
                          color: progressTextColor,
                          fontSize: progressFontSize,
                          fontWeight: 'bold',
                          margin: '0 0 0.25rem 0',
                          padding: 0
                        }}
                      >
                        {step.title}
                      </p>
                      <p 
                        style={{ 
                          color: progressTextColor,
                          fontSize: `calc(${progressFontSize} - 2px)`,
                          opacity: 0.9,
                          margin: '0.25rem 0 0 0',
                          padding: 0
                        }}
                      >
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                style={{ 
                  backgroundColor: progressButtonColor,
                  fontFamily: progressFontFamily,
                  fontSize: progressFontSize,
                  width: '100%',
                  padding: '12px 0',
                  color: 'white',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  border: 'none',
                  opacity: 0.7,
                  cursor: 'default'
                }}
                disabled
              >
                {progressButtonText}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
