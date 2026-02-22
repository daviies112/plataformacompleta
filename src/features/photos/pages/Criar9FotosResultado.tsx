import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { photoService, NinePhotosRequest } from '../services/photoService';
import { Loader2, ArrowLeft, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert';

export default function Criar9FotosResultado() {
    const { id } = useParams<{ id: string }>();
    const [request, setRequest] = useState<NinePhotosRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        // Initial fetch
        const fetchRequest = async () => {
            try {
                const data = await photoService.get9PhotosRequest(id);
                if (data) {
                    setRequest(data);
                } else {
                    setError('Pedido não encontrado.');
                }
            } catch (err: any) {
                setError('Erro ao carregar pedido: ' + err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchRequest();

        // Real-time subscription
        let subscription: any;
        const subscribe = async () => {
            subscription = await photoService.subscribeToRequest('imagens_9fotos', id, (newPayload) => {
                console.log('Real-time update:', newPayload);
                setRequest(newPayload);
            });
        };

        subscribe();

        return () => {
            if (subscription) subscription.unsubscribe();
        };
    }, [id]);

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-lg text-gray-600">Carregando informações...</span>
            </div>
        );
    }

    if (error || !request) {
        return (
            <div className="container mx-auto max-w-2xl py-8 px-4">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>{error || 'Pedido não encontrado.'}</AlertDescription>
                </Alert>
                <div className="mt-4">
                    <Link to="/fotos/9pack">
                        <Button variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    const isProcessing = request.status === 'pendente' || request.status === 'processando';
    const isCompleted = request.status === 'concluido';
    const isError = request.status === 'erro';

    // Helper to extract photos array
    const photos = [
        { url: request.foto_1_url, desc: request.foto_1_descricao, id: 1 },
        { url: request.foto_2_url, desc: request.foto_2_descricao, id: 2 },
        { url: request.foto_3_url, desc: request.foto_3_descricao, id: 3 },
        { url: request.foto_4_url, desc: request.foto_4_descricao, id: 4 },
        { url: request.foto_5_url, desc: request.foto_5_descricao, id: 5 },
        { url: request.foto_6_url, desc: request.foto_6_descricao, id: 6 },
        { url: request.foto_7_url, desc: request.foto_7_descricao, id: 7 },
        { url: request.foto_8_url, desc: request.foto_8_descricao, id: 8 },
        { url: request.foto_9_url, desc: request.foto_9_descricao, id: 9 },
    ].filter(p => p.url); // Only show generated ones

    return (
        <div className="container mx-auto max-w-6xl py-8 px-4">
            <div className="mb-6 flex justify-between items-center">
                <Link to="/fotos/9pack">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Criar Novo Pack
                    </Button>
                </Link>
                {isCompleted && (
                    <Button variant="outline" size="sm" onClick={() => window.print()}>
                        Imprimir / Salvar PDF
                    </Button>
                )}
            </div>

            {isProcessing && (
                <Card className="border-primary/20 bg-primary/5 max-w-2xl mx-auto">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 bg-white p-3 rounded-full w-fit shadow-sm">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        </div>
                        <CardTitle className="text-2xl">Gerando suas Fotos...</CardTitle>
                        <CardDescription className="text-lg">
                            Isso pode levar alguns minutos. Nossa IA está trabalhando para criar imagens incríveis.
                            <br />Você será notificado assim que terminar.
                        </CardDescription>
                    </CardHeader>
                </Card>
            )}

            {isError && (
                <Alert variant="destructive" className="mb-6 max-w-2xl mx-auto">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Falha no processamento</AlertTitle>
                    <AlertDescription>
                        {request.erro_mensagem || 'Ocorreu um erro ao gerar suas fotos. Verifique seu pagamento ou tente novamente.'}
                    </AlertDescription>
                </Alert>
            )}

            {isCompleted && (
                <div className="space-y-8">
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-lg border border-green-100 max-w-2xl mx-auto justify-center">
                        <CheckCircle2 className="h-6 w-6" />
                        <span className="font-medium text-lg">9 Fotos Geradas com Sucesso!</span>
                    </div>

                    {/* Original Image Reference */}
                    <div className="flex justify-center mb-8">
                        <div className="bg-white p-2 rounded-lg shadow-sm border text-center">
                            <p className="text-xs text-gray-500 mb-1">Foto Original</p>
                            <img src={request.foto_original_url} alt="Original" className="h-32 object-contain rounded" />
                        </div>
                    </div>

                    {/* Gallery Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {photos.map((photo) => (
                            <Card key={photo.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                <div className="aspect-square relative bg-gray-100 flex items-center justify-center">
                                    <img src={photo.url!} alt={`Foto ${photo.id}`} className="object-cover w-full h-full" />
                                </div>
                                <CardContent className="p-4">
                                    <h3 className="font-semibold text-gray-900 mb-1">Foto {photo.id}</h3>
                                    <p className="text-sm text-gray-500 line-clamp-2">{photo.desc}</p>
                                </CardContent>
                                <CardFooter className="p-4 pt-0">
                                    <Button className="w-full" variant="secondary" asChild>
                                        <a href={photo.url!} download target="_blank" rel="noopener noreferrer">
                                            <Download className="mr-2 h-4 w-4" />
                                            Baixar
                                        </a>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
