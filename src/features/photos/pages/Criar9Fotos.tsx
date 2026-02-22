import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { photoService } from '../services/photoService';
import { getSupabaseClient } from '../../../lib/supabase';
import { Loader2, Upload, Camera, Check, AlertCircle, WandSparkles } from 'lucide-react';
import { Alert, AlertDescription } from '../../../components/ui/alert';

const TEMPLATES = [
    { id: 1, name: "Fundo Branco E-commerce", icon: "🛒", desc: "Essencial para marketplaces" },
    { id: 2, name: "Close-up de Detalhes", icon: "🔍", desc: "Mostra textura e acabamento" },
    { id: 3, name: "Fundo Preto Dramático", icon: "⭐", desc: "Luxo e alto contraste" },
    { id: 4, name: "Modelo Usando", icon: "👤", desc: "Lifestyle real" },
    { id: 5, name: "Flat Lay Minimalista", icon: "📐", desc: "Vista superior clean" },
    { id: 6, name: "Mão Segurando", icon: "✋", desc: "Noção de escala/tamanho" },
    { id: 7, name: "Conjunto Harmonizado", icon: "💎", desc: "Composição com outras peças" },
    { id: 8, name: "Reflexo Espelhado", icon: "🪞", desc: "Superfície reflexiva elegante" },
    { id: 9, name: "Contexto de Uso", icon: "🎭", desc: "Ambiente social/jantar" },
    { id: 10, name: "Embalagem Gift", icon: "🎁", desc: "Opção de presente" },
    { id: 11, name: "Detalhes do Fecho", icon: "🔗", desc: "Foco na técnica/segurança" },
    { id: 12, name: "Luz Natural", icon: "☀️", desc: "Golden hour, quente" },
    { id: 13, name: "Modelo em Close", icon: "📸", desc: "Foco total na peça usada" },
    { id: 14, name: "Composição Artística", icon: "🎨", desc: "Elementos decorativos" },
    { id: 15, name: "Comparação de Tamanho", icon: "📏", desc: "Com objeto de referência" }
];

export default function Criar9Fotos() {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [selectedTemplates, setSelectedTemplates] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            const objectUrl = URL.createObjectURL(selectedFile);
            setPreview(objectUrl);
        }
    };

    const toggleTemplate = (id: number) => {
        setSelectedTemplates(prev => {
            if (prev.includes(id)) {
                return prev.filter(t => t !== id);
            } else {
                if (prev.length >= 9) {
                    return prev; // Max 9 selected
                }
                return [...prev, id];
            }
        });
    };

    const handleSubmit = async () => {
        if (!file || !category || selectedTemplates.length !== 9) return;

        setLoading(true);
        try {
            const supabase = await getSupabaseClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                alert('Você precisa estar logado para usar este serviço.');
                return;
            }

            // 1. Upload Image
            const imageUrl = await photoService.uploadImage(file, 'fotos_servico_9pack', user.id);

            // 2. Create Request (Paid service, creates as pending payment essentially)
            const request = await photoService.create9PhotosRequest(
                user.id,
                imageUrl,
                description,
                category,
                selectedTemplates,
                false // Not free
            );

            // 3. Navigate to Result
            navigate(`/fotos/9pack/resultado/${request.id}`);

        } catch (error: any) {
            console.error('Erro ao enviar:', error);
            alert('Erro ao enviar pedido: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto max-w-5xl py-8 px-4">
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold text-gray-900">Pack de 9 Fotos Profissionais</h1>
                    <p className="text-gray-500">Transforme uma única foto amadora em 9 fotos de estúdio profissional com IA.</p>
                </div>
                <Button
                    variant="outline"
                    className="gap-2 border-primary/20 text-primary hover:bg-primary/10"
                    onClick={() => navigate('/fotos/melhorar')}
                >
                    <WandSparkles className="h-4 w-4" />
                    Melhorar Foto
                </Button>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">

                {/* Left Column: Input Form */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>1. Suas Informações</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">

                            <div className="space-y-2">
                                <Label>Foto Original</Label>
                                <div
                                    className={`
                    border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-colors h-40
                    ${preview ? 'border-primary/50 bg-primary/5' : 'border-gray-300 hover:bg-gray-50'}
                  `}
                                    onClick={() => document.getElementById('image-upload')?.click()}
                                >
                                    {preview ? (
                                        <img src={preview} alt="Preview" className="h-full object-contain rounded-md" />
                                    ) : (
                                        <>
                                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                            <p className="text-xs text-center text-gray-500">Clique para enviar foto</p>
                                        </>
                                    )}
                                    <Input
                                        id="image-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Categoria</Label>
                                <Select onValueChange={setCategory} value={category}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="brinco">Brinco</SelectItem>
                                        <SelectItem value="colar">Colar</SelectItem>
                                        <SelectItem value="pulseira">Pulseira</SelectItem>
                                        <SelectItem value="anel">Anel</SelectItem>
                                        <SelectItem value="conjunto">Conjunto</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Descrição (Opcional)</Label>
                                <Textarea
                                    placeholder="Ex: Dourado, pedras verdes..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="h-20"
                                />
                            </div>

                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm font-medium text-gray-500">Total a pagar:</span>
                                <span className="text-2xl font-bold text-primary">R$ 12,50</span>
                            </div>

                            {selectedTemplates.length !== 9 && (
                                <Alert variant="destructive" className="mb-4 py-2">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        Selecione exatamente 9 templates ({selectedTemplates.length}/9)
                                    </AlertDescription>
                                </Alert>
                            )}

                            <Button
                                className="w-full"
                                size="lg"
                                onClick={handleSubmit}
                                disabled={!file || !category || selectedTemplates.length !== 9 || loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Processando...
                                    </>
                                ) : (
                                    <>
                                        <Camera className="mr-2 h-4 w-4" />
                                        Gerar Fotos
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Template Selection */}
                <div className="lg:col-span-2">
                    <Card className="h-full">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>2. Escolha 9 Estilos</CardTitle>
                                <span className={`text-sm font-bold ${selectedTemplates.length === 9 ? 'text-green-600' : 'text-primary'}`}>
                                    {selectedTemplates.length} de 9 selecionados
                                </span>
                            </div>
                            <CardDescription>
                                Selecione os 9 estilos de fotos que você deseja gerar para este produto.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {TEMPLATES.map((template) => {
                                    const isSelected = selectedTemplates.includes(template.id);
                                    return (
                                        <div
                                            key={template.id}
                                            className={`
                        relative border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md
                        ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-gray-200 hover:border-gray-300'}
                      `}
                                            onClick={() => toggleTemplate(template.id)}
                                        >
                                            {isSelected && (
                                                <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-0.5">
                                                    <Check className="h-3 w-3" />
                                                </div>
                                            )}

                                            <div className="text-2xl mb-2">{template.icon}</div>
                                            <h3 className={`font-semibold text-sm mb-1 ${isSelected ? 'text-primary' : 'text-gray-900'}`}>
                                                {template.name}
                                            </h3>
                                            <p className="text-xs text-gray-500 leading-tight">
                                                {template.desc}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}
