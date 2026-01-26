import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Trash2, Save, DollarSign, TrendingUp, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SalesTier } from '@/types/database';
import { apiRequest } from '@/lib/queryClient';

export default function CommissionConfiguration() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [useDynamicTiers, setUseDynamicTiers] = useState(false);
  const [salesTiers, setSalesTiers] = useState<SalesTier[]>([]);
  const [companyId, setCompanyId] = useState<string>('');

  const loadConfiguration = useCallback(async () => {
    try {
      console.log('[Commission Config] Loading configuration from API...');
      
      const response = await fetch('/api/split/commission-config');
      const result = await response.json();
      
      if (result.success && result.config) {
        console.log('[Commission Config] Configuration loaded successfully:', result.config);
        setUseDynamicTiers(result.config.use_dynamic_tiers || false);
        setSalesTiers(result.config.sales_tiers || getDefaultTiers());
        setCompanyId('default');
        toast.success('Configuração de comissões carregada!');
      } else {
        console.log('[Commission Config] No data found, using defaults');
        setSalesTiers(getDefaultTiers());
        setCompanyId('default');
      }
    } catch (error) {
      console.error('[Commission Config] Error in loadConfiguration:', error);
      toast.error('Erro ao carregar configuração de comissões');
      setSalesTiers(getDefaultTiers());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration]);

  const getDefaultTiers = (): SalesTier[] => {
    return [
      {
        id: crypto.randomUUID(),
        name: 'Iniciante',
        min_monthly_sales: 0,
        max_monthly_sales: 2000,
        reseller_percentage: 65,
        company_percentage: 35,
      },
      {
        id: crypto.randomUUID(),
        name: 'Bronze',
        min_monthly_sales: 2000,
        max_monthly_sales: 4500,
        reseller_percentage: 70,
        company_percentage: 30,
      },
      {
        id: crypto.randomUUID(),
        name: 'Prata',
        min_monthly_sales: 4500,
        max_monthly_sales: 10000,
        reseller_percentage: 75,
        company_percentage: 25,
      },
      {
        id: crypto.randomUUID(),
        name: 'Ouro',
        min_monthly_sales: 10000,
        max_monthly_sales: undefined,
        reseller_percentage: 80,
        company_percentage: 20,
      },
    ];
  };

  const addNewTier = () => {
    const lastTier = salesTiers[salesTiers.length - 1];
    const newMinSales = lastTier ? (lastTier.max_monthly_sales || lastTier.min_monthly_sales + 5000) : 0;
    
    const newTier: SalesTier = {
      id: crypto.randomUUID(),
      name: `Faixa ${salesTiers.length + 1}`,
      min_monthly_sales: newMinSales,
      max_monthly_sales: newMinSales + 5000,
      reseller_percentage: 70,
      company_percentage: 30,
    };
    
    setSalesTiers([...salesTiers, newTier]);
  };

  const updateTier = (id: string, field: keyof SalesTier, value: any) => {
    setSalesTiers(salesTiers.map(tier => {
      if (tier.id === id) {
        const updatedTier = { ...tier, [field]: value };
        
        // Auto-calcular percentual da empresa
        if (field === 'reseller_percentage') {
          updatedTier.company_percentage = 100 - Number(value);
        } else if (field === 'company_percentage') {
          updatedTier.reseller_percentage = 100 - Number(value);
        }
        
        return updatedTier;
      }
      return tier;
    }));
  };

  const removeTier = (id: string) => {
    if (salesTiers.length <= 1) {
      toast.error('É necessário ter pelo menos uma faixa de comissão');
      return;
    }
    setSalesTiers(salesTiers.filter(tier => tier.id !== id));
  };

  const saveConfiguration = async () => {
    console.log('[Commission Config] Starting save process...');
    console.log('[Commission Config] Current tiers:', salesTiers);
    console.log('[Commission Config] Use dynamic tiers:', useDynamicTiers);
    
    for (let i = 0; i < salesTiers.length; i++) {
      const tier = salesTiers[i];
      
      if (!tier.name || tier.name.trim() === '') {
        toast.error(`A faixa ${i + 1} precisa de um nome`);
        return;
      }
      
      if (tier.reseller_percentage + tier.company_percentage !== 100) {
        toast.error(`A soma das porcentagens da faixa "${tier.name}" deve ser 100%`);
        return;
      }
      
      if (tier.max_monthly_sales && tier.min_monthly_sales >= tier.max_monthly_sales) {
        toast.error(`O valor mínimo da faixa "${tier.name}" deve ser menor que o máximo`);
        return;
      }
    }

    setSaving(true);
    try {
      console.log('[Commission Config] Saving via API...');
      
      const response = await apiRequest('/api/split/commission-config', {
        method: 'POST',
        body: JSON.stringify({
          use_dynamic_tiers: useDynamicTiers,
          sales_tiers: salesTiers,
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao salvar');
      }
      
      console.log('[Commission Config] Saved successfully:', result);
      toast.success('Configuração de comissões salva com sucesso!', {
        description: 'As alterações serão aplicadas imediatamente em novos pagamentos.'
      });
    } catch (error: any) {
      console.error('[Commission Config] Error saving:', error);
      toast.error(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando configuração...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuração de Comissões</h1>
          <p className="text-muted-foreground">
            Configure comissões dinâmicas baseadas no volume de vendas mensal
          </p>
        </div>
        <Button onClick={saveConfiguration} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Salvando...' : 'Salvar Configuração'}
        </Button>
      </div>

      {/* Card de Ativação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Sistema de Comissões Dinâmicas
          </CardTitle>
          <CardDescription>
            Ative para usar faixas de comissão baseadas no volume de vendas mensal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="dynamic-tiers">Usar Comissões por Faixa de Vendas</Label>
              <p className="text-sm text-muted-foreground">
                Quando ativado, a porcentagem da comissão será calculada automaticamente baseada no volume de vendas do mês
              </p>
            </div>
            <Switch
              id="dynamic-tiers"
              checked={useDynamicTiers}
              onCheckedChange={setUseDynamicTiers}
            />
          </div>
        </CardContent>
      </Card>

      {/* Card de Faixas de Comissão */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Faixas de Comissão
              </CardTitle>
              <CardDescription>
                Configure as faixas de vendas e suas respectivas porcentagens
              </CardDescription>
            </div>
            <Button onClick={addNewTier} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Faixa
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!useDynamicTiers && (
            <div className="mb-4 p-4 bg-muted rounded-lg border">
              <p className="text-sm text-muted-foreground">
                ⚠️ O sistema de comissões dinâmicas está desativado. Ative acima para usar as faixas configuradas.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faixa</TableHead>
                  <TableHead>Vendas Mínimas (R$)</TableHead>
                  <TableHead>Vendas Máximas (R$)</TableHead>
                  <TableHead>Revendedor (%)</TableHead>
                  <TableHead>Empresa (%)</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesTiers.map((tier, index) => (
                  <TableRow key={tier.id}>
                    <TableCell>
                      <Input
                        value={tier.name}
                        onChange={(e) => updateTier(tier.id, 'name', e.target.value)}
                        className="max-w-[150px]"
                        placeholder="Nome da faixa"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={tier.min_monthly_sales}
                        onChange={(e) => updateTier(tier.id, 'min_monthly_sales', Number(e.target.value))}
                        className="max-w-[120px]"
                        min={0}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={tier.max_monthly_sales || ''}
                        onChange={(e) => updateTier(tier.id, 'max_monthly_sales', e.target.value ? Number(e.target.value) : undefined)}
                        className="max-w-[120px]"
                        placeholder="Ilimitado"
                        min={tier.min_monthly_sales}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={tier.reseller_percentage}
                          onChange={(e) => updateTier(tier.id, 'reseller_percentage', Number(e.target.value))}
                          className="max-w-[80px]"
                          min={0}
                          max={100}
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={tier.company_percentage}
                          onChange={(e) => updateTier(tier.id, 'company_percentage', Number(e.target.value))}
                          className="max-w-[80px]"
                          min={0}
                          max={100}
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTier(tier.id)}
                        disabled={salesTiers.length <= 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Preview de exemplo */}
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Exemplo de Aplicação
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {salesTiers.map((tier) => (
                <div key={tier.id} className="bg-background p-3 rounded border">
                  <div className="font-medium text-sm mb-1">{tier.name}</div>
                  <div className="text-xs text-muted-foreground mb-2">
                    R$ {tier.min_monthly_sales.toLocaleString('pt-BR')}
                    {tier.max_monthly_sales ? ` - R$ ${tier.max_monthly_sales.toLocaleString('pt-BR')}` : '+'}
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="default" className="text-xs">
                      Rev: {tier.reseller_percentage}%
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      Emp: {tier.company_percentage}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card de Informações */}
      <Card>
        <CardHeader>
          <CardTitle>Como Funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              1
            </div>
            <p className="text-muted-foreground">
              O sistema calcula automaticamente o volume total de vendas do revendedor no mês atual
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              2
            </div>
            <p className="text-muted-foreground">
              Com base no volume, identifica qual faixa se aplica ao revendedor
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              3
            </div>
            <p className="text-muted-foreground">
              Aplica as porcentagens configuradas para aquela faixa automaticamente no split de pagamento via Pagar.me
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              4
            </div>
            <p className="text-muted-foreground">
              As alterações aqui feitas são aplicadas imediatamente em todos os novos pagamentos
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
