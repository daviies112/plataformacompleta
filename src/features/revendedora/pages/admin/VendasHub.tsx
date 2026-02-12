import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Banknote, Building2, Save, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import AdminAnalytics from "./Analytics";

function DadosBancarios() {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<any>(null);

    useEffect(() => {
        // Simular carregamento inicial
        setLoading(true);
        // Aqui seria a chamada real: fetch('/api/pagarme/company-bank-status')
        setTimeout(() => {
            setStatus({
                configured: false, // Por padrão, não configurado para mostrar o formulário
                holderName: '',
                bank: '',
                agency: '',
                account: '',
                accountType: 'checking'
            });
            setLoading(false);
        }, 1000);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        // Simulação de salvar
        setTimeout(() => {
            setSaving(false);
            setStatus(prev => ({ ...prev, configured: true }));
            toast.success("Dados bancários salvos com sucesso!");
        }, 1500);
    };

    const bancos = [
        { code: '001', name: 'Banco do Brasil' },
        { code: '033', name: 'Santander' },
        { code: '104', name: 'Caixa Econômica' },
        { code: '237', name: 'Bradesco' },
        { code: '260', name: 'Nubank' },
        { code: '341', name: 'Itaú' },
        { code: '077', name: 'Inter' },
    ];

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                Conta Bancária da Empresa
                            </CardTitle>
                            <CardDescription>
                                Configure a conta onde você receberá os valores das vendas da plataforma
                            </CardDescription>
                        </div>
                        {status?.configured ? (
                            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-medium border border-green-200">
                                <CheckCircle2 className="h-4 w-4" />
                                Conta Ativa
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-sm font-medium border border-amber-200">
                                <AlertCircle className="h-4 w-4" />
                                Pendente Configuração
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="titular">Nome do Titular (Como no Banco)</Label>
                                <Input id="titular" placeholder="Razão Social ou Nome Completo" required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="documento">CPF ou CNPJ</Label>
                                <Input id="documento" placeholder="000.000.000-00" required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="banco">Banco</Label>
                                <Select>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o banco" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {bancos.map(b => (
                                            <SelectItem key={b.code} value={b.code}>
                                                {b.code} - {b.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="tipo">Tipo de Conta</Label>
                                <Select defaultValue="checking">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="checking">Conta Corrente</SelectItem>
                                        <SelectItem value="savings">Conta Poupança</SelectItem>
                                        <SelectItem value="nota_pagamento">Conta de Pagamento</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="agencia">Agência (sem dígito)</Label>
                                <Input id="agencia" placeholder="0000" required />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2 space-y-2">
                                    <Label htmlFor="conta">Conta (com dígito)</Label>
                                    <Input id="conta" placeholder="00000-0" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="digito">Dígito</Label>
                                    <Input id="digito" placeholder="0" className="w-full" />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t mt-4">
                            <Button type="submit" disabled={saving} className="gap-2">
                                {saving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        Salvar Dados Bancários
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card className="bg-muted/30">
                <CardHeader>
                    <CardTitle className="text-base font-medium">Informações Importantes</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>• A conta bancária deve ter a mesma titularidade do CNPJ/CPF cadastrado na plataforma.</p>
                    <p>• Verifique cuidadosamente os dados antes de salvar. Dados incorretos podem atrasar seus repasses.</p>
                    <p>• O prazo para validação da conta bancária é de até 2 dias úteis após o salvamento.</p>
                </CardContent>
            </Card>
        </div>
    );
}

export default function VendasHub() {
    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Vendas</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Acompanhe suas vendas e configure seus dados bancários
                </p>
            </div>

            <Tabs defaultValue="analytics" className="w-full">
                <TabsList>
                    <TabsTrigger value="analytics" className="gap-2" data-testid="tab-analytics">
                        <BarChart3 className="h-4 w-4" />
                        Analytics
                    </TabsTrigger>
                    <TabsTrigger value="dados-bancarios" className="gap-2" data-testid="tab-dados-bancarios">
                        <Banknote className="h-4 w-4" />
                        Dados Bancários
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="analytics" className="mt-4">
                    <AdminAnalytics />
                </TabsContent>

                <TabsContent value="dados-bancarios" className="mt-4">
                    <DadosBancarios />
                </TabsContent>
            </Tabs>
        </div>
    );
}
