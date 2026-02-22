import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { photoService, GratisRequest } from '../services/photoService';
import { Loader2, ArrowLeft, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert';

export default function MelhorarFotosResultado() {
    const { id } = useParams<{ id: string }>();
    const [request, setRequest] = useState<GratisRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        // Initial fetch
        const fetchRequest = async () => {
            try {
                const data = await photoService.getFreeRequest(id);
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
            subscription = await photoService.subscribeToRequest('imagens_gratis', id, (newPayload) => {
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
                    <Link to="/fotos/melhorar">
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

    return (
        <div className="container mx-auto max-w-4xl py-8 px-4">
            <div className="mb-6">
                <Link to="/fotos/melhorar">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para enviar outra foto
                    </Button>
                </Link>
            </div>

            {isProcessing && (
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 bg-white p-3 rounded-full w-fit shadow-sm">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                        <CardTitle>Melhorando sua foto...</CardTitle>
                        <CardDescription>
                            Estamos processando sua imagem com nossa IA. Isso geralmente leva menos de 1 minuto.
                            <br />Você pode aguardar aqui, a página atualizará automaticamente.
                        </CardDescription>
                    </CardHeader>
                </Card>
            )}

            {isError && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Falha no processamento</AlertTitle>
                    <AlertDescription>
                        {request.erro_mensagem || 'Ocorreu um erro ao processar sua imagem. Por favor, tente novamente.'}
                    </AlertDescription>
                </Alert>
            )}

            {isCompleted && (
                <div className="space-y-6">
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-lg border border-green-100">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-medium">Foto melhorada com sucesso!</span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Original */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Original</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="aspect-square relative rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                                    <img src={request.foto_original_url} alt="Original" className="object-contain w-full h-full" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Melhorada */}
                        <Card className="border-green-200 shadow-md">
                            <CardHeader>
                                <CardTitle className="text-lg text-green-700">Versão Melhorada (IA)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="aspect-square relative rounded-md overflow-hidden bg-white flex items-center justify-center border border-gray-100">
                                    {request.foto_melhorada_url ? (
                                        <img src={request.foto_melhorada_url} alt="Melhorada" className="object-contain w-full h-full" />
                                    ) : (
                                        <div className="text-gray-400">Imagem indisponível</div>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter>
                                {request.foto_melhorada_url && (
                                    <Button className="w-full" asChild>
                                        <a href={request.foto_melhorada_url} download target="_blank" rel="noopener noreferrer">
                                            <Download className="mr-2 h-4 w-4" />
                                            Baixar Imagem Melhorada
                                        </a>
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
