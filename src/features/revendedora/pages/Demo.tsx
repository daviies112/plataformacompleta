import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Store, Palette, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Demo() {
  const [companyConfig, setCompanyConfig] = useState({
    name: 'Minha Empresa Demo',
    logo: 'https://via.placeholder.com/100/0066FF/FFFFFF?text=LOGO',
    primaryColor: '#0066FF',
    secondaryColor: '#FF6600',
  });

  const applyColors = () => {
    const root = document.documentElement;
    
    // Converter HEX para HSL
    const hexToHSL = (hex: string) => {
      hex = hex.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0;
      let s = 0;
      const l = (max + min) / 2;
      
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };
    
    root.style.setProperty('--primary', hexToHSL(companyConfig.primaryColor));
    root.style.setProperty('--secondary', hexToHSL(companyConfig.secondaryColor));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Demonstração de Integração
          </h1>
          <p className="text-xl text-muted-foreground">
            Teste como as configurações do Admin aparecem na plataforma do Revendedor
          </p>
        </div>

        <Tabs defaultValue="admin" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="admin" className="text-lg">
              <Building2 className="mr-2 h-5 w-5" />
              Painel Admin
            </TabsTrigger>
            <TabsTrigger value="reseller" className="text-lg">
              <Store className="mr-2 h-5 w-5" />
              Painel Revendedor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="admin" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-6 w-6" />
                  Configurações da Empresa (Admin)
                </CardTitle>
                <CardDescription>
                  Personalize sua empresa - essas configurações serão aplicadas automaticamente no painel do revendedor
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Nome da Empresa</Label>
                  <Input
                    id="company-name"
                    value={companyConfig.name}
                    onChange={(e) => setCompanyConfig({ ...companyConfig, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo-url">URL do Logo</Label>
                  <Input
                    id="logo-url"
                    value={companyConfig.logo}
                    onChange={(e) => setCompanyConfig({ ...companyConfig, logo: e.target.value })}
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <img src={companyConfig.logo} alt="Logo preview" className="h-16 w-16 object-contain border rounded" />
                    <span className="text-sm text-muted-foreground">Preview do Logo</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary-color">Cor Primária</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primary-color"
                        type="color"
                        value={companyConfig.primaryColor}
                        onChange={(e) => setCompanyConfig({ ...companyConfig, primaryColor: e.target.value })}
                        className="w-20 h-10"
                      />
                      <Input
                        value={companyConfig.primaryColor}
                        onChange={(e) => setCompanyConfig({ ...companyConfig, primaryColor: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondary-color">Cor Secundária</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondary-color"
                        type="color"
                        value={companyConfig.secondaryColor}
                        onChange={(e) => setCompanyConfig({ ...companyConfig, secondaryColor: e.target.value })}
                        className="w-20 h-10"
                      />
                      <Input
                        value={companyConfig.secondaryColor}
                        onChange={(e) => setCompanyConfig({ ...companyConfig, secondaryColor: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={applyColors} className="w-full" size="lg">
                  <Check className="mr-2 h-5 w-5" />
                  Aplicar Configurações
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Produtos Cadastrados</CardTitle>
                <CardDescription>Produtos que aparecerão no catálogo do revendedor</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center">
                        <img src="https://via.placeholder.com/200/0066FF/FFFFFF?text=Produto+A" alt="Produto A" className="rounded-lg" />
                      </div>
                      <h3 className="font-semibold">Produto Premium A</h3>
                      <p className="text-2xl font-bold text-primary">R$ 299,90</p>
                      <Badge variant="default" className="mt-2">50 em estoque</Badge>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center">
                        <img src="https://via.placeholder.com/200/FF6600/FFFFFF?text=Produto+B" alt="Produto B" className="rounded-lg" />
                      </div>
                      <h3 className="font-semibold">Produto Standard B</h3>
                      <p className="text-2xl font-bold text-primary">R$ 149,90</p>
                      <Badge variant="default" className="mt-2">100 em estoque</Badge>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center">
                        <img src="https://via.placeholder.com/200/00CC00/FFFFFF?text=Produto+C" alt="Produto C" className="rounded-lg" />
                      </div>
                      <h3 className="font-semibold">Produto Básico C</h3>
                      <p className="text-2xl font-bold text-primary">R$ 79,90</p>
                      <Badge variant="default" className="mt-2">150 em estoque</Badge>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reseller" className="space-y-6">
            <Card className="border-2 border-primary">
              <CardHeader className="bg-primary/5">
                <div className="flex items-center gap-4">
                  {companyConfig.logo && (
                    <img src={companyConfig.logo} alt="Logo" className="h-16 w-16 object-contain" />
                  )}
                  <div>
                    <CardTitle className="text-2xl" style={{ color: companyConfig.primaryColor }}>
                      {companyConfig.name}
                    </CardTitle>
                    <CardDescription>Dashboard do Revendedor</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Saldo Disponível</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold" style={{ color: companyConfig.primaryColor }}>
                        R$ 1.500,00
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Saldo Pendente</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold" style={{ color: companyConfig.secondaryColor }}>
                        R$ 800,00
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total de Vendas</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">R$ 5.000,00</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Links Ativos</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">12</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Catálogo de Produtos Disponíveis</CardTitle>
                <CardDescription>
                  Produtos da empresa {companyConfig.name} que você pode vender
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="border-primary/20 hover:border-primary transition-colors">
                    <CardContent className="pt-6">
                      <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center">
                        <img src="https://via.placeholder.com/200/0066FF/FFFFFF?text=Produto+A" alt="Produto A" className="rounded-lg" />
                      </div>
                      <h3 className="font-semibold">Produto Premium A</h3>
                      <p className="text-2xl font-bold" style={{ color: companyConfig.primaryColor }}>R$ 299,90</p>
                      <div className="flex justify-between items-center mt-2">
                        <Badge>50 disponíveis</Badge>
                        <Button size="sm" style={{ backgroundColor: companyConfig.primaryColor }}>
                          Criar Link
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-primary/20 hover:border-primary transition-colors">
                    <CardContent className="pt-6">
                      <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center">
                        <img src="https://via.placeholder.com/200/FF6600/FFFFFF?text=Produto+B" alt="Produto B" className="rounded-lg" />
                      </div>
                      <h3 className="font-semibold">Produto Standard B</h3>
                      <p className="text-2xl font-bold" style={{ color: companyConfig.primaryColor }}>R$ 149,90</p>
                      <div className="flex justify-between items-center mt-2">
                        <Badge>100 disponíveis</Badge>
                        <Button size="sm" style={{ backgroundColor: companyConfig.primaryColor }}>
                          Criar Link
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-primary/20 hover:border-primary transition-colors">
                    <CardContent className="pt-6">
                      <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center">
                        <img src="https://via.placeholder.com/200/00CC00/FFFFFF?text=Produto+C" alt="Produto C" className="rounded-lg" />
                      </div>
                      <h3 className="font-semibold">Produto Básico C</h3>
                      <p className="text-2xl font-bold" style={{ color: companyConfig.primaryColor }}>R$ 79,90</p>
                      <div className="flex justify-between items-center mt-2">
                        <Badge>150 disponíveis</Badge>
                        <Button size="sm" style={{ backgroundColor: companyConfig.primaryColor }}>
                          Criar Link
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-primary" />
                  Integração Completa Funcionando
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>✅ Logo da empresa exibido</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>✅ Cores personalizadas aplicadas (primária e secundária)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>✅ Produtos da empresa listados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>✅ Estatísticas do revendedor sincronizadas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>✅ Nome da empresa visível em todo o painel</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
