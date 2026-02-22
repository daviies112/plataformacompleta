import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { photoService } from '../services/photoService';
import { getSupabaseClient } from '../../../lib/supabase';
import { Loader2, Upload, WandSparkles, Camera } from 'lucide-react';

export default function MelhorarFotos() {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            const objectUrl = URL.createObjectURL(selectedFile);
            setPreview(objectUrl);
        }
    };

    const handleSubmit = async () => {
        if (!file) return;

        setLoading(true);
        try {
            const supabase = await getSupabaseClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                alert('Você precisa estar logado para usar este serviço.');
                return;
            }

            // 1. Upload Image
            const imageUrl = await photoService.uploadImage(file, 'fotos_servico_gratis', user.id);

            // 2. Create Request
            const request = await photoService.createFreeRequest(user.id, imageUrl, description);

            // 3. Navigate to Result
            navigate(`/fotos/melhorar/resultado/${request.id}`);

        } catch (error: any) {
            console.error('Erro ao enviar:', error);
            alert('Erro ao enviar imagem: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto max-w-2xl py-8 px-4">
            <div className="mb-4 flex justify-end">
                <Button
                    variant="ghost"
                    className="gap-2 text-muted-foreground hover:text-primary"
                    onClick={() => navigate('/fotos/9pack')}
                >
                    <Camera className="h-4 w-4" />
                    Pack 9 Fotos
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <WandSparkles className="h-6 w-6 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Melhorar Foto com IA</CardTitle>
                    <CardDescription>
                        Faça upload de uma foto do seu produto e nossa IA irá melhorar a qualidade, iluminação e remover o fundo automaticamente.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    <div className="space-y-2">
                        <Label htmlFor="image-upload">Foto do Produto</Label>
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <div
                                className={`
                  border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors
                  ${preview ? 'border-primary/50 bg-primary/5' : 'border-gray-300 hover:bg-gray-50'}
                `}
                                onClick={() => document.getElementById('image-upload')?.click()}
                            >
                                {preview ? (
                                    <div className="relative w-full aspect-square max-h-64 flex items-center justify-center">
                                        <img src={preview} alt="Preview" className="max-h-64 object-contain rounded-md" />
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="absolute bottom-2 right-2"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFile(null);
                                                setPreview(null);
                                            }}
                                        >
                                            Trocar
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="h-10 w-10 text-gray-400 mb-2" />
                                        <p className="text-sm font-medium text-gray-600">Clique para selecionar</p>
                                        <p className="text-xs text-gray-400">JPG, PNG ou WEBP</p>
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
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descrição do Produto (Opcional)</Label>
                        <Textarea
                            id="description"
                            placeholder="Ex: Brinco de argola dourado com pedras de zircônia..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                </CardContent>
                <CardFooter>
                    <Button
                        className="w-full"
                        size="lg"
                        onClick={handleSubmit}
                        disabled={!file || loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Enviando e Processando...
                            </>
                        ) : (
                            <>
                                <WandSparkles className="mr-2 h-4 w-4" />
                                Melhorar Foto Agora
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
