import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/revendedora/components/ui/card';
import { Button } from '@/features/revendedora/components/ui/button';
import { Switch } from '@/features/revendedora/components/ui/switch';
import { Label } from '@/features/revendedora/components/ui/label';
import { Input } from '@/features/revendedora/components/ui/input';
import { StoreSettings } from '@/features/revendedora/types/store';
import { ExternalLink, Copy, CheckCircle, AlertCircle, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface StorePublishTabProps {
    settings: Partial<StoreSettings>;
    onChange: (settings: Partial<StoreSettings>) => void;
    storeUrl: string; // The full public URL
}

export function StorePublishTab({ settings, onChange, storeUrl }: StorePublishTabProps) {
    const isPublished = settings.is_published;

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(storeUrl);
        toast.success('Link copiado para a área de transferência');
    };

    const handleTogglePublish = (checked: boolean) => {
        onChange({ ...settings, is_published: checked });
        if (checked) {
            toast.success('Loja marcada para publicação. Não esqueça de salvar.');
        } else {
            toast.info('Loja marcada como privada. Salve para aplicar.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Publicação</h2>
                    <p className="text-muted-foreground">
                        Gerencie a visibilidade da sua loja online
                    </p>
                </div>
            </div>

            <Card className={isPublished ? "border-green-500/50 bg-green-500/5" : ""}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        Status da Loja
                        {isPublished ? (
                            <span className="text-sm font-normal text-green-600 flex items-center gap-1 bg-green-100 px-2 py-0.5 rounded-full">
                                <CheckCircle className="h-3 w-3" /> Online
                            </span>
                        ) : (
                            <span className="text-sm font-normal text-muted-foreground flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full">
                                <AlertCircle className="h-3 w-3" /> Rascunho
                            </span>
                        )}
                    </CardTitle>
                    <CardDescription>
                        {isPublished
                            ? 'Sua loja está visível para o público.'
                            : 'Sua loja está oculta e acessível apenas para você (modo preview).'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center space-x-4">
                        <Switch
                            id="publish-mode"
                            checked={isPublished}
                            onCheckedChange={handleTogglePublish}
                        />
                        <Label htmlFor="publish-mode" className="flex flex-col space-y-1">
                            <span>Publicar Loja Online</span>
                            <span className="font-normal text-xs text-muted-foreground">
                                Ao ativar, qualquer pessoa com o link poderá acessar sua loja.
                            </span>
                        </Label>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Link de Acesso
                    </CardTitle>
                    <CardDescription>
                        Compartilhe este link com seus clientes
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input value={storeUrl} readOnly className="font-mono bg-muted" />
                        <Button variant="outline" size="icon" onClick={handleCopyUrl} title="Copiar Link">
                            <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" asChild title="Abrir Loja">
                            <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Você pode personalizar o final do link (slug) na aba "Geral".
                    </p>
                </CardContent>
            </Card>

            {/* 
      <Card>
        <CardHeader>
          <CardTitle>SEO & Compartilhamento</CardTitle>
          <CardDescription>Como sua loja aparece nas redes sociais e Google</CardDescription>
        </CardHeader>
        <CardContent>
           Placeholder for future SEO preview 
          <div className="border rounded-lg p-4 bg-muted/20">
            <p className="text-sm text-muted-foreground text-center">
              As configurações de SEO estão disponíveis na aba "Geral".
            </p>
          </div>
        </CardContent>
      </Card>
      */}
        </div>
    );
}
