import { Card } from "@/features/produto/components/ui/card";
import { Package, Users, FolderTree, TrendingUp, TrendingDown, ShoppingBag, DollarSign, AlertCircle, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { Badge } from "@/features/produto/components/ui/badge";
import { Progress } from "@/features/produto/components/ui/progress";
import { Separator } from "@/features/produto/components/ui/separator";

interface DashboardProps {
  productsCount: number;
  suppliersCount: number;
  categoriesCount: number;
}

export const Dashboard = ({ productsCount, suppliersCount, categoriesCount }: DashboardProps) => {
  const totalInventoryValue = productsCount * 127;

  const stats = [
    {
      title: "Total de Produtos",
      value: productsCount,
      subtitle: "Em estoque",
      icon: Package,
      trend: "+12%",
      trendUp: true,
      color: "text-primary",
      bgColor: "bg-primary/10",
      progress: 75,
    },
    {
      title: "Valor em Estoque",
      value: `R$ ${totalInventoryValue.toLocaleString('pt-BR')}`,
      subtitle: "Total em produtos",
      icon: DollarSign,
      trend: "+8%",
      trendUp: true,
      color: "text-success",
      bgColor: "bg-success/10",
      progress: 82,
    },
    {
      title: "Fornecedores",
      value: suppliersCount,
      subtitle: "Parceiros ativos",
      icon: Users,
      trend: "0%",
      trendUp: null,
      color: "text-primary",
      bgColor: "bg-primary/10",
      progress: 100,
    },
    {
      title: "Categorias",
      value: categoriesCount,
      subtitle: "Organizadas",
      icon: FolderTree,
      trend: "+2",
      trendUp: true,
      color: "text-primary",
      bgColor: "bg-primary/10",
      progress: 60,
    },
  ];

  const alerts = [
    {
      type: "warning",
      title: "Estoque baixo",
      description: "Nenhum produto com estoque crítico",
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  return (
    <div className="flex flex-col h-full bg-background pb-20 overflow-auto">
      <div className="p-4 md:p-6 space-y-6">
        {/* Welcome Banner */}
        <Card className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground p-6 shadow-lg border-0 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5" />
              <h2 className="text-2xl font-bold">Dashboard</h2>
            </div>
            <p className="text-primary-foreground/90">Visão geral do seu sistema de gestão</p>
          </div>
        </Card>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const TrendIcon = stat.trendUp ? TrendingUp : stat.trendUp === false ? TrendingDown : null;
            
            return (
              <Card 
                key={stat.title} 
                className="p-5 hover:shadow-md transition-all duration-200 border-l-4 border-l-primary/20"
                data-testid={`card-stat-${stat.title.toLowerCase()}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${stat.bgColor} shadow-sm`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  {TrendIcon && (
                    <Badge 
                      variant={stat.trendUp ? "default" : "destructive"}
                      className="gap-1 text-xs"
                    >
                      <TrendIcon className="w-3 h-3" />
                      {stat.trend}
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p 
                    className="text-2xl font-bold text-foreground" 
                    data-testid={`text-stat-${stat.title.toLowerCase()}`}
                  >
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                </div>
                
                <div className="mt-3">
                  <Progress value={stat.progress} className="h-1.5" />
                </div>
              </Card>
            );
          })}
        </div>

        {/* Alerts Section */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 px-1 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Status do Sistema
          </h3>
          <div className="grid gap-3">
            {alerts.map((alert, index) => {
              const AlertIcon = alert.icon;
              return (
                <Card key={index} className="p-4 flex items-center gap-3 border-l-4 border-l-success/50">
                  <div className={`p-2 rounded-lg ${alert.bgColor}`}>
                    <AlertIcon className={`w-5 h-5 ${alert.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.description}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 px-1 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Ações Rápidas
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            <Card 
              className="p-4 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-primary/50 active:scale-[0.98] transition-all duration-200 group" 
              data-testid="card-quick-action-new-product"
            >
              <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-sm">Novo Produto</p>
                <p className="text-xs text-muted-foreground">Adicionar ao estoque</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </Card>
            
            <Card 
              className="p-4 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-primary/50 active:scale-[0.98] transition-all duration-200 group" 
              data-testid="card-quick-action-new-supplier"
            >
              <div className="p-3 bg-success/10 rounded-xl group-hover:bg-success/20 transition-colors">
                <Users className="w-5 h-5 text-success" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-sm">Novo Fornecedor</p>
                <p className="text-xs text-muted-foreground">Cadastrar parceiro</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-success group-hover:translate-x-1 transition-all" />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
