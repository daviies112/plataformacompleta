import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/revendedora/components/ui/card';
import { Label } from '@/features/revendedora/components/ui/label';
import { Input } from '@/features/revendedora/components/ui/input';
import { Button } from '@/features/revendedora/components/ui/button';
import { Switch } from '@/features/revendedora/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/revendedora/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/revendedora/components/ui/select';
import { Slider } from '@/features/revendedora/components/ui/slider';
import { Separator } from '@/features/revendedora/components/ui/separator';
import { ScrollArea } from '@/features/revendedora/components/ui/scroll-area';
import { StoreSettings } from '@/features/revendedora/types/store';
import { Palette, Type, Layout, Monitor, Smartphone, Video, Image as ImageIcon, Gift, Megaphone } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/features/revendedora/components/ui/accordion';

// Helper for Color Picker (using native input for simplicity if component not available, or assume ColorPicker exists)
// Importing ColorPicker from components if available
// import { ColorPicker } from '../ColorPicker'; // Assuming it's in parent folder

interface StoreDesignTabProps {
    settings: Partial<StoreSettings>;
    onChange: (settings: Partial<StoreSettings>) => void;
}

export function StoreDesignTab({ settings, onChange }: StoreDesignTabProps) {
    const handleChange = (key: keyof StoreSettings, value: any) => {
        onChange({ ...settings, [key]: value });
    };

    const fonts = [
        { name: 'Cormorant Garamond', label: 'Cormorant Garamond (Elegante)' },
        { name: 'DM Sans', label: 'DM Sans (Moderno)' },
        { name: 'Playfair Display', label: 'Playfair Display (Clássico)' },
        { name: 'Inter', label: 'Inter (Neutro)' },
        { name: 'Montserrat', label: 'Montserrat (Geométrico)' },
        { name: 'Lato', label: 'Lato (Legível)' },
        { name: 'Open Sans', label: 'Open Sans (Amigável)' },
    ];

    const ColorInput = ({ label, value, field }: { label: string, value?: string, field: keyof StoreSettings }) => (
        <div className="space-y-2">
            <Label>{label}</Label>
            <div className="flex items-center gap-2">
                <div
                    className="w-10 h-10 rounded-full border shadow-sm cursor-pointer relative overflow-hidden"
                    style={{ backgroundColor: value || '#000000' }}
                >
                    <input
                        type="color"
                        value={value || '#000000'}
                        onChange={(e) => handleChange(field, e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                </div>
                <Input
                    value={value || ''}
                    onChange={(e) => handleChange(field, e.target.value)}
                    className="font-mono"
                    maxLength={7}
                />
            </div>
        </div>
    );

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Design & Personalização</h2>
                    <p className="text-muted-foreground">
                        Personalize a aparência da sua loja para combinar com sua marca
                    </p>
                </div>
            </div>

            <Tabs defaultValue="colors" className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="colors" className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Cores
                    </TabsTrigger>
                    <TabsTrigger value="typography" className="flex items-center gap-2">
                        <Type className="h-4 w-4" />
                        Tipografia
                    </TabsTrigger>
                    <TabsTrigger value="layout" className="flex items-center gap-2">
                        <Layout className="h-4 w-4" />
                        Layout
                    </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 mt-4 h-[calc(100vh-300px)] pr-4">
                    <TabsContent value="colors" className="space-y-6 mt-0">
                        <Card>
                            <CardHeader>
                                <CardTitle>Identidade Visual</CardTitle>
                                <CardDescription>Cores principais da sua loja</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <ColorInput label="Cor Primária" value={settings.color_primary} field="color_primary" />
                                    <ColorInput label="Cor Primária (Clara)" value={settings.color_primary_light} field="color_primary_light" />
                                    <ColorInput label="Cor de Fundo" value={settings.color_background} field="color_background" />
                                    <ColorInput label="Cor da Superfície (Cards)" value={settings.color_surface} field="color_surface" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Cores do Texto</CardTitle>
                                <CardDescription>Legibilidade e contraste</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <ColorInput label="Texto Principal" value={settings.color_text_primary} field="color_text_primary" />
                                    <ColorInput label="Texto Secundário" value={settings.color_text_secondary} field="color_text_secondary" />
                                    <ColorInput label="Texto Terciário" value={settings.color_text_tertiary} field="color_text_tertiary" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Header & Footer</CardTitle>
                                <CardDescription>Cores do cabeçalho e rodapé</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <ColorInput label="Fundo do Header" value={settings.header_background} field="header_background" />
                                    <ColorInput label="Texto do Header" value={settings.header_text_color} field="header_text_color" />
                                    <ColorInput label="Fundo do Footer" value={settings.footer_background} field="footer_background" />
                                    <ColorInput label="Texto do Footer" value={settings.footer_text_color} field="footer_text_color" />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="typography" className="space-y-6 mt-0">
                        <Card>
                            <CardHeader>
                                <CardTitle>Fontes</CardTitle>
                                <CardDescription>Escolha as fontes para títulos e texto corrido</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label>Fonte de Títulos</Label>
                                    <Select
                                        value={settings.font_heading}
                                        onValueChange={(v) => handleChange('font_heading', v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione uma fonte" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {fonts.map(font => (
                                                <SelectItem key={font.name} value={font.name} style={{ fontFamily: font.name }}>
                                                    {font.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Fonte de Corpo</Label>
                                    <Select
                                        value={settings.font_body}
                                        onValueChange={(v) => handleChange('font_body', v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione uma fonte" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {fonts.map(font => (
                                                <SelectItem key={font.name} value={font.name} style={{ fontFamily: font.name }}>
                                                    {font.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="layout" className="space-y-6 mt-0">
                        <Card>
                            <CardHeader>
                                <CardTitle>Estrutura da Home</CardTitle>
                                <CardDescription>Quais seções exibir na página inicial</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="space-y-0.5">
                                        <Label className="flex items-center gap-2">
                                            <ImageIcon className="h-4 w-4" /> Banners Principais
                                        </Label>
                                        <p className="text-sm text-muted-foreground">Carousel de imagens no topo</p>
                                    </div>
                                    <Switch
                                        checked={settings.show_banner}
                                        onCheckedChange={(v) => handleChange('show_banner', v)}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="space-y-0.5">
                                        <Label className="flex items-center gap-2">
                                            <Gift className="h-4 w-4" /> Barra de Benefícios
                                        </Label>
                                        <p className="text-sm text-muted-foreground">Ícones com vantagens (frete, parcelamento)</p>
                                    </div>
                                    <Switch
                                        checked={settings.show_benefits_bar}
                                        onCheckedChange={(v) => handleChange('show_benefits_bar', v)}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="space-y-0.5">
                                        <Label className="flex items-center gap-2">
                                            <Layout className="h-4 w-4" /> Categorias
                                        </Label>
                                        <p className="text-sm text-muted-foreground">Navegação por categorias</p>
                                    </div>
                                    <Switch
                                        checked={settings.show_categories}
                                        onCheckedChange={(v) => handleChange('show_categories', v)}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="space-y-0.5">
                                        <Label className="flex items-center gap-2">
                                            <Megaphone className="h-4 w-4" /> Campanhas Ativas
                                        </Label>
                                        <p className="text-sm text-muted-foreground">Banner de promoções sazonais</p>
                                    </div>
                                    <Switch
                                        checked={settings.show_active_campaign}
                                        onCheckedChange={(v) => handleChange('show_active_campaign', v)}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="space-y-0.5">
                                        <Label className="flex items-center gap-2">
                                            <Video className="h-4 w-4" /> Seção de Vídeo
                                        </Label>
                                        <p className="text-sm text-muted-foreground">Vídeo institucional ou promocional</p>
                                    </div>
                                    <Switch
                                        checked={settings.show_video_section}
                                        onCheckedChange={(v) => handleChange('show_video_section', v)}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Elementos da Interface</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>Barra de Pesquisa</Label>
                                    <Switch
                                        checked={settings.show_search_bar}
                                        onCheckedChange={(v) => handleChange('show_search_bar', v)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>Carrinho de Compras</Label>
                                    <Switch
                                        checked={settings.show_cart}
                                        onCheckedChange={(v) => handleChange('show_cart', v)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>Barra de Aviso (Topo)</Label>
                                    <Switch
                                        checked={settings.show_announcement_bar}
                                        onCheckedChange={(v) => handleChange('show_announcement_bar', v)}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </ScrollArea>
            </Tabs>
        </div>
    );
}
