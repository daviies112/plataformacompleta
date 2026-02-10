import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface BrandingPreviewProps {
  backgroundColor: string;
  sidebarBackground: string;
  sidebarText: string;
  buttonColor: string;
  buttonTextColor: string;
  textColor: string;
  headingColor: string;
  selectedItemColor: string;
  logoUrl?: string;
  logoSize: string;
  logoPosition: string;
}

const getSizeClass = (size: string) => {
  switch (size) {
    case 'small': return 'h-8';
    case 'medium': return 'h-12';
    case 'large': return 'h-16';
    default: return 'h-12';
  }
};

const getPositionClass = (position: string) => {
  switch (position) {
    case 'left': return 'justify-start';
    case 'center': return 'justify-center';
    case 'right': return 'justify-end';
    default: return 'justify-start';
  }
};

export default function BrandingPreview({
  backgroundColor,
  sidebarBackground,
  sidebarText,
  buttonColor,
  buttonTextColor,
  textColor,
  headingColor,
  selectedItemColor,
  logoUrl,
  logoSize,
  logoPosition
}: BrandingPreviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pré-visualização</CardTitle>
        <CardDescription>
          Veja como as cores ficam aplicadas em elementos da interface
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Preview com Sidebar e Conteúdo */}
          <div 
            className="rounded-lg overflow-hidden border"
            style={{ backgroundColor }}
          >
            <div className="flex h-64">
              {/* Sidebar */}
              <div 
                className="w-48 p-4 flex flex-col gap-2"
                style={{ backgroundColor: sidebarBackground }}
              >
                {logoUrl && (
                  <div className={`flex mb-4 ${getPositionClass(logoPosition)}`}>
                    <img 
                      src={logoUrl} 
                      alt="Logo Preview" 
                      className={`object-contain ${getSizeClass(logoSize)}`}
                    />
                  </div>
                )}
                <div 
                  className="text-sm py-2 px-3 rounded"
                  style={{ color: sidebarText }}
                >
                  Menu Item 1
                </div>
                <div 
                  className="text-sm py-2 px-3 rounded"
                  style={{ 
                    backgroundColor: selectedItemColor,
                    color: buttonTextColor
                  }}
                >
                  Item Selecionado
                </div>
                <div 
                  className="text-sm py-2 px-3 rounded"
                  style={{ color: sidebarText }}
                >
                  Menu Item 3
                </div>
              </div>

              {/* Conteúdo Principal */}
              <div className="flex-1 p-6">
                <h2 
                  className="text-2xl font-bold mb-4"
                  style={{ color: headingColor }}
                >
                  Título da Página
                </h2>
                <p 
                  className="mb-4 text-sm"
                  style={{ color: textColor }}
                >
                  Este é um exemplo de texto com a cor personalizada. 
                  Veja como fica na sua plataforma.
                </p>
                <div className="flex gap-2">
                  <Button
                    style={{ 
                      backgroundColor: buttonColor,
                      color: buttonTextColor
                    }}
                    className="hover:opacity-90"
                  >
                    Botão Primário
                  </Button>
                  <Button
                    variant="outline"
                    style={{ 
                      borderColor: buttonColor,
                      color: buttonColor
                    }}
                  >
                    Botão Outline
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Preview apenas dos botões */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2">Botão Primário</p>
              <Button
                className="w-full"
                style={{ 
                  backgroundColor: buttonColor,
                  color: buttonTextColor
                }}
              >
                Exemplo
              </Button>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2">Botão Destrutivo</p>
              <Button
                className="w-full"
                variant="destructive"
              >
                Deletar
              </Button>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2">Botão Outline</p>
              <Button
                className="w-full"
                variant="outline"
                style={{ 
                  borderColor: buttonColor,
                  color: buttonColor
                }}
              >
                Outline
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
