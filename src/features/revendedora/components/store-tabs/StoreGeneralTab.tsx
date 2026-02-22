import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/revendedora/components/ui/card';
import { Label } from '@/features/revendedora/components/ui/label';
import { Input } from '@/features/revendedora/components/ui/input';
import { Textarea } from '@/features/revendedora/components/ui/textarea';
import { StoreSettings } from '@/features/revendedora/types/store';
import { Store as StoreIcon, Phone, Instagram, Facebook } from 'lucide-react';

interface StoreGeneralTabProps {
    settings: Partial<StoreSettings>;
    onChange: (settings: Partial<StoreSettings>) => void;
}

export function StoreGeneralTab({ settings, onChange }: StoreGeneralTabProps) {
    const handleChange = (key: keyof StoreSettings, value: any) => {
        onChange({ ...settings, [key]: value });
    };

    const generateSlugFromName = (name: string) => {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    };

    const handleNameChange = (name: string) => {
        const updates: Partial<StoreSettings> = { store_name: name };
        // Auto-generate slug if it's empty or matches the old name's slug
        // For simplicity, we only auto-generate if slug is empty or we decide to logic it.
        // Keeping it simple: just update name. User updates slug manually or we can add a button.
        onChange({ ...settings, store_name: name });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Informações Gerais</h2>
                    <p className="text-muted-foreground">
                        Configure as informações básicas da sua loja
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <StoreIcon className="h-5 w-5" />
                        Dados da Loja
                    </CardTitle>
                    <CardDescription>
                        Identificação e descrição da sua loja virtual
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="store-name">Nome da Loja</Label>
                        <Input
                            id="store-name"
                            placeholder="Ex: Minha Boutique"
                            value={settings.store_name || ''}
                            onChange={(e) => handleNameChange(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="store-slug">URL da Loja</Label>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-l-md border border-r-0">
                                /loja/
                            </span>
                            <Input
                                id="store-slug"
                                placeholder="minha-boutique"
                                value={settings.store_slug || ''}
                                onChange={(e) => handleChange('store_slug', generateSlugFromName(e.target.value))}
                                className="rounded-l-none"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Endereço único da sua loja na internet
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="store-tagline">Slogan (Tagline)</Label>
                        <Input
                            id="store-tagline"
                            placeholder="Ex: Elegância em cada detalhe"
                            value={settings.store_tagline || ''}
                            onChange={(e) => handleChange('store_tagline', e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="store-description">Descrição (SEO)</Label>
                        <Textarea
                            id="store-description"
                            placeholder="Uma breve descrição da sua loja para aparecer no Google..."
                            value={settings.store_description || ''}
                            onChange={(e) => handleChange('store_description', e.target.value)}
                            rows={3}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Contato & Redes Sociais</CardTitle>
                    <CardDescription>
                        Como seus clientes podem entrar em contato com você
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="whatsapp" className="flex items-center gap-2">
                            <Phone className="h-4 w-4" /> WhatsApp
                        </Label>
                        <Input
                            id="whatsapp"
                            placeholder="5511999999999"
                            value={settings.whatsapp_number || ''}
                            onChange={(e) => handleChange('whatsapp_number', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Número com DDD, apenas números
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="instagram" className="flex items-center gap-2">
                            <Instagram className="h-4 w-4" /> Instagram URL
                        </Label>
                        <Input
                            id="instagram"
                            placeholder="https://instagram.com/sua_loja"
                            value={settings.instagram_url || ''}
                            onChange={(e) => handleChange('instagram_url', e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="facebook" className="flex items-center gap-2">
                            <Facebook className="h-4 w-4" /> Facebook URL
                        </Label>
                        <Input
                            id="facebook"
                            placeholder="https://facebook.com/sua_loja"
                            value={settings.facebook_url || ''}
                            onChange={(e) => handleChange('facebook_url', e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
